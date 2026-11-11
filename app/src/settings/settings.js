(()=>{
/* Trianon ST 设置页：取自原版 settings_v3.js（拼贴桌面 + 立体摆件）。
   改动：账户 → 人设；权限页删除；引擎 → 连接状态；外观页加入对话相关开关；设置直接写入应用状态（不再有独立的 __set 后端）。
   以下为原注释。
===================================================================================================
   settings v3 — 设置页「拼贴桌面 + 立体摆件」. v3 keeps v2's desk, index, key-ring charm, engraved watch, functions and bridge;
   it trims the torn paper to a few underlayers and builds each section from flat die-cut cards + re-toned photographic antiques
   (see the v3 block above secAccount). Earlier notes from v2 follow.
   settings v2 — 设置页「拼贴桌面」on top of the approved rococo v1 app. Nothing approved is redrawn.
   v1 (6/10, "too plain, boring") was one flat sheet + four neat bookmarks + a form. v2 turns the dossier into a collage desk:
   a torn periwinkle board with big pale script and light scratches; every section is several torn papers of different stock
   (ruled note, music staff, old letter, newspaper, receipt, polaroid, perforated stamp, vellum) at ±1–4°, held by washi tape,
   clips, safety pins and tacks; engraved stickers (lily, forget-me-not, butterfly, moon, key).
   Index = a stack of label-maker strips; the current one is taped down and wears the v2 key-ring charm.
   Same functions, sections, scene hashes and bridge as v1:
     window.__set.emit(ev, payload)        back end → page
        'settings.load' {account, appearance, permission, engine}  'settings.saved' {key}  'settings.error' {key,message}
        'engine.health' {state:'checking'} | {ok:true,version,ms} | {ok:false,error,ms}   'engine.detected' {path,found}  'account.state' {...}
     window.__set.onRequest = (type, payload) => {...}   page → back end (default: built-in mock)
        'settings.save' {key,value}  'engine.health.check' {port}  'engine.restart'  'engine.detect'  'engine.pickPath'
        'engine.openLogDir' {path}  'account.copyKey'  'account.replaceKey'  'account.logout'  'workspace.add'  'workspace.remove' {path}
     window.__set.open(section) / close() / go(section)
   Every moving part is a function of settings time (sT), so a scene still is just a frozen sT.
   =================================================================================================== */
const RMQ=matchMedia('(prefers-reduced-motion: reduce)');
const $=id=>document.getElementById(id);
const b=document.body;
const HASH=decodeURIComponent(location.hash.slice(1)).split(/[&,]/).filter(Boolean);
const has=k=>HASH.includes(k);
const cl=u=>Math.max(0,Math.min(1,u)),eo=u=>1-Math.pow(1-cl(u),3),eio=u=>{u=cl(u);return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2};
let FROZEN=null;
const sT=()=>FROZEN!=null?FROZEN:performance.now()/1000;
const CHECK='<svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.2 10.4c1.4.9 2.6 2.4 3.6 4.3.3.5.7.5.9 0 2-4.6 5.1-8.6 9.4-11.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------------------------------------------------------- engraving pieces (same hand as engine v2) */
/* copied from engine_v2.js (engraving palette · star · bead · strand · engraved watch · key-ring hardware · photo-frame tag) */
/* ---- engraving palette: one misty-blue line on cream, a little silver-blue and lotus ---- */
const L1='#4C5D88',L2='#8393B4',CR='#FCFAF6',LO='#EBDDE2',LR='#B48C9C';
const f1=n=>(+n).toFixed(2);
/* a concave four-point star, the reference's little spark */
const star4=(x,y,r,a='')=>`<path ${a} d="M${f1(x)},${f1(y-r)} Q${f1(x)},${f1(y)} ${f1(x+r)},${f1(y)} Q${f1(x)},${f1(y)} ${f1(x)},${f1(y+r)} Q${f1(x)},${f1(y)} ${f1(x-r)},${f1(y)} Q${f1(x)},${f1(y)} ${f1(x)},${f1(y-r)} Z"/>`;
/* a bead: pearl on a thread, outline + one highlight (no gloss) */
const bead=(x,y,r,lotus)=>`<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${lotus?LO:'#EEF1F6'}" stroke="${lotus?LR:L1}" stroke-width=".85"/><path d="M${f1(x-r*.5)},${f1(y-r*.15)} A${f1(r*.55)},${f1(r*.55)} 0 0 1 ${f1(x+r*.1)},${f1(y-r*.55)}" fill="none" stroke="#fff" stroke-width=".8" stroke-linecap="round"/>`;
/* points along a quadratic curve */
const qpt=(p0,p1,p2,t)=>[(1-t)*(1-t)*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)*(1-t)*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]];
/* a short bead strand: thread, 3 beads spaced wide, a star charm at the end */
const strand=(p0,p1,p2,r,ts,lot,sr)=>{const pe=qpt(p0,p1,p2,1);
  return `<path d="M${p0} Q${p1} ${p2}" fill="none" stroke="${L2}" stroke-width=".8" stroke-linecap="round"/>`+
   ts.map((t,i)=>{const p=qpt(p0,p1,p2,t);return bead(p[0],p[1],r,lot===i)}).join('')+
   `<g fill="${CR}" stroke="${L1}" stroke-width=".8" stroke-linejoin="round">${star4(pe[0],pe[1]+sr*.9,sr)}</g>`};
const ROM=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
/* the engraved pocket watch (reference 1): bow, fluted crown, roman dial, breguet hands; optional hourglass of stars.
   R = case radius. Classes: w-h w-m w-s (hands) w-fl (crown fluting) w-hg (hourglass) w-sf (falling star). */
const engWatch=({R,full,hg})=>{const k=R/26;const s=v=>f1(v*k);let o='';
  /* bow + neck + crown */
  o+=`<g fill="none" stroke="${L1}" stroke-linecap="round" stroke-linejoin="round">
   <ellipse cx="0" cy="${s(-37.6)}" rx="${s(6.2)}" ry="${s(5)}" stroke-width="${f1(1.25*Math.max(k,.8))}"/>
   <ellipse cx="0" cy="${s(-37.6)}" rx="${s(4.1)}" ry="${s(3)}" stroke="${L2}" stroke-width=".6"/>
   <rect x="${s(-4.8)}" y="${s(-33.4)}" width="${s(9.6)}" height="${s(5.6)}" rx="${s(1.3)}" fill="${CR}" stroke-width="${f1(1.05*Math.max(k,.8))}"/>
   <g class="w-fl" stroke="${L2}" stroke-width=".6"></g>
   <path d="M${s(-3)},${s(-27.9)} h${s(6)} l${s(.6)},${s(2.4)} h${s(-7.2)} Z" fill="${CR}" stroke-width=".85"/></g>`;
  /* case: outer rim, bezel line, sparse bezel pips */
  o+=`<circle r="${s(26)}" fill="${CR}" stroke="${L1}" stroke-width="${f1(1.35*Math.max(k,.75))}"/>
   <circle r="${s(23.9)}" fill="none" stroke="${L2}" stroke-width=".7"/>`;
  if(full){o+=`<circle r="${s(21.7)}" fill="none" stroke="${L2}" stroke-width=".5"/>`;
    o+='<g fill="'+L1+'" font-family="CormI,serif" font-style="normal" font-size="'+s(5.1)+'" text-anchor="middle">'+ROM.map((n,i)=>{const a=i*Math.PI/6,rr=s(18.3);
      return `<text x="${f1(Math.sin(a)*rr)}" y="${f1(-Math.cos(a)*rr+1.7*k)}" transform="rotate(${i*30} ${f1(Math.sin(a)*rr)} ${f1(-Math.cos(a)*rr)})">${n}</text>`}).join('')+'</g>';
    o+=`<g stroke="${L1}" stroke-width=".7" stroke-linecap="round">`+[...Array(12)].map((_,i)=>{const a=i*Math.PI/6;return `<path d="M${f1(Math.sin(a)*s(21.7))},${f1(-Math.cos(a)*s(21.7))} L${f1(Math.sin(a)*s(23.4))},${f1(-Math.cos(a)*s(23.4))}"/>`}).join('')+'</g>';
    o+=`<circle r="${s(13.6)}" fill="none" stroke="${L2}" stroke-width=".4" stroke-dasharray="1.2 3.2"/>`}
  else{o+=`<circle r="${s(20.4)}" fill="none" stroke="${L2}" stroke-width=".5"/>`;
    o+='<g fill="'+L1+'" font-family="CormI,serif" font-size="'+s(7.6)+'" text-anchor="middle">'+[0,3,6,9].map(i=>{const a=i*Math.PI/6,rr=s(15.6);
      return `<text x="${f1(Math.sin(a)*rr)}" y="${f1(-Math.cos(a)*rr+2.5*k)}">${ROM[i]}</text>`}).join('')+'</g>';
    o+=`<g fill="${L2}">`+[1,2,4,5,7,8,10,11].map(i=>{const a=i*Math.PI/6;return `<circle cx="${f1(Math.sin(a)*s(16.6))}" cy="${f1(-Math.cos(a)*s(16.6))}" r=".75"/>`}).join('')+'</g>'}
  /* hourglass of stars at six */
  if(hg){o+=`<g class="w-hg" transform="translate(0 ${s(8.2)})" fill="none" stroke="${L1}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${s(-4.6)},${s(-5.9)} h${s(9.2)} M${s(-4.6)},${s(5.9)} h${s(9.2)}" stroke-width="1"/>
    <path d="M${s(-3.5)},${s(-5)} C${s(-3.5)},${s(-1.6)} ${s(-.75)},${s(-1)} ${s(-.75)},0 C${s(-.75)},${s(1)} ${s(-3.5)},${s(1.6)} ${s(-3.5)},${s(5)} M${s(3.5)},${s(-5)} C${s(3.5)},${s(-1.6)} ${s(.75)},${s(-1)} ${s(.75)},0 C${s(.75)},${s(1)} ${s(3.5)},${s(1.6)} ${s(3.5)},${s(5)}" stroke-width=".7"/>
    <path d="M${s(-4.3)},${s(-5.9)} v${s(11.8)} M${s(4.3)},${s(-5.9)} v${s(11.8)}" stroke="${L2}" stroke-width=".55"/>
    <g fill="${L1}" stroke="none"><g class="w-st0">${star4(-1.3*k,-3.1*k,1.25*k)}</g><g class="w-st1">${star4(1.35*k,-2.6*k,1.05*k)}</g>
     <g class="w-sb0">${star4(-1.4*k,3.9*k,1.15*k)}</g><g class="w-sb1">${star4(1.5*k,3.6*k,1.25*k)}</g><g class="w-sf">${star4(0,0,.95*k)}</g></g></g>`}
  /* breguet hands */
  o+=`<g class="w-h"><path d="M0,${s(2.4)} L0,${s(-6.2)}" stroke="${L1}" stroke-width="${f1(1.5*Math.max(k,.8))}" stroke-linecap="round"/><circle cy="${s(-7.8)}" r="${s(1.7)}" fill="${CR}" stroke="${L1}" stroke-width=".9"/><path d="M0,${s(-9.5)} L0,${s(-11)}" stroke="${L1}" stroke-width="1" stroke-linecap="round"/></g>
   <g class="w-m"><path d="M0,${s(3)} L0,${s(-12.4)}" stroke="${L1}" stroke-width="${f1(1*Math.max(k,.8))}" stroke-linecap="round"/><circle cy="${s(-13.6)}" r="${s(1.2)}" fill="${CR}" stroke="${L1}" stroke-width=".75"/><path d="M0,${s(-14.8)} L0,${s(-17.2)}" stroke="${L1}" stroke-width=".75" stroke-linecap="round"/></g>
   <g class="w-s"><path d="M0,${s(4.4)} L0,${s(-18.4)}" stroke="${LR}" stroke-width=".65" stroke-linecap="round"/></g>
   <circle r="${s(1.7)}" fill="${L1}"/><circle r="${s(.65)}" fill="${CR}"/>`;
  return o};
/* tag watch (inside the hanging tag): 4 numerals, no hourglass */
const watchSVG=()=>`<svg width="46" height="56" viewBox="-23 -31 46 56" aria-hidden="true"><g transform="translate(0 2)">${engWatch({R:17,full:false,hg:false})}</g></svg>`;
/* the composer watch: full roman dial, hourglass of stars, a bead chain off the bow, progress ring and arched script below */
const EW_R=26;
const ewSVG=()=>`<svg width="120" height="120" viewBox="-60 -56 120 120" aria-hidden="true">
 <defs><path id="egArcP" d="M-44,4 A44,44 0 0 0 44,4"/></defs>
 <g class="ew-ring"><circle r="31.5" fill="none" stroke="rgba(131,147,180,.35)" stroke-width=".8"/>
  <circle class="ew-arc" r="31.5" fill="none" stroke="#6F82AC" stroke-width="1.5" stroke-linecap="round" transform="rotate(-90)" stroke-dasharray="0 400"/>
  <g class="ew-tip"><g fill="${CR}" stroke="${L1}" stroke-width=".8" stroke-linejoin="round">${star4(0,-31.5,3.6)}</g></g></g>
 <g class="ew-chain">${strand([5.5,-39],[33,-34],[40,-4],2.7,[.3,.55,.79],1,4.3)}</g>
 ${engWatch({R:EW_R,full:true,hg:true})}
 <text class="ew-txt" transform="rotate(-13)" font-family="Pinyon,PinyonX,serif" font-size="9.8" fill="#4C5D88" letter-spacing=".3"><textPath href="#egArcP" startOffset="50%" text-anchor="middle">Remontage · le temps se remonte</textPath></text></svg>`;
/* the key-ring hardware above the tag: tack, split ring, jump ring, bow, one short bead strand */
const TW=226,CX=TW/2,TOP=46;
const hwSVG=()=>`<svg class="eg-hw" width="${TW}" height="76" viewBox="0 0 ${TW} 76" aria-hidden="true">
 <g class="hw-strand">${strand([CX+10.5,28.5],[CX+30,64],[CX+64,64],3.8,[.27,.52,.76],1,5.6)}</g>
 <g transform="translate(${CX} 4) scale(1.2) translate(${-CX} -4)"><g fill="none" stroke-linecap="round">
  <circle cx="${CX}" cy="18.6" r="10.4" stroke="#EEF1F6" stroke-width="2.6"/>
  <circle cx="${CX}" cy="18.6" r="11.8" stroke="${L1}" stroke-width="1.15"/>
  <circle cx="${CX}" cy="18.6" r="9" stroke="${L2}" stroke-width=".75"/>
  <path d="M${f1(CX-11.3)},${f1(21.8)} A11.8,11.8 0 0 0 ${f1(CX-3)},${f1(30.1)}" stroke="${L1}" stroke-width=".7" transform="translate(1.4 -1.1)"/>
  <path d="M${f1(CX-6)},11 A8,8 0 0 1 ${f1(CX+3.5)},10.6" stroke="#fff" stroke-width=".9"/>
  <ellipse cx="${CX}" cy="36.4" rx="3.5" ry="8.4" stroke="#EEF1F6" stroke-width="2"/>
  <ellipse cx="${CX}" cy="36.4" rx="4.4" ry="9.2" stroke="${L1}" stroke-width="1"/>
  <ellipse cx="${CX}" cy="36.4" rx="2.6" ry="7.5" stroke="${L2}" stroke-width=".6"/></g>
 <circle cx="${CX}" cy="4" r="3.3" fill="#EEF1F6" stroke="${L1}" stroke-width="1"/><circle cx="${CX-1}" cy="3" r=".9" fill="#fff"/>
 <g class="hw-bow" stroke="${L1}" stroke-width=".95" stroke-linejoin="round" stroke-linecap="round">
  <path d="M${CX-2.6},38 C${CX-9},44 ${CX-11},50 ${CX-9.5},53.5 L${CX-6.4},50.6 L${CX-4.2},53.2 C${CX-4.2},48.5 ${CX-2.6},43 ${CX-1},39" fill="${LO}"/>
  <path d="M${CX+2.6},38 C${CX+9},44 ${CX+11},50 ${CX+9.5},53.5 L${CX+6.4},50.6 L${CX+4.2},53.2 C${CX+4.2},48.5 ${CX+2.6},43 ${CX+1},39" fill="${LO}"/>
  <path d="M${CX-2.2},36.4 C${CX-8},30 ${CX-16},30.4 ${CX-15.6},36.4 C${CX-15.2},42 ${CX-7},41.6 ${CX-2.2},37.8 Z" fill="${LO}"/>
  <path d="M${CX+2.2},36.4 C${CX+8},30 ${CX+16},30.4 ${CX+15.6},36.4 C${CX+15.2},42 ${CX+7},41.6 ${CX+2.2},37.8 Z" fill="${LO}"/>
  <path d="M${CX-12.4},35.4 C${CX-10},34.2 ${CX-6.5},35 ${CX-4.2},36.6 M${CX+12.4},35.4 C${CX+10},34.2 ${CX+6.5},35 ${CX+4.2},36.6" fill="none" stroke="${LR}" stroke-width=".6"/>
  <rect x="${CX-2.9}" y="34" width="5.8" height="6" rx="1.8" fill="#F6EEF1"/></g></g></svg>`;
/* the photo-frame tag body: arched crest with an eyelet, double rule, sparse stitch, two corner sparks. Drawn to size. */
const crestPath=(W,H,d,c)=>{const r=Math.max(3,11-d*.7),x0=d,x1=W-d,y0=c+d,y1=H-d,hw=46-d*.8,ct=d*.95;
  return `M${f1(x0+r)},${f1(y0)} L${f1(W/2-hw)},${f1(y0)} C${f1(W/2-hw+15)},${f1(y0)} ${f1(W/2-24+d*.3)},${f1(ct)} ${f1(W/2)},${f1(ct)} C${f1(W/2+24-d*.3)},${f1(ct)} ${f1(W/2+hw-15)},${f1(y0)} ${f1(W/2+hw)},${f1(y0)} L${f1(x1-r)},${f1(y0)} Q${f1(x1)},${f1(y0)} ${f1(x1)},${f1(y0+r)} L${f1(x1)},${f1(y1-r)} Q${f1(x1)},${f1(y1)} ${f1(x1-r)},${f1(y1)} L${f1(x0+r)},${f1(y1)} Q${f1(x0)},${f1(y1)} ${f1(x0)},${f1(y1-r)} L${f1(x0)},${f1(y0+r)} Q${f1(x0)},${f1(y0)} ${f1(x0+r)},${f1(y0)} Z`};
const frameSVG=(W,H,rose)=>{const c=13,ln=rose?'#A98393':'#7D8DB0',ln2=rose?'rgba(185,144,158,.62)':'rgba(125,141,176,.6)',st=rose?'rgba(185,144,158,.75)':'rgba(131,147,180,.72)';
  return `<svg class="eg-frame" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
  <path d="${crestPath(W,H,.65,c)}" fill="url(#egPaperG)" stroke="${ln}" stroke-width="1.3"/>
  <path d="${crestPath(W,H,4.4,c)}" fill="none" stroke="${ln2}" stroke-width=".8"/>
  <path d="${crestPath(W,H,8.2,c)}" fill="none" stroke="${st}" stroke-width=".9" stroke-dasharray="5 5.5" stroke-linecap="round"/>
  <g fill="${rose?'#C9A3B1':'#9AA8C6'}">${star4(17.5,H-17.5,3)}${star4(W-17.5,H-17.5,3)}</g>
  <circle cx="${W/2}" cy="7.4" r="3.1" fill="#E4E9F1" stroke="${ln}" stroke-width="1"/></svg>`};
const sealSVG=`<svg width="62" height="62" viewBox="-31 -31 62 62" aria-hidden="true"><defs>
 <radialGradient id="egSx" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#E2C3CC"/><stop offset=".55" stop-color="#C799A7"/><stop offset="1" stop-color="#A9788A"/></radialGradient></defs>
 <path d="M0,-27 C8,-28 14,-24 19,-19 C25,-14 28,-7 27,1 C29,9 25,16 19,21 C13,27 5,28 -2,27 C-10,28 -17,24 -21,18 C-27,12 -28,4 -27,-3 C-28,-11 -23,-18 -17,-22 C-12,-26 -6,-27 0,-27 Z" fill="url(#egSx)"/>
 <circle r="17.5" fill="none" stroke="rgba(120,70,90,.35)" stroke-width="1.6"/><circle r="17.5" fill="none" stroke="rgba(255,240,244,.35)" stroke-width=".6" transform="translate(-.6 -.6)"/>
 <g fill="none" stroke="rgba(110,62,80,.62)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M-6,-10 h12 M-6,10 h12 M-4.6,-10 C-4.6,-3 -1,-2 -1,0 C-1,2 -4.6,3 -4.6,10 M4.6,-10 C4.6,-3 1,-2 1,0 C1,2 4.6,3 4.6,10"/></g>
 <path d="M-8,-17 C-3,-20 4,-20 9,-17" fill="none" stroke="rgba(255,240,244,.45)" stroke-width="1.2" stroke-linecap="round"/></svg>`;
/* an oval badge (reference 1, "SINCE 1998"): double rule, small caps over a value */
const badge=(cap,val,rose)=>`<span class="eg-badge${rose?' r':''}"><i>${cap}</i><b>${val}</b></span>`;

/* a bigger arched crest for the dossier sheet */
const crestW=(W,H,d,c,hw0)=>{const r=Math.max(3,12-d*.7),x0=d,x1=W-d,y0=c+d,y1=H-d,hw=hw0-d*.8,ct=d*.95;
  return `M${f1(x0+r)},${f1(y0)} L${f1(W/2-hw)},${f1(y0)} C${f1(W/2-hw+hw*.34)},${f1(y0)} ${f1(W/2-hw*.52)},${f1(ct)} ${f1(W/2)},${f1(ct)} C${f1(W/2+hw*.52)},${f1(ct)} ${f1(W/2+hw-hw*.34)},${f1(y0)} ${f1(W/2+hw)},${f1(y0)} L${f1(x1-r)},${f1(y0)} Q${f1(x1)},${f1(y0)} ${f1(x1)},${f1(y0+r)} L${f1(x1)},${f1(y1-r)} Q${f1(x1)},${f1(y1)} ${f1(x1-r)},${f1(y1)} L${f1(x0+r)},${f1(y1)} Q${f1(x0)},${f1(y1)} ${f1(x0)},${f1(y1-r)} L${f1(x0)},${f1(y0+r)} Q${f1(x0)},${f1(y0)} ${f1(x0+r)},${f1(y0)} Z`};
const sheetSVG=(W,H)=>{const c=16;return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
  <path d="${crestW(W,H,.65,c,120)}" fill="url(#stPaperG)" stroke="#7D8DB0" stroke-width="1.3"/>
  <path d="${crestW(W,H,5,c,120)}" fill="none" stroke="rgba(125,141,176,.55)" stroke-width=".8"/>
  <path d="${crestW(W,H,10,c,120)}" fill="none" stroke="rgba(131,147,180,.62)" stroke-width=".9" stroke-dasharray="6 7" stroke-linecap="round"/>
  <g fill="#9AA8C6">${star4(22,H-22,3.4)}${star4(W-22,H-22,3.4)}</g>
  <circle cx="${W/2}" cy="8" r="3.4" fill="#E4E9F1" stroke="#7D8DB0" stroke-width="1"/></svg>`};
/* a wax seal with an engraved «!» (the danger mark) */
const sealX=(sz,id)=>`<svg width="${sz}" height="${sz}" viewBox="-31 -31 62 62" aria-hidden="true"><defs>
 <radialGradient id="${id}" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#E7CDD4"/><stop offset=".55" stop-color="#CDA2AF"/><stop offset="1" stop-color="#AE8191"/></radialGradient></defs>
 <path d="M0,-27 C8,-28 14,-24 19,-19 C25,-14 28,-7 27,1 C29,9 25,16 19,21 C13,27 5,28 -2,27 C-10,28 -17,24 -21,18 C-27,12 -28,4 -27,-3 C-28,-11 -23,-18 -17,-22 C-12,-26 -6,-27 0,-27 Z" fill="url(#${id})"/>
 <circle r="17.5" fill="none" stroke="rgba(120,70,90,.35)" stroke-width="1.6"/><circle r="17.5" fill="none" stroke="rgba(255,240,244,.4)" stroke-width=".6" transform="translate(-.6 -.6)"/>
 <g fill="rgba(110,62,80,.66)"><path d="M-1.9,-10.5 L1.9,-10.5 L1.1,3.2 L-1.1,3.2 Z"/><circle cy="8" r="2.1"/></g>
 <path d="M-8,-17 C-3,-20 4,-20 9,-17" fill="none" stroke="rgba(255,240,244,.5)" stroke-width="1.2" stroke-linecap="round"/></svg>`;
const obadge=(cap,val,cls='')=>`<span class="st-badge ${cls}"><i>${esc(cap)}</i><b>${esc(val)}</b></span>`;

/* the small key-ring charm for the bookmark: split ring · jump ring · lotus bow · arched tag with the numeral ·
   one short strand with three beads spaced wide. Pivot (0,0) = the tab's eyelet. */
const charmSVG=()=>`<svg width="96" height="118" viewBox="-30 -8 96 118" aria-hidden="true" style="overflow:visible">
 <g class="ch-strand">${strand([5.2,9],[15,40],[38,52],2.7,[.26,.56,.84],1,4.2)}</g>
 <g fill="none" stroke-linecap="round">
  <circle cx="0" cy="8.4" r="7" stroke="#EEF1F6" stroke-width="2.2"/>
  <circle cx="0" cy="8.4" r="8" stroke="${L1}" stroke-width="1.05"/>
  <circle cx="0" cy="8.4" r="5.9" stroke="${L2}" stroke-width=".65"/>
  <path d="M-4,3.5 A5.6,5.6 0 0 1 2.4,3.1" stroke="#fff" stroke-width=".8"/>
  <ellipse cx="0" cy="20.6" rx="2.6" ry="5.6" stroke="#EEF1F6" stroke-width="1.6"/>
  <ellipse cx="0" cy="20.6" rx="3.2" ry="6.2" stroke="${L1}" stroke-width=".9"/></g>
 <g class="ch-tag">
  <path d="M-17,34 L-8,34 C-5,34 -4.5,28.6 0,28.6 C4.5,28.6 5,34 8,34 L17,34 Q19,34 19,36 L19,72 Q19,74 17,74 L-17,74 Q-19,74 -19,72 L-19,36 Q-19,34 -17,34 Z" fill="url(#stPaperG)" stroke="#7D8DB0" stroke-width="1.1"/>
  <path d="M-14.5,37.4 L-7,37.4 C-4.6,37.4 -4,32.4 0,32.4 C4,32.4 4.6,37.4 7,37.4 L14.5,37.4 Q15.6,37.4 15.6,38.5 L15.6,69.5 Q15.6,70.6 14.5,70.6 L-14.5,70.6 Q-15.6,70.6 -15.6,69.5 L-15.6,38.5 Q-15.6,37.4 -14.5,37.4 Z" fill="none" stroke="rgba(131,147,180,.7)" stroke-width=".8" stroke-dasharray="3.4 3.6" stroke-linecap="round"/>
  <circle cx="0" cy="31.8" r="1.6" fill="#E4E9F1" stroke="#7D8DB0" stroke-width=".7"/>
  <text class="ch-num" x="0" y="58" text-anchor="middle" font-family="CormI,serif" font-style="italic" font-size="15" fill="${L1}">i</text>
  <g fill="#9AA8C6">${star4(0,65.6,2.2)}</g></g>
 <g class="ch-bow" stroke="${L1}" stroke-width=".85" stroke-linejoin="round" stroke-linecap="round">
  <path d="M-1.8,27.4 C-6.4,31.6 -7.8,35.8 -6.8,38.4 L-4.6,36.3 L-3,38.2 C-3,34.8 -1.8,30.8 -.7,28.2" fill="${LO}"/>
  <path d="M1.8,27.4 C6.4,31.6 7.8,35.8 6.8,38.4 L4.6,36.3 L3,38.2 C3,34.8 1.8,30.8 .7,28.2" fill="${LO}"/>
  <path d="M-1.6,26.2 C-5.8,21.6 -11.4,21.9 -11.1,26.2 C-10.8,30.2 -5,29.9 -1.6,27.2 Z" fill="${LO}"/>
  <path d="M1.6,26.2 C5.8,21.6 11.4,21.9 11.1,26.2 C10.8,30.2 5,29.9 1.6,27.2 Z" fill="${LO}"/>
  <path d="M-8.8,25.5 C-7.1,24.6 -4.6,25.2 -3,26.3 M8.8,25.5 C7.1,24.6 4.6,25.2 3,26.3" fill="none" stroke="${LR}" stroke-width=".5"/>
  <rect x="-2.1" y="24.4" width="4.2" height="4.3" rx="1.3" fill="#F6EEF1"/></g></svg>`;

/* engraved line icons for the three permission modes: a padlock closed · ajar · open */
const lockSVG=k=>{const sh=k==='manual'?'M-7,-2 V-8.5 A7,7 0 0 1 7,-8.5 V-2':k==='yolo'?'M-7,-2 V-11 A7,7 0 0 1 7,-11 V-6.5':'M-7,-2 V-9 A7,7 0 0 1 7,-9 V-11 ';
  const shT=k==='auto'?' transform="rotate(-38 -7 -2) translate(0 -3)"':'';
  return `<svg width="46" height="48" viewBox="-23 -26 46 48" aria-hidden="true"><g fill="none" stroke="${k==='auto'?'#A07888':L1}" stroke-linecap="round" stroke-linejoin="round">
  <path d="${k==='auto'?'M-7,-2 V-9 A7,7 0 0 1 7,-9 V-6':sh}" stroke-width="2.1"${shT}/>
  <path d="${k==='auto'?'M-7,-2 V-9 A7,7 0 0 1 7,-9 V-6':sh}" stroke="#FCFAF6" stroke-width=".7"${shT}/>
  <rect x="-11" y="-2" width="22" height="18" rx="3" fill="#FCFAF6" stroke-width="1.25"/>
  <rect x="-8.6" y=".4" width="17.2" height="13.2" rx="2" stroke="${k==='auto'?'rgba(185,144,158,.7)':L2}" stroke-width=".6"/>
  <circle cx="0" cy="5.6" r="2.1" stroke-width="1"/><path d="M0,7.6 V11" stroke-width="1.1"/></g>
  ${k==='yolo'?`<g fill="#9AA8C6">${star4(15,-12,3.2)}</g>`:''}${k==='auto'?`<g fill="#C9A3B1">${star4(15,-14,3.4)}${star4(-15,-18,2.2)}</g>`:''}</svg>`};

/* cameo avatar: engraved oval, four sparks at the cardinal points, the initial inside */
const cameoSVG=()=>`<svg width="88" height="100" viewBox="-44 -50 88 100" aria-hidden="true">
 <defs><radialGradient id="stCam" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#F1F4F9"/><stop offset="1" stop-color="#D6DEEC"/></radialGradient></defs>
 <ellipse rx="37" ry="44" fill="#FCFAF6" stroke="${L1}" stroke-width="1.3"/>
 <ellipse rx="33.4" ry="40.4" fill="none" stroke="${L2}" stroke-width=".7"/>
 <ellipse rx="29.6" ry="36.4" fill="url(#stCam)" stroke="rgba(131,147,180,.75)" stroke-width=".9" stroke-dasharray="4.5 5" stroke-linecap="round"/>
 <g fill="#9AA8C6">${star4(0,-44,3.4)}${star4(0,44,3.4)}${star4(-37,0,2.8)}${star4(37,0,2.8)}</g>
 <text x="0" y="11" text-anchor="middle" font-family="'Noto Serif CJK SC','Noto Serif SC',serif" font-weight="600" font-size="30" fill="#2E3A63">满</text>
 <text x="0" y="27" text-anchor="middle" font-family="Pinyon,PinyonX,serif" font-size="11" fill="#5B6C93">Colette</text></svg>`;

/* ---------------------------------------------------------------- model (fictional demo labels) */
const APP=window.Trianon.app;
const V={appearance:Object.assign({theme:'light',fontSize:14.5,density:'standard',motion:'full',stickers:true},APP.S.settings.appearance||{})};
const SECS=[
 {k:'persona',n:'i',em:'Persona',zh:'人设',sub:'你在故事里是谁'},
 {k:'appearance',n:'ii',em:'Parure',zh:'外观',sub:'字号 · 动效 · 输出方式'},
 {k:'connection',n:'iii',em:'Connexion',zh:'连接状态',sub:'后端 · 模型 · 日志'}];
const MODES=[
 {k:'manual',n:'i',zh:'始终询问',en:'Always Ask',was:'原 Manual · 默认',d:'只读操作自动放行；写文件、跑命令逐一向你确认。',risk:0},
 {k:'yolo',n:'ii',zh:'必要时询问',en:'Ask When Needed',was:'原 YOLO · /demo-ask',d:'普通调用自动批准；.env、私钥、rm -rf、退出 Plan 仍会问你。',risk:1},
 {k:'auto',n:'iii',zh:'完全自动',en:'Never Ask',was:'原 Auto · /demo-auto',d:'无人值守：所有审批自动处理，危险命令不再拦截，也不再提问。',risk:2}];

/* ---------------------------------------------------------------- controls */
const tg=(key,on,lab=['开','关'])=>`<button class="st-tg${on?' on':''}" type="button" role="switch" aria-checked="${on}" data-k="${key}" data-l="${lab.join('|')}"><i class="tr"><i class="kn"></i></i><span class="tl">${on?lab[0]:lab[1]}</span></button>`;
const seg=(key,opts,cur)=>`<div class="st-seg" role="radiogroup" data-k="${key}">${opts.map(([v,t])=>`<button type="button" role="radio" aria-checked="${v===cur}" data-v="${v}"${v===cur?' class="on"':''}>${t}</button>`).join('')}</div>`;

/* ===================================================================================================
   v2 · the collage desk. Everything below is new; the engraving pieces / model above are v1's, unchanged.
   =================================================================================================== */
const RNG=seed=>{let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
let UID=0;
const pd=p=>'M'+p.map(q=>f1(q[0])+','+f1(q[1])).join(' L')+' Z';
/* a torn outline: sides listed in `torn` get a ripped edge (low wobble + fine jitter + the odd notch), the rest stay cut.
   Returns [surface, fibre]: the fibre outline sits 1–3 px outside the printed surface on torn sides — the white core of a real tear. */
const tornPts=(W,H,torn,rnd,amp)=>{const S=[],F=[];
  const edge=(x0,y0,x1,y1,nx,ny,tn)=>{const L=Math.hypot(x1-x0,y1-y0),ph=rnd()*6.28,fq=.045+rnd()*.05,ph2=rnd()*6.28;let s=0;
    while(s<L-.01){const u=s/L,x=x0+(x1-x0)*u,y=y0+(y1-y0)*u;let o,fo;
      if(tn){o=amp*(.5+.32*Math.sin(fq*s+ph)+.18*Math.sin(fq*2.7*s+ph2))+rnd()*amp*.75+(rnd()<.045?amp*1.1:0);fo=o-(1.1+rnd()*2.1)}
      else{o=(rnd()-.5)*.5;fo=o}
      S.push([x+nx*o,y+ny*o]);F.push([x+nx*fo,y+ny*fo]);s+=tn?2.6+rnd()*4.2:Math.max(24,L/5)}};
  edge(0,0,W,0,0,1,torn.includes('t'));edge(W,0,W,H,-1,0,torn.includes('r'));edge(W,H,0,H,0,-1,torn.includes('b'));edge(0,H,0,0,1,0,torn.includes('l'));
  return [S,F]};
/* stamp perforation: semicircle bites all round, traversed clockwise (sweep 0 = bite inward) */
const perfPath=(W,H,rr,sp)=>{let d=`M0,0`;const side=(L,pt)=>{const n=Math.max(1,Math.floor((L-sp*.6)/sp)),o=(L-(n-1)*sp)/2;for(let i=0;i<n;i++){const c=o+i*sp;const a=pt(c-rr),b=pt(c+rr);d+=` L${f1(a[0])},${f1(a[1])} A${rr},${rr} 0 0 0 ${f1(b[0])},${f1(b[1])}`}};
  side(W,c=>[c,0]);d+=` L${W},0`;side(H,c=>[W,c]);d+=` L${W},${H}`;side(W,c=>[W-c,H]);d+=` L0,${H}`;side(H,c=>[0,H-c]);return d+' Z'};
const PAPER={ruled:'#FBF8F0',staff:'#FAF8F4',letter:'#F6F0E4',news:'#F1F0EB',card:'#FBF7EE',receipt:'#FDFDFB',blue:'#D8DEF1',lotus:'#F8EEF1',
  vellum:'rgba(247,249,255,.56)',white:'#FDFCF9',cream:'#FAF6EC',silver:'#EDF0F7',form:'#FAF7F0',board:'#AEB7DD'};
/* one sheet of paper drawn to size. o: torn, amp, seed, deco extras */
const paperSVG=(W,H,type,seed,o={})=>{const r=RNG(seed),id='c2p'+(UID++);let shape,fib;
  if(type==='stamp'){shape=perfPath(W,H,o.rr||4.6,o.sp||15);fib=null}
  else if(o.shape){shape=o.shape;fib=null}
  else{const [S,F]=tornPts(W,H,o.torn==null?'tlbr':o.torn,r,o.amp||2.6);shape=pd(S);fib=pd(F)}
  let d='';
  if(type==='ruled'||o.rule){for(let y=o.y0||44;y<H-6;y+=o.gap||22)d+=`<path d="M0,${y} H${W}" stroke="rgba(108,130,182,.30)" stroke-width=".8"/>`;
    if(o.margin!==false)d+=`<path d="M${o.mx||30},0 V${H}" stroke="rgba(196,140,158,.40)" stroke-width=".9"/>`}
  if(type==='staff')for(const y0 of (o.staves||[]))for(let i=0;i<5;i++)d+=`<path d="M0,${y0+i*6.4} H${W}" stroke="rgba(76,93,136,.26)" stroke-width=".7"/>`;
  if(type==='letter'&&o.script)d+=`<text x="${o.sx||16}" y="${o.sy||H-14}" font-family="Pinyon,PinyonX,serif" font-size="${o.ss||17}" fill="rgba(90,78,60,.13)">${o.script}</text>`;
  if(type==='card')d+=`<rect x="0" y="0" width="${W}" height="${o.band||34}" fill="#E3E8F4"/><path d="M0,${o.band||34} H${W}" stroke="rgba(76,93,136,.45)" stroke-width=".8"/>`;
  if(type==='stamp')d+=`<rect x="${o.in||11}" y="${o.in||11}" width="${W-2*(o.in||11)}" height="${H-2*(o.in||11)}" fill="none" stroke="rgba(76,93,136,.55)" stroke-width=".9"/>`;
  if(o.fold)d+=`<path d="M0,${o.fold} H${W}" stroke="rgba(255,255,255,.75)" stroke-width="1.2"/><path d="M0,${o.fold+1.2} H${W}" stroke="rgba(60,70,100,.06)" stroke-width="1.4"/>`;
  if(o.stain)d+=`<ellipse cx="${W*o.stain[0]}" cy="${H*o.stain[1]}" rx="${W*.42}" ry="${H*.34}" fill="url(#c2Stain)"/>`;
  const fill=o.fill||PAPER[type]||PAPER.white;
  return `<svg class="pp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>
   ${fib?`<path d="${fib}" fill="${o.fiber||(type==='vellum'?'rgba(255,255,255,.55)':'#FFFEFB')}"/>`:''}
   <g clip-path="url(#${id})"><rect width="${W}" height="${H}" fill="${fill}"/>${o.grad?`<rect width="${W}" height="${H}" fill="url(#${o.grad})"/>`:''}${d}${type==='vellum'?'':`<rect width="${W}" height="${H}" fill="url(#c2Grain)"/>`}</g>
   ${o.edge?`<path d="${shape}" fill="none" stroke="${o.edge}" stroke-width=".8"/>`:''}</svg>`};
/* washi tape: translucent, ragged short ends, one lighter streak */
const TAPE={mask:'rgba(178,190,224,.97)',blue:'rgba(132,150,198,.58)',milk:'rgba(246,247,251,.78)',grey:'rgba(168,178,204,.62)',lotus:'rgba(226,196,206,.66)',navy:'rgba(86,104,154,.62)'};
const tapeSVG=(W,H,seed,col)=>{const r=RNG(seed);const end=(x,dir)=>{const p=[];let y=0;while(y<H){p.push([x+dir*(r()*3.2),y]);y+=2+r()*3}p.push([x+dir*r()*2.4,H]);return p};
  const L=end(3,-1),R=end(W-3,1).reverse();const pts=[...L.reverse(),...R];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${pd([[L[0][0],0],...R.slice().reverse(),...L.slice().reverse()])}" fill="none"/>
   <path d="M${f1(L[L.length-1][0])},0 ${R.slice().reverse().map(q=>`L${f1(q[0])},${f1(q[1])}`).join(' ')} ${L.map(q=>`L${f1(q[0])},${f1(q[1])}`).join(' ')} Z" fill="${TAPE[col]||col}"/>
   <rect x="2" y="${f1(H*.22)}" width="${W-4}" height="${f1(H*.16)}" fill="rgba(255,255,255,.18)"/><rect x="2" y="${f1(H*.66)}" width="${W-4}" height="1" fill="rgba(255,255,255,.22)"/></svg>`};
/* hardware */
const clipSVG=()=>`<svg width="24" height="66" viewBox="0 0 24 66" aria-hidden="true"><path d="M8,20 V52 A5,5 0 0 0 18,52 V10 A8,8 0 0 0 2,10 V50" fill="none" stroke="#7F8DAE" stroke-width="2.4" stroke-linecap="round"/><path d="M8,20 V52 A5,5 0 0 0 18,52 V10 A8,8 0 0 0 2,10 V50" fill="none" stroke="#F4F6FA" stroke-width=".8" stroke-linecap="round" transform="translate(-.5 -.4)"/></svg>`;
const pinSVG=()=>`<svg width="118" height="30" viewBox="0 0 118 30" aria-hidden="true"><g fill="none" stroke-linecap="round">
 <path d="M14,15 C40,9 80,9 104,12" stroke="#7F8DAE" stroke-width="2"/><path d="M14,15 C44,21 80,20 102,17" stroke="#7F8DAE" stroke-width="2"/>
 <path d="M14,15 C40,9 80,9 104,12" stroke="#F4F6FA" stroke-width=".7" transform="translate(0 -.6)"/>
 <circle cx="11" cy="15" r="5.2" stroke="#7F8DAE" stroke-width="2"/></g>
 <path d="M96,6 h12 a5,5 0 0 1 5,5 v3 a5,5 0 0 1 -5,5 h-12 Z" fill="#E6EAF2" stroke="#6F7EA2" stroke-width="1.2"/><path d="M98,8.5 h9" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>`;
const tackSVG=(c='#8E9FC6')=>`<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><ellipse cx="15" cy="25" rx="7" ry="2.4" fill="rgba(40,52,95,.16)"/><path d="M13,15 L15.5,25" stroke="#8A95AE" stroke-width="1.4" stroke-linecap="round"/>
 <circle cx="13" cy="11" r="9" fill="${c}" stroke="#56689A" stroke-width="1"/><circle cx="13" cy="11" r="5.2" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/><path d="M8.6,7.6 A5.5,5.5 0 0 1 13.4,5.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/></svg>`;
const starBadge=sz=>`<svg width="${sz}" height="${sz}" viewBox="-20 -20 40 40" aria-hidden="true"><path d="M0,-17 L4.6,-5.6 L16.6,-5.2 L7.3,2.3 L10.5,14 L0,7.4 L-10.5,14 L-7.3,2.3 L-16.6,-5.2 L-4.6,-5.6 Z" fill="#F1F3F9" stroke="#6F80A8" stroke-width="1.2" stroke-linejoin="round"/>
 <path d="M0,-11 L3,-3.6 L10.6,-3.3 L4.7,1.5 L6.7,9 L0,4.8 L-6.7,9 L-4.7,1.5 L-10.6,-3.3 L-3,-3.6 Z" fill="none" stroke="rgba(111,128,168,.55)" stroke-width=".7" stroke-linejoin="round"/></svg>`;
/* a postmark: double ring, arched words top and bottom, centre lines, a few wavy cancel lines */
const postmark=(id,top,bot,c1,c2,col,sz=128,wave=true)=>`<svg width="${sz+(wave?96:0)}" height="${sz}" viewBox="${-sz/2} ${-sz/2} ${sz+(wave?96:0)} ${sz}" aria-hidden="true">
 <defs><path id="${id}t" d="M${-sz*.36},0 A${sz*.36},${sz*.36} 0 0 1 ${sz*.36},0"/><path id="${id}b" d="M${-sz*.4},0 A${sz*.4},${sz*.4} 0 0 0 ${sz*.4},0"/></defs>
 <g fill="none" stroke="${col}" stroke-linecap="round"><circle r="${sz*.47}" stroke-width="2.2"/><circle r="${sz*.33}" stroke-width="1"/>
 ${wave?[...Array(3)].map((_,i)=>`<path d="M${sz*.5},${-18+i*12} c12,-6 22,6 34,0 s22,-6 34,0 s18,5 26,0" stroke-width="1.6"/>`).join(''):''}</g>
 <g fill="${col}" font-family="Tw,'Courier New',monospace" font-weight="700" letter-spacing="2">
  <text font-size="${sz*.088}"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${esc(top)}</textPath></text>
  <text font-size="${sz*.082}" dy="${sz*.06}"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${esc(bot)}</textPath></text>
  <text y="${-sz*.03}" text-anchor="middle" font-size="${sz*.15}" letter-spacing="1">${esc(c1)}</text>
  <text y="${sz*.14}" text-anchor="middle" font-size="${f1(Math.min(sz*.074,sz*.62/(String(c2).length*.6)))}" letter-spacing="0">${esc(c2)}</text></g></svg>`;
/* a ribbon bow for the tags */
const bowSVG=(c=LO,s=LR)=>`<svg width="46" height="34" viewBox="-23 -14 46 34" aria-hidden="true"><g stroke="${L1}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round">
 <path d="M-2,1 C-8,8 -10,14 -8.5,18 L-5.6,15.4 L-3.6,17.8 C-3.6,13 -2.2,7.6 -.8,2.4" fill="${c}"/><path d="M2,1 C8,8 10,14 8.5,18 L5.6,15.4 L3.6,17.8 C3.6,13 2.2,7.6 .8,2.4" fill="${c}"/>
 <path d="M-2,-1 C-8,-9 -18,-8.6 -17.4,-1 C-16.8,6 -7,5.4 -2,1.2 Z" fill="${c}"/><path d="M2,-1 C8,-9 18,-8.6 17.4,-1 C16.8,6 7,5.4 2,1.2 Z" fill="${c}"/>
 <path d="M-13.6,-2.4 C-10.8,-3.6 -6.8,-2.6 -4.4,-.8 M13.6,-2.4 C10.8,-3.6 6.8,-2.6 4.4,-.8" fill="none" stroke="${s}" stroke-width=".55"/>
 <rect x="-3.2" y="-3.6" width="6.4" height="6.6" rx="2" fill="#F8F0F3"/></g></svg>`;
/* a hand-drawn ring for the chosen word */
const RING=`<svg class="c2ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8,22 C6,8 40,3 66,5 C88,7 98,14 94,25 C90,35 54,38 30,35 C12,33 4,26 10,15 C14,9 22,7 30,6" fill="none" stroke="#5B6FA6" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const TICK=`<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M3,12 C6,13.5 8,16 9.6,19.5 C12,11 16.6,5.2 22,1.6" fill="none" stroke="#4E62A0" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---------------------------------------------------------------- piece builders (desk coordinates) */
const G={};const nd=g=>{G[g]=G[g]||{n:0,last:0};return G[g]};
/* paper piece with content. k: p (paper flies in) */
const P=(g,x,y,w,h,r,type,html,o={})=>{const q=nd(g);const d=o.d!=null?o.d:q.n*.055;q.n++;q.last=d;const seed=o.seed||(x*7+y*13+w);
  const tag=o.tag||'div';
  return `<${tag} class="an c2pc ${o.cls||''}"${o.attr?' '+o.attr:''} data-g="${g}" data-d="${d.toFixed(3)}" data-k="p" data-r="${r}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${o.z||''}">
  ${type?paperSVG(w,h,type,seed,o):''}<div class="ct">${html||''}</div></${tag}>`};
const TP=(g,x,y,w,h,r,col,o={})=>{const q=nd(g);const d=(o.d!=null?o.d:q.last+.24);return `<i class="an tp tp-${col} ${o.cls||''}" data-g="${g}" data-d="${d.toFixed(3)}" data-k="t" data-r="${r}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${tapeSVG(w,h,x*3+y,col)}</i>`};
const DC=(g,x,y,r,svg,o={})=>{const q=nd(g);const d=(o.d!=null?o.d:q.last+.2);return `<i class="an c2dc ${o.cls||''}" data-g="${g}" data-d="${d.toFixed(3)}" data-k="${o.k||'s'}" data-r="${r}" style="left:${x}px;top:${y}px">${svg}</i>`};
const STK=(g,x,y,w,r,img,o={})=>DC(g,x,y,r,`<img src="${img}" alt="" style="width:${w}px;display:block">`,{...o,cls:'c2stk '+(o.cls||'')});

/* label-maker strip (the reference's collect / beautiful / moments) */
const dymo=(txt,cls='')=>`<span class="c2dy ${cls}">${txt}</span>`;

/* ---------------------------------------------------------------- the common desk: board, masthead, index */
const IMG={lily:'asset:settings/sk_lily.png',fmn:'asset:settings/sk_fmn.png',bfly:'asset:settings/sk_bfly.png',moon:'asset:settings/sk_moon.png',key:'asset:settings/sk_key.png',wlily:'asset:settings/wl_lily.png'};
const scratches=(W,H,seed)=>{const r=RNG(seed);let o='';for(let i=0;i<34;i++){const x=r()*W,y=r()*H,l=40+r()*220,a=(-.5+r()*.5)+(r()<.3?1.6:0),cx=x+Math.cos(a)*l*.5+(r()-.5)*40,cy=y+Math.sin(a)*l*.5+(r()-.5)*40;
  o+=`<path d="M${f1(x)},${f1(y)} Q${f1(cx)},${f1(cy)} ${f1(x+Math.cos(a)*l)},${f1(y+Math.sin(a)*l)}" stroke="rgba(255,255,255,${(.10+r()*.16).toFixed(2)})" stroke-width="${(.5+r()*.9).toFixed(2)}" fill="none" stroke-linecap="round"/>`}
  for(let i=0;i<10;i++){const x=r()*W,y=r()*H,l=60+r()*160,a=r()*3.14;o+=`<path d="M${f1(x)},${f1(y)} l${f1(Math.cos(a)*l)},${f1(Math.sin(a)*l)}" stroke="rgba(52,66,112,.07)" stroke-width=".7"/>`}return o};
const boardSVG=(W,H)=>{const r=RNG(77);const [S,F]=tornPts(W,H,'tlbr',r,4.2);return `<svg class="pp" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
 <defs><clipPath id="c2BoardC"><path d="${pd(S)}"/></clipPath><linearGradient id="c2BoardG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BAC2E6"/><stop offset=".55" stop-color="#A9B3DC"/><stop offset="1" stop-color="#B3BBE0"/></linearGradient></defs>
 <path d="${pd(F)}" fill="rgba(255,255,255,.7)"/>
 <g clip-path="url(#c2BoardC)"><rect width="${W}" height="${H}" fill="url(#c2BoardG)"/><rect width="${W}" height="${H}" fill="url(#c2Grain)" opacity=".8"/>
  <text x="${W-40}" y="300" text-anchor="end" font-family="Pinyon,PinyonX,serif" font-size="150" fill="rgba(255,255,255,.20)" transform="rotate(-7 ${W-40} 300)">Réglages</text>
  <text x="250" y="${H-60}" font-family="Pinyon,PinyonX,serif" font-size="118" fill="rgba(255,255,255,.17)" transform="rotate(-5 250 ${H-60})">le dossier</text>
  <text x="${W-70}" y="${H-150}" text-anchor="end" font-family="Pinyon,PinyonX,serif" font-size="64" fill="rgba(255,255,255,.16)" transform="rotate(-5 ${W-70} ${H-150})">Silver &amp; Brume</text>
  <image href="${IMG.wlily}" x="${W-330}" y="${H-540}" width="300" height="515" opacity=".32" transform="rotate(8 ${W-180} ${H-280})"/>
  <image href="${IMG.wlily}" x="-40" y="40" width="200" height="343" opacity=".22" transform="rotate(-14 60 210)"/>
  ${scratches(W,H,9)}</g></svg>`};

/* ---------------------------------------------------------------- sections */
const g0='g';
const buildDesk=()=>{let h='';
  /* the board */
  h+=`<div class="an c2pc c2-board" data-g="g" data-d="0" data-k="b" data-r="0" style="left:-8px;top:-6px;width:996px;height:878px">${boardSVG(996,878)}</div>`;nd('g').n=1;
  /* a few big translucent sheets for depth (Silver Lily layering) */
  h+=P('g',196,96,330,210,-6,'vellum','',{torn:'rb',cls:'deco'});
  h+=P('g',560,618,370,226,4,'vellum','',{torn:'lt',cls:'deco'});
  /* masthead: a torn newspaper headline */
  h+=P('g',214,8,318,100,-1.8,'news',`<div class="mh"><b class="mh-zh">设置</b><em class="mh-fr">Réglages</em>
     <div class="mh-rule"><span>N<sup>o</sup> 08</span><span>le dossier des préférences</span><span>Trianon</span></div></div>`,{amp:2.8});
  /* section title: a vellum strip */
  h+=P('g',548,28,318,66,1.2,'vellum',`<div class="st-sh" id="stSh"><span class="st-shn" id="stShN">i</span><em id="stShE">Persona</em><b id="stShZ">人设</b><small id="stShS">你在故事里是谁</small></div>`,{torn:'lr',edge:'rgba(255,255,255,.7)'});
  h+=TP('g',536,22,62,22,-14,'blue');
  /* close: a round paper stamp, tacked */
  h+=P('g',884,16,78,78,0,null,`<button class="st-x" type="button" id="stX" aria-label="合上设置"><svg class="x-r" width="78" height="78" viewBox="0 0 78 78" aria-hidden="true"><path d="${perfPath(78,78,3.4,11.5)}" fill="#FDFCF8" transform="rotate(45 39 39) translate(11 11) scale(.72)"/><circle cx="39" cy="39" r="27" fill="#FDFCF8" stroke="#6F80A8" stroke-width="1"/><circle cx="39" cy="39" r="23.5" fill="none" stroke="rgba(111,128,168,.5)" stroke-width=".7" stroke-dasharray="3 3.5"/></svg><span class="x-t"><i>✕</i><b>合上</b><kbd>Esc</kbd></span></button>`,{cls:'c2-close'});
  h+=DC('g',920,6,0,tackSVG(),{k:'t'});
  h+=`<span class="st-saved" id="stSaved" aria-live="polite"><em>enregistré</em><b>已保存</b></span>`;
  /* index: ruled note + label strips */
  h+=P('g',14,120,214,388,-2.2,'ruled',`<div class="ix-hd"><em>Index</em><b>目 录</b></div>`,{torn:'',y0:66,gap:22,mx:26,amp:2.4});
  h+=DC('g',176,108,10,starBadge(34));
  SECS.forEach((s,i)=>{const x=[30,18,34][i],y=188+i*80,r=[-2.6,1.8,-1.4][i];const q=nd('g');const d=q.n*.055;q.n++;q.last=d;
    h+=`<button type="button" class="an st-tab${i?'':' on'}" data-sec="${s.k}" aria-current="${i?'false':'page'}" data-g="g" data-d="${d.toFixed(3)}" data-k="p" data-r="${r}" style="left:${x}px;top:${y}px">
      <i class="tb-bg"></i><span class="tn">${s.n}</span><span class="tz">${s.zh}</span><em class="te">${s.em.toUpperCase()}</em><i class="ey"></i>
      <i class="tb-tape">${tapeSVG(54,22,i*31+5,'milk')}</i></button>`});
  /* config stub: a small receipt */
  h+=P('g',22,548,204,176,2.4,'receipt',`<div class="cfg"><div class="cfg-h">TRIANON · 本机偏好</div><code>localStorage · trianon:*</code><div class="cfg-d">- - - - - - - - - - - -</div><div class="cfg-h">人设与外观只存在这台设备的浏览器里</div><div class="cfg-f">— merci —</div></div>`,{torn:'b',amp:2.2});
  h+=TP('g',90,536,70,22,-4,'grey');
  h+=STK('g',118,470,128,-16,IMG.fmn);
  h+=STK('g',18,742,104,-8,IMG.moon);
  return h};

/* ===================================================================================================
   v3 · fewer tears, more things. Every section keeps one or two torn vellum / letter scraps underneath as an echo of v2;
   the working surfaces are flat die-cut cards (cut edge, milk paper, embossed double rule, sparse stitch, two sparks),
   and each section gets a few photographic antiques re-toned to the project palette (silver / pewter, misty blue,
   milk white, the faintest lotus; leaves pale grey-green) that carry a meaning:
     账户  鎏金椭圆相框→银框 = 头像 · 大理石柱+藕粉玫瑰 = 会员卡靠着它 · 闹钟压书 = 额度与重置 · 银轴卷轴 = API Key
           羽毛笔束 = 签名区（退出登录）· 衔枝白鸽、单珠贝壳 = 点缀
     外观  梳妆镜 = 实时预览（镜面里就是预览）· 台灯 = 日间 · 烛台 = 夜间 · 茶杯 = 点缀
     权限  手摇铃 = 需要确认（02/03 吊牌挂小铃，确认信上铃会摇）· 系缎带的钥匙 = 工具放行 · 跪姿天使 = 守着信任目录
     引擎  留声机 = 引擎在转（正常时飘音符，失败时哑掉）· 沙漏 = 检测中会翻转 · 已认可的雕刻怀表 / 钥匙扣吊牌原样保留
   No object repeats across sections. Decorative ones (dove, shell, teacup) hide with 「贴纸装饰」off; functional ones stay.
   =================================================================================================== */
const rrD=(x,y,w,h,r)=>`M${f1(x+r)},${f1(y)} H${f1(x+w-r)} Q${f1(x+w)},${f1(y)} ${f1(x+w)},${f1(y+r)} V${f1(y+h-r)} Q${f1(x+w)},${f1(y+h)} ${f1(x+w-r)},${f1(y+h)} H${f1(x+r)} Q${f1(x)},${f1(y+h)} ${f1(x)},${f1(y+h-r)} V${f1(y+r)} Q${f1(x)},${f1(y)} ${f1(x+r)},${f1(y)} Z`;
const CARD={milk:['#FDFBF7','#F6F2EA'],silver:['#F0F3F9','#E3E8F3'],lotus:['#FCF6F8','#F3E7EC'],mist:['#DFE5F3','#D2DAEE'],cream:['#FCF9F2','#F4EEE2']};
/* a flat die-cut card drawn to size. o: tone, arch (crest height), hw (crest half width), band (header band height), rule {y0,gap}, staves [y], r, stitch, spark */
const cardSVG=(W,H,o={})=>{const id='c3g'+(UID++);const [c0,c1]=CARD[o.tone||'milk'];const ln=o.ln||'#7D8DB0';const arch=o.arch||0,rr=o.r||9;
  const Pd=d=>arch?crestW(W,H,d,arch,o.hw||Math.min(96,W*.28)):rrD(d,d,W-2*d,H-2*d,Math.max(2,rr-d*.5));
  let x='';
  if(o.band)x+=`<path d="M1.2,${o.band} H${W-1.2}" stroke="rgba(76,93,136,.42)" stroke-width=".8"/><rect x="1.2" y="1.2" width="${W-2.4}" height="${o.band-1.2}" rx="${rr-1}" fill="rgba(214,222,240,.55)" clip-path="url(#${id}c)"/>`;
  if(o.rule)for(let y=o.rule.y0;y<H-14;y+=o.rule.gap)x+=`<path d="M14,${y} H${W-14}" stroke="rgba(108,130,182,.26)" stroke-width=".8"/>`;
  if(o.staves)for(const y0 of o.staves)for(let i=0;i<5;i++)x+=`<path d="M14,${y0+i*6.2} H${W-14}" stroke="rgba(76,93,136,.16)" stroke-width=".7"/>`;
  return `<svg class="pp c3card" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient><clipPath id="${id}c"><path d="${Pd(.6)}"/></clipPath></defs>
   <path d="${Pd(.6)}" fill="url(#${id})" stroke="${ln}" stroke-width="1.2"/>
   <g clip-path="url(#${id}c)"><rect width="${W}" height="${H}" fill="url(#c2Grain)" opacity=".6"/>${x}</g>
   <path d="${Pd(4.6)}" fill="none" stroke="rgba(125,141,176,.48)" stroke-width=".8"/>
   ${o.stitch===false?'':`<path d="${Pd(8.6)}" fill="none" stroke="rgba(131,147,180,.55)" stroke-width=".85" stroke-dasharray="5 6" stroke-linecap="round"/>`}
   <path d="${Pd(1.7)}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width=".9" clip-path="url(#${id}c)" transform="translate(.6 .6)"/>
   ${o.spark===false?'':`<g fill="#9AA8C6">${star4(17,H-17,2.8)}${star4(W-17,H-17,2.8)}</g>`}
   ${arch?`<circle cx="${W/2}" cy="${f1(arch*.62)}" r="3.2" fill="#E4E9F1" stroke="${ln}" stroke-width="1"/>`:''}</svg>`};
/* a card piece (flat, cut) */
const CD=(g,x,y,w,h,r,html,o={})=>{const q=nd(g);const d=o.d!=null?o.d:q.n*.055;q.n++;q.last=d;const tag=o.tag||'div';
  return `<${tag} class="an c2pc c3pc ${o.cls||''}"${o.attr?' '+o.attr:''} data-g="${g}" data-d="${d.toFixed(3)}" data-k="p" data-r="${r}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${o.z||''}">
  ${cardSVG(w,h,o)}<div class="ct">${html||''}</div></${tag}>`};
/* a photographic object: lands with a short drop and settles; sh = contact shadow [left%, width%, bottom px, height px] */
const OB=(g,x,y,w,r,img,o={})=>{const q=nd(g);const d=o.d!=null?o.d:q.n*.055+.12;q.n++;q.last=Math.max(q.last,d);
  const sh=o.sh?`<i class="c3sh" style="left:${o.sh[0]}%;width:${o.sh[1]}%;bottom:${o.sh[2]}px;height:${o.sh[3]}px"></i>`:'';
  return `<i class="an c3ob${o.dec?' c3dec':''} ${o.cls||''}" data-g="${g}" data-d="${d.toFixed(3)}" data-k="o" data-r="${r}" style="left:${x}px;top:${y}px;width:${w}px;z-index:${o.z||''}">${sh}<img src="${img}" alt="" style="width:${w}px">${o.html||''}</i>`};
const O={frame:'asset:settings/o_frame.webp',column:'asset:settings/o_column.webp',clock:'asset:settings/o_clockbooks.webp',scroll:'asset:settings/o_scroll.webp',quills:'asset:settings/o_quills.webp',dove:'asset:settings/o_dove.webp',shell:'asset:settings/o_shell.webp',
  mirror:'asset:settings/o_mirror.webp',lamp:'asset:settings/o_lamp.webp',candle:'asset:settings/o_candle.webp',follow:'asset:settings/o_follow.webp',teacup:'asset:settings/o_teacup.webp',
  bell:'',key:'',angel:'',gram:'asset:settings/o_gramophone.webp',hg:'asset:settings/o_hourglass.webp'};
/* a small hang-tag button (arched die-cut tag on a thread) */
const tagBtn=(txt,a,id)=>`<button class="c3tg" type="button" data-a="${a}"${id?` id="${id}"`:''}><svg class="tg-s" width="20" height="22" viewBox="0 0 20 22" aria-hidden="true"><path d="M10,22 C6,14 13,8 9,0" fill="none" stroke="#8C9AB9" stroke-width="1"/></svg><span class="tg-t">${txt}</span></button>`;

/* I · persona（替换原「账户」）：左边相框 = 当前人设的首字，右边编辑卡，下方是全部人设 */
let PE=null;                      /* 正在编辑的人设 id */
const pList=()=>APP.S.personas,pCur=()=>APP.persona();
const secPersona=()=>{const g='persona';let h='';const L=pList();if(!PE||!L.find(p=>p.id===PE))PE=pCur().id;const E=L.find(p=>p.id===PE)||L[0];
  const ini=[...(E.name||'?').trim()][0]||'?';
  h+=P(g,252,112,470,250,-1.6,'vellum','',{torn:'rb',cls:'deco'});
  h+=P(g,264,122,300,34,-2,null,dymo('人设 Persona · 你在故事里是谁','c2lt'),{cls:'c2-strip'});
  {const q=nd(g);const d=q.n*.055;q.n++;q.last=d;const W=172,H=Math.round(W*731/558);
   h+=`<div class="an c3ob c3av" data-g="${g}" data-d="${d.toFixed(3)}" data-k="o" data-r="-2" style="left:262px;top:168px;width:${W}px;height:${H}px">
    <div class="av-ph" style="left:${f1(W*.155)}px;top:${f1(H*.232)}px;width:${f1(W*.68)}px;height:${f1(H*.648)}px"><b>${esc(ini)}</b><em>${esc(E.name||'')}</em></div>
    <img src="${O.frame}" alt="" style="width:${W}px"></div>`}
  h+=CD(g,276,410,150,52,1.6,`<div class="c3plq"><em>Persona</em><b>${E.id===pCur().id?'当前 · 正在使用':'备用人设'}</b></div>`,{r:7,stitch:false,spark:false});
  h+=CD(g,462,166,300,292,1.2,`<div class="pn-ed">
     <div class="pn-hd"><em>Carte de visite</em><b>${E.id===pCur().id?'当 前 人 设':'编 辑 人 设'}</b></div>
     <label class="pn-f"><span>名字 <small>替换 {{user}}</small></span><input id="stPnName" type="text" maxlength="40" value="${esc(E.name)}" autocomplete="off" spellcheck="false"></label>
     <label class="pn-f"><span>描述 <small>交给后端拼进提示词</small></span><textarea id="stPnDesc" rows="4" maxlength="2000" spellcheck="false" placeholder="外貌、身份、和角色的关系……">${esc(E.desc||'')}</textarea></label>
     <div class="pn-acts">${E.id===pCur().id?'<span class="pn-on">✦ 正在使用</span>':tagBtn('设为当前','pnUse')}${APP.S.defaultPersonaId===E.id?'<span class="pn-on">默认</span>':tagBtn('设为默认','pnDef')}${tagBtn('新建','pnNew')}${L.length>1?tagBtn('删除','pnDel'):''}</div></div>`,{tone:'milk',band:40});
  h+=TP(g,560,152,74,22,6,'blue');
  h+=CD(g,262,484,520,286,-.8,`<div class="pn-ls"><div class="pn-lh"><em>Tous</em><b>全部人设</b><small>${L.length} 位 · 点一下编辑</small></div>
     ${L.map(p=>`<button type="button" class="pn-row${p.id===PE?' sel':''}${p.id===pCur().id?' cur':''}" data-a="pnPick" data-id="${esc(p.id)}"><b>${esc(p.name||'未命名')}</b><span>${esc((p.desc||'还没有描述').slice(0,46))}</span>${p.id===pCur().id?'<i>当前</i>':''}</button>`).join('')}</div>`,{tone:'cream',rule:{y0:58,gap:34}});
  h+=OB(g,800,418,150,8,O.quills,{sh:[20,60,6,12]});
  h+=OB(g,806,140,150,-6,O.dove,{dec:1});
  h+=CD(g,792,640,180,120,2,`<div class="c2nt s">人设存在本机浏览器里。发送时把当前人设的名字和描述交给后端，替换提示词里的 <code>{{user}}</code>。</div>`,{tone:'silver',stitch:false});
  h+=OB(g,690,770,84,-4,O.shell,{dec:1});
  return h};

/* II · appearance */
const sunMoon=`<svg width="74" height="74" viewBox="-37 -37 74 74" aria-hidden="true"><g fill="none" stroke="${L1}" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="-7" cy="-4" r="13" fill="#FCFAF6" stroke-width="1.3"/><g stroke="${L2}" stroke-width="1">${[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4;return `<path d="M${f1(-7+Math.cos(a)*17)},${f1(-4+Math.sin(a)*17)} L${f1(-7+Math.cos(a)*22)},${f1(-4+Math.sin(a)*22)}"/>`}).join('')}</g>
 <path d="M17,-2 A16,16 0 1 1 1,20 A12.5,12.5 0 1 0 17,-2 Z" fill="#DCE2F1" stroke-width="1.3"/></g><g fill="#9AA8C6">${star4(24,-22,3.2)}${star4(-26,22,2.4)}</g></svg>`;
const secAppearance=()=>{const P_=V.appearance,g='appearance';let h='';
  h+=P(g,246,114,470,262,1.6,'vellum','',{torn:'lb',cls:'deco'});
  h+=P(g,262,124,250,34,-2,null,dymo('主题 Thème · 夜间与跟随系统即将推出','c2lt'),{cls:'c2-strip'});
  const TH=[['light','雾蓝日间','Brume','I',`<img class="sw-ob" src="${O.lamp}" alt="" style="width:72px">`],
            ['dark','夜间墨蓝','Encre','II',`<img class="sw-ob" src="${O.candle}" alt="" style="width:94px">`],
            ['auto','跟随系统','Système','III',`<img class="sw-ob sw-fo" src="${O.follow}" alt="" style="width:52px">`]];
  const xs=[262,408,554],ys=[172,180,166],rs=[-3,1,3.4];
  TH.forEach(([v,t,em,n,ob],i)=>{h+=CD(g,xs[i],ys[i],140,206,rs[i],`<span class="sw-in"><i class="sw-st">${ob}</i><span class="sw-n">${n}</span><b>${t}</b><em>${em}</em><span class="sw-v">${v}</span></span>
     <i class="sw-pin">${pinSVG()}</i>`,{tag:'button',cls:'st-sw c3sw sw-'+v+(P_.theme===v?' on':''),attr:`type="button" role="radio" aria-checked="${P_.theme===v}" data-v="${v}"`,arch:14,hw:40})});
  h+=P(g,256,412,452,94,-1.3,null,`<div class="tm"><div class="tm-hd"><b>字号</b><small>正文 · 气泡 · 输入框</small><span class="tm-v" id="stFsV">${esc(P_.fontSize)} px</span></div>
    <div class="st-sl" id="stFs" data-k="appearance.fontSize" data-min="12" data-max="18" data-step=".5" role="slider" tabindex="0" aria-valuemin="12" aria-valuemax="18" aria-valuenow="${esc(P_.fontSize)}" aria-label="字号">
     <i class="tm-body"></i>${[...Array(25)].map((_,i)=>`<i class="sl-tk${i%4===0?' M':i%2===0?' h':''}" style="left:${(i/24*100).toFixed(3)}%">${i%4===0?`<span>${12+i/4}</span>`:''}</i>`).join('')}<i class="sl-th"><i></i></i></div></div>`,{cls:'c2-tape'});
  h+=CD(g,256,522,452,262,1,`<div class="sf">
    <div class="sf-r"><div class="sf-l"><b>界面密度</b><small>行距与留白</small></div>${seg('appearance.density',[['airy','舒展'],['standard','标准'],['compact','紧凑']],P_.density)}</div>
    <div class="sf-r"><div class="sf-l"><b>动效</b><small>吊牌摆动 · 拼贴入场 · 羽毛笔</small></div>${seg('appearance.motion',[['full','完整'],['soft','柔和'],['reduce','减少动效']],P_.motion)}</div>
    <small class="st-note" id="stMoN">减少动效时摆件和卡片直接出现、只留淡入淡出，吊牌不再摆动；系统开启「减少动态效果」时自动跟随。</small>
    <div class="sf-r t"><div class="sf-l"><b>贴纸装饰</b><small>白鸽、贝壳、茶杯这些小摆件，关掉后排版不变</small></div>${tg('appearance.stickers',P_.stickers)}</div></div>`,{staves:[40,118]});
  /* the vanity mirror IS the live preview (glass 14–86 % × 10–65 %) */
  {const q=nd(g);const d=q.n*.055;q.n++;q.last=d;const W=262,H=Math.round(W*701/402);
   h+=`<div class="an c3ob c3mir" data-g="${g}" data-d="${d.toFixed(3)}" data-k="o" data-r="0" style="left:716px;top:96px;width:${W}px;height:${H}px">
    <i class="c3sh" style="left:24%;width:52%;bottom:2px;height:14px"></i><img src="${O.mirror}" alt="" style="width:${W}px">
    <div class="mir-gl" style="left:${f1(W*.142)}px;top:${f1(H*.096)}px;width:${f1(W*.716)}px;height:${f1(H*.552)}px"><div class="st-pv" id="stPv"><div class="pv-win"><img class="pv-st" src="asset:settings/bow.png" alt="" aria-hidden="true">
     <div class="pv-th"><div class="pv-u">明早去玫瑰园吗？</div><div class="pv-who">${esc((APP.S.char.name||'MUSE').toUpperCase().split('').join(' '))}</div><div class="pv-k">好，雾散之前出发。</div></div>
     <div class="pv-cmp"><span><em>Écrivez-moi</em> 说一句话…</span><i></i></div></div></div><i class="mir-sheen"></i></div></div>`}
  h+=CD(g,734,568,232,64,-1,`<div class="c3pvc"><span class="pv-cl"><em>aperçu</em><b>镜 中 预 览</b></span><span class="pv-ft" id="stPvF">雾蓝日间 · 14.5 px · 标准</span></div>`,{r:8,stitch:false,spark:false,z:4});
  const C=APP.S.settings;
  h+=CD(g,730,640,244,196,1.2,`<div class="sf cv"><div class="cv-hd"><em>Conversation</em><b>对 话</b></div>
    <div class="sf-r"><div class="sf-l"><b>流式输出</b><small>关掉后整段一次出现</small></div>${tg('chat.stream',C.stream!==false)}</div>
    <div class="sf-r"><div class="sf-l"><b>书写动画</b><small>羽毛笔写字</small></div>${tg('chat.anim',C.anim!==false)}</div>
    <div class="sf-r"><div class="sf-l"><b>推理默认展开</b><small>斟酌块</small></div>${tg('chat.reasoningOpen',!!C.reasoningOpen)}</div></div>`,{tone:'silver'});
  h+=OB(g,620,790,90,4,O.teacup,{dec:1,sh:[8,84,2,10]});
  return h};

/* III · permission：已删除 */
const tagShape=(W,H,c)=>`M${c},0 L${W-c},0 L${W},${c} L${W},${H} L0,${H} L0,${c} Z`;

/* III · connection（替换原「引擎」）：留声机 = 后端在转，沙漏 = 正在连接；日志是一张小票 */
const CONN={ready:['En ligne','已连接','后端在线，可以写信了'],connecting:['Connexion…','正在连接','正在等后端回应'],reconnecting:['Reconnexion','连接断开','正在重连'],failed:['Hors ligne','连接失败','后端没有回应']};
const connHTML=()=>{const A=APP.S,c=CONN[A.conn.state]||[A.conn.state,A.conn.state,''];const mock=window.__trianon.usingMock;
  const cap=(k,t)=>`<span class="cn-cap${A.caps[k]===false?' no':''}">${A.caps[k]===false?'✕':'✓'} ${t}</span>`;
  return `<div class="cn-st" data-s="${esc(A.conn.state)}"><em>${c[0]}</em><b>${c[1]}</b><small>${esc(c[2])}${A.conn.state==='reconnecting'&&A.conn.retryIn?`（${esc(A.conn.retryIn)} 秒后重试）`:''}</small></div>
    <dl class="cn-dl"><dt>后端</dt><dd>${mock?'内置模拟后端 · 演示用':'宿主页面'}</dd><dt>模型</dt><dd>${esc(A.model||'—')}</dd><dt>角色</dt><dd>${esc(A.char.name||'—')}</dd></dl>
    <div class="cn-caps">${cap('streaming','流式')}${cap('reasoning','推理')}${cap('stop','停止')}${cap('regenerate','重新生成')}</div>`};
const logHTML=()=>{const L=window.__trianon.log.slice(-15).reverse();const p=n=>String(n).padStart(2,'0');
  return `<div class="cn-lg"><div class="cn-lh">JOURNAL · 接口日志</div>${L.length?L.map(([t,d,e])=>{const x=new Date(t);return `<div class="cn-l"><i>${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}</i><b>${d==='in'?'←':'→'}</b><span>${esc(e)}</span></div>`}).join(''):'<div class="cn-l"><span>还没有记录</span></div>'}<div class="cn-lf">— fin —</div></div>`};
const secConnection=()=>{const g='connection';let h='';
  h+=P(g,250,112,440,240,-1.2,'vellum','',{torn:'rb',cls:'deco'});
  h+=P(g,262,122,320,34,-2,null,dymo('连接 Connexion · 前端只认 window.__trianon','c2lt'),{cls:'c2-strip'});
  h+=CD(g,262,168,380,300,-1,`<div class="cn" id="stCn">${connHTML()}</div><div class="cn-acts">${tagBtn('刷新','cnRefresh')}${window.__trianon.usingMock?tagBtn('模拟断线','cnDrop'):''}</div>`,{tone:'milk',band:0});
  h+=P(g,672,118,280,560,1.8,'receipt',`<div id="stLg">${logHTML()}</div>`,{torn:'tb',amp:2.4});
  h+=OB(g,276,500,220,-2,O.gram,{sh:[12,70,4,16]});
  h+=OB(g,548,560,86,6,O.hg,{sh:[14,72,2,10]});
  h+=CD(g,486,764,330,84,-1.4,`<div class="c2nt s">接口文档在仓库的 <code>docs/BRIDGE.md</code>。没接后端时自动使用内置的模拟后端。</div>`,{tone:'silver',stitch:false});
  return h};
const drawConn=()=>{const a=$('stCn'),b=$('stLg');if(a)a.innerHTML=connHTML();if(b)b.innerHTML=logHTML()};

/* ---------------------------------------------------------------- DOM */
const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');defs.setAttribute('width','0');defs.setAttribute('height','0');defs.style.position='absolute';
defs.innerHTML=`<defs><linearGradient id="stPaperG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDFBF7"/><stop offset="1" stop-color="#F7F3EC"/></linearGradient><linearGradient id="stPaperR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDF9F8"/><stop offset="1" stop-color="#F8F0F1"/></linearGradient>
 <pattern id="c2Grain" patternUnits="userSpaceOnUse" width="256" height="256"><image href="asset:settings/grain.png" width="256" height="256"/></pattern>
 <radialGradient id="c2Stain"><stop offset="0" stop-color="rgba(196,170,120,.10)"/><stop offset=".7" stop-color="rgba(196,170,120,.05)"/><stop offset="1" stop-color="rgba(196,170,120,0)"/></radialGradient>
 <clipPath id="c2TagC"><path d="${tagShape(156,266,22)}"/></clipPath></defs>`;b.appendChild(defs);
const root=document.createElement('div');root.id='stSet';root.setAttribute('role','dialog');root.setAttribute('aria-label','设置');root.setAttribute('aria-hidden','true');
root.innerHTML=`<div class="st-sheet c2-desk" id="stSheet">${buildDesk()}
 <i class="st-charm" id="stCharm">${charmSVG()}</i>
 <section class="st-sec on" data-sec="persona">${secPersona()}</section>
 <section class="st-sec" data-sec="appearance">${secAppearance()}</section>
 <section class="st-sec" data-sec="connection">${secConnection()}</section></div>`;
b.appendChild(root);
const sheet=$('stSheet'),charm=$('stCharm'),cStrand=charm.querySelector('.ch-strand'),cNum=charm.querySelector('.ch-num');
const tabs=[...root.querySelectorAll('.st-tab')],secs=[...root.querySelectorAll('.st-sec')];
const saved=$('stSaved');
let ANS=[];
const refs=()=>{
  /* every animated piece, with its own seeded flight */
  ANS=[...root.querySelectorAll('.an')].map((el,i)=>{const r=RNG(i*977+13);return {el,g:el.dataset.g,d:+el.dataset.d,k:el.dataset.k,r:+el.dataset.r,
    ox:(r()-.5)*90,oy:-70-r()*80,or:(r()-.5)*14,ex:(r()-.35)*130,es:r()<.5?-1:1,last:''}})};
refs();

/* ---------------------------------------------------------------- state */
const S={open:false,oT:-99,cT:-99,sec:'persona',secT:-99,prevSec:null,swT:-99,from:[0,0],to:[0,0],swA:0,
  cf:null,health:{state:'idle',t:-99},savedT:-99,marks:{},prevOn:null,lastSec:'persona',htKey:'',htSwT:-99,pmT:-99,pmKey:''};
const motionK=()=>RMQ.matches||V.appearance.motion==='reduce'?0:V.appearance.motion==='soft'?.5:1;
/* the eyelet at the right end of a label strip, in desk coordinates (strip rotation taken into account) */
const eyelet=k=>{const t=tabs[SECS.findIndex(s=>s.k===k)];const w=t.offsetWidth,h=t.offsetHeight,r=(+t.dataset.r)*Math.PI/180;
  const on=t.classList.contains('on');const dx=on?12:0;const ex=w/2-11,ey=0;return [t.offsetLeft+w/2+dx+ex*Math.cos(r)-ey*Math.sin(r),t.offsetTop+h/2+ex*Math.sin(r)+ey*Math.cos(r)]};

/* ---------------------------------------------------------------- the request bridge (page → back end) */
const T_=[];const later=(s,f)=>{const id=setTimeout(f,s*1000);T_.push(id);return id};
const save=(key,val)=>{const [grp,k]=key.split('.');
  if(grp==='appearance'){V.appearance[k]=val;APP.S.settings.appearance=Object.assign({},V.appearance)}
  else if(grp==='chat')APP.S.settings[k]=val;
  APP.saveSettings();APP.bus.emit('ui:settings',key);showSaved()};

/* ---------------------------------------------------------------- open / close / switch */
const fitSheet=()=>{const z=Math.min(1,(innerWidth-6)/1000,(innerHeight-6)/890),W=innerWidth/z,H=innerHeight/z;
  root.style.setProperty('--stz',z.toFixed(3));root.style.setProperty('--stl',(W>=1124?124:Math.max(0,(W-980)/2)).toFixed(1)+'px');root.style.setProperty('--stt',Math.max(0,Math.min(18,(H-864)/2)).toFixed(1)+'px')};
addEventListener('resize',fitSheet);
const open=(sec)=>{const t=sT();fitSheet();if(!S.open){clearTimeout(S.lyT);b.classList.add('ly-st');S.open=true;S.oT=t;root.classList.add('on');root.setAttribute('aria-hidden','false');b.classList.add('st-open');
    go(sec||S.lastSec,true);S.secT=t+.42;S.marks.open=t}
  else if(sec)go(sec)};
const close=()=>{if(!S.open)return;const t=sT();S.open=false;S.cT=t;root.setAttribute('aria-hidden','true');b.classList.remove('st-open');S.marks.close=t;
  S.lyT=setTimeout(()=>{if(!S.open){b.classList.remove('ly-st');root.classList.remove('on')}},520)};
const go=(k,instant)=>{const t=sT();const i=SECS.findIndex(s=>s.k===k);if(i<0)return;const was=S.sec;if(was===k&&!instant)return;
  const fromE=S.open&&!instant?charmPos(t):null;
  S.sec=k;S.lastSec=k;
  tabs.forEach((e,j)=>{e.classList.toggle('on',j===i);e.setAttribute('aria-current',j===i?'page':'false')});
  secs.forEach(e=>{const on=e.dataset.sec===k;e.classList.toggle('on',on);e.classList.toggle('out',!on&&e.dataset.sec===was&&!instant)});
  const s=SECS[i];$('stShN').textContent=s.n;$('stShE').textContent=s.em;$('stShZ').textContent=s.zh;$('stShS').textContent=s.sub;
  const h=$('stSh');h.classList.remove('flip');void h.offsetWidth;h.classList.add('flip');
  const to=eyelet(k);
  if(instant){S.from=S.to=to;S.prevSec=null;S.swT=-99;S.secT=t}
  else{S.from=fromE||to;S.to=to;S.prevSec=was;S.swT=t;S.secT=t+.26;S.swA=(to[1]>S.from[1]?-1:1)*Math.min(16,5+Math.abs(to[1]-S.from[1])/12)}
  cNum.textContent=s.n;S.marks['sec:'+k]=t;
  if(k==='connection')drawConn()};
const charmPos=t=>{const k=motionK(),u=eio((t-S.swT)/.5);if(!k||t-S.swT>.5)return S.to;
  return [S.from[0]+(S.to[0]-S.from[0])*u,S.from[1]+(S.to[1]-S.from[1])*u-Math.sin(Math.PI*cl((t-S.swT)/.5))*30]};
const swing=t=>{const k=motionK();if(!k)return 0;let r=0;const a=t-S.swT;if(a>=0&&a<6)r+=S.swA*Math.exp(-2.4*a)*Math.sin(2*Math.PI*a/1.1+.4);
  const o=t-S.oT-.7;if(S.open&&o>=0&&o<6)r+=10*Math.exp(-2.2*o)*Math.cos(2*Math.PI*o/1.15);
  return r*k};
const showSaved=()=>{S.savedT=sT()};

/* ---------------------------------------------------------------- appearance preview */
const THN={light:'雾蓝日间',dark:'夜间墨蓝',auto:'跟随系统'},DEN={airy:'舒展',standard:'标准',compact:'紧凑'},MON={full:'完整动效',soft:'柔和动效',reduce:'减少动效'};
const applyPreview=()=>{const P_=V.appearance,pv=$('stPv');
  pv.dataset.theme=P_.theme;pv.dataset.density=P_.density;pv.dataset.motion=P_.motion;pv.classList.toggle('nost',!P_.stickers);
  pv.style.setProperty('--pfs',(P_.fontSize*.8).toFixed(2)+'px');
  $('stPvF').textContent=`${THN[P_.theme]} · ${esc(P_.fontSize)} px · ${DEN[P_.density]} · ${MON[P_.motion]}`;
  root.classList.toggle('nost',!P_.stickers);root.classList.toggle('rm',P_.motion==='reduce');
  const sl=$('stFs'),u=(P_.fontSize-12)/6;sl.style.setProperty('--u',u.toFixed(4));sl.setAttribute('aria-valuenow',P_.fontSize);$('stFsV').textContent=P_.fontSize+' px'};
const setFont=(v,commit)=>{v=Math.round(Math.max(12,Math.min(18,v))*2)/2;if(v!==V.appearance.fontSize){V.appearance.fontSize=v;applyPreview()}if(commit)save('appearance.fontSize',v)};

/* ---------------------------------------------------------------- engine health tag + postmark */
const htHTML=()=>{const H=S.health,E=V.engine,st=H.state;
  const w=`<div class="ht-w"><svg width="46" height="56" viewBox="-23 -31 46 56" aria-hidden="true"><g transform="translate(0 2)">${engWatch({R:17,full:false,hg:false})}</g></svg></div>`;
  if(st==='checking')return `<div class="ht-b">${w}<div class="ht-hd"><em>${H.restart?'Remontage':'Auscultation'}</em><b>${H.restart?'正在重启引擎':'正在检测引擎'}</b><div class="ht-sub">${H.restart?'收拾旧进程 · 重新上发条':'等引擎回话…'}</div></div></div>
    <div class="ht-steps"><div class="ht-st ok"><span class="mk">${CHECK}</span><span>找到 demo-engine.exe</span></div><div class="ht-st now"><span class="mk">✦</span><span>GET example.com/demo/health</span></div><div class="ht-st todo"><span class="mk">◇</span><span>GET example.com/demo/version</span></div></div>`;
  if(st==='ok')return `<div class="ht-b">${w}<div class="ht-hd"><em>En marche</em><b>引擎正常</b><div class="ht-sub">${H.restart?'已重新启动 · ':''}example.com:${esc(E.port)}</div></div></div>
    <div class="ht-bd">${obadge('版 本',H.version||E.version)}${obadge('耗 时',(H.ms||0)+' ms')}</div><div class="ht-mono">demo health → { "ok": true }</div>`;
  if(st==='fail')return `<div class="ht-b">${w}<div class="ht-hd"><em>Halte</em><b>检测失败</b><div class="ht-sub">example.com:${esc(E.port)} 没有回应</div></div></div>
    <div class="ht-bd">${obadge('错 误',H.error||'ECONNREFUSED','r')}${obadge('等 待',((H.ms||1500)/1000).toFixed(1)+' s','r')}</div>
    <div class="ht-tip">端口可能被占用或进程已退出。试试<button type="button" class="ht-go" data-a="restart">重启引擎</button></div>`;
  return `<div class="ht-b">${w}<div class="ht-hd"><em>Repos</em><b>还没检测</b><div class="ht-sub">点「检测」问一声引擎</div></div></div><div class="ht-mono">GET example.com/demo/health</div>`};
let htR={};
const drawPM=()=>{const H=S.health,E=V.engine;const key=H.state+'|'+H.ms+'|'+E.port;if(key===S.pmKey)return;S.pmKey=key;
  if(H.state==='ok'){pm.innerHTML=postmark('c2pmE','KIMI · HEALTH',`example.com:${E.port}`,'OK',`${H.version||E.version} · ${H.ms||0}ms`,'#4D63A3',134,false);pm.className='c2-pm ok';S.pmT=H.t}
  else if(H.state==='fail'){pm.innerHTML=postmark('c2pmE','HALTE · 检测失败',`example.com:${E.port}`,'FAIL',`${(H.error||'ECONNREFUSED')} · ${((H.ms||1500)/1000).toFixed(1)}s`,'#9A6378',134,false);pm.className='c2-pm fail';S.pmT=H.t}
  else{pm.className='c2-pm';pm.innerHTML=''}};
const drawHT=(force)=>{const key=S.health.state+'|'+(S.health.restart?1:0)+'|'+V.engine.port+'|'+S.health.ms;if(!force&&key===S.htKey)return;S.htKey=key;htIn.innerHTML=htHTML();
  ht.classList.toggle('rose',S.health.state==='fail');root.dataset.eh=S.health.state;htR={h:htIn.querySelector('.w-h'),m:htIn.querySelector('.w-m'),s:htIn.querySelector('.w-s'),fl:htIn.querySelector('.w-fl'),R:17};S.fwH='';drawPM()};
const flute=(g,R,ph)=>{const k=R/26,w=9.6*k,n=4,sp=w/(n+.2);let o='';for(let i=0;i<n;i++){let x=-w/2+sp*(i+.6)+((ph%1)*sp);if(x>w/2-.6)x-=w-.6;o+=`<path d="M${f1(x)},${f1(-32.6*k)} V${f1(-28.6*k)}"/>`}g.innerHTML=o};
const drawWatch=(R,t)=>{if(!R||!R.h)return;const H=S.health,a=t-H.t,k=motionK();let h=320.5,mi=246,s=null,fl=0;
  if(H.state==='checking'){s=k?(Math.floor(a*2)+eo((a*2)%1/.25))*30:90;mi=246+(k?a*40:0);fl=k?a*1.4:0}
  else if(H.state==='fail'){s=137}
  R.h.setAttribute('transform',`rotate(${h.toFixed(1)})`);R.m.setAttribute('transform',`rotate(${mi.toFixed(1)})`);
  R.s.style.display=s==null?'none':'';if(s!=null)R.s.setAttribute('transform',`rotate(${s.toFixed(1)})`);
  if(R.fl&&(R._fl==null||Math.abs(R._fl-fl)>.01)){R._fl=fl;flute(R.fl,R.R,fl)}};
/* the big watch on the doily ticks along with the check */
let bigW=null;const bigWatch=t=>{if(!bigW){const e=root.querySelector('.ew');if(!e)return;bigW={h:e.querySelector('.w-h'),m:e.querySelector('.w-m'),s:e.querySelector('.w-s'),fl:e.querySelector('.w-fl'),R:EW_R,arc:e.querySelector('.ew-arc'),tip:e.querySelector('.ew-tip')}}
  const H=S.health,k=motionK(),a=t-H.t;let p=0;
  if(H.state==='checking')p=k?cl(a/1.5)*.92:.5;else if(H.state==='ok')p=1;else if(H.state==='fail')p=.62;
  const C=2*Math.PI*31.5;if(bigW.arc){bigW.arc.setAttribute('stroke-dasharray',`${(C*p).toFixed(1)} 400`);bigW.arc.setAttribute('stroke',H.state==='fail'?'#B48C9C':'#6F82AC')}
  if(bigW.tip)bigW.tip.setAttribute('transform',`rotate(${(p*360).toFixed(1)})`);
  drawWatch(bigW,t)};

/* ---------------------------------------------------------------- 重建（人设增删、连接变化时） */
const rebuild=sec=>{const keep=S.sec;const i=SECS.findIndex(x=>x.k===(sec||keep));
  if(!sec||sec==='persona')secs[0].innerHTML=secPersona();
  if(!sec||sec==='appearance'){secs[1].innerHTML=secAppearance();applyPreview()}
  if(!sec||sec==='connection')secs[2].innerHTML=secConnection();
  refs();if(S.open){const t=sT();ANS.forEach(A=>{if(A.g===(sec||keep))A.d=-9});S.secT=Math.min(S.secT,t-1)}};
APP.bus.on('ui:conn',()=>{if(S.open&&S.sec==='connection')drawConn()});
APP.bus.on('ui:model',()=>{if(S.open&&S.sec==='connection')drawConn()});
APP.bus.on('ui:caps',()=>{if(S.open&&S.sec==='connection')drawConn()});

/* ---------------------------------------------------------------- interaction */
let drag=null;
root.addEventListener('click',e=>{const t=e.target;
  const tab=t.closest('.st-tab');if(tab){go(tab.dataset.sec);return}
  if(t.closest('#stX')){close();return}
  const tgl=t.closest('.st-tg');if(tgl){const on=!tgl.classList.contains('on');const lab=tgl.dataset.l.split('|');tgl.classList.toggle('on',on);tgl.setAttribute('aria-checked',on);tgl.querySelector('.tl').textContent=on?lab[0]:lab[1];
    save(tgl.dataset.k,on);if(tgl.dataset.k==='appearance.stickers')applyPreview();return}
  const sb=t.closest('.st-seg button');if(sb){const g=sb.parentElement;g.querySelectorAll('button').forEach(x=>{const on=x===sb;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});
    save(g.dataset.k,sb.dataset.v);applyPreview();return}
  const sw=t.closest('.st-sw');if(sw){root.querySelectorAll('.st-sw').forEach(x=>{const on=x===sw;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});save('appearance.theme',sw.dataset.v);applyPreview();S.marks['theme:'+sw.dataset.v]=sT();return}
  const a=t.closest('[data-a]');if(!a)return;const act=a.dataset.a;e.preventDefault();
  const L=APP.S.personas;
  if(act==='pnPick'){PE=a.dataset.id;rebuild('persona')}
  else if(act==='pnUse'){APP.setPersona(PE);rebuild('persona');showSaved()}
  else if(act==='pnDef'){APP.setDefaultPersona(PE);rebuild('persona');showSaved()}
  else if(act==='pnNew'){const p={id:'p_'+Date.now().toString(36),name:'新的人设',desc:''};L.push(p);PE=p.id;APP.savePersonas();rebuild('persona');setTimeout(()=>{const i=$('stPnName');if(i){i.focus();i.select()}},60)}
  else if(act==='pnDel'){if(L.length<2)return;const i=L.findIndex(p=>p.id===PE);if(i<0)return;const was=L[i].id;L.splice(i,1);if(APP.S.personaId===was)APP.setPersona(L[0].id);PE=APP.S.personaId;APP.savePersonas();rebuild('persona');showSaved()}
  else if(act==='cnRefresh')drawConn();
  else if(act==='cnDrop'){window.__trianon.mock&&window.__trianon.mock.disconnect();later(.1,drawConn)}});
const slVal=(el,x)=>{const r=el.getBoundingClientRect();const u=cl((x-r.left)/r.width);return 12+u*6};
root.addEventListener('pointerdown',e=>{const sl=e.target.closest('.st-sl');if(!sl)return;drag=sl;sl.setPointerCapture&&sl.setPointerCapture(e.pointerId);setFont(slVal(sl,e.clientX))});
root.addEventListener('pointermove',e=>{if(drag)setFont(slVal(drag,e.clientX))});
root.addEventListener('pointerup',()=>{if(drag){drag=null;save('appearance.fontSize',V.appearance.fontSize)}});
root.addEventListener('keydown',e=>{const sl=e.target.closest&&e.target.closest('.st-sl');if(sl&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();setFont(V.appearance.fontSize+(e.key==='ArrowRight'?.5:-.5),true)}});
root.addEventListener('input',e=>{const id=e.target.id;if(id!=='stPnName'&&id!=='stPnDesc')return;const p=APP.S.personas.find(x=>x.id===PE);if(!p)return;
  if(id==='stPnName'){p.name=e.target.value;const av=root.querySelector('.c3av .av-ph');if(av){av.querySelector('b').textContent=[...(p.name||'?').trim()][0]||'?';av.querySelector('em').textContent=p.name}}else p.desc=e.target.value;
  clearTimeout(S.pnT);S.pnT=setTimeout(()=>{APP.savePersonas();if(p.id===APP.S.personaId)APP.bus.emit('ui:persona');showSaved()},500)});
root.addEventListener('change',e=>{const id=e.target.id;const m={}[id];if(m)save(m,id==='stPort'?(+e.target.value||58627):e.target.value)});
addEventListener('keydown',e=>{if(!S.open)return;
  if(e.key==='Tab'&&S.cf){const fs=[...cfL.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(x=>x.getClientRects().length);
    if(fs.length){e.preventDefault();e.stopPropagation();const i=fs.indexOf(document.activeElement),n=e.shiftKey?(i<=0?fs.length-1:i-1):(i<0||i===fs.length-1?0:i+1);fs[n].focus({preventScroll:true})}return}
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}},true);

/* ---------------------------------------------------------------- per-frame: the pieces fly, land, slap, slide away */
const eob=u=>{u=cl(u);const c1=1.9,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2)};
const pose=(A,t,k)=>{const el=A.el;let tx=0,ty=0,dr=0,sc=1,op=1,vis=true;
  const g=A.g;let t0;
  if(g==='g'){if(!S.open){const a=t-S.cT;const u=k?eio(a/.42):cl(a/.22);op=1-u;if(k){ty=26*u;tx=-10*u}}t0=S.oT}
  else{ if(g===S.sec&&S.open){t0=S.secT}
    else if(g===S.prevSec&&S.open){const a=t-S.swT-A.d*.35;const u=k?eio(a/.42):cl(a/.24);if(u>=1)vis=false;op=1-u;if(k){tx=A.ex*u;ty=-46*u;dr=10*A.es*u;sc=1+.04*u}
      return {tx,ty,dr,sc,op,vis}}
    else if(g===S.sec&&!S.open){const a=t-S.cT;const u=k?eio(a/.42):cl(a/.22);op=1-u;if(k){ty=26*u;tx=-10*u}t0=-99}
    else return {vis:false}}
  if(t0>-90&&S.open){const a=t-t0-A.d;
    if(A.k==='b'){const u=k?eo(a/.5):cl(a/.25);op=cl(k?u*1.5:u);if(k){sc=.985+.015*u;ty=14*(1-u)}}
    else if(A.k==='t'){const u=a/.22;op=cl(a/.05);if(k)sc=1.32-.32*eob(u);if(a<0)op=0}
    else if(A.k==='m'){const u=a/.2;op=cl(a/.04)*(1);if(k)sc=1.5-.5*eo(u);if(a<0)op=0}
    else if(A.k==='o'){const u=a/.5;op=cl(a/.12);if(k){ty=-30*(1-eob(u));sc=1.03-.03*eo(u)}if(a<0)op=0}
    else if(A.k==='s'){const u=a/.4;op=cl(a/.1);if(k){sc=.55+.45*eob(u);dr=-12*(1-eo(u))}if(a<0)op=0}
    else{const u=k?eo(a/.55):cl(a/.22);op=cl(a/.16);if(k){tx=A.ox*(1-u);ty=A.oy*(1-u);dr=A.or*(1-u);sc=1+.06*(1-u)}if(a<0)op=0}}
  return {tx,ty,dr,sc,op,vis}};
const frame=()=>{const t=sT(),k=motionK();
  let anyVis=false;
  if(S.open){root.style.visibility='visible';anyVis=true}else{const a=t-S.cT;anyVis=a<.5;root.style.visibility=anyVis?'visible':'hidden'}
  if(anyVis)for(const A of ANS){const p=pose(A,t,k);let s;
    if(p.vis===false)s='hide';else s=`translate(${p.tx.toFixed(2)}px,${p.ty.toFixed(2)}px) rotate(${(A.r+p.dr).toFixed(3)}deg) scale(${p.sc.toFixed(4)})|${p.op.toFixed(3)}`;
    if(s!==A.last){A.last=s;if(s==='hide'){A.el.style.visibility='hidden'}else{const [tr,op]=s.split('|');A.el.style.visibility='';A.el.style.transform=tr;A.el.style.opacity=op}}}
  secs.forEach(e=>{const on=e.dataset.sec===S.sec;e.style.pointerEvents=on&&S.open?'':'none';e.style.zIndex=on?3:2});
  /* the key-ring charm on the current label strip */
  const cp=charmPos(t),r=swing(t);const ca=t-S.oT-.62;const cv=S.open?(k?eo(ca/.4):1):0;
  charm.style.opacity=(S.open?cl(k?ca/.15:ca/.2+1):Math.max(0,1-(t-S.cT)/.3)).toFixed(3);
  charm.style.transform=`translate(${(cp[0]-30).toFixed(2)}px,${(cp[1]-8-(k?46*(1-cv):0)).toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
  const rs=k?(swing(t-.18)-r)*1.6:0;cStrand.setAttribute('transform',`rotate(${rs.toFixed(2)} 5.2 9)`);
  /* saved badge */
  const sa=t-S.savedT,so=sa<0?0:k?cl(sa/.16)*(1-cl((sa-1.9)/.45)):(sa<2.2?1:0);saved.style.opacity=so.toFixed(3);
  saved.style.transform=`scale(${(k?1.3-.3*eo(sa/.22):1).toFixed(3)}) rotate(${(k?-12+4*eo(sa/.4):-8).toFixed(2)}deg)`;
  /* confirm: letter slides under, window pops, seal drops */
  if(S.cf){const C=S.cf,a=t-C.t;
    let u=k?eo(a/.42):cl(a/.2);if(C.closeT!=null&&C.closeT>0){u*=1-(k?eio((t-C.closeT)/.32):cl((t-C.closeT)/.2))}
    cf.style.setProperty('--cfu',u.toFixed(3));
    cfLt.style.opacity=cl(u*1.6).toFixed(3);cfLt.style.transform=`translate(${k?(-40*(1-u)).toFixed(2):0}px,${k?(30*(1-u)).toFixed(2):0}px) rotate(${(-2.4-(k?6*(1-u):0)).toFixed(3)}deg)`;
    const wu=k?cl((a-.16)/.3):1;const wv=C.closeT>0?u:eob(wu);cfL.style.opacity=cl(C.closeT>0?u:wu*3).toFixed(3);cfL.style.transform=`scale(${(k?.86+.14*wv:1).toFixed(4)}) rotate(.6deg)`;
    const su=k?cl((a-.4)/.24):1;cfSeal.style.opacity=(cl(su*2.5)*(C.closeT>0?u:1)).toFixed(3);cfSeal.style.transform=`scale(${(1.5-.5*eo(su)).toFixed(3)}) rotate(${(-18+10*eo(su)).toFixed(2)}deg)`;
    const du=C.done?(k?cl((t-C.done)/.22):1):0;cfS.style.opacity=(.9*du).toFixed(3);cfS.style.transform=`translate(-50%,-50%) rotate(-9deg) scale(${(1.3-.3*eo(du)).toFixed(3)})`}
  /* health tag */
  if(S.sec==='engine'||S.health.state!=='idle'){drawHT();const cw=htCard.offsetWidth,ch=htCard.offsetHeight,kk=cw+'x'+ch+(S.health.state==='fail'?'r':'');
    if(kk!==S.fwH&&cw>0){S.fwH=kk;htFw.innerHTML=frameSVG(cw,ch,S.health.state==='fail').replace('url(#egPaperG)',S.health.state==='fail'?'url(#stPaperR)':'url(#stPaperG)')}
    const ha=t-S.htSwT;let hr=0;if(k&&ha>=0&&ha<5)hr=4*k*Math.exp(-2.6*ha)*Math.sin(2*Math.PI*ha/1.0);
    if(k&&S.health.state==='checking')hr+=1.2*k*Math.sin(2*Math.PI*(t-S.health.t)/1.6);
    const sa2=t-S.secT;if(k&&S.sec==='engine'&&sa2>=0&&sa2<5)hr+=5*k*Math.exp(-2.4*sa2)*Math.cos(2*Math.PI*sa2/1.05);
    ht.style.transform=`rotate(${hr.toFixed(3)}deg)`;htStrand.setAttribute('transform',`rotate(${(k?hr*-1.4:0).toFixed(2)} 123.5 28.5)`);
    drawWatch(htR,t);bigWatch(t);
    /* postmark: thumped down (only on the engine page) */
    pm.style.visibility=S.sec==='engine'?'':'hidden';
    const pa=t-S.pmT;if(pm.innerHTML){const u=k?cl(pa/.16):1;pm.style.opacity=(cl(pa/.04)*(S.health.state==='fail'?.86:.84)).toFixed(3);pm.style.transform=`rotate(${S.health.state==='fail'?8:-11}deg) scale(${(k?1.6-.6*eo(u):1).toFixed(3)})`}}
  requestAnimationFrame(frame)};

/* ---------------------------------------------------------------- boot */
const boot=()=>{applyPreview();requestAnimationFrame(frame)};
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>requestAnimationFrame(boot));
const api={open,close,go,rebuild,V,S,get isOpen(){return S.open}};
window.__set=api;window.Trianon.settings=api;
})();
