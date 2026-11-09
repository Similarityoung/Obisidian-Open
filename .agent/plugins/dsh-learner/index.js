import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createLearnerStore } from './lib/store.js'
import { loadSkills } from './lib/skills.js'
import { createTools } from './lib/tools.js'

export const name = 'dsh-learner'
export const inject = ['tools', 'skills', 'systemPrompt']

const SKILLS_DIR = fileURLToPath(new URL('./skills', import.meta.url))

export function apply(ctx, config = {}) {
  const store = createLearnerStore(config)
  store.ensureScaffold()

  for (const tool of createTools(store)) {
    ctx.effect(() => ctx.tools.register(tool), `dsh-learner: tool ${tool.name}`)
  }

  for (const skill of loadSkills(SKILLS_DIR)) {
    ctx.effect(
      () =>
        ctx.skills.register({
          name: skill.name,
          description: skill.description,
          content: skill.content,
          invocation: { modelInvocable: true, userInvocable: true },
          source: 'bundled',
          provider: 'dsh-learner',
          path: skill.path,
          resourceBase: { kind: 'directory', path: join(SKILLS_DIR, skill.name) },
        }),
      `dsh-learner: skill ${skill.name}`,
    )
  }

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'learner:context',
        order: 400,
        text: () => {
          try {
            return store.banner()
          } catch (error) {
            console.warn('[dsh-learner] 读取学习画像失败：', error)
            return ''
          }
        },
      }),
    'dsh-learner: prompt section',
  )

  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.get('connection')
    const register = connection?.fetch?.register?.bind(connection.fetch)
    if (!register) return
    connectionCtx.effect(
      () =>
        register({
          path: '/api/learner/state',
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async () =>
            Response.json(
              { ok: true, value: store.dashboard() },
              { headers: { 'cache-control': 'no-store' } },
            ),
        }),
      'dsh-learner: dashboard route',
    )
  })
}
