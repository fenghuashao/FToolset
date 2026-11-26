# FToolset 隐私政策 / Privacy Policy

适用版本 / Version 1.2.0

文档日期 / Document date 2026-11-24

语言 / Language: [简体中文](#简体中文) · [English](#english)

## 简体中文

FToolset 完全在本机运行，安装后可离线使用。开发者不收集任何用户数据，扩展也不传输任何用户数据。扩展无需账号，且没有广告、遥测或使用统计。

- **二维码生成与识别。** 打开扩展时，若 Chrome 授权读取当前活动标签页的 URL，二维码生成器会用它填充内容框。你也可以输入链接或文字、通过右键菜单提交所选文字或链接，或粘贴/选择本地图片进行中心图标叠加或二维码识别。所有内容和图片均在浏览器本机处理。
- **链接净化、文字整理与网页取色。** 在链接净化工具中，扩展可按你的主动操作读取当前活动标签页的 URL 或右键提交的链接，在本地剥离常见追踪参数。在文字整理工具中，扩展仅处理你主动输入、粘贴或右键提交的文本，在本地完成字数统计与格式清理。在网页取色工具中，仅在你主动点击“从屏幕取色”时调用浏览器原生 `EyeDropper API` 读取你点击位置的单个屏幕像素色值，并在本地换算色值格式与文字对比度。
- **本地存储。** FToolset 在当前 Chrome 配置的本地存储（`chrome.storage.local`）中记住上次使用的工具、快捷栏显隐及自定义固定工具偏好，以及你在网页取色工具中保存的最近取色与收藏色板（可随时清空或取消收藏）。右键菜单提交的所选文字或链接，以及点击“放大”在新标签页打开工作台时的当前草稿，仅在浏览器会话（`chrome.storage.session`）内临时交接，读取后立即移除；未读取的数据会随浏览器重启或扩展禁用、重载而清除。手动输入的内容、图片和输出结果留在当前页面，关闭后不保留在扩展存储。扩展不记录网页访问历史，也不使用 Chrome 同步存储。
- **复制、打开链接与下载。** 点击复制（或完成屏幕取色自动复制色值）时，扩展把生成的 PNG 或整理后的文本/链接/色值写入系统剪贴板。点击下载时，Chrome 将文件保存到本机。识别出 `http://` 或 `https://` 链接时，仅在你主动点击“打开链接”后才会打开。卸载 FToolset 会清除扩展自己的本地设置。

FToolset 仅为上述用户主动发起的功能使用这些数据，遵守 Chrome Web Store 用户数据政策及其 Limited Use 要求。

## English

FToolset runs entirely on your device and works offline after installation. The developer does not collect any user data, and the extension does not transmit any user data. It requires no account and contains no ads, telemetry, or usage analytics.

- **QR code generation and decoding.** When you open FToolset, Chrome may grant temporary access to the active tab's URL to prefill the QR generator. You can also enter a link or text, send selected text or a link from the context menu, or paste/choose a local image for center logos or offline QR decoding. Chrome processes all content and images locally on your device.
- **Link cleaning, text cleanup, and color picking.** When you use Link cleaner, FToolset may read the active tab's URL or a context-menu link you choose and strip common tracking parameters locally. When you use Text cleaner, FToolset processes only text you type, paste, or send via the context menu to count words and clean formatting locally. When you use Color picker, Chrome's native `EyeDropper` API samples a single screen pixel only when you click Pick from screen and click a pixel, then converts formats and checks WCAG contrast locally.
- **Local storage.** FToolset stores your last selected tool, quick bar visibility, pinned quick-bar tool IDs, and Color picker recent/favorite swatches in local extension storage (`chrome.storage.local`) for this Chrome profile (which you can clear or unstar at any time). Context-menu selections/links and the active working draft when expanding into a full extension tab are handed off temporarily via browser session storage (`chrome.storage.session`) and removed immediately after reading. Unread items are cleared when Chrome restarts or the extension is disabled or reloaded. Manual input, images, and tool outputs stay in the open view and are not persisted after you close it. FToolset keeps no browsing history and uses no Chrome sync storage.
- **Copy, open link, and download.** When you click Copy (or pick a color from screen), FToolset writes the generated PNG or cleaned text, link, or color code to your system clipboard. When you click Download, Chrome saves the file on your device. Decoded `http://` or `https://` links open only when you explicitly click Open link. Uninstalling FToolset removes its local extension settings.

FToolset uses data only for the functions described above that you choose to use. It complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
