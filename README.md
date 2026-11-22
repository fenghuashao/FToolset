# FToolset

FToolset 是一个离线运行的 Chrome 小工具扩展，当前提供二维码生成器。打开扩展即可将当前网页、链接或文本生成二维码。支持 Chrome 111 及以上版本，界面提供简体中文和英文。

<img src="store-assets/screenshots/zh-cn-01-create.png" width="720" alt="FToolset 在 Chrome 工具栏弹窗中生成和预览网页二维码">

## 生成二维码

- 打开扩展后，如果 Chrome 允许读取当前标签页链接，扩展会自动填入。也可以手动输入链接或文字。
- 右键点击网页链接或选中文字，通过 FToolset 菜单生成二维码。如果弹窗没有自动打开，点击工具栏上的 FToolset 即可继续。
- 在「样式与图标」中调整码点样式、前景色、背景色和纠错等级，也可以用本机的 PNG、JPG 或 SVG 作为中心图标。
- 可复制 PNG 到剪贴板，或下载 512 × 512 的 PNG 和可缩放的 SVG。

## 从源码安装

需要 Node.js 22.12 及以上的 22.x 版本、24.x，或 26 及以上版本。

```bash
git clone https://github.com/fenghuashao/FToolset.git
cd FToolset
npm ci
npm run build
```

1. 在 Chrome 中打开 `chrome://extensions`，开启「开发者模式」。
2. 点击「加载已解压的扩展程序」，选择项目里的 `.output/chrome-mv3` 目录。 [Chrome 官方安装说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
3. 从 Chrome 工具栏的扩展菜单打开 FToolset，也可以将它固定到工具栏。

## 开发与测试

项目使用 WXT、React 和 TypeScript，构建为 Manifest V3 扩展。运行 `npm run dev` 进入开发模式。

```bash
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright 端到端测试会在 Chromium 中加载 `.output/chrome-mv3` 中的构建产物。运行 `npm run zip` 可生成 `.output/ftoolset-<版本>-chrome.zip`，提审步骤见 [Chrome Web Store 提审清单](store-assets/RELEASE_CHECKLIST.md)。

- `entrypoints/` 包含工具栏弹窗和后台 Service Worker。
- `src/tools/` 包含工具注册表和二维码实现。
- `public/_locales/` 包含简体中文和英文文案。

## 隐私与权限

二维码生成、图标处理和导出均在本机完成。扩展无需账号，也不会上传内容或收集使用统计。 [隐私政策](store-assets/PRIVACY.md) · [Chrome 权限说明](store-assets/PERMISSIONS_JUSTIFICATION.md) · [第三方许可通知](public/THIRD-PARTY-NOTICES.txt)
