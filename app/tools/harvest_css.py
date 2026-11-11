# 从原版 dist/trianon.html 导出某个视图下命中的 CSS 规则。用法：python3 harvest_css.py <hash> "<根选择器|…>" out.json（需 Playwright 和 Chrome；路径在脚本里改）
# 从原页面提取：给定根元素子树里真正命中的 CSS 规则（含 :hover/伪元素，按去掉伪类后的选择器匹配）
from playwright.sync_api import sync_playwright
import json,sys,re
h=sys.argv[1]; roots=sys.argv[2]; out=sys.argv[3]
JS=r"""(roots)=>{
const els=new Set();
for(const r of roots.split('|')){document.querySelectorAll(r).forEach(e=>{els.add(e);e.querySelectorAll('*').forEach(x=>els.add(x))})}
const L=[...els];
const strip=s=>s.replace(/::?(before|after|placeholder|selection|marker|-webkit-[a-z-]+|first-letter|first-line)\b(\([^)]*\))?/g,'').replace(/:(hover|focus|focus-visible|focus-within|active|visited|checked|disabled|empty|not\([^)]*\)|nth-[a-z-]+\([^)]*\)|first-child|last-child|first-of-type|last-of-type|only-child|is\([^)]*\)|where\([^)]*\)|has\([^)]*\))/g,'');
const hit=sel=>sel.split(',').some(p=>{let q=strip(p).trim();if(!q)return false;if(/^(html|body|:root|\*)/.test(q)&&false)return true;try{return L.some(e=>e.matches(q))}catch(e){return false}});
const out=[];const anims=new Set();const fonts=new Set();
const walk=(rules,wrap)=>{for(const r of rules){
  if(r.type===1){if(hit(r.selectorText)){out.push(wrap?wrap(r.cssText):r.cssText);const a=r.style.animationName||'';a.split(',').forEach(x=>x.trim()&&x.trim()!=='none'&&anims.add(x.trim()));const an=r.style.animation||'';
      const ff=r.style.fontFamily||'';ff.split(',').forEach(x=>fonts.add(x.trim().replace(/["']/g,'')))}}
  else if(r.type===4){const inner=[];walk(r.cssRules,t=>t);/* media */ }
}};
for(const ss of document.styleSheets){let rs;try{rs=ss.cssRules}catch(e){continue}
  for(const r of rs){
    if(r.type===1){if(hit(r.selectorText)){out.push(r.cssText);r.style.animationName&&r.style.animationName.split(',').forEach(x=>anims.add(x.trim()));(r.style.fontFamily||'').split(',').forEach(x=>fonts.add(x.trim().replace(/["']/g,'')))}}
    else if(r.type===4){const sub=[];for(const q of r.cssRules){if(q.type===1&&hit(q.selectorText)){sub.push(q.cssText);q.style.animationName&&q.style.animationName.split(',').forEach(x=>anims.add(x.trim()))}}if(sub.length)out.push('@media '+r.conditionText+'{'+sub.join('\n')+'}')}
  }}
// animation shorthand names
const txt=out.join('\n');for(const m of txt.matchAll(/animation:\s*([^;]+);/g)){m[1].split(',').forEach(p=>p.trim().split(/\s+/).forEach(w=>{if(/^[a-zA-Z][\w-]*$/.test(w))anims.add(w)}))}
const kf=[],ff=[],root=[];
for(const ss of document.styleSheets){let rs;try{rs=ss.cssRules}catch(e){continue}
  for(const r of rs){if(r.type===7&&anims.has(r.name))kf.push(r.cssText);
    if(r.type===5){const f=r.style.getPropertyValue('font-family').replace(/["']/g,'').trim();if(fonts.has(f))ff.push(r.cssText)}
    if(r.type===1&&/^(:root|html)$/.test(r.selectorText.trim()))root.push(r.cssText)}}
return {rules:out,kf:[...new Set(kf)],ff:[...new Set(ff)],root,fonts:[...fonts],n:L.length}}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1440,"height":900})
    pg.goto("file://"+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../dist/trianon.html"))+"#"+h);pg.wait_for_timeout(3000)
    r=pg.evaluate(JS,roots)
    json.dump(r,open(out,'w'),ensure_ascii=False)
    print('els',r['n'],'rules',len(r['rules']),'kf',len(r['kf']),'ff',len(r['ff']),'root',len(r['root']),'fonts',r['fonts'][:20])
    b.close()
