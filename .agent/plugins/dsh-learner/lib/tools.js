const text = (value) => [{ type: 'text', text: String(value) }]

const textOutput = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: { text: { type: 'string' }, path: { type: 'string' } },
  },
  render: (_args, value) => text(value.text),
}

const str = (description) => ({ type: 'string', description })

export function createTools(store) {
  return [
    {
      name: 'learner_state',
      description:
        '读取学习画像：当前重点、待复习概念、最近学习记录。讲解、出题、规划学习前先调用；不要凭记忆假设用户水平。',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
      output: textOutput,
      execute() {
        return { text: store.stateText() }
      },
      presentCall: () => ({ card: 'generic', title: '读取学习画像', kind: 'read' }),
    },
    {
      name: 'learner_topic',
      description:
        '读取一个学习主题的画像和笔记原文，包括概念掌握表。讲解前用它确认用户学过什么、卡在哪。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['topic'],
        properties: {
          topic: str('主题名，例如“Agent 系统”“软件工程与协作”。'),
          includeContent: {
            type: 'boolean',
            description: '是否返回笔记原文，默认 true。只查概念时设为 false。',
            default: true,
          },
        },
      },
      output: textOutput,
      execute(args) {
        return { text: store.topicText(args.topic, args.includeContent !== false) }
      },
      presentCall: (args) => ({
        card: 'generic',
        title: `读取学习主题：${args.topic}`,
        kind: 'read',
      }),
    },
    {
      name: 'learner_search',
      description:
        '在个人知识库里搜索相关笔记，返回路径、标题、命中行和上下文。出题、找例子、确认来源时用。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['query'],
        properties: {
          query: str('搜索关键词，可以包含空格分隔的多个词。'),
          limit: {
            type: 'integer',
            description: '返回条数，默认 8，最多 20。',
            minimum: 1,
            maximum: 20,
            default: 8,
          },
        },
      },
      output: textOutput,
      execute(args) {
        return { text: store.searchText(args.query, args.limit) }
      },
      presentCall: (args) => ({
        card: 'generic',
        title: `搜索笔记：${args.query}`,
        kind: 'search',
      }),
    },
    {
      name: 'learner_next',
      description:
        '根据学情给出下一步建议：优先到期复习、低掌握度概念和最近学习主题。用户问“今天学什么”时先调用。',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
      output: textOutput,
      execute() {
        return { text: store.nextText() }
      },
      presentCall: () => ({ card: 'generic', title: '读取下一步学习建议', kind: 'read' }),
    },
    {
      name: 'learner_record',
      description:
        '记录一次学习或练习的证据，并更新概念掌握表和下次复习时间。每次教学/测验结束后调用。掌握度只写用户实际表现出来的等级。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['topic', 'summary'],
        properties: {
          topic: str('本次学习的主题名。'),
          summary: str('本次目标和主要内容，两三句话。'),
          durationMin: {
            type: 'integer',
            description: '本次学习时长（分钟）。',
            minimum: 1,
            maximum: 480,
          },
          mastered: {
            type: 'array',
            description: '用户讲清或做对的概念。没有证据就不要写。',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['concept', 'evidence'],
              properties: {
                concept: str('概念名，必须和概念掌握表里的名称一致。'),
                level: {
                  type: 'string',
                  description: '掌握度：L1 读过 / L2 能复述 / L3 能解释 / L4 能应用 / L5 能教别人。',
                  enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
                },
                evidence: str('证据：用户具体讲了什么、做了什么题、用了什么例子。'),
              },
            },
          },
          struggled: {
            type: 'array',
            description: '用户卡住、讲错或需要复习的概念。',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['concept'],
              properties: {
                concept: str('概念名。'),
                note: str('卡在哪里，或下次要怎么复习。'),
              },
            },
          },
          next: str('下次建议：继续什么、复习什么、做什么练习。'),
        },
      },
      output: textOutput,
      execute(args) {
        const result = store.recordText(args)
        return { text: result.text }
      },
      presentCall: (args) => ({
        card: 'generic',
        title: `记录学习：${args.topic}`,
        kind: 'other',
      }),
    },
  ]
}
