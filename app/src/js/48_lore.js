/* ===== 世界书（吊牌 Grimoire）=====
   左边是书，右边是条目。书存在后端（lore.list / lore.get / lore.save / lore.delete）；
   哪些书启用由前端记：全局启用存在本机，「仅这段对话」存在对话 meta 里。每次生成请求带上 lorebooks（书 id 列表），
   触发、扫描、插入由后端完成。导入导出兼容 SillyTavern 的世界书 JSON。 */
const lore = (() => {
  const POS = [['before', '角色定义前'], ['after', '角色定义后'], ['an_top', '作者注释前'], ['an_bottom', '作者注释后'], ['depth', '聊天中按深度']];
  const blank = () => ({ uid: Date.now() + Math.floor(Math.random() * 1000), comment: '', key: [], keysecondary: [], content: '', constant: false, selective: false, logic: 'and_any',
    order: 100, position: 'after', depth: 4, probability: 100, disable: false });
  const box = document.createElement('div');
  box.className = 'lib lr'; box.id = 'lore'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '世界书'); box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="lb-scrim"></div><div class="lb-pp"><div class="lb-hd"><em>Grimoire</em><b>世 界 书</b><span class="lb-crumb" id="lrCrumb"></span><button type="button" class="lb-x" aria-label="关闭">✕</button></div>
    <div class="lr-wrap"><div class="lr-books" id="lrBooks"></div><div class="lr-main" id="lrMain"></div></div></div><input type="file" id="lrFile" accept=".json,application/json" hidden>`;
  document.body.appendChild(box);
  const B = box.querySelector('#lrBooks'), M = box.querySelector('#lrMain'), file = box.querySelector('#lrFile');
  let books = [], book = null, open = false, openUid = null, tSave = 0;
  const active = () => store.get('loreActive', []);
  const chatBooks = () => (S.chat.meta && S.chat.meta.lore) || [];

  async function refresh(keepId) {
    try { const r = await bridge.request('lore.list', {}); books = (r && r.books) || []; } catch (e) { books = []; }
    drawBooks();
    const id = keepId || (book && book.id) || (books[0] && books[0].id);
    if (id && books.some(b => b.id === id)) load(id); else { book = null; drawMain(); }
  }
  function drawBooks() {
    const A = active(), C = chatBooks();
    B.innerHTML = `<div class="lr-bh"><button type="button" class="lb-btn pri" data-a="bnew">＋ 新书</button><button type="button" class="lb-btn" data-a="bimp">导入</button></div>
      ${books.length ? books.map(b => `<div class="lr-b${book && book.id === b.id ? ' on' : ''}" data-id="${esc(b.id)}"><button type="button" class="lr-bn" data-a="bopen"><b>${esc(b.name || '未命名')}</b><small>${b.count || 0} 条</small></button>
        <label title="所有对话都用"><input type="checkbox" data-act="g"${A.includes(b.id) ? ' checked' : ''}> 全局</label><label title="只有这段对话用"><input type="checkbox" data-act="c"${C.includes(b.id) ? ' checked' : ''}> 本对话</label></div>`).join('')
        : '<div class="lb-empty">还没有世界书</div>'}
      <p class="lr-tip">勾「全局」的书在所有对话里生效；勾「本对话」只在当前这段对话里生效。角色卡自带的世界书由后端处理。</p>`;
  }
  async function load(id) {
    try { const r = await bridge.request('lore.get', { id }); book = r && r.book; } catch (e) { book = null; }
    if (book) book.entries = book.entries || [];
    drawBooks(); drawMain();
  }
  function drawMain() {
    $('lrCrumb').textContent = book ? '· ' + (book.name || '未命名') : '';
    if (!book) { M.innerHTML = '<div class="lb-empty">选一本书，或者新建一本</div>'; return; }
    M.innerHTML = `<div class="lr-mh"><input class="lr-title" id="lrName" value="${esc(book.name || '')}" placeholder="书名"><input type="search" id="lrQ" placeholder="找条目…">
      <button type="button" class="lb-btn pri" data-a="enew">＋ 条目</button><button type="button" class="lb-btn" data-a="bexp">导出</button><button type="button" class="lb-btn dl" data-a="bdel">删除这本</button></div>
      <div class="lr-es" id="lrEs"></div><p class="lb-saved" id="lrSaved"></p>`;
    drawEntries();
  }
  function drawEntries() {
    const q = ($('lrQ') && $('lrQ').value || '').trim().toLowerCase();
    const xs = book.entries.filter(e => !q || (e.comment || '').toLowerCase().includes(q) || e.key.join(' ').toLowerCase().includes(q) || (e.content || '').toLowerCase().includes(q))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    $('lrEs').innerHTML = xs.length ? xs.map(e => entry(e)).join('') : '<div class="lb-empty">没有条目</div>';
  }
  function entry(e) {
    const on = openUid === e.uid;
    const head = `<button type="button" class="lr-eh" data-a="etoggle"><i class="lr-dot${e.disable ? ' off' : e.constant ? ' const' : ''}"></i><b>${esc(e.comment || e.key[0] || '未命名条目')}</b>
      <span>${e.constant ? '常驻' : esc(e.key.join('，') || '（没有关键词）')}</span><em>${on ? '收起' : '展开'}</em></button>`;
    if (!on) return `<div class="lr-e" data-uid="${e.uid}">${head}</div>`;
    return `<div class="lr-e open" data-uid="${e.uid}">${head}<div class="lr-eb">
      <label class="lb-f"><span>标题 <small>只给人看</small></span><input data-f="comment" value="${esc(e.comment)}"></label>
      <label class="lb-f"><span>关键词 <small>逗号分开；提到任意一个就触发</small></span><input data-f="key" value="${esc(e.key.join(', '))}"></label>
      <label class="lb-f"><span>次要关键词 <small>可选；配合下面的逻辑</small></span><input data-f="keysecondary" value="${esc(e.keysecondary.join(', '))}"></label>
      <label class="lb-f"><span>内容</span><textarea data-f="content" rows="5" spellcheck="false">${esc(e.content)}</textarea></label>
      <div class="lr-opts">
        <label><input type="checkbox" data-f="constant"${e.constant ? ' checked' : ''}> 常驻（不需要关键词）</label>
        <label><input type="checkbox" data-f="selective"${e.selective ? ' checked' : ''}> 需要次要关键词</label>
        <label><input type="checkbox" data-f="disable"${e.disable ? ' checked' : ''}> 停用</label>
        <label>逻辑 <select data-f="logic">${[['and_any', '任意一个'], ['and_all', '全部'], ['not_any', '都没有'], ['not_all', '不全有']].map(([v, t]) => `<option value="${v}"${e.logic === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>位置 <select data-f="position">${POS.map(([v, t]) => `<option value="${v}"${e.position === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>深度 <input type="number" min="0" max="999" data-f="depth" value="${e.depth}"></label>
        <label>顺序 <input type="number" data-f="order" value="${e.order}"></label>
        <label>概率 <input type="number" min="0" max="100" data-f="probability" value="${e.probability}">%</label>
      </div>
      <div class="lr-ea"><button type="button" class="lnk dl" data-a="edel">删除条目</button></div></div></div>`;
  }
  function saveBook() {
    clearTimeout(tSave);
    tSave = setTimeout(async () => {
      if (!book) return;
      try { const r = await bridge.request('lore.save', { book }); if (r && r.id) book.id = r.id; } catch (e) { }
      const b = books.find(x => x.id === book.id); if (b) { b.name = book.name; b.count = book.entries.length; } else books.push({ id: book.id, name: book.name, count: book.entries.length });
      drawBooks(); const n = $('lrSaved'); if (n) { n.textContent = '已保存'; setTimeout(() => { if (n.isConnected) n.textContent = ''; }, 1400); }
    }, 500);
  }

  /* SillyTavern 世界书格式 ⇄ 内部格式 */
  const POSN = { 0: 'before', 1: 'after', 2: 'an_top', 3: 'an_bottom', 4: 'depth' }, NPOS = { before: 0, after: 1, an_top: 2, an_bottom: 3, depth: 4 };
  const LOGIC = { 0: 'and_any', 1: 'not_all', 2: 'not_any', 3: 'and_all' }, NLOGIC = { and_any: 0, not_all: 1, not_any: 2, and_all: 3 };
  function fromST(o, name) {
    const src = o.entries ? (Array.isArray(o.entries) ? o.entries : Object.values(o.entries)) : [];
    return { id: '', name: o.name || name || '导入的世界书', entries: src.map((x, i) => Object.assign(blank(), {
      uid: x.uid ?? i, comment: x.comment || x.name || '', key: x.key || x.keys || [], keysecondary: x.keysecondary || x.secondary_keys || [], content: x.content || '',
      constant: !!x.constant, selective: !!x.selective, logic: LOGIC[x.selectiveLogic] || 'and_any', order: x.order ?? x.insertion_order ?? 100,
      position: typeof x.position === 'number' ? (POSN[x.position] || 'after') : (x.position === 'before_char' ? 'before' : 'after'), depth: x.depth ?? 4,
      probability: x.probability ?? 100, disable: !!(x.disable || x.enabled === false) })) };
  }
  function toST(b) {
    const entries = {}; b.entries.forEach((e, i) => { entries[i] = { uid: i, key: e.key, keysecondary: e.keysecondary, comment: e.comment, content: e.content, constant: e.constant,
      selective: e.selective, selectiveLogic: NLOGIC[e.logic] || 0, order: e.order, position: NPOS[e.position] ?? 1, depth: e.depth, probability: e.probability, useProbability: true, disable: e.disable }; });
    return { name: b.name, entries };
  }

  box.addEventListener('click', async e => {
    if (e.target.closest('.lb-x') || e.target.classList.contains('lb-scrim')) { show(false); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a, row = a.closest('.lr-b'), er = a.closest('.lr-e');
    if (k === 'bnew') { book = { id: '', name: '新的世界书', entries: [] }; try { const r = await bridge.request('lore.save', { book }); if (r && r.id) book.id = r.id; } catch (x) { } books.push({ id: book.id, name: book.name, count: 0 }); drawBooks(); drawMain(); const n = $('lrName'); n.focus(); n.select(); }
    else if (k === 'bopen') load(row.dataset.id);
    else if (k === 'bimp') file.click();
    else if (k === 'bexp') { const blob = new Blob([JSON.stringify(toST(book), null, 2)], { type: 'application/json' }); const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = (book.name || 'worldinfo') + '.json'; x.click(); }
    else if (k === 'bdel') {
      if (!a.classList.contains('sure')) { a.classList.add('sure'); a.textContent = '确认删除？'; setTimeout(() => { if (a.isConnected) { a.classList.remove('sure'); a.textContent = '删除这本'; } }, 2400); return; }
      await bridge.request('lore.delete', { id: book.id }).catch(() => {}); store.set('loreActive', active().filter(x => x !== book.id)); book = null; refresh();
    }
    else if (k === 'enew') { const x = blank(); book.entries.push(x); openUid = x.uid; drawEntries(); saveBook(); }
    else if (k === 'etoggle') { const u = +er.dataset.uid; openUid = openUid === u ? null : u; drawEntries(); }
    else if (k === 'edel') { const u = +er.dataset.uid; book.entries = book.entries.filter(x => x.uid !== u); openUid = null; drawEntries(); saveBook(); }
  });
  box.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act) { const id = t.closest('.lr-b').dataset.id;
      if (t.dataset.act === 'g') { const A = active().filter(x => x !== id); if (t.checked) A.push(id); store.set('loreActive', A); }
      else { S.chat.meta = S.chat.meta || {}; const C = chatBooks().filter(x => x !== id); if (t.checked) C.push(id); S.chat.meta.lore = C; turn.save(); }
      return; }
    field(t);
  });
  box.addEventListener('input', e => { const t = e.target; if (t.id === 'lrQ') { drawEntries(); return; } if (t.id === 'lrName') { book.name = t.value; $('lrCrumb').textContent = '· ' + t.value; saveBook(); return; } if (t.type !== 'checkbox' && t.tagName !== 'SELECT') field(t); });
  function field(t) {
    const f = t.dataset.f, er = t.closest('.lr-e'); if (!f || !er || !book) return;
    const x = book.entries.find(y => y.uid === +er.dataset.uid); if (!x) return;
    if (t.type === 'checkbox') x[f] = t.checked;
    else if (f === 'key' || f === 'keysecondary') x[f] = t.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    else if (t.type === 'number') x[f] = +t.value;
    else x[f] = t.value;
    if (f === 'comment' || f === 'key') { const hb = er.querySelector('.lr-eh b'), hs = er.querySelector('.lr-eh span'); if (hb) hb.textContent = x.comment || x.key[0] || '未命名条目'; if (hs) hs.textContent = x.constant ? '常驻' : (x.key.join('，') || '（没有关键词）'); }
    if (t.type === 'checkbox' || t.tagName === 'SELECT') { const h = er.querySelector('.lr-eh'); if (h) { const tmp = document.createElement('div'); tmp.innerHTML = entry(x); er.replaceWith(tmp.firstChild); } }
    saveBook();
  }
  file.addEventListener('change', async () => {
    const f = file.files[0]; file.value = ''; if (!f) return;
    try { const b = fromST(JSON.parse(await f.text()), f.name.replace(/\.json$/i, '')); const r = await bridge.request('lore.save', { book: b }); if (r && r.id) b.id = r.id; await refresh(b.id); }
    catch (x) { M.innerHTML = `<div class="lb-empty">导入失败：${esc(x.message || x)}</div>`; }
  });
  addEventListener('keydown', e => { if (open && e.key === 'Escape' && !e.target.closest('textarea,input,select')) { e.preventDefault(); e.stopImmediatePropagation(); show(false); } }, true);

  function show(v) { open = v; box.classList.toggle('on', v); box.setAttribute('aria-hidden', String(!v)); if (v) refresh(); }
  bus.on('nav', k => { if (k === 'lore') show(!open); });
  const payload = () => ({ lorebooks: [...new Set(active().concat(chatBooks()))] });
  return { show, payload, get open() { return open; } };
})();
T.lore = lore;
