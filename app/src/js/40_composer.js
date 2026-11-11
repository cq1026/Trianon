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
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault(); go();
    }
  });
  field.addEventListener('mousedown', e => { if (e.target !== ci) { e.preventDefault(); ci.focus(); } });

  async function go() {
    if (busy()) return;
    if (quill.writing()) quill.skip();
    const v = ci.value;
    if (!v.trim()) { ci.focus(); return; }
    ci.value = ''; fit();
    await turn.send(v);
  }
  const click = () => busy() ? turn.stop() : quill.writing() ? quill.skip() : go();
  addEventListener('keydown', e => { if (e.key === 'Escape' && !busy() && quill.writing()) { e.preventDefault(); quill.skip(); } });
  send.addEventListener('click', click);
  send.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } });

  function sync() {
    const b = busy() || quill.writing();
    send.classList.toggle('busy', b);
    send.setAttribute('aria-label', b ? '停止' : '发送');
  }
  bus.on('ui:turn', sync); bus.on('ui:quill-end', sync);
  setInterval(sync, 250);   /* 写完积压的字时也要把停止环换回发送 */

  /* 人设与模型标签 */
  const pP = $('pPersona'), pM = $('pModel');
  const tags = () => { pP.textContent = '✦ ' + (persona().name || ''); pM.textContent = S.model; pM.hidden = !S.model; };
  bus.on('ui:model', tags); bus.on('ui:persona', tags); tags();

  /* 输入栏高度变化时，聊天区底边跟着走 */
  new ResizeObserver(() => stage.style.setProperty('--cH', comp.offsetHeight + 'px')).observe(comp);

  /* 停止环的旋转 */
  const arc = send.querySelector('.arc');
  let a = 0, last = now();
  (function spin() {
    const t = now(), dt = Math.min(.1, t - last); last = t;
    if (send.classList.contains('busy') && !RMQ.matches) { a = (a + dt * 200) % 360; arc.setAttribute('transform', `rotate(${a.toFixed(1)})`); }
    requestAnimationFrame(spin);
  })();
  fit();
})();
