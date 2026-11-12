/* ===== 输入栏与怀表发送键 ===== */
(() => {
  const ci = $('ci'), ph = $('ph'), send = $('send'), field = $('field'), comp = $('composer'), stage = $('stage');
  const fit = () => {
    ci.style.height = 'auto';
    ci.style.height = Math.min(ci.scrollHeight, Math.round(innerHeight * .32)) + 'px';
    ph.classList.toggle('off', !!ci.value);
  };
  ci.addEventListener('input', fit);
  ci.addEventListener('focus', () => field.classList.add('focus'));
  ci.addEventListener('blur', () => field.classList.remove('focus'));
  ci.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return;
    const empty = !ci.value, la = turn.lastAssistant();
    /* 快捷键（同 SillyTavern）：Ctrl+Enter 重新生成 · Alt+Enter 续写 · 输入框为空时 ←/→ 切换候选、↑ 编辑最后一条 */
    const ctrlMode = (S.settings.auto || {}).enterSend === 'ctrl';
    if (ctrlMode) {      /* 设置为 Ctrl+Enter 发送：Enter 换行，Ctrl+Shift+Enter 重新生成 */
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); if (la) turn.regenerate(la.id); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); return; }
    } else {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (la) turn.regenerate(la.id); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) { e.preventDefault(); go(); return; }
    }
    if (e.key === 'Enter' && e.altKey) { e.preventDefault(); turn.cont(); return; }
    if (empty && la && turn.isLast(la) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); turn.swipe(la.id, e.key === 'ArrowLeft' ? -1 : 1); return; }
    if (empty && e.key === 'ArrowUp') { const m = S.chat.messages[S.chat.messages.length - 1]; if (m) { e.preventDefault(); chatView.startEdit(m.id); } }
  });
  /* 代写：模型以当前人设写一段，写进输入框，由你决定发不发 */
  $('pImp').addEventListener('click', () => { if (!busy()) turn.impersonate(); });
  bus.on('ui:impersonate', p => {
    if (p.reset) ci.value = '';
    if (p.delta) ci.value += p.delta;
    if (typeof p.text === 'string') ci.value = p.text;
    if (p.error) { field.classList.add('err'); setTimeout(() => field.classList.remove('err'), 1500); }
    fit(); ci.scrollTop = ci.scrollHeight;
  });
  field.addEventListener('mousedown', e => { if (e.target !== ci) { e.preventDefault(); ci.focus(); } });

  async function go() {
    if (busy()) return;
    if (quill.writing()) quill.skip();
    const v = ci.value;
    if (!v.trim()) { ci.focus(); return; }
    ci.value = ''; fit();
    if (v.trim().startsWith('/') && await slash.run(v)) return;   /* / 命令 */
    if (!(await turn.send(v)) && !ci.value) { ci.value = v; fit(); }   /* 没发出去（比如外部来源还锁着）：把字还回去 */
  }
  const click = () => busy() ? turn.stop() : quill.writing() ? quill.skip() : go();
  addEventListener('keydown', e => { if (e.key === 'Escape' && !busy() && quill.writing()) { e.preventDefault(); quill.skip(); } });
  send.addEventListener('click', click);

  function sync() {
    const b = busy() || quill.writing();
    send.classList.toggle('busy', b);
    send.setAttribute('aria-label', b ? '停止' : '发送');
  }
  bus.on('ui:turn', sync); bus.on('ui:quill-end', sync);
  setInterval(sync, 250);   /* 写完积压的字时也要把停止环换回发送 */

  /* 人设与模型标签 */
  const pP = $('pPersona');
  const tags = () => { pP.textContent = '✦ ' + (persona().name || ''); };
  bus.on('ui:persona', tags); tags();

  /* 点人设标签：快速切换人设，并锁定到这段对话 / 这位角色，或设为默认 */
  const pop = document.createElement('div'); pop.className = 'ppop'; pop.hidden = true; document.body.appendChild(pop);
  pP.setAttribute('role', 'button'); pP.tabIndex = 0; pP.style.cursor = 'var(--cu-pointer)';
  function drawPop() {
    const L = T.app.locks();
    pop.innerHTML = `<div class="pp-hd"><em>Persona</em><b>以谁的身份写信</b></div>
      ${S.personas.map(p => `<button type="button" class="pp-it${p.id === S.personaId ? ' on' : ''}" data-id="${esc(p.id)}">${p.avatar ? `<img class="pp-av" src="${esc(p.avatar)}" alt="">` : ''}<b>${esc(p.name || '未命名')}</b>${p.id === S.defaultPersonaId ? '<i>默认</i>' : ''}</button>`).join('')}
      <div class="pp-lk"><label><input type="checkbox" data-lk="chat"${L.chat ? ' checked' : ''}> 锁定到这段对话</label>
      <label><input type="checkbox" data-lk="char"${L.char ? ' checked' : ''}${S.char.id ? '' : ' disabled'}> 锁定到 ${esc(S.char.name || '这位角色')}</label>
      <label><input type="checkbox" data-lk="def"${L.isDefault ? ' checked disabled' : ''}> 设为默认</label></div>
      <button type="button" class="pp-more" data-a="manage">管理人设…</button>`;
  }
  function placePop() { const r = pP.getBoundingClientRect(); pop.style.left = Math.max(8, r.left) + 'px'; pop.style.bottom = (innerHeight - r.top + 10) + 'px'; }
  const togglePop = v => { pop.hidden = !v; if (v) { drawPop(); placePop(); } };
  pP.addEventListener('click', e => { e.stopPropagation(); togglePop(pop.hidden); });
  pP.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePop(pop.hidden); } });
  pop.addEventListener('click', e => {
    e.stopPropagation();
    const it = e.target.closest('.pp-it'); if (it) { T.app.setPersona(it.dataset.id); drawPop(); return; }
    if (e.target.closest('[data-a=manage]')) { togglePop(false); bus.emit('nav', 'persona'); }
  });
  pop.addEventListener('change', e => {
    const k = e.target.dataset.lk; if (!k) return;
    if (k === 'chat') T.app.lockChat(e.target.checked); else if (k === 'char') T.app.lockChar(e.target.checked); else if (k === 'def' && e.target.checked) T.app.setDefaultPersona(S.personaId);
    drawPop();
  });
  document.addEventListener('click', () => togglePop(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) togglePop(false); });

  /* 输入栏高度变化时，聊天区底边跟着走 */
  new ResizeObserver(() => stage.style.setProperty('--cH', comp.offsetHeight + 'px')).observe(comp);

  /* 怀表：平时指针走真实时间；生成中指针狂转，这时点它就停止；停下后指针一路往前转回真实时间 */
  const NS = 'http://www.w3.org/2000/svg', ticks = send.querySelector('.w-ticks');
  for (let k = 0; k < 60; k++) {
    const big = k % 15 === 0, hr = k % 5 === 0, ln = document.createElementNS(NS, 'line'), r1 = big ? 12.2 : hr ? 13 : 14.4, r2 = 14.9, th = k * 6 * Math.PI / 180;
    ln.setAttribute('x1', (24 + r1 * Math.sin(th)).toFixed(2)); ln.setAttribute('y1', (32 - r1 * Math.cos(th)).toFixed(2));
    ln.setAttribute('x2', (24 + r2 * Math.sin(th)).toFixed(2)); ln.setAttribute('y2', (32 - r2 * Math.cos(th)).toFixed(2));
    ln.setAttribute('class', big ? 'tk b' : hr ? 'tk h' : 'tk'); ticks.appendChild(ln);
  }
  const wMH = $('wMH'), wHH = $('wHH');
  const realAng = () => { const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60; return [m * 6, (d.getHours() % 12 + m / 60) * 30]; };
  let [am, ah] = realAng(), last = now();
  const fwd = (a, t) => ((t - a) % 360 + 360) % 360;          /* 只往前转到目标的角度差 */
  (function hands() {
    const t = now(), dt = Math.min(.1, t - last); last = t;
    const k = motionK();
    if (send.classList.contains('busy') && k) { am += dt * 1500 * k; ah += dt * 125 * k; }
    else {
      const [tm, th] = realAng(), dm = fwd(am, tm), dh = fwd(ah, th);
      am += dm < .05 || dm > 359.9 ? 0 : dm * Math.min(1, dt * 3.2) + (dm > 2 ? dt * 40 : 0);
      ah += dh < .05 || dh > 359.9 ? 0 : dh * Math.min(1, dt * 3.2);
      if (fwd(am, tm) > 358) am = tm;
    }
    am %= 360; ah %= 360;
    wMH.setAttribute('transform', `rotate(${am.toFixed(2)} 24 32)`); wHH.setAttribute('transform', `rotate(${ah.toFixed(2)} 24 32)`);
    /* 省电：空闲且指针已经走到真实时间时，每 0.25 秒看一次就够了 */
    const [tm2] = realAng();
    const off = fwd(am, tm2); if (!send.classList.contains('busy') && (off < .3 || off > 359.5)) setTimeout(() => { last = now(); requestAnimationFrame(hands); }, 250);
    else requestAnimationFrame(hands);
  })();
  send.addEventListener('pointerdown', () => { send.classList.remove('press'); void send.offsetWidth; send.classList.add('press'); });
  send.addEventListener('animationend', () => send.classList.remove('press'));
  fit();
})();
