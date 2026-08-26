# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Christophe Le Bars
# Renderer probe: dump WeasyPrint's computed box geometry for a forme, to locate horizontal overflow.
# For each laid-out element it prints content width + the right edge vs the page's content-box right, so
# we can see whether full-width children (grid rows / column-span:all) are sized to the padding-box
# instead of the content-box. Run: make probe-weasyprint-boxes FORME=formes/weasyprint/ledger-basel.html
import sys
from weasyprint import HTML


def walk(box, depth, page_right, out):
    tag = getattr(box, 'element_tag', None)
    if tag:
        cb_right = box.position_x + box.margin_left + box.border_left_width + box.padding_left + box.width
        cls = ''
        el = getattr(box, 'element', None)
        if el is not None:
            cls = el.get('class') or el.get('data-role') or el.get('data-zone') or ''
        over = cb_right - page_right
        flag = '  <-- OVERFLOWS' if over > 1 else ''
        out.append(f'{"  " * depth}{tag}{("." + cls.split()[0]) if cls else "":<18} x={box.position_x:7.1f} w={box.width:7.1f} right={cb_right:7.1f}{flag}')
    for child in getattr(box, 'children', ()):
        walk(child, depth + 1, page_right, out)


def main(path):
    page = HTML(filename=path).render().pages[0]
    pb = page._page_box
    page_content_right = pb.position_x + pb.margin_left + pb.border_left_width + pb.padding_left + pb.width
    print(f'PAGE content box: width={pb.width:.1f} right={page_content_right:.1f}\n')
    out = []
    walk(pb, 0, page_content_right, out)
    print('\n'.join(out))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'formes/weasyprint/ledger-basel.html')
