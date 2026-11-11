"""把从原页面提取的 CSS 规则清理成组件样式：去掉编程相关的选择器，内联图片抽成 assets/kit 文件。
用法：python3 harvest_post.py h_xxx.json out.css  （h_xxx.json 由原页面导出，见 tools/README.md）"""
import json,re,sys,base64,hashlib,os
src,out=sys.argv[1],sys.argv[2]
KIT=os.path.join(os.path.dirname(__file__),'..','assets','kit')
r=json.load(open(src))
DROP_ALL=r'\.(eg-|tv-|sl-|q-|qc|so-|prf|ts-|tn|tg-|ap-|fl-|mc-|mchip|mpop|mdl|tool|rec\b|dl\b|dd\b|da\b|dh\b|dfold|th\b|tb\b|tsum|slip|qcard|seal|pen12|rk-|tgrp|inkrk|hg-sand|dw-|drw|c5|invite|tag\b|tagcap|sr-|br-|cl-|tm-|rd-|rp)|#(eg|tv|rk|sl|q[A-Z]|ap|mc|dw|fl|c5)|\bpre\b|\.k\b|\.f\b|\.c\b|\.v-(empty|live)|body\.ly-(fl|st)|\.cmt'
if os.environ.get('KEEP_EMPTY'):DROP_ALL=DROP_ALL.replace('|c5|invite|tag\\b|tagcap','').replace('|c5)',')')
DROP=re.compile(DROP_ALL)
def keep(rule):
    sel=rule.split('{',1)[0]
    if sel.startswith('@media'):return True
    parts=[p for p in sel.split(',') if not DROP.search(p)]
    return parts
def img(m):
    u=m.group(0);mime,b=u[5:].split(';base64,',1);ext={'image/png':'png','image/webp':'webp','image/jpeg':'jpg','image/svg+xml':'svg','font/woff2':'woff2','font/woff':'woff'}.get(mime,'bin')
    raw=base64.b64decode(b+"="*(-len(b)%4));h=hashlib.md5(raw).hexdigest()[:10];fn=f'{h}.{ext}'
    p=os.path.join(KIT,fn)
    if not os.path.exists(p):open(p,'wb').write(raw)
    return f'asset:kit/{fn}'
outl=[]
for rule in r['rules']:
    if rule.startswith('@media'):
        head,body=rule.split('{',1);body=body.rsplit('}',1)[0]
        inner=[x+'}' for x in body.split('}') if x.strip()]
        kept=[]
        for x in inner:
            sel,decl=x.split('{',1);ps=[p for p in sel.split(',') if not DROP.search(p)]
            if ps:kept.append(','.join(ps)+'{'+decl)
        if kept:outl.append(head+'{'+'\n'.join(kept)+'}')
        continue
    sel,decl=rule.split('{',1)
    ps=[p for p in sel.split(',') if not DROP.search(p)]
    if ps:outl.append(','.join(ps).strip()+' {'+decl)
css='\n'.join(outl+r['kf']+r['ff'])
css=re.sub(r'data:[a-z/+0-9.-]+;base64,[A-Za-z0-9+/=]+',img,css)
open(out,'w').write(css)
print(out,len(r['rules']),'->',len(outl),'bytes',len(css))
