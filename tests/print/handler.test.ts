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
  replace: vi.fn((range: MockRange, snippet: MockSnippetString) => ({ type: 'snippet-replace', range, snippet })),
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
  // offsetAt：行首偏移 = 前置各行长度之和 + 换行符数；再加列偏移
  const offsetAt = vi.fn((position: any) => {
    let offset = 0
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1 // +1 为换行符
    }
    return offset + position.character
  })
  return {
    fileName,
    lineCount: lines.length,
    lineAt: (i: number) => new MockTextLine(lines[i], i),
    getText: vi.fn((selection?: any) => {
      if (!selection) return lines.join('\n')
      // 获取选区文本 - 简化处理：返回当前行文本
      return lines[selection.active.line] || ''
    }),
    offsetAt,
    positionAt: vi.fn((offset: number) => {
      let remaining = offset
      for (let i = 0; i < lines.length; i++) {
        if (remaining <= lines[i].length) return new MockPosition(i, remaining)
        remaining -= lines[i].length + 1
      }
      return new MockPosition(lines.length - 1, 0)
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
    edit: vi.fn((callback: (editBuilder: any) => void) => {
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

  it('阶段 0 offset 边界贯通 - 每个选区都按 start/end 计算 offset', async () => {
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

    // 信息不再丢失：每个选区都对 start 与 end 各调一次 offsetAt（两选区共 4 次）
    const offsetAt = editor.document.offsetAt as unknown as { mock: { calls: unknown[] } }
    expect(offsetAt.mock.calls.length).toBe(4)
  })
})

describe('handleInsertConsoleLog - anchor 引擎（阶段 3c offset + indentRef 路径）', () => {
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

  // 精确控制选区起止列（行内 startChar..endChar），getText 按 offset 切真子串，positionAt 真实反算
  function anchorEditor(lines: string[], selLine: number, startChar: number, endChar: number) {
    const inserted: Array<{ line: number; text: string }> = []
    const replaced: Array<{ startLine: number; endLine: number; text: string }> = []
    const text = lines.join('\n')
    const offsetAt = (pos: any) => {
      let o = 0
      for (let i = 0; i < pos.line && i < lines.length; i++) o += lines[i].length + 1
      return o + pos.character
    }
    const document = {
      fileName: 'test.ts',
      lineCount: lines.length,
      lineAt: (i: number) => new MockTextLine(lines[i], i),
      getText: (sel?: any) => (sel ? text.slice(offsetAt(sel.start), offsetAt(sel.end)) : text),
      offsetAt,
      positionAt: (offset: number) => {
        let remaining = offset
        for (let i = 0; i < lines.length; i++) {
          if (remaining <= lines[i].length) return new MockPosition(i, remaining)
          remaining -= lines[i].length + 1
        }
        return new MockPosition(lines.length - 1, 0)
      },
      uri: { fsPath: 'test.ts' },
    }
    const editor = {
      document,
      selections: [new MockSelection(new MockPosition(selLine, startChar), new MockPosition(selLine, endChar))],
      edit: vi.fn((cb: (editBuilder: any) => void) => {
        cb({
          insert: (pos: MockPosition, t: string) => inserted.push({ line: pos.line, text: t }),
          replace: (range: MockRange, t: string) => replaced.push({ startLine: range.start.line, endLine: range.end.line, text: t }),
          delete: vi.fn(),
        })
        return Promise.resolve(true)
      }),
    }
    return { editor, inserted, replaced }
  }

  it('AFTER_STMT：顶层赋值后插入下一行、无缩进', async () => {
    const lines = ['const x = 1', 'const y = 2']
    const { editor, inserted } = anchorEditor(lines, 0, 6, 7) // 选中 'x'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(1)
    expect(inserted[0].line).toBe(1)
    expect(inserted[0].text.startsWith('console.log(')).toBe(true)
  })

  it('BLOCK_HEAD：函数参数 → 插入体首行、缩进与 indentRef（return 行）对齐', async () => {
    const lines = ['function greet(name) {', '  return name', '}']
    const { editor, inserted } = anchorEditor(lines, 0, 15, 19) // 选中参数 'name'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(1)
    expect(inserted[0].line).toBe(1)
    expect(inserted[0].text.startsWith('  console.log(')).toBe(true)
  })

  it('BEFORE_STMT：return 实参 → 插入到 return 行前、同缩进', async () => {
    const lines = ['function f() {', '  return total', '}']
    const { editor, inserted } = anchorEditor(lines, 1, 9, 14) // 选中 'total'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(1)
    expect(inserted[0].line).toBe(1) // 插到 return 行之前
    expect(inserted[0].text.startsWith('  console.log(')).toBe(true)
  })

  it('SKIP：类字段 → 静默不插入（不调用 edit）', async () => {
    const lines = ['class C {', '  config = new Foo()', '}']
    const { editor, inserted } = anchorEditor(lines, 1, 2, 8) // 选中字段名 'config'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(0)
    expect(editor.edit).not.toHaveBeenCalled()
  })

  it('normalize wrap-expr-return：箭头表达式体参数 → 补块 wrap（console.log + return 原体）', async () => {
    const lines = ['const f = (num) => num + 1']
    const { editor, inserted, replaced } = anchorEditor(lines, 0, 11, 14) // 选中参数 'num'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    // 不再回退行插入，而是原坐标 replace 体区间为多行块
    expect(inserted.length).toBe(0)
    expect(replaced.length).toBe(1)
    expect(replaced[0].text.startsWith('{')).toBe(true)
    expect(replaced[0].text.trimEnd().endsWith('}')).toBe(true)
    expect(replaced[0].text).toContain('console.log(')
    expect(replaced[0].text).toContain('return num + 1')
  })

  it('空块 {}：函数参数 → 展开为多行并把 log 落块内（插入于 `{` 之后）', async () => {
    const lines = ['function f(a) {}']
    const { editor, inserted, replaced } = anchorEditor(lines, 0, 11, 12) // 选中参数 'a'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(replaced.length).toBe(0)
    expect(inserted.length).toBe(1)
    expect(inserted[0].text.startsWith('\n')).toBe(true) // 新开一行
    expect(inserted[0].text).toContain('console.log(')
  })

  it('normalize wrap-stmt：无花括号 for 体 → 补块 wrap（console.log + 原语句）', async () => {
    const lines = ['for (let i = 0; i < n; i++) doThing(i)']
    const { editor, inserted, replaced } = anchorEditor(lines, 0, 9, 10) // 选中 for-init 'i'
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(0)
    expect(replaced.length).toBe(1)
    expect(replaced[0].text.startsWith('{')).toBe(true)
    expect(replaced[0].text.trimEnd().endsWith('}')).toBe(true)
    expect(replaced[0].text).toContain('console.log(')
    expect(replaced[0].text).toContain('doThing(i)')
    expect(replaced[0].text).not.toContain('return ') // 语句体不加 return
  })

  // 多选批量：selections 为 [line, startChar, endChar][]，getText 按 offset 切真子串
  function anchorEditorMulti(lines: string[], sels: Array<[number, number, number]>) {
    const inserted: Array<{ line: number; text: string }> = []
    const text = lines.join('\n')
    const offsetAt = (pos: any) => {
      let o = 0
      for (let i = 0; i < pos.line && i < lines.length; i++) o += lines[i].length + 1
      return o + pos.character
    }
    const document = {
      fileName: 'test.ts',
      lineCount: lines.length,
      lineAt: (i: number) => new MockTextLine(lines[i], i),
      getText: (sel?: any) => (sel ? text.slice(offsetAt(sel.start), offsetAt(sel.end)) : text),
      offsetAt,
      positionAt: (offset: number) => {
        let remaining = offset
        for (let i = 0; i < lines.length; i++) {
          if (remaining <= lines[i].length) return new MockPosition(i, remaining)
          remaining -= lines[i].length + 1
        }
        return new MockPosition(lines.length - 1, 0)
      },
      uri: { fsPath: 'test.ts' },
    }
    const editor = {
      document,
      selections: sels.map(([l, s, e]) => new MockSelection(new MockPosition(l, s), new MockPosition(l, e))),
      edit: vi.fn((cb: (editBuilder: any) => void) => {
        cb({ insert: (pos: MockPosition, t: string) => inserted.push({ line: pos.line, text: t }), delete: vi.fn() })
        return Promise.resolve(true)
      }),
    }
    return { editor, inserted }
  }

  it('多选 · 同 offset（同函数两参数）→ 两条插入均落体首行、稳定不丢弃（§2.9 ②）', async () => {
    const lines = ['function g(a, b) {', '  return a', '}']
    const { editor, inserted } = anchorEditorMulti(lines, [
      [0, 11, 12], // 参数 a
      [0, 14, 15], // 参数 b
    ])
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(2)
    expect(inserted.every((i) => i.line === 1)).toBe(true)
    expect(inserted.every((i) => i.text.startsWith('  console.log('))).toBe(true)
  })

  it('多选 · 互不重叠两顶层语句 → 两条独立插入（整批规划）', async () => {
    const lines = ['const x = 1', 'const y = 2', 'const z = 3']
    const { editor, inserted } = anchorEditorMulti(lines, [
      [0, 6, 7], // x
      [1, 6, 7], // y
    ])
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(2)
    expect(inserted.map((i) => i.line).sort((p, q) => p - q)).toEqual([1, 2])
  })

  it('多选 · SKIP 类字段 + 方法内参数 → 仅方法内插入、SKIP 静默省略（§2.9 分流）', async () => {
    const lines = ['class C {', '  f = 1', '  m(p) {', '    return p', '  }', '}']
    const { editor, inserted } = anchorEditorMulti(lines, [
      [1, 2, 3], // 类字段 f → SKIP
      [2, 4, 5], // 方法参数 p → BLOCK_HEAD
    ])
    globalThis.__mockEditor = editor
    await handleInsertConsoleLog()
    expect(inserted.length).toBe(1)
    expect(inserted[0].line).toBe(3) // 落方法体 return 行
    expect(inserted[0].text.startsWith('    console.log(')).toBe(true)
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
