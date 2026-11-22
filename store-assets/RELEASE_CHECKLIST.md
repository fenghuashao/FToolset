# FToolset 1.0.0 首次提审清单

## 上传材料

| 材料 | 使用位置 |
| --- | --- |
| `.output/ftoolset-1.0.0-chrome.zip` | Developer Dashboard 新增项目。Manifest V3，`manifest.json` 位于 ZIP 根目录 |
| [128 × 128 扩展图标](../public/icon/128.png) | Store listing 图标，ZIP 内路径为 `icon/128.png` |
| [英文说明](LISTING_EN.md) · [简体中文说明](LISTING_ZH.md) | 分别粘贴详细介绍。标题和短简介来自 ZIP 内对应语言的 manifest 字段 |
| [英文生成](screenshots/en-01-create.png) · [英文样式](screenshots/en-02-style.png) | 英文本地化截图，按顺序上传 |
| [中文生成](screenshots/zh-cn-01-create.png) · [中文样式](screenshots/zh-cn-02-style.png) | 简体中文本地化截图，按顺序上传 |
| [440 × 280 小促销图](small-promo-440x280.png) | Small promo tile，两种语言共用 |
| [双语隐私政策](PRIVACY.md) · [权限说明](PERMISSIONS_JUSTIFICATION.md) | Privacy practices。政策发布到无需登录即可访问的 HTTPS 页面后填写 URL |

截图为 1280 × 800 的不透明 PNG。弹窗内容取自本次 ZIP 中实际运行的扩展，以 400 像素宽度放入示例网页环境。生成截图采用浅色模式，样式截图采用深色模式并滚动至高级设置。示例网址、中心图标和网页内容均为演示数据。

## 本地核对

- [x] `npm run typecheck`、27 项单测、WXT 生产构建、5 项 Playwright Chromium 端到端测试通过。
- [x] 对照测试使用的构建产物校验 ZIP。版本 1.0.0，默认英语，包含简体中文资源与第三方许可通知，Chrome 最低版本 111。
- [x] 确认权限只有 `activeTab`、`storage`、`contextMenus`，没有站点权限或远程代码。

ZIP SHA-256

```text
8f2db8ba68d347b08bc07a067b64c8babdb6a8af4cb1a04921eb3f1a772dbe1d
```

重新打包后重新检测 ZIP、运行验证，并核对商店材料与新包一致。

## Developer Dashboard

1. 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)。确认发布者账号已完成注册和两步验证，发布者名称与联系邮箱已设定，邮箱已验证。按账号实情填写 Trader 或 Non-Trader 声明。若账号仍需注册或身份核验，由发布者在 Dashboard 完成。
2. 确认上表版本和 ZIP SHA-256，选 **Add new item** 后上传 ZIP，在 **Package** 看版本与权限。Manifest 的标题、短简介、版本等字段须通过新包修改。
3. 在 **Store listing** 选 **Tools** 分类。分别填写英文和简体中文详细介绍及截图，填写图标和小促销图。
4. 在 **Privacy practices** 粘贴单一目的与三项权限说明，Remote code 选 **No**。将公开的隐私政策 URL 粘贴到政策字段，用未登录窗口确认可以访问。核对下面的数据披露与认证。
5. 在 **Distribution** 确认可见性、分发地区及免费发布设置。扩展无账号、付费墙或评审凭据，**Test instructions** 可留空。
6. 发布者核对完整草稿后使用 **Submit for Review**。如需自行决定上线时间，取消审核通过后自动发布。

## Privacy practices 数据类型

- **Website content** 建议勾选。扩展按用户操作读取所选网页文字或链接，并在本机生成二维码。
- **Web history** 建议保守勾选并在说明中写明仅使用当前活动标签页的 URL。Chrome 的用户数据 FAQ 将互动过的网页 URL 列入浏览活动，FToolset 不读取访问历史列表。若 Dashboard 当日字段定义更具体，按实际字段和公开政策复核。
- 按 1.0.0 的实现，其余类型留空。扩展不要求用户提交个人标识、健康、财务、认证、通讯或位置数据，也不记录使用活动。自由输入与本地图标仅按用户要求生成二维码。
- 核对并勾选页面上的三项 Limited Use 认证。扩展不会出售用户数据、用于其他目的或用于信用与借贷判断。

本地材料已准备。隐私页面托管和 Dashboard 上传、认证、提交与发布仍待发布者操作。

## Chrome 官方说明

- [准备扩展与 ZIP](https://developer.chrome.com/docs/webstore/prepare)
- [首次发布步骤](https://developer.chrome.com/docs/webstore/publish)
- [账号与联系邮箱](https://developer.chrome.com/docs/webstore/set-up-account) · [两步验证](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification) · [Trader 声明](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
- [商店说明和本地化素材](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) · [图像规格](https://developer.chrome.com/docs/webstore/images) · [分类](https://developer.chrome.com/docs/webstore/best-practices)
- [隐私字段与认证](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) · [用户数据与纯本机处理 FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [分发设置](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution) · [评审指引](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
