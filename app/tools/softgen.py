"""动效「柔和」：从样式里找出所有过渡和动画，生成 body.soft 版本：时长 ×0.7，回弹曲线换成缓停。
（JS 里的 Web Animations 在 js/00_util.js 统一处理，摆动幅度在各模块里按 motionK 减半）"""
import re
from darkgen import rules, split_top

EO = 'cubic-bezier(.22,1,.36,1)'
PROPS = ('transition', 'transition-duration', 'transition-timing-function', 'animation', 'animation-duration', 'animation-timing-function', 'animation-delay', 'transition-delay')

def overshoot(m):
    n = [float(x) for x in re.findall(r'-?[\d.]+', m.group(0))]
    return EO if len(n) == 4 and (n[1] > 1 or n[3] > 1 or n[1] < 0 or n[3] < 0) else m.group(0)

def scale_time(v):
    return re.sub(r'(?<![\w.-])(\d*\.?\d+)(ms|s)\b', lambda m: f'{round(float(m.group(1)) * .7, 3)}{m.group(2)}', v)

def fix(v):
    return scale_time(re.sub(r'cubic-bezier\([^)]*\)', overshoot, v))

def prefix(sel):
    out = []
    for s in split_top(sel):
        s = s.strip()
        if not s or s.startswith(':root') or s.startswith('html'): return None
        m = re.match(r'body(?=[.\[:\s>]|$)', s)
        out.append('body.soft' + s[4:] if m else 'body.soft ' + s)
    return ', '.join(out)

def generate(css):
    out, cur = [], None
    for at, sel, body in rules(css):
        ds = []
        for d in split_top(body, ';'):
            if ':' not in d: continue
            k, v = d.split(':', 1); k = k.strip(); v = v.strip()
            if k not in PROPS: continue
            nv = fix(v)
            if nv != v: ds.append(f'{k}: {nv}')
        if not ds: continue
        ps = prefix(sel)
        if not ps: continue
        if at != cur:
            if cur: out.append('}')
            if at: out.append(at + ' {')
            cur = at
        out.append(f'{ps} {{ {"; ".join(ds)}; }}')
    if cur: out.append('}')
    return '\n'.join(out)
