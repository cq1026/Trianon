/* ===== 自动化：自动续写、自动换候选、启动时打开上次的对话 =====
   都在回复写完（笔也放下）之后才判断；手动停止、出错的回复不触发。 */
(() => {
  const A = () => Object.assign({ loadLast: false, autoCont: 0, swipeWords: '', swipeMin: 0, swipeMax: 2 }, S.settings.auto || {});
  const tries = new Map();      /* msgId -> 已自动换候选的次数 */
  let watching = null;
  bus.on('ui:turn', () => {
    const t = S.turn; if (!t || t.state !== 'done' || t._autoChecked || t.kind === 'impersonate') return;
    t._autoChecked = true; watching = t;
    const wait = () => {
      if (watching !== t || S.turn !== t) return;
      if (quill.writing()) { setTimeout(wait, 250); return; }
      const m = S.chat.messages.find(x => x.id === t.msgId); if (!m || m.state !== 'done') return;
      const C = A(), text = (m.text || '').trim();
      const words = C.swipeWords.split(/[,，]/).map(w => w.trim()).filter(Boolean);
      const bad = (words.length && words.some(w => text.includes(w))) || (C.swipeMin > 0 && text.length < C.swipeMin);
      const n = tries.get(m.id) || 0;
      if (bad && n < C.swipeMax && turn.isLast(m)) { tries.set(m.id, n + 1); flash(`自动换候选（第 ${n + 1} 次）`); turn.regenerate(m.id); return; }
      if (C.autoCont > 0 && text.length < C.autoCont && t.kind !== 'continue' && turn.isLast(m)) { flash('回复有点短，自动续写'); turn.cont(m.id); }
    };
    setTimeout(wait, 300);
  });
  function flash(t) { const s = $('soon'); $('soonFr').textContent = 'Automate'; $('soonTx').textContent = t; s.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => s.classList.remove('on'), 1600); }

  /* 启动时打开上次的对话：拿到角色之后查一次聊天记录 */
  let done = false;
  bus.on('ui:char', async () => {
    if (done || !A().loadLast || S.chat.messages.length) return; done = true;
    try { const r = await bridge.request('chat.list', { characterId: S.char.id }); const L = ((r && r.chats) || []).sort((a, b) => (b.updated || 0) - (a.updated || 0));
      if (L[0]) T.history.load(L[0].chatId); } catch (e) { }
  });
})();
