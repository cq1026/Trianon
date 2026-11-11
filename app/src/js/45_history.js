/* ===== 聊天记录（吊牌 Mémoire）=====
   一张从左侧滑出的信笺抽屉：当前角色的全部对话，可以打开、改名、删除。
   分支 / 检查点在消息的「⋯」菜单里：都是把截止到那条消息的对话另存一份——
   分支会切过去继续写，检查点只存档、留在原处。存取都走接口：chat.list / chat.load / chat.rename / chat.delete / chat.save。 */
const history = (() => {
  const box = document.createElement('aside');
  box.className = 'hist'; box.id = 'hist'; box.setAttribute('aria-label', '聊天记录'); box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="hs-scrim"></div><div class="hs-pp">
    <div class="hs-hd"><em>Mémoire</em><b>聊 天 记 录</b><button type="button" class="hs-x" aria-label="关闭">✕</button></div>
    <div class="hs-sub" id="hsSub"></div>
    <div class="hs-tools"><input type="search" id="hsQ" placeholder="找一封信…" autocomplete="off" spellcheck="false"><button type="button" class="hs-new" data-a="new">✦ 新的对话</button></div>
    <div class="hs-list" id="hsList"></div></div>`;
  document.body.appendChild(box);
  const list = box.querySelector('#hsList'), q = box.querySelector('#hsQ');
  let chats = [], open = false;

  const titleOf = (msgs, fb) => {
    const u = (msgs || []).find(m => m.role === 'user' && (m.text || '').trim());
    return u ? u.text.replace(/\s+/g, ' ').slice(0, 24) : fb || '新的信笺';
  };
  const when = t => { if (!t) return ''; const d = new Date(t), n = new Date(); const same = d.toDateString() === n.toDateString();
    return same ? '今天 ' + hm(t) : (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm(t); };

  async function refresh() {
    $('hsSub').textContent = (S.char.name ? S.char.name + ' 的信' : '') ;
    list.innerHTML = '<div class="hs-empty">正在翻找…</div>';
    try { const r = await bridge.request('chat.list', { characterId: S.char.id }); chats = (r && r.chats) || []; }
    catch (e) { chats = []; list.innerHTML = `<div class="hs-empty">后端没有提供聊天记录。<br><small>${esc(e.message || '')}</small></div>`; return; }
    render();
  }
  function render() {
    const k = q.value.trim().toLowerCase();
    const xs = chats.filter(c => !k || (c.title || '').toLowerCase().includes(k) || (c.preview || '').toLowerCase().includes(k))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
    if (!xs.length) { list.innerHTML = `<div class="hs-empty">${chats.length ? '没有找到' : '还没有旧信'}</div>`; return; }
    list.innerHTML = xs.map(c => `<div class="hs-it${c.chatId === S.chat.id ? ' cur' : ''}${c.checkpointOf ? ' ck' : ''}" data-id="${esc(c.chatId)}">
      <button type="button" class="hs-open" data-a="open"><b>${esc(c.title || '新的信笺')}</b>
        <span class="hs-pv">${esc((c.preview || '').replace(/\*/g, '').slice(0, 60))}</span>
        <span class="hs-mt">${when(c.updated)} · ${c.count || 0} 条${c.branchOf ? ' · 分支' : ''}${c.checkpointOf ? ' · 检查点' : ''}${c.chatId === S.chat.id ? ' · 当前' : ''}</span></button>
      <span class="hs-acts"><button type="button" class="lnk" data-a="ren">改名</button><button type="button" class="lnk dl" data-a="del">删除</button></span></div>`).join('');
  }
  function show(v) {
    open = v; box.classList.toggle('on', v); box.setAttribute('aria-hidden', String(!v));
    if (v) { refresh(); setTimeout(() => q.focus({ preventScroll: true }), 60); }
  }

  /* 载入一段对话 */
  async function load(chatId) {
    if (busy()) turn.stop();
    if (quill.writing()) quill.skip();
    let r;
    try { r = await bridge.request('chat.load', { chatId }); } catch (e) { r = null; }
    const c = r && (r.chat || r);
    if (!c || !c.messages) { flash('打不开这封信'); return; }
    S.chat = { id: c.chatId || chatId, title: c.title || '', meta: c.meta || {}, started: true,
      messages: c.messages.map(m => Object.assign({ id: uid('m'), time: Date.now() }, m, { state: 'done' })) };
    S.turn = null; bus.emit('ui:chat'); bus.emit('ui:turn');
    show(false);
  }
  /* 分支 / 检查点：截止到 msgId 另存一份 */
  async function fork(msgId, kind) {
    const i = S.chat.messages.findIndex(m => m.id === msgId); if (i < 0) return;
    const msgs = S.chat.messages.slice(0, i + 1).filter(m => !['pending', 'reasoning', 'streaming'].includes(m.state))
      .map(m => Object.assign({}, m, { id: uid('m'), state: 'done' }));
    const base = S.chat.title || titleOf(S.chat.messages);
    let id = uid('chat');
    try { const r = await bridge.request('chat.new', { characterId: S.char.id }); if (r && r.chatId) id = r.chatId; } catch (e) { }
    const title = (kind === 'branch' ? '分支 · ' : '检查点 · ') + base;
    const meta = kind === 'branch' ? { branchOf: { chatId: S.chat.id, msgId } } : { checkpointOf: { chatId: S.chat.id, msgId } };
    await bridge.request('chat.save', { chatId: id, characterId: S.char.id, title, meta, messages: msgs.map(clean) }).catch(() => {});
    if (kind === 'branch') {
      S.chat = { id, title, meta, started: true, messages: msgs }; S.turn = null;
      bus.emit('ui:chat'); bus.emit('ui:turn'); flash('已切到新分支');
    } else {
      const m = S.chat.messages[i]; m.checkpoint = id; bus.emit('ui:msg', m); turn.save(); flash('检查点已存好');
    }
  }
  const clean = m => ({ id: m.id, role: m.role, name: m.name, text: m.text, reasoning: m.reasoning || '', time: m.time, hidden: !!m.hidden,
    greeting: !!m.greeting, userName: m.userName, charName: m.charName, personaId: m.personaId, swipes: m.swipes, sid: m.sid, checkpoint: m.checkpoint });

  /* 小纸条提示（复用「即将推出」那张） */
  function flash(t) { const s = $('soon'); $('soonFr').textContent = 'Mémoire'; $('soonTx').textContent = t; s.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => s.classList.remove('on'), 1600); }

  box.addEventListener('click', async e => {
    if (e.target.closest('.hs-x') || e.target.classList.contains('hs-scrim')) { show(false); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    const it = a.closest('.hs-it'), id = it && it.dataset.id;
    if (a.dataset.a === 'new') { show(false); bus.emit('nav', 'new'); }
    else if (a.dataset.a === 'open') { if (id !== S.chat.id) load(id); else show(false); }
    else if (a.dataset.a === 'ren') {
      const c = chats.find(x => x.chatId === id); if (!c) return;
      const b = it.querySelector('.hs-open b'); const inp = document.createElement('input'); inp.className = 'hs-ren'; inp.value = c.title || ''; b.replaceWith(inp); inp.focus(); inp.select();
      const done = async ok => { if (!inp.isConnected) return; const v = inp.value.trim(); if (ok && v && v !== c.title) { c.title = v; if (id === S.chat.id) S.chat.title = v; await bridge.request('chat.rename', { chatId: id, title: v }).catch(() => {}); } render(); };
      inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false); });
      inp.addEventListener('blur', () => done(true)); inp.addEventListener('click', ev => ev.stopPropagation());
    }
    else if (a.dataset.a === 'del') {
      if (!a.classList.contains('sure')) { a.classList.add('sure'); a.textContent = '确认删除？'; setTimeout(() => { if (a.isConnected) { a.classList.remove('sure'); a.textContent = '删除'; } }, 2400); return; }
      await bridge.request('chat.delete', { chatId: id }).catch(() => {});
      chats = chats.filter(x => x.chatId !== id); render();
      if (id === S.chat.id) bus.emit('nav', 'new');
    }
  });
  q.addEventListener('input', render);
  addEventListener('keydown', e => { if (open && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); show(false); } }, true);
  bus.on('nav', k => { if (k === 'history') show(!open); });

  return { show, load, fork, refresh, get open() { return open; }, titleOf };
})();
T.history = history;
