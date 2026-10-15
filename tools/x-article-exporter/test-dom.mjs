// DOM-only regression tests. These do not replace tests in a real browser/X session.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

let parseHTML;
if (process.env.X_EXPORT_DOM_MODULE) {
  ({ parseHTML } = await import(pathToFileURL(process.env.X_EXPORT_DOM_MODULE)));
} else {
  ({ parseHTML } = createRequire(import.meta.url)('linkedom'));
}
const source = await readFile(new URL('./exporter.js', import.meta.url), 'utf8');
const installer = await readFile(new URL('./install.html', import.meta.url), 'utf8');
const background = await readFile(new URL('./background.js', import.meta.url), 'utf8');
const semanticFixture = await readFile(new URL('./fixtures/semantic-article.html', import.meta.url), 'utf8');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS', name); }

function environment(body, pathname = '/author/status/123') {
  const { window, document } = parseHTML('<!doctype html><html><head><title>作者 on X: "测试文章" / X</title></head><body>' + body + '</body></html>');
  document.location = new URL('https://x.com' + pathname);
  window.getComputedStyle = el => el.style;
  let selection = null;
  window.getSelection = () => selection;
  const downloads = [];
  window.Blob = Blob;
  window.URL = class extends URL {
    static createObjectURL(blob) { downloads.push(blob); return 'blob:test'; }
    static revokeObjectURL() {}
  };
  window.setTimeout = () => 0;
  const createElement = document.createElement.bind(document);
  document.createElement = name => {
    const node = createElement(name);
    if (name === 'a') node.click = () => {};
    return node;
  };
  // LinkeDOM intentionally does not implement the HTML table IDL properties.
  for (const table of document.querySelectorAll('table')) {
    Object.defineProperty(table, 'rows', { get: () => table.querySelectorAll('tr') });
    for (const row of table.querySelectorAll('tr')) Object.defineProperty(row, 'cells', { get: () => row.querySelectorAll('td, th') });
  }
  const sandbox = { document, URL, Blob, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { document, sandbox, downloads, api: sandbox.XArticleExporter,
    extract: () => sandbox.XArticleExporter.extract(document, { now: '2026-10-15T00:00:00Z' }),
    select(node) {
      selection = { isCollapsed: false, rangeCount: 1, toString: () => node.textContent,
        getRangeAt: () => ({ commonAncestorContainer: node, cloneContents() {
          const fragment = document.createDocumentFragment();
          for (const child of node.childNodes) fragment.append(child.cloneNode(true));
          return fragment;
        } }) };
    },
  };
}

const article = `<nav>导航</nav><div data-testid="twitterArticleReadView">
<div data-testid="User-Name"><a href="/author"><span>测试作者</span></a><span>@author</span></div>
<h1 data-testid="twitterArticleReadViewTitle">一篇完整文章</h1><time datetime="2026-10-14"></time>
<div data-testid="twitterArticleReadViewCoverImage"><img src="https://pbs.twimg.com/media/cover?format=jpg&name=small" alt="封面"></div>
<div data-testid="twitterArticleRichTextView">
<p>开头 <strong>重要</strong> <em>斜体</em> <s>删除</s> <span style="font-weight:700">加粗</span>。</p>
<h2>第二节</h2><blockquote><p>引用一</p><p>引用二</p></blockquote>
<ol start="3"><li>第三项<ul><li>嵌套项目</li></ul></li><li>第四项</li></ol>
<pre><code class="language-js">a();\n\n\n\nb();\nconst value = &#96;&#96;&#96;;\n</code></pre><p>行内 <code>a&#96;b</code>。</p>
<p><a href="https://example.com/path?q=(1)" title="阅读资料">链接</a><a href="https://t.co/short" title="https://example.com/full">完整链接</a><a href="javascript:alert(1)">危险链接</a></p>
<figure><img src="https://pbs.twimg.com/media/body?format=png&name=small" alt="图片[一]"><figcaption>图注</figcaption></figure>
<p>文字<img src="https://abs.twimg.com/emoji/v2/svg/1f600.svg" alt="😀">表情</p>
<table><tr><th>项目</th><th>值</th></tr><tr><td>A</td><td>2</td></tr></table>
<button>关注</button><div hidden>隐藏文字</div><p>全文结束。</p></div></div>
<article data-testid="tweet"><div data-testid="tweetText">无关回复</div></article>`;

test('长文章选择与元信息，封面和配图原图链接', () => {
  const result = environment(article).extract();
  assert.equal(result.title, '一篇完整文章');
  assert.equal(result.author, '测试作者（@author）');
  assert.equal(result.imageCount, 2);
  assert.equal(result.published, '2026-10-14');
  assert.equal(result.sourceUrl, 'https://x.com/author/status/123');
  assert.match(result.markdown, /name=orig/);
  assert.doesNotMatch(result.markdown, /导航|无关回复|隐藏文字|关注/);
  assert.ok(result.markdown.trimEnd().endsWith('全文结束。'));
});
test('标题、内联格式、引用、嵌套列表与表格', () => {
  const { markdown } = environment(article).extract();
  for (const expected of ['### 第二节', '**重要**', '*斜体*', '~~删除~~', '**加粗**', '> 引用一', '3. 第三项', '4. 第四项', '| 项目 | 值 |', '文字😀表情']) assert.ok(markdown.includes(expected), expected);
  assert.match(markdown, /3\. 第三项\n\s*\n\s+- 嵌套项目/);
});
test('代码中的连续空行、反引号与内联代码不丢失', () => {
  const { markdown } = environment(article).extract();
  assert.match(markdown, /````js\na\(\);\n\n\n\nb\(\);\nconst value = ```;/);
  assert.ok(markdown.includes('``a`b``'));
});
test('URL 括号转义、完整链接优先、危险链接剥离', () => {
  const { markdown } = environment(article).extract();
  assert.ok(markdown.includes('[链接](https://example.com/path?q=%281%29)'));
  assert.ok(markdown.includes('[完整链接](https://example.com/full)'));
  assert.doesNotMatch(markdown, /javascript:alert/);
});
test('隐藏的旧文章不参与正文选择', () => {
  assert.doesNotMatch(environment('<div style="display:none"><div data-testid="longformRichTextComponent">' + '旧内容'.repeat(200) + '</div></div>' + article).extract().markdown, /旧内容/);
});
test('真实页面结构回归：无 testid、嵌套加粗、独立封面和本地化时间', () => {
  const env = environment(semanticFixture, '/fixture/status/123');
  const result = env.extract();
  assert.equal(result.mode, 'X 长文章');
  assert.equal(result.title, 'Semantic Article Fixture');
  assert.equal(result.author, '测试作者（@fixture）');
  assert.equal(result.published, '7:00 · 2026年10月14日');
  assert.equal(result.imageCount, 4);
  assert.equal(env.document.querySelectorAll('.x-article-body p').length, 23);
  for (const p of env.document.querySelectorAll('.x-article-body p')) assert.ok(result.markdown.includes(env.api.markdown(p, result.sourceUrl)));
  assert.doesNotMatch(result.markdown, /MUST_NOT_EXPORT|\*\*\*\*/);
});
test('当前帖子与回复按时间戳链接区分', () => {
  const doc = `<article data-testid="tweet"><a href="/other/status/456"><time>回复</time></a><div data-testid="tweetText">不应导出</div></article>
  <article data-testid="tweet"><a href="/author/status/123"><time>时间</time></a><div data-testid="tweetText">目标帖子</div><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/photo?format=jpg"></div></article>`;
  const result = environment(doc).extract();
  assert.equal(result.mode, 'X 帖子');
  assert.match(result.markdown, /目标帖子/);
  assert.doesNotMatch(result.markdown, /不应导出/);
  assert.equal(result.imageCount, 1);
});
test('文章卡片与显示更多状态明确报错', () => {
  for (const extra of ['<a href="/author/article/999">文章预览</a>', '<button data-testid="tweet-text-show-more-link">Show more</button>']) {
    const env = environment('<article data-testid="tweet"><a href="/author/status/123"><time>时间</time></a><div data-testid="tweetText">摘要</div>' + extra + '</article>');
    assert.throws(env.extract, /全文|展开/);
  }
});
test('不将时间线整页作为正文，非 X 页面拒绝导出', () => {
  assert.throws(environment('<main>不应抓取整页</main>', '/home').extract, /未识别到文章正文/);
  const env = environment(article);
  assert.throws(() => env.api.extract(env.document, { url: 'https://example.com/' }), /请在 X/);
});
test('不将其他帖子的长正文误当成当前帖子；保留视频和引用入口', () => {
  const html = '<article data-testid="tweet"><a href="/other/status/456"><time>回复</time></a><div data-testid="longformRichTextComponent">无关长正文</div></article>' +
    '<article data-testid="tweet"><a href="/author/status/123"><time>时间</time></a><div data-testid="tweetText">目标</div><video></video>' +
    '<div data-testid="quoteTweet"><a href="/other/status/999">引用</a><button data-testid="tweet-text-show-more-link">Show more</button></div></article>';
  const { markdown } = environment(html).extract();
  assert.doesNotMatch(markdown, /无关长正文/);
  assert.match(markdown, /视频或嵌入内容/);
  assert.match(markdown, /https:\/\/x.com\/other\/status\/999/);
});
test('手动选中保持格式与选区边界', () => {
  const env = environment('<p>未选中</p><div id="selection"><p>选择<strong>正文</strong></p><p><a href="https://example.com">资料</a></p></div>', '/home');
  env.select(env.document.getElementById('selection'));
  const result = env.extract();
  assert.equal(result.mode, '手动选中');
  assert.ok(result.markdown.includes('选择**正文**'));
  assert.ok(result.markdown.includes('[资料](https://example.com/)'));
  assert.doesNotMatch(result.markdown, /未选中/);
});
test('run 生成下载 Blob 与预览面板（下载调用为 DOM 桩）', () => {
  const env = environment(article);
  const result = env.api.run(env.document);
  assert.equal(result.ok, true);
  assert.equal(env.downloads.length, 1);
  assert.ok(env.downloads[0].size > 0);
  assert.equal(env.document.getElementById('x-article-exporter').shadowRoot.querySelector('textarea').value, env.extract().markdown.replace('2026-10-15T00:00:00Z', env.document.getElementById('x-article-exporter').shadowRoot.querySelector('textarea').value.match(/导出时间：(.*)/)[1]));
});
test('独立安装页的书签可执行，且打包了当前源码', () => {
  const { document } = parseHTML(installer);
  const bookmark = document.getElementById('bookmark').getAttribute('href');
  assert.ok(bookmark.startsWith('javascript:'));
  assert.ok(bookmark.length < 65536);
  const code = decodeURIComponent(bookmark.slice(11));
  assert.ok(code.includes(source));
  const env = environment(article);
  vm.runInContext(code, env.sandbox);
  assert.equal(env.downloads.length, 1);
});

let listener;
const calls = [];
const chrome = {
  action: { onClicked: { addListener(fn) { listener = fn; } },
    setBadgeText: async args => calls.push(['badge', args]), setBadgeBackgroundColor: async () => {}, setTitle: async args => calls.push(['title', args]) },
  scripting: { executeScript: async args => { calls.push(['execute', args]); return [{ result: { ok: true } }]; } },
};
vm.runInNewContext(background, { chrome, URL });
await listener({ id: 42, url: 'https://x.com/author/status/123' });
await listener({ id: 43, url: 'https://example.com' });
test('扩展仅对当前 X 标签注入脚本，结果徽标正确（API 桩）', () => {
  assert.equal(calls.filter(([kind]) => kind === 'execute').length, 1);
  assert.equal(calls.find(([kind]) => kind === 'execute')[1].target.tabId, 42);
  assert.ok(calls.some(([kind, value]) => kind === 'badge' && value.tabId === 42 && value.text === 'OK'));
  assert.ok(calls.some(([kind, value]) => kind === 'badge' && value.tabId === 43 && value.text === '!'));
});
console.log(`\n${count} DOM checks passed. Real browser/X verification remains separate.`);
