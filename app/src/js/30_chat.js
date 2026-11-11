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
    n.meta.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'retry' || act === 'regen') turn.regenerate(m.id);
      else if (act === 'copy') navigator.clipboard && navigator.clipboard.writeText(m.text).then(() => { a.textContent = '已复制'; setTimeout(() => a.textContent = '复制', 1200); }, () => {});
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
    let t = m.text || '';
    if (t.replace(/\*\*/g, '').split('*').length % 2 === 0) t += '*';   /* 没闭合的 *动作*（流式中途、被停止）按斜体显示 */
    n.tx.innerHTML = t ? fmt(t) : '';
    keep.forEach(k => n.b.appendChild(k));
    meta(m, n);
  }
  function meta(m, n) {
    if (quill.sessions.has(m.id)) { n.meta.innerHTML = ''; return; }   /* 笔还在写，先不显示操作 */
    const last = S.chat.messages.filter(x => x.role === 'assistant').slice(-1)[0];
    let h = '';
    if (m.role === 'assistant') {
      if (m.state === 'error') h = `<span class="err">${esc(m.error || '连接中断')}</span><button type="button" class="lnk" data-act="retry">重试</button>`;
      else if (m.state === 'stopped') h = `<span>${m.text ? '已停止，保留已写的部分' : '已停止，还没有落笔'}</span>` + (m === last ? '<button type="button" class="lnk" data-act="regen">重新生成</button>' : '');
      else if (m.state === 'done') {
        h = `<span>${hm(m.time)}${m.dur ? ' · 耗时 ' + m.dur.toFixed(1) + ' s' : ''}</span><button type="button" class="lnk" data-act="copy">复制</button>`;
        if (m === last && !m.greeting && S.caps.regenerate !== false) h += '<button type="button" class="lnk" data-act="regen">重新生成</button>';
      }
    } else h = `<span>${hm(m.time)}</span>`;
    n.meta.innerHTML = h;
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

  return { renderAll, toBottom };
})();
