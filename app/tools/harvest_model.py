"""从原版 dist/trianon.html 取出「模型标签 + 选择弹窗 + 模型目录」的样式，生成 src/css/kit_model.css。
样式来自原页面的 <style id="s2sessions">（只取标签页、模型标签、弹窗、目录这几段），再补上它们依赖的几条公共规则。
内联图片（纸边遮罩）抽成 assets/kit 文件。用法：python3 harvest_model.py"""
import re, os, base64, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'dist', 'trianon.html')
KIT = os.path.join(HERE, '..', 'assets', 'kit')
OUT = os.path.join(HERE, '..', 'src', 'css', 'kit_model.css')
h = open(SRC, encoding='utf8').read()
s = re.search(r'<style id="s2sessions">(.*?)</style>', h, re.S).group(1)
def cut(a, b):
    i = s.index(a); j = s.index(b, i); return s[i:j]
parts = [cut('/* shared paper index tabs */', '.tb-dot'),
         cut('/* ---------- composer model chip', '@media (prefers-reduced-motion:reduce)')]
# 原版这几条写在别的样式块里
def rule(sel):
    m = re.search(r'(?<![\w.-])' + re.escape(sel) + r'\{[^}]*\}', h)
    assert m, sel
    return m.group(0)
extra = [rule('.drw-ribbon'), rule('.drw-ribbon::before'), rule('.dw-q'), rule('.dw-q svg:first-child'), rule('.dw-q em'), rule('.dw-q kbd'), rule('.dw-ink')]
css = '/* 模型标签、选择弹窗、模型目录：原版 v2 的样式，原样搬来（tools/harvest_model.py 生成，不要手改） */\n' + '\n'.join(extra) + '\n' + '\n'.join(parts)
css += '\n@media (prefers-reduced-motion:reduce){.ptab,.sld-th,.mchip,.mp-row,.md-row{transition:none!important;transform:none}}\n'
def img(m):
    u = m.group(1); mime, b = u[5:].split(';base64,', 1)
    ext = {'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg'}.get(mime, 'bin')
    raw = base64.b64decode(b + '=' * (-len(b) % 4)); fn = hashlib.md5(raw).hexdigest()[:10] + '.' + ext
    p = os.path.join(KIT, fn)
    if not os.path.exists(p): open(p, 'wb').write(raw)
    return f'url("asset:kit/{fn}")'
css = re.sub(r'url\("(data:image/(?:png|webp|svg\+xml);base64,[^"]+)"\)', img, css)
open(OUT, 'w', encoding='utf8').write(css)
print('wrote', OUT, len(css))
