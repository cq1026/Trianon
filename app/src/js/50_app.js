/* ===== 页面切换、顶栏、空白页、启动 ===== */
(() => {
  const b = document.body;
  const views = { empty: $('vEmpty'), chat: $('vChat') };
  function show(v) {
    for (const k in views) views[k].classList.toggle('on', k === v);
    b.classList.toggle('v-empty', v === 'empty'); b.classList.toggle('v-chat', v === 'chat');
  }
  bus.on('ui:chat', () => show(S.chat.messages.length ? 'chat' : 'empty'));

  /* 空白页问候：按当地时间问好，名字用当前人设 */
  function greet() {
    const H = new Date().getHours();
    const hi = H < 5 ? 'Bonne nuit,' : H < 12 ? 'Bonjour,' : H < 18 ? 'Bon après-midi,' : 'Bonsoir,';
    $('gHi').innerHTML = `${hi} <b>${esc(persona().name || '')}</b>`;
    $('gSub').textContent = S.char.name ? `${S.char.name} 在等你的信` : '';
  }
  bus.on('ui:char', () => { greet(); topbar(); bus.emit('ui:chat'); });
  bus.on('ui:persona', greet);

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
  bus.on('nav', k => { if (k === 'new') newChat(); else toastSoon(k); });

  /* 启动：给真实后端一个注册的机会；500ms 内没人接手就用模拟后端 */
  greet(); topbar(); show('empty');
  b.classList.toggle('rm', RMQ.matches || S.settings.reducedMotion);
  let real = false;
  bus.on('bridge:handler', v => { real = v; if (v) bridge.request('frontend.hello', { version: bridge.api.version }).catch(() => {}); });
  setTimeout(() => { if (!real && !window.__trianonNoMock) bridge.api.mock.boot(); }, 500);
  bus.emit('ready');
  /* 后端可以提前定义 window.__trianonInit(api)，或监听 trianon:ready 事件 */
  if (typeof window.__trianonInit === 'function') { try { window.__trianonInit(bridge.api); } catch (e) { console.error(e); } }
  dispatchEvent(new CustomEvent('trianon:ready', { detail: bridge.api }));
})();
