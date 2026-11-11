"""Tiny CSS scoper used by build_rococo_v2.py to keep each merged page's stylesheet in its own scope.
scope(css, layer, prefixes, guard):
  * every style rule whose selector part does not already name one of the layer's own classes / ids (prefixes, e.g. ['fl','at-'])
    gets the guard put in front of it: `:where(body.ly-files) .stage{...}` (selectors starting with html/body attach it to body)
  * :root custom properties become layer-local names (--tw -> --fl-tw) and every var(--tw) in this sheet follows
  * @keyframes get a layer prefix (flDrop -> fl__flDrop) and animation / animation-name in this sheet follow
  * @font-face blocks are returned separately so identical faces from several pages are emitted once
Returns (scoped_css, font_faces, renames) where renames maps old->new names (for the page's JS, if it mentions them)."""
import re

def _blocks(css):
    """split css into a flat list of (prelude, body) at one nesting level; body is raw text between braces."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            break
        pre = css[i:j].strip()
        d, k = 1, j + 1
        while k < n and d:
            c = css[k]
            if c == '{': d += 1
            elif c == '}': d -= 1
            elif c in '"\'':
                q = c; k += 1
                while k < n and css[k] != q:
                    if css[k] == '\\': k += 1
                    k += 1
            k += 1
        out.append((pre, css[j + 1:k - 1]))
        i = k
    return out

def _split_sel(sel):
    parts, d, cur = [], 0, ''
    for c in sel:
        if c in '([': d += 1
        elif c in ')]': d -= 1
        if c == ',' and d == 0:
            parts.append(cur); cur = ''
        else:
            cur += c
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]

def scope(css, layer, prefixes, guard):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    own = re.compile(r'[.#](?:' + '|'.join(re.escape(p) for p in prefixes) + r')')
    fonts, renames = [], {}
    # keyframes + vars first (names are global to the sheet)
    for name in set(re.findall(r'@keyframes\s+([\w-]+)', css)):
        renames[name] = f'{layer}__{name}'
    for v in set(re.findall(r':root\s*\{([^}]*)\}', css)):
        for name in re.findall(r'(--[\w-]+)\s*:', v):
            renames[name] = f'--{layer}-{name[2:]}'
    def fix_decls(body):
        for old, new in renames.items():
            if old.startswith('--'):
                body = re.sub(re.escape(old) + r'(?![\w-])', new, body)
        def an(m):
            val = m.group(2)
            for old, new in renames.items():
                if not old.startswith('--'):
                    val = re.sub(r'(?<![\w-])' + re.escape(old) + r'(?![\w-])', new, val)
            return m.group(1) + val
        return re.sub(r'(animation(?:-name)?\s*:)([^;}]*)', an, body)
    def walk(text):
        res = []
        for pre, body in _blocks(text):
            if pre.startswith('@font-face'):
                fonts.append('@font-face{' + body.strip() + '}'); continue
            if pre.startswith('@keyframes'):
                name = pre.split()[1]
                res.append(f'@keyframes {renames[name]}{{{body}}}'); continue
            if pre.startswith('@media') or pre.startswith('@supports') or pre.startswith('@layer') or pre.startswith('@container'):
                res.append(pre + '{' + walk(body) + '}'); continue
            if pre.startswith('@'):
                res.append(pre + '{' + body + '}'); continue
            sels = []
            for s in _split_sel(pre):
                if s == ':root':
                    sels.append(f'body.{guard}' if False else ':root'); continue
                if own.search(s):
                    sels.append(s); continue
                m = re.match(r'^(html\s+)?body((?:[.#:\[][^\s>+~]*)?)(.*)$', s)
                if m:
                    sels.append(f'{m.group(1) or ""}body{m.group(2)}:where(.{guard}){m.group(3)}')
                else:
                    sels.append(f':where(body.{guard}) {s}')
            res.append(','.join(sels) + '{' + fix_decls(body) + '}')
        return '\n'.join(res)
    out = walk(css)
    return out, fonts, renames
