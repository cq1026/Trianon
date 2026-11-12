/* ===== 空白页拼贴（原样取自 Trianon rococo_v2_empty.js；改动：开场停靠姿势、快捷标签、问候名字用当前人设）=====
   以下为原注释 */
(()=>{
/* ===================================================================================================
   rococo v2 · 空白页中心区 v5「欧式复古拼贴 · 用户动效规格版」(#empty), 2026-10-27 13:10 — the user's own centre-motion spec.
   Timeline (ms, exactly as she wrote it):
     1 · 塔罗洗牌式铺底      0–500   the gothic door card, the baroque gallery sheaf (binder clip rides on it) and the main letter
                                    start stacked at one point in the centre and fan out along their own arcs, rotating into their
                                    tilts, cubic-bezier(0.16,1,0.3,1); shadows go from big+soft to small+firm
     2 · 3D 揭贴覆平 + 吊牌   300–850  plate / gothic canopy / teapot / camellia tag: perspective scale(1.15) rotateX(25deg)
                                    rotateY(-15deg), very deep blurry shadow → slapped flat to 0deg, the shadow snaps to a 2px hard
                                    edge; the camellia tag swings on its cord from the binder clip (damped pendulum)
     3 · 重锤盖戳 + 纸面微震   550–750  the postmark falls from scale(2.2) + heavy blur in 140ms with cubic-bezier(0.6,0.04,0.98,0.33),
                                    lands at 690ms: the letter and the cards dip to scale(0.988) and rebound; multiply ink
     4 · 斜向流光显影          650–1100 the copperplate (line 1 starts on the gothic card, line 2 runs off the letter onto the gallery
                                    card) is revealed left→right by a 15° slanted gradient mask; at full reveal a faint cool
                                    silver shimmer sweeps across it (her「香槟金」→ cool champagne / silver-white, no warm gold)
     5 · quick starts          900–1250 the three die-cut labels are pressed on (same buttons, same handlers)
   Resting: mouse parallax by layer height, AGAINST the pointer: base cards 2px, letter + postmark 5px, stickers + tag 10–14px
   (rAF-smoothed, eases back to rest when the pointer leaves); the camellia tag sways a little every ~8.5s; hover lifts a
   sticker / label corner (CSS). On send (window.__emptyExit, called by rococo's showView): an「Envoyé」stamp, then the
   collage parts to both sides and fades. Time of day: 05–12 Bonjour · 12–17 Bon après-midi · 17–05 Bonsoir
   (debug hashes #empty-morning / -noon / -dusk / -night via window.__emptyTOD). Reduced motion: one fade, final pose.
   Everything is a function of t (inline styles, no WAAPI) so rococo's view switches cannot cut it short;
   window.__v11restart() replays it (new chat, #play).
   =================================================================================================== */
const $=id=>document.getElementById(id);
const vE=$('vEmpty'),card=$('invite'),C5=$('c5');if(!vE||!card||!C5)return;
const hall=vE.querySelector('.hall'),dsepS=hall.querySelector('.dsep span'),cap=card.querySelector('.tagcap');
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const c01=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),seg=(t,a,b)=>c01((t-a)/(b-a)),lerp=(a,b,u)=>a+(b-a)*u;
const eo=u=>1-Math.pow(1-u,3),eio=u=>.5-.5*Math.cos(Math.PI*u);
const bez=(x1,y1,x2,y2)=>u=>{if(u<=0)return 0;if(u>=1)return 1;let s=u;for(let i=0;i<10;i++){const x=3*(1-s)*(1-s)*s*x1+3*(1-s)*s*s*x2+s*s*s-u,
  dx=3*(1-s)*(1-s)*x1+6*(1-s)*s*(x2-x1)+3*s*s*(1-x2);if(Math.abs(x)<1e-6||!dx)break;s=c01(s-x/dx)}return 3*(1-s)*(1-s)*s*y1+3*(1-s)*s*s*y2+s*s*s};
const DEAL=bez(.16,1,.3,1),SLAM=bez(.6,.04,.98,.33),FLAT=bez(.42,0,.2,1);
const f=v=>v.toFixed(2);
const P=e=>{const s=e.style;return {e,r:+e.dataset.r||0,z:+e.dataset.z||0,sd:+e.dataset.sd||0,
  x:parseFloat(s.left)||0,y:parseFloat(s.top)||0,w:parseFloat(s.width)||0,h:parseFloat(s.height)||0}};
const go=P($('c5Go')),ga=P($('c5Ga')),le=P($('c5Le')),pm=P($('c5Pm')),env=P($('c5Env'));
const cards=[go,ga];
const stk=['c5Pl','c5Ar','c5Tp'].map(i=>P($(i)));
const sc=$('c5Sc'),sh=$('c5Sh'),shG=$('c5ShG'),scInk=sc.querySelector('.c5-ink');
const tagW=$('c5Tag'),tagIn=tagW.querySelector('.c5s-in'),cam=$('c5Cam'),cord=$('c5Cord'),cord2=$('c5Cord2');
const TZ=+tagW.dataset.z||14,GX=+cam.dataset.gx,CL=+cam.dataset.cl,HX=+ga.e.dataset.hx,HY=+ga.e.dataset.hy;
const TG=[...card.querySelectorAll('.tag')].map(P);
TG.forEach(p=>p.e.style.transformOrigin='18% 80%');
const pmD=$('c5PmD'),pmM=$('c5PmM');
/* ---------------- clock: Date anchored to performance.now so a virtual capture clock stays consistent ---------------- */
const D0=Date.now(),P0=performance.now(),clock=()=>new Date(D0+(performance.now()-P0));
const MOIS=['JANV','FÉVR','MARS','AVR','MAI','JUIN','JUIL','AOÛT','SEPT','OCT','NOV','DÉC'];
{const d=clock();pmD.textContent=d.getDate();pmM.textContent=MOIS[d.getMonth()]+' '+d.getFullYear()}
/* ---------------- time of day → greeting ---------------- */
const todNow=()=>{if(window.__emptyTOD)return window.__emptyTOD;const h=clock().getHours()+clock().getMinutes()/60;
  return h>=5&&h<12?'morning':h>=12&&h<17?'noon':h>=17&&h<19?'dusk':'night'};
let tod='';
const setTod=k=>{if(k===tod)return;tod=k;const key=k==='dusk'?'night':k;
  sc.querySelectorAll('.c5w.l1').forEach(g=>g.classList.toggle('on',g.classList.contains('g-'+key)))};
/* ---------------- shadows ---------------- */
const SH0=[22,30,.16, 9,16,.09],SH1=[1,1.4,.17, 5,8,.13];
const cardShadow=u=>{const v=SH0.map((a,i)=>lerp(a,SH1[i],u));return `drop-shadow(0 ${f(v[0])}px ${f(v[1])}px rgba(30,39,72,${v[2].toFixed(3)})) drop-shadow(0 ${f(v[3])}px ${f(v[4])}px rgba(30,39,72,${v[5].toFixed(3)}))`};
const CARD_SH=cardShadow(1);
const HARD='drop-shadow(0 2px 0 rgba(30,39,72,.2)) drop-shadow(0 .5px .6px rgba(30,39,72,.22))';     // sticker edge, 2px hard
const deep=u=>`drop-shadow(${f(lerp(18,7,u))}px ${f(lerp(30,12,u))}px ${f(lerp(26,12,u))}px rgba(30,39,72,${lerp(.34,.2,u).toFixed(3)}))`;
/* ---------------- mouse parallax: against the pointer, by layer height ---------------- */
let mx=0,my=0,tx_=0,ty_=0;
addEventListener('mousemove',e=>{tx_=c01((e.clientX/innerWidth)*2-1,-1,1);ty_=c01((e.clientY/innerHeight)*2-1,-1,1)},{passive:true});
document.addEventListener('mouseleave',()=>{tx_=0;ty_=0});
addEventListener('blur',()=>{tx_=0;ty_=0});
let exitT0=null;
window.__emptyExit=()=>{exitT0=performance.now()};
const CX=350,CY=278;                        // the shuffle point (centre of the collage)
/* compose one piece: entrance pose o {op,dx,dy,dr,sc,rx,ry} + parallax + exit */
const put=(p,o,par,exu)=>{const tx=-par*mx*p.z+o.dx+p.sd*46*exu,ty=-par*my*p.z*.75+o.dy-(p.sd===0?10*exu:0);
  p.e.style.opacity=f(o.op*(1-exu));
  p.e.style.transform=`translate(${f(tx)}px,${f(ty)}px) rotate(${f(p.r+o.dr)}deg)`+(o.rx||o.ry?` perspective(620px) rotateX(${f(o.rx)}deg) rotateY(${f(o.ry)}deg)`:'')+
    (o.sc!==1||exu?` scale(${(o.sc*(1-.015*exu)).toFixed(4)})`:'')};
/* 1 · tarot shuffle: from the centre point along an arc, rotating into the tilt */
const deal=(p,t,a,d,bulge,r0)=>{const u=seg(t,a,a+d),e=DEAL(u);
  const sx=CX-(p.x+p.w/2),sy=CY-(p.y+p.h/2);                       // offset that puts the piece's centre on the shuffle point
  const L=Math.hypot(sx,sy)||1,nx=-sy/L,ny=sx/L;                    // normal to the slide → the arc
  const k=Math.sin(Math.PI*e)*bulge;
  return {u,op:c01(u/.12),dx:sx*(1-e)+nx*k,dy:sy*(1-e)+ny*k,dr:lerp(r0-p.r,0,e),sc:lerp(.97,1,e),rx:0,ry:0}};
/* 2 · 3D peel: scale(1.15) rotateX(25) rotateY(-15) → flat; returns pose + shadow */
const peel=(t,a,d,S=1.15,RX=25,RY=-15)=>{const u=seg(t,a,a+d),e=FLAT(u);
  return {u,op:c01(u/.18),dx:0,dy:lerp(-8,0,e),dr:0,sc:lerp(S,1,e),rx:lerp(RX,0,e),ry:lerp(RY,0,e)}};
const FIN={u:1,op:1,dx:0,dy:0,dr:0,sc:1,rx:0,ry:0};
/* 3 · the paper tremor at the stamp's impact (690ms): scale .988 and back */
const dipAt=t=>t<.69?1:t<.712?lerp(1,.988,eio(seg(t,.69,.712))):t<.765?lerp(.988,1.002,eo(seg(t,.712,.765))):t<.82?lerp(1.002,1,eio(seg(t,.765,.82))):1;
/* where the binder clip's handle top is right now (box px), following the gallery sheaf's transform */
const hangPt=(o,par,exu)=>{const tx=-par*mx*ga.z+o.dx+ga.sd*46*exu,ty=-par*my*ga.z*.75+o.dy;
  const a=(ga.r+o.dr)*Math.PI/180,s=o.sc,lx=(HX-ga.w/2)*s,ly=(HY-ga.h/2)*s;
  return [ga.x+ga.w/2+tx+lx*Math.cos(a)-ly*Math.sin(a),ga.y+ga.h/2+ty+lx*Math.sin(a)+ly*Math.cos(a)]};
const drawTag=(H,th,o,par,exu)=>{
  /* the tag hangs from H with its own (higher) parallax; the cord bridges the two */
  const px=-par*mx*TZ,py=-par*my*TZ*.75,ox=H[0]+px*.82+ (exu?ga.sd*46*exu:0),oy=H[1]+py*.82;
  tagW.style.transform=`translate(${f(ox-GX)}px,${f(oy)}px) rotate(${f(th)}deg)`;tagW.style.transformOrigin=`${GX}px 0px`;
  tagW.style.opacity=f(o*(1-exu));
  const a=th*Math.PI/180,L=CL-24,ex=ox-L*Math.sin(a),ey=oy+L*Math.cos(a);
  const mxp=(H[0]+ex)/2+ (ey-H[1])*.06,myp=(H[1]+ey)/2;
  const d=`M${f(H[0])},${f(H[1])} Q${f(mxp)},${f(myp)} ${f(ex)},${f(ey)}`;cord.setAttribute('d',d);cord2.setAttribute('d',d)};
function frame(t){
  setTod(todNow());
  const rm=RM.matches;
  const te=exitT0==null?-1:(performance.now()-exitT0)/1000;
  const exu=te<0?0:eio(seg(te,.14,.6));
  if(!rm){mx+=(tx_-mx)*.08;my+=(ty_-my)*.08}
  const par=rm?0:eio(seg(t,1.25,1.9));
  if(rm){const u=eo(seg(t,0,.4));
    [...cards,le,pm,...stk,...TG].forEach(p=>{put(p,FIN,0,0);p.e.style.opacity=f(u)});
    cards.forEach(p=>p.e.style.filter=CARD_SH);le.e.style.filter=CARD_SH;stk.forEach(p=>p.e.style.filter=HARD);
    pm.e.style.filter='';pm.e.style.opacity=f(.86*u);
    dsepS.style.opacity=cap.style.opacity=f(u);C5.style.transform='';
    sc.style.webkitMaskImage=sc.style.maskImage='none';sc.style.opacity=f(u);sh.style.opacity=0;
    drawTag(hangPt(FIN,0,0),0,u,0,0);cord.style.opacity=cord2.style.opacity=f(u);tagIn.style.filter=HARD;
    env.e.style.opacity=0;return}
  const dip=dipAt(t);
  /* 1 · tarot shuffle 0–500ms (the letter rises off the pile in the middle) */
  dsepS.style.opacity=f(eo(seg(t,.02,.35)));
  const oGo=deal(go,t,0,.5,-34,-14),oGa=deal(ga,t,.02,.48,30,13),oLe=deal(le,t,.04,.46,0,4);
  [[go,oGo],[ga,oGa],[le,oLe]].forEach(([p,o])=>{o.sc*=dip;put(p,o,par,exu);p.e.style.filter=o.u>=1?CARD_SH:cardShadow(eo(o.u))});
  /* 3 · the postmark: 550–690 slam from scale(2.2)+blur, multiply ink; rides on the paper after it lands */
  if(t<.55){pm.e.style.opacity=0}
  else{const u=seg(t,.55,.69),e=SLAM(u);
    put(pm,{op:1,dx:0,dy:0,dr:lerp(-7,0,e),sc:lerp(2.2,1,e)*dip,rx:0,ry:0},par,exu);
    pm.e.style.opacity=f(lerp(0,.88,c01(u*2.2))*(1-exu));
    pm.e.style.filter=u<1?`blur(${f(lerp(9,0,e))}px)`:(t<.74?`blur(${f(lerp(.5,0,seg(t,.69,.74)))}px)`:'')}
  C5.style.transform='';
  /* 2 · stickers 300–850ms: perspective peel → slapped flat, the shadow snaps to a 2px hard edge */
  [[0,.30,.34],[1,.38,.34],[2,.46,.34]].forEach(([i,a,d])=>{const p=stk[i],o=peel(t,a,d);put(p,o,par,exu);
    p.e.style.filter=o.u>=1?HARD:deep(FLAT(o.u))});
  /* camellia: cord unrolls 460–600, tag peels on 500–740 hanging from the clip, then a damped pendulum */
  const H=hangPt(oGa,par,exu);
  const ck=eio(seg(t,.46,.6));
  {const L=cord.getTotalLength?cord.getTotalLength():60;cord.style.strokeDasharray=cord2.style.strokeDasharray=f(L+2)+' '+f(L+4);
    cord.style.strokeDashoffset=cord2.style.strokeDashoffset=f((L+2)*(1-ck));cord.style.opacity=cord2.style.opacity=f(c01(ck*4)*(1-exu))}
  const tp=peel(t,.5,.24);
  let th=0;if(t>=.74){const u=t-.74;th=14*Math.exp(-u/.62)*Math.sin(2*Math.PI*u/.86)}
  if(t>2.6){const k=Math.floor((t-2.6)/8.5),u=(t-2.6)-8.5*k;if(u<3)th+=2.4*Math.exp(-u/.8)*Math.sin(2*Math.PI*u/1.05)*(k%2?-1:1)*par}
  th*=motionK()<1?.5:1;
  drawTag(H,th+(tp.u<1?lerp(-10,0,FLAT(tp.u)):0),tp.op,par,exu);
  tagIn.style.transform=tp.u<1?`perspective(620px) rotateX(${f(tp.rx)}deg) rotateY(${f(tp.ry)}deg) scale(${tp.sc.toFixed(4)})`:'';
  tagIn.style.filter=tp.u<1?deep(FLAT(tp.u)):HARD;
  /* 4 · script: 15° slanted mask flows left→right 650–1100, then a cool silver shimmer */
  {const u=seg(t,.65,1.1),p=lerp(-14,114,eo(u)),sx=-par*mx*le.z,sy=-par*my*le.z*.75;
    sc.style.transform=`translate(${f(sx+(exu?0:0))}px,${f(sy-10*exu)}px) scale(${dip.toFixed(4)})`;sc.style.transformOrigin='350px 278px';
    sc.style.opacity=f(1-exu);
    if(u<1){const m=`linear-gradient(105deg,#000 ${f(p-9)}%,rgba(0,0,0,.55) ${f(p-3)}%,transparent ${f(p+3)}%)`;sc.style.webkitMaskImage=sc.style.maskImage=m;scInk.style.opacity=1}
    else sc.style.webkitMaskImage=sc.style.maskImage='none';
    const su=seg(t,1.1,1.62);
    if(su>0&&su<1){sh.style.opacity=f(.85*Math.sin(Math.PI*su));shG.setAttribute('gradientTransform',`translate(${f(lerp(60,700,eio(su)))} 0) rotate(15)`)}
    else sh.style.opacity=0}
  /* 5 · quick-start labels */
  cap.style.opacity=f(eo(seg(t,.85,1.1)));
  TG.forEach((p,i)=>{const o=peel(t,.9+.07*i,.32,1.08,18,-12);put(p,o,par,0);p.e.style.filter=o.u>=1?'':deep(FLAT(o.u))});
  /* send: Envoyé */
  if(te<0)env.e.style.opacity=0;
  else{const u=seg(te,0,.16),q=FLAT(u);env.e.style.opacity=f(.88*eo(seg(u,0,.4))*(1-seg(te,.5,.7)));
    env.e.style.transform=`rotate(-8deg) scale(${(1.25-.25*q).toFixed(4)})`}}
const L2X=288,L2Y=324,NS='http://www.w3.org/2000/svg';
let nameTry=0;
const setName=name=>{
  name=(name||'').trim()||'Colette';
  /* 页面被开场挡住时（content-visibility:hidden）量不出字宽，等能量了再排 */
  if(document.documentElement.classList.contains('kop-hold')||!sc.getClientRects().length){if(nameTry++<600)requestAnimationFrame(()=>setName(name));return}
  nameTry=0;
  const groups=[...sc.querySelectorAll('.c5w.l2')];let w=0,size=78;
  groups.forEach((g,i)=>{g.textContent='';const t=document.createElementNS(NS,'text');t.setAttribute('x','0');t.setAttribute('y','0');
    t.setAttribute('style',`font-family:Pinyon,serif;font-size:${size}px`);t.textContent=name;g.appendChild(t);
    if(i===0){w=t.getComputedTextLength();if(w>360){size=Math.max(40,Math.floor(78*360/w));t.style.fontSize=size+'px';w=t.getComputedTextLength()}}
    else t.style.fontSize=size+'px'});
  const xe=L2X+w,Y=L2Y,F=v=>v.toFixed(1);
  const d=`M${F(xe-6)},${Y-9} C${F(xe+4)},${Y+3} ${F(xe+20)},${Y+8} ${F(xe+34)},${Y+2} C${F(xe+44)},${Y-3} ${F(xe+44)},${Y-14} ${F(xe+37)},${Y-15} C${F(xe+30)},${Y-16} ${F(xe+32)},${Y-4} ${F(xe+41)},${Y-2} C${F(xe+47)},${Y-1} ${F(xe+51)},${Y-7} ${F(xe+54)},${Y-12}`;
  sc.querySelectorAll('.c5fl').forEach(p=>p.setAttribute('d',d))};
window.__emptyName=setName;
let t0=performance.now();
window.__v11restart=()=>{t0=performance.now();exitT0=null;frame(0)};
window.__v11frame=window.__emptyFrame=frame;
window.__emptyRest=()=>{t0=performance.now()-5700};
frame(window.__emptyAtRest?5.7:0);
const run=()=>{tod='';t0=performance.now()-(window.__emptyAtRest?5700:0);
  const loop=()=>{if(vE.classList.contains('on')||vE.classList.contains('out'))frame(Math.max(0,(performance.now()-t0)/1000));requestAnimationFrame(loop)};requestAnimationFrame(loop)};
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{setName(window.__emptyNameNow||'');run()});
})();
