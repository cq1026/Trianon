#!/usr/bin/env python3
"""构建 Trianon（SillyTavern 风格前端）：把 src/ 里的 HTML、CSS、JS 和 assets/ 里的图片字体合成一个自包含文件。
用法：python3 app/build.py   →  dist/trianon-st.html
只依赖 Python 3 标准库。"""
import os, re, base64, glob
HERE = os.path.dirname(os.path.abspath(__file__))
SRC, AS = os.path.join(HERE, 'src'), os.path.join(HERE, 'assets')
OUT = os.environ.get('TRIANON_ST_OUT', os.path.join(HERE, '..', 'dist', 'trianon-st.html'))
CSS = ['base.css', 'kit_rail.css', 'kit_thread.css', 'kit_composer.css', 'kit_empty.css', 'app.css']
MIME = {'png': 'image/png', 'webp': 'image/webp', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml', 'woff2': 'font/woff2', 'woff': 'font/woff'}
rd = lambda p: open(p, encoding='utf-8').read()
used = set()
def asset(m):
    rel = m.group(1); p = os.path.join(AS, rel)
    assert os.path.exists(p), 'missing asset ' + rel
    used.add(rel)
    return f'data:{MIME[rel.rsplit(".", 1)[1]]};base64,' + base64.b64encode(open(p, 'rb').read()).decode()
css = '\n'.join(f'/* ---- {f} ---- */\n' + rd(os.path.join(SRC, 'css', f)) for f in CSS)
js = '\n'.join(f'/* ---- {os.path.basename(f)} ---- */\n' + rd(f) for f in sorted(glob.glob(os.path.join(SRC, 'js', '*.js'))))
js = '(()=>{"use strict";\n' + js + '\n})();'
html = rd(os.path.join(SRC, 'index.html')).replace('{{EMPTY}}', rd(os.path.join(SRC, 'parts', 'empty.html'))).replace('{{CSS}}', css).replace('{{JS}}', js)
assert '{{' not in re.sub(r'\{\{\s*(char|user)\s*\}\}', '', html.replace("'{{", '').replace('{{\\s*', '')), 'placeholder left'
# 开场动画放进 <head>（在页面脚本之前运行，先接管输入、挡住页面）
op = ('<style id="kOpCss">\n' + rd(os.path.join(SRC, 'opening', 'opening.css')) + '</style>\n<template id="kOpTpl">' + rd(os.path.join(SRC, 'opening', 'opening.html')).strip()
      + '</template>\n<script type="application/json" id="kOpMeta">{}</script>\n<script>\n' + rd(os.path.join(SRC, 'opening', 'opening.js')) + '\n</script>\n')
html = html.replace('</title>\n', '</title>\n' + op, 1)
html = re.sub(r'asset:([\w\-/]+\.(?:png|webp|jpg|svg|woff2|woff))', asset, html)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(html)
print('wrote', os.path.relpath(OUT), f'{len(html.encode()) / 1024:.0f} KB,', len(used), 'assets')
