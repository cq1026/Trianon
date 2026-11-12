/* ===== 工具与全局命名空间 ===== */
const T = window.Trianon = window.Trianon || {};
const $ = id => document.getElementById(id);
const now = () => performance.now() / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = p => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const RMQ = matchMedia('(prefers-reduced-motion: reduce)');

/* 小型事件总线：界面各部分只通过它通信 */
const bus = (() => {
  const m = new Map();
  return {
    on(ev, fn) { if (!m.has(ev)) m.set(ev, new Set()); m.get(ev).add(fn); return () => m.get(ev).delete(fn); },
    emit(ev, p) { (m.get(ev) || []).forEach(fn => { try { fn(p); } catch (e) { console.error('[trianon]', ev, e); } }); }
  };
})();
T.bus = bus;

/* 本地存储：可能不可用（隐私模式、嵌入环境），读写都包在 try 里 */
const store = {
  get(k, d) { try { const v = localStorage.getItem('trianon:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('trianon:' + k, JSON.stringify(v)); } catch (e) { } }
};

/* 文本转义与极简的角色扮演格式：*动作* 斜体，"对白" 加色，空行分段 */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmt(text) {
  let h = esc(text);
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
       .replace(/\*([^*\n]+)\*/g, '<i class="act">$1</i>')
       .replace(/(“[^”\n]*”|&quot;[^\n]*?&quot;|「[^」\n]*」)/g, '<q class="say">$1</q>');
  return h.split(/\n{2,}/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

/* 宏（同 SillyTavern 常用的一批）。ctx 里没有的字段按空串处理。
   {{char}} {{user}} {{persona}} {{description}} {{personality}} {{scenario}} {{mesExamples}} {{model}}
   {{time}} {{date}} {{weekday}} {{isotime}} {{isodate}} {{lastMessage}} {{lastCharMessage}} {{lastUserMessage}}
   {{random:a,b,c}} {{pick:a,b,c}} {{roll:2d6}} {{newline}} {{// 注释}} {{trim}} */
const MACRO_LIST = [
  ['{{char}}', '角色名'], ['{{user}}', '人设名'], ['{{persona}}', '人设描述'], ['{{description}}', '角色描述'], ['{{personality}}', '角色性格'],
  ['{{scenario}}', '场景'], ['{{mesExamples}}', '示例对话'], ['{{model}}', '模型名'], ['{{time}}', '现在的时间'], ['{{date}}', '今天的日期'],
  ['{{weekday}}', '星期几'], ['{{isotime}}', '时间 HH:MM'], ['{{isodate}}', '日期 YYYY-MM-DD'], ['{{lastMessage}}', '上一条消息'],
  ['{{lastCharMessage}}', '角色的上一条'], ['{{lastUserMessage}}', '你的上一条'], ['{{random:a,b,c}}', '随机挑一个'], ['{{pick:a,b,c}}', '挑一个（同一条消息里固定）'],
  ['{{roll:1d6}}', '掷骰子'], ['{{newline}}', '换行'], ['{{// 注释}}', '注释，替换为空'], ['{{trim}}', '去掉前后的空行']
];
function macros(s, ctx) {
  ctx = ctx || {};
  s = String(s == null ? '' : s);
  if (s.indexOf('{{') < 0) return s;
  const d = new Date(), p2 = n => String(n).padStart(2, '0');
  const W = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  let seed = 0; for (const c of s) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const list = v => v.split(/(?<!\\),/).map(x => x.replace(/\\,/g, ',').trim());
  const fixed = { char: ctx.char, user: ctx.user, persona: ctx.persona, description: ctx.description, personality: ctx.personality, scenario: ctx.scenario,
    mesexamples: ctx.mesExamples, model: ctx.model, lastmessage: ctx.lastMessage, lastcharmessage: ctx.lastCharMessage, lastusermessage: ctx.lastUserMessage,
    time: d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), date: d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    weekday: W[d.getDay()], isotime: p2(d.getHours()) + ':' + p2(d.getMinutes()), isodate: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()), newline: '\n' };
  let out = s.replace(/\{\{\/\/[\s\S]*?\}\}/g, '').replace(/\{\{\s*([a-zA-Z_]+)\s*(?::(:)?([^}]*))?\}\}/g, (all, k, _, arg) => {
    const key = k.toLowerCase();
    if (key in fixed) return fixed[key] == null ? '' : String(fixed[key]);
    if ((key === 'random' || key === 'pick') && arg != null) { const xs = list(arg); return xs.length ? xs[key === 'pick' ? seed % xs.length : Math.floor(Math.random() * xs.length)] : ''; }
    if (key === 'roll' && arg) { const m = arg.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i) || arg.trim().match(/^()(\d+)()$/); if (!m) return all; const n = +(m[1] || 1), f = +m[2]; let t = +(m[3] || 0); for (let i = 0; i < Math.min(n, 100); i++) t += 1 + Math.floor(Math.random() * f); return String(t); }
    if (key === 'trim') return '\u0000TRIM\u0000';
    return all;
  });
  if (out.includes('\u0000TRIM\u0000')) out = out.replace(/\s*\u0000TRIM\u0000\s*/g, '').trim();
  return out;
}

/* 时间 */
const pad = n => String(n).padStart(2, '0');
const hm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dayLabel = t => {
  const d = new Date(t), H = d.getHours();
  const part = H < 5 ? '夜' : H < 11 ? '晨' : H < 14 ? '午' : H < 18 ? '午后' : H < 22 ? '晚' : '夜';
  return '今日 · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + part;
};

/* ===== 动效档位：完整 1 · 柔和 .5 · 减少 0 =====
   柔和：动画都保留，回弹去掉、改成直接缓停，摆幅减半，时长缩短约三成。
   CSS 里的过渡由构建脚本生成 body.soft 版本；JS 里的 Web Animations 在这里统一改。 */
const motionK = () => document.body.classList.contains('rm') ? 0 : document.body.classList.contains('soft') ? .5 : 1;
const SOFT_EO = 'cubic-bezier(.22,1,.36,1)';
const softEase = e => typeof e === 'string' ? e.replace(/cubic-bezier\(([^)]*)\)/g, (m, a) => { const n = a.split(',').map(Number); return (n[1] > 1 || n[3] > 1 || n[1] < 0 || n[3] < 0) ? SOFT_EO : m; }) : e;
{
  const raw = Element.prototype.animate;
  Element.prototype.animate = function (k, o) {
    if (o && typeof o === 'object' && document.body && document.body.classList.contains('soft')) {
      o = Object.assign({}, o);
      if (typeof o.duration === 'number') o.duration *= .7;
      if (o.delay) o.delay *= .7;
      if (o.easing) o.easing = softEase(o.easing);
      if (Array.isArray(k)) k = k.map(f => f && f.easing ? Object.assign({}, f, { easing: softEase(f.easing) }) : f);
    }
    return raw.call(this, k, o);
  };
}
