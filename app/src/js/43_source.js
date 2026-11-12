/* ===== 生成来源：内置 / 外部（DeepSeek）=====
   来源、模型、思考程度是前端设置（存在本机）；钥匙交给宿主保存，前端从不存、也不显示原文。
   口令只留在这个页面的内存里（变量 pass），刷新页面或点「锁定」就没了。
   每次生成请求都带上 source；外部来源再带上 passphrase 和 model。见 docs/BRIDGE.md「生成来源」。 */
const source = (() => {
  const LV = ['Off', 'Low', 'High', 'Max'], EFF = [null, 'low', 'high', 'max'];
  let pass = '';                                   /* 口令：只在内存里 */
  const key = { checked: false, saved: false, last4: '' };
  let models = [], mState = 'idle', mErr = '';     /* 模型列表：idle · loading · ok · error */
  let busyKey = false;
  const G = () => Object.assign({ source: 'builtin', model: '', think: 0 }, S.settings.gen || {});
  const set = patch => { S.settings.gen = Object.assign(G(), patch); saveSettings(); changed(); };
  const changed = () => bus.emit('ui:source');
  const external = () => G().source === 'external';
  const unlocked = () => !!pass;
  const flash = t => { const s = $('soon'); $('soonFr').textContent = 'Connexion'; $('soonTx').textContent = t; s.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => s.classList.remove('on'), 2600); };

  /* ---- 和宿主的往来 ---- */
  const MSG = { bad_passphrase: '口令不对：已清掉内存里的口令，请重新输入', no_key: '宿主那边没有存好的钥匙，请先保存钥匙' };
  /* 宿主报错时的统一处理；返回给人看的文字 */
  function onCode(code, message) {
    if (code === 'bad_passphrase') { pass = ''; models = []; mState = 'idle'; changed(); }
    if (code === 'no_key') { key.saved = false; key.last4 = ''; pass = ''; models = []; mState = 'idle'; changed(); }
    return MSG[code] || message || code || '出错了';
  }
  async function status() {
    try { const r = await bridge.request('key.status', {}); if (r && r.ok !== false) { key.saved = !!r.saved; key.last4 = r.saved ? String(r.last4 || '') : ''; } }
    catch (e) { }
    key.checked = true; changed();
  }
  /* 保存钥匙：调用方已经清空了输入框；只发一次请求 */
  async function saveKey(k, p) {
    k = (k || '').trim(); p = p || '';
    if (busyKey) return { ok: false, message: '正在保存' };
    if (!k) return { ok: false, message: '先填钥匙' };
    if (!p) return { ok: false, message: '先填加密口令' };
    busyKey = true; changed();
    let r;
    try { r = await bridge.request('key.save', { key: k, passphrase: p }); } catch (e) { r = { ok: false, message: e.message || String(e) }; }
    k = '';
    busyKey = false;
    if (r && r.ok !== false) { key.saved = true; key.last4 = String(r.last4 || ''); key.checked = true; pass = p; changed(); fetchModels(); return { ok: true }; }
    changed(); return { ok: false, message: onCode(r && r.code, r && (r.message || r.error)) };
  }
  async function delKey() {
    if (busyKey) return { ok: false };
    busyKey = true; changed();
    let r; try { r = await bridge.request('key.delete', {}); } catch (e) { r = { ok: false, message: e.message || String(e) }; }
    busyKey = false;
    if (r && r.ok !== false) { key.saved = false; key.last4 = ''; pass = ''; models = []; mState = 'idle'; changed(); return { ok: true }; }
    changed(); return { ok: false, message: (r && (r.message || r.error)) || '删除失败' };
  }
  function unlock(p) { if (!p) return false; pass = p; changed(); fetchModels(); return true; }
  function lock() { pass = ''; changed(); }
  async function fetchModels() {
    if (!key.saved || !pass) return;
    mState = 'loading'; mErr = ''; changed();
    let r; try { r = await bridge.request('model.list', { passphrase: pass }); } catch (e) { r = { ok: false, message: e.message || String(e) }; }
    if (r && r.ok !== false && Array.isArray(r.models)) {
      models = r.models.map(m => typeof m === 'string' ? { id: m } : m).filter(m => m && m.id);
      mState = 'ok';
      if (!G().model && models.length) set({ model: models[0].id }); else changed();
    } else { mState = 'error'; mErr = onCode(r && r.code, r && (r.message || r.error)); changed(); }
  }

  /* ---- 给生成请求用 ---- */
  /* 能不能生成：外部来源要有钥匙、口令和模型；不行就提示并返回 false */
  function ready(quiet) {
    if (!external()) return true;
    const no = (t, pop) => { if (!quiet) { flash(t); if (pop) openPop(); } return false; };
    if (key.checked && !key.saved) return no('外部来源还没存钥匙：到「钥匙与口令」里保存');
    if (!pass) return no('外部来源已锁定：先输入口令解锁', true);
    if (!G().model) return no('先选一个 DeepSeek 模型', true);
    return true;
  }
  const reasoning = () => { const t = G().think; return t ? { enabled: true, effort: EFF[t] } : { enabled: false }; };
  function payload() {
    const g = G();
    return g.source === 'external' ? { source: 'external', passphrase: pass, model: g.model } : { source: 'builtin' };
  }
  /* 生成请求被宿主拒绝（turn.error 或请求返回 ok:false）时调用 */
  const fail = (code, message) => onCode(code, message);

  /* ================= 界面：输入栏的模型标签 + 弹窗 + 模型目录（原版 v2） ================= */
  const b = document.body, RM = () => b.classList.contains('rm');
  const $$ = (q, r) => [...(r || document).querySelectorAll(q)];
  const EO = 'cubic-bezier(.22,1,.36,1)';
  const spring = (z, w, t) => { if (z >= 1) return (1 + w * t) * Math.exp(-w * t); const wd = w * Math.sqrt(1 - z * z); return Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); };
  const CHECK = '<svg class="ck" width="15" height="13" viewBox="0 0 15 13" aria-hidden="true"><path d="M1.8,7.2 C3.3,8.4 4.6,9.8 5.7,11.3 C7.9,7.2 10.6,3.9 13.4,1.6" fill="none" stroke="#4A5A86" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SP = 'M0,-7.2 L2.05,-2.55 L7,-2.2 L3.2,1.05 L4.4,6 L0,3.35 L-4.4,6 L-3.2,1.05 L-7,-2.2 L-2.05,-2.55 Z';
  const STAR = `<svg class="st" width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true"><g class="off"><path d="${SP}" fill="none" stroke="rgba(79,97,136,.62)" stroke-width="1.05" stroke-linejoin="round"/></g><g class="onn"><path d="${SP}" fill="#FFFDF8" stroke="#FFFDF8" stroke-width="3.8" stroke-linejoin="round"/><path d="${SP}" fill="url(#sv2s)" stroke="rgba(58,70,106,.62)" stroke-width=".65" stroke-linejoin="round"/><path d="M-1.2,-4.4 L-.3,-2.2" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".9"/></g></svg>`;
  const chip = $('mchip'), mcM = $('mcM'), mcT = $('mcT'), pop = $('mpop'), pmv = $('mpMv'), pList = $('mpList'), sld = $('mpSld'), src = $('mpSrc');
  const builtinName = () => S.model || '空间内置模型';
  const stars = () => store.get('modelStars', []);

  const swapTxt = (el, txt) => { if (el.textContent === txt) return; el.textContent = txt; if (!RM()) el.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EO }); };
  const setSld = (el, i) => { el.style.setProperty('--v', i); $$('button', el).forEach((x, k) => { x.classList.toggle('on', k === i); x.setAttribute('aria-checked', k === i); }); };
  function drawChip() {
    const g = G(), ext = g.source === 'external';
    swapTxt(mcM, ext ? (g.model || '选择模型') : builtinName());
    swapTxt(mcT, ext ? (pass ? LV[g.think] : '锁定') : 'intégré');
    chip.classList.toggle('lk', ext && !pass);
    chip.classList.toggle('bi', !ext);
  }
  /* 弹窗里的模型行 */
  const row = (id, label, on, x) => `<div class="mp-c mp-row${on ? ' on' : ''}" data-m="${esc(id)}" role="menuitemradio" aria-checked="${on}"><b>${esc(label)}</b>${x ? `<span class="mp-x">${esc(x)}</span>` : ''}${CHECK}</div>`;
  const note = (t, act) => `<div class="mp-c mp-note">${t}${act || ''}</div>`;
  function drawPop() {
    const g = G(), ext = g.source === 'external';
    setSld(src, ext ? 1 : 0); setSld(sld, g.think);
    $('mpSub').textContent = ext ? (key.saved ? 'DeepSeek · 尾号 ' + key.last4 : 'DeepSeek') : 'intégré';
    let h = '';
    if (!ext) h = row('', builtinName(), true, '无需钥匙');
    else if (key.checked && !key.saved) h = note('还没存 DeepSeek 钥匙。', '<button type="button" class="mp-a" data-a="key">去保存</button>');
    else if (!pass) h = note('已锁定 · 输入口令解锁', '<form class="mp-lock" data-a="unlock"><input type="password" id="mpPass" autocomplete="off" placeholder="加密口令" aria-label="加密口令"><button type="submit" class="mp-a">解锁</button></form>');
    else if (mState === 'loading') h = note('正在向宿主要模型列表…');
    else if (mState === 'error') h = note(esc(mErr), '<button type="button" class="mp-a" data-a="retry">重试</button>');
    else {
      const ids = models.map(m => m.id); if (g.model && !ids.includes(g.model)) ids.unshift(g.model);
      const st = stars(); const sorted = ids.slice().sort((a, c) => (st.includes(c) - st.includes(a)));
      h = sorted.slice(0, 6).map(id => row(id, id, id === g.model, st.includes(id) ? '★' : '')).join('') || note('宿主没有返回模型');
    }
    pList.innerHTML = h;
    const off = !ext;
    $('mpThink').classList.toggle('dis', off); $$('button', sld).forEach(x => x.disabled = off);
    $('mpHint').textContent = off ? '内置来源不使用这些参数：模型、思考程度、温度等滑杆都不生效。' : '提示：切换模型或思考程度会使已有的提示词缓存失效。建议新建会话，避免额外的 token 消耗。';
  }
  let popOpen = false, pAn = [];
  const place = () => {
    const r = chip.getBoundingClientRect(), W = pop.offsetWidth, H = pmv.offsetHeight, f = chip.closest('.field').getBoundingClientRect();
    pop.style.left = Math.round(Math.max(8, Math.min(innerWidth - W - 8, r.right - W + 20))) + 'px';
    pop.style.top = Math.round(Math.max(8, Math.min(r.top, f.top) - H - 8)) + 'px';
  };
  const pstop = () => { pAn.forEach(a => a.cancel()); pAn = []; };
  const popFrames = () => { const f = [], N = 24, D = .5; for (let i = 0; i <= N; i++) { const t = i / N * D, u = i / N; const y = spring(.62, 15, t), r = spring(.45, 16, t);
    f.push({ offset: u, opacity: Math.min(1, u * 4), transform: `translateY(${(22 * y).toFixed(2)}px) rotate(${(2.2 * r).toFixed(3)}deg) scale(${(1 - .06 * y).toFixed(4)})` }); } f[N].transform = 'none'; return f; };
  function setPop(v, fast) {
    if (v === popOpen) return; popOpen = v; pstop(); chip.classList.toggle('on', v); chip.setAttribute('aria-expanded', v); pop.setAttribute('aria-hidden', !v);
    if (v) {
      drawPop(); b.classList.add('pop-open'); place();
      if (external() && pass && mState === 'idle') fetchModels();
      if (RM()) return; pop.classList.add('anim');
      pAn.push(pmv.animate(popFrames(), { duration: 520, easing: 'linear' }));
      $$('.mp-c', pop).forEach((e, k) => pAn.push(e.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 90 + k * 24, easing: EO, fill: 'backwards' })));
    } else {
      b.classList.remove('pop-open'); if (RM()) return; pop.classList.add('anim');
      const a = pmv.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${fast ? -6 : 14}px) rotate(${fast ? 0 : 1.4}deg) scale(${fast ? 1.01 : .95})` }], { duration: fast ? 160 : 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      pAn.push(a); setTimeout(() => { if (!popOpen) { pop.classList.remove('anim'); a.cancel(); } }, (fast ? 160 : 200) + 20);
    }
  }
  function openPop() { if (!popOpen) setTimeout(() => setPop(true), 0); }
  chip.addEventListener('click', e => { e.stopPropagation(); setPop(!popOpen); });
  chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPop(!popOpen); } });
  chip.addEventListener('mousedown', e => e.stopPropagation());     /* 不要让输入框抢走焦点 */
  pop.addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('pointerdown', () => { if (popOpen) setPop(false); });
  addEventListener('resize', () => { if (popOpen) place(); });
  const openKeys = () => { setPop(false, true); if (T.settings) T.settings.open('connection'); };
  pop.addEventListener('click', e => {
    const sb = e.target.closest('#mpSrc button'); if (sb) { set({ source: sb.dataset.v }); drawPop(); place(); if (external() && pass && mState === 'idle') fetchModels(); return; }
    const tb = e.target.closest('#mpSld button'); if (tb && !tb.disabled) { set({ think: +tb.dataset.v }); return; }
    const r = e.target.closest('.mp-row'); if (r) { if (external()) set({ model: r.dataset.m }); return; }
    const a = e.target.closest('button[data-a]'); if (a) { if (a.dataset.a === 'key') openKeys(); else if (a.dataset.a === 'retry') fetchModels(); return; }
    if (e.target.closest('#mpMore')) { setPop(false, true); setMdl(true); return; }
    if (e.target.closest('#mpKey')) openKeys();
  });
  pop.addEventListener('submit', e => { e.preventDefault(); const i = $('mpPass'); const v = i ? i.value : ''; if (i) i.value = ''; if (unlock(v)) flash('已解锁：口令只留在这个页面的内存里'); });
  pop.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.mp-more')) { e.preventDefault(); e.target.click(); } });

  /* ---- 模型目录 ---- */
  const mdl = $('mdl'), mmv = $('mdlMv'), msc = $('mscrim'), list = $('mdList'), inp = $('mdIn'), mcnt = $('mdCnt');
  const RN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
  let mdlOpen = false, mAn = [], prov = 'all', kb = -1;
  const meta = parts => parts.filter(Boolean).map(t => `<span class="${/^[\x00-\x7f×]+$/.test(t) ? 'sc' : ''}">${esc(t)}</span>`).join('<i class="sep"></i>');
  const mdRow = (p, id, label, on, m) => `<div class="md-row${on ? ' on' : ''}" data-p="${p}" data-m="${esc(id)}" role="option" aria-selected="${on}" tabindex="-1"><div class="md-tx"><b>${esc(label)}</b><div class="md-meta">${meta(m)}</div></div>${CHECK}<button class="md-star" type="button" aria-pressed="${stars().includes(p + ':' + id)}" aria-label="收藏">${STAR}</button></div>`;
  function drawList() {
    const g = G(), ext = g.source === 'external';
    let h = `<div class="md-pv" data-p="builtin"><em>Intégré</em><span>空间自带 · 不用钥匙 · 不吃参数</span></div>` + mdRow('builtin', '', builtinName(), !ext, ['内置', '无需钥匙', '参数不生效']);
    h += `<div class="md-pv" data-p="external"><em>DeepSeek</em><span>${key.saved ? 'api key · 尾号 ' + esc(key.last4) : '还没存钥匙'}</span></div>`;
    if (key.checked && !key.saved) h += `<div class="md-msg" data-p="external">先在「钥匙与口令」里保存 DeepSeek 钥匙，再回来选模型。<button type="button" class="mp-a" data-a="key">去保存</button></div>`;
    else if (!pass) h += `<div class="md-msg" data-p="external">外部来源已锁定。<form class="mp-lock" data-a="unlock"><input type="password" id="mdPass" autocomplete="off" placeholder="加密口令" aria-label="加密口令"><button type="submit" class="mp-a">解锁</button></form></div>`;
    else if (mState === 'loading') h += `<div class="md-msg" data-p="external">正在向宿主要模型列表…</div>`;
    else if (mState === 'error') h += `<div class="md-msg" data-p="external">${esc(mErr)}<button type="button" class="mp-a" data-a="retry">重试</button></div>`;
    else {
      const L = models.slice(); if (g.model && !L.some(m => m.id === g.model)) L.unshift({ id: g.model, manual: true });
      h += L.map(m => mdRow('external', m.id, m.id, ext && m.id === g.model, ['DeepSeek', m.owned_by && !/^deepseek$/i.test(m.owned_by) ? m.owned_by : '', m.manual ? '手填' : '', LV[g.think] && ext && m.id === g.model ? '思考 ' + LV[g.think] : ''])).join('');
      h += `<div class="md-msg md-man" data-p="external"><span>列表里没有？</span><form class="mp-lock" data-a="manual"><input id="mdMan" autocomplete="off" spellcheck="false" placeholder="手填模型名" aria-label="手填模型名"><button type="submit" class="mp-a">使用</button></form><button type="button" class="mp-a" data-a="retry">刷新列表</button></div>`;
    }
    h += '<div class="md-empty">— 没有匹配的模型 —</div>';
    list.innerHTML = h; bindRows(); applyF(false);
  }
  const vis = () => $$('.md-row', list).filter(r => !r.classList.contains('hide'));
  function applyF(anim) {
    const q = inp.value.trim().toLowerCase(); list.classList.toggle('all', prov === 'all');
    $$('.md-row,.md-msg', list).forEach(r => { const ok = (prov === 'all' || r.dataset.p === prov) && (!q || r.classList.contains('md-msg') || r.textContent.toLowerCase().includes(q)); r.classList.toggle('hide', !ok); });
    $$('.md-pv', list).forEach(p => p.classList.toggle('hide', !$$(`[data-p="${p.dataset.p}"]:not(.md-pv)`, list).some(r => !r.classList.contains('hide'))));
    const v = vis(); list.classList.toggle('none', !v.length && !$$('.md-msg:not(.hide)', list).length); mcnt.textContent = (RN[v.length] || v.length) + ' modèle' + (v.length > 1 ? 's' : ''); kbSet(-1);
    if (anim && !RM()) { list.scrollTop = 0; [...list.children].filter(e => e.offsetParent !== null).slice(0, 9).forEach((e, k) => e.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: k * 28, easing: EO, fill: 'backwards' })); }
  }
  const kbSet = i => { const v = vis(); $$('.md-row.kb', list).forEach(r => r.classList.remove('kb')); kb = i; if (i >= 0 && v[i]) { v[i].classList.add('kb'); v[i].scrollIntoView({ block: 'nearest' }); } };
  const tabs = $$('#mdTabs .ptab');
  const setTab = t => { prov = t; tabs.forEach(x => x.classList.toggle('on', x.dataset.t === t)); };
  tabs.forEach(t => t.addEventListener('click', () => { if (prov === t.dataset.t) return; setTab(t.dataset.t); applyF(true); }));
  inp.addEventListener('input', () => applyF(false));
  function bindRows() {
    $$('.md-row', list).forEach(r => r.addEventListener('click', e => {
      if (e.target.closest('.md-star')) return;
      if (r.dataset.p === 'builtin') set({ source: 'builtin' }); else set({ source: 'external', model: r.dataset.m });
      setTimeout(() => setMdl(false), RM() ? 0 : 260);
    }));
    $$('.md-star', list).forEach(s => s.addEventListener('click', e => {
      e.stopPropagation(); const r = s.closest('.md-row'), k = r.dataset.p + ':' + r.dataset.m, L = stars(), on = !L.includes(k);
      store.set('modelStars', on ? L.concat(k) : L.filter(x => x !== k)); s.setAttribute('aria-pressed', on);
      if (on && !RM()) s.querySelector('.onn').animate([{ transform: 'scale(.3) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1.42) rotate(-6deg)', opacity: 1, offset: .55 }, { transform: 'scale(1.1) rotate(-14deg)', offset: .8 }, { transform: 'rotate(-12deg) scale(1.18)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,.8,.4,1)' });
    }));
  }
  list.addEventListener('click', e => { const a = e.target.closest('button[data-a]'); if (!a) return; if (a.dataset.a === 'key') { setMdl(false); if (T.settings) T.settings.open('connection'); } else if (a.dataset.a === 'retry') fetchModels(); });
  list.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (f.dataset.a === 'unlock') { const i = $('mdPass'); const v = i ? i.value : ''; if (i) i.value = ''; if (unlock(v)) flash('已解锁：口令只留在这个页面的内存里'); }
    else if (f.dataset.a === 'manual') { const v = ($('mdMan').value || '').trim(); if (v) { set({ source: 'external', model: v }); setTimeout(() => setMdl(false), RM() ? 0 : 260); } }
  });
  function setMdl(v) {
    if (v === mdlOpen) return; mdlOpen = v; mAn.forEach(a => a.cancel()); mAn = []; mdl.setAttribute('aria-hidden', !v);
    if (v) {
      setTab(external() ? 'external' : 'all'); inp.value = ''; drawList(); b.classList.add('mdl-open');
      if (external() && pass && mState === 'idle') fetchModels();
      if (RM()) { inp.focus({ preventScroll: true }); return; } mdl.classList.add('anim');
      const f = [], N = 26, D = .55; for (let i = 0; i <= N; i++) { const t = i / N * D, u = i / N, y = spring(.7, 13, t), r = spring(.5, 14, t);
        f.push({ offset: u, opacity: Math.min(1, u * 3.5), transform: `translateY(${(26 * y).toFixed(2)}px) rotate(${(-1.1 * r).toFixed(3)}deg) scale(${(1 - .035 * y).toFixed(4)})` }); } f[N].transform = 'none';
      mAn.push(msc.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }));
      mAn.push(mmv.animate(f, { duration: 560, easing: 'linear' }));
      $$('.md-c', mdl).concat(vis().slice(0, 7)).forEach((e, k) => mAn.push(e.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 110 + k * 30, easing: EO, fill: 'backwards' })));
      if (matchMedia('(pointer:fine)').matches) inp.focus({ preventScroll: true });
    } else {
      b.classList.remove('mdl-open'); inp.blur(); if (RM()) return; mdl.classList.add('anim');
      const a = mmv.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px) rotate(.6deg) scale(.975)' }], { duration: 230, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      mAn.push(a, msc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' })); setTimeout(() => { if (!mdlOpen) { mdl.classList.remove('anim'); mAn.forEach(x => x.cancel()); mAn = []; } }, 280);
    }
  }
  $('mdX').addEventListener('click', () => setMdl(false)); msc.addEventListener('click', () => setMdl(false));
  /* 键盘：Esc 先关最上面一层；目录里 ↑↓ Enter；/ 聚焦搜索 */
  addEventListener('keydown', e => {
    if (mdlOpen) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setMdl(false); return; }
      if (e.target.closest && e.target.closest('.mp-lock')) { e.stopImmediatePropagation(); return; }
      const v = vis(); if (e.key === 'ArrowDown') { e.preventDefault(); kbSet(Math.min(v.length - 1, kb + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); kbSet(Math.max(0, kb - 1)); }
      else if (e.key === 'Enter' && kb >= 0 && v[kb]) { e.preventDefault(); v[kb].click(); }
      else if (e.key === '/' && document.activeElement !== inp) { e.preventDefault(); inp.focus(); }
      e.stopImmediatePropagation(); return;
    }
    if (popOpen && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setPop(false); chip.focus({ preventScroll: true }); }
  }, true);

  bus.on('ui:source', () => { drawChip(); if (popOpen) { const f = document.activeElement && document.activeElement.id === 'mpPass'; if (!f) { drawPop(); place(); } } if (mdlOpen && !(document.activeElement && /^(mdPass|mdMan)$/.test(document.activeElement.id))) drawList(); });
  bus.on('ui:model', () => bus.emit('ui:source'));
  bus.on('be:conn.state', p => { if (p && p.state === 'ready' && !key.checked) status(); });
  bus.on('bridge:handler', () => { key.checked = false; status(); });
  drawChip();

  return { get: G, set, external, unlocked, ready, payload, reasoning, fail, status, saveKey, delKey, unlock, lock, fetchModels,
    get key() { return { saved: key.saved, last4: key.last4, checked: key.checked }; }, get models() { return models.slice(); }, get mState() { return mState; }, get mErr() { return mErr; }, get busy() { return busyKey; },
    openPop: () => setPop(true), closePop: () => setPop(false), openCatalogue: () => setMdl(true) };
})();
T.source = source;
