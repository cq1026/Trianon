/* ===== 羽毛笔：等待时写 waiting，出字时沿着行滑过去，字在笔尖后面洇出来 =====
   字本身是真的 DOM 文字（可选中、可复制），笔的动作是装出来的。
   平时笔就是输入栏右上角那支装饰羽毛笔；生成开始时它被拿起来，写完放回去。 */
const quill = (() => {
  const PEN_TIP = [1 / 600, 110 / 200];          /* 图片里笔尖的位置（按宽高比例） */
  const decor = document.querySelector('.field .fbow.quill');
  const mk = cls => { const d = document.createElement('div'); d.className = 'qpen ' + cls; d.innerHTML = `<img alt="" src="${decor.getAttribute('src')}">`; document.body.appendChild(d); return d; };
  const penSh = mk('sh'), pen = mk('main');
  const P = { x: 0, y: 0, h: 0, rot: -24, op: 0, w: 150, mode: 'rest' };
  const ek = (dt, tau) => 1 - Math.exp(-dt / tau);
  const sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const enabled = () => S.settings.anim !== false && !document.body.classList.contains('rm');

  /* 平时的位置：和装饰羽毛笔完全重合（用它的布局框和旋转角算笔尖） */
  function restPose() {
    const f = decor.offsetParent, fr = f.getBoundingClientRect();
    const w = decor.offsetWidth, h = decor.offsetHeight;
    const m = new DOMMatrixReadOnly(getComputedStyle(decor).transform === 'none' ? undefined : getComputedStyle(decor).transform);
    const rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
    const ox = fr.left + decor.offsetLeft, oy = fr.top + decor.offsetTop + h / 2;       /* transform-origin: 0 50% */
    const tx = w * PEN_TIP[0], ty = h * PEN_TIP[1] - h / 2, a = rot * Math.PI / 180;
    return { x: ox + tx * Math.cos(a) - ty * Math.sin(a), y: oy + tx * Math.sin(a) + ty * Math.cos(a), rot, w };
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
      return { x: this.x, y: this.y + 1.1 * Math.sin(this.ph), h: .06, wob: Math.sin(this.ph * .7) };
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
    L.set(m.id, s); cur = s;
    return s;
  }
  function end(s, how) {
    if (!s) return;
    if (how === 'flush') { s.main.flush(); }
    s.waitEl.remove();
    L.delete(s.m.id); if (cur === s) cur = null;
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
    if (m.state === 'streaming' || m.state === 'done' || m.state === 'stopped' || m.state === 'error') s.main.feed(m.text || '');
    if (m.reasoning) { s.rw.feed(m.reasoning); if (!n.rsn.classList.contains('open') || m.state !== 'reasoning') s.rw.flush(); }
    if (m.state === 'stopped' && !s.stopped) { s.stopped = true; if (s.main.idle()) s.main.halt(); else s.main.wind = true; }
    if (m.state === 'error' && !s.err) { s.err = true; s.main.halt(); }
    return true;
  }
  /* 写完（或被停住）之后：把截断后的文字写回消息，交还给聊天区按普通方式显示 */
  function finished(s) {
    const m = s.m;
    if (s.main.halted || m.state === 'stopped' || m.state === 'error') m.text = s.main.revealedText(m.text);
    end(s); bus.emit('ui:msg', m); bus.emit('ui:turn');
  }
  const writing = () => [...L.values()].some(s => !s.main.idle() || ['pending', 'reasoning', 'streaming'].includes(s.m.state));
  function skip() { for (const s of [...L.values()]) { s.main.flush(); if (!['pending', 'reasoning', 'streaming'].includes(s.m.state)) finished(s); } }

  /* ---------- 每帧：决定笔在干什么 ---------- */
  let last = now();
  const mult = w => clamp(1 + w.backlog() * .07, 1, 5);
  function frame() {
    const t = now(), dt = Math.min(.1, t - last); last = t;
    const on = enabled();
    decor.style.visibility = on ? 'hidden' : '';
    let pose = null, target = null, rotT = -56, hT = .3;
    const s = cur && L.has(cur.m.id) ? cur : [...L.values()].pop() || null;
    if (on && s) {
      const m = s.m, live = ['pending', 'reasoning', 'streaming'].includes(m.state);
      const hasMain = s.main.spans.length > 0;
      const rsnOpen = s.n.rsn && s.n.rsn.classList.contains('open') && m.reasoning;
      if (hasMain || m.state === 'streaming') {
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
      } else if (live) {
        /* waiting 循环：写 → 停一下 → 淡出 → 再写 */
        if (s.wph === 'gone') { s.wph = 'write'; s.wait.reset(); s.waitEl.classList.remove('fade'); s.wait.feed('waiting'); }
        if (s.wph === 'write') { pose = s.wait.step(dt, 1, P); if (!pose && s.wait.idle()) { s.wph = 'hold'; s.wt = 0; } }
        else if (s.wph === 'hold') { s.wt += dt; target = s.wait.hover(); hT = .5; if (s.wt > .9) { s.waitEl.classList.add('fade'); s.wph = 'fade'; s.wt = 0; } }
        else if (s.wph === 'fade') { s.wt += dt; target = s.wait.start(); hT = .55; if (s.wt > .6) { s.wait.reset(); s.waitEl.classList.remove('fade'); s.wait.feed('waiting'); s.wph = 'write'; } }
        if (!pose && !target) target = s.wait.hover();
      } else if (m.state === 'error') { target = { x: P.x, y: P.y }; hT = .35; rotT = -48; }
      else finished(s);
    }
    if (pose) { P.mode = 'work'; P.x = pose.x; P.y = pose.y; P.h += (pose.h - P.h) * ek(dt, .04); rotT = -56 + 2.2 * pose.wob; }
    else if (target && on) {
      P.mode = 'work'; const k = ek(dt, .2);
      P.x += (target.x - P.x) * k; P.y += (target.y - P.y) * k; P.h += (hT - P.h) * k;
      [...L.values()].forEach(x => { x.main.x = x.rw.x = x.wait.x = null; });
    } else {
      P.mode = 'rest'; const g = restPose(), k = ek(dt, .22);
      P.x += (g.x - P.x) * k; P.y += (g.y - P.y) * k; P.h += (0 - P.h) * k; rotT = g.rot; P.w = g.w;
    }
    P.rot += (rotT - P.rot) * ek(dt, pose ? .06 : .2);
    P.op += ((on && !document.body.classList.contains('st-open') ? 1 : 0) - P.op) * ek(dt, .2);
    const tr = (x, y) => `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${P.rot.toFixed(2)}deg)`;
    pen.style.transform = tr(P.x, P.y - P.h * 9); penSh.style.transform = tr(P.x + 2 + P.h * 7, P.y + 3 + P.h * 6);
    pen.style.opacity = penSh.style.opacity = P.op.toFixed(3);
    pen.style.setProperty('--qw', P.w + 'px'); penSh.style.setProperty('--qw', P.w + 'px');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(() => { const g = restPose(); Object.assign(P, g); frame(); });

  return { sync, writing, skip, enabled, sessions: L };
})();
T.quill = quill;
