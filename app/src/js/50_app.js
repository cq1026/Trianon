/* ===== 页面切换、顶栏、空白页、启动 ===== */
(() => {
  const b = document.body;
  const views = { empty: $('vEmpty'), chat: $('vChat') };
  let cur = 'empty', tOut = 0;
  function show(v) {
    if (v === cur) return;
    const from = cur; cur = v;
    if (from === 'empty' && v === 'chat') {
      /* 原版的离场：盖「Envoyé」章，拼贴向两边散开 */
      window.__emptyExit && window.__emptyExit();
      views.empty.classList.add('out'); clearTimeout(tOut);
      tOut = setTimeout(() => views.empty.classList.remove('out'), RMQ.matches ? 0 : 720);
    }
    if (v === 'empty') { views.empty.classList.remove('out'); window.__v11restart && window.__v11restart(); }
    for (const k in views) views[k].classList.toggle('on', k === v);
    b.classList.toggle('v-empty', v === 'empty'); b.classList.toggle('v-chat', v === 'chat');
  }
  bus.on('ui:chat', () => show(S.chat.messages.length ? 'chat' : 'empty'));

  /* 空白页：问候里的名字用当前人设；三张快捷标签 */
  function greet() {
    window.__emptyNameNow = persona().name || '';
    window.__emptyName && window.__emptyName(window.__emptyNameNow);
  }
  bus.on('ui:persona', greet);
  const inv = $('invite');
  const zoomEmpty = () => {
    const w = views.empty.clientWidth, h = views.empty.clientHeight;
    const z = Math.min(1, (w - 12) / 700, (h - 40) / 600);
    inv.style.zoom = z < .995 ? z.toFixed(3) : '';
  };
  new ResizeObserver(zoomEmpty).observe(views.empty);
  views.empty.addEventListener('click', e => {
    const t = e.target.closest('.tag'); if (!t) return;
    if (t.classList.contains('t1')) $('ci').focus();
    else if (t.classList.contains('t2')) bus.emit('nav', 'chars');
    else if (t.classList.contains('t3')) turn.send('随便聊聊吧。');
  });

  /* 顶栏：角色名 + 连接状态（只在未连上时出现） */
  const CONN = { connecting: '正在连接…', reconnecting: '连接断开，正在重连', failed: '连接失败', ready: '' };
  function topbar() {
    $('tbChar').textContent = S.char.name || '';
    const c = S.conn.state, tx = CONN[c] == null ? c : CONN[c];
    const el = $('tbConn');
    el.hidden = !tx; el.dataset.state = c;
    $('tbConnTx').textContent = tx + (c === 'reconnecting' && S.conn.retryIn ? `（${S.conn.retryIn} 秒后重试）` : '');
  }
  bus.on('ui:conn', topbar);

  /* 还没做的页面：一张小纸条 */
  const soon = $('soon'); let tSoon = 0;
  function toastSoon(k) {
    const it = rail.label(k);
    $('soonFr').textContent = it ? it.fr : ''; $('soonTx').textContent = (it ? it.zh : '') + ' · 即将推出';
    soon.classList.add('on'); clearTimeout(tSoon); tSoon = setTimeout(() => soon.classList.remove('on'), 1800);
  }

  async function newChat() {
    if (busy()) turn.stop();
    let id = uid('chat');
    try { const r = await bridge.request('chat.new', { characterId: S.char.id }); if (r && r.chatId) id = r.chatId; } catch (e) { }
    S.chat = { id, messages: [], started: false }; S.turn = null;
    bus.emit('ui:chat'); bus.emit('ui:turn'); $('ci').focus();
  }
  bus.on('nav', k => {
    const ST = T.settings;
    if (k === 'new') newChat();
    else if (k === 'persona' && ST) ST.open('persona');
    else if (k === 'look' && ST) ST.open('appearance');
    else if (k === 'settings' && ST) ST.open(ST.S.lastSec || 'persona');
    else toastSoon(k);
  });

  /* 设置生效：字号、密度、动效、贴纸 */
  function applySettings() {
    const A = S.settings.appearance || {};
    root.style.setProperty('--fs', (A.fontSize || 14.5) + 'px');
    b.dataset.density = A.density || 'standard';
    b.classList.toggle('rm', RMQ.matches || A.motion === 'reduce');
    b.classList.toggle('soft', A.motion === 'soft');
    b.classList.toggle('nost', A.stickers === false);
  }
  const root = document.documentElement;
  bus.on('ui:settings', applySettings); applySettings();

  /* 启动：给真实后端一个注册的机会；500ms 内没人接手就用模拟后端 */
  greet(); topbar();
  let real = false;
  bus.on('bridge:handler', v => { real = v; if (v) bridge.request('frontend.hello', { version: bridge.api.version }).catch(() => {}); });
  setTimeout(() => { if (!real && !window.__trianonNoMock) bridge.api.mock.boot(); }, 500);
  bus.emit('ready');
  /* 后端可以提前定义 window.__trianonInit(api)，或监听 trianon:ready 事件 */
  if (typeof window.__trianonInit === 'function') { try { window.__trianonInit(bridge.api); } catch (e) { console.error(e); } }
  dispatchEvent(new CustomEvent('trianon:ready', { detail: bridge.api }));
})();
