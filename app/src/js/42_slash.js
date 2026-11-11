/* ===== / 命令与宏的自动补全 =====
   输入框以 / 开头时弹出命令列表；打出 {{ 时弹出宏列表。↑↓ 选择，Tab / Enter 补全，Esc 关掉。
   发送时以 / 开头的内容当命令执行，不发给模型。 */
const slash = (() => {
  const ci = $('ci');
  const toast = t => { const s = $('soon'); $('soonFr').textContent = 'Commande'; $('soonTx').textContent = t; s.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => s.classList.remove('on'), 2200); };
  const lastN = (n, f) => { const xs = S.chat.messages.slice(-Math.max(1, n || 1)); xs.forEach(f); };
  const CMDS = [
    ['sys', '<文字>', '插入一条旁白（系统消息），不触发回复', a => turn.narrate(a)],
    ['send', '<文字>', '以你的身份发一条消息，但不让角色回复', a => turn.send(a, { noGen: true })],
    ['trigger', '', '不发消息，直接让角色接着说', () => turn.trigger()],
    ['continue', '', '续写最后一条回复', () => turn.cont()],
    ['regen', '', '重新生成最后一条回复', () => { const m = turn.lastAssistant(); if (m) turn.regenerate(m.id); }],
    ['impersonate', '', '让模型以你的人设代写一段', () => turn.impersonate()],
    ['stop', '', '停止生成', () => turn.stop()],
    ['del', '[条数]', '删除最后几条消息（默认 1）', a => { const n = parseInt(a) || 1; S.chat.messages.slice(-n).forEach(m => turn.remove(m.id)); }],
    ['hide', '[条数]', '隐藏最后几条消息，不发给模型', a => lastN(parseInt(a) || 1, m => { if (!m.hidden) turn.hide(m.id); })],
    ['unhide', '[条数]', '取消隐藏最后几条消息', a => lastN(parseInt(a) || 1, m => { if (m.hidden) turn.hide(m.id); })],
    ['persona', '<名字>', '切换到某个人设', a => { const p = S.personas.find(x => x.name === a.trim()) || S.personas.find(x => x.name.includes(a.trim())); if (p) { T.app.setPersona(p.id); toast('现在以 ' + p.name + ' 的身份写信'); } else toast('没有找到人设：' + a); }],
    ['char', '<名字>', '切换角色并开始新对话', async a => {
      try { const r = await bridge.request('char.list', {}); const L = (r && r.chars) || []; const c = L.find(x => x.name === a.trim()) || L.find(x => (x.name || '').includes(a.trim()));
        if (!c) { toast('没有找到角色：' + a); return; } const g = await bridge.request('char.get', { id: c.id }); T.chars.select((g && g.char) || c, true); } catch (e) { toast('切换失败'); } }],
    ['newchat', '', '开始一段新对话', () => bus.emit('nav', 'new')],
    ['summarize', '', '让模型总结这段对话（写进作者注释旁的「总结」）', () => T.plume.summarize(false)],
    ['echo', '<文字>', '弹一张小纸条（测试用）', a => toast(macros(a, ctx()))],
    ['help', '', '列出全部命令', () => toast(CMDS.map(c => '/' + c[0]).join('  '))]
  ];
  T.slashCommands = CMDS;

  /* 弹出列表 */
  const pop = document.createElement('div'); pop.className = 'slp'; pop.hidden = true; pop.setAttribute('role', 'listbox'); document.body.appendChild(pop);
  let items = [], sel = 0, mode = '', rng = null;
  function place() { const r = $('field').getBoundingClientRect(); pop.style.left = (r.left + 12) + 'px'; pop.style.bottom = (innerHeight - r.top + 8) + 'px'; pop.style.width = Math.min(460, r.width - 24) + 'px'; }
  function draw() {
    pop.innerHTML = `<div class="slp-hd">${mode === 'cmd' ? '<em>Commandes</em><b>命令</b>' : '<em>Macros</em><b>宏</b>'}<small>↑↓ 选择 · Tab 补全 · Esc 关闭</small></div>` +
      items.map((it, i) => `<button type="button" class="slp-it${i === sel ? ' on' : ''}" data-i="${i}" role="option"><b>${esc(it[0])}</b><span>${esc(it[1])}</span></button>`).join('');
    const on = pop.querySelector('.slp-it.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function update() {
    const v = ci.value, pos = ci.selectionStart;
    const before = v.slice(0, pos);
    const mm = before.match(/\{\{([^{}\s]*)$/);
    if (/^\/[a-z]*$/i.test(before) && pos === before.length) {
      const k = before.slice(1).toLowerCase(); mode = 'cmd'; rng = [0, pos];
      items = CMDS.filter(c => c[0].startsWith(k)).map(c => ['/' + c[0] + (c[1] ? ' ' + c[1] : ''), c[2], '/' + c[0] + (c[1] ? ' ' : '')]);
    } else if (mm) {
      const k = mm[1].toLowerCase(); mode = 'macro'; rng = [pos - mm[0].length, pos];
      items = MACRO_LIST.filter(x => x[0].slice(2).toLowerCase().startsWith(k)).map(x => [x[0], x[1], x[0]]);
    } else items = [];
    if (!items.length) { pop.hidden = true; return; }
    sel = Math.min(sel, items.length - 1); pop.hidden = false; place(); draw();
  }
  function accept(i) {
    const it = items[i]; if (!it) return;
    const v = ci.value, ins = it[2];
    let txt = ins;
    if (mode === 'macro' && /:/.test(ins)) txt = ins;     /* 带参数的宏原样插入，让用户改 */
    ci.value = v.slice(0, rng[0]) + txt + v.slice(rng[1]);
    const p = rng[0] + txt.length; ci.setSelectionRange(p, p); ci.dispatchEvent(new Event('input')); pop.hidden = true; ci.focus();
  }
  ci.addEventListener('input', () => { sel = 0; update(); });
  ci.addEventListener('click', update);
  ci.addEventListener('blur', () => setTimeout(() => { pop.hidden = true; }, 150));
  ci.addEventListener('keydown', e => {
    if (pop.hidden || e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); sel = (sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; draw(); }
    else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (mode === 'macro' || ci.value.trim().split(/\s/)[0] !== items[sel][2].trim()))) { e.preventDefault(); e.stopImmediatePropagation(); accept(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); pop.hidden = true; }
  }, true);
  pop.addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('.slp-it'); if (b) accept(+b.dataset.i); });
  addEventListener('resize', () => { if (!pop.hidden) place(); });

  /* 执行 */
  async function run(text) {
    const m = text.trim().match(/^\/([a-z]+)\s*([\s\S]*)$/i); if (!m) return false;
    const c = CMDS.find(x => x[0] === m[1].toLowerCase());
    if (!c) { toast('没有这个命令：/' + m[1] + '（输入 /help 看全部）'); return true; }
    try { await c[3](m[2] || ''); } catch (e) { toast('命令出错：' + (e.message || e)); }
    return true;
  }
  return { run };
})();
T.slash = slash;
