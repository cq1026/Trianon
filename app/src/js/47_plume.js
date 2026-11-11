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
  S.gen = store.get('gen', { preset: '默认', params: Object.assign({}, DEF) });
  S.gen.params = Object.assign({}, DEF, S.gen.params);
  const presets = () => Object.assign({ '默认': DEF }, store.get('presets', {}));
  const saveGen = () => store.set('gen', S.gen);
  const note = () => (S.chat.meta = S.chat.meta || {}, S.chat.meta.note = Object.assign({ text: '', depth: 4, position: 'chat', role: 'system', freq: 1 }, S.chat.meta.note || {}));

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
    body.innerHTML = `<div class="pl-grid">
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
  const dirty = () => { const p = presets()[S.gen.preset]; if (!p) return true; return Object.keys(DEF).some(k => JSON.stringify(p[k] ?? DEF[k]) !== JSON.stringify(S.gen.params[k])); };
  const flash = t => { const n = $('plSaved'); if (n) { n.textContent = t; clearTimeout(flash.t); flash.t = setTimeout(() => { if (n.isConnected) n.textContent = ''; }, 1800); } };
  const crumb = () => { $('plCrumb').textContent = '· ' + S.gen.preset + (dirty() ? ' （已改动）' : ''); };

  body.addEventListener('input', e => {
    const t = e.target, g = S.gen.params;
    if (t.dataset.k) { g[t.dataset.k] = +t.value; const n = body.querySelector(`[data-n="${t.dataset.k}"]`); const st = +t.step; if (n) n.value = fmtv(g[t.dataset.k], st); }
    else if (t.dataset.n) { const v = +t.value; if (!isNaN(v)) { g[t.dataset.n] = v; const r = body.querySelector(`[data-k="${t.dataset.n}"]`); if (r) r.value = v; } }
    else if (t.hasAttribute('data-stop')) g.stop = t.value.split('\n').map(x => x).filter(x => x.length);
    else if (t.dataset.note) { const N = note(); N[t.dataset.note] = t.dataset.note === 'text' ? t.value : +t.value; turn.save(); return; }
    saveGen(); crumb();
  });
  box.addEventListener('click', e => {
    if (e.target.closest('.lb-x') || e.target.classList.contains('lb-scrim')) { show(false); return; }
    const sb = e.target.closest('[data-note-seg] button');
    if (sb) { const k = sb.parentElement.dataset.noteSeg; note()[k] = sb.dataset.v; sb.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sb)); turn.save(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a, all = store.get('presets', {});
    if (k === 'pick') { S.gen.preset = a.dataset.n; S.gen.params = Object.assign({}, DEF, presets()[a.dataset.n]); saveGen(); render(); }
    else if (k === 'reset') { S.gen.params = Object.assign({}, DEF, presets()[S.gen.preset]); saveGen(); render(); }
    else if (k === 'save') { if (S.gen.preset === '默认') return; all[S.gen.preset] = Object.assign({}, S.gen.params); store.set('presets', all); render(); flash('已保存'); }
    else if (k === 'saveas') {
      const inp = document.createElement('input'); inp.className = 'pl-name'; inp.placeholder = '预设名字，回车保存'; a.replaceWith(inp); inp.focus();
      inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Escape') render(); if (ev.key !== 'Enter') return; const n = inp.value.trim(); if (!n || n === '默认') return;
        all[n] = Object.assign({}, S.gen.params); store.set('presets', all); S.gen.preset = n; saveGen(); render(); flash('已另存为「' + n + '」'); });
    }
    else if (k === 'pdel') {
      if (!a.classList.contains('sure')) { a.classList.add('sure'); a.textContent = '确认删除？'; return; }
      delete all[S.gen.preset]; store.set('presets', all); S.gen.preset = '默认'; S.gen.params = Object.assign({}, DEF); saveGen(); render();
    }
    else if (k === 'export') { const blob = new Blob([JSON.stringify(Object.assign({ name: S.gen.preset }, S.gen.params), null, 2)], { type: 'application/json' }); const x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = S.gen.preset + '.json'; x.click(); }
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
      const n = (o.name || f.name.replace(/\.json$/i, '')).trim() || '导入的预设';
      const all = store.get('presets', {}); all[n] = p; store.set('presets', all);
      S.gen.preset = n; S.gen.params = Object.assign({}, p); saveGen(); render(); flash('已导入「' + n + '」');
    } catch (e) { flash('导入失败：' + (e.message || e)); }
  });
  addEventListener('keydown', e => { if (open && e.key === 'Escape' && !e.target.closest('textarea,input')) { e.preventDefault(); e.stopImmediatePropagation(); show(false); } }, true);

  function show(v) { open = v; box.classList.toggle('on', v); box.setAttribute('aria-hidden', String(!v)); if (v) render(); }
  bus.on('nav', k => { if (k === 'gen') show(!open); });

  /* 请求里带的内容 */
  const payload = () => {
    const N = (S.chat.meta || {}).note;
    return { params: Object.assign({}, S.gen.params), preset: S.gen.preset, authorsNote: N && N.text && N.text.trim() ? Object.assign({}, N) : null };
  };
  return { show, payload, get open() { return open; } };
})();
T.plume = plume;
