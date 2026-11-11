/* ===== 应用状态 =====
   所有界面都从这里读；后端事件和用户操作只改这里，再通过 bus 通知界面重绘。 */
const S = {
  conn: { state: 'connecting' },
  caps: { streaming: true, reasoning: false, stop: true, regenerate: true },
  model: '',
  char: { id: '', name: '', greeting: '' },
  personas: store.get('personas', [{ id: 'p_default', name: 'Colette', desc: '' }]),
  personaId: store.get('personaId', 'p_default'),          /* 当前使用的人设（会被对话 / 角色锁定覆盖） */
  defaultPersonaId: store.get('personaId', 'p_default'),   /* 默认人设 */
  settings: Object.assign({ stream: true, anim: true, speed: 1, reasoningOpen: false, reducedMotion: false }, store.get('settings', {})),
  chat: { id: uid('chat'), messages: [], started: false },
  turn: null           /* 进行中的生成：{ id, msgId, state, t0, tFirst } */
};
const persona = () => S.personas.find(p => p.id === S.personaId) || S.personas[0];
/* 宏的上下文：当前角色、人设、模型、最近的消息 */
const ctx = () => {
  const ms = S.chat.messages.filter(m => (m.text || '').trim() && !['pending', 'reasoning', 'streaming'].includes(m.state));
  const last = r => { for (let i = ms.length - 1; i >= 0; i--) if (!r || ms[i].role === r) return ms[i].text; return ''; };
  return { char: S.char.name || '', user: persona().name || '', persona: persona().desc || '', description: S.char.description || '', personality: S.char.personality || '',
    scenario: S.char.scenario || '', mesExamples: S.char.mes_example || '', model: S.model || '', lastMessage: last(), lastCharMessage: last('assistant'), lastUserMessage: last('user') };
};
const busy = () => !!S.turn && ['pending', 'reasoning', 'streaming'].includes(S.turn.state);
const saveSettings = () => store.set('settings', S.settings);
const savePersonas = () => store.set('personas', S.personas);
function setPersona(id) { if (!S.personas.find(p => p.id === id)) return; S.personaId = id; bus.emit('ui:persona'); }
/* 人设锁定（同 SillyTavern）：对话锁定 > 角色锁定 > 默认 */
const charLocks = () => store.get('charPersona', {});
function resolvePersona() {
  const ok = id => id && S.personas.some(p => p.id === id);
  const c = (S.chat.meta || {}).personaId, k = charLocks()[S.char.id];
  const id = ok(c) ? c : ok(k) ? k : ok(S.defaultPersonaId) ? S.defaultPersonaId : S.personas[0].id;
  if (id !== S.personaId) { S.personaId = id; bus.emit('ui:persona'); }
}
function setDefaultPersona(id) { S.defaultPersonaId = id; store.set('personaId', id); bus.emit('ui:persona'); }
function lockChat(on) { S.chat.meta = S.chat.meta || {}; if (on) S.chat.meta.personaId = S.personaId; else delete S.chat.meta.personaId; bus.emit('ui:persona'); if (T.turn) T.turn.save(); }
function lockChar(on) { const L = charLocks(); if (on) L[S.char.id] = S.personaId; else delete L[S.char.id]; store.set('charPersona', L); bus.emit('ui:persona'); }
const locks = () => ({ chat: (S.chat.meta || {}).personaId === S.personaId && !!(S.chat.meta || {}).personaId, char: charLocks()[S.char.id] === S.personaId && !!S.char.id, isDefault: S.defaultPersonaId === S.personaId });
bus.on('ui:chat', resolvePersona); bus.on('ui:char', resolvePersona);
/* 给设置页等独立模块用 */
T.app = { S, persona, saveSettings, savePersonas, setPersona, setDefaultPersona, lockChat, lockChar, locks, resolvePersona, bus, store };

/* 只读快照给外部调试 */
Object.defineProperty(bridge.api, 'state', { get: () => JSON.parse(JSON.stringify({
  conn: S.conn, caps: S.caps, model: S.model, char: S.char, persona: persona(), settings: S.settings,
  chat: { id: S.chat.id, messages: S.chat.messages.map(m => ({ id: m.id, role: m.role, text: m.text, state: m.state })) },
  turn: S.turn })) });

/* ---- 后端事件 → 状态 ---- */
bus.on('be:conn.state', p => { S.conn = Object.assign({ state: 'connecting' }, p); bus.emit('ui:conn'); });
bus.on('be:caps', p => { Object.assign(S.caps, p); bus.emit('ui:caps'); });
bus.on('be:model', p => { S.model = p.name || ''; bus.emit('ui:model'); });
bus.on('be:character', p => { S.char = Object.assign({ id: '', name: '', greeting: '' }, p); if (!S.char.greeting && p.first_mes) S.char.greeting = p.first_mes; bus.emit('ui:char'); });
bus.on('be:chat.load', p => {
  S.chat = { id: p.chatId || uid('chat'), messages: (p.messages || []).map(m => Object.assign({ id: uid('m'), time: Date.now(), state: 'done' }, m)), started: true };
  S.turn = null; bus.emit('ui:chat');
});
