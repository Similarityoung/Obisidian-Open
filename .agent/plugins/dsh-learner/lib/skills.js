import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim().replace(/^(["'])(.*)\1$/, '$2') : ''
}

export function loadSkills(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const path = join(dir, entry.name, 'SKILL.md')
      if (!existsSync(path)) return null
      const text = readFileSync(path, 'utf8')
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
      const frontmatter = match ? match[1] : ''
      const name = field(frontmatter, 'name') || entry.name
      const description = field(frontmatter, 'description')
      if (!name || !description) return null
      return {
        name,
        description,
        content: text.slice(match ? match[0].length : 0),
        path,
      }
    })
    .filter(Boolean)
}
