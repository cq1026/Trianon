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

/* 宏：{{char}} {{user}} */
function macros(s, ctx) {
  return String(s || '').replace(/\{\{\s*(char|user)\s*\}\}/gi, (_, k) => k.toLowerCase() === 'char' ? (ctx.char || '') : (ctx.user || ''));
}

/* 时间 */
const pad = n => String(n).padStart(2, '0');
const hm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dayLabel = t => {
  const d = new Date(t), H = d.getHours();
  const part = H < 5 ? '夜' : H < 11 ? '晨' : H < 14 ? '午' : H < 18 ? '午后' : H < 22 ? '晚' : '夜';
  return '今日 · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + part;
};
