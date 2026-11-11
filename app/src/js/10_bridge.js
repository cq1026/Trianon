/* ===== 接口层 window.__trianon =====
   后端 → 前端：__trianon.emit(event, payload)
   前端 → 后端：__trianon.onRequest(handler)，handler(type, payload) 返回值或 Promise
   完整说明见 docs/BRIDGE.md。没有注册 handler 时自动使用内置的模拟后端（mock）。 */
const bridge = (() => {
  let handler = null, usingMock = false;
  const log = [];
  const api = {
    version: 1,
    emit(ev, payload) {
      log.push([Date.now(), 'in', ev]); if (log.length > 200) log.shift();
      bus.emit('be:' + ev, payload || {});
    },
    onRequest(fn) { handler = typeof fn === 'function' ? fn : null; usingMock = false; bus.emit('bridge:handler', !!handler); },
    get usingMock() { return usingMock || (!handler && !!(api.mock && api.mock.booted)); },
    get log() { return log.slice(); },
    mock: null,          /* 由 mock 模块填入 */
    state: null          /* 由 app 模块填入：只读的当前状态快照 */
  };
  /* 发请求给后端；没有后端时转给 mock */
  async function request(type, payload) {
    log.push([Date.now(), 'out', type]); if (log.length > 200) log.shift();
    let h = handler;
    if (!h && api.mock) { usingMock = true; h = api.mock.handle; }
    if (!h) throw new Error('no backend');
    return await h(type, payload || {});
  }
  window.__trianon = api;
  return { api, request };
})();
T.bridge = bridge;
