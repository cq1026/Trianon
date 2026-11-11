# Trianon · SillyTavern 风格前端（app/）

把 Trianon 的洛可可界面改造成角色扮演聊天前端，准备放进 Meta Muse 的「空间」里用。只有前端；和后端的约定见 [`docs/BRIDGE.md`](../docs/BRIDGE.md)。

- **打开**：`dist/trianon-st.html`，单文件，不联网。没接后端时自动用内置的模拟后端演示。
- **开场动画**：每天第一次打开时播放（同原版）。地址末尾加 `#ouverture` 强制播放，`#noouverture` 跳过；按任意键或点击跳过。
- **构建**：`python3 app/build.py`，只用 Python 标准库。
- **原版演示不受影响**：`dist/trianon.html` 和 `src/`、`build.py` 都没有改。

## 目录

| 路径 | 内容 |
|---|---|
| `src/index.html` | 页面骨架，构建时填入 CSS 和 JS |
| `src/opening/` | 开场动画 Ouverture（取自原版，字标换成 Trianon），构建时放进 `<head>` |
| `src/parts/empty.html` | 空白页拼贴，由 `tools/gen_empty.py` 调用原版 `src/e5v/empty5.py` 生成 |
| `src/css/base.css` | 配色变量、自定义光标、字体（取自原版） |
| `src/css/kit_*.css` | 原版组件的样式：吊牌侧栏、聊天气泡、怀表输入栏。由 `tools/` 从原版页面提取，去掉了编程相关的选择器 |
| `src/css/app.css` | 新的布局和新增部件，手机布局也在这里 |
| `src/settings/` | 设置页：`settings.js` / `settings.css` 取自原版 settings_v3（构建时用 `tools/cssscope.py` 加作用域），`extra.css` 是新增部件 |
| `src/js/` | 按文件名顺序拼接：工具 → 雾 → 接口层 → 模拟后端 → 状态 → 对话引擎 → 聊天区 → 输入栏 → 侧栏 → 启动 |
| `assets/` | 图片和字体，构建时内联。`img/` 吊牌、怀表、羽毛笔，`stickers/` 气泡贴纸，`empty/` 空白页拼贴，`opening/` 开场字体与火漆，`fonts/` Pinyon 与 Cormorant 斜体，`kit/` 光标等原版小图 |
| `tools/` | 从原版页面提取样式和图片的脚本 |

## 进度

第一阶段（骨架）：
- [x] 应用骨架、吊牌侧栏、聊天区、怀表输入栏、事件驱动的对话引擎、接口层与模拟后端
- [x] 开场动画（字标换成 Trianon；拉远时缩放真实页面，不再依赖截图）、空白页拼贴（问候名字跟随人设）
- [x] 设置页（原版拼贴桌面）：人设（多人设、编辑、切换当前）、外观（字号、密度、动效、贴纸，加上流式输出 / 书写动画 / 推理默认展开开关）、连接状态（后端、模型、能力、接口日志）

素材许可沿用仓库根目录的 `ASSETS.md`。羽毛笔图片由仓库所有者提供。

已知限制：手机上设置页目前是把整张桌面缩小显示，专门的手机排版放在第五阶段；夜间主题和跟随系统还没做。
