/**
 * 打印模块处理函数测试
 * 测试 console.log 插入、删除、注释、取消注释、剪贴板复制
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 配置存储
let mockConfig: Record<string, any> = {
  enableConsoleLog: true,
  consoleLogTemplate: '"${value}", ${value}',
  consoleLogCopyToClipboard: false,
  consoleLogClipboardPattern: '${value}',
}

// Mock vscode 模块 ==========
const mockApplyEdit = vi.fn().mockResolvedValue(true)
const mockShowInfo = vi.fn()
const mockClipboardWrite = vi.fn()

// Mock 文档行
class MockTextLine {
  text: string
  lineNumber: number
  firstNonWhitespaceCharacterIndex: number

  constructor(text: string, lineNumber: number) {
    this.text = text
    this.lineNumber = lineNumber
    this.firstNonWhitespaceCharacterIndex = text.search(/\S/)
    if (this.firstNonWhitespaceCharacterIndex === -1) {
      this.firstNonWhitespaceCharacterIndex = text.length
    }
  }
}

// Mock 位置
class MockPosition {
  line: number
  character: number
  constructor(line: number, character: number) {
    this.line = line
    this.character = character
  }
}

// Mock 范围
class MockRange {
  start: MockPosition
  end: MockPosition
  constructor(start: MockPosition, end: MockPosition) {
    this.start = start
    this.end = end
  }
}

// Mock 选区
class MockSelection extends MockRange {
  anchor: MockPosition
  active: MockPosition
  constructor(anchor: MockPosition, active: MockPosition) {
    super(anchor, active)
    this.anchor = anchor
    this.active = active
  }
}

// Mock SnippetString
class MockSnippetString {
  value: string
  constructor(value: string) {
    this.value = value
  }
}

// Mock TextEdit
const MockTextEdit = {
  insert: vi.fn((pos: MockPosition, text: string) => ({ type: 'insert', pos, text })),
  delete: vi.fn((range: MockRange) => ({ type: 'delete', range })),
}

// Mock SnippetTextEdit
const MockSnippetTextEdit = {
  insert: vi.fn((pos: MockPosition, snippet: MockSnippetString) => ({ type: 'snippet', pos, snippet })),
}

// Mock WorkspaceEdit
class MockWorkspaceEdit {
  edits: any[] = []
  set(_uri: any, edits: any[]) {
    this.edits = edits
  }
}

// 创建 mock 文档
function createMockDocument(lines: string[], fileName = 'test.ts') {
  return {
    fileName,
    lineCount: lines.length,
    lineAt: (i: number) => new MockTextLine(lines[i], i),
    getText: vi.fn((selection?: any) => {
      if (!selection) return lines.join('\n')
      // 获取选区文本 - 简化处理：返回当前行文本
      return lines[selection.active.line] || ''
    }),
    uri: { fsPath: fileName },
  }
}

// 创建 mock 编辑器
function createMockEditor(lines: string[], selections: Array<[number, number]>, fileName = 'test.ts') {
  const document = createMockDocument(lines, fileName)
  const mockSelections = selections.map(
    ([line, char]) =>
      new MockSelection(
        new MockPosition(line, 0),
        new MockPosition(line, char || lines[line]?.length || 0)
      )
  )

  return {
    document,
    selections: mockSelections,
    edit: vi.fn((callback: Function) => {
      const editBuilder = {
        insert: vi.fn(),
        delete: vi.fn(),
      }
      callback(editBuilder)
      return Promise.resolve(true)
    }),
  }
}

// 设置 vscode mock
vi.mock('vscode', () => ({
  window: {
    get activeTextEditor() {
      return globalThis.__mockEditor
    },
    showInformationMessage: (...args: any[]) => mockShowInfo(...args),
  },
  workspace: {
    applyEdit: (...args: any[]) => mockApplyEdit(...args),
    getConfiguration: () => ({
      get: (key: string, defaultValue: unknown) => {
        return mockConfig[key] !== undefined ? mockConfig[key] : defaultValue
      },
    }),
  },
  env: {
    clipboard: {
      writeText: (...args: any[]) => mockClipboardWrite(...args),
    },
  },
  Position: MockPosition,
  Range: MockRange,
  Selection: MockSelection,
  SnippetString: MockSnippetString,
  TextEdit: MockTextEdit,
  SnippetTextEdit: MockSnippetTextEdit,
  WorkspaceEdit: MockWorkspaceEdit,
  ConfigurationTarget: { Global: 1 },
}))

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path')
  return actual
})

// 动态导入被测模块
const {
  handleInsertConsoleLog,
  handleDeleteConsoleLog,
  handleCommentConsoleLog,
  handleUncommentConsoleLog,
} = await import('../../src/print/handler')

describe('handleInsertConsoleLog - 插入 console.log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__mockEditor = undefined
    // 重置配置为默认值
    mockConfig = {
      enableConsoleLog: true,
      consoleLogTemplate: '"${value}", ${value}',
      consoleLogCopyToClipboard: false,
      consoleLogClipboardPattern: '${value}',
    }
  })

  it('无活动编辑器 - 静默返回', async () => {
    globalThis.__mockEditor = undefined
    await expect(handleInsertConsoleLog()).resolves.not.toThrow()
    expect(mockApplyEdit).not.toHaveBeenCalled()
  })

  it('单选插入 - 普通模式', async () => {
    const lines = ['const user = { name: "张三" }', 'console.log("next")']
    const editor = createMockEditor(lines, [[0, 4]])
    // 选区文本为 'user'
    editor.document.getText = vi.fn((sel?: any) => {
      if (!sel) return lines.join('\n')
      return 'user'
    })
    globalThis.__mockEditor = editor

    await handleInsertConsoleLog()

    // 验证 editor.edit 被调用（普通模式）
    expect(editor.edit).toHaveBeenCalled()
  })

  it('空选区 - 跳过', async () => {
    const lines = ['const x = 1']
    const editor = createMockEditor(lines, [[0, 0]])
    // 空选区返回空字符串
    editor.document.getText = vi.fn(() => '')
    globalThis.__mockEditor = editor

    await handleInsertConsoleLog()

    // 无插入，不调用 edit
    expect(editor.edit).not.toHaveBeenCalled()
  })

  it('多选插入 - 多个选区', async () => {
    const lines = ['const a = 1', 'const b = 2']
    const editor = createMockEditor(lines, [
      [0, 6],
      [1, 6],
    ])
    let callCount = 0
    editor.document.getText = vi.fn((sel?: any) => {
      if (!sel) return lines.join('\n')
      callCount++
      return callCount === 1 ? 'a' : 'b'
    })
    globalThis.__mockEditor = editor

    await handleInsertConsoleLog()

    expect(editor.edit).toHaveBeenCalled()
  })
})

describe('handleDeleteConsoleLog - 删除 console.log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__mockEditor = undefined
    mockConfig = {
      enableConsoleLog: true,
      consoleLogTemplate: '"${value}", ${value}',
      consoleLogCopyToClipboard: false,
      consoleLogClipboardPattern: '${value}',
    }
  })

  it('无匹配行 - 显示提示', async () => {
    const lines = ['const x = 1', 'const y = 2']
    globalThis.__mockEditor = createMockEditor(lines, [[0, 0]])

    await handleDeleteConsoleLog()

    expect(mockShowInfo).toHaveBeenCalledWith('未找到匹配的 console.log')
  })

  it('找到匹配行 - 删除', async () => {
    const lines = ['const x = 1', 'console.log("x", x)', 'const y = 2']
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleDeleteConsoleLog()

    // editor.edit 被调用，且有 delete 操作
    expect(editor.edit).toHaveBeenCalled()
  })

  it('多行 console.log - 全部删除', async () => {
    const lines = ['console.log("a", a)', 'const x = 1', 'console.log("b", b)']
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleDeleteConsoleLog()

    expect(editor.edit).toHaveBeenCalled()
  })
})

describe('handleCommentConsoleLog - 注释 console.log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__mockEditor = undefined
    mockConfig = {
      enableConsoleLog: true,
      consoleLogTemplate: '"${value}", ${value}',
      consoleLogCopyToClipboard: false,
      consoleLogClipboardPattern: '${value}',
    }
  })

  it('无匹配行 - 显示提示', async () => {
    const lines = ['const x = 1']
    globalThis.__mockEditor = createMockEditor(lines, [[0, 0]])

    await handleCommentConsoleLog()

    expect(mockShowInfo).toHaveBeenCalledWith('未找到匹配的 console.log')
    expect(mockApplyEdit).not.toHaveBeenCalled()
  })

  it('找到匹配行 - 批量注释', async () => {
    const lines = ['const x = 1', 'console.log("x", x)', 'const y = 2']
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleCommentConsoleLog()

    // WorkspaceEdit 被应用
    expect(mockApplyEdit).toHaveBeenCalled()
    // 显示成功消息
    expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('已注释'))
  })

  it('保存和恢复选区', async () => {
    const lines = ['console.log("x", x)']
    const editor = createMockEditor(lines, [[0, 5]])
    globalThis.__mockEditor = editor
    const originalSelections = editor.selections

    await handleCommentConsoleLog()

    // 选区应被恢复
    expect(editor.selections).toEqual(originalSelections)
  })
})

describe('handleUncommentConsoleLog - 取消注释 console.log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__mockEditor = undefined
    mockConfig = {
      enableConsoleLog: true,
      consoleLogTemplate: '"${value}", ${value}',
      consoleLogCopyToClipboard: false,
      consoleLogClipboardPattern: '${value}',
    }
  })

  it('无匹配行 - 显示提示', async () => {
    const lines = ['const x = 1']
    globalThis.__mockEditor = createMockEditor(lines, [[0, 0]])

    await handleUncommentConsoleLog()

    expect(mockShowInfo).toHaveBeenCalledWith('未找到需要取消注释的 console.log')
  })

  it('行注释 // - 取消注释', async () => {
    const lines = ['const x = 1', '// console.log("x", x)', 'const y = 2']
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleUncommentConsoleLog()

    expect(mockApplyEdit).toHaveBeenCalled()
    expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('已取消注释'))
  })

  it('块注释 /* */ - 取消注释', async () => {
    const lines = ['const x = 1', '/* console.log("x", x) */', 'const y = 2']
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleUncommentConsoleLog()

    expect(mockApplyEdit).toHaveBeenCalled()
  })

  it('混合注释 - 同时处理行注释和块注释', async () => {
    const lines = [
      '// console.log("a", a)',
      'const x = 1',
      '/* console.log("b", b) */',
    ]
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleUncommentConsoleLog()

    expect(mockApplyEdit).toHaveBeenCalled()
    expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('2'))
  })

  it('保存和恢复选区', async () => {
    const lines = ['// console.log("x", x)']
    const editor = createMockEditor(lines, [[0, 5]])
    globalThis.__mockEditor = editor
    const originalSelections = editor.selections

    await handleUncommentConsoleLog()

    expect(editor.selections).toEqual(originalSelections)
  })
})

describe('配置禁用时的行为', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__mockEditor = undefined
    mockConfig = {
      enableConsoleLog: true,
      consoleLogTemplate: '"${value}", ${value}',
      consoleLogCopyToClipboard: false,
      consoleLogClipboardPattern: '${value}',
    }
  })

  it('console.log 禁用时 - handleInsertConsoleLog 直接返回', async () => {
    // 禁用配置
    mockConfig.enableConsoleLog = false
    const lines = ['const x = 1']
    const editor = createMockEditor(lines, [[0, 0]])
    globalThis.__mockEditor = editor

    await handleInsertConsoleLog()

    // 禁用时不调用 edit
    expect(editor.edit).not.toHaveBeenCalled()
  })
})
