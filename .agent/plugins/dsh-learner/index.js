import { createLearnerStore } from './lib/store.js'
import { createTools } from './lib/tools.js'

export const name = 'dsh-learner'
export const inject = ['tools']

export function apply(ctx, config = {}) {
  const store = createLearnerStore(config)
  store.ensureScaffold()

  for (const tool of createTools(store)) {
    ctx.effect(() => ctx.tools.register(tool), `dsh-learner: tool ${tool.name}`)
  }

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
