"""把原页面导出的元素 HTML 里的内联图片抽到 assets/kit，打印每个片段（图片换成 asset:kit/xxx）。"""
import json,re,sys,base64,hashlib,os
KIT=os.path.join(os.path.dirname(__file__),'..','assets','kit')
def img(m):
    u=m.group(0);mime,b=u[5:].split(';base64,',1);ext={'image/png':'png','image/webp':'webp','image/jpeg':'jpg','image/svg+xml':'svg','font/woff2':'woff2','font/woff':'woff'}.get(mime,'bin')
    raw=base64.b64decode(b+"="*(-len(b)%4));h=hashlib.md5(raw).hexdigest()[:10];fn=f'{h}.{ext}';p=os.path.join(KIT,fn)
    if not os.path.exists(p):open(p,'wb').write(raw)
    return f'asset:kit/{fn}'
def clean(t):return re.sub(r'data:[a-z/+0-9.-]+;base64,[A-Za-z0-9+/=]+',img,t)
if __name__=='__main__':
    r=json.load(open(sys.argv[1]));od=sys.argv[2];os.makedirs(od,exist_ok=True)
    for k,v in r.items():
        if v is None:continue
        if isinstance(v,list):v='\n'.join(v)
        fn=re.sub(r'[^\w]+','_',k).strip('_') or 'root'
        open(os.path.join(od,fn+'.html'),'w').write(clean(v));print(fn,len(v))
