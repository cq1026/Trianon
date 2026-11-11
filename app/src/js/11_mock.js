/* ===== 模拟后端：没接真实后端时演示用 =====
   行为与 docs/BRIDGE.md 一致：收到 chat.send 后按 turnId 依次发 turn.start → (turn.reasoning…) → turn.delta… → turn.done。
   调试：__trianon.mock.set({ delay: 9, failNext: true, reasoning: false, cps: 30 }) */
(() => {
  const emit = (ev, p) => bridge.api.emit(ev, p);
  const opt = { delay: 1.6, cps: 16, reasoning: true, failNext: false };
  const timers = new Map();      /* turnId -> 定时器句柄列表 */
  const later = (id, s, fn) => { const h = setTimeout(fn, s * 1000); (timers.get(id) || timers.set(id, []).get(id)).push(h); };
  const clear = id => { (timers.get(id) || []).forEach(clearTimeout); timers.delete(id); };

  const CHAR = { id: 'marguerite', name: 'Marguerite', greeting: '*把一封信压在镇纸下，抬眼看你。*\n你来了。今天想去花园走走，还是留在屋里喝茶？' };
  const REPLIES = [
    '*合上手里的书，指尖在书脊上停了一下。*\n“玫瑰园在宫殿东侧，沿着碎石小径一直走下去就到了。六月初开得最盛。”\n\n清晨常有薄雾，花瓣上带着水，香气比正午浓上一倍。若你愿意，明早我陪你去走一趟。',
    '*她把茶杯往你那边推了推，杯沿还冒着热气。*\n“先喝点热的。外头的风比看起来要冷。”\n\n你说的那件事，我想了一夜。也许答案不在信里，而在写信的人身上。',
    '*窗外的雾慢慢散开，她起身拉开半边窗帘。*\n“你看，湖面亮起来了。”\n\n我小时候常在这里等人。等到后来，倒忘了自己在等谁，只记得湖上的光。'
  ];
  const THINK = ['先接住对方的话。', '语气放软一点，', '带一点花园和雾的意象，', '最后留个邀请。'];
  let k = 0;

  function run(turnId, payload) {
    if (opt.failNext) { opt.failNext = false; later(turnId, opt.delay + .6, () => emit('turn.error', { turnId, message: '连接中断（模拟）' })); return; }
    const text = payload.regenerate ? REPLIES[(k++ + 1) % REPLIES.length] : REPLIES[k++ % REPLIES.length];
    const stream = payload.stream !== false;
    let t = opt.delay;
    if (opt.reasoning && stream) {
      for (const piece of THINK) { const tt = t; later(turnId, tt, () => emit('turn.reasoning', { turnId, delta: piece })); t += .55; }
      t += .3;
    }
    if (!stream) {
      later(turnId, t + 2.2, () => { emit('turn.done', { turnId, text, reasoning: opt.reasoning ? THINK.join('') : '' }); clear(turnId); });
      return;
    }
    let i = 0;
    const step = () => {
      if (i >= text.length) { emit('turn.done', { turnId }); clear(turnId); return; }
      const n = 1 + (Math.random() * 3 | 0);
      emit('turn.delta', { turnId, delta: text.slice(i, i + n) }); i += n;
      later(turnId, n / opt.cps * (.6 + Math.random() * .8), step);
    };
    later(turnId, t, step);
  }

  const mock = {
    opt,
    set(o) { Object.assign(opt, o || {}); return opt; },
    boot() {
      emit('conn.state', { state: 'connecting' });
      setTimeout(() => {
        emit('conn.state', { state: 'ready' });
        emit('caps', { streaming: true, reasoning: true, stop: true, regenerate: true });
        emit('model', { name: 'Mock · 演示' });
        emit('character', CHAR);
      }, 350);
    },
    disconnect() { emit('conn.state', { state: 'reconnecting', attempt: 1, retryIn: 3 }); setTimeout(() => emit('conn.state', { state: 'ready' }), 3000); },
    async handle(type, p) {
      switch (type) {
        case 'chat.send': emit('turn.start', { turnId: p.turnId }); run(p.turnId, p); return { ok: true };
        case 'turn.regenerate': emit('turn.start', { turnId: p.turnId }); run(p.turnId, Object.assign({}, p, { regenerate: true })); return { ok: true };
        case 'turn.stop': clear(p.turnId); setTimeout(() => emit('turn.stopped', { turnId: p.turnId }), 60); return { ok: true };
        case 'chat.new': return { ok: true, chatId: uid('chat') };
        case 'settings.update': return { ok: true };
        default: return { ok: false, error: 'unsupported: ' + type };
      }
    }
  };
  bridge.api.mock = mock;
})();
