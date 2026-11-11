"""生成空白页拼贴的 HTML（调用原版 src/e5v/empty5.py），图片抽到 assets/empty/，结果写入 src/parts/empty.html。
需要 fontTools、uharfbuzz（原版问候语是用 HarfBuzz 排成路径的）。拼贴改动后才需要重跑：python3 app/tools/gen_empty.py"""
import os, sys, re, base64, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.join(HERE, '..'); SRC = os.path.join(APP, '..', 'src')
sys.path.insert(0, os.path.join(SRC, 'e5v')); sys.path.insert(0, os.path.join(SRC, 'e4v'))
cwd = os.getcwd(); os.chdir(SRC)
import empty5
html = empty5.build('./')
os.chdir(cwd)
OUT = os.path.join(APP, 'assets', 'empty'); os.makedirs(OUT, exist_ok=True)
def img(m):
    u = m.group(0); mime, b = u[5:].split(';base64,', 1); ext = {'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg'}[mime]
    raw = base64.b64decode(b); fn = hashlib.md5(raw).hexdigest()[:10] + '.' + ext
    p = os.path.join(OUT, fn)
    if not os.path.exists(p): open(p, 'wb').write(raw)
    return 'asset:empty/' + fn
html = re.sub(r'data:image/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+', img, html)
# 快捷标签改成角色扮演用的三个入口（按钮顺序和 class 不变）
for a, z in [('>le salon du code est ouvert<', '>le salon des lettres est ouvert<'),
             ('>KIMI CODE · LE SALON · PARIS ·<', '>TRIANON · LE SALON · VERSAILLES ·<'),
             ('>Tidy this repo<', '>Begin a letter<'), ('>Fix a bug<', '>Choose a muse<'), ('>Just chat<', '>Just chat<')]:
    assert html.count(a) == 1, a
    html = html.replace(a, z)
os.makedirs(os.path.join(APP, 'src', 'parts'), exist_ok=True)
open(os.path.join(APP, 'src', 'parts', 'empty.html'), 'w', encoding='utf-8').write(html)
print('empty.html', len(html), 'assets', len(os.listdir(OUT)))
