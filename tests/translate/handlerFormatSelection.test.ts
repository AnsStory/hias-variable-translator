/**
 * 格式化选中文本（handleFormatSelection）测试
 * 覆盖：纯英文带符号可直接格式化、尾部数字快捷选格式、中英混排只译非英文片段、纯符号静默跳过、剪贴板多格式；
 * 结果只写入剪贴板，始终不替换编辑器原文
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 配置存储
let mockConfigStore: Record<string, any> = {}

const mockGet = vi.fn((key: string, defaultValue: any) => (mockConfigStore[key] !== undefined ? mockConfigStore[key] : defaultValue))

// 词典：非英文片段 -> 译文
let mockTranslations: Record<string, string> = {}

// 测试现场
const mockState: {
  activeEditor: any
  replacements: string[]
  warnings: string[]
  clipboardWrites: string[]
  quickPickCount: number
  pickFormatInput: string
} = {
  activeEditor: null,
  replacements: [],
  warnings: [],
  clipboardWrites: [],
  quickPickCount: 0,
  pickFormatInput: '1',
}

vi.mock('vscode', () => ({
  window: {
    get activeTextEditor() {
      return mockState.activeEditor
    },
    showWarningMessage: (message: string) => {
      mockState.warnings.push(message)
    },
    showInformationMessage: () => undefined,
    showErrorMessage: () => undefined,
    setStatusBarMessage: () => undefined,
    createStatusBarItem: () => ({ show: () => undefined, dispose: () => undefined }),
    onDidChangeActiveTextEditor: () => ({ dispose: () => undefined }),
    visibleTextEditors: [],
    createQuickPick: () => {
      let onValueChange: ((value: string) => void) | undefined
      mockState.quickPickCount++
      return {
        items: [],
        title: '',
        placeholder: '',
        ignoreFocusOut: false,
        onDidChangeValue: (callback: (value: string) => void) => {
          onValueChange = callback
          return { dispose: () => undefined }
        },
        onDidAccept: () => ({ dispose: () => undefined }),
        onDidHide: () => ({ dispose: () => undefined }),
        // show 时立即"输入"数字选格式，模拟用户在弹窗中确认
        show: () => onValueChange?.(mockState.pickFormatInput),
        hide: () => undefined,
        dispose: () => undefined,
      }
    },
  },
  commands: { executeCommand: () => Promise.resolve() },
  env: {
    clipboard: {
      writeText: (text: string) => {
        mockState.clipboardWrites.push(text)
        return Promise.resolve()
      },
    },
  },
  workspace: {
    getConfiguration: () => ({ get: mockGet, update: () => Promise.resolve() }),
    onDidChangeConfiguration: () => ({ dispose: () => undefined }),
  },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  StatusBarAlignment: { Left: 1, Right: 2 },
  FileType: { File: 1, Directory: 2, SymbolicLink: 64 },
}))

vi.mock('../../src/translate/translator', () => ({
  Translator: class {
    async translate(text: string) {
      return { success: true, translatedText: mockTranslations[text] ?? text }
    }
    reinitializeServices() {
      // 无需真实服务
    }
    dispose() {
      // 无需真实服务
    }
  },
}))

const { handleFormatSelection, initTranslateModule } = await import('../../src/translate/handler')

/** 构造带选区的编辑器桩 */
function setActiveEditor(selectedText: string) {
  const selection = { isEmpty: selectedText === '' }
  mockState.activeEditor = {
    selection,
    document: { getText: () => selectedText },
    edit: (callback: (builder: { replace: (range: unknown, text: string) => void }) => void) => {
      callback({
        replace: (_range, text) => {
          mockState.replacements.push(text)
        },
      })
      return Promise.resolve(true)
    },
  }
}

describe('handleFormatSelection - 格式化选中文本', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigStore = {}
    mockTranslations = {}
    mockState.replacements = []
    mockState.warnings = []
    mockState.clipboardWrites = []
    mockState.quickPickCount = 0
    mockState.pickFormatInput = '1'
    initTranslateModule()
  })

  afterEach(() => {
    mockState.activeEditor = null
  })

  it('纯英文带斜杠文本：弹窗选 camelCase 后去符号格式化并复制', async () => {
    setActiveEditor('application/json')

    await handleFormatSelection()

    expect(mockState.quickPickCount).toBe(1)
    expect(mockState.clipboardWrites).toEqual(['applicationJson'])
    expect(mockState.replacements).toEqual([])
    expect(mockState.warnings).toEqual([])
  })

  it('复杂符号混合：多种符号一律视作分隔符', async () => {
    mockState.pickFormatInput = '3' // snake_case
    setActiveEditor('application/vnd.api+json@2.0')

    await handleFormatSelection()

    expect(mockState.clipboardWrites).toEqual(['application_vnd_api_json_2_0'])
    expect(mockState.replacements).toEqual([])
  })

  it('尾部数字快捷约定：不弹窗且数字不参与格式化', async () => {
    setActiveEditor('application/json1')

    await handleFormatSelection()

    expect(mockState.quickPickCount).toBe(0)
    expect(mockState.clipboardWrites).toEqual(['applicationJson'])
  })

  it('中英混排：只翻译非英文片段，符号一律作为分隔符', async () => {
    mockTranslations['用户名称'] = 'user name'
    // 整串末尾的 2 命中快捷约定（PascalCase），baseName 为 '用户名称/json'
    setActiveEditor('用户名称/json2')

    await handleFormatSelection()

    expect(mockState.quickPickCount).toBe(0)
    expect(mockState.clipboardWrites).toEqual(['UserNameJson'])
    expect(mockState.replacements).toEqual([])
  })

  it('纯符号选区：无可格式化文字时静默不复制', async () => {
    setActiveEditor('///')

    await handleFormatSelection()

    expect(mockState.clipboardWrites).toEqual([])
    expect(mockState.replacements).toEqual([])
    expect(mockState.warnings).toEqual([])
  })

  it('未选中文本：静默退出且不弹窗', async () => {
    setActiveEditor('')

    await handleFormatSelection()

    expect(mockState.quickPickCount).toBe(0)
    expect(mockState.clipboardWrites).toEqual([])
    expect(mockState.warnings).toEqual([])
  })

  it('启用剪贴板多格式：按 clipboardFormats 逐条写入', async () => {
    mockConfigStore.copyToClipboard = true
    mockConfigStore.clipboardFormats = ['camelCase', 'snake_case']
    setActiveEditor('application/json')

    await handleFormatSelection()

    // 用户选择的 camelCase 排到最后（reorderFormats 反转写入），当前剪贴板为所选格式
    expect(mockState.clipboardWrites).toEqual(['application_json', 'applicationJson'])
    expect(mockState.replacements).toEqual([])
  })
})
