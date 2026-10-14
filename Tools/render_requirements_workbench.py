from pathlib import Path
import html
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'GenerativeSoftwareEngineering/7 需求和架构（二）：受控中文.md'
OUT = ROOT / 'HTML Pages/需求和架构（二）-阅读工作台.html'

raw = SOURCE.read_text(encoding='utf-8')
source_hash = hashlib.sha256(raw.encode('utf-8')).hexdigest()[:12]
lines = raw.splitlines()
if lines and lines[0].strip() == '---':
    try:
        end = next(i for i, line in enumerate(lines[1:], 1) if line.strip() == '---')
        lines = lines[end+1:]
    except StopIteration:
        pass


def inline(text: str) -> str:
    # Escape source text first. Placeholders keep generated inline tags safe.
    value = html.escape(text, quote=False)
    slots = []
    def slot(markup: str) -> str:
        slots.append(markup)
        return f'\x00{len(slots)-1}\x00'
    value = re.sub(r'`([^`]+)`', lambda m: slot(f'<code>{m.group(1)}</code>'), value)
    value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: slot(
        f'<a href="{html.escape(m.group(2), quote=True)}" target="_blank" rel="noreferrer">{m.group(1)}</a>'
    ), value)
    value = re.sub(r'\*\*([^*]+)\*\*', lambda m: f'<strong>{m.group(1)}</strong>', value)
    for i, markup in enumerate(slots):
        value = value.replace(f'\x00{i}\x00', markup)
    return value


def slug(text: str) -> str:
    # Stable IDs make the generated table of contents linkable.
    value = re.sub(r'<[^>]+>', '', text)
    value = re.sub(r'[^\w\u4e00-\u9fff]+', '-', value, flags=re.UNICODE).strip('-').lower()
    return value or 'section'

blocks = []
heading1 = None
sections = []
current = None
paragraph = []
list_items = []
list_kind = None

def flush_paragraph():
    global paragraph
    if paragraph:
        blocks.append(('p', ' '.join(x.strip() for x in paragraph)))
        paragraph = []

def flush_list():
    global list_items, list_kind
    if list_items:
        blocks.append((list_kind, list_items[:]))
        list_items = []
        list_kind = None

def flush_blocks():
    flush_paragraph()
    flush_list()

for line in lines:
    heading = re.match(r'^(#{1,6})\s+(.+?)\s*$', line)
    if heading:
        flush_blocks()
        level = len(heading.group(1))
        title = heading.group(2)
        if level == 1:
            heading1 = title
        elif level == 2:
            if current is not None:
                sections.append(current)
            current = {'title': title, 'id': slug(title), 'blocks': []}
            blocks = current['blocks']
        else:
            blocks.append((f'h{level}', title))
        continue
    if re.match(r'^\s*[-*]\s+', line):
        flush_paragraph()
        item = re.sub(r'^\s*[-*]\s+', '', line)
        if list_kind not in (None, 'ul'):
            flush_list()
        list_kind = 'ul'
        list_items.append(item)
        continue
    if re.match(r'^\s*\d+\.\s+', line):
        flush_paragraph()
        item = re.sub(r'^\s*\d+\.\s+', '', line)
        if list_kind not in (None, 'ol'):
            flush_list()
        list_kind = 'ol'
        list_items.append(item)
        continue
    if not line.strip():
        flush_blocks()
        continue
    flush_list()
    paragraph.append(line)
flush_blocks()
if current is not None:
    sections.append(current)

assert heading1, 'Markdown title not found'
assert len(sections) == 18, f'Expected 18 level-2 sections, got {len(sections)}'

def render_block(block):
    kind, data = block
    if kind == 'p':
        return f'<p>{inline(data)}</p>'
    if kind in ('ul', 'ol'):
        items = ''.join(f'<li>{inline(item)}</li>' for item in data)
        return f'<{kind}>{items}</{kind}>'
    if kind.startswith('h'):
        level = kind[1:]
        return f'<h{level}>{inline(data)}</h{level}>'
    raise ValueError(kind)

source_html = []
toc_html = []
for index, section in enumerate(sections, 1):
    sid = f'section-{index:02d}-{section["id"]}'
    rendered_blocks = "\n".join(render_block(block) for block in section['blocks'])
    source_html.append(
        f'<section class="source-section" id="{sid}" data-section="{index}" data-title="{html.escape(section["title"], quote=True)}">\n'
        f'<h2 id="{sid}-title">{inline(section["title"])}</h2>\n'
        + rendered_blocks
        + '\n</section>'
    )
    toc_html.append(
        f'<a href="#{sid}" data-section-link="{index}"><span>{index:02d}</span>{inline(section["title"])}</a>'
    )

css = r'''
:root{--paper:#f5f5ef;--paper-2:#ecefe9;--ink:#1f2925;--muted:#64736c;--forest:#1f5548;--forest-deep:#123d34;--accent:#c36d3b;--rule:#d4ddd5;--wash:#e2ece5;--white:#fffef9;--shadow:0 18px 50px rgba(31,85,72,.10);font-family:"Noto Sans SC","Source Han Sans SC","PingFang SC","Hiragino Sans GB",system-ui,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-size:16px;line-height:1.85}a{color:var(--forest)}button,input{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.topbar{position:sticky;top:0;z-index:20;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(1rem,4vw,4.8rem);border-bottom:1px solid var(--rule);background:rgba(245,245,239,.92);backdrop-filter:blur(14px)}.brand{display:flex;align-items:center;gap:.65rem;color:var(--forest-deep);text-decoration:none;font-weight:800;letter-spacing:.01em}.brand-mark{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--forest);color:var(--forest);font-size:.73rem}.top-actions{display:flex;align-items:center;gap:.4rem}.top-actions a,.top-actions button{border:1px solid transparent;background:transparent;color:var(--muted);padding:.42rem .7rem;text-decoration:none;font-size:.86rem}.top-actions a:hover,.top-actions button:hover{border-color:var(--rule);color:var(--forest);background:var(--white)}.top-actions .accent-link{border-color:var(--forest);color:var(--forest)}
.progress-track{height:3px;background:var(--rule);position:fixed;top:68px;left:0;right:0;z-index:21}.progress-bar{display:block;height:100%;width:0;background:var(--accent);transition:width .16s ease}.layout{display:grid;grid-template-columns:minmax(220px,286px) minmax(0,920px);gap:0;max-width:1400px;margin:0 auto}.sidebar{border-right:1px solid var(--rule);padding:2.1rem 1.2rem 4rem;min-height:calc(100vh - 71px)}.sidebar-inner{position:sticky;top:96px}.sidebar-label{margin:0 0 .45rem;color:var(--muted);font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.search-wrap{position:relative;margin:0 0 1.2rem}.search-wrap label{display:block;margin:0 0 .35rem;font-size:.82rem;font-weight:700;color:var(--forest)}.search-wrap input{width:100%;border:1px solid var(--rule);background:var(--white);color:var(--ink);padding:.68rem .75rem;border-radius:2px}.search-wrap input::placeholder{color:#91a099}.search-status{min-height:1.35rem;color:var(--muted);font-size:.78rem;margin:.35rem 0 .7rem}.toc{display:grid;gap:.12rem;max-height:calc(100vh - 260px);overflow:auto;padding-right:.2rem}.toc a{display:flex;align-items:flex-start;gap:.55rem;color:var(--muted);font-size:.85rem;line-height:1.4;text-decoration:none;padding:.4rem .46rem;border-left:2px solid transparent}.toc a span{font-variant-numeric:tabular-nums;color:#9aa8a1;font-size:.72rem;padding-top:.12rem}.toc a:hover,.toc a[aria-current="true"]{color:var(--forest);background:var(--wash);border-left-color:var(--accent)}.toc a.is-hidden{display:none}.side-note{margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.78rem}.side-note a{display:block;margin:.35rem 0}
main{min-width:0;padding:clamp(2.4rem,5vw,5.4rem) clamp(1.25rem,5vw,5.8rem) 6rem}.hero{position:relative;padding:0 0 3rem;border-bottom:1px solid var(--rule);margin-bottom:1rem}.eyebrow{margin:0 0 .7rem;color:var(--accent);font-size:.77rem;font-weight:800;letter-spacing:.18em}.hero h1{max-width:16ch;margin:0;color:var(--forest-deep);font-size:clamp(2.4rem,5vw,4.6rem);line-height:1.16;letter-spacing:-.055em}.hero-lede{max-width:58ch;margin:1.25rem 0 0;color:var(--muted);font-size:1.02rem}.hero-meta{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;margin:1.4rem 0 0;color:var(--muted);font-size:.82rem}.hero-meta span{display:inline-flex;align-items:center;gap:.4rem}.hero-meta span::before{content:"";width:.45rem;height:.45rem;background:var(--accent);display:inline-block}.source-content{counter-reset:section}.source-section{scroll-margin-top:104px;padding:2.1rem 0 2.5rem;border-bottom:1px solid var(--rule)}.source-section:last-child{border-bottom:0}.source-section h2{display:flex;align-items:baseline;gap:.75rem;margin:0 0 1rem;color:var(--forest);font-size:clamp(1.35rem,2vw,1.8rem);line-height:1.35;letter-spacing:-.025em}.source-section h2::before{content:attr(data-number);display:none}.source-section p,.source-section li{max-width:72ch}.source-section p{margin:.82rem 0}.source-section ul,.source-section ol{padding-left:1.35rem;margin:1rem 0}.source-section li{margin:.38rem 0}.source-section strong{color:var(--forest-deep)}.source-section code{padding:.08em .28em;background:var(--wash);border:1px solid #d5e3d8;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}.source-section a{text-decoration-thickness:1px;text-underline-offset:2px}.workbench-note{margin-top:3rem;padding:1.2rem 1.25rem;border-left:3px solid var(--accent);background:var(--wash);color:#496057;font-size:.9rem}.workbench-note p{margin:.25rem 0}.workbench-note a{font-weight:700}.source-footer{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.78rem}
.no-results{display:none;margin:2rem 0;color:var(--muted)}.no-results.visible{display:block}.searching .source-section{display:none}.searching .source-section.search-hit{display:block}
@media(max-width:940px){.layout{grid-template-columns:230px minmax(0,1fr)}.top-actions a:nth-child(1){display:none}}
@media(max-width:720px){.topbar{height:60px}.progress-track{top:60px}.top-actions a,.top-actions button{padding:.35rem .45rem;font-size:.78rem}.layout{display:block}.sidebar{border-right:0;border-bottom:1px solid var(--rule);min-height:auto;padding:1rem}.sidebar-inner{position:static}.toc{max-height:none;display:none;grid-template-columns:repeat(2,minmax(0,1fr));gap:.2rem}.sidebar.open .toc{display:grid}.side-note{display:none}.mobile-menu{display:block!important;margin:.6rem 0 0;border:1px solid var(--rule);background:var(--white);color:var(--forest);padding:.5rem .7rem}.hero h1{font-size:clamp(2.3rem,11vw,3.5rem)}main{padding-top:2.6rem}.source-section{padding:1.8rem 0 2.1rem}}
@media(min-width:721px){.mobile-menu{display:none}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.progress-bar{transition:none}}
@media print{body{background:#fff;color:#111}.topbar,.progress-track,.sidebar,.workbench-note{display:none!important}.layout{display:block;max-width:none}main{padding:0}.hero{padding:0 0 1rem}.source-section{break-inside:auto;page-break-inside:auto;border-bottom:0;padding:1.2rem 0}.source-section h2{break-after:avoid}.source-footer{margin-top:1rem}}
'''

js = r'''
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const sections = $$('.source-section');
  const links = $$('[data-section-link]');
  const sidebar = $('.sidebar');
  const search = $('#search');
  const status = $('#searchStatus');
  const noResults = $('#noResults');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

  $('#menuBtn')?.addEventListener('click', event => {
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  $('#printBtn')?.addEventListener('click', () => window.print());

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(100, Math.round(window.scrollY / max * 100)) : 0;
    $('#progressBar').style.width = `${value}%`;
    $('#progressText').textContent = `${value}%`;
  };
  window.addEventListener('scroll', updateProgress, {passive: true});
  updateProgress();

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.removeAttribute('aria-current'));
      $(`[data-section-link="${entry.target.dataset.section}"]`)?.setAttribute('aria-current', 'true');
    });
  }, {rootMargin: '-18% 0px -68% 0px'});
  sections.forEach(section => observer.observe(section));

  search?.addEventListener('input', event => {
    const term = normalize(event.target.value);
    let hits = 0;
    sections.forEach(section => {
      const hit = !term || normalize(section.textContent).includes(term);
      section.classList.toggle('search-hit', hit);
      const link = $(`[data-section-link="${section.dataset.section}"]`);
      link?.classList.toggle('is-hidden', !hit);
      if (hit) hits += 1;
    });
    document.body.classList.toggle('searching', Boolean(term));
    noResults.classList.toggle('visible', Boolean(term) && hits === 0);
    status.textContent = term ? (hits ? `找到 ${hits} 个相关章节` : `没有找到“${event.target.value.trim()}”`) : '输入关键词，按章节筛选';
  });
})();
'''

toc = '\n'.join(toc_html)
content = '\n'.join(source_html)
template = '''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="以受控中文稿为唯一正文来源的《需求和架构（二）》交互式阅读工作台。">
<title>需求和架构（二）｜阅读工作台</title>
<style>__CSS__</style>
</head>
<body>
<!-- 正文由 GenerativeSoftwareEngineering/7 需求和架构（二）：受控中文.md 生成。源文件指纹：__HASH__。不要在本页另写正文。 -->
<header class="topbar">
  <a class="brand" href="#top"><span class="brand-mark" aria-hidden="true">7</span><span>受控中文 / 阅读工作台</span></a>
  <div class="top-actions" aria-label="页面操作">
    <a href="需求和架构（二）-受控中文.html">正文排版页</a>
    <a class="accent-link" href="需求和架构（二）-事件重放实验.html">事件重放实验</a>
    <button id="printBtn" type="button">打印</button>
  </div>
</header>
<div class="progress-track" aria-hidden="true"><span class="progress-bar" id="progressBar"></span></div>
<div class="layout" id="top">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      <p class="sidebar-label">阅读工具</p>
      <div class="search-wrap"><label for="search">搜索正文</label><input id="search" type="search" placeholder="例如：事件、依赖、抽象" autocomplete="off"><p class="search-status" id="searchStatus" aria-live="polite">输入关键词，按章节筛选</p></div>
      <button class="mobile-menu" id="menuBtn" type="button" aria-expanded="false" aria-controls="toc">显示目录</button>
      <nav class="toc" id="toc" aria-label="正文目录">__TOC__</nav>
      <div class="side-note"><p>正文只来自受控中文稿。这里增加的是导航、搜索、进度和打印。</p><a href="需求和架构（二）-自测.html">打开自测</a><a href="需求和架构（二）-受控中文.html">打开完整排版页</a></div>
    </div>
  </aside>
  <main>
    <header class="hero">
      <p class="eyebrow">先读受控中文，再用工作台阅读</p>
      <h1>__TITLE__</h1>
      <p class="hero-lede">本页不再另写一套教材。它把受控中文稿的同一份正文转换成可搜索、可定位、可打印的阅读界面。</p>
      <div class="hero-meta"><span>18 个正文分节</span><span>12 个课程主题</span><span id="progressText">0%</span></div>
    </header>
    <div id="sourceContent" class="source-content">__CONTENT__</div>
    <p class="no-results" id="noResults">没有匹配的章节。请换一个关键词。</p>
    <aside class="workbench-note" aria-label="交互补充">
      <p><strong>交互补充：</strong>需要步进重放事件或做题时，请打开独立页面。它们不是正文的第二个版本。</p>
      <p><a href="需求和架构（二）-事件重放实验.html">事件重放实验</a>　<a href="需求和架构（二）-自测.html">章节自测</a>　<a href="需求和架构（二）-受控中文.html">受控中文排版页</a></p>
    </aside>
    <footer class="source-footer">正文来源：<code>GenerativeSoftwareEngineering/7 需求和架构（二）：受控中文.md</code>。本页的排版和交互不改变正文含义。</footer>
  </main>
</div>
<script>__JS__</script>
</body>
</html>
'''
html_output = template.replace('__CSS__', css).replace('__JS__', js).replace('__TOC__', toc).replace('__CONTENT__', content).replace('__TITLE__', inline(heading1)).replace('__HASH__', source_hash)
OUT.write_text(html_output, encoding='utf-8')
print(f'Wrote {OUT} ({len(html_output)} bytes), {len(sections)} sections, source {source_hash}')
