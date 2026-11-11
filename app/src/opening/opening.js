/* Trianon ST 版开场：取自原版 rococo_v2_opening.js。改动：字标换成 Trianon；舞台按视口缩放；
   拉远时缩放的是真实页面（.app）而不是截图，徽章落到页面上邮戳的实际位置，所以任何窗口尺寸、手机上都能接上。
   以下为原注释。
   rococo v2 合并版 · 开场「Ouverture」(o1v v1c 并入主成品, 2026-10-28 12:54)
   Runs in <head> ahead of every page script, so its window-capture input guard sees every event before the app does.
   When it plays
     · launch with no hash ................ full 4.5 s (128 BPM, o1v timeline + 0.28 s dissolve) the first time on a calendar day, then ~1.25 s
                                             (logo lands → pull-back onto the page) for every later launch that day
     · #ouverture / #opening .............. always the full version · #ouverture-short / #opening-short → the short one
     · #noouverture / #noopening, or any other hash ... never (every cap_* / reg_* script names a page, so they are untouched)
     · prefers-reduced-motion ............. a plain fade: logo in, hold, fade onto the page (1.9 s; 0.85 s for a same-day relaunch)
   Any key / click skips: the whole overlay fades away over the real page in 0.25 s.
   How it hands over (no still at the end): while the overlay is opaque the app is held (html.kop-hold: body content-visibility
   + visibility hidden, so it is neither painted nor laid out); the engine's cold-boot demo is kept quiet (window.__opQuiet → __navQuiet)
   and the empty page is told to skip its own entrance and sit in its resting pose (window.__emptyAtRest / __emptyRest(), the one
   switch build_rococo_v2.py adds to rococo_v2_empty.js). The pull-back zooms a screenshot of that resting page (o1v/a, greeting
   patched to the current time of day, postmark date drawn live from the page's own <text> nodes) from 2.2x to 1x; the page is
   unheld just before (a still moment of the logo), and when the still has landed at 1x — the same pixels as the page under it —
   it dissolves onto the real DOM in 0.28 s (whatever differs, the watch hands, a parallax px, dissolves instead of jumping).
   The body is never transformed. Then the overlay, its stylesheet, template, fonts and listeners are removed; nothing of it stays.
   API (tests): window.__opening {mode, state, t(), skip(), T}; event 'ouverture:done' {detail:{mode,how}}. */
(()=>{
const D=document,R=D.documentElement,W=window;
const css=D.getElementById('kOpCss'),tpl=D.getElementById('kOpTpl'),meta=D.getElementById('kOpMeta');
const drop=()=>{[css,tpl,meta].forEach(e=>e&&e.remove())};
/* hash switches: #ouverture (= #opening) full · #ouverture-short (= #opening-short) · #noouverture (= #noopening) off.
   The #…opening spellings are rewritten at once to the #…ouverture ones: rococo_v2.js opens the rail on any hash that merely
   contains "open" (location.hash.includes('open')), so an "opening" token must not survive into the page's own hash checks. */
const AL={opening:'ouverture','opening-short':'ouverture-short',noopening:'noouverture'};
const H0=decodeURIComponent(location.hash.slice(1)).split(/[&,]/).filter(Boolean),H=H0.map(k=>AL[k]||k);
if(H.some((k,i)=>k!==H0[i])){history.replaceState(null,'','#'+H.join('&'));if(Array.isArray(W.__navHash))W.__navHash=W.__navHash.map(k=>AL[k]||k)}
const FORCE=H.includes('ouverture'),FSHORT=H.includes('ouverture-short');
const play=!H.includes('noouverture')&&(FORCE||FSHORT||H.length===0)&&!!tpl&&!!css;
if(!play){drop();W.__opening={mode:'off',state:'off'};return}
const KEY='trianon.ouverture.day',_d=new Date(),_p=n=>String(n).padStart(2,'0');
const today=`${_d.getFullYear()}-${_p(_d.getMonth()+1)}-${_p(_d.getDate())}`;
let last=null;try{last=localStorage.getItem(KEY)}catch(e){}
try{localStorage.setItem(KEY,today)}catch(e){}
/* 2026-10-28 14:27: a same-day relaunch no longer plays the short version: no curtain, the empty page plays its own v5 entrance.
   The short version stays reachable only through #ouverture-short. */
if(!FORCE&&!FSHORT&&last===today){drop();W.__opQuiet=W.__navQuiet=true;W.__opening={mode:'off',state:'off',why:'same-day'};return}   // 16:48: same-day relaunch also skips the engine cold-boot card (engine_v2 only reads __navQuiet for mock.boot(); #boot etc. hashes take their own branch)
const SHORT=FSHORT;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const MODE=RM?(SHORT?'rm-short':'rm'):(SHORT?'short':'full');
W.__opQuiet=W.__navQuiet=true;   // no engine cold-boot card under the curtain (engine_v2 skips mock.boot() when __navQuiet)
W.__emptyAtRest=true;       // rococo_v2_empty.js: start in the resting pose, no entrance
R.classList.add('kop-hold');
const ov=tpl.content.firstElementChild.cloneNode(true);tpl.remove();
R.appendChild(ov);          // a sibling of <body> (the body itself gets transformed during the hand-over)
const M=meta?JSON.parse(meta.textContent):{};meta&&meta.remove();
const $c={};const $=id=>$c[id]||($c[id]=ov.querySelector('#kop-'+id));
/* ===================== timeline (o1v/opening_src.html v1c, ported as is) ===================== */
const BPM=128,B=60/BPM,S16=B/4,FR=1/30;
const T={guide:0,num:.5*B,giant1:1*B,punch1:1.25*B,giant2:1.5*B,slash:1.75*B,badge:2*B,land:6*B,rules:6.5*B,pull:7.5*B,end:9*B,done:9*B+.3};
const SEQ=[['f_pin',4],['f_did',3],['f_frak',3],['f_type',3],['f_press',3],['f_inv1',2],['f_wax',4],['f_post',3],['f_emb',3],['f_eng',3],['f_inv2',1],['f_pen',3],['f_wc',4],['f_vel',3],['f_sil',3],['f_term',3],['f_cyan',3],['f_corm',5]];
const SEQ_T=[];{let acc=T.badge;const tot=SEQ.reduce((a,s)=>a+s[1],0),k=(T.land-T.badge)/(tot*FR);for(const[id,n]of SEQ){SEQ_T.push([id,acc,acc+n*FR*k]);acc+=n*FR*k}}
const TILT={f_pin:-2,f_did:1.5,f_frak:-1,f_type:-3,f_press:0,f_inv1:2,f_wax:-4,f_post:6,f_emb:-1.5,f_eng:1,f_inv2:-2,f_pen:-1,f_wc:2,f_vel:0,f_sil:-1,f_term:1.5,f_cyan:-2.5,f_corm:0};
const C=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),lin=(t,a,b)=>C((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3),eo5=x=>1-Math.pow(1-x,5),eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const back=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
/* real date on the caption and on the postmark face (o1v had 28 OCT 2026 typed in) */
const CAPTXT=`BIENVENUE · ${_p(_d.getDate())} · ${_p(_d.getMonth()+1)} · ${_d.getFullYear()}`;
$('cap').innerHTML=[...CAPTXT].map(c=>`<span>${c===' '?'&nbsp;':c}</span>`).join('');
const capS=[...$('cap').children];
{const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][_d.getMonth()];
  const tp=$('f_post').querySelector('textPath');if(tp)tp.textContent=`TRIANON · LE SALON DES LETTRES · VERSAILLES · ${_p(_d.getDate())} ${MON} ${_d.getFullYear()} ·`;
  const tx=$('f_post').querySelectorAll('text');if(tx[2])tx[2].textContent=`${_p(_d.getDate())} · ${_p(_d.getMonth()+1)} · ${_d.getFullYear()}`}
const RLn=$('rules');const RL=[[1480,560,1040,468],[1480,584,1046,492],[1480,380,1030,402]];
RLn.innerHTML=RL.map((r,i)=>`<line x1="${r[0]}" y1="${r[1]}" x2="${r[0]}" y2="${r[1]}" stroke="${i==1?'#9FB2CF':'#24305A'}" stroke-width="${i==1?1:1.4}"/>`).join('');
const RLs=[...RLn.children];
const PM={x:874,y:272.5},LET={x:705,y:365.5},PMD=99,PMR=-9;
const faces=[...ov.querySelectorAll('.kop-f')];
let curFace=undefined;
function setFace(id){if(id===curFace)return;curFace=id;for(const f of faces)f.classList.toggle('kop-on',f.id==='kop-'+id)}
const DZ=.28,DZS=.2;         // hand-over: after the pull-back lands (screenshot at exactly 1x) it dissolves onto the real page (short: .2s)
let V5={ox:0,oy:0,s:1};
const st=(el,o,tr)=>{if(o!==undefined)el.style.opacity=o;if(tr!==undefined)el.style.transform=tr};
function render(t){
  const gp=eo5(lin(t,0,B*.9));const gl=$('gl'),gl2=$('gl2');const L=1556;
  gl.setAttribute('stroke-dasharray',L);gl.setAttribute('stroke-dashoffset',L*(1-gp));
  gl2.setAttribute('stroke-dasharray',L);gl2.setAttribute('stroke-dashoffset',L*(1-eo5(lin(t,.08,B*.9+.08))));
  const gOut=lin(t,T.pull,T.pull+.25);
  st($('guide'),(t<T.giant1||t>=T.badge?1:.35)*(1-gOut));
  st($('tick'),lin(t,.12,.3)*(1-lin(t,T.pull,T.pull+.2)),`translateX(${(1-eo(lin(t,.12,.4)))*-18}px)`);
  const in1=t>=T.giant1&&t<T.giant2;const p1=lin(t,T.giant1,T.giant2);
  const wipe=eo(lin(t,T.giant1,T.giant1+B*.42));
  const g1tr=`translate(${40-p1*70}px,${10}px) rotate(-12deg) scale(${1.04-p1*.04})`;
  const pun=t>=T.punch1;
  const g1p=`translate(${-520-lin(t,T.punch1,T.giant2)*80}px,${-560}px) rotate(-4deg) scale(2.3)`;
  st($('g1'),in1?1:0,pun?g1p:g1tr);$('g1').style.clipPath=`inset(0 ${100-wipe*100}% 0 0)`;
  st($('g1s'),in1?1:0,pun?`translate(${-500-lin(t,T.punch1,T.giant2)*80}px,${-540}px) rotate(-4deg) scale(2.3)`:`translate(${54-p1*64}px,${22}px) rotate(-12deg) scale(${1.04-p1*.04})`);$('g1s').style.clipPath=`inset(0 ${100-eo(lin(t,T.giant1+.03,T.giant1+B*.42+.03))*100}% 0 0)`;
  const in2=t>=T.giant2&&t<T.badge;const p2=lin(t,T.giant2,T.badge);
  st($('g2'),in2?1:0,`translate(${-40+p2*30}px,${60}px) rotate(8deg)`);
  [...$('g2').children].forEach((s,i)=>{const a=T.giant2+i*S16/2;const k=lin(t,a,a+FR*2.2);
    s.style.opacity=t>=a?1:0;s.style.transform=`scale(${1.22-eo(k)*.22}) translateY(${(1-eo(k))*-40}px)`});
  st($('ghost'),t>=T.badge?.10*(1-lin(t,T.pull,T.pull+.3)):0,`translate(${120-lin(t,T.badge,T.pull)*90}px,${120}px) rotate(-12deg)`);
  const inN=t>=T.num&&t<T.giant1,pn=lin(t,T.num,T.giant1);
  st($('num'),inN?1:0,`translate(${-60-pn*140}px,${170}px) rotate(-12deg) scale(${1.1-eo(lin(t,T.num,T.num+FR*3))*.1})`);
  {const a=T.slash,kin=eo(lin(t,a,a+FR*4)),kout=eio(lin(t,T.badge,T.badge+FR*5));
    const on=t>=a&&t<T.badge+FR*5;$('slash').style.opacity=on?1:0;
    if(on){const X0=-400+2300*kin,X1=-400+2300*kout;const sk=191;const P=(x,y)=>`${x},${y}`;
      $('slp').setAttribute('points',[P(X1+sk,0),P(X0+sk,0),P(X0-sk,900),P(X1-sk,900)].join(' '));
      $('sle').setAttribute('x1',X0+sk);$('sle').setAttribute('y1',0);$('sle').setAttribute('x2',X0-sk);$('sle').setAttribute('y2',900)}}
  const bOn=lin(t,T.badge,T.badge+.12)*(1-lin(t,T.pull,T.pull+.15));
  st($('band1'),bOn*.75,`translate(${-200-(t-T.badge)*260}px,${300}px) rotate(-12deg)`);
  st($('band2'),bOn*.55,`translate(${-900+(t-T.badge)*320}px,${1010}px) rotate(-12deg)`);
  {let h='';for(const[k,col,w]of[[3,'#9FB2CF',1.5],[4,'#9FB2CF',1.5],[5,'#9FB2CF',1.5],[6,'#AEB7C6',2.6]]){
      const a=k*B,q=lin(t,a,a+B*.9);if(q<=0||q>=1)continue;const e=eo(q);
      h+=`<ellipse cx="720" cy="430" rx="${300+e*520}" ry="${132+e*228}" fill="none" stroke="${col}" stroke-width="${w*(1-e*.6)}" opacity="${(1-q)*.9}" transform="rotate(-6 720 430)"/>`}
    if($('rings').__h!==h){$('rings').innerHTML=h;$('rings').__h=h}}
  {const k=eo5(lin(t,T.land,T.land+FR*5));st($('reg'),t>=T.land?1-lin(t,T.pull,T.pull+.2):0,`translate(720px,430px) scale(${1.35-.35*k}) translate(-720px,-430px)`)}
  const badge=$('badge');
  let face=null,fs=0;
  if(t>=T.badge&&t<T.land){for(const[id,a,b]of SEQ_T)if(t>=a&&t<b){face=id;fs=a}}
  else if(t>=T.land)face='f_final';
  setFace(face);
  let sc=1,rot=0,tx=0,ty=0,op=face?1:0;
  if(t>=T.badge&&t<T.land){
    const pop=lin(t,T.badge,T.badge+FR*3);sc=1.22-eo(pop)*.22;
    for(let k=3;k<=5;k++){const kk=lin(t,k*B,k*B+FR*4);if(kk>0&&kk<1)sc*=1+.045*(1-kk)}
    rot=TILT[face]||0;
    if(t>=4*B&&t<4*B+FR*3)sc*=1.45;
    if(t>=5*B&&t<5*B+FR*3){sc*=1.28;rot-=8}
    const j=((fs*1000)|0)%7;tx=(j-3)*1.2;ty=((j*5)%7-3)*1.0;
  }else if(t>=T.land){
    const k=lin(t,T.land,T.land+FR*9);sc=1.075-back(k)*.075;rot=0;
    const sh=lin(t,T.land,T.land+FR*5);if(sh>0&&sh<1){tx=Math.sin(sh*31)*3*(1-sh);ty=Math.cos(sh*23)*2*(1-sh)}
  }
  if(t>=T.pull){
    const wk=eo(lin(t,T.pull,T.end)),w5=2.2-1.2*wk,L=liveGeo();
    const ox=(innerWidth/2-w5*L.lx)*(1-wk),oy=(innerHeight/2-w5*L.ly)*(1-wk);       // 页面变换：P → (ox,oy) + w5·P
    const sx=(ox+w5*L.px-FIT.x)/FIT.s,sy=(oy+w5*L.py-FIT.y)/FIT.s;                 // 邮戳在舞台坐标里的位置
    const pq=wk;const cx=720+(sx-720)*pq,cy=430+(sy-430)*pq-Math.sin(pq*Math.PI)*60;
    const scEnd=L.pd*w5/FIT.s/600;
    tx=cx-720;ty=cy-430;sc=sc*(1-pq)+scEnd*pq;rot=PMR*pq;op=1-lin(t,T.pull+(T.end-T.pull)*.4,T.end-.05);
  }
  st(badge,op,`translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sc})`);
  if(face==='f_pen'){const[,a,b]=SEQ_T.find(s=>s[0]==='f_pen');const k=lin(t,a,b);$('pent').setAttribute('stroke-dashoffset',2400*(1-(.35+.65*k)));$('blot').setAttribute('cx',108+k*400);$('blot').setAttribute('cy',170-Math.sin(k*9)*30)}
  if(face==='f_sil'){const[,a,b]=SEQ_T.find(s=>s[0]==='f_sil');$('f_sil').firstElementChild.style.backgroundPosition=`${100-lin(t,a,b)*100}% 0`}
  if(face==='f_term'){$('f_term').querySelector('u').style.opacity=Math.floor(t/S16)%2?.25:1}
  if(face==='f_final'){const k=lin(t,T.land+.12,T.land+.62);const o=-0.2+k*1.4;$('sv1').setAttribute('offset',C(o-.1));$('sv2').setAttribute('offset',C(o));$('sv3').setAttribute('offset',C(o+.1))}
  capS.forEach((s,i)=>{const a=T.land+B*.25+i*S16*.1;s.style.opacity=t>=a?1:0});
  st($('cap'),1-lin(t,T.pull,T.pull+.18));
  RLs.forEach((l,i)=>{const r=RL[i];const a=T.rules+i*S16*.5;const k=eo5(lin(t,a,a+B*.55));
    l.setAttribute('x2',r[0]+(r[2]-r[0])*k);l.setAttribute('y2',r[1]+(r[3]-r[1])*k)});
  st($('rules'),1-lin(t,T.pull,T.pull+.22));
  {const k=eio(lin(t,T.pull,T.pull+.5)),on=t>=T.pull&&k<1;const nx=.208,ny=.978,d=760*k;
    st($('pA'),on?1:0,`translate(${-nx*d}px,${-ny*d}px)`);st($('pB'),on?1:0,`translate(${nx*d}px,${ny*d}px)`)}
  /* 真实页面：解除遮挡后先放大到信纸上，拉远时回到 1 倍 */
  if(!held){const wk=t<T.pull?0:eo(lin(t,T.pull,T.end)),w5=2.2-1.2*wk,L=liveGeo();
    pageTr(wk>=1?'':`translate(${((innerWidth/2-w5*L.lx)*(1-wk)).toFixed(2)}px,${((innerHeight/2-w5*L.ly)*(1-wk)).toFixed(2)}px) scale(${w5.toFixed(4)})`)}
  st($('skip'),SHORT?0:lin(t,.3,.6)*.55*(1-lin(t,T.pull,T.pull+.2)));
}
function renderRM(t){
  for(const id of['guide','tick','g1','g1s','g2','ghost','rules','skip'])$(id).style.opacity=0;
  setFace('f_final');$('badge').style.transform='none';$('badge').style.opacity=lin(t,0,SHORT?.25:.4);
  capS.forEach(s=>s.style.opacity=1);$('cap').style.opacity=lin(t,0,SHORT?.25:.4);
}
/* short (same-day relaunch): 0.5 s of the logo landing, then the same 0.7 s pull-back */
const SH_A=.35,mapShort=t=>t<SH_A?T.land+t:T.pull+(t-SH_A);
const P=RM?(SHORT?{dur:.85,unhold:.1,fa:.55}:{dur:1.9,unhold:.5,fa:1.5}):(SHORT?{dur:SH_A+T.end-T.pull+DZS,unhold:.3}:{dur:T.end+DZ,unhold:T.land+.64});
/* unhold = the one heavy frame (the whole app is painted again): put where the logo stands still, just before the pull-back */
/* ===================== the real page underneath ===================== */
const body=()=>D.body;
let held=true,clear=false;
function liveTod(){   // greeting patch = rococo_v2_empty.js todNow(); dusk shares night's Bonsoir
  const k=W.__emptyTOD;if(k)return k==='dusk'?'night':k;const h=new Date().getHours()+new Date().getMinutes()/60;
  return h>=5&&h<12?'morning':h>=12&&h<17?'noon':'night'}
function patches(){const tod=liveTod();ov.querySelectorAll('.kop-patch').forEach(p=>{if(p.dataset.tod!==tod)p.remove()})}
function liveDate(){  // the postmark date is left out of the screenshot and drawn here from the page's own <text> nodes
  try{const B0=body().getBoundingClientRect();let h='';
    for(const id of['c5PmD','c5PmM']){const el=D.getElementById(id);if(!el)continue;const m=el.getScreenCTM();if(!m)continue;
      const cs=getComputedStyle(el);let op=+cs.opacity,blend='normal';
      for(let e=el.parentElement;e&&e!==body();e=e.parentElement){const c=getComputedStyle(e);op*=+c.opacity;if(blend==='normal'&&c.mixBlendMode!=='normal')blend=c.mixBlendMode}
      const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
      h+=`<g transform="matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e-B0.left} ${m.f-B0.top})" style="opacity:${op};mix-blend-mode:${blend}">`+
        `<text x="${el.getAttribute('x')||0}" y="${el.getAttribute('y')||0}" text-anchor="${cs.textAnchor}" style="font-family:${esc(cs.fontFamily)};font-style:${cs.fontStyle};font-weight:${cs.fontWeight};font-size:${cs.fontSize};letter-spacing:${cs.letterSpacing};fill:${cs.fill};fill-opacity:${cs.fillOpacity}">${esc(el.textContent)}</text></g>`}
    ov.querySelectorAll('.kop-dlive').forEach(s=>s.innerHTML=h)}catch(e){}}
function unhold(){if(!held)return;held=false;R.classList.remove('kop-hold');W.__emptyRest&&W.__emptyRest();measure()}
/* Trianon ST：舞台适配视口；页面上信纸与邮戳的位置 */
let FIT={s:1,x:0,y:0},GEO=null;
function fit(){const vw=innerWidth,vh=innerHeight;const s=Math.min(Math.max(vw/1440,vh/900),vw*.92/620);
  FIT={s,x:(vw-1440*s)/2,y:(vh-900*s)/2};$('st').style.transform=`translate(${FIT.x}px,${FIT.y}px) scale(${s})`}
fit();addEventListener('resize',()=>{fit();if(!held)measure()});
function measure(){const app=D.querySelector('.app');const t0=app?app.style.transform:'';if(app)app.style.transform='';
  const le=D.getElementById('c5Le'),pm=D.getElementById('c5Pm'),on=le&&le.getClientRects().length&&pm;
  if(on){const a=le.getBoundingClientRect(),b=pm.getBoundingClientRect();GEO={lx:a.left+a.width/2,ly:a.top+a.height/2,px:b.left+b.width/2,py:b.top+b.height/2,pd:Math.max(40,b.width)}}
  else GEO=null;
  if(app)app.style.transform=t0}
function liveGeo(){return GEO||{lx:innerWidth/2,ly:innerHeight/2,px:innerWidth/2,py:innerHeight/2,pd:99*FIT.s}}
function pageTr(tr){const app=D.querySelector('.app');if(!app)return;if(app.style.transform!==tr){app.style.transformOrigin='0 0';app.style.transform=tr}}
/* ===================== input: every event is the overlay's while it is up; a key or a press skips ===================== */
const EV=['keydown','keyup','keypress','pointerdown','pointerup','pointermove','pointerover','pointerout','pointerenter','pointerleave','pointercancel',
  'mousedown','mouseup','mousemove','mouseover','mouseout','mouseenter','mouseleave','click','dblclick','auxclick','contextmenu','wheel',
  'touchstart','touchmove','touchend','touchcancel','dragstart','selectstart'];
const SKIP={keydown:1,pointerdown:1,mousedown:1,touchstart:1};
const guard=e=>{e.stopImmediatePropagation();
  if(e.cancelable&&!(e.type.startsWith('key')&&(e.ctrlKey||e.metaKey)))e.preventDefault();
  if(SKIP[e.type])skip()};
EV.forEach(n=>addEventListener(n,guard,{capture:true,passive:false}));
/* ===================== driver ===================== */
let t0=null,raf=0,dead=false,skipAt=null,tNow=0,started=false;
const now=()=>performance.now();
function skip(){if(dead||skipAt!==null)return;if(!started){skipAt=0;started=true;loopStart();return}skipAt=tNow}
function step(t){
  tNow=t;
  if(skipAt!==null){
    if(held)unhold();
    const k=lin(t,skipAt,skipAt+.25);ov.style.opacity=String(1-k);if(k>=1)finish('skip');return}
  if(held&&t>=P.unhold)unhold();
  if(RM){renderRM(t);ov.style.opacity=String(1-lin(t,P.fa,P.dur));if(t>=P.dur)finish('end');return}
  const tf=SHORT?mapShort(t):t;
  render(tf);
  if(SHORT){for(const id of['guide','tick','ghost','band1','band2'])$(id).style.opacity=0;if(t<.08)$('badge').style.opacity=lin(t,0,.08)}
  if(tf>=T.pull&&!clear){clear=true;if(held)unhold();ov.classList.add('kop-clear')}   // stage backgrounds off: only the 1x still covers the page
  if(t>=P.dur)finish('end');
}
/* clock: frame time, capped at 50 ms a frame — a slow frame (the unhold) holds the picture instead of skipping animation */
let tl=null,ta=0;const FT=[];
function tick(n){if(dead)return;if(t0===null){t0=n;tl=n}const dt=Math.min(.05,Math.max(0,(n-tl)/1000));if(FT.length<600)FT.push([+ta.toFixed(3),+((n-tl)).toFixed(1)]);tl=n;ta+=dt;step(ta);if(!dead)raf=requestAnimationFrame(tick)}
function loopStart(){raf=requestAnimationFrame(tick)}
function finish(how){if(dead)return;dead=true;cancelAnimationFrame(raf);
  if(held)unhold();
  EV.forEach(n=>removeEventListener(n,guard,{capture:true}));
  ov.remove();css&&css.remove();R.classList.remove('kop-hold');pageTr('');
  W.__emptyRest&&W.__emptyRest();          // re-anchor the resting pose: the camellia's first sway comes ~5 s after the hand-over
  for(const k in $c)delete $c[k];
  W.__opening.state='done';W.__opening.how=how;W.__opening.at=tNow;
  dispatchEvent(new CustomEvent('ouverture:done',{detail:{mode:MODE,how}}))}
W.__opening={mode:MODE,state:'wait',T,dur:P.dur,t:()=>tNow,skip:()=>skip(),frames:FT,get held(){return held},get clear(){return clear}};
/* start when the app has been parsed (its scripts ran), our fonts are in and the screenshots are decoded */
const ready=new Promise(r=>D.readyState==='loading'?D.addEventListener('DOMContentLoaded',r,{once:true}):r());
const fonts=['kopPinyon','kopCorm','kopPlay','kopBodoni','kopMono','kopFrak','kopElite'].map(f=>D.fonts.load(`${f==='kopCorm'?'italic ':''}400 40px ${f}`).catch(()=>0));
const imgs=[...ov.querySelectorAll('img')].map(i=>i.decode?i.decode().catch(()=>0):0);
Promise.all([ready,...fonts,...imgs]).then(()=>{if(dead||started)return;started=true;W.__opening.state='play';
  if(RM)renderRM(0);else render(SHORT?mapShort(0):0);loopStart()});
})();
