"""按原文图示逐项制作中文 SVG；不改变步骤、对照关系或表格内容。"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
NAVY, BG, PANEL, TEAL, BLUE = '#082740', '#f0ece3', '#f8f6f0', '#1a6377', '#5571dc'
FONT = 'Noto Sans CJK SC,Microsoft YaHei,PingFang SC,LXGW WenKai Lite,sans-serif'


class Diagram:
    def __init__(self, height, title):
        self.h = height
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" viewBox="0 0 1200 {height}" role="img" aria-labelledby="title">',
                      f'<title id="title">{escape(title)}</title>',
                      f'<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{TEAL}"/></marker><marker id="blue-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{BLUE}"/></marker></defs>',
                      f'<rect width="1200" height="{height}" fill="{BG}"/>',
                      f'<g font-family="{FONT}" fill="{NAVY}">']
        self.text(48, 80, title, 36, weight=700)

    def rect(self, x, y, w, h, fill, rx=0, stroke=None):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"' + (f' stroke="{stroke}"' if stroke else '') + '/>')

    def text(self, x, y, lines, size=22, fill=None, anchor='start', weight=400, gap=None):
        lines = [lines] if isinstance(lines, str) else lines
        self.parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill or NAVY}" text-anchor="{anchor}" font-weight="{weight}">')
        for i, line in enumerate(lines):
            self.parts.append(f'<tspan x="{x}" dy="{0 if i == 0 else gap or size * 1.45}">{escape(line)}</tspan>')
        self.parts.append('</text>')

    def path(self, d, color=TEAL, width=1.6, arrow=False, opacity=1):
        marker = ' marker-end="url(#blue-arrow)"' if arrow and color == BLUE else ' marker-end="url(#arrow)"' if arrow else ''
        self.parts.append(f'<path d="{d}" stroke="{color}" stroke-width="{width}" fill="none" opacity="{opacity}"{marker}/>')

    def circle(self, x, y, radius):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="none" stroke="#14202a" stroke-width="1.8"/>')

    def document(self, x, y, scale=1):
        self.parts.append(f'<g transform="translate({x},{y}) scale({scale})" fill="none" stroke="#14202a" stroke-width="1.5"><rect x="0" y="0" width="30" height="36" rx="2"/><path d="M6 8H24M6 14H24M6 20H24M6 26H18"/><path d="M4 -4H34V30"/></g>')

    def endpoint(self, x, y, label, handshake=False):
        self.circle(x, y, 46)
        if handshake:
            self.path(f'M{x-28} {y-16}l16 -8 14 12 -12 13 -9 -4 -14 13 22 22 8 -3 7 -8 7 -5 3 -9 -15 -15', '#14202a', 1.8)
            self.path(f'M{x+28} {y-18}l-14 -7 -15 12M{x-14} {y+13}l13 13M{x-7} {y+6}l15 14', '#14202a', 1.8)
        else:
            self.document(x-18, y-20, 1.15)
        self.text(x, y+73, label, 21, anchor='middle', weight=700)

    def footer(self):
        self.text(52, self.h-107, '注：仅作示意', 18, fill='#9c978d')
        self.rect(0, self.h-69, 1200, 69, '#f9f8f1')
        self.text(52, self.h-25, '更多图表：a16z.news/subscribe', 22, fill='#a29b8c')
        self.text(1145, self.h-22, 'a16z', 32, fill='#a29b8c', anchor='end', weight=700)

    def save(self, name):
        self.footer()
        self.parts.append('</g></svg>')
        (ROOT / name).write_text('\n'.join(self.parts), encoding='utf-8')


def workflow():
    d = Diagram(1000, '在原告方诉讼业务中赢下接力赛')
    d.rect(30, 142, 1140, 690, PANEL)
    d.text(54, 185, '传统工作流', 28, weight=700)
    for top in [216, 555]:
        d.rect(267, top, 660, 100, BG, rx=3)
        d.text(597, top+30, '客户来电、警方报告、证人证言、医疗记录、账单', 19, anchor='middle')
        for i in range(6):
            d.document(350+i*90, top+49, .8)
    d.endpoint(150, 361, '接案')
    d.endpoint(1040, 361, '和解', True)
    labels = ['案件评估', '调查取证', '治疗跟踪', '索赔与谈判']
    for i, label in enumerate(labels):
        x = 270+i*172
        d.rect(x, 335, 142, 54, NAVY, 3)
        d.text(x+71, 369, label, 20, '#fff', 'middle', 700)
        if i < 3:
            d.path(f'M{x+142} 362H{x+172}', arrow=True)
    d.path('M196 362H270', arrow=True)
    d.path('M928 362H994', arrow=True)
    for i, target in enumerate([342, 514, 686, 858]):
        d.path(f'M{365+i*90} 300C{target-80} 340 {target+75} 305 {target} 334', '#b7c5bf', 1.4, True, .85)
    for i in range(3):
        x = 340+i*172
        d.path(f'M{x} 389C{x+12} 420 {x+142} 427 {x+152} 390', '#b7c5bf', 1.4, True, .85)
    d.path('M638 377C690 375 680 465 650 462C613 460 626 422 631 399', arrow=True)
    d.text(280, 438, '响应缓慢', 20, '#d97559', 'middle')
    d.text(443, 429, ['案件处理', '不充分'], 19, '#d97559', 'middle', gap=24)
    d.text(588, 429, ['跟进', '中断'], 19, '#d97559', 'middle', gap=24)
    d.text(788, 438, '上下文丢失', 20, '#d97559', 'middle')
    d.text(54, 533, '长期运行的智能体', 28, weight=700)
    d.endpoint(150, 713, '接案')
    d.endpoint(1040, 713, '和解', True)
    d.path('M196 713H270', arrow=True)
    d.path('M928 713H994', arrow=True)
    d.rect(270, 685, 658, 54, BLUE, 3)
    d.text(599, 720, '案件智能体', 21, '#fff', 'middle', 700)
    d.path('M588 685V655', BLUE, arrow=True)
    d.path('M613 655V684', BLUE, arrow=True)
    d.text(565, 673, '请求与接收', 18, BLUE, 'end')
    d.rect(270, 772, 658, 34, BG)
    d.text(599, 795, '客户与律师', 18, anchor='middle', weight=700)
    d.path('M588 739V770', BLUE, arrow=True)
    d.path('M613 770V740', BLUE, arrow=True)
    d.text(565, 762, '更新', 18, BLUE, 'end')
    d.save('01-诉讼业务接力赛.svg')


def evolution():
    d = Diagram(740, '企业 AI 的演进')
    # 三个箭头形列保留原图从任务、交互到结果的演进关系。
    for i, color in enumerate(['#e4eef0', '#bbd2d9', '#89b2bf']):
        top = [200, 480, 800, 1120]
        middle = [200, 525, 845, 1155]
        points = [(top[i], 155), (top[i+1], 155), (middle[i+1], 330),
                  (top[i+1], 536), (top[i], 536), (middle[i], 330)]
        d.parts.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in points)+f'" fill="{color}"/>')
    for i, (title, owned, example) in enumerate([
        ('AI 助手', '负责一项任务', '“发出这封跟进邮件”'),
        ('智能体', '负责一次交互', '“处理这位客户的退款来电”'),
        ('长期运行的智能体', '负责最终结果', '“让这位客户获得尽可能多的赔偿”')]):
        x = 238+i*310
        d.text(x, 207, title, 25, weight=700)
        d.text(x, 248, owned, 23)
        d.text(x, 287, example, 16)
    d.rect(48, 397, 1100, 68, '#ffffff', rx=0)
    d.parts[-1] = d.parts[-1].replace('/>', ' opacity=".30"/>')
    for y in [330, 397, 465]:
        d.path(f'M200 {y}H1148', '#a4bfc8', 1)
    rows = [('时间跨度', ['秒级', '分钟级', '数周至数月']),
            ('工作范围', ['一条消息', '一次通话', '完整旅程']),
            ('预算', ['软件支出', '人力支出', '成果价值分成'])]
    for i, (label, values) in enumerate(rows):
        y = 373+i*68
        d.text(177, y, label, 23, anchor='end', weight=700)
        for j, value in enumerate(values):
            d.text(238+j*310, y, value, 23)
    d.save('02-企业AI的演进.svg')


def market():
    d = Diagram(720, '进入市场的三条路径')
    d.rect(48, 155, 1104, 94, TEAL)
    for x, label in [(70, '市场进入方式'), (365, '优势'), (775, '挑战')]:
        d.text(x, 213, label, 26, '#fff', weight=700)
    rows = [
        ('卖平台', ['没有既有合同', '形成价格锚点'], ['销售周期更长，', '成果归因更复杂']),
        ('卖服务', ['投资回报计算简单，', '销售周期更短'], ['最高价值的工作流', '多由企业内部完成，', '增长空间受限']),
        ('做全栈业务', ['完整获取所创造的价值，', '不存在归因难题'], ['承担全部业务环节，', '运营复杂度高'])]
    for i, (route, strengths, challenges) in enumerate(rows):
        y = 249+i*94
        d.rect(48, y, 1104, 94, '#e4f1f1' if i != 1 else '#f4f8f7')
        if i: d.path(f'M48 {y}H1152', '#b5c9c9', 1)
        d.text(70, y+42, route, 24, weight=600)
        d.text(365, y+38, strengths, 22, gap=31)
        d.text(775, y+26 if i == 1 else y+38, challenges, 20 if i == 1 else 22, gap=25 if i == 1 else 31)
    d.save('03-进入市场的三条路径.svg')


if __name__ == '__main__':
    workflow()
    evolution()
    market()
