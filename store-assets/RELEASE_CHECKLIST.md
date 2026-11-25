# FToolset 1.2.0 提审清单

## 上传材料

| 材料 | 使用位置 |
| --- | --- |
| `.output/ftoolset-1.2.0-chrome.zip` | Developer Dashboard 上传新版本包（169.77 KB）。Manifest V3，`manifest.json` 位于 ZIP 根目录 |
| [128 × 128 扩展图标](../public/icon/128.png) | Store listing 图标，ZIP 内路径为 `icon/128.png` |
| [英文说明](LISTING_EN.md) · [简体中文说明](LISTING_ZH.md) | 分别粘贴详细介绍。标题和短简介来自 ZIP 内对应语言的 manifest 字段 |
| [英文二维码](screenshots/en-01-qr.png) · [英文链接净化](screenshots/en-02-link.png) · [英文文字整理](screenshots/en-03-text.png) · [英文网页取色](screenshots/en-04-color.png) | 英文本地化截图（4 张），按顺序上传 |
| [中文二维码](screenshots/zh-cn-01-qr.png) · [中文链接净化](screenshots/zh-cn-02-link.png) · [中文文字整理](screenshots/zh-cn-03-text.png) · [中文网页取色](screenshots/zh-cn-04-color.png) | 简体中文本地化截图（4 张），按顺序上传 |
| [440 × 280 小促销图](small-promo-440x280.png) | Small promo tile，两种语言共用 |
| [双语隐私政策](PRIVACY.md) · [权限说明](PERMISSIONS_JUSTIFICATION.md) | Privacy practices。政策发布到无需登录即可访问的 HTTPS 页面后填写 URL |

全部截图均为 `1280 × 800` 不透明 RGB PNG（无 Alpha 透明通道）。弹窗与全屏工作台画面均取自本次 ZIP 中实际运行的 `1.2.0` 扩展，覆盖浅色与深色模式、4 槽快捷栏、Popup 及新标签页放大模式（`?view=tab`）。示例网址与示例文案均为演示数据。

## 本地核对

- [x] `npm run typecheck`、**50 项单测（7 个测试文件）**、WXT 生产构建、**14 项 Playwright Chromium 端到端测试**全部通过。
- [x] Windows Chrome 实机验收通过：二维码生成与识别、链接净化、文字整理、网页取色（`EyeDropper` Popup 保持打开、`Esc` 取消、最近/收藏色板持久化）、顶栏原地搜索与新标签页放大模式均符合预期。
- [x] 对照测试使用的构建产物校验 ZIP：版本 `1.2.0`，共 17 个文件（解压后 517.03 KB，ZIP 169.77 KB），默认英语，包含简体中文资源与第三方许可通知（含 `qr-code-styling` MIT 与 `jsqr` Apache-2.0），Chrome 最低版本 `111`。
- [x] 确认权限严格保持 `activeTab`、`storage`、`contextMenus` 三项，无站点权限、无 `storage.sync`、无远程代码，生产 CSP 包含 `connect-src 'none'`。

ZIP SHA-256

```text
6a738b2728b628afe81b883087c2be239efb4ce5114fd6831ad31bbb8473f20c
```

重新打包后需重新核对 ZIP SHA-256、运行全量验证，并确认商店材料与新包一致。

## Developer Dashboard

1. 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)，进入 FToolset 项目（若为首次新建则选 **Add new item**）。
2. 核对上表版本（`1.2.0`）和 ZIP SHA-256，在 **Package** 上传 `.output/ftoolset-1.2.0-chrome.zip`，确认权限仍为 `activeTab`、`storage`、`contextMenus`（零新增权限警告）。
3. 在 **Store listing** 确认 **Tools** 分类。分别更新英文和简体中文详细介绍及 4 张本地化截图，核对图标与小促销图。
4. 在 **Privacy practices** 更新单一目的、三项权限说明（已涵盖二维码生成/识别、链接净化、文字整理、网页取色及本机色板持久化），**Remote code** 选 **No**。确认公开的隐私政策 URL 已同步到 `1.2.0` 内容且未登录窗口可访问。
5. 在 **Distribution** 确认可见性、分发地区及免费发布设置。扩展无账号、付费墙或评审凭据，**Test instructions** 可留空。
6. 发布者核对完整草稿后使用 **Submit for Review**。如需自行决定上线时间，取消审核通过后自动发布。

## Privacy practices 数据类型

- **Website content** 建议勾选。扩展按用户主动操作读取所选网页文字、右键链接或用户主动选择的本机图片/屏幕单像素色值，并在本机完成处理。
- **Web history** 建议保守勾选并在说明中写明仅使用当前活动标签页的 URL（用于二维码生成器与链接净化预填）。Chrome 的用户数据 FAQ 将互动过的网页 URL 列入浏览活动，FToolset 不读取访问历史列表。
- 按 `1.2.0` 的实现，其余类型留空。扩展不要求用户提交个人标识、健康、财务、认证、通讯或位置数据，不记录使用活动，也不使用 `chrome.storage.sync`。网页取色的最近取色与收藏色板仅保存在当前配置本机 `chrome.storage.local`，用户可随时清空。
- 核对并勾选页面上的三项 Limited Use 认证。扩展不会出售用户数据、用于其他目的或用于信用与借贷判断。

本地发布材料与 ZIP 包均已就绪。隐私政策公开页同步、Dashboard 上传、认证、提交与发布由发布者完成。

## Chrome 官方说明

- [准备扩展与 ZIP](https://developer.chrome.com/docs/webstore/prepare)
- [首次发布与更新步骤](https://developer.chrome.com/docs/webstore/publish)
- [账号与联系邮箱](https://developer.chrome.com/docs/webstore/set-up-account) · [两步验证](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification) · [Trader 声明](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
- [商店说明和本地化素材](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) · [图像规格](https://developer.chrome.com/docs/webstore/images) · [分类](https://developer.chrome.com/docs/webstore/best-practices)
- [隐私字段与认证](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) · [用户数据与纯本机处理 FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [分发设置](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution) · [评审指引](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
