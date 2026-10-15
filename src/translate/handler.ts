/**
 * 翻译模块处理函数
 * 处理选中文本翻译/格式化、命令入口与状态栏；文件路径翻译见 fileTranslation.ts
 */

import * as vscode from 'vscode'
import { containsNonEnglish } from './chineseDetector'
import { convertToFormat, splitIntoWords, splitIntoWordsForFileName, splitMixedText } from './namingConvention'
import { resolveTextFormat } from './formatPicker'
import { Translator } from './translator'
import { UndoManager } from './undoManager'
import { ConfigManager } from './config'
import { TranslationServiceType, TRANSLATION_SERVICE_OPTIONS } from './services'
import { copyTranslationToClipboard, showClipboardStatus } from './clipboard'
import {
  FileTranslationDeps,
  undoFileTranslation,
  registerFileCreationListener as registerFileTranslationCreationListener,
  registerFileRenameListener as registerFileTranslationRenameListener,
} from './fileTranslation'

let translator: Translator
let undoManager: UndoManager
let statusBarItem: vscode.StatusBarItem

/**
 * 初始化翻译模块
 */
export function initTranslateModule() {
  // 释放旧实例（避免内存泄漏）
  if (translator) {
    translator.dispose()
  }
  if (undoManager) {
    undoManager.dispose()
  }
  translator = new Translator()
  undoManager = new UndoManager()

  // 同步撤回窗口状态到 context key，供 Ctrl+Z 条件快捷键的 when 子句使用。
  // 撤回完成后窗口结束前仍保持激活，避免重复按 Ctrl+Z 落到原生文件撤销上触发“文件不存在”报错
  undoManager.onStateChange((isUndoWindowActive) => {
    vscode.commands.executeCommand('setContext', 'variableTranslator.canUndoFile', isUndoWindowActive)
  })
  vscode.commands.executeCommand('setContext', 'variableTranslator.canUndoFile', false)
}

/**
 * 创建状态栏项目
 */
export function createStatusBarItem() {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  updateStatusBar()
  statusBarItem.show()
  return statusBarItem
}

/**
 * 当前编辑器与选中文本
 */
interface ActiveSelection {
  editor: vscode.TextEditor
  selection: vscode.Selection
  selectedText: string
}

/**
 * 取活动编辑器的选中文本，无编辑器或无选区时返回 undefined（是否提示由调用方决定）
 */
function getActiveSelection(): ActiveSelection | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const selection = editor.selection
  const selectedText = editor.document.getText(selection)
  if (!selectedText) return

  return { editor, selection, selectedText }
}

/**
 * 选中内容拆分为单词列表：所有非字母数字字符（/ . + @ # 空格 等）一律视作分隔符，
 * 含非英文时按中英混排拆分、只翻译非英文部分
 * @param text 选中（或剥离快捷数字后）的文本
 */
async function collectWordsFromSelection(text: string): Promise<string[]> {
  if (!containsNonEnglish(text)) {
    return splitIntoWordsForFileName(text)
  }

  const words: string[] = []
  for (const part of splitMixedText(text)) {
    if (containsNonEnglish(part)) {
      const result = await translator.translate(part)
      words.push(...splitIntoWordsForFileName(result.success ? result.translatedText : part))
    } else {
      words.push(...splitIntoWordsForFileName(part))
    }
  }
  return words
}

/**
 * 处理格式化选中文本：去符号 + 按需翻译 + 命名格式转换，结果写入剪贴板（不替换原文）
 * 与「翻译并复制」的区别是纯英文带符号的文本（如 application/json）无需翻译也能格式化
 */
export async function handleFormatSelection(): Promise<void> {
  // 没有活动编辑器或未选中文本时静默退出
  const active = getActiveSelection()
  if (!active) return

  const { selectedText } = active

  // 选择格式（尾部数字快捷约定命中时不弹窗，数字不参与格式化）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) return
  const { format, translateText } = resolved

  const words = await collectWordsFromSelection(translateText)
  // 选中内容没有可格式化的文字
  if (words.length === 0) return

  const formatted = convertToFormat(words, format)

  // 复制到剪贴板（不替换原文）：以空格连接的单词列表作为翻译结果，供各格式复用同一套分词
  const translatedJoined = words.join(' ')
  const copyCount = await copyTranslationToClipboard(selectedText, translatedJoined, format)
  if (copyCount > 0) {
    showClipboardStatus(selectedText, translatedJoined, format, copyCount)
    return
  }

  // 未启用多格式剪贴板复制，只复制用户选择的格式
  await vscode.env.clipboard.writeText(formatted)
}

/**
 * 处理翻译并复制到剪贴板（不替换原文）
 */
export async function handleTranslateCopy(): Promise<void> {
  const active = getActiveSelection()
  if (!active) return

  const { selectedText } = active

  // 选中文本不包含非英文字符，无需翻译
  if (!containsNonEnglish(selectedText)) return

  // 选择格式（尾部数字快捷约定命中时不弹窗，数字不参与格式化）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) return
  const { format, translateText } = resolved

  // 翻译文本
  const result = await translator.translate(translateText)

  if (!result.success) {
    vscode.window.showErrorMessage(`翻译失败: ${result.error}`)
    return
  }

  // 复制到剪贴板（不替换原文）
  const copyCount = await copyTranslationToClipboard(translateText, result.translatedText, format)
  if (copyCount > 0) {
    showClipboardStatus(translateText, result.translatedText, format, copyCount)
  } else {
    // 未启用剪贴板复制，只复制用户选择的格式
    const words = splitIntoWords(result.translatedText)
    const translatedText = convertToFormat(words, format)
    await vscode.env.clipboard.writeText(translatedText)
    // vscode.window.setStatusBarMessage(`已复制到剪贴板: ${translatedText}`, 3000)
  }
}

/**
 * 处理翻译并剪切到剪贴板（删除选中文本）
 */
export async function handleTranslateCut(): Promise<void> {
  const active = getActiveSelection()
  if (!active) return

  const { editor, selection, selectedText } = active

  // 选中文本不包含非英文字符，无需翻译
  if (!containsNonEnglish(selectedText)) return

  // 选择格式（尾部数字快捷约定命中时不弹窗，数字不参与格式化）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) return
  const { format, translateText } = resolved

  // 翻译文本
  const result = await translator.translate(translateText)

  if (!result.success) {
    vscode.window.showErrorMessage(`翻译失败: ${result.error}`)
    return
  }

  // 复制到剪贴板
  const copyCount = await copyTranslationToClipboard(translateText, result.translatedText, format)
  if (copyCount > 0) {
    showClipboardStatus(translateText, result.translatedText, format, copyCount)
  } else {
    // 未启用剪贴板复制，只复制用户选择的格式
    const words = splitIntoWords(result.translatedText)
    const translatedText = convertToFormat(words, format)
    await vscode.env.clipboard.writeText(translatedText)
  }

  // 删除选中文本
  await editor.edit((editBuilder) => {
    editBuilder.delete(selection)
  })
}

/**
 * 处理翻译选中文本
 */
export async function handleTranslateSelection(): Promise<void> {
  const active = getActiveSelection()
  if (!active) return

  const { editor, selection, selectedText } = active

  // 选中文本不包含非英文字符，无需翻译
  if (!containsNonEnglish(selectedText)) return

  // 选择格式（尾部数字快捷约定命中时不弹窗，数字不参与格式化）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) return
  const { format, translateText } = resolved

  // 翻译文本
  const result = await translator.translate(translateText)

  if (!result.success) {
    vscode.window.showErrorMessage(`翻译失败: ${result.error}`)
    return
  }

  // 转换格式
  const words = splitIntoWords(result.translatedText)
  const translatedText = convertToFormat(words, format)

  // 替换选中文本（整个选区被替换，快捷约定命中的数字随选区一并消失）
  await editor.edit((editBuilder) => {
    editBuilder.replace(selection, translatedText)
  })

  // 复制到剪贴板
  const copyCount = await copyTranslationToClipboard(translateText, result.translatedText, format)
  if (copyCount > 0) {
    showClipboardStatus(translateText, result.translatedText, format, copyCount)
  }
}

/**
 * 处理撤回翻译（仅用于文件/文件夹翻译撤回）
 */
export async function handleUndoTranslation(): Promise<void> {
  const records = undoManager.getValidRecords()

  if (records.length === 0) {
    vscode.window.showWarningMessage('没有可撤回的翻译记录（已撤回或超过 1 分钟有效期）')
    return
  }

  // 撤回最新的文件翻译
  await undoFileTranslation(records[records.length - 1], fileTranslationDeps())
}

/**
 * 处理切换文件翻译开关
 */
export async function handleToggleFileTranslation(): Promise<void> {
  const newState = await ConfigManager.toggleFileTranslation()
  updateStatusBar()

  const message = newState ? '文件翻译：已开启 ✓' : '文件翻译：已关闭 ✗'
  vscode.window.setStatusBarMessage(message, 3000)
}

/**
 * 处理切换翻译服务
 */
export async function handleSwitchTranslationService(): Promise<void> {
  const currentService = ConfigManager.getTranslationService()

  // 创建QuickPick选项
  const options = TRANSLATION_SERVICE_OPTIONS.map((option) => ({
    label: option.label,
    description: option.description + (option.value === currentService ? ' (当前)' : ''),
    value: option.value,
    picked: option.value === currentService,
    alwaysShow: true,
  }))

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: '选择翻译服务',
    title: '切换翻译服务',
  })

  if (!selected) {
    return
  }

  // 检查服务是否已配置
  if (!ConfigManager.isServiceConfigured(selected.value as TranslationServiceType)) {
    const configure = await vscode.window.showWarningMessage(`${selected.label} 未配置，是否打开设置？`, '打开设置', '取消')

    if (configure === '打开设置') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'variableTranslator.services')
    }
    return
  }

  // 切换服务
  await ConfigManager.setTranslationService(selected.value as TranslationServiceType)
  updateStatusBar()

  vscode.window.setStatusBarMessage(`已切换到: ${selected.label}`, 3000)
}

/**
 * 文件翻译模块的运行时依赖
 * translator / undoManager 单例由 handler 持有，注入给文件翻译模块以避免相互 import
 */
function fileTranslationDeps(): FileTranslationDeps {
  return { translator, undoManager }
}

/**
 * 监听文件创建事件（转交文件翻译模块）
 * @param context 插件上下文
 */
export function registerFileCreationListener(context: vscode.ExtensionContext): void {
  registerFileTranslationCreationListener(context, fileTranslationDeps())
}

/**
 * 监听文件重命名事件（转交文件翻译模块）
 * @param context 插件上下文
 */
export function registerFileRenameListener(context: vscode.ExtensionContext): void {
  registerFileTranslationRenameListener(context, fileTranslationDeps())
}

/**
 * 更新状态栏显示
 */
export function updateStatusBar(): void {
  const isEnabled = ConfigManager.isFileTranslationEnabled()
  const currentService = ConfigManager.getTranslationService()

  const status = isEnabled ? '✓' : '✗'
  const serviceNames: Record<string, string> = {
    copilot: 'Pinyin',
    openai: 'OpenAI',
    google: 'Google',
    bing: 'Bing',
    deeplx: 'DeepLX',
    baidu: 'Baidu',
    tencent: 'Tencent',
  }
  const serviceName = serviceNames[currentService] || currentService

  statusBarItem.text = `$(globe) ${serviceName} | 文件翻译: ${status}`
  statusBarItem.tooltip = '点击切换文件翻译开关'
  statusBarItem.command = 'variableTranslator.toggleFileTranslation'
}

/**
 * 监听配置变化
 */
export function registerConfigListener(): vscode.Disposable {
  return ConfigManager.onConfigurationChanged(() => {
    updateStatusBar()
    if (translator) {
      translator.reinitializeServices()
    }
  })
}

/**
 * 释放资源
 */
export function disposeTranslateModule(): void {
  if (translator) {
    translator.dispose()
  }
  if (undoManager) {
    undoManager.dispose()
  }
}
