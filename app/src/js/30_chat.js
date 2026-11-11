/* ===== 聊天区渲染 =====
   每条消息一个 .row；助手消息 .row.in，用户消息 .row.out（样式取自原 Trianon）。
   流式更新按帧合并：同一帧里多次 delta 只重绘一次。 */
const chatView = (() => {
  const TH = $('thread'), SC = $('vChat');
  const nodes = new Map();          /* msgId -> { row, b, tx, who, st, rsn, rsnH, rsnB, meta } */
  const dirty = new Set();
  const STK = ['asset:stickers/s00.png', 'asset:stickers/s01.png', 'asset:stickers/s02.png', 'asset:stickers/s03.png',
               'asset:stickers/s04.webp', 'asset:stickers/s05.png', 'asset:stickers/s06.png', 'asset:stickers/s07.png'];
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  let stick = true;                 /* 用户没往上翻时，新内容自动滚到底 */

  SC.addEventListener('scroll', () => { stick = SC.scrollHeight - SC.scrollTop - SC.clientHeight < 60; }, { passive: true });
  const toBottom = (force) => { if (force || stick) SC.scrollTop = SC.scrollHeight; };

  /* 贴纸：按消息 id 固定选一张，约六成消息有 */
  function sticker(m, b) {
    const h = hash(m.id);
    if (h % 10 > 5 || m.state === 'pending') return;
    const img = document.createElement('img');
    img.className = 'rnd v8pop'; img.alt = ''; img.src = STK[h % STK.length];
    const left = (h >> 4) & 1, w = 46 + (h >> 6) % 20;
    img.style.cssText = `width:${w}px;--r:${((h >> 9) % 34) - 17}deg;${left ? 'left' : 'right'}:-${w - 12}px;top:${((h >> 12) % 30) - 12}px;--pd:120ms`;
    b.appendChild(img);
  }

  function build(m) {
    const row = document.createElement('div');
    row.dataset.id = m.id;
    const n = { row };
    if (m.role === 'user') {
      row.className = 'row out';
      row.innerHTML = '<div class="col"><div class="b"><div class="tx"></div></div><div class="meta"></div></div>';
    } else {
      row.className = 'row in';
      row.innerHTML = '<div class="col"><div class="who"><span class="nm"></span><span class="st" aria-live="polite"></span></div>'
        + '<div class="rsn" hidden><button class="rsn-h" type="button" aria-expanded="false"><i class="rsn-dot"></i><em>斟酌</em><span class="rsn-t"></span><b>›</b></button><div class="rsn-b"></div></div>'
        + '<div class="b tl"><div class="tx"></div></div><div class="meta"></div></div>';
      n.who = row.querySelector('.nm'); n.st = row.querySelector('.st');
      n.rsn = row.querySelector('.rsn'); n.rsnH = row.querySelector('.rsn-h'); n.rsnB = row.querySelector('.rsn-b'); n.rsnT = row.querySelector('.rsn-t');
      n.rsnH.addEventListener('click', () => setRsn(n, n.rsn.classList.contains('open') ? false : true));
      if (S.settings.reasoningOpen) setRsn(n, true);
    }
    n.b = row.querySelector('.b'); n.tx = row.querySelector('.tx'); n.meta = row.querySelector('.meta');
    /* 头像（外观里打开才显示）：角色用角色卡头像，人设用首字 */
    const av = document.createElement('span'); av.className = 'av'; av.setAttribute('aria-hidden', 'true');
    const src = m.role === 'assistant' ? S.char.avatar : '';
    av.innerHTML = src ? `<img src="${esc(src)}" alt="">` : `<b>${esc([...((m.role === 'user' ? m.userName || m.name : m.charName || m.name || S.char.name) || '?')][0] || '?')}</b>`;
    row.insertBefore(av, row.firstChild);
    row.dataset.name = m.role === 'user' ? (m.userName || m.name || '') : (m.charName || m.name || '');
    row.querySelector('.col').dataset.name = (row.dataset.name || '').toUpperCase().split('').join(' ');
    n.meta.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      act(m, n, a.dataset.act, a);
    });
    sticker(m, n.b);
    nodes.set(m.id, n);
    return n;
  }
  function setRsn(n, open) { n.rsn.classList.toggle('open', open); n.rsnH.setAttribute('aria-expanded', String(open)); }

  const LIVE = { pending: '信已送出', reasoning: '正在斟酌', streaming: '正在落笔', stopped: '已停止', error: '笔停住了' };
  function paint(m) {
    const n = nodes.get(m.id); if (!n) return;
    const live = ['pending', 'reasoning', 'streaming'].includes(m.state);
    n.row.classList.toggle('live', live);
    n.row.dataset.state = m.state || 'done';
    n.row.classList.toggle('hid', !!m.hidden);
    if (n.editing) return;
    if (m.role === 'assistant') {
      n.who.textContent = (m.name || S.char.name || '').toUpperCase().split('').join(' ');
      const lab = m.state === 'pending' && quill.enabled() ? '' : LIVE[m.state];   /* 有羽毛笔时，等待由笔写 waiting 表达 */
      n.st.innerHTML = lab ? `<em>—</em>${lab}${live ? '<i class="dots"><b>·</b><b>·</b><b>·</b></i>' : ''}` : '';
      if (m.reasoning) {
        n.rsn.hidden = false; if (!quill.sessions.has(m.id)) n.rsnB.textContent = m.reasoning;
        n.rsn.classList.toggle('live', m.state === 'reasoning');
        n.rsnT.textContent = m.reasonDur ? m.reasonDur.toFixed(1) + ' s' : '';
      } else n.rsn.hidden = true;
      n.b.classList.toggle('empty', !m.text);
    }
    if (m.role === 'assistant' && quill.sync(m, n)) { meta(m, n); return; }   /* 正文由羽毛笔逐字写 */
    if (m.role === 'assistant' && quill.sessions.size === 0 && n.rsn && !n.rsn.hidden && n.rsnB.querySelector('.ch')) n.rsnB.textContent = m.reasoning;
    const keep = [...n.b.querySelectorAll('.rnd')];
    let t = turn.disp(m) || '';
    if (t.replace(/\*\*/g, '').split('*').length % 2 === 0) t += '*';   /* 没闭合的 *动作*（流式中途、被停止）按斜体显示 */
    n.tx.innerHTML = t ? fmt(t) : '';
    keep.forEach(k => n.b.appendChild(k));
    meta(m, n);
  }
  /* 消息下方的一行操作。常用的直接露出，其余收在「⋯」里 */
  const L_ = (act, t, cls) => `<button type="button" class="lnk${cls ? ' ' + cls : ''}" data-act="${act}">${t}</button>`;
  function meta(m, n) {
    if (quill.sessions.has(m.id)) { n.meta.innerHTML = ''; return; }   /* 笔还在写，先不显示操作 */
    if (n.editing) return;
    const last = turn.lastAssistant(), isLast = turn.isLast(m), idle = !busy();
    let h = '';
    const sw = m.role === 'assistant' && m.swipes && m.swipes.length > 1 || (m.role === 'assistant' && isLast && !m.greeting && m.state === 'done');
    const greetSw = m.greeting && m.swipes && m.swipes.length > 1 && !S.chat.messages.some(x => x.role === 'user');
    if ((sw && !m.greeting || greetSw) && m.state !== 'pending') h += `<span class="swn">${L_('swl', '‹', 'sw')}<i>${(m.sid || 0) + 1} / ${m.swipes ? m.swipes.length : 1}</i>${L_('swr', '›', 'sw')}</span>`;
    if (m.role === 'assistant') {
      if (m.state === 'error') h += `<span class="err">${esc(m.error || '连接中断')}</span>` + L_('retry', '重试');
      else if (m.state === 'stopped') h += `<span>${m.text ? '已停止，保留已写的部分' : '已停止，还没有落笔'}</span>` + (m === last ? L_('regen', '重新生成') + (m.text ? L_('cont', '续写') : '') : '');
      else if (m.state === 'done') {
        h += `<span class="tm">${hm(m.time)}</span>${m.dur ? `<span class="du">耗时 ${m.dur.toFixed(1)} s</span>` : ''}` + L_('copy', '复制') + L_('edit', '编辑');
        if (m === last && isLast && !m.greeting && idle) h += (S.caps.regenerate !== false ? L_('regen', '重新生成') : '') + L_('cont', '续写');
      }
    } else h += `<span class="tm">${hm(m.time)}</span>` + L_('edit', '编辑');
    if (m.state === 'done' || m.state === 'stopped' || m.state === 'error' || m.role === 'user')
      h += `<span class="more">${L_('more', '⋯', 'mo')}<span class="mm">${L_('hide', m.hidden ? '取消隐藏' : '隐藏')}${L_('branch', '从这里分支')}${L_('ckpt', '存检查点')}${L_('prompt', '提示词')}${L_('del', '删除', 'dl')}</span></span>`;
    if (m.hidden) h += '<span class="hid-t">已隐藏 · 不发给模型</span>';
    if (m.checkpoint) h += '<button type="button" class="lnk ckm" data-act="ckopen">✦ 检查点</button>';
    n.meta.innerHTML = h;
  }

  /* 操作 */
  function act(m, n, a, el) {
    if (a !== 'more' && a !== 'del') document.querySelectorAll('.meta .more.open').forEach(x => x.classList.remove('open'));
    if (a === 'retry' || a === 'regen') turn.regenerate(m.id);
    else if (a === 'cont') turn.cont(m.id);
    else if (a === 'swl') turn.swipe(m.id, -1);
    else if (a === 'swr') turn.swipe(m.id, 1);
    else if (a === 'copy') navigator.clipboard && navigator.clipboard.writeText(turn.disp(m)).then(() => { el.textContent = '已复制'; setTimeout(() => el.textContent = '复制', 1200); }, () => {});
    else if (a === 'edit') startEdit(m, n);
    else if (a === 'more') el.parentElement.classList.toggle('open');
    else if (a === 'hide') turn.hide(m.id);
    else if (a === 'del') {
      if (el.classList.contains('sure')) { turn.remove(m.id); return; }
      el.classList.add('sure'); el.textContent = '确认删除？'; setTimeout(() => { if (el.isConnected) { el.classList.remove('sure'); el.textContent = '删除'; } }, 2400);
    }
    else if (a === 'prompt') showPrompt(m);
    else if (a === 'branch') T.history.fork(m.id, 'branch');
    else if (a === 'ckpt') T.history.fork(m.id, 'checkpoint');
    else if (a === 'ckopen') T.history.load(m.checkpoint);
  }

  /* 编辑：气泡里换成输入框；Ctrl+Enter 保存，Esc 取消 */
  function startEdit(m, n) {
    if (n.editing || (busy() && S.turn.msgId === m.id)) return;
    n.editing = true; n.row.classList.add('editing');
    const ta = document.createElement('textarea'); ta.className = 'edt'; ta.value = m.text || ''; ta.spellcheck = false;
    n.tx.hidden = true; n.b.insertBefore(ta, n.tx);
    n.meta.innerHTML = L_('esave', '保存', 'pri') + L_('ecancel', '取消') + '<span class="kb">Ctrl + Enter 保存 · Esc 取消</span>';
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, innerHeight * .5) + 'px'; };
    const done = ok => {
      if (!n.editing) return; n.editing = false; n.row.classList.remove('editing');
      const v = ta.value; ta.remove(); n.tx.hidden = false;
      if (ok && v !== m.text) turn.edit(m.id, v); else paint(m);
    };
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); done(false); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(true); } });
    n.meta.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; e.stopPropagation(); if (b.dataset.act === 'esave') done(true); else if (b.dataset.act === 'ecancel') done(false); };
    requestAnimationFrame(() => { fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
    n.endEdit = done;
  }

  /* 查看提示词：一张纸笺浮层 */
  async function showPrompt(m) {
    const box = document.createElement('div'); box.className = 'pvm'; box.setAttribute('role', 'dialog');
    box.innerHTML = '<div class="pvm-in"><div class="pvm-hd"><em>Prompt</em><b>这一条用到的提示词</b><button type="button" class="pvm-x" aria-label="关闭">✕</button></div><pre class="pvm-b">正在向后端要…</pre><div class="pvm-ft"></div></div>';
    document.body.appendChild(box);
    const close = () => box.remove();
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.pvm-x')) close(); });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    box.tabIndex = -1; box.focus();
    const r = await turn.prompt(m.id);
    const pre = box.querySelector('.pvm-b'), ft = box.querySelector('.pvm-ft');
    if (!r || r.error || r.ok === false) { pre.textContent = '后端没有提供提示词。' + (r && r.error ? '（' + r.error + '）' : ''); return; }
    const p = r.prompt;
    pre.textContent = typeof p === 'string' ? p : Array.isArray(p) ? p.map(x => `[${x.role}${x.name ? ' · ' + x.name : ''}]\n${x.content}`).join('\n\n') : JSON.stringify(p, null, 2);
    ft.textContent = r.tokens != null ? `约 ${r.tokens} tokens` : '';
  }

  function renderAll() {
    TH.innerHTML = ''; nodes.clear();
    const sep = document.createElement('div'); sep.className = 'dsep'; sep.innerHTML = `<span>${dayLabel(Date.now())}</span>`;
    TH.appendChild(sep);
    for (const m of S.chat.messages) { const n = build(m); TH.appendChild(n.row); paint(m); }
    requestAnimationFrame(() => toBottom(true));
  }
  function add(m) { const n = build(m); TH.appendChild(n.row); paint(m); }

  bus.on('ui:chat', () => {
    /* 只追加新消息；已有的保持不动，避免重放贴纸动画 */
    const ids = new Set(S.chat.messages.map(m => m.id));
    if ([...nodes.keys()].some(id => !ids.has(id)) || !TH.firstChild) { renderAll(); return; }
    for (const m of S.chat.messages) if (!nodes.has(m.id)) add(m);
    // 上一条助手消息的“重新生成”要随之消失
    S.chat.messages.forEach(m => { const n = nodes.get(m.id); if (n) meta(m, n); });
    stick = true; requestAnimationFrame(() => toBottom(true));
  });
  bus.on('ui:msg', m => dirty.add(m.id));
  bus.on('ui:turn', () => S.chat.messages.forEach(m => dirty.add(m.id)));

  /* 每帧：合并重绘；8 秒后显示等待秒数 */
  (function loop() {
    if (dirty.size) {
      for (const id of dirty) { const m = S.chat.messages.find(x => x.id === id); if (m) paint(m); }
      dirty.clear(); toBottom();
    }
    const t = S.turn;
    if (t && t.state === 'pending') {
      const e = now() - t.t0, n = nodes.get(t.msgId);
      if (n && e >= 8) { const s = `<em>—</em>还在等… ${Math.floor(e)} 秒<i class="dots"><b>·</b><b>·</b><b>·</b></i>`; if (n.st.innerHTML !== s) n.st.innerHTML = s; }
    }
    if (t && t.state === 'reasoning') { const n = nodes.get(t.msgId), m = S.chat.messages.find(x => x.id === t.msgId); if (n && m) n.rsnT.textContent = (now() - m.tReason).toFixed(1) + ' s'; }
    requestAnimationFrame(loop);
  })();

  document.addEventListener('click', e => { if (!e.target.closest('.more')) document.querySelectorAll('.meta .more.open').forEach(x => x.classList.remove('open')); });
  return { renderAll, toBottom, nodes, startEdit: id => { const m = S.chat.messages.find(x => x.id === id), n = nodes.get(id); if (m && n) startEdit(m, n); } };
})();
