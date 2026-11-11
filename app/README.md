# Trianon · SillyTavern 风格前端（app/）

把 Trianon 的洛可可界面改造成角色扮演聊天前端，准备放进 Meta Muse 的「空间」里用。只有前端；和后端的约定见 [`docs/BRIDGE.md`](../docs/BRIDGE.md)。

- **打开**：`dist/trianon-st.html`，单文件，不联网。没接后端时自动用内置的模拟后端演示。
- **构建**：`python3 app/build.py`，只用 Python 标准库。
- **原版演示不受影响**：`dist/trianon.html` 和 `src/`、`build.py` 都没有改。

## 目录

| 路径 | 内容 |
|---|---|
| `src/index.html` | 页面骨架，构建时填入 CSS 和 JS |
| `src/css/base.css` | 配色变量、自定义光标、字体（取自原版） |
| `src/css/kit_*.css` | 原版组件的样式：吊牌侧栏、聊天气泡、怀表输入栏。由 `tools/` 从原版页面提取，去掉了编程相关的选择器 |
| `src/css/app.css` | 新的布局和新增部件，手机布局也在这里 |
| `src/js/` | 按文件名顺序拼接：工具 → 雾 → 接口层 → 模拟后端 → 状态 → 对话引擎 → 聊天区 → 输入栏 → 侧栏 → 启动 |
| `assets/` | 图片和字体，构建时内联。`img/` 吊牌与怀表，`stickers/` 气泡贴纸，`fonts/` Pinyon 与 Cormorant 斜体，`kit/` 光标等原版小图 |
| `tools/` | 从原版页面提取样式和图片的脚本 |

## 进度

第一阶段（骨架）：
- [x] 应用骨架、吊牌侧栏、聊天区、怀表输入栏、事件驱动的对话引擎、接口层与模拟后端
- [ ] 开场动画（字标换成 Trianon）、空白页拼贴
- [ ] 设置页：人设、外观、连接状态

素材许可沿用仓库根目录的 `ASSETS.md`。羽毛笔图片由仓库所有者提供。
