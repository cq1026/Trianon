"""夜间主题：从日间样式自动换算出一份 body[data-theme="dark"] 覆盖样式（构建时调用）。

做法：逐条读样式，凡是写了颜色的属性（文字、背景、边框、阴影、填充……），把里面的颜色按下面的规则换算，
选择器前面加上 body[data-theme="dark"]，重要性跟原来一样。图片、遮罩、url() 里的东西不动。
换算规则（HSL）：
  - 不透明的浅色（纸、底色）→ 深墨蓝；近乎无彩色的浅色统一偏向墨蓝色相
  - 半透明的浅色（叠在上面提亮用的白纱）→ 半透明的淡蓝白，透明度降低，保持「提亮」的意思
  - 深色（文字、线条）→ 浅色，色相不变，饱和度略降
  - 饱和的中间色（金、玫瑰）→ 基本不变，稍微提亮；不饱和的中间调（边框）→ 基本保持
  - 外阴影保持是阴影（更深），内阴影（描边圈）按普通颜色换算
人工微调写在 src/css/dark.css，放在这份自动结果后面。"""
import re, colorsys

NAMED = {'white': (255, 255, 255, 1.0), 'black': (0, 0, 0, 1.0)}
COLOR_PROPS = re.compile(r'^(color|background|background-color|background-image|border|border-(top|right|bottom|left|block|inline)(-color)?|border-color|'
                         r'outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration|text-decoration-color|column-rule|'
                         r'-webkit-text-fill-color|accent-color|scrollbar-color|filter|--[\w-]+)$')
TOK = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b')

def parse(tok):
    t = tok.lower()
    if t in NAMED: return NAMED[t]
    if t.startswith('#'):
        h = t[1:]
        if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
        if len(h) not in (6, 8): return None
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    nums = re.findall(r'[\d.]+%?', t)
    if len(nums) < 3: return None
    def ch(v): return float(v[:-1]) * 2.55 if v.endswith('%') else float(v)
    a = 1.0
    if len(nums) >= 4: a = float(nums[3][:-1]) / 100 if nums[3].endswith('%') else float(nums[3])
    return ch(nums[0]), ch(nums[1]), ch(nums[2]), a

def fmt(r, g, b, a):
    r, g, b = (max(0, min(255, round(x))) for x in (r, g, b))
    return f'rgb({r}, {g}, {b})' if a >= .999 else f'rgba({r}, {g}, {b}, {round(a, 3)})'

INK_H = 226 / 360
def mapc(c, shadow=False):
    r, g, b, a = c
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if shadow:                                   # 外阴影：深色更深；浅色的光晕变成淡淡的蓝光
        if l < .6: return fmt(2, 4, 14, min(.78, a * 1.7 + .05))
        return fmt(150, 170, 235, a * .28)
    if l >= .6 and a < .8:                       # 半透明白纱 → 淡蓝白、更透明
        return fmt(196, 210, 248, a * (.16 if l > .85 else .22))
    if s > .32 and .34 < l < .72:                # 金、玫瑰这类饱和中间色：稍微提亮
        l2 = min(.82, l + .1); r2, g2, b2 = colorsys.hls_to_rgb(h, l2, s * .92)
        return fmt(r2 * 255, g2 * 255, b2 * 255, a)
    if .45 <= l < .72:                           # 中间调（边框、描边圈、次要线条）：基本保持，略压暗
        r2, g2, b2 = colorsys.hls_to_rgb(h, l * .9, s * .85)
        return fmt(r2 * 255, g2 * 255, b2 * 255, a)
    if l >= .72:                                 # 不透明浅色 → 深墨蓝
        l2 = .135 + (1 - l) * .5
        if s < .3 or l > .9: h2 = INK_H; s2 = .36
        else: h2 = h; s2 = s * .7
        r2, g2, b2 = colorsys.hls_to_rgb(h2, l2, s2)
        return fmt(r2 * 255, g2 * 255, b2 * 255, a)
    l2 = .93 - l * .72                           # 深色文字 / 线条 → 浅色
    r2, g2, b2 = colorsys.hls_to_rgb(h, l2, s * .62)
    return fmt(r2 * 255, g2 * 255, b2 * 255, a)

def split_top(v, sep=','):
    out, d, cur = [], 0, ''
    for ch in v:
        if ch == '(': d += 1
        elif ch == ')': d -= 1
        if ch == sep and d == 0: out.append(cur); cur = ''
        else: cur += ch
    out.append(cur); return out

def recolor(v, shadow_ctx=False):
    """换算一个属性值里的颜色；url(...) 里不动"""
    parts = re.split(r'(url\((?:"[^"]*"|\'[^\']*\'|[^)]*)\))', v)
    def sub(seg, shadow):
        return TOK.sub(lambda m: (lambda c: mapc(c, shadow) if c else m.group(0))(parse(m.group(0))), seg)
    res = []
    for p in parts:
        if p.startswith('url('): res.append(p); continue
        if shadow_ctx:
            res.append(','.join(sub(seg, 'inset' not in seg) for seg in split_top(p)))
        else: res.append(sub(p, False))
    return ''.join(res)

def recolor_filter(v):
    return re.sub(r'drop-shadow\(((?:[^()]|\([^()]*\))*)\)', lambda m: 'drop-shadow(' + recolor(m.group(1), True) + ')', v)

def decls(body):
    out = []
    for d in split_top(body, ';'):
        if ':' not in d: continue
        k, v = d.split(':', 1); k = k.strip(); v = v.strip()
        if not COLOR_PROPS.match(k): continue
        if not TOK.search(re.sub(r'url\([^)]*\)', '', v)): continue
        imp = ''
        if v.endswith('!important'): v = v[:-10].strip(); imp = ' !important'
        if k == 'filter':
            if 'drop-shadow' not in v: continue
            nv = recolor_filter(v)
        else:
            nv = recolor(v, k in ('box-shadow', 'text-shadow'))
        if nv != v: out.append(f'{k}: {nv}{imp}')
    return out

PRE = 'body[data-theme="dark"]'
def prefix(sel):
    out = []
    for s in split_top(sel):
        s = s.strip()
        if not s: continue
        if s.startswith(':root'): out.append(PRE + s[5:]); continue
        if s.startswith('html'): return None
        m = re.match(r'body(?=[.\[:\s>]|$)', s)
        out.append(PRE + s[4:] if m else PRE + ' ' + s)
    return ', '.join(out)

def rules(css):
    """把样式拆成 (前缀@规则, 选择器, 声明) ；@media 展开一层，@keyframes / @font-face 跳过"""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i, n = 0, len(css)
    def block(i):
        d = 0; j = i
        while j < n:
            if css[j] == '{': d += 1
            elif css[j] == '}':
                d -= 1
                if d == 0: return j
            j += 1
        return n
    out = []
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        head = css[i:j].strip(); k = block(j)
        inner = css[j + 1:k]
        if head.startswith('@media') or head.startswith('@supports'):
            for (_, s, b) in rules(inner): out.append((head, s, b))
        elif head.startswith('@'): pass
        else: out.append(('', head, inner))
        i = k + 1
    return out

def generate(css, skip=()):
    groups = []
    for at, sel, body in rules(css):
        if any(x in sel for x in skip): continue
        ds = decls(body)
        if not ds: continue
        ps = prefix(sel)
        if not ps: continue
        groups.append((at, f'{ps} {{ {"; ".join(ds)}; }}'))
    out, cur = [], None
    for at, r in groups:
        if at != cur:
            if cur: out.append('}')
            if at: out.append(at + ' {')
            cur = at
        out.append(r)
    if cur: out.append('}')
    return '\n'.join(out)

if __name__ == '__main__':
    import sys
    print(generate(open(sys.argv[1]).read())[:3000])
