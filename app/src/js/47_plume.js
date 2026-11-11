/* ===== 生成参数、预设、作者注释（吊牌 Plume）=====
   参数和预设存在本机（预设可导入导出，兼容 SillyTavern 的常用字段名）；作者注释跟着对话走（存在对话的 meta 里）。
   每次生成请求都带上 params 和 authorsNote，由后端交给模型。 */
const plume = (() => {
  const P = [
    ['temperature', '温度', 0, 2, .01, 1, '越高越随性'],
    ['top_p', 'Top P', 0, 1, .01, 1, ''],
    ['top_k', 'Top K', 0, 200, 1, 0, '0 = 不限'],
    ['min_p', 'Min P', 0, 1, .01, 0, ''],
    ['repetition_penalty', '重复惩罚', 1, 2, .01, 1, ''],
    ['frequency_penalty', '频率惩罚', -2, 2, .01, 0, ''],
    ['presence_penalty', '存在惩罚', -2, 2, .01, 0, ''],
    ['max_tokens', '回复长度', 16, 4096, 16, 400, 'tokens'],
    ['context_size', '上下文长度', 1024, 200000, 1024, 8192, 'tokens']
  ];
  const DEF = Object.fromEntries(P.map(p => [p[0], p[5]])); DEF.seed = -1; DEF.stop = [];
  /* Prompt Manager：提示词块的默认顺序（同 SillyTavern 的 identifier）。marker = 由后端按内容填充的占位块 */
  const PM_DEF = [
    { id: 'main', name: '主提示词', role: 'system', content: '在 {{char}} 与 {{user}} 之间的虚构对话里，写出 {{char}} 的下一条回复。', enabled: true },
    { id: 'worldInfoBefore', name: '世界书（角色定义前）', marker: true, enabled: true },
    { id: 'personaDescription', name: '人设描述', marker: true, enabled: true },
    { id: 'charDescription', name: '角色描述', marker: true, enabled: true },
    { id: 'charPersonality', name: '角色性格', marker: true, enabled: true },
    { id: 'scenario', name: '场景', marker: true, enabled: true },
    { id: 'enhanceDefinitions', name: '强化设定', role: 'system', content: '如果你对 {{char}} 有更多了解，可以补充进来，但不要与已有设定冲突。', enabled: false },
    { id: 'nsfw', name: '辅助提示词', role: 'system', content: '', enabled: true },
    { id: 'worldInfoAfter', name: '世界书（角色定义后）', marker: true, enabled: true },
    { id: 'dialogueExamples', name: '示例对话', marker: true, enabled: true },
    { id: 'chatHistory', name: '对话历史', marker: true, enabled: true },
    { id: 'jailbreak', name: '历史后指令', role: 'system', content: '', enabled: true }
  ];
  const pmDef = () => PM_DEF.map(x => Object.assign({ role: 'system', content: '' }, x));
  S.gen = store.get('gen', { preset: '默认', params: Object.assign({}, DEF) });
  S.gen.params = Object.assign({}, DEF, S.gen.params);
  if (!Array.isArray(S.gen.prompts) || !S.gen.prompts.length) S.gen.prompts = pmDef();
  let tab = 'params', pmOpen = null;
  const presets = () => Object.assign({ '默认': Object.assign({}, DEF, { prompts: pmDef() }) }, store.get('presets', {}));
  const snapshot = () => Object.assign({}, S.gen.params, { prompts: JSON.parse(JSON.stringify(S.gen.prompts)) });
  const applyPreset = p => { S.gen.params = Object.assign({}, DEF, p); delete S.gen.params.prompts; S.gen.prompts = p.prompts ? JSON.parse(JSON.stringify(p.prompts)) : pmDef(); };
  const saveGen = () => store.set('gen', S.gen);
  const note = () => (S.chat.meta = S.chat.meta || {}, S.chat.meta.note = Object.assign({ text: '', depth: 4, position: 'chat', role: 'system', freq: 1 }, S.chat.meta.note || {}));
  /* 总结：内容跟着对话（meta.summary）；怎么总结、多久总结一次存在本机 */
  const SUMDEF = { every: 0, position: 'after', depth: 4, role: 'system', template: '[故事到目前为止的总结：{{summary}}]',
    prompt: '暂停角色扮演。用不超过 200 字总结到目前为止的故事：重要的事件、人物关系的变化、还没解决的事。只输出总结本身。' };
  const sumCfg = () => Object.assign({}, SUMDEF, store.get('summaryCfg', {}));
  const summ = () => (S.chat.meta = S.chat.meta || {}, S.chat.meta.summary = Object.assign({ text: '', at: 0 }, S.chat.meta.summary || {}));
  let sumBusy = false;
  async function summarize(auto) {
    if (sumBusy) return; sumBusy = true; if (open && tab === 'summary') render();
    const C = sumCfg();
    try {
      const r = await bridge.request('turn.summarize', { chatId: S.chat.id, characterId: S.char.id, history: turn.history(null, true), prompt: macros(C.prompt, ctx()), previous: summ().text,
        persona: { id: persona().id, name: persona().name, desc: persona().desc || '' }, params: Object.assign({}, S.gen.params) });
      if (r && typeof r.text === 'string' && r.text.trim()) { const Sm = summ(); Sm.text = r.text.trim(); Sm.at = S.chat.messages.length; turn.save(); if (!auto) flash('总结好了'); }
      else if (!auto) flash('后端没有返回总结' + (r && r.error ? '：' + r.error : ''));
    } catch (e) { if (!auto) flash('总结失败：' + (e.message || e)); }
    sumBusy = false; if (open && tab === 'summary') render();
  }
  function sumHTML() {
    const Sm = summ(), C = sumCfg(), since = S.chat.messages.length - (Sm.at || 0);
    return `<div class="pl-grid"><div class="pl-col"><div class="pl-cap"><em>Résumé</em><b>这段对话的总结</b><small>${Sm.text ? '上次总结后又有 ' + since + ' 条' : '还没有总结'}</small></div>
      <label class="lb-f"><textarea rows="12" data-sum="text" placeholder="点「现在总结」让模型写，也可以自己写或修改" spellcheck="false">${esc(Sm.text)}</textarea></label>
      <div class="pl-pa" style="margin-top:12px"><button type="button" class="lb-btn pri" data-a="sumNow"${sumBusy ? ' disabled' : ''}>${sumBusy ? '正在总结…' : '现在总结'}</button><button type="button" class="lb-btn" data-a="sumClear">清空</button><span class="lb-saved" id="plSaved"></span></div></div>
      <div class="pl-col"><div class="pl-card"><div class="pl-cap"><em>Automate</em><b>自动总结</b></div>
        <div class="pl-nr"><span>每隔</span><input class="pl-n" type="number" min="0" max="500" step="1" value="${C.every}" data-cfg="every"><span>条消息自动总结一次（0 = 不自动）</span></div></div>
        <div class="pl-card"><div class="pl-cap"><em>Insertion</em><b>插进提示词</b></div>
          <label class="lb-f"><span>模板 <small>{{summary}} 会换成总结</small></span><input data-cfg="template" value="${esc(C.template)}"></label>
          <div class="pl-nr"><span>位置</span><span class="st-segx" data-cfg-seg="position">${[['before', '主提示词前'], ['after', '主提示词后'], ['chat', '聊天中按深度']].map(([v, t]) => `<button type="button" data-v="${v}" class="${C.position === v ? 'on' : ''}">${t}</button>`).join('')}</span>
            <span>深度</span><input class="pl-n" type="number" min="0" max="100" value="${C.depth}" data-cfg="depth"></div></div>
        <div class="pl-card"><div class="pl-cap"><em>Consigne</em><b>让模型怎么总结</b></div><label class="lb-f"><textarea rows="4" data-cfg="prompt" spellcheck="false">${esc(C.prompt)}</textarea></label></div></div></div>`;
  }

  const box = document.createElement('div');
  box.className = 'lib pl'; box.id = 'plume'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '生成参数'); box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="lb-scrim"></div><div class="lb-pp"><div class="lb-hd"><em>Plume</em><b>生 成 参 数</b><span class="lb-crumb" id="plCrumb"></span><button type="button" class="lb-x" aria-label="关闭">✕</button></div><div class="lb-body" id="plBody"></div></div>
    <input type="file" id="plFile" accept=".json,application/json" hidden>`;
  document.body.appendChild(box);
  const body = box.querySelector('#plBody'), file = box.querySelector('#plFile');
  let open = false;
  const fmtv = (v, st) => st >= 1 ? String(Math.round(v)) : (+v).toFixed(2);

  function render() {
    const g = S.gen.params, N = note(), ps = presets();
    $('plCrumb').textContent = '· ' + S.gen.preset + (dirty() ? ' （已改动）' : '');
    const tabs = `<div class="pl-tabs">${[['params', '采样 · 预设 · 作者注释'], ['prompts', '提示词编排'], ['summary', '总结']].map(([k, t]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-tab="${k}">${t}</button>`).join('')}</div>`;
    if (tab === 'prompts') { body.innerHTML = tabs + pmHTML(); return; }
    if (tab === 'summary') { body.innerHTML = tabs + sumHTML(); return; }
    body.innerHTML = tabs + `<div class="pl-grid">
      <div class="pl-col"><div class="pl-cap"><em>Échantillonnage</em><b>采样</b><button type="button" class="lnk" data-a="reset">恢复这个预设</button></div>
        ${P.map(([k, t, mn, mx, st, , tip]) => `<label class="pl-row"><span class="pl-l"><b>${t}</b><small>${tip}</small></span>
          <input type="range" min="${mn}" max="${mx}" step="${st}" value="${g[k]}" data-k="${k}"><input class="pl-n" type="number" min="${mn}" max="${mx}" step="${st}" value="${fmtv(g[k], st)}" data-n="${k}"></label>`).join('')}
        <label class="pl-row"><span class="pl-l"><b>种子</b><small>-1 = 随机</small></span><span></span><input class="pl-n" type="number" step="1" value="${g.seed}" data-n="seed"></label>
        <label class="lb-f pl-stop"><span>停止序列 <small>一行一个</small></span><textarea rows="2" data-stop spellcheck="false">${esc((g.stop || []).join('\n'))}</textarea></label>
      </div>
      <div class="pl-col">
        <div class="pl-card"><div class="pl-cap"><em>Préréglages</em><b>预设</b></div>
          <div class="pl-ps">${Object.keys(ps).map(n => `<button type="button" class="pl-p${n === S.gen.preset ? ' on' : ''}" data-a="pick" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>
          <div class="pl-pa"><button type="button" class="lb-btn" data-a="save"${S.gen.preset === '默认' ? ' disabled' : ''}>保存到「${esc(S.gen.preset)}」</button><button type="button" class="lb-btn" data-a="saveas">另存为…</button>
            <button type="button" class="lb-btn" data-a="import">导入</button><button type="button" class="lb-btn" data-a="export">导出</button>${S.gen.preset !== '默认' ? '<button type="button" class="lb-btn dl" data-a="pdel">删除</button>' : ''}</div></div>
        <div class="pl-card"><div class="pl-cap"><em>Note d'auteur</em><b>作者注释</b><small>只作用于这段对话</small></div>
          <label class="lb-f"><textarea rows="5" data-note="text" placeholder="比如：[写作风格：细腻、克制；保持第三人称]" spellcheck="false">${esc(N.text)}</textarea></label>
          <div class="pl-nr"><span>位置</span><span class="st-segx" data-note-seg="position">${[['before', '主提示词前'], ['after', '主提示词后'], ['chat', '聊天中按深度']].map(([v, t]) => `<button type="button" data-v="${v}" class="${N.position === v ? 'on' : ''}">${t}</button>`).join('')}</span></div>
          <div class="pl-nr"><span>深度</span><input class="pl-n" type="number" min="0" max="100" step="1" value="${N.depth}" data-note="depth"><span>频率</span><input class="pl-n" type="number" min="0" max="100" step="1" value="${N.freq}" data-note="freq" title="每隔几条消息插入一次；0 = 不插入"><span>身份</span>
            <span class="st-segx" data-note-seg="role">${[['system', '系统'], ['user', '用户'], ['assistant', '角色']].map(([v, t]) => `<button type="button" data-v="${v}" class="${N.role === v ? 'on' : ''}">${t}</button>`).join('')}</span></div>
        </div>
        <p class="lb-saved" id="plSaved"></p>
      </div></div>`;
  }
  const dirty = () => { const p = presets()[S.gen.preset]; if (!p) return true; return Object.keys(DEF).some(k => JSON.stringify(p[k] ?? DEF[k]) !== JSON.stringify(S.gen.params[k])) || JSON.stringify(p.prompts || pmDef()) !== JSON.stringify(S.gen.prompts); };
  /* 提示词编排 */
  function pmHTML() {
    const R = { system: '系统', user: '用户', assistant: '角色' };
    return `<div class="pm"><div class="pl-cap"><em>Prompts</em><b>提示词编排</b><small>从上到下就是发给模型的顺序；拖动或用 ↑↓ 调整，「占位」块由后端按角色卡、世界书和对话填进去</small>
      <button type="button" class="lnk" data-a="pmAdd">＋ 新的提示词</button><button type="button" class="lnk" data-a="pmReset">恢复默认</button></div>
      <div class="pm-list" id="pmList">${S.gen.prompts.map((x, i) => `<div class="pm-it${x.enabled ? '' : ' off'}${pmOpen === x.id ? ' open' : ''}" draggable="true" data-i="${i}">
        <div class="pm-h"><i class="pm-grip" title="拖动排序">⋮⋮</i><input type="checkbox" data-pm="enabled"${x.enabled ? ' checked' : ''} title="启用"><button type="button" class="pm-n" data-a="pmToggle"><b>${esc(x.name || x.id)}</b>${x.marker ? '<i class="pm-mk">占位</i>' : `<i class="pm-r">${R[x.role] || x.role}</i><span>${esc((x.content || '').replace(/\s+/g, ' ').slice(0, 50) || '（空）')}</span>`}</button>
          <span class="pm-mv"><button type="button" data-a="pmUp" title="上移">↑</button><button type="button" data-a="pmDown" title="下移">↓</button>${x.custom ? '<button type="button" class="dl" data-a="pmDel" title="删除">✕</button>' : ''}</span></div>
        ${pmOpen === x.id ? (x.marker ? '<div class="pm-b"><p class="pm-note">这是占位块：后端在这里插入对应的内容（角色卡字段、世界书条目、示例对话或对话历史），这里不能编辑内容，只能调整位置和开关。</p></div>'
          : `<div class="pm-b"><div class="pm-row"><label class="lb-f"><span>名字</span><input data-pm="name" value="${esc(x.name || '')}"></label><label class="lb-f"><span>身份</span><select data-pm="role">${Object.entries(R).map(([v, t]) => `<option value="${v}"${x.role === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
            <label class="lb-f"><span>内容 <small>可用宏，如 {{char}} {{user}}</small></span><textarea data-pm="content" rows="5" spellcheck="false">${esc(x.content || '')}</textarea></label></div>`) : ''}</div>`).join('')}</div>
      <div class="pl-pa"><button type="button" class="lb-btn" data-a="save"${S.gen.preset === '默认' ? ' disabled' : ''}>保存到「${esc(S.gen.preset)}」</button><button type="button" class="lb-btn" data-a="saveas">另存为…</button><span class="lb-saved" id="plSaved"></span></div></div>`;
  }
  const pmMove = (i, j) => { const L = S.gen.prompts; if (j < 0 || j >= L.length || i === j) return; const [x] = L.splice(i, 1); L.splice(j, 0, x); saveGen(); render(); };
  const flash = t => { const n = $('plSaved'); if (n) { n.textContent = t; clearTimeout(flash.t); flash.t = setTimeout(() => { if (n.isConnected) n.textContent = ''; }, 1800); } };
  const crumb = () => { $('plCrumb').textContent = '· ' + S.gen.preset + (dirty() ? ' （已改动）' : ''); };

  body.addEventListener('input', e => {
    const t = e.target, g = S.gen.params;
    if (t.dataset.k) { g[t.dataset.k] = +t.value; const n = body.querySelector(`[data-n="${t.dataset.k}"]`); const st = +t.step; if (n) n.value = fmtv(g[t.dataset.k], st); }
    else if (t.dataset.n) { const v = +t.value; if (!isNaN(v)) { g[t.dataset.n] = v; const r = body.querySelector(`[data-k="${t.dataset.n}"]`); if (r) r.value = v; } }
    else if (t.hasAttribute('data-stop')) g.stop = t.value.split('\n').map(x => x).filter(x => x.length);
    else if (t.dataset.note) { const N = note(); N[t.dataset.note] = t.dataset.note === 'text' ? t.value : +t.value; turn.save(); return; }
    else if (t.dataset.sum) { summ().text = t.value; turn.save(); return; }
    else if (t.dataset.cfg) { const c = store.get('summaryCfg', {}); c[t.dataset.cfg] = t.type === 'number' ? +t.value : t.value; store.set('summaryCfg', c); return; }
    else if (t.dataset.pm) { const it = t.closest('.pm-it'), x = S.gen.prompts[+it.dataset.i]; if (!x) return; x[t.dataset.pm] = t.type === 'checkbox' ? t.checked : t.value; if (t.type === 'checkbox') it.classList.toggle('off', !t.checked); if (t.dataset.pm === 'name') it.querySelector('.pm-n b').textContent = t.value || x.id; }
    saveGen(); crumb();
  });
  box.addEventListener('click', e => {
    if (e.target.closest('.lb-x') || e.target.classList.contains('lb-scrim')) { show(false); return; }
    const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; render(); return; }
    const cb = e.target.closest('[data-cfg-seg] button'); if (cb) { const c = store.get('summaryCfg', {}); c[cb.parentElement.dataset.cfgSeg] = cb.dataset.v; store.set('summaryCfg', c); cb.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === cb)); return; }
    const sb = e.target.closest('[data-note-seg] button');
    if (sb) { const k = sb.parentElement.dataset.noteSeg; note()[k] = sb.dataset.v; sb.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sb)); turn.save(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a, all = store.get('presets', {});
    if (k === 'pick') { S.gen.preset = a.dataset.n; applyPreset(presets()[a.dataset.n]); saveGen(); render(); }
    else if (k === 'reset') { applyPreset(presets()[S.gen.preset]); saveGen(); render(); }
    else if (k === 'save') { if (S.gen.preset === '默认') return; all[S.gen.preset] = snapshot(); store.set('presets', all); render(); flash('已保存'); }
    else if (k === 'sumNow') summarize(false);
    else if (k === 'sumClear') { const Sm = summ(); Sm.text = ''; Sm.at = 0; turn.save(); render(); }
    else if (k === 'pmToggle') { const x = S.gen.prompts[+a.closest('.pm-it').dataset.i]; pmOpen = pmOpen === x.id ? null : x.id; render(); }
    else if (k === 'pmUp' || k === 'pmDown') { const i = +a.closest('.pm-it').dataset.i; pmMove(i, i + (k === 'pmUp' ? -1 : 1)); }
    else if (k === 'pmDel') { const i = +a.closest('.pm-it').dataset.i; S.gen.prompts.splice(i, 1); saveGen(); render(); }
    else if (k === 'pmAdd') { const x = { id: 'c_' + Date.now().toString(36), name: '新的提示词', role: 'system', content: '', enabled: true, custom: true }; const h = S.gen.prompts.findIndex(y => y.id === 'chatHistory'); S.gen.prompts.splice(h < 0 ? S.gen.prompts.length : h, 0, x); pmOpen = x.id; saveGen(); render(); }
    else if (k === 'pmReset') { S.gen.prompts = pmDef(); pmOpen = null; saveGen(); render(); }
    else if (k === 'saveas') {
      const inp = document.createElement('input'); inp.className = 'pl-name'; inp.placeholder = '预设名字，回车保存'; a.replaceWith(inp); inp.focus();
      inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Escape') render(); if (ev.key !== 'Enter') return; const n = inp.value.trim(); if (!n || n === '默认') return;
        all[n] = snapshot(); store.set('presets', all); S.gen.preset = n; saveGen(); render(); flash('已另存为「' + n + '」'); });
    }
    else if (k === 'pdel') {
      if (!a.classList.contains('sure')) { a.classList.add('sure'); a.textContent = '确认删除？'; return; }
      delete all[S.gen.preset]; store.set('presets', all); S.gen.preset = '默认'; applyPreset(presets()['默认']); saveGen(); render();
    }
    else if (k === 'export') { const blob = new Blob([JSON.stringify(Object.assign({ name: S.gen.preset }, snapshot()), null, 2)], { type: 'application/json' }); const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = S.gen.preset + '.json'; x.click(); }
    else if (k === 'import') file.click();
  });
  /* 导入：兼容 SillyTavern 预设的常用字段名 */
  const MAP = { temp: 'temperature', temperature: 'temperature', top_p: 'top_p', top_k: 'top_k', min_p: 'min_p', rep_pen: 'repetition_penalty', repetition_penalty: 'repetition_penalty',
    freq_pen: 'frequency_penalty', frequency_penalty: 'frequency_penalty', presence_pen: 'presence_penalty', presence_penalty: 'presence_penalty',
    genamt: 'max_tokens', openai_max_tokens: 'max_tokens', max_tokens: 'max_tokens', max_length: 'context_size', openai_max_context: 'context_size', context_size: 'context_size', seed: 'seed' };
  file.addEventListener('change', async () => {
    const f = file.files[0]; file.value = ''; if (!f) return;
    try {
      const o = JSON.parse(await f.text()), p = Object.assign({}, DEF);
      for (const k in o) if (MAP[k] && typeof o[k] === 'number') p[MAP[k]] = o[k];
      if (Array.isArray(o.stop)) p.stop = o.stop; else if (Array.isArray(o.stopping_strings)) p.stop = o.stopping_strings;
      if (Array.isArray(o.prompts) && o.prompts.length && o.prompts[0].identifier !== undefined) {      /* SillyTavern Chat Completion 预设 */
        const byId = Object.fromEntries(o.prompts.map(x => [x.identifier, x]));
        const ord = (o.prompt_order || []).find(x => x.character_id === 100001) || (o.prompt_order || [])[0];
        const ids = ord ? ord.order : o.prompts.map(x => ({ identifier: x.identifier, enabled: x.enabled !== false }));
        const nameOf = id => (PM_DEF.find(d => d.id === id) || {}).name;
        p.prompts = ids.filter(x => byId[x.identifier]).map(x => { const q = byId[x.identifier]; return { id: q.identifier, name: nameOf(q.identifier) || q.name || q.identifier, role: q.role || 'system',
          content: q.content || '', marker: !!q.marker, enabled: x.enabled !== false, custom: !PM_DEF.some(d => d.id === q.identifier) }; });
      } else if (Array.isArray(o.prompts)) p.prompts = o.prompts;
      const n = (o.name || f.name.replace(/\.json$/i, '')).trim() || '导入的预设';
      const all = store.get('presets', {}); all[n] = p; store.set('presets', all);
      S.gen.preset = n; applyPreset(p); saveGen(); render(); flash('已导入「' + n + '」');
    } catch (e) { flash('导入失败：' + (e.message || e)); }
  });
  let dragI = -1;
  body.addEventListener('dragstart', e => { const it = e.target.closest('.pm-it'); if (!it || e.target.closest('textarea,input,select')) return; dragI = +it.dataset.i; it.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  body.addEventListener('dragover', e => { const it = e.target.closest('.pm-it'); if (dragI < 0 || !it) return; e.preventDefault(); body.querySelectorAll('.pm-it.over').forEach(x => x.classList.remove('over')); it.classList.add('over'); });
  body.addEventListener('drop', e => { const it = e.target.closest('.pm-it'); if (dragI < 0 || !it) return; e.preventDefault(); const j = +it.dataset.i; const i = dragI; dragI = -1; pmMove(i, j); });
  body.addEventListener('dragend', () => { dragI = -1; body.querySelectorAll('.pm-it.drag,.pm-it.over').forEach(x => x.classList.remove('drag', 'over')); });
  addEventListener('keydown', e => { if (open && e.key === 'Escape' && !e.target.closest('textarea,input')) { e.preventDefault(); e.stopImmediatePropagation(); show(false); } }, true);

  function show(v) { open = v; box.classList.toggle('on', v); box.setAttribute('aria-hidden', String(!v)); if (v) render(); }
  bus.on('nav', k => { if (k === 'gen') show(!open); });

  /* 请求里带的内容 */
  const payload = () => {
    const N = (S.chat.meta || {}).note;
    const Sm = (S.chat.meta || {}).summary, C = sumCfg();
    return { summary: Sm && Sm.text && Sm.text.trim() ? { text: Sm.text, content: macros(C.template.replace(/\{\{summary\}\}/g, Sm.text), ctx()), position: C.position, depth: C.depth, role: C.role } : null,
      params: Object.assign({}, S.gen.params), preset: S.gen.preset, prompts: S.gen.prompts.map(x => ({ id: x.id, name: x.name, role: x.role, content: x.marker ? undefined : macros(x.content || '', ctx()), marker: !!x.marker, enabled: !!x.enabled })), authorsNote: N && N.text && N.text.trim() ? Object.assign({}, N) : null };
  };
  /* 自动总结：每生成完一条检查一次 */
  bus.on('ui:turn', () => { const t = S.turn; if (!t || t.state !== 'done' || t._sumChecked) return; t._sumChecked = true;
    const C = sumCfg(); if (!C.every) return; const Sm = summ(); if (S.chat.messages.length - (Sm.at || 0) >= C.every) setTimeout(() => summarize(true), 400); });
  return { show, payload, summarize, get open() { return open; } };
})();
T.plume = plume;
