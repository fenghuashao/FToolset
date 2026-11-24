# FToolset 面向大众的 uTools 插件生态调研与落地规划报告

> **项目定位**：FToolset（轻量级大众效率 Chrome 工具集合插件）  
> **技术栈**：[WXT](https://wxt.dev/) + React + TypeScript + Tailwind CSS（Chrome Manifest V3）  
> **核心约束**：纯前端本地运行、极简权限（当前仅 `activeTab` / `storage` / `contextMenus`）、中英双语全球化、零门槛大众向

---

## 1. 调研方法与大众化筛选标准

### 1.1 扫描范围与分类覆盖
本次调研系统扫描了 [uTools 插件应用市场](https://www.u-tools.cn/plugins/)（已汇聚 5,600+ 插件应用）中的核心榜单与大众高频专题，重点覆盖 [最受欢迎](https://www.u-tools.cn/plugins/topic/17/)、[uTools 官方插件](https://www.u-tools.cn/plugins/topic/102/)、[图像视频](https://www.u-tools.cn/plugins/topic/9/)、[高频使用场景](https://www.u-tools.cn/plugins/topic/33/) 及日常工具类目，将适合大众用户的实用工具归纳为六大通用分类：

1. **日常办公与文档**：网页正文剪藏、文本对比、PDF 轻量处理、常用短语快贴等。
2. **文本处理与效率**：字数统计、文本清洗、大小写与简繁转换、链接净化等。
3. **图像与色彩设计**：网页取色与配色、本地图片压缩与转格式、社媒配图加水印/圆角、网页可见区截图与二维码解析等。
4. **计算与生活换算**：万能单位换算、自然语言计算稿纸、日期差与倒数日计算等。
5. **时间与专注管理**：世界时钟与时区换算、极简番茄钟、轻量便签与每日待办等。
6. **隐私与安全辅助**：本地强密码生成与强度检测、追踪参数清理等。

### 1.2 五维评估模型
每个候选工具均按以下五个维度逐一核验，任一核心约束不达标即降级或淘汰：

| 评估维度 | 核心考量标准 |
| :--- | :--- |
| **1. 大众普适性与高频度** | 普通办公族、学生、内容创作者在日常浏览网页、写文档、做 PPT 时能否零学习成本直接上手？命名和交互是否完全去技术化？ |
| **2. 浏览器场景增益** | 相比桌面端 uTools，放入 Chrome 后是否具备“自动读取当前网页 URL/选中文本/页面配色/图片”的独家快捷优势？ |
| **3. MV3 纯前端可行性** | 能否 100% 在浏览器沙盒内通过原生 Web API、纯 JS 或轻量 WASM 运行？总包体增量是否可控？是否严格避开远程代码执行与已废弃 MV2 API？ |
| **4. 权限与合规成本** | 能否复用现有 `activeTab`、`storage`、`contextMenus`？若需新增权限（如 `scripting`、`sidePanel`、`alarms`），是否属于低风险、无安装警告的 CWS 友好权限？ |
| **5. UI 空间适配度** | 能否在 Popup 弹窗（建议宽度 360px–420px）内 3 秒内完成操作？若需要较宽画布或跨标签页常驻，则归入 Side Panel 演进梯队。 |

### 1.3 明确的淘汰红线
为确保 FToolset 保持“大众、轻量、隐私、全球化”的产品心智，本次调研设立四条硬性淘汰红线：

- **红线一：纯开发与运维向工具** — 剔除 [uTools 程序员必备专题](https://www.u-tools.cn/plugins/topic/6/) 中的 JSON/XML 格式化、正则表达式调试、JWT 解析、Cron 表达式、时间戳（Unix Timestamp）、代码变量命名、Base64 编解码等工具，避免界面充满专业术语吓退普通用户。
- **红线二：中国本土强绑定工具** — 剔除仅服务于国内特定生态的工具，如国内电子发票查验与归类、微信/公众号/国内网盘专用解析、中文成语接龙、国内快递/政务查询等，确保中英双语全球用户开箱即用。
- **红线三：强依赖云端 API 或付费算力的工具** — 剔除需要用户自行申请 API Key 或依赖后端服务器中转的聚合翻译、云端高精度 OCR、AI 大模型对话等，坚守纯本地零成本与隐私不出本地原则。
- **红线四：突破沙盒或需高危权限的工具** — 剔除必须申请 `<all_urls>` 全站宿主权限、后台持续窃听剪贴板、扫描本地磁盘文件或依赖操作系统级窗口置顶的插件，保证 Chrome Web Store（CWS）审核顺畅。

---

## 2. 候选插件分级矩阵（核心总表）

以下共筛选出 **20 个**高口碑、适合大众用户的实用小工具，按落地优先级划分为 **P0（7 个）**、**P1（7 个）**、**P2（6 个）** 三个梯队。

> **权限说明**：`现有权限` 指 FToolset 当前已申请的 `activeTab`、`storage`、`contextMenus`；其余标注权限均在需要时增量引入，且不涉及高危 `<all_urls>` 宿主权限。

### P0：优先落地 / 爆款引流（7 个）
定位：人人都会用、Popup 内 3 秒完成、开发周期短（1~3 天/个）、零新增高危权限。

| 插件名称 | 所属分类 | 一句话核心价值 | 浏览器场景亮点 | 推荐技术方案/库 | 所需权限 | UI形态建议 | 开发难度 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **网页取色器与色板助手**（对应 uTools [颜色助手](https://www.u-tools.cn/plugins/topic/17/)） | 图像与色彩设计 | 屏幕任意位置吸取颜色，一键复制 HEX/RGB/HSL 并生成和谐配色 | 浏览设计灵感或做 PPT 时直接吸取网页任意元素颜色，自动记录历史色卡 | 原生 [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API) + [colord](https://www.npmjs.com/package/colord)（仅 1.8KB，支持色空间转换与 WCAG 对比度检测） | 现有权限 | Popup | 低 |
| **字数统计与文本清洗**（对应 uTools [文本集合处理工具](https://www.u-tools.cn/plugins/detail/%E6%96%87%E6%9C%AC%E9%9B%86%E5%90%88%E5%A4%84%E7%90%86%E5%B7%A5%E5%85%B7/)） | 文本处理与效率 | 实时统计中英字数/预计阅读时长，一键去空行、去多余空格、去换行与行去重 | 网页选中任意段落右键直达统计，或粘贴 PDF/网页乱码换行文本一键洗净 | 原生 JS + `Intl.Segmenter`（精准分词/字素计数） | 现有权限 | Popup | 低 |
| **强密码生成器与安全检测** | 隐私与安全辅助 | 一键生成高强度随机密码或易记词组密码，并可视化评估密码抗破解强度 | 在网页注册新账号时点开 Popup 1 秒生成并复制，全程本地计算不联网 | 原生 [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)（`crypto.getRandomValues`）+ [@zxcvbn-ts/core](https://www.npmjs.com/package/@zxcvbn-ts/core) | 现有权限 | Popup | 低 |
| **万能单位换算器**（对应 uTools [多功能计算器](https://www.u-tools.cn/plugins/detail/%E5%A4%9A%E5%8A%9F%E8%83%BD%E8%AE%A1%E7%AE%97%E5%99%A8/)） | 计算与生活换算 | 覆盖长度、重量、面积、体积、温度、速度与文件存储大小（MB/GB）的即时互转 | 海淘、看海外菜谱或查英文资料时，选中带单位数字右键直接换算（如英寸转厘米、华氏度转摄氏度） | [convert-units](https://www.npmjs.com/package/convert-units)（轻量零依赖，支持链式与智能最优单位） | 现有权限 | Popup | 低 |
| **世界时钟与时区换算** | 时间与专注管理 | 直观对比全球多城市实时时间，支持拖动时间轴预约跨时区会议 | 浏览海外活动页面或跨国办公约会时，一眼看清双方当地上班时段，支持复制多时区日程文本 | 原生 [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) + [@date-fns/tz](https://www.npmjs.com/package/@date-fns/tz) | 现有权限 | Popup | 低 |
| **日期差与倒数日计算** | 计算与生活换算 | 计算两个日期间隔天数/工作日，推算“N 天后是几月几号”并置顶重要倒数日 | 写项目排期、算签证/保质期/考试倒计时，打开弹窗一眼看到距离截止日还剩几天 | [date-fns](https://www.npmjs.com/package/date-fns)（按需 Tree-shaking 引入） | 现有权限 | Popup | 低 |
| **链接净化与参数清理** | 隐私与安全辅助 | 一键去除分享链接中冗长的追踪参数（如 `utm_*`、`fbclid`、`spm`），还原干净短网址 | 点开 Popup 自动读取当前标签页 URL，一键复制清爽链接发给同事或贴进文档 | 原生 `URL` / `URLSearchParams` API + 内置开源追踪参数规则表 | 现有权限 | Popup | 低 |

### P1：高频刚需 / 留存核心（7 个）
定位：深度结合当前网页上下文或右键菜单，显著提升日常浏览与办公效率，形成高粘性留存。

| 插件名称 | 所属分类 | 一句话核心价值 | 浏览器场景亮点 | 推荐技术方案/库 | 所需权限 | UI形态建议 | 开发难度 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **网页二维码解析器** | 图像与色彩设计 | 识别图片中的二维码并提取链接或文本，支持一键打开或复制 | 浏览网页遇到二维码直接右键图片「解析二维码」，无需掏出手机扫码，与现有「二维码生成器」完美闭环 | [jsqr](https://www.npmjs.com/package/jsqr) + `OffscreenCanvas` / `CanvasRenderingContext2D` | 现有权限（右键取图或用户粘贴/拖拽） | Popup | 低 |
| **文本对比查重**（对应 uTools [万物皆可对比](https://www.u-tools.cn/plugins/detail/%E4%B8%87%E7%89%A9%E7%9A%86%E5%8F%AF%E5%AF%B9%E6%AF%94/)） | 日常办公与文档 | 将两段合同条款、文案初稿与终稿并排对比，红绿高亮标出增删改差异 | 核对邮件修改稿、论文润色前后差异，Popup 内可快速粘贴比对，长文支持一键展开至侧边栏 | [diff](https://www.npmjs.com/package/diff)（`diffWords` / `diffChars` / `diffLines`） | 现有权限 | Popup / Side Panel | 中 |
| **计算稿纸**（对应 uTools [计算稿纸](https://www.u-tools.cn/plugins/detail/%E8%AE%A1%E7%AE%97%E7%A8%BF%E7%BA%B8/)） | 计算与生活换算 | 像在纸上记账一样边写文字边算账（如 `房租 3200 + 水电 280`），每行自动实时出结果并汇总 | 逛电商比价、算旅行预算或报销明细时，随时打开接着上次的草稿算，自动本地持久化 | [mathjs](https://www.npmjs.com/package/mathjs)（安全表达式求值，严禁使用 `eval` 规避 MV3 CSP 报错） | 现有权限 | Popup / Side Panel | 中 |
| **常用短语与灵感快贴**（对应 uTools [备忘快贴](https://www.u-tools.cn/plugins/detail/%E5%A4%87%E5%BF%98%E5%BF%AB%E8%B4%B4/)） | 日常办公与文档 | 收藏高频复用的邮箱、收货地址、发票抬头、客服话术或灵感片段，点击即复制 | 浏览网页遇到好句子，右键「存入 FToolset 灵感库」；填表或回邮件时点开一键复制 | 原生 `chrome.storage.sync` + [fuse.js](https://www.npmjs.com/package/fuse.js)（本地模糊搜索） | 现有权限 | Popup / Side Panel | 中 |
| **网页正文一键剪藏** | 日常办公与文档 | 自动去除网页广告和侧边栏，将当前文章提取为干净的 Markdown 或纯文本 | 阅读长文、博客或研究资料时，一键提取正文复制到 Notion/Obsidian/Word，支持保留标题与列表结构 | [@mozilla/readability](https://www.npmjs.com/package/@mozilla/readability) + [turndown](https://www.npmjs.com/package/turndown) + [dompurify](https://www.npmjs.com/package/dompurify) | 现有权限 + [`scripting`](https://developer.chrome.com/docs/extensions/reference/api/scripting)（仅在点击时向当前激活页注入，无需 `<all_urls>`） | Popup | 中 |
| **简繁中文与英文大小写转换** | 文本处理与效率 | 一键完成英文标题大小写（Title Case / Sentence Case）及中文简繁精准转换（支持港澳台词汇习惯） | 写双语邮件、PPT 英文标题排版或阅读繁体资料时，选中网页文字右键即可转换并复制 | [opencc-js](https://www.npmjs.com/package/opencc-js)（纯 JS 内置词典离线运行）+ 原生字符串规则 | 现有权限 | Popup | 低 |
| **网页可见区截图与快速标注** | 图像与色彩设计 | 一键截取当前网页画面，支持简易裁剪、马赛克打码、画红框箭头并复制图片 | 汇报工作、反馈网页问题或给敏感信息（手机号/账号）打码时，无需启动第三方截图软件 | 原生 [`chrome.tabs.captureVisibleTab`](https://developer.chrome.com/docs/extensions/reference/api/tabs) + HTML5 Canvas | 现有权限（`activeTab` 即可调用） | Popup（截屏后打开独立扩展 Tab 标注） | 中 |

### P2：进阶扩展 / 侧边栏潜力（6 个）
定位：偏轻量创作、媒体批处理与持续陪伴型工具，适合未来引入 [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) 或独立扩展工作台后落地。

| 插件名称 | 所属分类 | 一句话核心价值 | 浏览器场景亮点 | 推荐技术方案/库 | 所需权限 | UI形态建议 | 开发难度 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **本地图片压缩与格式转换**（对应 uTools [图片批量处理](https://www.u-tools.cn/plugins/topic/9/)） | 图像与色彩设计 | 拖入 JPG/PNG/WebP 图片，本地极速无损/有损压缩、调整尺寸与格式互转 | 上传证件照、公众号配图或邮件附件受大小限制时，直接拖拽到侧边栏 2 秒瘦身，隐私图片绝不上传服务器 | [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)（支持 Web Worker 非阻塞压缩）或 [compressorjs](https://www.npmjs.com/package/compressorjs) | 现有权限 + [`sidePanel`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) | Side Panel | 中 |
| **图片加水印与圆角美化** | 图像与色彩设计 | 给证件照加防盗用斜纹水印，或给截图加上渐变背景、阴影与圆角用于社媒分享 | 写教程、发小红书/X/博客配图时，粘贴剪贴板截图即可一键套用美化模板并复制 | HTML5 Canvas / `OffscreenCanvas`（纯原生绘制，零重型依赖） | 现有权限 + `sidePanel` | Side Panel | 中 |
| **极简番茄钟与专注计时**（对应 uTools [番茄时钟](https://www.u-tools.cn/plugins/detail/%E7%95%AA%E8%8C%84%E6%97%B6%E9%92%9F/)） | 时间与专注管理 | 25/5 分钟经典番茄钟，支持在扩展图标角标（Badge）显示剩余分钟数与到点提醒 | 上网学习或办公时，不用切出浏览器即可在侧边栏看到倒计时，到点弹出桌面轻提醒 | [`chrome.alarms`](https://developer.chrome.com/docs/extensions/reference/api/alarms) + [`chrome.notifications`](https://developer.chrome.com/docs/extensions/reference/api/notifications) + `chrome.action.setBadgeText`（可选 [`chrome.offscreen`](https://developer.chrome.com/docs/extensions/reference/api/offscreen) 播放提示音） | 新增 `alarms`、`notifications`（可选 `offscreen`） | Side Panel / Popup | 中 |
| **轻量便签与每日待办**（对应 uTools 官方 [便签/Todo](https://www.u-tools.cn/plugins/topic/102/)） | 时间与专注管理 | 随手记下今日 3 件要事与临时笔记，支持勾选完成与跨设备同步 | 边浏览网页边在侧边栏记录会议纪要、核对清单，切标签页不丢失内容 | 原生 `chrome.storage.sync` + React 列表状态管理 | 现有权限 + `sidePanel` | Side Panel | 低 |
| **本地 PDF 合并与拆分**（对应 uTools 官方 [PDF 处理](https://www.u-tools.cn/plugins/topic/102/)） | 日常办公与文档 | 将多份 PDF 拖入合并为一个文件，或提取指定页码、旋转页面，全程离线 | 整理电子合同、简历附件、论文资料时，不必担心上传到免费在线 PDF 网站泄露隐私 | [pdf-lib](https://www.npmjs.com/package/pdf-lib)（纯 JS/TS，建议动态按需加载） | 现有权限 + `sidePanel` | Side Panel | 中高 |
| **网页图片批量提取与打包** | 图像与色彩设计 | 嗅探当前网页中的所有大图、Logo 与 SVG，支持按尺寸过滤并一键打包为 ZIP 下载 | 设计师、自媒体收集参考图或素材时，不用逐张右键另存为 | `chrome.scripting.executeScript` + [jszip](https://www.npmjs.com/package/jszip) | 现有权限 + `scripting` + `sidePanel` | Side Panel | 中高 |

---

## 3. Top 6 推荐插件深度拆解

从 P0/P1 中挑选最能体现“零门槛 + 浏览器原生优势 + 极低权限成本”的 6 个工具作为下一阶段优先开发目标。

### 3.1 网页取色器与色板助手
- **MVP 极简版功能**：
  - 醒目的「吸取屏幕颜色」主按钮，点击后唤起放大镜吸管，支持浏览器内外全屏取色。
  - 取色后展示大色块预览及 HEX、RGB、HSL 三种常用格式，点击任意色值即自动复制并浮现“已复制”轻提示。
  - 自动保存最近 12 条取色历史（持久化到 `chrome.storage.local`）。
- **进阶贴心功能**：
  - **PPT/文档配色灵感**：基于当前取色自动生成 5 阶明暗色阶（Tints/Shades）及互补色、邻近色方案。
  - **可读性体检**：自动计算该颜色作为背景时，搭配纯白或纯黑文字的 WCAG 对比度评级（AA/AAA），方便做海报与 PPT 时避免字看不清。
  - **一键收藏色板**：支持将常用品牌色收藏命名。
- **Chrome 丝滑交互设计**：
  - 支持通过 [`chrome.commands`](https://developer.chrome.com/docs/extensions/reference/api/commands) 注册全局快捷键（如 `Alt+Shift+C`），或在右键菜单点击「从当前网页取色」直接进入取色模式。
- **技术选型与 MV3 避坑点**：
  - **选型**：原生 [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API) + [colord](https://www.npmjs.com/package/colord)（搭配 `a11y` 与 `mix` 插件）。
  - **MV3 关键避坑**：
    1. **Popup 失焦自动关闭陷阱**：在 Chrome Popup 中直接调用 `new EyeDropper().open()` 后，一旦鼠标点击网页像素，Popup 会因为失去焦点而被浏览器销毁，导致 Promise 回调来不及执行、色值丢失！**标准解法**：方案 A 是在点击按钮时将取色结果第一时间写入 `chrome.storage.local` 并由 Background/重新打开的 Popup 展示；方案 B（体验更佳）是在 `activeTab` 授权下通过 `chrome.scripting.executeScript` 在当前网页上下文或 Side Panel 中调用 `EyeDropper.open()`，取色完毕立即写入剪贴板并在页面角落弹出 2 秒非侵入式 Toast（如 `已复制 #3B82F6`），同时回传 Background 记入历史记录。
    2. **用户手势要求**：`EyeDropper.open()` 必须由真实的用户点击事件触发，不可在打开 Popup 时自动静默调用。

### 3.2 字数统计与文本清洗
- **MVP 极简版功能**：
  - 多行文本输入框，实时顶部卡片展示：**总字符数、中文字数、英文单词数、段落数、预计阅读时长**（按 300 字/分钟估算）。
  - 底部一排高频“一键清洗”胶囊按钮：`去除空行`、`合并多余空格`、`去除所有换行（修 PDF 复制断行）`、`去除重复行`、`清空/一键复制`。
- **进阶贴心功能**：
  - **中英文排版美化**：一键在中英文与数字之间自动补加半角空格（盘古之白风格），顺手把英文标点与中文全角标点按需统一。
  - **一键提取关键信息**：提供“提取文中所有网址 / 邮箱 / 手机号”开关，方便从杂乱网页文本中快速捞取联系信息。
  - **撤销上一步（Undo）**：防止用户误点清洗按钮，保留最近 5 步内存操作栈。
- **Chrome 丝滑交互设计**：
  - 注册 `contextMenus`（`contexts: ['selection']`）：用户在任意网页划选一段文章，右键选择「用 FToolset 统计字数/清洗文本」，点击后通过 `chrome.storage.session` 暂存选中文本并提示/直达工具界面（或在 Popup 打开时自动读取已暂存的划词内容）。
- **技术选型与 MV3 避坑点**：
  - **选型**：纯原生 TypeScript + 浏览器内置 `Intl.Segmenter`（精准处理 Emoji 组合字符与中英文混合分词，避免把一个 👨‍👩‍👧‍👦 误算为 7 个字符）。
  - **MV3 关键避坑**：
    1. **右键菜单状态传递**：MV3 Service Worker 随时可能休眠，右键 `contextMenus.onClicked` 拿到 `info.selectionText` 后，切勿存入内存全局变量，必须存入 `chrome.storage.session`（内存级安全存储，浏览器关闭自动清理），Popup 打开时优先读取并消费该数据。
    2. **大文本防卡顿**：超过 5 万字的长文清洗时，对实时统计做 `150ms` 防抖（Debounce），防止输入框掉帧。

### 3.3 强密码生成器与安全检测
- **MVP 极简版功能**：
  - 长度滑块（默认 16 位，支持 8~64 位）+ 4 个直观开关（大写字母、小写字母、数字、特殊符号）。
  - 顶部大字号展示生成结果（不同字符类型用柔和配色区分，如数字蓝色、符号橙色），自带「重新生成」与「一键复制」按钮。
  - 默认勾选「排除易混淆字符（`0/O`、`1/l/I`）」，减少用户手动抄录出错。
- **进阶贴心功能**：
  - **好记的词组密码模式（Passphrase）**：生成如 `sunset-coffee-piano-48` 风格的 4 词组合密码，兼顾极高安全性与人类可读性（内置轻量精简英文常用词表）。
  - **密码体检标签**：允许用户手动粘贴已有密码，在纯本地即时给出“破解预估时间”和通俗改进建议（如“包含常见键盘连续字符”）。
  - **批量生成**：一键生成 5 条备选密码，方便批量配置账号。
- **Chrome 丝滑交互设计**：
  - 打开工具即自动生成一条高强度密码，点击一次即可复制，全程 2 秒完成；复制后提供“30 秒后自动清空历史记录”的隐私保护选项（默认不持久化已生成的密码到磁盘，仅保留在内存或本次会话中）。
- **技术选型与 MV3 避坑点**：
  - **选型**：原生 [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)（`window.crypto.getRandomValues`）+ [@zxcvbn-ts/core](https://www.npmjs.com/package/@zxcvbn-ts/core)（核心仅约 25KB，比老版 `zxcvbn` 800KB 轻量化得多）。
  - **MV3 关键避坑**：
    1. **严禁使用 `Math.random()`**：密码生成必须使用密码学安全的 `crypto.getRandomValues`，并通过拒绝采样（Rejection Sampling）避免取模偏差（Modulo Bias）。
    2. **词典包体控制**：`@zxcvbn-ts` 的语言词典包体积较大，**不要**全量静态打包进主包，仅按需动态加载极简通用字典（`@zxcvbn-ts/language-common`），或在用户输入自定义检测时才懒加载。

### 3.4 世界时钟与时区换算
- **MVP 极简版功能**：
  - 默认展示本地时间 + 3~4 个常用全球城市卡片（如纽约、伦敦、东京、新加坡），带白昼/黑夜直观小图标（☀️/🌙）。
  - **时间轴滑块**：左右拖动 24 小时滑块，所有城市时间同步联动变化，并用绿色微光标注“工作时间（09:00–18:00）”，一眼找出跨国开会的黄金重叠时段。
- **进阶贴心功能**：
  - **一键复制多时区会议邀约**：点击按钮直接生成规范的双语文本，例如：`北京时间 21:00 (CST) / 纽约 08:00 (EST) / 伦敦 13:00 (GMT)`，方便直接粘贴进邮件或 Slack。
  - **夏令时（DST）自动感知**：在卡片上温和标注当前城市是否处于夏令时，彻底告别手动加减小时算错的尴尬。
  - **城市中英双语模糊搜索**：输入 `New York`、`纽约`、`NYC` 或 `EST` 都能秒级添加城市。
- **Chrome 丝滑交互设计**：
  - 记住用户自定义的城市列表并同步至 `chrome.storage.sync`，换台电脑登录 Chrome 依然保留关注的城市。
- **技术选型与 MV3 避坑点**：
  - **选型**：原生 [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) + [@date-fns/tz](https://www.npmjs.com/package/@date-fns/tz)（基于浏览器内置 IANA 时区数据库，无需捆绑笨重的 `moment-timezone` 数据文件）。
  - **MV3 关键避坑**：
    1. **时区名称国际化**：只需维护一份约 150 个全球主要城市的轻量 JSON 映射表（城市中英文名 -> IANA 时区 ID，如 `America/New_York`），实际时间偏移和夏令时切换全部交由 Chromium 底层 ICU 数据处理，包体不到 10KB 且永不过时。

### 3.5 计算稿纸（自然语言边写边算）
- **MVP 极简版功能**：
  - 左右分栏极简画布：左侧像记事本一样自由输入（支持混写中文/英文说明与算式，如 `机票 1850 * 2`、`酒店 680 * 3`），右侧每行实时对齐显示计算结果。
  - 底部自动展示全部有效行的「总计（Sum）」与「平均值（Avg）」，点击任意结果数字即可复制。
  - 自动保存上次内容到 `chrome.storage.local`，关闭 Popup 再打开原样恢复。
- **进阶贴心功能**：
  - **变量与百分比口语支持**：支持 `小计 = 3700 + 2040`、`折后 = 小计 * 0.85` 或 `1200 + 15%`，贴合普通人算账习惯。
  - **多页草稿本**：支持新建/切换多个主题稿纸（如“旅行预算”“装修清单”“月度账单”），并可一键导出为纯文本或 Markdown 表格。
- **Chrome 丝滑交互设计**：
  - 逛购物网站、看财报或核对报价单时，Popup 内可快速算几笔；算账条目超过 6 行时，右上角提供「在侧边栏展开」按钮，实现边看网页边算账不遮挡。
- **技术选型与 MV3 避坑点**：
  - **选型**：[mathjs](https://www.npmjs.com/package/mathjs)（使用 `create` + `all` 的按需精简工厂或轻量表达式解析器，支持变量作用域与单位运算）。
  - **MV3 关键避坑**：
    1. **严格规避 CSP 违规**：Chrome MV3 默认禁止 `unsafe-eval`，绝对不能用 `eval()` 或 `new Function()` 来计算用户输入的算式！`mathjs` 的表达式解析器采用纯 JS AST 求值，100% 符合 MV3 内容安全策略（CSP）。
    2. **浮点精度美化**：处理 JS 经典 `0.1 + 0.2 = 0.30000000000000004` 问题，使用 `math.format(result, { precision: 14 })` 并自动添加千分位逗号，让普通用户看得舒服。

### 3.6 网页正文一键剪藏（转 Markdown / 纯文本）
- **MVP 极简版功能**：
  - 点开 Popup 进入该工具，一键点击「提取当前网页正文」，自动剥离导航栏、广告、推荐阅读与页脚评论区。
  - 提供「复制 Markdown」和「复制纯文本」两个主按钮，并在下方提供简洁的正文预览（显示标题、字数与来源链接）。
- **进阶贴心功能**：
  - **头部元数据模板**：自动在剪藏内容顶部附带文章标题、原网页链接和剪藏日期，完美适配 Notion、Obsidian、飞书文档或 Word 粘贴。
  - **图片链接处理选项**：可选择“保留图片 Markdown 链接”或“仅提取纯文字（去除图片）”。
  - **一键导出 `.md` 文件**：通过 `Blob` + `URL.createObjectURL` 直接触发本地文件下载，无需申请 `downloads` 权限。
- **Chrome 丝滑交互设计**：
  - 结合 `contextMenus`，在网页空白处右键点击「一键剪藏本文为 Markdown」，可直接完成提取并提示复制成功，甚至无需打开弹窗。
- **技术选型与 MV3 避坑点**：
  - **选型**：[@mozilla/readability](https://www.npmjs.com/package/@mozilla/readability)（Firefox 阅读模式同款内核）+ [turndown](https://www.npmjs.com/package/turndown)（HTML 转 Markdown）+ [dompurify](https://www.npmjs.com/package/dompurify)（XSS 安全清洗）。
  - **MV3 关键避坑**：
    1. **按需注入避免 `<all_urls>`**：结合 `activeTab` 与 `scripting` 权限，仅在用户主动点击按钮时，通过 `chrome.scripting.executeScript({ target: { tabId }, func: ... })` 读取当前页面序列化后的 `document.documentElement.outerHTML` 或在页面内克隆解析，**彻底避开全站宿主权限**。
    2. **必须克隆 DOM**：调用 `new Readability(doc).parse()` 会直接修改传入的 DOM 树，若在页面上下文执行，必须先 `document.cloneNode(true)`，否则会把用户正在看的网页直接拆毁！更推荐的做法是将页面 HTML 传回 Popup 后，用 `DOMParser` 解析并先经 `DOMPurify.sanitize()` 清洗再交给 Readability 处理，既安全又不影响原网页。
    3. **受限页面容错**：在 `chrome://`、`chromewebstore.google.com` 等浏览器内置受限页面执行 `scripting.executeScript` 会抛出异常，需提前检测 URL 协议并给出友好提示（如“浏览器内置页面不支持提取内容”）。

---

## 4. 明确「不建议复刻」的 uTools 热门插件清单

uTools 作为桌面级效率启动器，许多高人气插件依赖 Electron/Node.js 的系统级权限或服务于国内特定垂直群体。以下 **8 类**热门插件明确不建议在大众版 FToolset 中复刻：

### 4.1 技术受限类（Chrome MV3 沙盒无法优雅实现）

1. **全局剪贴板历史（如 uTools [超级剪贴板](https://www.u-tools.cn/plugins/detail/%E8%B6%85%E7%BA%A7%E5%89%AA%E8%B4%B4%E6%9D%BF/)）**
   - **淘汰原因**：Chrome MV3 的 Background Service Worker 是事件驱动且会频繁休眠的，无法像桌面常驻进程一样无感监听操作系统的每一次 `Ctrl+C`；且 `navigator.clipboard.readText()` 要求页面处于聚焦状态并经用户授权。强行用 Offscreen Document 轮询不仅耗电、极易触发 CWS 隐私审核拒审，也无法捕获浏览器之外软件的复制记录。
   - **替代思路**：用 P1 中的「常用短语与灵感快贴」替代，让用户主动收藏高频文本，既合规则又更聚焦。

2. **本地文件极速搜索（如 uTools 基于 Everything 的 [本地搜索](https://www.u-tools.cn/plugins/topic/33/)）**
   - **淘汰原因**：浏览器安全沙盒严禁扩展直接扫描和索引操作系统本地硬盘目录，无法调用 Windows Everything 索引或 macOS Spotlight。

3. **系统级跨应用截图与桌面悬浮贴图（如 uTools [悬浮截图](https://www.u-tools.cn/plugins/topic/33/)）**
   - **淘汰原因**：Chrome 扩展通过 `tabs.captureVisibleTab` 只能截取当前浏览器标签页可见区域，既无法截取微信、PPT 等其他桌面软件画面，也无法在操作系统桌面创建“置顶悬浮图片窗口”。

4. **工业级本地文件批量重命名（如 [uTools 官方批量重命名](https://www.u-tools.cn/plugins/topic/102/)）**
   - **淘汰原因**：虽然浏览器支持 File System Access API，但每次操作都需要弹窗向用户逐一申请目录读写权限，且对系统敏感目录有严格拦截，批量改写本地数百个文件的体验远不如桌面端，且容易引发普通用户对“浏览器插件要读写我本地硬盘”的强烈安全警惕。

### 4.2 受众错配类（门槛过高、地域受限或伪需求）

5. **程序员编码与调试工具集（见 [uTools 程序员必备专题](https://www.u-tools.cn/plugins/topic/6/)）**
   - **涵盖对象**：JSON 格式化、正则表达式测试、JWT 解析、Cron 表达式、时间戳转换、代码变量命名、SSH/Linux 命令速查等。
   - **淘汰原因**：与 FToolset “面向普通办公人群与大众用户”的定位直接冲突。把大量技术黑话放进 Popup 首页会迅速拉高普通用户的认知负担，稀释大众效率工具的品牌心智。

6. **中国电子发票智能解析与归类（如 uTools [发票处理](https://www.u-tools.cn/plugins/topic/16/)）**
   - **淘汰原因**：强绑定中国增值税电子发票（PDF/OFD）格式与国内企业报销规则，海外全球用户完全用不到，违背 FToolset 中英双语与全球化产品原则。

7. **本地/云端账号密码保险库（如 uTools [密码管理器](https://www.u-tools.cn/plugins/detail/%E5%AF%86%E7%A0%81%E7%AE%A1%E7%90%86%E5%99%A8/)）**
   - **淘汰原因**：Chrome 浏览器已自带高度成熟的密码自动填充与跨端同步，专业用户也已绑定 1Password/Bitwarden。工具箱插件自建密码库不仅面临极高的安全合规与数据丢失责任，普通用户也不敢将银行/邮箱密码托付给一个轻量工具集合。**正确切入点是只做无状态的“强密码生成器”**。

8. **聚合在线翻译与云端高精度 OCR（如 [uTools OCR 专题](https://www.u-tools.cn/plugins/topic/53/)）**
   - **淘汰原因**：高质量翻译与多语言 OCR 强依赖云端商业 API（需用户自己填 API Key 或开发者承担高昂服务器费用），违背“零配置、纯本地、零服务器成本”原则；若强行塞入本地 WASM OCR 模型（如 `tesseract.js` 语言包），会导致插件包体暴涨数十 MB 且识别速度慢。此外，Chrome 浏览器本身已内置整页翻译与右键 Google Lens 识图取字，重复造轮子没有增益。

---

## 5. 大众版 FToolset 产品体验与架构建议

### 5.1 降低使用门槛：10+ 工具后的 Popup 信息架构
当 FToolset 从 1 个工具扩展到 15~20 个工具时，核心设计挑战是**“功能变多，但第一眼依然像单功能插件一样清爽”**：

1. **顶部常驻“即搜即用”命令框**：
   - 使用 [`cmdk`](https://www.npmjs.com/package/cmdk) + [`fuse.js`](https://www.npmjs.com/package/fuse.js) 构建毫秒级模糊搜索框，打开 Popup 时默认自动聚焦（Auto-focus）。
   - 为每个工具配置丰富的**大众口语化同义词与中英双语关键词**。例如用户搜“吸色”、“颜色”、“color”、“eyedropper”都能命中「网页取色器」；搜“去换行”、“字数”、“word count”都能命中「字数统计与文本清洗」。
2. **三层极简首屏结构（避免密密麻麻的九宫格墙）**：
   - **第一层（置顶常用）**：支持用户点击星标置顶自己最常用的 3~4 个工具，固定在搜索框正下方，并通过 [`chrome.storage.sync`](https://developer.chrome.com/docs/extensions/reference/api/storage) 跨设备同步。
   - **第二层（最近使用）**：自动展示最近用过的 2~3 个工具，减少重复寻找。
   - **第三层（场景化轻分类）**：用横向极简 Tab 切换（`全部` / `文本` / `色彩与图片` / `计算与时间` / `安全与网页`），单屏展示不超过 6~8 个卡片，保持充足留白。
3. **非侵入式上下文提示**：
   - 当用户通过右键菜单触发某工具，或打开 Popup 时检测到当前网页 URL 含有大量追踪参数，可在顶部给出一行轻提示条（如“当前网页链接含 4 个追踪参数，[一键净化]”），让普通用户自然发现浏览器专属能力，而非用复杂菜单教用户使用。

### 5.2 性能与按需加载：WXT + React 毫秒级 Popup 架构
Chrome Popup 每次关闭都会完全销毁 DOM 与 JS 运行时，下次点击图标是**冷启动**。为了确保 20 个工具集成后点开依然是毫秒级响应，建议采用以下工程架构：

1. **元数据与业务组件彻底分离（Tool Registry 模式）**：
   - 建立极轻量的 `src/tools/registry.ts`，只存放各工具的静态元数据（`id`、中英文名称/描述 i18n key、搜索同义词、图标组件、分类标签、支持的 UI 形态），**绝对不静态 `import` 任何工具的业务代码或第三方库**。
   - 每个工具的 React 页面组件统一通过 `React.lazy(() => import('./tools/color-picker/ColorPicker'))` 动态导入，外层配合极简骨架屏 `<Suspense fallback={<ToolSkeleton />} />`。
2. **重型依赖精细分包与图标瘦身**：
   - 在 `wxt.config.ts` 的 Vite `build.rollupOptions.output.manualChunks` 中，将 `pdf-lib`、`browser-image-compression`、`mathjs`、`opencc-js`、`jszip` 等中大型库拆分为独立异步 chunk。用户只打开 Popup 首页或使用二维码工具时，浏览器**完全不解析、不加载**这些重型脚本。
   - 图标库统一采用 [`lucide-react`](https://www.npmjs.com/package/lucide-react) 按需引入，充分利用 Vite Tree-shaking 将图标体积控制在极低水平。
3. **预热与状态零丢失**：
   - 利用 `chrome.storage.local` 为每个工具维护轻量草稿缓存（如计算稿纸内容、取色历史），并记住用户“上次停留的工具”（可选开关），实现“点开即用、关掉不丢”。

### 5.3 从 Popup 到 Side Panel 的演进路线
[Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) 是大众效率工具箱打破小弹窗局促感的最佳载体，且申请 `sidePanel` 权限在 CWS 中属于低风险权限，**不会触发安装时的隐私警告弹窗**。建议分三阶段平滑演进：

1. **阶段一（当前至 P0/P1 完成）：专注打磨 Popup 极速体验**
   - 保持现有极简权限，优先交付 P0 的 7 个工具与 P1 中的纯 Popup 工具，跑通 WXT 下的多工具路由、i18n 与搜索框架。
2. **阶段二（引入 P1 长内容工具与 P2 初期）：接入 WXT `sidepanel` 入口，复用同一套业务组件**
   - 在 WXT 的 `entrypoints/` 目录下新增 `sidepanel/` 入口（参考 [WXT Entrypoints 文档](https://wxt.dev/guide/essentials/entrypoints.html)），与 `popup/` 共享完全相同的 `src/tools/` 组件库，仅通过 Tailwind 响应式容器样式适配宽度差异（Popup `380px` vs Side Panel `自适应 360px–600px`）。
   - **默认点击图标仍打开 Popup**（保留 3 秒快进快出优势），在 Popup 右上角提供「在侧边栏固定打开」按钮，调用 `chrome.sidePanel.open({ windowId })` 并将当前工具 ID 及未保存草稿通过 `chrome.storage.session` 无缝同步给侧边栏，同时自动关闭 Popup。
3. **阶段三（双形态协同）：按工具特性自动分流**
   - **Popup 优先（瞬时工具）**：取色器、强密码生成、单位换算、世界时钟、二维码生成/解析、链接净化。
   - **Side Panel 优先（陪伴与工作台工具）**：计算稿纸、常用短语快贴、文本对比查重、轻量便签/番茄钟、本地图片压缩、PDF 合并拆分。当用户在 Popup 中点击侧边栏专属工具时，直接一键唤起 Side Panel 并定位到该工具，获得宽敞、不随点击网页而消失的沉浸式体验。
