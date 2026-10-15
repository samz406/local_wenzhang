import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (_) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw new Error('请先安装 Playwright：npm install --no-save playwright');
  ({ chromium } = createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/package.json')('playwright'));
}
const root = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(root, 'exporter.js'), 'utf8');
const background = await readFile(join(root, 'background.js'), 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const downloads = await mkdtemp(join(tmpdir(), 'x-export-test-'));
let fixture = '';
await page.route('**/*', route => {
  const request = route.request();
  if (request.isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: fixture });
  return route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64') });
});
let passed = 0;
async function load(html, path = '/author/status/123') {
  fixture = '<!doctype html><title>作者 on X: "测试文章" / X</title>' + html;
  await page.goto('https://x.com' + path);
  await page.addScriptTag({ content: source });
}
async function extract() { return page.evaluate(() => XArticleExporter.extract(document, { now: '2026-10-15T00:00:00Z' })); }
async function test(name, fn) { await fn(); passed++; console.log('PASS', name); }

const article = `
<nav>首页和导航</nav><main><div data-testid="twitterArticleReadView">
<div data-testid="User-Name"><a href="/author"><span>测试作者</span></a><span>@author</span></div>
<h1 data-testid="twitterArticleReadViewTitle">一篇完整文章</h1><time datetime="2026-10-14T10:00:00Z"></time>
<div data-testid="twitterArticleReadViewCoverImage"><img src="https://pbs.twimg.com/media/cover?format=jpg&name=small" alt="封面"></div>
<div data-testid="twitterArticleRichTextView">
<p>开头 <strong>重要</strong> <em>斜体</em> <s>删除</s> <span style="font-weight:700">加粗</span>，<a href="https://example.com/path?q=(1)" title="阅读资料">链接</a>。</p>
<h2>第二节</h2><blockquote><p>引用一</p><p>引用二</p></blockquote>
<ol start="3"><li>第三项<ul><li>嵌套项目</li></ul></li><li>第四项</li></ol>
<pre><code class="language-js">a();\n\n\n\nb();\nconst value = &#96;&#96;&#96;;\n</code></pre>
<p>行内 <code>a&#96;b</code>。</p>
<p><a href="https://t.co/short" title="https://example.com/full">展开链接</a><a href="javascript:alert(1)">不安全链接</a></p>
<figure><img src="https://pbs.twimg.com/media/body?format=png&name=small" alt="图片[一]"><figcaption>图注</figcaption></figure>
<p>文字<img src="https://abs.twimg.com/emoji/v2/svg/1f600.svg" alt="😀">表情</p>
<table><tr><th>项目</th><th>值</th></tr><tr><td>A</td><td>2</td></tr></table>
<button>关注</button><div hidden>隐藏文字</div><p>全文结束。</p>
</div></div><article data-testid="tweet"><div data-testid="tweetText">无关评论</div></article></main>`;

try {
  await test('长文章保留结构、出处、封面和原图，排除 UI 与评论', async () => {
    await load(article);
    const result = await extract();
    assert.equal(result.title, '一篇完整文章');
    assert.equal(result.author, '测试作者（@author）');
    assert.equal(result.imageCount, 2);
    assert.equal(result.sourceUrl, 'https://x.com/author/status/123');
    assert.match(result.markdown, /### 第二节/);
    assert.match(result.markdown, /\*\*重要\*\*/);
    assert.match(result.markdown, /\*斜体\*/);
    assert.match(result.markdown, /~~删除~~/);
    assert.match(result.markdown, /\*\*加粗\*\*/);
    assert.match(result.markdown, /\[链接\]\(https:\/\/example.com\/path\?q=%281%29\)/);
    assert.match(result.markdown, /\[展开链接\]\(https:\/\/example.com\/full\)/);
    assert.match(result.markdown, /3\. 第三项\n\s+\n\s+- 嵌套项目/);
    assert.match(result.markdown, /4\. 第四项/);
    assert.match(result.markdown, /> 引用一/);
    assert.match(result.markdown, /````js\na\(\);\n\n\n\nb\(\);/);
    assert.match(result.markdown, /``a`b``/);
    assert.match(result.markdown, /name=orig/);
    assert.match(result.markdown, /文字😀表情/);
    assert.match(result.markdown, /\| 项目 \| 值 \|/);
    assert.doesNotMatch(result.markdown, /无关评论|首页和导航|隐藏文字|关注|javascript:alert/);
    assert.ok(result.markdown.trimEnd().endsWith('全文结束。'));
  });
  await test('隐藏候选正文不干扰当前文章', async () => {
    await load('<div style="display:none"><div data-testid="longformRichTextComponent">' + '旧文章'.repeat(500) + '</div></div>' + article);
    assert.doesNotMatch((await extract()).markdown, /旧文章/);
  });
  await test('普通帖子只匹配当前 URL，不包含回复和引用帖图片', async () => {
    await load(`<article data-testid="tweet"><a href="/reply/status/456"><time>回复时间</time></a><div data-testid="tweetText">无关回复</div></article>
    <article data-testid="tweet"><div data-testid="User-Name"><a><span>作者</span></a><span>@author</span></div><a href="/author/status/123"><time datetime="2026-10-14">时间</time></a>
    <div data-testid="tweetText">目标帖子全文</div><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/own?format=jpg"></div>
    <div data-testid="quoteTweet"><article data-testid="tweet"><a href="/quote/status/789"><time>引用时间</time></a><div data-testid="tweetText">引用正文</div><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/quote?format=jpg"></div></article></div></article>`);
    const result = await extract();
    assert.equal(result.mode, 'X 帖子');
    assert.equal(result.imageCount, 1);
    assert.match(result.markdown, /目标帖子全文/);
    assert.doesNotMatch(result.markdown, /无关回复|引用正文|media\/quote/);
  });
  await test('预览卡片与未展开帖子明确报错，避免把摘要当全文', async () => {
    for (const extra of ['<a href="/author/article/999">文章预览</a>', '<button data-testid="tweet-text-show-more-link">Show more</button>']) {
      await load(`<article data-testid="tweet"><a href="/author/status/123"><time>时间</time></a><div data-testid="tweetText">摘要</div>${extra}</article>`);
      const result = await page.evaluate(() => { try { XArticleExporter.extract(document); return ''; } catch (e) { return e.message; } });
      assert.match(result, /全文|展开/);
    }
  });
  await test('无法识别时不会抓取整个时间线', async () => {
    await load('<main>主页文字与别人的文章</main>', '/home');
    await assert.rejects(extract, /未识别到文章正文/);
  });
  await test('选区兜底保留选中文字、格式和链接', async () => {
    await load('<div>选区之外</div><div id="selection"><p>选择 <strong>正文</strong></p><p><a href="https://example.com">资料</a></p></div>', '/home');
    await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.getElementById('selection')); getSelection().removeAllRanges(); getSelection().addRange(range); });
    const result = await extract();
    assert.equal(result.mode, '手动选中');
    assert.match(result.markdown, /选择 \*\*正文\*\*/);
    assert.match(result.markdown, /\[资料\]\(https:\/\/example.com\/\)/);
    assert.doesNotMatch(result.markdown, /选区之外/);
  });
  await test('点击生成真实下载，下载内容与预览一致', async () => {
    await load(article);
    const pending = page.waitForEvent('download');
    const result = await page.evaluate(() => XArticleExporter.run());
    assert.equal(result.ok, true);
    const download = await pending;
    assert.equal(download.suggestedFilename(), '一篇完整文章.md');
    const path = join(downloads, 'article.md');
    await download.saveAs(path);
    const saved = await readFile(path, 'utf8');
    assert.equal(saved, await page.locator('#x-article-exporter textarea').inputValue());
    assert.ok(saved.includes('全文结束。'));
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    assert.equal(await page.locator('#x-article-exporter').count(), 0);
  });
  await test('安装页包含可独立执行的书签地址', async () => {
    fixture = await readFile(join(root, 'install.html'), 'utf8');
    await page.goto('https://x.com/install-test');
    const bookmark = await page.locator('#bookmark').getAttribute('href');
    assert.ok(bookmark.startsWith('javascript:'));
    assert.ok(bookmark.length < 65536, '书签地址应小于 64 KiB，超过时使用扩展');
    await load(article);
    const pending = page.waitForEvent('download');
    await page.evaluate(decodeURIComponent(bookmark.slice('javascript:'.length)));
    assert.equal((await pending).suggestedFilename(), '一篇完整文章.md');
  });
  await test('扩展工具栏调用当前标签脚本，处理成功和非 X 页面', async () => {
    await load('<div></div>');
    const result = await page.evaluate(async code => {
      const calls = [];
      let listener;
      globalThis.chrome = {
        action: { onClicked: { addListener(fn) { listener = fn; } },
          setBadgeText: async args => calls.push(['badge', args]), setBadgeBackgroundColor: async () => {}, setTitle: async args => calls.push(['title', args]) },
        scripting: { executeScript: async args => { calls.push(['execute', args]); return [{ result: { ok: true } }]; } },
      };
      (0, eval)(code);
      await listener({ id: 42, url: 'https://x.com/author/status/123' });
      await listener({ id: 43, url: 'https://example.com' });
      return calls;
    }, background);
    assert.equal(result.filter(([kind]) => kind === 'execute').length, 1);
    assert.deepEqual(result.find(([kind]) => kind === 'execute')[1], { target: { tabId: 42 }, files: ['exporter.js', 'run-export.js'] });
    assert.ok(result.some(([kind, value]) => kind === 'badge' && value.tabId === 42 && value.text === 'OK'));
    assert.ok(result.some(([kind, value]) => kind === 'badge' && value.tabId === 43 && value.text === '!'));
  });
  console.log(`\n${passed} browser checks passed.`);
} finally {
  await browser.close();
  await rm(downloads, { recursive: true, force: true });
}
