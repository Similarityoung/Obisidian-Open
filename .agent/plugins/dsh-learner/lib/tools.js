const text = (value) => [{ type: 'text', text: String(value) }]

const textOutput = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: { text: { type: 'string' } },
  },
  render: (_args, value) => text(value.text),
}

const str = (description) => ({ type: 'string', description })

export function createTools(store) {
  return [
    {
      name: 'learner_state',
      description:
        '读取学习画像：当前重点、概念总数、低掌握度概念和最近学习记录。需要了解用户的学习背景时调用；不要凭记忆假设用户水平。',
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
        '读取一个学习主题的画像和笔记原文，包括概念掌握表。需要针对某个主题讲解或检索时调用。',
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
        '在个人知识库里搜索相关笔记，返回路径、标题、命中行和上下文。找例子、确认来源时用。',
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
  ]
}
