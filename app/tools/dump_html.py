# 从原版 dist/trianon.html 导出元素的 outerHTML 和 :root 变量。用法：python3 dump_html.py <hash> "<选择器|…>" out.json
from playwright.sync_api import sync_playwright
import sys,json
h,sels,out=sys.argv[1],sys.argv[2],sys.argv[3]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1440,"height":900})
    pg.goto("file://"+__import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__),"../../dist/trianon.html"))+"#"+h);pg.wait_for_timeout(3000)
    r=pg.evaluate("(s)=>{const o={};for(const k of s.split('|')){const e=document.querySelector(k);o[k]=e?e.outerHTML:null}o.__root=[...document.styleSheets].flatMap(ss=>{try{return [...ss.cssRules]}catch(e){return[]}}).filter(r=>r.type===1&&/^(:root|html)$/.test(r.selectorText.trim())).map(r=>r.cssText);return o}",sels)
    json.dump(r,open(out,'w'));b.close()
