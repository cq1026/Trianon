/* ===== 应用状态 =====
   所有界面都从这里读；后端事件和用户操作只改这里，再通过 bus 通知界面重绘。 */
const S = {
  conn: { state: 'connecting' },
  caps: { streaming: true, reasoning: false, stop: true, regenerate: true },
  model: '',
  char: { id: '', name: '', greeting: '' },
  personas: store.get('personas', [{ id: 'p_default', name: 'Colette', desc: '' }]),
  personaId: store.get('personaId', 'p_default'),
  settings: Object.assign({ stream: true, anim: true, speed: 1, reasoningOpen: false, reducedMotion: false }, store.get('settings', {})),
  chat: { id: uid('chat'), messages: [], started: false },
  turn: null           /* 进行中的生成：{ id, msgId, state, t0, tFirst } */
};
const persona = () => S.personas.find(p => p.id === S.personaId) || S.personas[0];
const ctx = () => ({ char: S.char.name || '', user: persona().name || '' });
const busy = () => !!S.turn && ['pending', 'reasoning', 'streaming'].includes(S.turn.state);
const saveSettings = () => store.set('settings', S.settings);
const savePersonas = () => store.set('personas', S.personas);
function setPersona(id) { if (!S.personas.find(p => p.id === id)) return; S.personaId = id; store.set('personaId', id); bus.emit('ui:persona'); }
/* 给设置页等独立模块用 */
T.app = { S, persona, saveSettings, savePersonas, setPersona, bus, store };

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
