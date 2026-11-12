/* ===== 吊牌侧栏 =====
   桌面：鼠标靠到左边缘时吊牌落下；手机：左上角的小蝴蝶结按钮打开。 */
const rail = (() => {
  const R = $('rail'), edge = $('edge'), btn = $('railBtn'), b = document.body;
  const ITEMS = [
    [{ k: 'new', fr: 'Nouveau', zh: '新的对话', img: 'asset:img/tag_bow.png' },
     { k: 'history', fr: 'Mémoire', zh: '聊天记录', img: 'asset:img/tag_notes.png' },
     { k: 'chars', fr: 'Personnages', zh: '角色', img: 'asset:img/tag_cameo.png' },
     { k: 'lore', fr: 'Grimoire', zh: '世界书', img: 'asset:img/tag_rose.png' },
     { k: 'gen', fr: 'Plume', zh: '生成参数', img: 'asset:img/tag_inkwell.png' },
     { k: 'look', fr: 'Parure', zh: '外观', img: 'asset:img/tag_fan.png' }],
    [{ k: 'persona', fr: 'Persona', zh: '人设', img: 'asset:img/tag_heartkey.png' },
     { k: 'settings', fr: 'Réglages', zh: '设置', img: 'asset:img/tag_harp.png' }]
  ];
  const grps = R.querySelectorAll('.grp');
  let i = 0;
  ITEMS.forEach((g, gi) => g.forEach(it => {
    const d = document.createElement('div');
    d.className = 'it'; d.tabIndex = 0; d.setAttribute('role', 'button'); d.dataset.k = it.k;
    d.setAttribute('aria-label', it.zh);
    d.style.cssText = `--i:${i};z-index:${30 - i};--up:${[-30, -34, -38][i % 3]}px`;
    d.innerHTML = `<b class="tgw"><img class="tg" src="${it.img}" alt="" draggable="false"></b><span><em>${it.fr}</em>${it.zh}<i class="lb"></i><i class="xs">✕<b style="font-size:4px">●</b>✕</i></span>`;
    grps[gi].appendChild(d); i++;
  }));
  /* 悬停说明：原版用一张浮动的纸签（.it.ttip），跟着鼠标所在的吊牌移动 */
  const tip = document.createElement('div'); tip.className = 'it ttip'; tip.setAttribute('aria-hidden', 'true'); tip.innerHTML = '<span></span>';
  R.appendChild(tip);
  const tipS = tip.firstChild;
  const showTip = it => {
    if (!it || it === tip) { tipS.style.opacity = 0; tipS.style.transform = 'translate(-4px,-50%) scale(.965)'; return; }
    tipS.innerHTML = it.querySelector('span').innerHTML;
    const r = it.getBoundingClientRect(), rr = R.getBoundingClientRect();
    tip.style.setProperty('--ty', (r.top - rr.top) + 'px');
    tipS.style.transition = motionK() < 1 ? 'opacity .13s, transform .3s cubic-bezier(.22,1,.36,1)' : 'opacity .18s, transform .42s cubic-bezier(.18,1.5,.3,1)';
    tipS.style.opacity = 1; tipS.style.transform = 'translate(0,-50%) scale(1)';
  };
  R.addEventListener('mouseover', e => showTip(e.target.closest('.it')));
  R.addEventListener('focusin', e => showTip(e.target.closest('.it')));
  R.addEventListener('mouseleave', () => showTip(null));
  const label = k => { for (const g of ITEMS) for (const it of g) if (it.k === k) return it; return null; };

  let tClose = 0;
  const open = v => { clearTimeout(tClose); b.classList.toggle('rail-open', v); btn.setAttribute('aria-expanded', String(v)); };
  const mobile = () => matchMedia('(max-width: 760px)').matches;
  edge.addEventListener('mouseenter', () => { if (!mobile()) open(true); });
  R.addEventListener('mouseenter', () => clearTimeout(tClose));
  R.addEventListener('mouseleave', () => { if (!mobile()) tClose = setTimeout(() => open(false), 380); });
  btn.addEventListener('click', e => { e.stopPropagation(); open(!b.classList.contains('rail-open')); });
  document.addEventListener('pointerdown', e => { if (b.classList.contains('rail-open') && !R.contains(e.target) && e.target !== btn && !btn.contains(e.target) && !edge.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && b.classList.contains('rail-open') && !busy()) open(false); });

  const act = k => { bus.emit('nav', k); if (mobile()) open(false); };
  R.addEventListener('click', e => { const it = e.target.closest('.it'); if (it) act(it.dataset.k); });
  R.addEventListener('keydown', e => { const it = e.target.closest('.it'); if (it && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act(it.dataset.k); } });

  return { open, label };
})();
