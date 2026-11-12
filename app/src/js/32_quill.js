/* ===== 羽毛笔：等待时写 waiting，出字时沿着行滑过去，字在笔尖后面洇出来 =====
   字本身是真的 DOM 文字（可选中、可复制），笔的动作是装出来的。
   平时看不见。生成开始时笔从这条回复右上角（推理框旁边）淡入，写 waiting；流式就接着写正文；
   写完（非流式是整段到齐时）沿原路回到右上角淡出。 */
const quill = (() => {
  const mk = cls => { const d = document.createElement('div'); d.className = 'qpen ' + cls; d.innerHTML = '<img alt="" src="asset:img/quill.webp">'; document.body.appendChild(d); return d; };
  const penSh = mk('sh'), pen = mk('main');
  const P = { x: 0, y: 0, h: 0, rot: -40, op: 0, w: 150, vis: false };
  const ek = (dt, tau) => 1 - Math.exp(-dt / tau);
  const sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const enabled = () => S.settings.anim !== false && !document.body.classList.contains('rm');
  const penW = () => innerWidth <= 760 ? 104 : 150;
  /* 笔进出的地方：这条回复气泡的右上角外侧（推理框就在气泡顶上） */
  const thread = document.getElementById('thread');
  /* 进来时记住这个点相对气泡左上角的位置，回去时回到同一个点（气泡后来变宽也不跟着跑） */
  let anchor = null;
  function homeOf(n) {
    const tr = thread.getBoundingClientRect();
    if (!n || !n.b || !n.b.isConnected) return { x: P.x + 40, y: P.y - 40 };
    const r = n.b.getBoundingClientRect();
    if (!anchor || anchor.n !== n) anchor = { n, dx: Math.min(innerWidth - 14, r.right + 56) - r.left, dy: -34 };
    return { x: Math.min(innerWidth - 14, r.left + anchor.dx), y: clamp(r.top + anchor.dy, tr.top + 6, tr.bottom - 20) };
  }

  /* ---------- 写入器：把文字逐字放进 DOM（先不可见），保持和 fmt() 一样的格式 ---------- */
  class Writer {
    constructor(el, o) { this.el = el; this.o = o; this.reset(); }
    reset() {
      this.el.textContent = ''; this.spans = []; this.src = []; this.ri = 0; this.fed = 0; this.mode = 'glide'; this.x = null; this.y = 0; this.ph = 0;
      this.halted = false; this.wind = false; this.star = false; this.nl = 0; this.act = null; this.say = null; this.bold = null; this.p = null;
    }
    para() { if (this.o.plain) return this.el; if (!this.p) { this.p = document.createElement('p'); this.el.appendChild(this.p); } return this.p; }
    box() { return this.bold || this.say || this.act || this.para(); }
    open(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; (this.say || this.act || this.para()).appendChild(e); return e; }
    put(ch, si) { const sp = document.createElement('span'); sp.className = 'ch'; sp.textContent = ch; this.box().appendChild(sp); this.spans.push(sp); this.src.push(si); }
    feed(text) {
      if (this.halted) return;
      for (let i = this.fed; i < text.length; i++) this.char(text[i], i);
      this.fed = text.length;
    }
    char(ch, i) {
      if (this.o.plain) { if (ch === '\n') this.el.appendChild(document.createElement('br')); else this.put(ch, i); return; }
      if (this.star) {                                   /* 上一个是 *：看这一个决定是粗体还是动作 */
        this.star = false;
        if (ch === '*') { if (this.bold) this.bold = null; else this.bold = this.open('b'); return; }
        if (this.act) { this.act = null; this.say = null; } else this.act = this.open('i', 'act');
      }
      if (ch === '*') { this.star = true; return; }
      if (ch === '\n') { this.nl++; return; }
      if (this.nl) {
        if (this.nl >= 2) { this.p = null; this.act = this.say = this.bold = null; }
        else this.box().appendChild(document.createElement('br'));
        this.nl = 0;
      }
      const openQ = ch === '“' || ch === '「' || (ch === '"' && !this.say), closeQ = ch === '”' || ch === '」' || (ch === '"' && this.say);
      if (openQ && !this.say) { this.say = this.open('q', 'say'); this.put(ch, i); return; }
      this.put(ch, i);
      if (closeQ && this.say) this.say = null;
    }
    backlog() { return this.spans.length - this.ri; }
    idle() { return this.ri >= this.spans.length; }
    reveal() { this.spans[this.ri++].classList.add('on'); if (this.wind) this.halt(); }
    revealedText(full) { if (!this.ri) return ''; return full.slice(0, this.src[this.ri - 1] + 1); }
    /* 推进 dt 秒，返回笔的姿态；没有可写的字时返回 null */
    step(dt, m, Pp) {
      if (this.halted || this.idle()) return null;
      if (this.wind) m = Math.max(m, 3);
      if (this.x === null) { this.x = Pp.x; this.y = Pp.y; }
      const fs = this.o.fs;
      for (let g = 0; g < 200 && dt > 1e-6; g++) {
        if (this.halted || this.idle()) break;
        const sp = this.spans[this.ri];
        if (/\s/.test(sp.textContent)) { this.reveal(); continue; }
        const r = sp.getBoundingClientRect(), ly = r.top + r.height * .62;
        if (this.mode === 'glide' && (Math.abs(this.y - ly) > r.height * .45 || this.x > r.right + 2)) {
          this.j = { fx: this.x, fy: this.y, t: 0, d: .14 + Math.hypot(r.left - this.x, ly - this.y) / (fs * 55) }; this.mode = 'jump';
        }
        if (this.mode === 'jump') {
          const j = this.j, need = (j.d - j.t) / m;
          if (dt < need) { j.t += dt * m; dt = 0; } else { dt -= need; j.t = j.d; }
          const u = j.t / j.d; this.x = lerp(j.fx, r.left + 1, sm(u)); this.y = lerp(j.fy, ly, sm(u));
          if (u >= 1) this.mode = 'glide'; else return { x: this.x, y: this.y, h: .1 + .9 * Math.sin(Math.PI * u), wob: 0 };
          continue;
        }
        this.y = ly;
        const tx = r.left + r.width * .72, v = this.o.v * m, dist = tx - this.x;
        if (dist <= v * dt) { this.x = Math.max(this.x, tx); dt -= Math.max(0, dist) / v; this.ph += Math.max(0, dist) * .32; this.reveal(); }
        else { this.x += v * dt; this.ph += v * dt * .32; dt = 0; }
      }
      return { x: this.x, y: this.y + (motionK() < 1 ? .55 : 1.1) * Math.sin(this.ph), h: .06, wob: Math.sin(this.ph * .7) };
    }
    hover() {
      const s = this.spans[this.ri - 1];
      if (!s) { const r = this.el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + this.o.fs * 1.1 }; }
      const r = s.getBoundingClientRect(); return { x: r.right + 4, y: r.top + r.height * .62 };
    }
    start() { const r = this.el.getBoundingClientRect(); return { x: r.left + 4, y: r.top + this.o.fs * 1.1 }; }
    halt() { for (const sp of this.spans.splice(this.ri)) sp.remove(); this.src.length = this.ri; this.halted = true; this.wind = false; }
    flush() { while (!this.idle()) this.spans[this.ri++].classList.add('on'); this.x = null; }
  }

  /* ---------- 每条进行中的助手消息一个会话 ---------- */
  const L = new Map();       /* msgId -> { m, n, main, rw, wait, wph, wt } */
  let cur = null;             /* 笔现在服务的那条 */
  const fsOf = el => parseFloat(getComputedStyle(el).fontSize) || 14.5;

  function session(m, n) {
    let s = L.get(m.id);
    if (s) { s.n = n; return s; }
    const wait = document.createElement('p'); wait.className = 'qwait'; wait.setAttribute('aria-hidden', 'true');
    n.b.appendChild(wait);
    const fs = fsOf(n.tx);
    s = { m, n, wph: 'write', wt: 0,
      main: new Writer(n.tx, { fs, v: fs * 4.2 }),
      rw: new Writer(n.rsnB, { fs: 14, v: 14 * 5, plain: true }),
      wait: new Writer(wait, { fs: 22, v: 58, plain: true }), waitEl: wait };
    s.wait.feed('waiting');
    if (m.contBase) {            /* 续写：已有的字直接显示，笔停在末尾等，不写 waiting */
      s.main.feed(turn.disp(m, m.text.slice(0, m.contBase))); s.main.flush(); s.cont = true; s.wph = 'gone'; wait.classList.add('fade');
    }
    L.set(m.id, s); cur = s;
    return s;
  }
  function end(s, how) {
    if (!s) return;
    if (how === 'flush') { s.main.flush(); }
    s.waitEl.remove();
    L.delete(s.m.id); if (cur === s) cur = null;
    if (P.vis && !L.size) leave = { n: s.n, t: now() };       /* 笔沿原路回到右上角淡出 */
    bus.emit('ui:quill-end', s.m);
  }

  /* 聊天区每次重绘时调用：返回 true 表示正文由笔来写，聊天区不要直接填 innerHTML */
  function sync(m, n) {
    const live = ['pending', 'reasoning', 'streaming'].includes(m.state);
    let s = L.get(m.id);
    if (!enabled()) { if (s) end(s, 'flush'); return false; }
    if (!s && !live) return false;
    if (!s) s = session(m, n);
    if (s.n !== n) { s.n = n; }
    /* 非流式：一次到齐的全文不写，直接整段淡入 */
    if (!live && !s.main.spans.length && m.text && (m.state === 'done')) { end(s); n.tx.classList.add('fadein'); return false; }
    if (m.state === 'streaming' || m.state === 'done' || m.state === 'stopped' || m.state === 'error') s.main.feed(turn.disp(m));
    if (m.reasoning) { s.rw.feed(m.reasoning); if (!n.rsn.classList.contains('open') || m.state !== 'reasoning') s.rw.flush(); }
    if (m.state === 'stopped' && !s.stopped) { s.stopped = true; if (s.main.idle()) s.main.halt(); else s.main.wind = true; }
    if (m.state === 'error' && !s.err) { s.err = true; s.main.halt(); }
    return true;
  }
  /* 写完（或被停住）之后：把截断后的文字写回消息，交还给聊天区按普通方式显示 */
  function finished(s) {
    const m = s.m;
    if (s.main.halted || m.state === 'stopped' || m.state === 'error') { m.text = s.main.revealedText(turn.disp(m)); if (m.swipes) m.swipes[m.sid].text = m.text; turn.save(); }
    end(s); bus.emit('ui:msg', m); bus.emit('ui:turn');
  }
  const writing = () => [...L.values()].some(s => !s.main.idle() || ['pending', 'reasoning', 'streaming'].includes(s.m.state));
  function skip() { for (const s of [...L.values()]) { s.main.flush(); if (!['pending', 'reasoning', 'streaming'].includes(s.m.state)) finished(s); } }

  /* ---------- 每帧：决定笔在干什么 ---------- */
  let last = now(), leave = null;
  const mult = w => clamp(1 + w.backlog() * .07, 1, 5);
  function frame() {
    const t = now(), dt = Math.min(.1, t - last); last = t;
    const on = enabled();
    let pose = null, target = null, rotT = -56, hT = .3, want = 0;
    const s = cur && L.has(cur.m.id) ? cur : [...L.values()].pop() || null;
    if (on && s) {
      want = 1; leave = null;
      if (!P.vis) {            /* 刚开始：笔先出现在右上角，再滑过去 */
        anchor = null; const h = homeOf(s.n); Object.assign(P, { x: h.x + 14, y: h.y - 12, h: .7, rot: -40, op: 0, w: penW(), vis: true, t0: t });
        [...L.values()].forEach(x => { x.main.x = x.rw.x = x.wait.x = null; });
      }
      const m = s.m, live = ['pending', 'reasoning', 'streaming'].includes(m.state);
      const hasMain = s.main.spans.length > (s.cont ? s.main.ri : 0) || (s.cont && m.state === 'streaming');
      const rsnOpen = s.n.rsn && s.n.rsn.classList.contains('open') && m.reasoning;
      if (t - P.t0 < .55) {     /* 先在右上角浮现一下，再过去写 */
        const h = homeOf(s.n); target = { x: h.x, y: h.y }; hT = .7; rotT = -40;
      } else if (hasMain || m.state === 'streaming') {
        /* 写正文：先让 waiting 淡掉 */
        if (s.wph !== 'gone') { s.waitEl.classList.add('fade'); s.wph = 'gone'; s.gone = t; }
        if (t - (s.gone || 0) > .3) pose = s.main.step(dt, mult(s.main), P);
        if (!pose) target = s.main.hover();
        if (!live && s.main.idle() && !s.main.wind) finished(s);
        else if (s.main.halted) finished(s);
      } else if (live && rsnOpen && !s.rw.idle()) {
        if (s.wph !== 'gone') { s.waitEl.classList.add('fade'); s.wph = 'gone'; s.gone = t; }
        if (t - (s.gone || 0) > .3) pose = s.rw.step(dt, mult(s.rw), P);
        if (!pose) target = s.rw.hover();
      } else if (live && s.cont) { target = s.main.hover(); hT = .45;
      } else if (live) {
        /* waiting 循环：写 → 停一下 → 淡出 → 再写 */
        if (s.wph === 'gone') { s.wph = 'write'; s.wait.reset(); s.waitEl.classList.remove('fade'); s.wait.feed('waiting'); }
        if (s.wph === 'write') { pose = s.wait.step(dt, 1, P); if (!pose && s.wait.idle()) { s.wph = 'hold'; s.wt = 0; } }
        else if (s.wph === 'hold') { s.wt += dt; target = s.wait.hover(); hT = .5; if (s.wt > .9) { s.waitEl.classList.add('fade'); s.wph = 'fade'; s.wt = 0; } }
        else if (s.wph === 'fade') { s.wt += dt; target = s.wait.start(); hT = .55; if (s.wt > .6) { s.wait.reset(); s.waitEl.classList.remove('fade'); s.wait.feed('waiting'); s.wph = 'write'; } }
        if (!pose && !target) target = s.wait.hover();
      } else finished(s);
    }
    const mk = motionK() < 1 ? .5 : 1;     /* 柔和：笔尖起伏和抬笔高度减半 */
    if (pose) { P.mode = 'work'; P.x = pose.x; P.y = pose.y; P.h += (pose.h * mk - P.h) * ek(dt, .04); rotT = -56 + 2.2 * pose.wob * mk; }
    else if (target && on) {
      P.mode = 'work'; const k = ek(dt, .2);
      P.x += (target.x - P.x) * k; P.y += (target.y - P.y) * k; P.h += (hT - P.h) * k;
      [...L.values()].forEach(x => { x.main.x = x.rw.x = x.wait.x = null; });
    } else if (leave && on && P.vis) {
      /* 回去：朝右上角滑，越近越淡，到了就收起 */
      const h = homeOf(leave.n), k = ek(dt, .16), el = t - leave.t;
      P.x += (h.x - P.x) * k; P.y += (h.y - P.y) * k; P.h += (.7 - P.h) * k; rotT = -40;
      const d = Math.hypot(h.x - P.x, h.y - P.y);
      want = Math.min(clamp(d / 70, 0, 1), clamp((1.3 - el) / .5, 0, 1));
      if (P.op < .02 && el > .2) { leave = null; P.vis = false; }
    } else { P.vis = P.vis && P.op > .02; leave = null; }
    P.rot += (rotT - P.rot) * ek(dt, pose ? .06 : .2);
    if (document.body.classList.contains('st-open') || !on) want = 0;
    P.op += (want - P.op) * ek(dt, want < P.op && leave ? .08 : .2);
    if (!want && P.op < .02) P.vis = !!(on && s);
    const tr = (x, y) => `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${P.rot.toFixed(2)}deg)`;
    pen.style.transform = tr(P.x, P.y - P.h * 9); penSh.style.transform = tr(P.x + 2 + P.h * 7, P.y + 3 + P.h * 6);
    pen.style.opacity = penSh.style.opacity = P.op.toFixed(3);
    pen.style.setProperty('--qw', P.w + 'px'); penSh.style.setProperty('--qw', P.w + 'px');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { sync, writing, skip, enabled, sessions: L };
})();
T.quill = quill;
