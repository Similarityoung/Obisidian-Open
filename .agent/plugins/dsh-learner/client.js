window.__ModuleLoader__.load({
  id: '@local/dsh-learner',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const PANEL = 'learner'

    const S = {
      page: {
        height: '100%',
        overflow: 'auto',
        boxSizing: 'border-box',
        padding: '28px 32px 48px',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: 'inherit',
      },
      header: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '22px',
      },
      title: { margin: 0, fontSize: '22px', fontWeight: 650, letterSpacing: '0.01em' },
      subtitle: { marginTop: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' },
      refresh: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: '8px',
        padding: '7px 12px',
        fontSize: '12px',
        cursor: 'pointer',
      },
      stats: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' },
      stat: {
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: '12px',
        padding: '14px 16px',
      },
      statLabel: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginBottom: '6px' },
      statValue: { fontSize: '24px', fontWeight: 650, lineHeight: 1.1 },
      grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '16px', alignItems: 'start' },
      card: {
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: '12px',
        padding: '16px 18px',
        marginBottom: '16px',
      },
      cardTitle: { margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' },
      row: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: '7px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' },
      rowLast: { borderBottom: 'none' },
      rowMain: { minWidth: 0 },
      rowTitle: { fontSize: '13px', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      rowNote: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginTop: '2px', lineHeight: 1.4 },
      badge: { fontSize: '10px', lineHeight: '18px', padding: '0 7px', borderRadius: '999px', whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)' },
      empty: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', padding: '4px 0' },
      bars: { display: 'flex', gap: '8px', alignItems: 'flex-end', height: '84px', paddingTop: '6px' },
      barWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: 0 },
      bar: { width: '100%', maxWidth: '40px', borderRadius: '5px 5px 2px 2px', minHeight: '2px' },
      barLabel: { fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' },
      footnote: { marginTop: '8px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.6 },
      error: { border: '1px solid var(--dsw-alias-state-error-primary)', borderRadius: '10px', padding: '12px 14px', color: 'var(--dsw-alias-state-error-primary)', fontSize: '12px', whiteSpace: 'pre-wrap' },
      pillRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
      pill: { fontSize: '11px', padding: '4px 8px', borderRadius: '999px', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)' },
    }

    function Icon(props) {
      const size = typeof props?.size === 'number' ? props.size : 18
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' },
        h('path', { d: 'M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z' }),
        h('path', { d: 'M12 6.5v13' }),
        h('path', { d: 'M17.5 4.5v4M15.5 6.5h4', strokeLinecap: 'round' }),
      )
    }

    async function readState() {
      const response = await fetch('api/learner/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      if (!payload || payload.ok !== true) throw new Error(payload?.error?.message || '读取学习数据失败')
      return payload.value
    }

    function Stat({ label, value }) {
      return h('div', { style: S.stat }, h('div', { style: S.statLabel }, label), h('div', { style: S.statValue }, String(value)))
    }

    function Card({ title, children }) {
      return h('section', { style: S.card }, h('h2', { style: S.cardTitle }, title), children)
    }

    function Empty({ children }) {
      return h('div', { style: S.empty }, children)
    }

    function Row({ title, note, badge, last }) {
      return h(
        'div',
        { style: last ? { ...S.row, ...S.rowLast } : S.row },
        h('div', { style: S.rowMain }, h('div', { style: S.rowTitle, title }, title), note ? h('div', { style: S.rowNote }, note) : null),
        badge ? h('span', { style: S.badge }, badge) : null,
      )
    }

    function barColor(level) {
      if (level === 'L0') return 'var(--dsw-alias-border-l2)'
      if (level === 'L1') return 'var(--dsw-alias-state-idle-primary)'
      if (level === 'L2' || level === 'L3') return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-state-success-primary)'
    }

    function LevelBars({ byLevel }) {
      const max = Math.max(1, ...Object.values(byLevel || {}))
      return h(
        'div',
        { style: S.bars },
        Object.entries(byLevel || {}).map(([level, count]) =>
          h(
            'div',
            { key: level, style: S.barWrap },
            h('div', {
              style: {
                ...S.bar,
                background: barColor(level),
                height: `${Math.max(2, Math.round((count / max) * 64))}px`,
              },
              title: `${level}: ${count}`,
            }),
            h('div', { style: S.barLabel }, level),
            h('div', { style: { ...S.barLabel, color: 'var(--dsw-alias-label-primary)' } }, String(count)),
          ),
        ),
      )
    }

    function Panel() {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState('')
      const [refreshing, setRefreshing] = React.useState(false)

      const load = React.useCallback(async () => {
        setRefreshing(true)
        try {
          setState(await readState())
          setError('')
        } catch (err) {
          setError(String(err?.message || err))
        } finally {
          setRefreshing(false)
        }
      }, [])

      React.useEffect(() => {
        load()
        const timer = window.setInterval(load, 15000)
        const onVisible = () => {
          if (document.visibilityState === 'visible') load()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
          window.clearInterval(timer)
          document.removeEventListener('visibilitychange', onVisible)
        }
      }, [load])

      const concepts = state?.concepts || { total: 0, byLevel: {}, low: [] }
      const focus = state?.currentFocus || []
      const sessions = state?.recentSessions || []
      const lowCount = ['L0', 'L1', 'L2'].reduce(
        (sum, level) => sum + (concepts.byLevel?.[level] || 0),
        0,
      )

      return h(
        'div',
        { style: S.page },
        h(
          'div',
          { style: S.header },
          h(
            'div',
            null,
            h('h1', { style: S.title }, '学习看板'),
            h('div', { style: S.subtitle }, '来自 Learning/ 的学习状态'),
          ),
          h('button', { type: 'button', style: S.refresh, onClick: load, disabled: refreshing }, refreshing ? '刷新中…' : '刷新'),
        ),
        error ? h('div', { style: S.error }, `读取失败：${error}\n请确认 Learning/学习状态.md 或 Learning/概念掌握.md 存在。`) : null,
        !error && !state ? h('div', { style: S.empty }, '正在读取学习画像…') : null,
        state
          ? h(
              React.Fragment,
              null,
              h(
                'div',
                { style: S.stats },
                h(Stat, { label: '概念总数', value: concepts.total }),
                h(Stat, { label: '当前重点', value: focus.length }),
                h(Stat, { label: '低掌握度', value: lowCount }),
              ),
              h(
                'div',
                { style: S.grid },
                h(
                  'div',
                  null,
                  h(
                    Card,
                    { title: '当前重点' },
                    focus.length
                      ? focus.map((item, index) =>
                          h(Row, {
                            key: `${item.label}-${index}`,
                            title: item.label,
                            note: item.note,
                            badge: item.note?.match(/（(\d{4}-\d{2}-\d{2})）/) ? item.note.match(/（(\d{4}-\d{2}-\d{2})）/)[1] : undefined,
                            last: index === focus.length - 1,
                          }),
                        )
                      : h(Empty, null, '学习状态里还没有“当前重点”。'),
                  ),
                  h(
                    Card,
                    { title: `低掌握度概念 ${concepts.low?.length ? `（${concepts.low.length}）` : ''}` },
                    concepts.low?.length
                      ? concepts.low.slice(0, 10).map((item, index) =>
                          h(Row, {
                            key: `${item.topic}-${item.concept}-${index}`,
                            title: `${item.topic} / ${item.concept}`,
                            note: item.evidence,
                            badge: item.level || '未分级',
                            last: index === Math.min(concepts.low.length, 10) - 1,
                          }),
                        )
                      : h(Empty, null, '当前没有 L0-L2 的概念。'),
                  ),
                ),
                h(
                  'div',
                  null,
                  h(
                    Card,
                    { title: '掌握度分布' },
                    h(LevelBars, { byLevel: concepts.byLevel }),
                    h(
                      'div',
                      { style: S.pillRow },
                      h('span', { style: S.pill }, `概念 ${concepts.total}`),
                      h('span', { style: S.pill }, `低掌握度 ${lowCount}`),
                    ),
                  ),
                  h(
                    Card,
                    { title: '最近学习' },
                    sessions.length
                      ? sessions.map((item, index) =>
                          h(Row, {
                            key: `${item.path}-${index}`,
                            title: `${item.topic || '未分类'} · ${item.title}`,
                            note: `${item.date}${item.duration ? ` · ${item.duration} 分钟` : ''}${item.summary ? ` · ${item.summary}` : ''}`,
                            last: index === sessions.length - 1,
                          }),
                        )
                      : h(Empty, null, '还没有学习记录。'),
                  ),
                ),
              ),
              h(
                'div',
                { style: S.footnote },
                `知识库：${state.source}　·　画像文件：${state.learningDir}/学习状态.md、${state.learningDir}/概念掌握.md`,
              ),
            )
          : null,
      )
    }

    function apply(ctx) {
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register({ name: 'sidebar.panellist', id: PANEL, order: 8, label: () => '学习' }, Icon),
      )
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL }, Panel))
    }

    return { isPlugin: true, inject: ['slots'], apply }
  },
})
