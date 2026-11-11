/* ===== 对话引擎：事件驱动的状态机 =====
   pending（已发出，还没任何内容）→ reasoning（收到推理）→ streaming（收到正文）→ done / stopped / error
   非流式时没有 streaming：pending 之后直接 done（turn.done 带全文）。 */
const turn = (() => {
  const msg = id => S.chat.messages.find(m => m.id === id);
  const cur = id => S.turn && S.turn.id === id ? S.turn : null;
  const touch = m => bus.emit('ui:msg', m);

  function ensureStarted() {
    if (S.chat.started) return;
    S.chat.started = true;
    /* 角色开场白就是这段对话的第一条消息 */
    if (S.char.greeting) S.chat.messages.push({ id: uid('m'), role: 'assistant', name: S.char.name, text: macros(S.char.greeting, ctx()), time: Date.now(), state: 'done', greeting: true });
    bus.emit('ui:chat');
  }

  function begin(m, extra) {
    const id = uid('turn');
    S.turn = { id, msgId: m.id, state: 'pending', t0: now(), tFirst: 0, stream: S.settings.stream };
    Object.assign(m, { state: 'pending', text: '', reasoning: '', error: '', tStart: S.turn.t0, dur: 0 });
    touch(m); bus.emit('ui:turn');
    return Object.assign({ turnId: id, chatId: S.chat.id, msgId: m.id, stream: S.settings.stream,
      persona: { id: persona().id, name: persona().name, desc: persona().desc || '' }, characterId: S.char.id }, extra || {});
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy()) return false;
    ensureStarted();
    const u = { id: uid('m'), role: 'user', name: persona().name, personaId: persona().id, text, time: Date.now(), state: 'done' };
    const a = { id: uid('m'), role: 'assistant', name: S.char.name, text: '', time: Date.now(), state: 'pending' };
    S.chat.messages.push(u, a);
    bus.emit('ui:chat');
    const req = begin(a, { text });
    try { await bridge.request('chat.send', req); }
    catch (e) { fail(req.turnId, e.message || String(e)); }
    return true;
  }

  async function regenerate(msgId) {
    const m = msg(msgId);
    if (!m || m.role !== 'assistant' || busy()) return;
    const req = begin(m, {});
    m.time = Date.now();
    try { await bridge.request('turn.regenerate', req); }
    catch (e) { fail(req.turnId, e.message || String(e)); }
  }

  function stop() {
    if (!busy()) return;
    const t = S.turn, m = msg(t.msgId);
    t.state = 'stopped'; finish(m, 'stopped');
    bridge.request('turn.stop', { turnId: t.id }).catch(() => {});
  }

  function finish(m, state) {
    if (!m) return;
    m.state = state; m.dur = now() - (m.tStart || now());
    touch(m); bus.emit('ui:turn');
  }
  function fail(turnId, message) {
    const t = cur(turnId); if (!t) return;
    t.state = 'error'; const m = msg(t.msgId); if (m) m.error = message || '出错了'; finish(m, 'error');
  }

  /* ---- 后端事件 ---- */
  bus.on('be:turn.start', p => { const t = cur(p.turnId); if (t) bus.emit('ui:turn'); });
  bus.on('be:turn.reasoning', p => {
    const t = cur(p.turnId); if (!t || !busy()) return;
    const m = msg(t.msgId); if (!m) return;
    if (t.state === 'pending') { t.state = 'reasoning'; m.state = 'reasoning'; m.tReason = now(); }
    m.reasoning += p.delta || ''; touch(m);
  });
  bus.on('be:turn.delta', p => {
    const t = cur(p.turnId); if (!t || !busy()) return;
    const m = msg(t.msgId); if (!m) return;
    if (t.state !== 'streaming') {
      if (t.state === 'reasoning') m.reasonDur = now() - (m.tReason || now());
      t.state = 'streaming'; m.state = 'streaming'; t.tFirst = now();
    }
    m.text += p.delta || ''; touch(m);
  });
  bus.on('be:turn.done', p => {
    const t = cur(p.turnId); if (!t || !busy()) return;
    const m = msg(t.msgId); if (!m) return;
    if (typeof p.text === 'string') m.text = p.text;
    if (typeof p.reasoning === 'string' && p.reasoning) m.reasoning = p.reasoning;
    if (t.state === 'reasoning') m.reasonDur = now() - (m.tReason || now());
    if (p.usage) m.usage = p.usage;
    t.state = 'done'; finish(m, 'done');
  });
  bus.on('be:turn.error', p => fail(p.turnId, p.message));
  bus.on('be:turn.stopped', p => { const t = cur(p.turnId); if (t && busy()) { t.state = 'stopped'; finish(msg(t.msgId), 'stopped'); } });

  addEventListener('keydown', e => { if (e.key === 'Escape' && busy()) { e.preventDefault(); stop(); } });

  return { send, regenerate, stop, ensureStarted };
})();
T.turn = turn;
