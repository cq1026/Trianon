/* ===== 对话引擎：事件驱动的状态机 =====
   pending（已发出，还没任何内容）→ reasoning（收到推理）→ streaming（收到正文）→ done / stopped / error
   非流式时没有 streaming：pending 之后直接 done（turn.done 带全文）。
   一次生成的种类 kind：new（新消息）· regen（同一条消息的新候选）· continue（接着写）· impersonate（代写，写进输入框）。
   当前对话以前端为准：每次请求都带上 history（不含隐藏的消息），改动后用 chat.save 交给后端保存。 */
const turn = (() => {
  const msg = id => S.chat.messages.find(m => m.id === id);
  const cur = id => S.turn && S.turn.id === id ? S.turn : null;
  const touch = m => bus.emit('ui:msg', m);
  const lastAssistant = () => S.chat.messages.filter(m => m.role === 'assistant').slice(-1)[0];
  const isLast = m => S.chat.messages[S.chat.messages.length - 1] === m;

  /* 显示用的文字：替换 {{char}} {{user}}，名字按消息发出时的快照 */
  const disp = (m, t) => macros(t == null ? m.text : t, { char: m.charName || S.char.name || '', user: m.userName || persona().name || '' });

  /* 发给后端的历史：截止到某条消息（不含），隐藏的不发 */
  function history(uptoId, include) {
    const out = [];
    for (const m of S.chat.messages) {
      if (m.id === uptoId && !include) break;
      if (!m.hidden && m.state !== 'error' && (m.text || '').trim()) out.push({ id: m.id, role: m.role, name: m.role === 'user' ? (m.userName || m.name) : (m.charName || m.name), text: m.text });
      if (m.id === uptoId) break;
    }
    return out;
  }

  /* 保存：改动后 0.6 秒合并成一次 chat.save */
  let tSave = 0;
  function save() {
    clearTimeout(tSave);
    tSave = setTimeout(() => {
      const messages = S.chat.messages.filter(m => !['pending', 'reasoning', 'streaming'].includes(m.state)).map(m => ({
        id: m.id, role: m.role, name: m.name, text: m.text, reasoning: m.reasoning || '', time: m.time, hidden: !!m.hidden,
        greeting: !!m.greeting, userName: m.userName, charName: m.charName, personaId: m.personaId,
        swipes: m.swipes, sid: m.sid, checkpoint: m.checkpoint }));
      if (!messages.some(m => m.role === 'user')) return;   /* 只有开场白时不存 */
      bridge.request('chat.save', { chatId: S.chat.id, characterId: S.char.id, title: S.chat.title || T.history.titleOf(messages), meta: S.chat.meta || {}, messages }).catch(() => {});
    }, 600);
  }

  function ensureStarted() {
    if (S.chat.started) return;
    S.chat.started = true;
    /* 角色开场白就是这段对话的第一条消息 */
    if (S.char.greeting) S.chat.messages.push({ id: uid('m'), role: 'assistant', name: S.char.name, charName: S.char.name, userName: persona().name,
      text: macros(S.char.greeting, ctx()), time: Date.now(), state: 'done', greeting: true });
    bus.emit('ui:chat');
  }

  /* 候选：m.text / m.reasoning 永远是当前那一个；切换前先存回 swipes */
  const snap = m => ({ text: m.text || '', reasoning: m.reasoning || '', time: m.time, dur: m.dur || 0, reasonDur: m.reasonDur || 0 });
  function store1(m) { if (!m.swipes) m.swipes = [snap(m)], m.sid = 0; else m.swipes[m.sid] = snap(m); }
  function load1(m, i) { const w = m.swipes[i]; m.sid = i; Object.assign(m, { text: w.text, reasoning: w.reasoning, time: w.time, dur: w.dur, reasonDur: w.reasonDur }); }

  function begin(m, kind, extra) {
    const id = uid('turn');
    S.turn = { id, msgId: m ? m.id : null, kind, state: 'pending', t0: now(), tFirst: 0, stream: S.settings.stream };
    if (m) {
      if (kind === 'continue') Object.assign(m, { state: 'pending', error: '', tStart: S.turn.t0, contBase: (m.text || '').length });
      else Object.assign(m, { state: 'pending', text: '', reasoning: '', error: '', tStart: S.turn.t0, dur: 0, reasonDur: 0, contBase: 0, time: Date.now() });
      touch(m);
    }
    bus.emit('ui:turn');
    return Object.assign({ turnId: id, chatId: S.chat.id, msgId: m ? m.id : null, stream: S.settings.stream,
      persona: { id: persona().id, name: persona().name, desc: persona().desc || '' }, characterId: S.char.id }, extra || {});
  }
  async function go(type, req) {
    try { await bridge.request(type, req); }
    catch (e) { fail(req.turnId, e.message || String(e)); }
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy()) return false;
    ensureStarted();
    const u = { id: uid('m'), role: 'user', name: persona().name, userName: persona().name, personaId: persona().id, text, time: Date.now(), state: 'done' };
    const a = { id: uid('m'), role: 'assistant', name: S.char.name, charName: S.char.name, userName: persona().name, text: '', time: Date.now(), state: 'pending' };
    S.chat.messages.push(u, a);
    bus.emit('ui:chat');
    const req = begin(a, 'new', { text, history: history(a.id) });
    go('chat.send', req);
    return true;
  }

  /* 重新生成 = 给这条消息加一个新候选 */
  function regenerate(msgId) {
    const m = msg(msgId);
    if (!m || m.role !== 'assistant' || busy()) return;
    if (m.text || m.state === 'done') { store1(m); m.swipes.push(snap(m)); m.sid = m.swipes.length - 1; }
    const req = begin(m, 'regen', { history: history(m.id) });
    go('turn.regenerate', req);
  }
  function swipe(msgId, dir) {
    const m = msg(msgId);
    if (!m || m.role !== 'assistant' || busy() || (m.greeting && !(m.swipes && m.swipes.length > 1))) return;
    store1(m);
    const n = m.sid + dir;
    if (n < 0) return;
    if (n < m.swipes.length) { load1(m, n); m.state = 'done'; touch(m); save(); bus.emit('ui:turn'); return; }
    if (isLast(m) && !m.greeting) regenerate(msgId);   /* 已经是最后一个候选：向右再生成一个 */
  }
  function cont(msgId) {
    const m = msgId ? msg(msgId) : lastAssistant();
    if (!m || m.role !== 'assistant' || busy() || !isLast(m) || !(m.text || '').trim()) return;
    const req = begin(m, 'continue', { history: history(m.id, true) });
    go('turn.continue', req);
  }
  function impersonate() {
    if (busy()) return;
    ensureStarted();
    const req = begin(null, 'impersonate', { history: history(null, true) });
    bus.emit('ui:impersonate', { reset: true });
    go('turn.impersonate', req);
  }

  function stop() {
    if (!busy()) return;
    const t = S.turn, m = t.msgId && msg(t.msgId);
    t.state = 'stopped';
    if (m) finish(m, 'stopped'); else bus.emit('ui:turn');
    bridge.request('turn.stop', { turnId: t.id }).catch(() => {});
  }
  function finish(m, state) {
    if (!m) return;
    m.state = state; m.dur = now() - (m.tStart || now());
    if (m.swipes) m.swipes[m.sid] = snap(m);
    touch(m); bus.emit('ui:turn');
    if (state !== 'error') save();
  }
  function fail(turnId, message) {
    const t = cur(turnId); if (!t) return;
    t.state = 'error';
    if (!t.msgId) { bus.emit('ui:impersonate', { error: message }); bus.emit('ui:turn'); return; }
    const m = msg(t.msgId); if (m) m.error = message || '出错了'; finish(m, 'error');
  }

  /* 编辑 / 删除 / 隐藏 */
  function edit(msgId, text) { const m = msg(msgId); if (!m || busy() && S.turn.msgId === msgId) return; m.text = text; if (m.swipes) m.swipes[m.sid] = snap(m); touch(m); save(); }
  function remove(msgId) {
    if (busy() && S.turn.msgId === msgId) return;
    const i = S.chat.messages.findIndex(m => m.id === msgId); if (i < 0) return;
    S.chat.messages.splice(i, 1); bus.emit('ui:chat'); save();
  }
  function hide(msgId) { const m = msg(msgId); if (!m) return; m.hidden = !m.hidden; touch(m); save(); }
  async function prompt(msgId) {
    const m = msg(msgId);
    try { return await bridge.request('turn.prompt', { chatId: S.chat.id, msgId, characterId: S.char.id, history: history(m && m.role === 'assistant' ? msgId : null, m && m.role !== 'assistant'),
      persona: { id: persona().id, name: persona().name, desc: persona().desc || '' } }); }
    catch (e) { return { error: e.message || String(e) }; }
  }

  /* ---- 后端事件 ---- */
  bus.on('be:turn.start', p => { const t = cur(p.turnId); if (t) bus.emit('ui:turn'); });
  bus.on('be:turn.reasoning', p => {
    const t = cur(p.turnId); if (!t || !busy() || !t.msgId) return;
    const m = msg(t.msgId); if (!m) return;
    if (t.state === 'pending') { t.state = 'reasoning'; m.state = 'reasoning'; m.tReason = now(); }
    m.reasoning = (m.reasoning || '') + (p.delta || ''); touch(m);
  });
  bus.on('be:turn.delta', p => {
    const t = cur(p.turnId); if (!t || !busy()) return;
    if (!t.msgId) { t.state = 'streaming'; bus.emit('ui:impersonate', { delta: p.delta || '' }); return; }
    const m = msg(t.msgId); if (!m) return;
    if (t.state !== 'streaming') {
      if (t.state === 'reasoning') m.reasonDur = now() - (m.tReason || now());
      t.state = 'streaming'; m.state = 'streaming'; t.tFirst = now();
    }
    m.text = (m.text || '') + (p.delta || ''); touch(m);
  });
  bus.on('be:turn.done', p => {
    const t = cur(p.turnId); if (!t || !busy()) return;
    if (!t.msgId) { if (typeof p.text === 'string') bus.emit('ui:impersonate', { text: p.text }); t.state = 'done'; bus.emit('ui:turn'); return; }
    const m = msg(t.msgId); if (!m) return;
    if (typeof p.text === 'string') m.text = t.kind === 'continue' && !t.tFirst ? (m.text || '') + p.text : p.text;
    if (typeof p.reasoning === 'string' && p.reasoning) m.reasoning = p.reasoning;
    if (t.state === 'reasoning') m.reasonDur = now() - (m.tReason || now());
    if (p.usage) m.usage = p.usage;
    t.state = 'done'; finish(m, 'done');
  });
  bus.on('be:turn.error', p => fail(p.turnId, p.message));
  bus.on('be:turn.stopped', p => { const t = cur(p.turnId); if (t && busy()) { t.state = 'stopped'; if (t.msgId) finish(msg(t.msgId), 'stopped'); else bus.emit('ui:turn'); } });

  addEventListener('keydown', e => { if (e.key === 'Escape' && busy()) { e.preventDefault(); stop(); } });

  return { send, regenerate, swipe, cont, impersonate, stop, edit, remove, hide, prompt, save, history, disp, ensureStarted, lastAssistant, isLast };
})();
T.turn = turn;
