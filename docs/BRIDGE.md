# Trianon 前端接口（BRIDGE）

Trianon 是一个纯前端：不连任何模型，也不发网络请求。它和后端（宿主页面、Muse 空间里的脚本、或任何包装层）只通过一个全局对象 `window.__trianon` 通信。

- **后端 → 前端**：调用 `__trianon.emit(事件名, 数据)` 推送状态和生成内容。
- **前端 → 后端**：后端用 `__trianon.onRequest(handler)` 注册一个处理函数，前端有操作时调用 `handler(请求名, 数据)`，处理函数返回值或 Promise。

没注册处理函数时，前端会在 0.5 秒后启用内置的**模拟后端**（`__trianon.mock`），用来单独打开演示。只要在这之前注册了 `onRequest`，模拟后端就不会启动。

当前版本：`__trianon.version === 1`。本文档随功能增加更新，新增的字段都是可选的，旧的后端不需要改。

---

## 1. 接入

前端脚本加载完成时会创建 `window.__trianon`。后端有三种时机可以接上：

```js
// A. 前端加载之前就定义好（推荐）
window.__trianonInit = api => { api.onRequest(handle); };

// B. 监听事件
addEventListener('trianon:ready', e => e.detail.onRequest(handle));

// C. 前端已经加载完
window.__trianon.onRequest(handle);
```

注册后，前端会马上发一个 `frontend.hello` 请求。后端收到后应依次推送初始状态：

```js
async function handle(type, p) {
  switch (type) {
    case 'frontend.hello':
      api.emit('conn.state', { state: 'ready' });
      api.emit('caps', { streaming: true, reasoning: true, stop: true, regenerate: true });
      api.emit('model', { name: 'GPT-4o' });
      api.emit('character', { id: 'c1', name: 'Marguerite', greeting: '*抬眼看你。*\n你来了。' });
      return { ok: true };
    case 'chat.send':     return startGeneration(p);   // 见第 3 节
    case 'turn.regenerate': return startGeneration(p);
    case 'turn.stop':     return stopGeneration(p.turnId);
    case 'chat.new':      return { ok: true, chatId: newChatId() };
    default:              return { ok: false, error: 'unsupported' };
  }
}
```

处理函数抛出异常或返回被拒绝的 Promise 时，前端把这次生成标成出错，消息下方出现「重试」。

---

## 2. 后端 → 前端事件

| 事件 | 数据 | 说明 |
|---|---|---|
| `conn.state` | `{ state, attempt?, retryIn?, message? }` | `state`：`connecting` / `ready` / `reconnecting` / `failed`。不是 `ready` 时顶栏会显示连接状态。`retryIn` 单位为秒。 |
| `caps` | `{ streaming?, reasoning?, stop?, regenerate? }` | 后端支持哪些能力。`regenerate: false` 时不显示「重新生成」。 |
| `model` | `{ name }` | 输入栏右侧显示的模型名。 |
| `character` | `{ id, name, greeting? }` | 当前角色。`greeting` 是开场白，会作为对话的第一条消息；支持 `{{char}}` `{{user}}` 宏。 |
| `chat.load` | `{ chatId, messages: Message[] }` | 载入一段已有对话（替换当前对话）。 |
| `turn.start` | `{ turnId }` | 后端已接受请求。可选，不发也可以。 |
| `turn.reasoning` | `{ turnId, delta }` | 推理内容的增量。推理块默认折叠。 |
| `turn.delta` | `{ turnId, delta }` | 正文的增量（流式）。 |
| `turn.done` | `{ turnId, text?, reasoning?, usage? }` | 生成结束。**非流式时必须带 `text`（全文）**；流式时 `text` 可省略，带了就以它为准覆盖。 |
| `turn.error` | `{ turnId, message }` | 生成失败。`message` 会显示在消息下方。 |
| `turn.stopped` | `{ turnId }` | 确认已停止。前端在用户点停止时已经先停了，这个事件只是确认。 |

`Message` 的结构：

```ts
{
  id?: string,                 // 不给时前端生成
  role: 'user' | 'assistant',
  name?: string,               // 说话人显示名
  text: string,
  reasoning?: string,
  time?: number,               // 毫秒时间戳
  hidden?: boolean,            // 用户隐藏：显示变淡，不进 history
  greeting?: boolean,          // 角色开场白
  userName?: string,           // 发出时的人设名（显示 {{user}} 用）
  charName?: string,           // 发出时的角色名（显示 {{char}} 用）
  swipes?: { text, reasoning, time, dur }[],   // 候选；text 是当前那个
  sid?: number,                // 当前候选的序号
}
```

**关于 `turnId`**：每次生成的 `turnId` 都由前端生成，放在请求里交给后端。后端发事件时原样带回。不属于当前生成的事件会被忽略，所以用户停止后，后端晚到的 `turn.delta` 不会再写进页面。

---

## 3. 前端 → 后端请求

| 请求 | 数据 | 期望返回 |
|---|---|---|
| `frontend.hello` | `{ version }` | 任意；随后推送初始状态（见第 1 节）。 |
| `chat.send` | `{ turnId, chatId, msgId, text, history, stream, persona, characterId }` | `{ ok: true }`，然后用事件推送生成过程。 |
| `turn.regenerate` | `{ turnId, chatId, msgId, history, stream, persona, characterId }` | 同上。给 `msgId` 这条助手消息生成一个**新候选**（前端保留旧的，可左右切换）。 |
| `turn.continue` | `{ turnId, chatId, msgId, history, stream, persona, characterId }` | 同上。接着 `msgId` 这条消息往下写：`turn.delta` 的内容会**追加**到它后面；`history` 的最后一条就是这条消息本身。 |
| `turn.impersonate` | `{ turnId, chatId, history, stream, persona, characterId }` | 同上。以用户人设代写一段：`turn.delta` / `turn.done` 的文字写进输入框，不生成消息。事件里 `msgId` 为空。 |
| `turn.stop` | `{ turnId }` | 任意；可以再发 `turn.stopped` 确认。 |
| `turn.prompt` | `{ chatId, msgId, history, persona, characterId }` | `{ ok: true, prompt, tokens? }`。「查看提示词」用。`prompt` 可以是字符串，或 `[{ role, name?, content }]` 数组。 |
| `chat.new` | `{ characterId }` | `{ ok: true, chatId }`。不返回 `chatId` 时前端自己生成。 |
| `chat.save` | `{ chatId, characterId, title, messages: Message[] }` | 任意。对话有改动（新消息、编辑、删除、隐藏、切换候选）后 0.6 秒合并发一次，后端负责存。 |

字段说明：

- `stream`：用户在设置里选的输出方式。`true` 时用 `turn.delta` 逐段推送；`false` 时只发一个带全文的 `turn.done`。后端不支持流式时，即使收到 `true`，也可以直接发 `turn.done` 带全文，前端照样能显示。
- `persona`：当前用户人设 `{ id, name, desc }`，用于替换提示词里的 `{{user}}`。
- `text`：用户刚输入的原文，没有经过宏替换。
- `history`：截止到这次生成之前的对话，`[{ id, role, name, text }]`，**已去掉用户隐藏的消息**。当前对话以前端为准（用户可以编辑、删除、隐藏、切换候选），后端拼提示词时用它，不必自己维护对话状态。
- **宏**：`text` 和 `history` 里的 `{{char}}` `{{user}}` 保持原样，后端拼提示词时自己替换。前端只在显示时替换（按每条消息发出时的人设和角色名）。

### 一次生成的时序

```
前端                                   后端
 │ chat.send {turnId:'t1', stream:true} ─▶
 │ ◀─ turn.start {turnId:'t1'}            （可选）
 │ ◀─ turn.reasoning {turnId:'t1', delta}（可选，可多次）
 │ ◀─ turn.delta {turnId:'t1', delta}    （多次）
 │ ◀─ turn.done {turnId:'t1'}
```

非流式：

```
 │ chat.send {turnId:'t2', stream:false} ─▶
 │ ◀─ turn.done {turnId:'t2', text:'全文…', reasoning?:'…'}
```

用户中途停止：

```
 │ turn.stop {turnId:'t3'} ─▶            前端立刻把消息标成「已停止」，保留已写的部分
 │ ◀─ turn.stopped {turnId:'t3'}          （可选）
```

---

## 4. 调试

- `__trianon.state`：当前状态的只读快照（连接、角色、人设、设置、消息、进行中的生成）。
- `__trianon.log`：最近 200 条进出记录。
- `__trianon.usingMock`：当前是否在用模拟后端。
- `__trianon.mock.set({ delay, cps, reasoning, failNext })`：调整模拟后端。例如 `failNext: true` 让下一次生成出错，`delay: 10` 模拟等待很久。
- `__trianon.mock.disconnect()`：模拟断线三秒后重连。
- 在加载前设 `window.__trianonNoMock = true`，可以禁用模拟后端。

---

## 5. 之后会加的接口

下面这些随后续功能加入，加入时更新本文档：角色库（列表、导入、编辑）、聊天记录（列表、切换、分支、检查点）、人设同步、世界书、生成参数与预设、Author's Note、Prompt Manager、总结。
