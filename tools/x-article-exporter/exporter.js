/* X Article Exporter. No network requests, credentials, or external dependencies. */
(function (global) {
  'use strict';

  const BODY_SELECTORS = [
    '[data-testid="twitterArticleRichTextView"]',
    '[data-testid="twitterArticleReadViewRichText"]',
    '[data-testid="longformRichTextComponent"]',
    '[data-testid="twitterArticleReadView"] .public-DraftEditor-content',
    '[data-testid="twitterArticleReadView"] .DraftEditor-root',
    '.x-article-body',
  ];
  const TITLE_SELECTOR = '[data-testid="twitterArticleReadViewTitle"], [data-testid="twitterArticleTitle"]';
  const TWEET_SELECTOR = 'article[data-testid="tweet"]';
  const SKIP = 'script, style, noscript, nav, [hidden], [aria-hidden="true"], #x-article-exporter';

  function text(node) {
    return (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function ownerTweet(node) {
    return node.closest(TWEET_SELECTOR) || node.closest('article');
  }

  function escapeText(value) {
    return value.replace(/\\/g, '\\\\').replace(/([`*_\[\]~<>#|!])/g, '\\$1');
  }

  function safeUrl(value, base) {
    if (!value) return '';
    try {
      const url = new URL(value, base);
      return /^https?:$/.test(url.protocol) ? url.href.replace(/[()]/g, c => '%' + c.charCodeAt(0).toString(16)) : '';
    } catch (_) {
      return '';
    }
  }

  function imageUrl(node, base) {
    const url = safeUrl(node.currentSrc || node.getAttribute('src') || node.getAttribute('data-src'), base);
    if (!url) return '';
    const parsed = new URL(url);
    if (parsed.hostname === 'pbs.twimg.com' && parsed.pathname.startsWith('/media/')) {
      parsed.searchParams.set('name', 'orig');
    }
    return parsed.href.replace(/[()]/g, c => '%' + c.charCodeAt(0).toString(16));
  }

  function trimBlock(value) {
    return value.replace(/^\n+|\n+$/g, '');
  }

  function render(node, base) {
    if (node.nodeType === 3) return escapeText(node.nodeValue.replace(/\s+/g, ' '));
    if (node.nodeType !== 1) return '';
    if (node.matches(SKIP)) return '';
    if (node.style.display === 'none' || node.style.visibility === 'hidden') return '';
    if (node.matches('button, [role="button"]') && !node.querySelector('img')) return '';
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes).map(child => render(child, base)).join('');
    const block = content => '\n\n' + trimBlock(content).trim() + '\n\n';

    if (tag === 'br') return '\n';
    if (tag === 'hr') return '\n\n---\n\n';
    if (tag === 'img') {
      const alt = (node.getAttribute('alt') || '').replace(/\s+/g, ' ');
      const raw = node.getAttribute('src') || '';
      if (/\/emoji\//.test(raw)) return escapeText(alt);
      const src = imageUrl(node, base);
      return src ? block('![' + escapeText(alt || '文章配图') + '](' + src + ')') : '';
    }
    if (tag === 'pre') {
      const code = node.textContent.replace(/\r\n/g, '\n').replace(/\n$/, '');
      const longest = Math.max(2, ...Array.from(code.matchAll(/`+/g), m => m[0].length));
      const fence = '`'.repeat(longest + 1);
      const lang = (node.querySelector('code')?.className || '').match(/language-([\w+-]+)/)?.[1] || '';
      return '\n\n' + fence + lang + '\n' + code + '\n' + fence + '\n\n';
    }
    if (tag === 'code') {
      const code = node.textContent.replace(/\n/g, ' ');
      const longest = Math.max(0, ...Array.from(code.matchAll(/`+/g), m => m[0].length));
      const fence = '`'.repeat(longest + 1);
      const pad = /^[ `]|[ `]$/.test(code) ? ' ' : '';
      return fence + pad + code + pad + fence;
    }
    if (tag === 'table') {
      const rows = Array.from(node.rows).map(row => Array.from(row.cells).map(cell =>
        trimBlock(childrenOf(cell, base)).trim().replace(/\n+/g, '<br>').replace(/\|/g, '\\|')));
      if (!rows.length) return '';
      const width = Math.max(...rows.map(row => row.length));
      const line = row => '| ' + Array.from({ length: width }, (_, i) => row[i] || '').join(' | ') + ' |';
      return block([line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n'));
    }
    if (tag === 'ul' || tag === 'ol') {
      let index = Number(node.getAttribute('start')) || 1;
      const items = Array.from(node.children).filter(el => el.tagName === 'LI').map(li => {
        if (li.hasAttribute('value')) index = Number(li.getAttribute('value')) || index;
        const prefix = tag === 'ol' ? String(index++) + '. ' : '- ';
        const lines = trimBlock(childrenOf(li, base)).trim().split('\n');
        return prefix + lines.map((line, i) => i ? ' '.repeat(prefix.length) + line : line).join('\n');
      });
      return '\n\n' + items.join('\n') + '\n\n';
    }
    if (tag === 'blockquote') {
      return block(trimBlock(children()).trim().split('\n').map(line => '> ' + line).join('\n'));
    }
    if (tag === 'a') {
      const content = children();
      if (node.querySelector('img')) return content;
      // X frequently displays a shortened label while exposing the full URL as title.
      const title = node.getAttribute('title') || '';
      const href = (/^https?:\/\//.test(title) && safeUrl(title, base)) || safeUrl(node.getAttribute('href'), base);
      return href && content.trim() ? '[' + content.trim() + '](' + href + ')' : content;
    }
    if (tag === 'video' || tag === 'iframe') {
      return block('[视频或嵌入内容：请在原文中查看](' + safeUrl(base, base) + ')');
    }
    if (node.matches(TWEET_SELECTOR)) {
      const href = node.querySelector('a[href*="/status/"]')?.getAttribute('href');
      return block('[嵌入帖子](' + (safeUrl(href, base) || safeUrl(base, base)) + ')');
    }
    let content = children();
    if (/^h[1-6]$/.test(tag) || node.getAttribute('role') === 'heading') {
      const level = Number(tag[1]) || Number(node.getAttribute('aria-level')) || 2;
      return block('#'.repeat(Math.min(level + 1, 6)) + ' ' + content.trim());
    }
    const decorate = (value, token) => value.replace(/^(\s*)([\s\S]*?\S)(\s*)$/, (_, before, middle, after) => before + token + middle + token + after);
    const weight = node.style?.fontWeight;
    if ((tag === 'strong' || tag === 'b' || weight === 'bold' || Number(weight) >= 600) && !node.parentElement?.closest('b, strong')) {
      content = decorate(content, '**');
    }
    if ((tag === 'em' || tag === 'i' || node.style?.fontStyle === 'italic') && !node.parentElement?.closest('em, i')) {
      content = decorate(content, '*');
    }
    if ((tag === 'del' || tag === 's' || node.style?.textDecorationLine === 'line-through') && !node.parentElement?.closest('del, s')) {
      content = decorate(content, '~~');
    }
    return /^(p|div|section|figure|figcaption|article)$/.test(tag) ? block(content) : content;
  }

  function childrenOf(node, base) {
    return Array.from(node.childNodes).map(child => render(child, base)).join('');
  }

  function markdown(node, base) {
    let fence = '';
    let blank = false;
    const lines = [];
    for (const line of childrenOf(node, base).split('\n')) {
      const marker = line.match(/^\s*(`{3,})([^`]*)$/);
      if (marker && !fence) fence = marker[1];
      else if (fence && line.trim() === fence) fence = '';
      if (fence || line.trim()) {
        lines.push(line);
        blank = false;
      } else if (!blank) {
        lines.push('');
        blank = true;
      }
    }
    return lines.join('\n').trim();
  }

  function visible(node) {
    if (node.closest('[hidden], [aria-hidden="true"]')) return false;
    for (let current = node; current; current = current.parentElement) {
      const style = node.ownerDocument.defaultView.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }

  function mainTweet(doc, url) {
    const id = url.pathname.match(/\/status\/(\d+)/)?.[1];
    if (!id) return null;
    // Match the timestamp permalink, not a reply, quote, or engagement counter.
    for (const node of doc.querySelectorAll(TWEET_SELECTOR)) {
      const ownTimes = Array.from(node.querySelectorAll('a[href] time')).filter(time => time.closest(TWEET_SELECTOR) === node);
      if (ownTimes.some(time => {
        try { return new URL(time.closest('a').href, url).pathname.match(/\/status\/(\d+)/)?.[1] === id; }
        catch (_) { return false; }
      })) return node;
    }
    // The semantic article layout has no test IDs or <time> element.
    for (const node of doc.querySelectorAll('article')) {
      const body = node.querySelector('.x-article-body');
      if (!body || !node.querySelector('h1') || !visible(node)) continue;
      if (Array.from(node.querySelectorAll('a[href]')).some(link => {
        if (body.contains(link) || ownerTweet(link) !== node) return false;
        try { return new URL(link.getAttribute('href'), url).pathname.match(/\/status\/(\d+)/)?.[1] === id; }
        catch (_) { return false; }
      })) return node;
    }
    return null;
  }

  function documentTitle(doc) {
    return doc.title.replace(/\s*[/／]\s*(?:X|Twitter)\s*$/i, '').replace(/^.*? on X:\s*["“]/, '').replace(/["”]\s*$/, '').trim();
  }

  function metadata(doc, url, scope, body) {
    const heading = scope?.querySelector(TITLE_SELECTOR) ||
      Array.from(scope?.querySelectorAll('h1, [role="heading"]') || []).find(el => !body?.contains(el));
    const user = scope?.querySelector('[data-testid="User-Name"]');
    const userText = text(user);
    const pathHandle = url.pathname.match(/^\/(?!i\/)([a-zA-Z0-9_]+)\/(?:status|article)\//)?.[1];
    const handle = userText.match(/@[a-zA-Z0-9_]+/)?.[0] || (pathHandle ? '@' + pathHandle : '');
    const profile = pathHandle ? '/' + pathHandle.toLowerCase() : '';
    const profileName = Array.from(scope?.querySelectorAll('a[href]') || []).find(link => {
      if (body?.contains(link) || !text(link) || text(link).startsWith('@')) return false;
      try { return new URL(link.getAttribute('href'), url).pathname.toLowerCase() === profile; }
      catch (_) { return false; }
    });
    const userName = text(user?.querySelector('a span')) || userText.split('@')[0].trim() || text(profileName);
    const timestampLink = Array.from(scope?.querySelectorAll('a[href]') || []).find(link => {
      if (body?.contains(link) || !/\d{1,2}:\d{2}/.test(text(link))) return false;
      try { return new URL(link.getAttribute('href'), url).pathname === url.pathname; }
      catch (_) { return false; }
    });
    const time = scope?.querySelector('time[datetime]')?.getAttribute('datetime') || text(timestampLink);
    const title = (text(heading) || documentTitle(doc) || text(body).slice(0, 64) || 'X 文章').slice(0, 240);
    return { title, author: userName ? userName + (handle ? '（' + handle + '）' : '') : handle || '未识别', published: time };
  }

  function extract(doc, options = {}) {
    const url = new URL(options.url || doc.location.href);
    if (!/(^|\.)(x\.com|twitter\.com)$/.test(url.hostname)) {
      throw new Error('请在 X 文章或帖子的详情页使用此工具。');
    }
    url.search = '';
    url.hash = '';
    const tweet = mainTweet(doc, url);
    const readView = Array.from(doc.querySelectorAll('[data-testid="twitterArticleReadView"]')).find(visible);
    const selection = options.selection === false ? null : doc.defaultView.getSelection();
    let body;
    let mode;
    let scope;
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      const firstNode = selection.getRangeAt(0).commonAncestorContainer;
      const firstElement = firstNode.nodeType === 1 ? firstNode : firstNode.parentElement;
      if (firstElement?.closest('#x-article-exporter, textarea, input, [contenteditable="true"]')) {
        throw new Error('请先关闭导出面板，再选中文章正文。');
      }
      body = doc.createElement('div');
      for (let i = 0; i < selection.rangeCount; i++) body.append(selection.getRangeAt(i).cloneContents());
      mode = '手动选中';
      scope = readView || tweet;
    } else {
      // Prefer known article body markers. Never fall back to the entire timeline.
      const candidates = [...new Set(BODY_SELECTORS.flatMap(selector => Array.from(doc.querySelectorAll(selector))))]
        .filter(visible).filter(el => {
          if (readView) return readView.contains(el);
          if (tweet) return tweet.contains(el) && ownerTweet(el) === tweet && !el.closest('[data-testid="quoteTweet"]');
          return /\/(?:article)\/\d+/.test(url.pathname);
        }).sort((a, b) => text(b).length - text(a).length);
      body = candidates[0];
      if (body) {
        mode = 'X 长文章';
        scope = body.closest('[data-testid="twitterArticleReadView"]') || tweet || readView || body.closest('article');
        if (body.matches('.x-article-body')) body = body.querySelector(':scope > .contents') || body;
      } else if (tweet) {
        if (tweet.querySelector('[data-testid*="twitterArticle"], a[href*="/article/"]')) {
          throw new Error('当前仍是文章预览卡片。请打开文章全文、滚动到底，再点导出；也可以选中全文后导出。');
        }
        const tweetText = Array.from(tweet.querySelectorAll('[data-testid="tweetText"]'))
          .find(el => el.closest(TWEET_SELECTOR) === tweet);
        if (!tweetText) throw new Error('没有找到正文。请选中要保存的文字后重试。');
        if (Array.from(tweet.querySelectorAll('[data-testid="tweet-text-show-more-link"]')).some(el =>
          el.closest(TWEET_SELECTOR) === tweet && !el.closest('[data-testid="quoteTweet"]'))) {
          throw new Error('正文尚未展开。请先点击“显示更多 / Show more”，再点导出。');
        }
        body = doc.createElement('div');
        body.append(tweetText.cloneNode(true));
        for (const photo of tweet.querySelectorAll('[data-testid="tweetPhoto"]')) {
          if (photo.closest(TWEET_SELECTOR) === tweet && !photo.closest('[data-testid="quoteTweet"]')) body.append(photo.cloneNode(true));
        }
        if (Array.from(tweet.querySelectorAll('video')).some(el => el.closest(TWEET_SELECTOR) === tweet && !el.closest('[data-testid="quoteTweet"]'))) {
          body.append(doc.createElement('video'));
        }
        for (const quote of tweet.querySelectorAll('[data-testid="quoteTweet"]')) {
          const link = quote.querySelector('a[href*="/status/"]');
          if (!link) continue;
          const reference = doc.createElement('p');
          const anchor = doc.createElement('a');
          anchor.href = safeUrl(link.getAttribute('href'), url.href);
          anchor.textContent = '引用帖子：在原文中查看';
          reference.append(anchor);
          body.append(reference);
        }
        mode = 'X 帖子';
        scope = tweet;
      } else {
        throw new Error('未识别到文章正文。请打开文章详情并滚动到底；若 X 改了页面结构，选中正文后再点导出。');
      }
    }
    let content = markdown(body, url.href);
    if (!content.trim()) throw new Error('正文为空。请等待文章加载，或选中正文后重试。');
    const meta = metadata(doc, url, scope, body);
    // The cover normally lives outside the rich-text body.
    const heading = Array.from(scope?.querySelectorAll('h1') || []).find(el => !body.contains(el));
    const cover = mode === 'X 长文章' && (scope?.querySelector('[data-testid="twitterArticleReadViewCoverImage"] img, [data-testid="twitterArticleCoverImage"] img') || heading?.parentElement.querySelector(':scope > img'));
    if (cover && !body.contains(cover)) content = render(cover, url.href).trim() + '\n\n' + content;
    const warnings = [];
    if (mode === '手动选中') warnings.push('仅导出你选中的部分，请确认包含文章开头和结尾。');
    warnings.push('仅保存当前已加载的内容；请与原文首尾对照。图片保留在线原图链接，不含离线图片文件。');
    const exported = options.now || new Date().toISOString();
    const header = '# ' + escapeText(meta.title) + '\n\n> 作者：' + escapeText(meta.author) +
      '\n> 原文：' + url.href + (meta.published ? '\n> 发布时间：' + meta.published : '') +
      '\n> 导出时间：' + exported + '\n> 导出方式：' + mode;
    return {
      ...meta, sourceUrl: url.href, mode, warnings,
      markdown: header + '\n\n' + content + '\n',
      filename: (meta.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 100) || 'X文章') + '.md',
      imageCount: (content.match(/!\[/g) || []).length,
      characterCount: text(body).length,
    };
  }

  function download(doc, result) {
    const win = doc.defaultView;
    const blob = new win.Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = win.URL.createObjectURL(blob);
    const anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = result.filename;
    doc.body.append(anchor);
    anchor.click();
    anchor.remove();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 30000);
  }

  function panel(doc, result, error) {
    doc.getElementById('x-article-exporter')?.remove();
    const host = doc.createElement('div');
    host.id = 'x-article-exporter';
    host.style.cssText = 'position:fixed;inset:auto 16px 16px auto;z-index:2147483647;width:min(680px,calc(100vw - 32px))';
    const root = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = ':host{font:14px/1.6 system-ui;color:#17232a}section{background:#fff;border:1px solid #c9d8d0;border-radius:16px;padding:20px;box-shadow:0 12px 60px #0004;max-height:75vh;overflow:auto}h2{font-size:19px;margin:0 0 8px}p{margin:8px 0}button{background:#edf4ef;border:1px solid #b8cabb;border-radius:8px;padding:8px 12px;cursor:pointer;font:inherit;margin:0 8px 8px 0}button:first-of-type{background:#176148;color:white;border-color:#176148}textarea{box-sizing:border-box;width:100%;height:220px;font:12px/1.5 ui-monospace,monospace;border:1px solid #c9d8d0;border-radius:8px;padding:10px;color:#17232a;background:#fafcfb}.note{font-size:12px;color:#53645b}';
    root.append(style);
    const box = doc.createElement('section');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'X 文章导出');
    root.append(box);
    const add = (tag, value, className) => {
      const el = doc.createElement(tag);
      el.textContent = value;
      if (className) el.className = className;
      box.append(el);
      return el;
    };
    add('h2', error ? '暂时无法导出' : '已生成 Markdown');
    if (error) add('p', error.message);
    if (result) {
      add('p', result.title);
      add('p', result.mode + ' · ' + result.characterCount + ' 字符 · ' + result.imageCount + ' 张图片');
      const save = add('button', '再次下载 .md');
      save.onclick = () => download(doc, result);
      const copy = add('button', '复制 Markdown');
      const close = add('button', '关闭');
      close.onclick = () => host.remove();
      const preview = add('textarea', '');
      preview.value = result.markdown;
      preview.readOnly = true;
      preview.setAttribute('aria-label', 'Markdown 正文预览');
      copy.onclick = async () => {
        try {
          await doc.defaultView.navigator.clipboard.writeText(result.markdown);
          copy.textContent = '已复制';
        } catch (_) {
          preview.focus();
          preview.select();
          copy.textContent = doc.execCommand('copy') ? '已复制' : '请按 Ctrl/Cmd+C 复制';
        }
      };
      for (const warning of result.warnings) add('p', warning, 'note');
    } else {
      add('button', '关闭').onclick = () => host.remove();
    }
    doc.body.append(host);
  }

  function run(doc = document) {
    try {
      const result = extract(doc);
      download(doc, result);
      panel(doc, result);
      return { ok: true, filename: result.filename, characters: result.characterCount, images: result.imageCount };
    } catch (error) {
      panel(doc, null, error);
      return { ok: false, error: error.message };
    }
  }

  global.XArticleExporter = { extract, markdown, run };
})(globalThis);
