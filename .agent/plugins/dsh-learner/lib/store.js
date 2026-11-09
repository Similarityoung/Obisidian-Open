import { readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import {
  addDays,
  ensureInside,
  exists,
  firstHeading,
  formatClock,
  formatDate,
  listMarkdownFiles,
  localIso,
  readText,
  relativePath,
  renderTable,
  safeFileName,
  sectionLines,
  splitTableRow,
  truncate,
  writeText,
} from './util.js'
import {
  extractConceptEntries,
  parseLearningState,
  parseSession,
} from './parse.js'

const LEVELS = {
  L0: 'L0 未接触',
  L1: 'L1 读过',
  L2: 'L2 能复述',
  L3: 'L3 能解释',
  L4: 'L4 能应用',
  L5: 'L5 能教别人',
}

const REVIEW_DAYS = { L1: 1, L2: 3, L3: 7, L4: 14, L5: 30 }

function normalizeLevel(level) {
  const match = String(level || '').match(/^L([0-5])/)
  return match ? `L${match[1]}` : 'L2'
}

function levelLabel(level) {
  return LEVELS[normalizeLevel(level)]
}

function levelNumber(level) {
  const match = String(level || '').match(/L([0-5])/)
  return match ? Number(match[1]) : 0
}

function replaceSection(text, heading, lines) {
  const source = text.split(/\r?\n/)
  const start = source.findIndex((line) => line.trim() === `## ${heading}`)
  const block = [`## ${heading}`, '', ...lines]
  if (start === -1) {
    const base = text.trimEnd()
    return `${base}${base ? '\n\n' : ''}${block.join('\n')}\n`
  }
  let end = source.length
  for (let i = start + 1; i < source.length; i += 1) {
    if (/^##\s+/.test(source[i])) {
      end = i
      break
    }
  }
  const before = source.slice(0, start)
  const after = source.slice(end)
  return [...before, ...block, '', ...after].join('\n').replace(/\n{3,}/g, '\n\n')
}

function upsertConcept(text, topic, concept, patch) {
  const lines = text.split(/\r?\n/)
  let sectionStart = lines.findIndex((line) => line.trim() === `## ${topic}`)
  if (sectionStart === -1) {
    const base = text.trimEnd()
    const table = renderTable([
      {
        concept,
        level: patch.level || LEVELS.L1,
        evidence: patch.evidence || '',
        nextReview: patch.nextReview || '',
      },
    ])
    return `${base}${base ? '\n\n' : ''}## ${topic}\n\n${table}\n`
  }
  let sectionEnd = lines.length
  for (let i = sectionStart + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      sectionEnd = i
      break
    }
  }
  let tableStart = -1
  let tableEnd = -1
  for (let i = sectionStart + 1; i < sectionEnd; i += 1) {
    if (/^\s*\|/.test(lines[i])) {
      tableStart = i
      tableEnd = i
      while (tableEnd < sectionEnd && /^\s*\|/.test(lines[tableEnd])) tableEnd += 1
      break
    }
  }
  if (tableStart === -1) {
    const table = renderTable([
      {
        concept,
        level: patch.level || LEVELS.L1,
        evidence: patch.evidence || '',
        nextReview: patch.nextReview || '',
      },
    ])
    return [...lines.slice(0, sectionStart + 1), '', table, '', ...lines.slice(sectionEnd)].join('\n')
  }
  const tableLines = lines.slice(tableStart, tableEnd)
  const rows = []
  if (tableLines.length >= 2) {
    for (const rowLine of tableLines.slice(2)) {
      const cells = splitTableRow(rowLine)
      if (!cells[0]) continue
      rows.push({
        concept: cells[0],
        level: cells[1] || '',
        evidence: cells[2] || '',
        nextReview: cells[3] || '',
      })
    }
  }
  const existing = rows.find((row) => row.concept === concept)
  if (existing) {
    if (patch.level !== undefined) existing.level = patch.level
    if (patch.evidence !== undefined) {
      existing.evidence = existing.evidence
        ? `${patch.evidence}；${existing.evidence}`
        : patch.evidence
    }
    if (patch.nextReview !== undefined) existing.nextReview = patch.nextReview
  } else {
    rows.push({
      concept,
      level: patch.level || LEVELS.L1,
      evidence: patch.evidence || '',
      nextReview: patch.nextReview || '',
    })
  }
  const table = renderTable(rows)
  return [...lines.slice(0, tableStart), ...table.split('\n'), ...lines.slice(tableEnd)].join('\n')
}

export function createLearnerStore(config = {}) {
  const root = resolveVaultPath(config)
  const learningDir = ensureInside(root, resolve(root, config.learningDir || 'Learning'))
  const statePath = join(learningDir, '学习状态.md')
  const conceptsPath = join(learningDir, '概念掌握.md')
  const sessionsDir = join(learningDir, '记录')

  function resolveVaultPath(input) {
    const raw = input.vaultPath || process.env.DSH_LEARNER_VAULT || process.cwd()
    return resolve(raw)
  }

  function ensureScaffold() {
    try {
      if (!exists(sessionsDir)) {
        // mkdir is done through writeText's parent creation when the first record is written.
      }
      if (!exists(conceptsPath)) seedConcepts()
    } catch (error) {
      console.warn('[dsh-learner] 初始化学习数据失败：', error)
    }
  }

  function readState() {
    return parseLearningState(readText(statePath))
  }

  function readConceptSections() {
    const text = readText(conceptsPath)
    const sections = text ? parseConceptSections(text) : []
    return sections
  }

  function parseConceptSections(text) {
    // Kept local to avoid exporting parser internals; mirrors parseConcepts but preserves sections.
    const out = []
    let current = null
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      const heading = lines[i].match(/^##\s+(.+?)\s*$/)
      if (heading) {
        current = { topic: heading[1].trim(), rows: [] }
        out.push(current)
        continue
      }
      if (!current || !/^\s*\|/.test(lines[i])) continue
      const start = i
      while (i < lines.length && /^\s*\|/.test(lines[i])) i += 1
      const table = lines.slice(start, i)
      i -= 1
      if (table.length < 2) continue
      const headers = splitTableRow(table[0])
      const conceptIndex = headers.indexOf('概念')
      if (conceptIndex === -1) continue
      const levelIndex = headers.indexOf('掌握度')
      const evidenceIndex = headers.indexOf('证据')
      const reviewIndex = headers.indexOf('下次复习')
      for (const rowLine of table.slice(2)) {
        const cells = splitTableRow(rowLine)
        if (!cells[conceptIndex]) continue
        current.rows.push({
          concept: cells[conceptIndex],
          level: levelIndex >= 0 ? cells[levelIndex] || '' : '',
          evidence: evidenceIndex >= 0 ? cells[evidenceIndex] || '' : '',
          nextReview: reviewIndex >= 0 ? cells[reviewIndex] || '' : '',
        })
      }
    }
    return out
  }

  function readConcepts() {
    return readConceptSections().flatMap((section) =>
      section.rows.map((row) => ({ ...row, topic: section.topic })),
    )
  }

  function readSessions(limit = 20) {
    if (!exists(sessionsDir)) return []
    let names = []
    try {
      names = readdirSync(sessionsDir)
        .filter((name) => name.endsWith('.md'))
        .sort((a, b) => b.localeCompare(a, 'zh-CN'))
    } catch {
      return []
    }
    return names.slice(0, limit).map((name) => {
      const path = join(sessionsDir, name)
      return parseSession(readText(path), path)
    })
  }

  function findTopicFile(topic) {
    const state = readState()
    const focus = state.currentFocus.find((item) => item.label === topic)
    const candidates = []
    if (focus?.target) candidates.push(resolve(root, focus.target))
    candidates.push(join(learningDir, `${topic}.md`))
    for (const candidate of candidates) {
      if (exists(candidate) && candidate.startsWith(root)) return candidate
    }
    if (!exists(learningDir)) return ''
    const files = readdirSync(learningDir).filter((name) => name.endsWith('.md'))
    const exact = files.find((name) => basename(name, '.md') === topic)
    if (exact) return join(learningDir, exact)
    const partial = files.find(
      (name) => basename(name, '.md').includes(topic) || topic.includes(basename(name, '.md')),
    )
    return partial ? join(learningDir, partial) : ''
  }

  function seedConcepts() {
    const state = readState()
    const topics = state.currentFocus.length
      ? state.currentFocus
      : readdirSyncSafe(learningDir)
          .filter((name) => name.endsWith('.md') && name !== '学习状态.md' && name !== '概念掌握.md')
          .slice(0, 5)
          .map((name) => ({ label: basename(name, '.md'), note: '', target: `Learning/${name}`, path: join(learningDir, name) }))
    const blocks = [
      '---',
      `title: 概念掌握`,
      `date: ${formatDate()}`,
      'draft: true',
      'tags: [learning]',
      '---',
      '',
      '# 概念掌握',
      '',
      '> 学习插件维护的概念掌握表。掌握度：L0 未接触 / L1 读过 / L2 能复述 / L3 能解释 / L4 能应用 / L5 能教别人。',
      '> 「证据」写清日期和来源；「下次复习」为空表示未安排。',
      '',
    ]
    for (const item of topics) {
      const path = item.path || findTopicFile(item.label)
      if (!path) continue
      const entries = extractConceptEntries(readText(path))
      if (!entries.length) continue
      blocks.push(`## ${item.label}`, '')
      blocks.push(
        renderTable(
          entries.map(({ concept, category }) => ({
            concept,
            level: LEVELS.L1,
            evidence: `来自 ${relativePath(root, path)}${category ? `「${category}」` : ''}，待诊断`,
            nextReview: '',
          })),
        ),
      )
      blocks.push('')
    }
    writeText(conceptsPath, blocks.join('\n'))
  }

  function readdirSyncSafe(dir) {
    try {
      return readdirSync(dir)
    } catch {
      return []
    }
  }

  function dueConcepts() {
    const today = formatDate()
    return readConcepts()
      .filter((concept) => concept.nextReview && concept.nextReview <= today)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
  }

  function weakConcepts() {
    const state = readState()
    const focusTopics = new Set(state.currentFocus.map((item) => item.label))
    return readConcepts()
      .filter((concept) => focusTopics.has(concept.topic) && levelNumber(concept.level) <= 2)
      .sort((a, b) => levelNumber(a.level) - levelNumber(b.level))
  }

  function banner() {
    if (!exists(statePath) && !exists(conceptsPath)) return ''
    const state = readState()
    const focus = state.currentFocus
      .slice(0, 3)
      .map((item) => item.label)
      .join('；')
    const due = dueConcepts()
      .slice(0, 2)
      .map((concept) => `${concept.topic}/${concept.concept}（${concept.level || '未分级'}${concept.nextReview ? `，${concept.nextReview}` : ''}）`)
      .join('；')
    const session = readSessions(1)[0]
    const lines = ['【学习者上下文】']
    if (focus) lines.push(`当前重点：${focus}`)
    lines.push(`待复习：${due || '暂无到期'}`)
    if (session) lines.push(`最近学习：${session.date.slice(0, 10)} ${session.topic} · ${truncate(session.summary || session.title, 40)}`)
    lines.push('使用：讲解或出题前先调用 learner_state、learner_topic；学习结束调用 learner_record 记录证据。掌握度只按证据写，不要凭印象拔高。')
    return lines.join('\n')
  }

  function stateText() {
    const state = readState()
    const concepts = readConcepts()
    const due = dueConcepts()
    const sessions = readSessions(5)
    const lines = ['# 学习状态']
    lines.push(`来源：${relativePath(root, statePath)}`)
    if (state.currentFocus.length) {
      lines.push('', '## 当前重点')
      for (const item of state.currentFocus) lines.push(`- ${item.label}${item.note ? `：${item.note}` : ''}`)
    }
    if (state.later.length) {
      lines.push('', '## 以后再学')
      for (const item of state.later) lines.push(`- ${item.label}${item.note ? `：${item.note}` : ''}`)
    }
    if (state.paused.length) {
      lines.push('', '## 暂停')
      for (const item of state.paused) lines.push(`- ${item.label}${item.note ? `：${item.note}` : ''}`)
    }
    if (state.background.length) {
      lines.push('', '## 背景经验')
      for (const item of state.background) lines.push(`- ${item.label}${item.note ? `：${item.note}` : ''}`)
    }
    if (state.todos.length) {
      lines.push('', '## 待办')
      for (const item of state.todos) lines.push(`- ${item.label}${item.note ? `：${item.note}` : ''}`)
    }
    lines.push('', `概念：共 ${concepts.length} 个；待复习 ${due.length} 个`)
    if (due.length) {
      lines.push('', '## 待复习')
      for (const concept of due.slice(0, 10)) {
        lines.push(`- ${concept.topic} / ${concept.concept}（${concept.level || '未分级'}，${concept.nextReview} 到期）`)
      }
    }
    if (sessions.length) {
      lines.push('', '## 最近学习')
      for (const session of sessions) lines.push(`- ${session.date.slice(0, 10)} ${session.topic} · ${session.title}${session.duration ? `（${session.duration} 分钟）` : ''}`)
    }
    lines.push('', `文件：${relativePath(root, conceptsPath)}；${relativePath(root, sessionsDir)}/`)
    return lines.join('\n')
  }

  function topicText(topic, includeContent = true) {
    const path = findTopicFile(topic)
    if (!path) {
      const available = readdirSyncSafe(learningDir)
        .filter((name) => name.endsWith('.md') && name !== '概念掌握.md')
        .map((name) => basename(name, '.md'))
      return `没有找到主题「${topic}」。可用主题：${available.join('、') || '暂无'}。`
    }
    const label = basename(path, '.md')
    const concepts = readConcepts().filter((concept) => concept.topic === label || concept.topic === topic)
    const lines = [`# ${label}`, `文件：${relativePath(root, path)}`]
    if (concepts.length) {
      lines.push('', `## 概念掌握（${concepts.length}）`)
      for (const concept of concepts) {
        lines.push(`- ${concept.concept}：${concept.level || '未分级'}${concept.evidence ? `；证据：${concept.evidence}` : ''}${concept.nextReview ? `；下次复习：${concept.nextReview}` : ''}`)
      }
    }
    if (includeContent) {
      const content = readText(path)
      lines.push('', '## 笔记原文', content.length > 12000 ? `${content.slice(0, 12000)}\n\n（原文较长，已截断）` : content)
    }
    return lines.join('\n')
  }

  function searchText(query, limit = 8) {
    const value = String(query || '').trim()
    if (!value) return '请提供搜索关键词。'
    const terms = value.toLowerCase().split(/\s+/).filter(Boolean)
    const results = []
    for (const path of listMarkdownFiles(root)) {
      const text = readText(path)
      if (!text || text.length > 500_000) continue
      const lower = text.toLowerCase()
      if (!terms.every((term) => lower.includes(term))) continue
      const lines = text.split(/\r?\n/)
      let best = null
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].toLowerCase()
        let score = 0
        for (const term of terms) {
          if (!line.includes(term)) continue
          score += 1 + (line.trim().startsWith('#') ? 2 : 0)
        }
        if (score > 0 && (best === null || score > best.score)) best = { index: i, score }
      }
      if (!best) continue
      const start = Math.max(0, best.index - 1)
      const end = Math.min(lines.length, best.index + 2)
      const snippet = lines.slice(start, end).join('\n').trim()
      results.push({
        path: relativePath(root, path),
        title: firstHeading(text) || basename(path, '.md'),
        line: best.index + 1,
        score: best.score + (basename(path, '.md').toLowerCase().includes(terms[0]) ? 3 : 0),
        snippet,
      })
    }
    results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    const top = results.slice(0, Math.max(1, Math.min(20, Number(limit) || 8)))
    if (!top.length) return `没有找到包含「${value}」的笔记。`
    const lines = [`# 搜索：${value}`, `找到 ${results.length} 篇，显示前 ${top.length} 篇。`]
    top.forEach((result, index) => {
      lines.push('', `${index + 1}. ${result.path} — ${result.title}（第 ${result.line} 行）`, result.snippet)
    })
    return lines.join('\n')
  }

  function nextText() {
    const state = readState()
    const due = dueConcepts()
    const weak = weakConcepts().filter(
      (concept) => !due.some((item) => item.topic === concept.topic && item.concept === concept.concept),
    )
    const sessions = readSessions(3)
    const suggestions = []
    for (const concept of due.slice(0, 3)) {
      suggestions.push(`复习：${concept.topic} / ${concept.concept}（${concept.level || '未分级'}，${concept.nextReview} 到期）`)
    }
    for (const concept of weak.slice(0, 3)) {
      suggestions.push(`补弱：${concept.topic} / ${concept.concept}（${concept.level || '未分级'}）—— 先让用户用自己的话讲一遍`)
    }
    if (sessions[0]?.topic) {
      suggestions.push(`推进：继续 ${sessions[0].topic} 的「${truncate(sessions[0].summary || sessions[0].title, 50)}」`)
    }
    if (!suggestions.length) {
      suggestions.push('先从一个当前重点里选一个概念，用 3 个问题做诊断（回忆 → 解释 → 应用）。')
    }
    const lines = ['# 建议下一步']
    suggestions.slice(0, 5).forEach((item, index) => lines.push(`${index + 1}. ${item}`))
    if (state.currentFocus.length) {
      lines.push('', `当前重点：${state.currentFocus.map((item) => item.label).join('；')}`)
    }
    return lines.join('\n')
  }

  function recordText(args = {}) {
    const topic = String(args.topic || '').trim()
    const summary = String(args.summary || '').trim()
    if (!topic) throw new Error('缺少 topic')
    if (!summary) throw new Error('缺少 summary')
    const now = new Date()
    const today = formatDate(now)
    const timestamp = localIso(now)
    const duration = Math.max(0, Number(args.durationMin) || 0)
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const fileName = `${today} ${formatClock(now)}${seconds} - ${safeFileName(topic)}.md`
    const path = join(sessionsDir, fileName)
    const mastered = Array.isArray(args.mastered) ? args.mastered : []
    const struggled = Array.isArray(args.struggled) ? args.struggled : []
    const body = [
      '---',
      `title: ${topic} · ${today} 学习记录`,
      `date: ${timestamp}`,
      `topic: ${topic}`,
      `duration: ${duration}`,
      'draft: true',
      'tags: [learning]',
      '---',
      '',
      `# ${topic} · 学习记录`,
      '',
      '## 本次目标',
      summary,
      '',
      '## 我讲清的内容',
      mastered.length
        ? mastered.map((item) => `- ${item.concept}（${item.level || 'L2'}）：${item.evidence || '本次学习记录'}`).join('\n')
        : '- 待补充',
      '',
      '## 卡住的内容',
      struggled.length
        ? struggled.map((item) => `- ${item.concept}：${item.note || '待复习'}`).join('\n')
        : '- 暂无',
      '',
      '## 下次',
      String(args.next || '待补充'),
      '',
    ].join('\n')
    writeText(path, body)

    let conceptText = readText(conceptsPath)
    if (!conceptText) {
      seedConcepts()
      conceptText = readText(conceptsPath)
    }
    for (const item of mastered) {
      if (!item?.concept) continue
      const level = normalizeLevel(item.level)
      conceptText = upsertConcept(conceptText, topic, String(item.concept).trim(), {
        level: levelLabel(level),
        evidence: `${today} ${String(item.evidence || '本次学习记录').trim()}`,
        nextReview: addDays(today, REVIEW_DAYS[level] || 3),
      })
    }
    for (const item of struggled) {
      if (!item?.concept) continue
      conceptText = upsertConcept(conceptText, topic, String(item.concept).trim(), {
        evidence: `${today} 卡住：${String(item.note || '待复习').trim()}`,
        nextReview: addDays(today, 1),
      })
    }
    if (conceptText) writeText(conceptsPath, conceptText)

    const sessionRel = relativePath(root, path)
    addRecentSession(`- ${today} [[${sessionRel}|${topic} · ${truncate(summary, 24)}]]${duration ? `（${duration} 分钟）` : ''}`)
    return {
      text: `已记录：${sessionRel}\n更新概念：${mastered.length + struggled.length} 个。下次复习已按掌握度排入概念表。`,
      path: sessionRel,
    }
  }

  function addRecentSession(bullet) {
    const text = readText(statePath)
    if (!text.trim()) return
    const section = sectionLines(text, '最近学习')
    const existing = section.start === -1
      ? []
      : section.lines.filter((line) => /^\s*[-*]\s+/.test(line)).map((line) => line.trim())
    const next = [bullet, ...existing.filter((line) => line !== bullet)].slice(0, 5)
    if (section.start === -1) {
      const marker = text.search(/^上次整理/m)
      if (marker >= 0) {
        const head = text.slice(0, marker).trimEnd()
        const tail = text.slice(marker)
        writeText(statePath, `${head}\n\n## 最近学习\n\n${next.join('\n')}\n\n${tail}`)
        return
      }
    }
    writeText(statePath, replaceSection(text, '最近学习', next))
  }

  function dashboard() {
    const state = readState()
    const concepts = readConcepts()
    const byLevel = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
    for (const concept of concepts) byLevel[normalizeLevel(concept.level)] += 1
    const due = dueConcepts().map((concept) => ({
      topic: concept.topic,
      concept: concept.concept,
      level: concept.level,
      nextReview: concept.nextReview,
      evidence: concept.evidence,
    }))
    const weak = weakConcepts().map((concept) => ({
      topic: concept.topic,
      concept: concept.concept,
      level: concept.level,
      evidence: concept.evidence,
    }))
    return {
      source: root,
      learningDir: relativePath(root, learningDir),
      updated: localIso(),
      currentFocus: state.currentFocus,
      later: state.later,
      paused: state.paused,
      background: state.background,
      todos: state.todos,
      concepts: { total: concepts.length, byLevel, due, weak },
      recentSessions: readSessions(6).map((session) => ({
        ...session,
        date: session.date.slice(0, 10),
        path: relativePath(root, session.path),
      })),
    }
  }

  return {
    root,
    learningDir,
    statePath,
    conceptsPath,
    sessionsDir,
    ensureScaffold,
    readState,
    readConcepts,
    readSessions,
    findTopicFile,
    banner,
    stateText,
    topicText,
    searchText,
    nextText,
    recordText,
    dashboard,
  }
}
