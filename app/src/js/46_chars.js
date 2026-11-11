/* ===== 角色库（吊牌 Personnages）=====
   一张居中的信笺：上面是角色卡片墙，点开一张进入编辑。
   支持导入 SillyTavern 角色卡（PNG 里的 chara / ccv3 文本块，或 V1/V2/V3 JSON），导出为 V2 JSON。
   存取走接口：char.list / char.get / char.save / char.delete / char.select。 */
const chars = (() => {
  const FIELDS = [
    ['description', '描述', '外貌、身份、背景……', 6],
    ['personality', '性格', '一句话概括', 2],
    ['scenario', '场景', '故事发生的情境', 3],
    ['first_mes', '开场白', '对话的第一条消息，可用 {{char}} {{user}}', 5],
    ['mes_example', '示例对话', '<START>\n{{user}}: …\n{{char}}: …', 5],
    ['system_prompt', '系统提示词', '留空则用后端默认', 3],
    ['post_history_instructions', '历史后指令', 'Jailbreak / Post-History Instructions', 2],
    ['creator_notes', '作者备注', '只给人看，不进提示词', 2]
  ];
  const box = document.createElement('div');
  box.className = 'lib'; box.id = 'lib'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '角色库'); box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="lb-scrim"></div><div class="lb-pp"><div class="lb-hd"><em>Personnages</em><b>角 色 库</b><span class="lb-crumb" id="lbCrumb"></span><button type="button" class="lb-x" aria-label="关闭">✕</button></div><div class="lb-body" id="lbBody"></div></div>
    <input type="file" id="lbFile" accept=".png,.json,image/png,application/json" hidden>`;
  document.body.appendChild(box);
  const body = box.querySelector('#lbBody'), file = box.querySelector('#lbFile');
  let list = [], open = false, ed = null;

  const ini = n => [...(n || '?').trim()][0] || '?';
  const av = c => c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : `<b>${esc(ini(c.name))}</b>`;

  async function refresh() {
    body.innerHTML = '<div class="lb-empty">正在翻找…</div>';
    try { const r = await bridge.request('char.list', {}); list = (r && r.chars) || []; }
    catch (e) { list = []; body.innerHTML = `<div class="lb-empty">后端没有提供角色库。<br><small>${esc(e.message || '')}</small></div>`; return; }
    grid();
  }
  function grid() {
    ed = null; $('lbCrumb').textContent = '';
    body.innerHTML = `<div class="lb-tools"><input type="search" id="lbQ" placeholder="找一位…" autocomplete="off" spellcheck="false">
      <button type="button" class="lb-btn" data-a="import">导入角色卡</button><button type="button" class="lb-btn pri" data-a="new">＋ 新角色</button></div>
      <div class="lb-grid" id="lbGrid"></div><p class="lb-tip">支持 SillyTavern 的 PNG 角色卡和 JSON（V1 / V2 / V3）。也可以把文件直接拖进来。</p>`;
    const q = body.querySelector('#lbQ');
    const draw = () => {
      const k = q.value.trim().toLowerCase();
      const xs = list.filter(c => !k || (c.name || '').toLowerCase().includes(k) || (c.tags || []).join(' ').toLowerCase().includes(k));
      body.querySelector('#lbGrid').innerHTML = xs.length ? xs.map(c => `<button type="button" class="lb-card${c.id === S.char.id ? ' cur' : ''}" data-a="edit" data-id="${esc(c.id)}">
        <span class="lb-av">${av(c)}</span><b>${esc(c.name || '未命名')}</b><span class="lb-d">${esc((c.desc || '').replace(/\s+/g, ' ').slice(0, 40))}</span>
        <span class="lb-tags">${(c.tags || []).slice(0, 3).map(t => `<i>${esc(t)}</i>`).join('')}</span>${c.id === S.char.id ? '<em>当前</em>' : ''}</button>`).join('')
        : `<div class="lb-empty">${list.length ? '没有找到' : '还没有角色，先新建或导入一位'}</div>`;
    };
    q.addEventListener('input', draw); draw();
  }

  /* ---------- 编辑 ---------- */
  async function edit(id) {
    let c = { id: '', name: '', avatar: '', tags: [], alternate_greetings: [], creator: '', character_version: '' };
    if (id) {
      try { const r = await bridge.request('char.get', { id }); if (r && r.char) c = r.char; } catch (e) { }
    }
    ed = JSON.parse(JSON.stringify(c)); ed.alternate_greetings = ed.alternate_greetings || []; ed.tags = ed.tags || [];
    $('lbCrumb').textContent = '· ' + (ed.name || '新角色');
    body.innerHTML = `<div class="lb-ed">
      <div class="lb-side">
        <button type="button" class="lb-bigav" data-a="avatar" title="换头像">${av(ed)}<span>换头像</span></button>
        <label class="lb-f"><span>名字</span><input id="lbName" value="${esc(ed.name)}" maxlength="60" autocomplete="off"></label>
        <label class="lb-f"><span>标签 <small>用逗号分开</small></span><input id="lbTags" value="${esc(ed.tags.join(', '))}" autocomplete="off"></label>
        <label class="lb-f"><span>作者</span><input id="lbCreator" value="${esc(ed.creator || '')}" autocomplete="off"></label>
        <div class="lb-acts">
          <button type="button" class="lb-btn pri" data-a="chat">开始对话</button>
          <button type="button" class="lb-btn" data-a="save">保存</button>
          <button type="button" class="lb-btn" data-a="export">导出</button>
          ${ed.id ? '<button type="button" class="lb-btn dl" data-a="del">删除</button>' : ''}
          <button type="button" class="lb-btn ghost" data-a="back">‹ 返回角色库</button>
        </div>
        <p class="lb-saved" id="lbSaved"></p>
      </div>
      <div class="lb-main">
        ${FIELDS.map(([k, t, ph, r]) => `<label class="lb-f"><span>${t}</span><textarea data-k="${k}" rows="${r}" placeholder="${esc(ph)}" spellcheck="false">${esc(ed[k] || '')}</textarea></label>`).join('')}
        <div class="lb-f"><span>备用开场白 <small>对话开始时可以左右切换</small></span><div id="lbAlt"></div><button type="button" class="lb-btn ghost" data-a="altAdd">＋ 加一条</button></div>
      </div></div>`;
    drawAlt();
  }
  function drawAlt() {
    body.querySelector('#lbAlt').innerHTML = ed.alternate_greetings.map((g, i) => `<div class="lb-alt"><textarea data-alt="${i}" rows="3" spellcheck="false">${esc(g)}</textarea><button type="button" class="lnk dl" data-a="altDel" data-i="${i}">删除</button></div>`).join('');
  }
  function collect() {
    if (!ed) return null;
    ed.name = $('lbName').value.trim(); ed.tags = $('lbTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean); ed.creator = $('lbCreator').value.trim();
    body.querySelectorAll('textarea[data-k]').forEach(t => { ed[t.dataset.k] = t.value; });
    body.querySelectorAll('textarea[data-alt]').forEach(t => { ed.alternate_greetings[+t.dataset.alt] = t.value; });
    ed.alternate_greetings = ed.alternate_greetings.filter(g => g.trim());
    return ed;
  }
  async function save(quiet) {
    const c = collect(); if (!c) return null;
    if (!c.name) { $('lbName').focus(); note('先给角色起个名字'); return null; }
    try { const r = await bridge.request('char.save', { char: c }); if (r && r.id) c.id = r.id; }
    catch (e) { note('保存失败：' + (e.message || '')); return null; }
    ed = c; $('lbCrumb').textContent = '· ' + c.name;
    if (c.id === S.char.id) select(c, false);
    if (!quiet) note('已保存');
    return c;
  }
  const note = t => { const n = $('lbSaved'); if (!n) return; n.textContent = t; clearTimeout(note.t); note.t = setTimeout(() => { if (n.isConnected) n.textContent = ''; }, 2000); };

  /* 选中角色：更新当前角色；需要时开一段新对话 */
  function select(c, fresh) {
    S.char = Object.assign({}, c, { greeting: c.first_mes || '' });
    bridge.request('char.select', { id: c.id }).catch(() => {});
    store.set('charId', c.id);
    bus.emit('ui:char');
    if (fresh) { show(false); bus.emit('nav', 'new'); }
  }

  /* ---------- 导入 / 导出 ---------- */
  function fromCard(o) {
    const d = o && (o.data && (o.spec === 'chara_card_v2' || o.spec === 'chara_card_v3' || o.data.name) ? o.data : o) || {};
    return { id: '', name: d.name || d.char_name || '', description: d.description || d.char_persona || '', personality: d.personality || '', scenario: d.scenario || d.world_scenario || '',
      first_mes: d.first_mes || d.char_greeting || '', mes_example: d.mes_example || d.example_dialogue || '', creator_notes: d.creator_notes || '', system_prompt: d.system_prompt || '',
      post_history_instructions: d.post_history_instructions || '', alternate_greetings: d.alternate_greetings || [], tags: d.tags || [], creator: d.creator || '', character_version: d.character_version || '',
      extensions: d.extensions || {}, character_book: d.character_book || null };
  }
  function pngText(buf) {                  /* 读 PNG 的 tEXt 块：chara（V2，base64 JSON）或 ccv3 */
    const v = new DataView(buf), u8 = new Uint8Array(buf); let p = 8; const out = {};
    while (p + 8 < u8.length) {
      const len = v.getUint32(p), type = String.fromCharCode(...u8.slice(p + 4, p + 8));
      if (type === 'tEXt') { const data = u8.slice(p + 8, p + 8 + len), z = data.indexOf(0); const k = new TextDecoder('latin1').decode(data.slice(0, z)); out[k] = new TextDecoder('latin1').decode(data.slice(z + 1)); }
      if (type === 'IEND') break; p += 12 + len;
    }
    return out;
  }
  const b64utf8 = s => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  const shrink = (src, max = 400) => new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/webp', .86)); }; im.onerror = () => res(''); im.src = src; });
  async function importFile(f) {
    try {
      let c;
      if (/\.json$/i.test(f.name) || f.type === 'application/json') c = fromCard(JSON.parse(await f.text()));
      else {
        const buf = await f.arrayBuffer(), t = pngText(buf), raw = t.ccv3 || t.chara;
        if (!raw) throw new Error('这张图片里没有角色卡数据');
        c = fromCard(JSON.parse(b64utf8(raw)));
        c.avatar = await shrink(URL.createObjectURL(f));
      }
      if (!c.name) throw new Error('角色卡里没有名字');
      const r = await bridge.request('char.save', { char: c }); if (r && r.id) c.id = r.id;
      await refresh(); edit(c.id);
    } catch (e) { alertNote('导入失败：' + (e.message || e)); }
  }
  function exportCard() {
    const c = collect(); if (!c) return;
    const data = Object.assign({}, c); delete data.id; delete data.avatar;
    const blob = new Blob([JSON.stringify({ spec: 'chara_card_v2', spec_version: '2.0', data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (c.name || 'character') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const alertNote = t => { const s = $('soon'); $('soonFr').textContent = 'Personnages'; $('soonTx').textContent = t; s.classList.add('on'); clearTimeout(alertNote.t); alertNote.t = setTimeout(() => s.classList.remove('on'), 2400); };

  /* ---------- 交互 ---------- */
  box.addEventListener('click', async e => {
    if (e.target.closest('.lb-x') || e.target.classList.contains('lb-scrim')) { show(false); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a;
    if (k === 'new') edit(null);
    else if (k === 'edit') edit(a.dataset.id);
    else if (k === 'import') file.click();
    else if (k === 'back') { if (ed) await save(true); refresh(); }
    else if (k === 'save') save();
    else if (k === 'chat') { const c = await save(true); if (c) select(c, true); }
    else if (k === 'export') exportCard();
    else if (k === 'altAdd') { collect(); ed.alternate_greetings.push(''); drawAlt(); const ts = body.querySelectorAll('textarea[data-alt]'); ts[ts.length - 1].focus(); }
    else if (k === 'altDel') { collect(); ed.alternate_greetings.splice(+a.dataset.i, 1); drawAlt(); }
    else if (k === 'avatar') { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = async () => { if (!f.files[0]) return; ed.avatar = await shrink(URL.createObjectURL(f.files[0])); a.innerHTML = av(ed) + '<span>换头像</span>'; }; f.click(); }
    else if (k === 'del') {
      if (!a.classList.contains('sure')) { a.classList.add('sure'); a.textContent = '确认删除？'; setTimeout(() => { if (a.isConnected) { a.classList.remove('sure'); a.textContent = '删除'; } }, 2400); return; }
      await bridge.request('char.delete', { id: ed.id }).catch(() => {}); refresh();
    }
  });
  file.addEventListener('change', () => { if (file.files[0]) importFile(file.files[0]); file.value = ''; });
  box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drop'); });
  box.addEventListener('dragleave', e => { if (e.target === box || e.target.classList.contains('lb-scrim')) box.classList.remove('drop'); });
  box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) importFile(f); });
  addEventListener('keydown', e => { if (open && e.key === 'Escape' && !e.target.closest('textarea,input')) { e.preventDefault(); e.stopImmediatePropagation(); show(false); } }, true);

  function show(v) { open = v; box.classList.toggle('on', v); box.setAttribute('aria-hidden', String(!v)); if (v) refresh(); }
  bus.on('nav', k => { if (k === 'chars') show(!open); });

  return { show, select, get open() { return open; } };
})();
T.chars = chars;
