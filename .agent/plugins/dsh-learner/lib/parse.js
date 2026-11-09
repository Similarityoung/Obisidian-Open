import { basename, extname } from 'node:path'
import {
  firstHeading,
  parseFrontmatter,
  sectionLines,
  splitTableRow,
  truncate,
} from './util.js'

const STATE_SECTIONS = {
  currentFocus: '当前重点',
  later: '以后再学',
  paused: '暂停',
  background: '背景经验',
  todos: '待办',
}

const SKIP_TOPICS = new Set([
  '已有依据',
  '当前卡点',
  '待确认的卡点',
  '建议下一步',
])

function parseItem(line) {
  const text = line.replace(/^\s*[-*]\s+/, '').trim()
  if (!text) return null
  const link = text.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*(?:[：:]\s*)?(.*)$/)
  if (link) {
    const target = link[1].trim()
    return {
      label: (link[2] || basename(target, extname(target))).trim(),
      target: target.endsWith('.md') ? target : `${target}.md`,
      note: (link[3] || '').replace(/^[、，,：:\s]+/, '').trim(),
    }
  }
  const colon = text.indexOf('：')
  const asciiColon = text.indexOf(':')
  const index = colon >= 0 ? colon : asciiColon
  if (index > 0) {
    return { label: text.slice(0, index).trim(), target: '', note: text.slice(index + 1).trim() }
  }
  return { label: text, target: '', note: '' }
}

export function parseLearningState(text) {
  const result = {
    title: '学习状态',
    updated: '',
    currentFocus: [],
    later: [],
    paused: [],
    background: [],
    todos: [],
  }
  if (!text.trim()) return result
  const { data, body } = parseFrontmatter(text)
  result.title = data.title || '学习状态'
  result.updated = data.date || ''
  for (const [key, heading] of Object.entries(STATE_SECTIONS)) {
    const section = sectionLines(body, heading)
    if (section.start === -1) continue
    result[key] = section.lines
      .filter((line) => /^\s*[-*]\s+/.test(line))
      .map(parseItem)
      .filter(Boolean)
  }
  return result
}

export function parseConceptSections(text) {
  const sections = []
  if (!text.trim()) return sections
  const lines = text.split(/\r?\n/)
  let current = null
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^##\s+(.+?)\s*$/)
    if (heading) {
      current = { topic: heading[1].trim(), rows: [] }
      sections.push(current)
      continue
    }
    if (!current || !/^\s*\|/.test(lines[i])) continue
    const tableStart = i
    while (i < lines.length && /^\s*\|/.test(lines[i])) i += 1
    const table = lines.slice(tableStart, i)
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
      const concept = (cells[conceptIndex] || '').trim()
      if (!concept) continue
      current.rows.push({
        concept,
        level: levelIndex >= 0 ? (cells[levelIndex] || '').trim() : '',
        evidence: evidenceIndex >= 0 ? (cells[evidenceIndex] || '').trim() : '',
        nextReview: reviewIndex >= 0 ? (cells[reviewIndex] || '').trim() : '',
      })
    }
  }
  return sections
}

export function parseConcepts(text) {
  return parseConceptSections(text).flatMap((section) =>
    section.rows.map((row) => ({ ...row, topic: section.topic })),
  )
}

export function parseSession(text, path) {
  const { data, body } = parseFrontmatter(text)
  const title = data.title || firstHeading(body) || basename(path, '.md')
  const target = sectionLines(body, '本次目标').lines.find((line) => line.trim()) || ''
  const summary = truncate(target.replace(/^[-*]\s*/, ''), 120)
  return {
    path,
    title,
    topic: data.topic || '',
    date: data.date || '',
    duration: Number(data.duration) || 0,
    summary,
  }
}

export function extractTopicHeadings(text) {
  const headings = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+?)\s*$/)
    if (!match) continue
    const heading = match[1].trim()
    if (!SKIP_TOPICS.has(heading)) headings.push(heading)
  }
  return headings
}

/**
 * Build concept rows from a topic page.
 * A section with at least four top-level bullets is treated as a concept list
 * (for example "Agent 系统" has 9 categories and 50 leaf concepts); otherwise
 * the section heading itself is the concept (for example "软件工程与协作").
 */
export function extractConceptEntries(text) {
  const sections = []
  let current = null
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      current = { heading: heading[1].trim(), bullets: [] }
      sections.push(current)
      continue
    }
    if (!current) continue
    const bullet = line.match(/^-\s+(.+)$/)
    if (!bullet) continue
    const raw = bullet[1].trim()
    const label = raw.split(/[：:]/)[0].trim()
    if (!label) continue
    if (/^(简介|来源|解法|判断|依据|待补|待检验)$/.test(label)) continue
    if (raw.startsWith('简介：') || raw.startsWith('来源：')) continue
    current.bullets.push(label)
  }
  return sections.flatMap((section) =>
    section.bullets.length >= 4
      ? section.bullets.map((concept) => ({ concept, category: section.heading }))
      : [{ concept: section.heading, category: '' }],
  )
}
