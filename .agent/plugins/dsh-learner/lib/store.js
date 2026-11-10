import { readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import {
  ensureInside,
  exists,
  firstHeading,
  formatDate,
  listMarkdownFiles,
  readText,
  relativePath,
  renderTable,
  splitTableRow,
  writeText,
} from './util.js'
import {
  extractConceptEntries,
  parseConceptSections,
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

function levelNumber(level) {
  const match = String(level || '').match(/L([0-5])/)
  return match ? Number(match[1]) : 0
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
      if (!exists(conceptsPath)) seedConcepts()
    } catch (error) {
      console.warn('[dsh-learner] 初始化学习数据失败：', error)
    }
  }

  function readState() {
    return parseLearningState(readText(statePath))
  }

  function readConcepts() {
    return parseConceptSections(readText(conceptsPath)).flatMap((section) =>
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
          .map((name) => ({
            label: basename(name, '.md'),
            note: '',
            target: `Learning/${name}`,
            path: join(learningDir, name),
          }))
    const blocks = [
      '---',
      'title: 概念掌握',
      `date: ${formatDate()}`,
      'draft: true',
      'tags: [learning]',
      '---',
      '',
      '# 概念掌握',
      '',
      '> 学习看板维护的概念掌握表。掌握度：L0 未接触 / L1 读过 / L2 能复述 / L3 能解释 / L4 能应用 / L5 能教别人。',
      '> 「证据」写清日期和来源。',
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

  function lowConcepts() {
    return readConcepts()
      .filter((concept) => levelNumber(concept.level) <= 2)
      .sort((a, b) => levelNumber(a.level) - levelNumber(b.level))
  }

  function stateText() {
    const state = readState()
    const concepts = readConcepts()
    const low = lowConcepts()
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
    lines.push('', `概念：共 ${concepts.length} 个；低掌握度（L0-L2）${low.length} 个`)
    if (low.length) {
      lines.push('', '## 低掌握度概念（前 10）')
      for (const concept of low.slice(0, 10)) {
        lines.push(`- ${concept.topic} / ${concept.concept}（${concept.level || '未分级'}）`)
      }
    }
    if (sessions.length) {
      lines.push('', '## 最近学习')
      for (const session of sessions) {
        lines.push(`- ${session.date.slice(0, 10)} ${session.topic} · ${session.title}${session.duration ? `（${session.duration} 分钟）` : ''}`)
      }
    }
    lines.push('', `文件：${relativePath(root, conceptsPath)}`)
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
        lines.push(`- ${concept.concept}：${concept.level || '未分级'}${concept.evidence ? `；证据：${concept.evidence}` : ''}`)
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

  function dashboard() {
    const state = readState()
    const concepts = readConcepts()
    const byLevel = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
    for (const concept of concepts) byLevel[`L${levelNumber(concept.level)}`] += 1
    return {
      source: root,
      learningDir: relativePath(root, learningDir),
      updated: formatDate(),
      currentFocus: state.currentFocus,
      later: state.later,
      paused: state.paused,
      background: state.background,
      todos: state.todos,
      concepts: {
        total: concepts.length,
        byLevel,
        low: lowConcepts().map((concept) => ({
          topic: concept.topic,
          concept: concept.concept,
          level: concept.level,
          evidence: concept.evidence,
        })),
      },
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
    stateText,
    topicText,
    searchText,
    dashboard,
  }
}
