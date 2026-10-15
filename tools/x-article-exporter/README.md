# X 文章一键导出 Markdown

将浏览器里已打开、已加载的 X 长文章或帖子导出为 `.md`。提供离线安装页和 Chrome/Edge 扩展两种入口，使用同一套提取逻辑。

## 安装与使用

### 书签方式

1. 下载本目录的 [`install.html`](./install.html)，用浏览器打开。GitHub 文件预览不能直接运行，需下载原始文件。
2. 把绿色的“导出 X 文章”按钮拖到书签栏；或者点击“复制书签地址”，手动创建书签并粘贴网址。
3. 打开 X 文章详情，展开全文、滚动到末尾，再点击书签。工具会下载 `文章标题.md`，并显示预览面板。

书签受页面安全策略或地址长度限制无法执行时，使用扩展方式。

### Chrome / Edge 扩展方式

1. 下载 [`x-article-exporter.zip`](./x-article-exporter.zip) 并解压；也可以直接下载整个仓库。
2. 打开 `chrome://extensions` 或 `edge://extensions`，开启开发者模式。
3. 点击“加载已解压的扩展程序”，选择含 `manifest.json` 的 `x-article-exporter` 目录。
4. 固定到工具栏。打开 X 文章详情并加载全文后，点扩展图标即会下载 Markdown；图标上的 `OK` 表示已生成文件，`!` 表示需要查看页面提示或悬停提示。

扩展仅声明 `activeTab` 与 `scripting`，在你点击图标时读取当前 X 页面，不持续监控浏览记录。实现依据：[Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)、[Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)。

### 手动选中，作为兼容方式

X 改动页面结构、文章正文无法识别时，先关闭导出面板，再用鼠标选中正文，点击同一个书签或扩展图标。会保留选区内的格式与图片，导出文件标记为“手动选中”。请核对选区包含文章开头和结尾。

## 导出范围

- 标题、作者和账号（页面能识别时）、原文 URL、页面提供的发布时间、导出时间。
- 段落、标题、粗体、斜体、删除线、链接、引用、嵌套列表、代码块与普通表格。
- 原图链接与可识别的封面；图片不下载到本地，导出的 Markdown 不是离线图片归档包。
- 视频和嵌入帖保留访问入口，不下载视频或展开嵌入帖全文。
- 普通帖子按当前 URL 的时间戳永久链接匹配正文，避免把其他回复导出。工具不会将整个时间线作为备用正文。
- 没有联网请求、API Key、Cookie 读取或上传接口。文件直接保存在浏览器下载目录，不会自动发送给模型、翻译或提交到 GitHub。

## 已知边界

这是基于浏览器 DOM 的工具，并非 X 官方导出器。v1.0.1 已在远程 Chrome 打开 [David Haber 的这篇真实 X 文章](https://x.com/dhaber/status/2110370065870680236)，使用同一 `extract()` 核心进行只读提取验证：23 个段落全部包含，首尾完整，1 张封面与 3 张正文图顺序正确，评论和样式代码均排除。实测发现该页面没有旧版 `data-testid` 标记，因而补上了 `.x-article-body` 与语义化文章容器的识别，并修复嵌套加粗导致重复 Markdown 标记的问题。详见[实测记录](./live-verification.json)。

这次验证覆盖真实页面的核心提取，未覆盖真实书签点击、扩展安装和下载落盘；也不代表所有 X 页面均兼容。本地 Playwright 测试仍因缺少 Chromium、下载受限而未执行。已通过的 14 项离线 DOM 回归包含去除原文内容后的真实页面结构样例。X 页面改版后，自动识别规则可能需要更新，手动选区可作为备用方式。

只能导出当前 DOM 中已经加载的内容；工具不能证明正文完整，也不会自动滚动抓取后拼接虚拟化内容。下载后须核对首尾、图片和章节。仍处于预览卡片或可识别的“显示更多”状态时，会提示先打开或展开全文。

作者、标题、封面或发布时间没有独立标记时，可能缺失或退回页面标题。图片仅支持页面可见的 `<img>`，不包含 CSS 背景图、画布和隐藏媒体。复杂合并表格、数学公式与互动组件无法保证原样保留。书签建议在桌面版 Chrome/Edge 使用，移动端和其他浏览器未验证。

## 开发与验证

```bash
python tools/x-article-exporter/build.py
node tools/x-article-exporter/test-dom.mjs
node tools/x-article-exporter/test.mjs
```

构建只需要 Python 标准库；运行和安装均不需要 Node。离线 DOM 测试需要 `npm install --no-save linkedom`，也支持通过 `X_EXPORT_DOM_MODULE` 指定 LinkeDOM 官方独立构建 `worker.js` 的路径。浏览器测试需要 Node 与 Playwright：`npm install --no-save playwright` 后运行 `npx playwright install chromium`。在 Codex 运行环境中，测试也支持读取 `CODEX_PRIMARY_RUNTIME_NODE_MODULES` 下的 Playwright。

`exporter.js` 是提取、Markdown 转换与下载面板的唯一实现；`build.py` 将源码打包进独立安装页，并生成扩展 ZIP。改源码后必须重新构建，不手动编辑 `install.html`。

离线 DOM 回归覆盖：长文章正文与封面、回复排除、未展开内容拒绝导出、手动选区、格式/代码/图片/链接转换、安装页书签执行，以及下载 Blob 和扩展调用的桩验证。Playwright 脚本另包含浏览器下载验证；扩展 API 为桩，不等同于实际加载扩展。所有测试使用模拟页面，不调用 X 服务。
