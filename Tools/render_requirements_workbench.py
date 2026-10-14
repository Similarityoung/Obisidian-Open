from pathlib import Path
import html
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'GenerativeSoftwareEngineering/7 需求和架构（二）：受控中文.md'
OUT = ROOT / 'HTML Pages/需求和架构（二）-阅读工作台.html'

raw = SOURCE.read_text(encoding='utf-8')
source_hash = hashlib.sha256(raw.encode('utf-8')).hexdigest()[:12]
lines = re.sub(r'<!--.*?-->', '', raw, flags=re.S).splitlines()
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
# The reader's own notes stay in Markdown until they contain actual writing.
sections = [section for section in sections if section['blocks']]
chapters = [section for section in sections if re.match(r'^\d+\. ', section['title'])]
assert [int(section['title'].split('.')[0]) for section in chapters] == list(range(1, 13)), 'Expected the 12 lecture chapters in order'
for chapter in chapters:
    for label in ('**本节问题：**', '**一句话结论：**'):
        assert any(kind == 'p' and data.startswith(label) for kind, data in chapter['blocks']), f'Missing {label} in {chapter["title"]}'

def render_block(block):
    kind, data = block
    if kind == 'p':
        role = ''
        if data.startswith('**本节问题：**'):
            role = ' class="chapter-question"'
        elif data.startswith('**一句话结论：**'):
            role = ' class="chapter-answer"'
        return f'<p{role}>{inline(data)}</p>'
    if kind in ('ul', 'ol'):
        items = ''.join(f'<li>{inline(item)}</li>' for item in data)
        return f'<{kind}>{items}</{kind}>'
    if kind.startswith('h'):
        level = kind[1:]
        return f'<h{level}>{inline(data)}</h{level}>'
    raise ValueError(kind)

source_html = []
toc_html = []
last_group = None
chapter_seen = False
overview_anchor = next(
    (section['id'] for section in sections
     if not re.match(r'^\d+\. ', section['title'])
     and ('总体认识' in section['title'] or '先看主线' in section['title'])),
    'top',
)
for index, section in enumerate(sections, 1):
    chapter = re.match(r'^(\d+)\. (.+)', section['title'])
    if chapter:
        chapter_seen = True
        sid = f'ch{chapter.group(1)}'
        group = '讲义正文 · 按原文顺序'
        kind = 'chapter'
        number = f'<span>{int(chapter.group(1)):02d}</span>'
        nav_title = chapter.group(2)
    else:
        sid = section['id']
        group = '查阅' if chapter_seen else '先读这里'
        kind = 'reference' if chapter_seen else 'overview'
        number = ''
        nav_title = section['title']
    section['anchor'] = sid
    rendered_blocks = "\n".join(render_block(block) for block in section['blocks'])
    source_html.append(
        f'<section class="source-section {kind}" id="{sid}" data-section="{index}" data-title="{html.escape(section["title"], quote=True)}">\n'
        f'<h2 id="{sid}-title">{inline(section["title"])}</h2>\n'
        + rendered_blocks
        + '\n</section>'
    )
    if group != last_group:
        if last_group is not None:
            toc_html.append('</div>')
        toc_html.append(f'<div class="toc-group" data-toc-group="{html.escape(group, quote=True)}"><p>{html.escape(group)}</p>')
        last_group = group
    toc_html.append(
        f'<a href="#{sid}" data-section-link="{index}">{number}{inline(nav_title)}</a>'
    )
toc_html.append('</div>')

css = r'''
:root{--paper:#f5f5ef;--ink:#1f2925;--muted:#5b6a62;--forest:#1f5548;--forest-deep:#123d34;--accent:#a95226;--rule:#d4ddd5;--wash:#e2ece5;--white:#fffef9;font-family:"Noto Sans SC","Source Han Sans SC","PingFang SC","Hiragino Sans GB",sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-size:16px;line-height:1.9}a{color:var(--forest);text-underline-offset:3px}button,input{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}[hidden]{display:none!important}
.skip-link{position:absolute;left:1rem;top:-5rem;background:var(--white);padding:.5rem;z-index:30}.skip-link:focus{top:1rem}
.topbar{position:sticky;top:0;z-index:20;min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem clamp(1rem,4vw,4rem);border-bottom:1px solid var(--rule);background:var(--paper)}
.brand{display:flex;align-items:center;gap:.65rem;color:var(--forest-deep);text-decoration:none;font-weight:750;white-space:nowrap}.brand-mark{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--forest);font-size:.8rem}.top-actions{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.top-actions a,.top-actions button{border:1px solid transparent;background:transparent;color:var(--muted);padding:.35rem .55rem;text-decoration:none;font-size:.85rem}.top-actions a:hover,.top-actions button:hover{border-color:var(--rule);color:var(--forest);background:var(--white)}
.progress-track{height:3px;background:var(--rule);position:fixed;top:64px;left:0;right:0;z-index:21}.progress-bar{display:block;height:100%;width:0;background:var(--accent)}
.layout{display:grid;grid-template-columns:290px minmax(0,900px);max-width:1280px;margin:0 auto}.sidebar{border-right:1px solid var(--rule);padding:1.6rem 1.2rem}.sidebar-inner{position:sticky;top:88px;display:flex;flex-direction:column;height:calc(100dvh - 108px)}.sidebar-label{margin:0 0 .5rem;color:var(--forest);font-size:.8rem;font-weight:700}.search-wrap label{display:block;margin:0 0 .25rem;font-size:.8rem;color:var(--muted)}.search-field{display:flex;gap:.3rem}.search-field input{min-width:0;flex:1;width:100%;border:1px solid var(--rule);background:var(--white);color:var(--ink);padding:.45rem .6rem;border-radius:2px}.search-field button{border:1px solid var(--rule);background:var(--white);color:var(--forest);padding:.3rem .45rem;font-size:.8rem}.search-status{color:var(--muted);font-size:.75rem;margin:.3rem 0 .7rem;line-height:1.6}
.toc{flex:1;min-height:0;overflow:auto;padding-right:.2rem}.toc-group{margin:.6rem 0}.toc-group:first-child{margin-top:0}.toc-group>p{margin:.4rem .5rem;color:var(--forest);font-size:.73rem;font-weight:750}.toc a{display:flex;align-items:flex-start;gap:.6rem;color:var(--muted);font-size:.82rem;line-height:1.5;text-decoration:none;padding:.45rem .5rem;border-left:2px solid transparent}.toc a span{flex:0 0 1.2rem;font-variant-numeric:tabular-nums;color:var(--muted);font-size:.73rem;padding-top:.08rem}.toc a:hover,.toc a[aria-current="true"]{color:var(--forest-deep);background:var(--wash);border-left-color:var(--accent)}.toc a.is-hidden,.toc-group.is-hidden{display:none}.side-note{margin-top:.7rem;padding-top:.7rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.78rem}.side-note a{margin-right:.65rem}
main{min-width:0;padding:2.8rem clamp(1.4rem,4vw,4rem) 5rem}.hero{margin-bottom:1.7rem}.eyebrow{margin:0 0 .55rem;color:var(--accent);font-size:.8rem;font-weight:750}.hero h1{margin:0;color:var(--forest-deep);font-size:clamp(2rem,3.6vw,2.9rem);line-height:1.3;letter-spacing:-.025em}.hero-meta{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;margin:1rem 0 0;color:var(--muted);font-size:.8rem}.reading-controls{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem 1rem;padding:1rem 0 0;font-size:.8rem}.reading-controls button{background:var(--white);border:1px solid var(--forest);border-radius:2px;padding:.4rem .8rem;color:var(--forest)}.reading-controls button[aria-pressed="true"]{background:var(--forest);color:var(--white)}.reading-controls span{color:var(--muted)}
.source-section{scroll-margin-top:90px;padding:2.3rem 0 2.6rem;border-bottom:1px solid var(--rule);overflow-wrap:anywhere}.source-section:last-child{border-bottom:0}.source-section h2{margin:0 0 1.2rem;color:var(--forest);font-size:clamp(1.35rem,2.2vw,1.75rem);line-height:1.5;letter-spacing:-.02em}.source-section h3{margin:2rem 0 .7rem;color:var(--forest-deep);font-size:1.1rem;line-height:1.6}.source-section p{margin:.85rem 0}.source-section ul,.source-section ol{padding-left:1.5rem;margin:1rem 0}.source-section li{margin:.6rem 0}.source-section strong{color:var(--forest-deep)}.source-section code{padding:.08em .25em;background:var(--wash);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}.source-section a{text-decoration-thickness:1px}
.overview{padding:1.4rem 0 2rem;border-top:2px solid var(--forest)}.overview h2{font-size:1.25rem}.overview>p:first-of-type{font-size:1.12rem}.chapter-question{color:var(--muted);font-size:.95rem}.chapter-answer{padding:.8rem 1rem;border-left:3px solid var(--forest);background:linear-gradient(90deg,var(--wash),transparent)}.reference h2{font-size:1.3rem}.reference{font-size:.94rem}
.workbench-note{margin-top:2rem;padding:1rem 0;border-top:2px solid var(--forest);font-size:.9rem}.workbench-note p{margin:.35rem 0}.source-footer{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.8rem;overflow-wrap:anywhere}.no-results{padding:1rem 0;color:var(--muted)}
.summary-mode .chapter>:not(h2):not(.chapter-question):not(.chapter-answer){display:none}.summary-mode .reference{display:none}.searching .source-section{display:none}.searching .source-section.search-hit{display:block}
.mobile-menu{display:none}.static-page .sidebar-inner{height:calc(100dvh - 108px)}
@media(max-width:960px){.layout{grid-template-columns:245px minmax(0,1fr)}.top-actions a:first-child{display:none}}
@media(max-width:720px){.topbar{height:60px;min-height:60px;padding:.5rem 1rem}.brand{font-size:.85rem}.top-actions{gap:.2rem;flex-wrap:nowrap}.top-actions a,.top-actions button{font-size:.78rem;padding:.3rem}.top-actions a:first-child{display:none}.progress-track{top:60px}.layout{display:block}.sidebar{padding:.7rem 1rem;border-right:0;border-bottom:1px solid var(--rule)}.sidebar-inner,.static-page .sidebar-inner{position:static;height:auto}.sidebar-label{display:none}.search-wrap label{display:none}.search-status{margin:.2rem 0 0}.toc{display:none;max-height:60dvh;margin-top:.5rem}.sidebar.open .toc{display:block}.side-note{display:none}.mobile-menu{display:block;align-self:flex-start;margin-top:.4rem;border:1px solid var(--rule);background:var(--white);color:var(--forest);padding:.25rem .7rem;font-size:.8rem}.static-page .toc{display:block;max-height:40dvh}.static-page .sidebar-label{display:block}main{padding:1.7rem 1.25rem 3.5rem}.hero h1{font-size:clamp(1.75rem,7.2vw,2.3rem)}.hero-meta{margin-top:.6rem}.source-section{scroll-margin-top:80px;padding-top:1.8rem}.source-section h2{font-size:1.35rem}.source-section h3{font-size:1.05rem}.overview{padding-top:1.2rem}.overview h2{font-size:1.15rem}.chapter-answer{padding:.7rem .8rem}.top-actions .print-only-label{display:none}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{body{background:#fff;color:#111}.topbar,.progress-track,.sidebar,.workbench-note,.reading-controls,.skip-link,.no-results{display:none!important}.layout{display:block;max-width:none}main{padding:0}.hero{margin-bottom:1rem}.source-section,.summary-mode .reference{display:block!important;border-bottom:0;padding:1rem 0;break-inside:auto}.summary-mode .chapter>:not(h2):not(.chapter-question):not(.chapter-answer){display:revert}.source-section h2,.source-section h3{break-after:avoid}.chapter-answer{background:none}.source-footer{margin-top:1rem}}
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
  const summaryButton = $('#summaryBtn');
  const summaryStatus = $('#summaryStatus');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

  $('#menuBtn')?.addEventListener('click', event => {
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
    event.currentTarget.textContent = open ? '隐藏目录' : '显示目录';
  });
  $('#printBtn')?.addEventListener('click', () => window.print());

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(100, Math.round(window.scrollY / max * 100)) : 0;
    $('#progressBar').style.width = `${value}%`;
    $('#progressText').textContent = `阅读位置 ${value}%`;
  };
  const updateCurrent = () => {
    const visible = sections.filter(section => section.getClientRects().length);
    const current = visible.findLast(section => section.getBoundingClientRect().top <= 160) || visible[0];
    links.forEach(link => link.removeAttribute('aria-current'));
    if (current) $(`[data-section-link="${current.dataset.section}"]`)?.setAttribute('aria-current', 'true');
  };
  window.addEventListener('scroll', updateProgress, {passive: true});
  window.addEventListener('scroll', updateCurrent, {passive: true});
  window.addEventListener('resize', updateProgress);
  window.addEventListener('resize', updateCurrent);
  window.addEventListener('load', updateProgress);
  window.addEventListener('load', updateCurrent);

  const setSummary = enabled => {
    document.body.classList.toggle('summary-mode', enabled);
    summaryButton.setAttribute('aria-pressed', String(enabled));
    summaryButton.textContent = enabled ? '展开完整正文' : '只看问题与结论';
    summaryStatus.textContent = enabled ? '只显示每节的问题与结论。' : '全文阅读 · 问题、结论、解释与例子';
    updateProgress();
    updateCurrent();
  };
  summaryButton.addEventListener('click', () => setSummary(!document.body.classList.contains('summary-mode')));

  const filterSections = () => {
    const term = normalize(search.value);
    if (term) setSummary(false);
    let hits = 0;
    sections.forEach(section => {
      const hit = !term || normalize(section.textContent).includes(term);
      section.classList.toggle('search-hit', hit);
      $(`[data-section-link="${section.dataset.section}"]`)?.classList.toggle('is-hidden', !hit);
      if (hit) hits += 1;
    });
    $$('.toc-group').forEach(group => {
      group.classList.toggle('is-hidden', Boolean(term) && !group.querySelector('a:not(.is-hidden)'));
    });
    document.body.classList.toggle('searching', Boolean(term));
    noResults.hidden = !term || hits > 0;
    $('#clearSearch').hidden = !term;
    summaryButton.disabled = Boolean(term);
    status.textContent = term ? (hits ? `找到 ${hits} 个相关分节，已显示全文` : `没有找到“${search.value.trim()}”`) : '输入关键词，按章节筛选';
    updateProgress();
    updateCurrent();
  };
  search.addEventListener('input', filterSections);
  $('#clearSearch').addEventListener('click', () => {
    search.value = '';
    filterSections();
    search.focus();
  });
  links.forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (target?.classList.contains('reference')) setSummary(false);
    sidebar.classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    $('#menuBtn').textContent = '显示目录';
  }));
  const revealHash = () => {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    if (document.body.classList.contains('searching') && !target.classList.contains('search-hit')) {
      search.value = '';
      filterSections();
    }
    if (target.classList.contains('reference')) setSummary(false);
    target.scrollIntoView();
    updateCurrent();
  };
  window.addEventListener('hashchange', revealHash);
  updateCurrent();
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
  <a class="brand" href="#top"><span class="brand-mark" aria-hidden="true">7</span><span>第七讲 / 阅读工作台</span></a>
  <div class="top-actions" aria-label="页面操作">
    <a href="#__OVERVIEW_ANCHOR__">总体认识</a>
    <a href="需求和架构（二）-受控中文.html">正文排版页</a>
    <a class="accent-link" href="需求和架构（二）-事件重放实验.html">事件重放实验</a>
    <button id="printBtn" type="button">打印</button>
  </div>
</header>
<div class="progress-track" aria-hidden="true"><span class="progress-bar" id="progressBar"></span></div>
<div class="layout" id="top">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      <p class="sidebar-label">章节导航</p>
      <div class="search-wrap"><label for="search">搜索正文</label><input id="search" type="search" placeholder="例如：事件、依赖、抽象" autocomplete="off"><p class="search-status" id="searchStatus" aria-live="polite">输入关键词，按章节筛选</p></div>
      <button class="mobile-menu" id="menuBtn" type="button" aria-expanded="false" aria-controls="toc">显示目录</button>
      <nav class="toc" id="toc" aria-label="正文目录">__TOC__</nav>
      <div class="side-note"><p>正文来自同一份中文稿。这里增加的是导航、搜索、进度和打印。</p><a href="需求和架构（二）-自测.html">打开自测</a><a href="需求和架构（二）-受控中文.html">打开完整排版页</a></div>
    </div>
  </aside>
  <main>
    <header class="hero">
      <p class="eyebrow">需求与架构（二） · 先看主线，再读例子</p>
      <h1>__TITLE__</h1>
      <p class="hero-lede">这堂课要回答：需求变化时，系统应该改哪里？它先讲复杂性和抽象，再讲共同协作规则，最后讲事实、规则和派生结果怎样组成一条可追溯的计算路径。</p>
      <div class="hero-meta"><span>__CHAPTER_COUNT__ 个讲义章节</span><span>一份正文，两个补充页面</span><span id="progressText">0%</span></div>
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
html_output = (template.replace('__CSS__', css).replace('__JS__', js).replace('__TOC__', toc)
               .replace('__CONTENT__', content).replace('__TITLE__', inline(heading1))
               .replace('__HASH__', source_hash).replace('__OVERVIEW_ANCHOR__', overview_anchor)
               .replace('__CHAPTER_COUNT__', str(len(chapters))))
OUT.write_text(html_output, encoding='utf-8')
print(f'Wrote {OUT} ({len(html_output)} bytes), {len(sections)} sections, source {source_hash}')

# Render the same source blocks as a quiet, non-interactive正文页.
CONTROLLED_OUT = ROOT / 'HTML Pages/需求和架构（二）-受控中文.html'
controlled_template = '''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="《需求和架构（二）》受控中文正文。">
<title>受控中文｜需求和架构（二）</title>
<style>__CSS__</style>
</head>
<body>
<!-- 正文由 GenerativeSoftwareEngineering/7 需求和架构（二）：受控中文.md 生成。源文件指纹：__HASH__。 -->
<header class="topbar">
  <a class="brand" href="#top"><span class="brand-mark" aria-hidden="true">7</span><span>生成式软件工程 / 受控中文正文</span></a>
  <div class="top-actions"><a class="accent-link" href="需求和架构（二）-阅读工作台.html">返回阅读工作台</a></div>
</header>
<div class="layout" id="top">
  <aside class="sidebar"><div class="sidebar-inner"><p class="sidebar-label">正文目录</p><nav class="toc" aria-label="正文目录">__TOC__</nav></div></aside>
  <main>
    <header class="hero"><p class="eyebrow">中文正文 / 安静阅读</p><h1>__TITLE__</h1><p class="hero-lede">本页只排版受控中文正文。它不增加课程论证；目录、搜索、进度和交互请使用阅读工作台。</p></header>
    <div id="sourceContent" class="source-content">__CONTENT__</div>
    <footer class="source-footer">本稿借鉴受控语言的短句、主动表达和术语一致原则，不声称符合 ASD-STE100。来源与边界见正文末尾。</footer>
  </main>
</div>
</body>
</html>
'''
controlled_output = (controlled_template.replace('__CSS__', css).replace('__TOC__', toc)
                     .replace('__CONTENT__', content).replace('__TITLE__', inline(heading1))
                     .replace('__HASH__', source_hash).replace('__OVERVIEW_ANCHOR__', overview_anchor)
                     .replace('__CHAPTER_COUNT__', str(len(chapters))))
CONTROLLED_OUT.write_text(controlled_output, encoding='utf-8')
print(f'Wrote {CONTROLLED_OUT} ({len(controlled_output)} bytes), source {source_hash}')
