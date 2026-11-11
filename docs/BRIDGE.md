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
| `character` | `{ id, name, greeting?, …角色卡字段 }` | 当前角色。`greeting`（或 `first_mes`）是开场白，会作为对话的第一条消息；`alternate_greetings` 会成为开场白的候选。支持 `{{char}}` `{{user}}` 宏。字段同下面的 Character。 |
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
  role: 'user' | 'assistant' | 'system',   // system = 旁白（/sys 命令插入）
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
| `chat.save` | `{ chatId, characterId, title, meta, messages: Message[] }` | 任意。对话有改动（新消息、编辑、删除、隐藏、切换候选）后 0.6 秒合并发一次，后端负责存。只有开场白、还没写过一句的对话不会存。`meta` 里可能有 `branchOf` / `checkpointOf: { chatId, msgId }`。 |
| `chat.list` | `{ characterId }` | `{ ok: true, chats: [{ chatId, title, updated, count, preview, branchOf?, checkpointOf? }] }`。聊天记录抽屉用；`updated` 为毫秒时间戳。 |
| `chat.load` | `{ chatId }` | `{ ok: true, chat: { chatId, title, meta, messages: Message[] } }`。 |
| `chat.rename` | `{ chatId, title }` | 任意。 |
| `chat.delete` | `{ chatId }` | 任意。 |

| `char.list` | `{}` | `{ ok: true, chars: [{ id, name, avatar?, desc?, tags? }] }`。角色库卡片墙用，`desc` 是描述摘要。 |
| `char.get` | `{ id }` | `{ ok: true, char: Character }`。 |
| `char.save` | `{ char: Character }` | `{ ok: true, id }`。`char.id` 为空表示新角色，由后端分配 id。导入的角色卡也走这里。 |
| `char.delete` | `{ id }` | 任意。 |
| `char.select` | `{ id }` | 任意。用户选了这位角色开始对话；之后的请求里 `characterId` 就是它。 |

`Character` 与 SillyTavern 角色卡 V2 的 `data` 字段一致，另加 `id` 和 `avatar`（data URL 或图片地址）：

```ts
{ id, name, avatar?, description, personality, scenario, first_mes, alternate_greetings: string[], mes_example,
  system_prompt, post_history_instructions, creator_notes, tags: string[], creator, character_version, extensions?, character_book? }
```

导入（PNG 里的 `chara` / `ccv3` 文本块，或 V1/V2/V3 JSON）和导出（V2 JSON）都在前端完成，后端只负责存。

| `lore.list` | `{}` | `{ ok: true, books: [{ id, name, count }] }`。 |
| `lore.get` | `{ id }` | `{ ok: true, book: Lorebook }`。 |
| `lore.save` | `{ book: Lorebook }` | `{ ok: true, id }`。`book.id` 为空表示新书。 |
| `lore.delete` | `{ id }` | 任意。 |

```ts
Lorebook = { id, name, entries: [{ uid, comment, key: string[], keysecondary: string[], content, constant, selective,
  logic: 'and_any' | 'and_all' | 'not_any' | 'not_all', order, position: 'before' | 'after' | 'an_top' | 'an_bottom' | 'depth', depth, probability, disable }] }
```

世界书的导入导出（SillyTavern 世界书 JSON）在前端完成。生成参数的预设存在前端本机，不走接口。

**分支和检查点**由前端完成：先 `chat.new` 拿一个新 id，再用 `chat.save` 存一份截止到那条消息的副本（`meta.branchOf` 或 `meta.checkpointOf`）。分支会切到新对话；检查点留在原处，那条消息带上 `checkpoint: 新chatId`，点它可以打开。后端不需要额外实现。

字段说明：

- `stream`：用户在设置里选的输出方式。`true` 时用 `turn.delta` 逐段推送；`false` 时只发一个带全文的 `turn.done`。后端不支持流式时，即使收到 `true`，也可以直接发 `turn.done` 带全文，前端照样能显示。
- `persona`：当前用户人设 `{ id, name, desc }`，用于替换提示词里的 `{{user}}`。人设锁定（对话 > 角色 > 默认）在前端解析，后端收到的就是这次该用的人设。
- `params`：生成参数 `{ temperature, top_p, top_k, min_p, repetition_penalty, frequency_penalty, presence_penalty, max_tokens, context_size, seed, stop: string[] }`；`preset` 是预设名。后端按模型支持的部分使用，不支持的忽略。
- `authorsNote`：作者注释 `{ text, position: 'before' | 'after' | 'chat', depth, freq, role: 'system' | 'user' | 'assistant' }`，没写时为 `null`。`position` 为 `chat` 时插在倒数第 `depth` 条消息前；`freq` 是每隔几条插入一次（0 = 不插入）。
- `lorebooks`：要启用的世界书 id 列表（全局启用的 + 本对话启用的）。关键词扫描、触发、按 `position` / `depth` / `order` 插入都由后端完成；角色卡自带的 `character_book` 也由后端处理。
- `text`：用户刚输入的原文，没有经过宏替换。
- `history`：截止到这次生成之前的对话，`[{ id, role, name, text }]`，**已去掉用户隐藏的消息**。当前对话以前端为准（用户可以编辑、删除、隐藏、切换候选），后端拼提示词时用它，不必自己维护对话状态。
- **宏**：同 SillyTavern，用户消息在**发送时**、任何消息在**编辑保存时**由前端替换宏（`{{char}}` `{{user}}` `{{time}}` `{{date}}` `{{random:…}}` `{{roll:…}}` 等），所以 `text` 和 `history` 里已经是替换后的文字。开场白在开始对话时就替换好了。后端只需替换它自己拼进提示词的内容（角色卡、世界书、系统提示词等）里的宏。

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

## 4. `/` 命令

`/` 命令全部在前端执行，不需要后端支持：`/sys` 旁白、`/send` 只发不生成、`/trigger` 让角色接着说（发一个 `text` 为空的 `chat.send`）、`/continue`、`/regen`、`/impersonate`、`/stop`、`/del`、`/hide`、`/unhide`、`/persona`、`/char`、`/newchat`、`/echo`、`/help`。

## 5. 调试

- `__trianon.state`：当前状态的只读快照（连接、角色、人设、设置、消息、进行中的生成）。
- `__trianon.log`：最近 200 条进出记录。
- `__trianon.usingMock`：当前是否在用模拟后端。
- `__trianon.mock.set({ delay, cps, reasoning, failNext })`：调整模拟后端。例如 `failNext: true` 让下一次生成出错，`delay: 10` 模拟等待很久。
- `__trianon.mock.disconnect()`：模拟断线三秒后重连。
- 在加载前设 `window.__trianonNoMock = true`，可以禁用模拟后端。

---

## 6. 之后会加的接口

下面这些随后续功能加入，加入时更新本文档：Prompt Manager、总结。
