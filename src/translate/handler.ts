/**
 * 翻译模块处理函数
 * 处理文本翻译、文件翻译、撤销翻译等功能
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import { containsNonEnglish } from './chineseDetector'
import {
  NamingFormat,
  DigitFormatShortcut,
  FILE_FORMAT_OPTIONS,
  TEXT_FORMAT_OPTIONS,
  convertToFormat,
  detectTrailingFormatDigit,
  splitIntoWords,
  splitIntoWordsForFileName,
  splitMixedText,
} from './namingConvention'
import { Translator } from './translator'
import { UndoManager } from './undoManager'
import { ConfigManager } from './config'
import { TranslationServiceType, TRANSLATION_SERVICE_OPTIONS } from './services'
import { copyTranslationToClipboard, copyFileTranslationToClipboard, showClipboardStatus, showFileClipboardStatus } from './clipboard'
import { SegmentPair, buildSegmentPairs, replaceContentSegments } from './contentRewriter'

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
 * 文本翻译格式解析：命中尾部数字快捷约定（如选中 '用户1'）时跳过弹窗，
 * 直接使用数字对应的格式，并返回剥离数字后的翻译文本（数字不参与翻译与剪贴板原文）
 * @param selectedText 选中的文本
 * @returns 格式与待翻译文本，用户取消选择时返回 undefined
 */
async function resolveTextFormat(selectedText: string): Promise<{ format: NamingFormat; translateText: string } | undefined> {
  if (ConfigManager.isDigitFormatShortcutEnabled()) {
    const shortcut = detectTrailingFormatDigit(selectedText, TEXT_FORMAT_OPTIONS)
    if (shortcut) {
      return { format: shortcut.format, translateText: shortcut.baseName }
    }
  }

  const format = await showFormatPicker(true)
  return format ? { format, translateText: selectedText } : undefined
}

/**
 * 处理翻译并复制到剪贴板（不替换原文）
 */
export async function handleTranslateCopy(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showWarningMessage('请先选中文本')
    return
  }

  const selection = editor.selection
  const selectedText = editor.document.getText(selection)

  if (!selectedText) {
    vscode.window.showWarningMessage('请先选中要翻译的文本')
    return
  }

  if (!containsNonEnglish(selectedText)) {
    vscode.window.showInformationMessage('选中文本不包含非英文字符，无需翻译')
    return
  }

  // 选择翻译格式（尾部数字快捷约定命中时不弹窗）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) {
    return
  }
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
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showWarningMessage('请先选中文本')
    return
  }

  const selection = editor.selection
  const selectedText = editor.document.getText(selection)

  if (!selectedText) {
    vscode.window.showWarningMessage('请先选中要翻译的文本')
    return
  }

  if (!containsNonEnglish(selectedText)) {
    vscode.window.showInformationMessage('选中文本不包含非英文字符，无需翻译')
    return
  }

  // 选择翻译格式（尾部数字快捷约定命中时不弹窗）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) {
    return
  }
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
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showWarningMessage('没有活动的编辑器')
    return
  }

  const selection = editor.selection
  const selectedText = editor.document.getText(selection)

  if (!selectedText) {
    vscode.window.showWarningMessage('请先选中要翻译的文本')
    return
  }

  if (!containsNonEnglish(selectedText)) {
    vscode.window.showInformationMessage('选中文本不包含非英文字符，无需翻译')
    return
  }

  // 选择翻译格式（尾部数字快捷约定命中时不弹窗）
  const resolved = await resolveTextFormat(selectedText)
  if (!resolved) {
    return
  }
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
  await undoFileTranslation(records[records.length - 1])
}

/**
 * 撤回文件翻译
 */
async function undoFileTranslation(record: import('./undoManager').UndoRecord): Promise<void> {
  const filePath = record.translatedPath

  try {
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      vscode.window.showWarningMessage('文件不存在，可能已被删除')
      undoManager.removeRecord(filePath)
      return
    }

    // 删除文件
    await vscode.workspace.fs.delete(vscode.Uri.file(filePath))

    // 关闭编辑器窗口
    await closeEditorForFile(filePath)

    // 只清理翻译时创建的目录（避免删除用户原有目录）
    if (record.createdDirs && record.createdDirs.length > 0) {
      // 从深到浅排序，先删除深层目录
      const sortedDirs = [...record.createdDirs].sort((a, b) => b.length - a.length)
      for (const dir of sortedDirs) {
        try {
          const stat = await fs.stat(dir)
          if (stat.isDirectory()) {
            const files = await fs.readdir(dir)
            if (files.length === 0) {
              await fs.rmdir(dir)
            }
          }
        } catch {
          // 忽略错误（目录可能已被删除）
        }
      }
    }

    // 删除撤回记录
    undoManager.removeRecord(filePath)
  } catch (error) {
    console.error('删除文件失败:', error)
    vscode.window.showErrorMessage(`删除文件失败: ${error instanceof Error ? error.message : String(error)}`)
  }
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
 * 监听文件创建事件
 * @param context 插件上下文
 */
export function registerFileCreationListener(context: vscode.ExtensionContext): void {
  const listener = vscode.workspace.onDidCreateFiles(async (event) => {
    // 检查是否启用了文件翻译
    if (!ConfigManager.isFileTranslationEnabled()) {
      return
    }

    for (const fileUri of event.files) {
      await handleFileCreated(fileUri, true)
    }
  })

  context.subscriptions.push(listener)
}

/**
 * 监听文件重命名事件
 * @param context 插件上下文
 */
export function registerFileRenameListener(context: vscode.ExtensionContext): void {
  const listener = vscode.workspace.onDidRenameFiles(async (event) => {
    // 检查是否启用了文件翻译
    if (!ConfigManager.isFileTranslationEnabled()) {
      return
    }

    for (const { newUri } of event.files) {
      await handleFileCreated(newUri, false)
    }
  })

  context.subscriptions.push(listener)
}

/**
 * 处理文件创建事件（取消时保留原文件/文件夹）
 * @param fileUri 文件URI
 * @param isNewFile 是否来自新建文件事件（仅新建时同步替换文件内容，重命名已有文件不动内容）
 */
async function handleFileCreated(fileUri: vscode.Uri, isNewFile: boolean = false): Promise<void> {
  const filePath = fileUri.fsPath

  // 检查是文件还是文件夹
  let isDirectory: boolean
  try {
    const stat = await vscode.workspace.fs.stat(fileUri)
    isDirectory = stat.type === vscode.FileType.Directory
  } catch {
    return
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri)
  if (!workspaceFolder) {
    return
  }

  // 获取相对路径（包含目录）
  const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath)

  // 检测相对路径是否包含非英文字符
  if (!containsNonEnglish(relativePath)) {
    return
  }

  // 等待文件就绪
  await waitForFileReady(filePath)

  // 获取文件名部分（不含扩展名）
  let nameWithoutExt: string
  let ext: string

  if (isDirectory) {
    // 文件夹没有扩展名，整个相对路径就是名称
    nameWithoutExt = relativePath
    ext = ''
  } else {
    ext = path.extname(relativePath)
    nameWithoutExt = relativePath.slice(0, -ext.length || undefined)
  }

  // 尾部数字快捷约定：只看路径最后一段（去扩展名后、最后一个点号分隔的片段）
  let digitShortcut: DigitFormatShortcut | undefined
  let shortcutRawTail = ''
  if (ConfigManager.isDigitFormatShortcutEnabled()) {
    const segments = nameWithoutExt.split(/[/\\]/)
    const lastSegment = segments[segments.length - 1] || ''
    const lastSegmentDotParts = lastSegment.split('.')
    const lastDotPart = lastSegmentDotParts[lastSegmentDotParts.length - 1] || ''
    digitShortcut = detectTrailingFormatDigit(lastDotPart, FILE_FORMAT_OPTIONS)
    if (digitShortcut) {
      shortcutRawTail = lastDotPart
    }
  }

  // 事件驱动等待"VSCode 打开新文件"的编辑器激活完成（焦点抢夺发生在打开编辑器那一刻，
  // QuickPick 需要焦点落位后才展示），替代固定延时的魔数。
  // 新建文件夹不会打开编辑器、尾部数字快捷命中不弹窗，均直接跳过等待
  if (!digitShortcut && !isDirectory) {
    await waitForEditorActivatedForFile(filePath)
  }

  // 选择翻译格式（取消时保留原文件/文件夹；快捷约定命中时不弹窗）
  const format = digitShortcut ? digitShortcut.format : await showFormatPicker()
  if (!format) {
    return
  }

  // 翻译路径的每个部分（支持路径分隔符和点号作为分隔符）
  const pathParts = nameWithoutExt.split(/[/\\]/)
  const translatedParts: string[] = []
  let lastTranslatedPart: string = ''
  let lastOriginalPart: string = ''
  // 收集所有"翻译前 -> 翻译后"的路径段映射，用于新建文件时同步替换内容中的名称（如 Java 模板）
  const segmentPairs: SegmentPair[] = []

  for (let partIndex = 0; partIndex < pathParts.length; partIndex++) {
    const pathPart = pathParts[partIndex]
    if (!pathPart) continue

    // 将点号也作为分隔符处理
    const dotParts = pathPart.split('.')
    const translatedDotParts: string[] = []

    for (let dotIndex = 0; dotIndex < dotParts.length; dotIndex++) {
      const dotPart = dotParts[dotIndex]
      if (!dotPart) {
        translatedDotParts.push(dotPart)
        continue
      }

      // 快捷约定只作用于路径最后一段的最后一个片段，数字不参与翻译与写入
      const isShortcutTarget =
        digitShortcut !== undefined && partIndex === pathParts.length - 1 && dotIndex === dotParts.length - 1 && dotPart === shortcutRawTail
      const translateInput = isShortcutTarget ? digitShortcut!.baseName : dotPart

      if (containsNonEnglish(dotPart)) {
        // 拆分中英文，只翻译中文部分
        const parts = splitMixedText(translateInput)
        const words: string[] = []

        for (const part of parts) {
          if (containsNonEnglish(part)) {
            // 中文部分，翻译
            const result = await translator.translate(part)
            if (result.success) {
              // 将翻译结果分割为单词（处理可能的多词翻译）
              const partWords = splitIntoWordsForFileName(result.translatedText)
              words.push(...partWords)
            } else {
              words.push(part)
            }
          } else {
            // 英文部分，保持原样，作为独立单词
            words.push(part)
          }
        }

        const translated = convertToFormat(words, format)

        if (translated) {
          translatedDotParts.push(translated)
          lastTranslatedPart = translated
          // 剪贴板原文不含快捷数字；内容替换仍按盘面上的原始名称匹配
          lastOriginalPart = translateInput
          segmentPairs.push({ original: dotPart, translated })
        } else {
          // 净化后无有效单词，回退使用原始名称，避免空或非法文件名
          translatedDotParts.push(dotPart)
          lastOriginalPart = dotPart
        }
      } else {
        // 英文部分保持原样（快捷命中的数字仍不参与写入）
        translatedDotParts.push(translateInput)
      }
    }

    translatedParts.push(translatedDotParts.join('.'))
  }

  // 翻译扩展名（去掉前面的点号）
  let translatedExt = ext
  if (ext) {
    const extContent = ext.slice(1) // 去掉点号
    if (containsNonEnglish(extContent)) {
      // 拆分中英文，只翻译中文部分
      const parts = splitMixedText(extContent)
      const words: string[] = []

      for (const part of parts) {
        if (containsNonEnglish(part)) {
          // 中文部分，翻译
          const result = await translator.translate(part)
          if (result.success) {
            // 将翻译结果分割为单词（处理可能的多词翻译）
            const partWords = splitIntoWordsForFileName(result.translatedText)
            words.push(...partWords)
          } else {
            words.push(part)
          }
        } else {
          // 英文部分，保持原样，作为独立单词
          words.push(part)
        }
      }

      const translated = convertToFormat(words, format)
      // 净化后无有效单词则保持原扩展名（translatedExt 已初始化为 ext）
      if (translated) {
        translatedExt = '.' + translated
      }
    }
  }

  // 构建新的相对路径
  const newRelativePath = translatedParts.join('/') + translatedExt
  const newFilePath = path.join(workspaceFolder.uri.fsPath, newRelativePath)

  // 处理文件名冲突
  let finalPath = newFilePath
  if (existsSync(finalPath)) {
    const dir = path.dirname(finalPath)
    const baseName = path.basename(finalPath, ext)
    let counter = 1
    while (existsSync(finalPath)) {
      finalPath = path.join(dir, `${baseName}_${counter}${ext}`)
      counter++
    }
    vscode.window.showInformationMessage(`文件名冲突，已重命名为: ${path.basename(finalPath)}`)
  }

  // 确保目标目录存在（逐级创建）
  const targetDir = path.dirname(finalPath)
  await createDirectoryRecursive(targetDir)

  // 重命名
  try {
    // 重命名前先保存原路径的脏编辑器缓冲区：
    // redhat.java 等语言服务器会向新建文件插入类模板但不保存，若先改名、缓冲区后保存，
    // 会把中文文件按旧路径重新写回，与翻译后的文件并存
    if (!isDirectory) {
      await saveDirtyDocumentForFile(filePath)
    }

    await vscode.workspace.fs.rename(fileUri, vscode.Uri.file(finalPath), { overwrite: false })

    // 新建文件场景：把内容中翻译前的名称（package/类名等模板内容）同步替换为翻译后
    if (!isDirectory && isNewFile && ConfigManager.isTranslateNewFileContentEnabled()) {
      const pairs = buildSegmentPairs(segmentPairs)
      if (pairs.length > 0) {
        await translateFileContent(finalPath, pairs)
        // 语言服务器可能在改名之后才把模板落盘（迟到写入），后台观察窗口内做兜底合并
        void settleLateLanguageServerWrites(filePath, finalPath, pairs, workspaceFolder.uri.fsPath).catch((error) => {
          console.error('迟到内容兜底处理失败:', error)
        })
      }
    }

    // 清理空的中文目录
    await cleanupEmptyDirs(path.dirname(filePath), workspaceFolder.uri.fsPath)

    // 添加撤回记录（通过对比翻译前后路径确定翻译创建的目录）
    const createdDirs = getTranslationCreatedDirs(filePath, finalPath)
    undoManager.addRecord(filePath, finalPath, createdDirs)

    // 文件才需要关闭原窗口（打开翻译后的文件放到剪贴板写入之后）
    if (!isDirectory) {
      // 关闭原始文件窗口（如果已打开）
      await closeEditorForFile(filePath)
    }

    // 复制到剪贴板（根据 variableTranslator.clipboardFormats 配置复制"最后一个"翻译结果）
    // 逐条写入系统剪贴板历史（Win+V），若此时 showTextDocument 打开新编辑器造成窗口焦点抖动，
    if (lastTranslatedPart && lastOriginalPart && containsNonEnglish(lastOriginalPart)) {
      // 等待关闭原编辑器后焦点稳定，确保多条剪贴板写入被系统历史逐条记录
      await new Promise((resolve) => setTimeout(resolve, 150))
      const copyCount = await copyFileTranslationToClipboard(lastOriginalPart, lastTranslatedPart, format)
      if (copyCount > 0) {
        showFileClipboardStatus(lastOriginalPart, lastTranslatedPart, format, copyCount)
      } else {
        // 未启用剪贴板复制，只复制用户选择的格式（lastTranslatedPart 已按 format 转换）
        await vscode.env.clipboard.writeText(lastTranslatedPart)
      }
    }

    // 最后再打开翻译后的文件：放在剪贴板写入之后，避免新编辑器打开打断剪贴板历史逐条记录
    if (!isDirectory) {
      await vscode.window.showTextDocument(vscode.Uri.file(finalPath))
    }
  } catch (error) {
    console.error('重命名失败:', error)
    vscode.window.showErrorMessage(`重命名失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 递归创建目录
 * @param dirPath 目录路径
 */
async function createDirectoryRecursive(dirPath: string): Promise<void> {
  if (existsSync(dirPath)) {
    return
  }

  const parentDir = path.dirname(dirPath)
  if (parentDir !== dirPath) {
    await createDirectoryRecursive(parentDir)
  }

  try {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath))
  } catch {
    // 忽略错误（目录可能已存在）
  }
}

/**
 * 目标文件当前是否已是激活编辑器
 */
function isEditorActiveForFile(filePath: string): boolean {
  const editor = vscode.window.activeTextEditor
  return !!editor && sameFilePath(editor.document.uri.fsPath, filePath)
}

/**
 * 等待新文件的编辑器激活（事件驱动 + 超时保险丝）
 * 编辑器激活说明"打开新文件"的焦点抢夺已经完成，此时弹 QuickPick 不会被抢焦点；
 * 文件不会被打开（窗口失焦、后台打开等）时由超时兜底，行为退化为旧的固定延时上限
 * @param filePath 文件路径
 * @param timeoutMs 最长等待时间（毫秒）
 */
async function waitForEditorActivatedForFile(filePath: string, timeoutMs: number = 2000): Promise<void> {
  if (isEditorActiveForFile(filePath)) {
    return
  }

  await new Promise<void>((resolve) => {
    const sub = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && sameFilePath(editor.document.uri.fsPath, filePath)) {
        sub.dispose()
        clearTimeout(timer)
        // active 事件后 VSCode 焦点转移收尾并非同帧完成，留短暂余量再弹窗
        setTimeout(resolve, 600)
      }
    })
    const timer = setTimeout(() => {
      sub.dispose()
      resolve()
    }, timeoutMs)
  })
}

/**
 * 等待文件就绪
 * @param filePath 文件路径
 * @param maxWait 最大等待时间（毫秒）
 */
async function waitForFileReady(filePath: string, maxWait: number = 1000): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWait) {
    try {
      await fs.stat(filePath)
      return // 文件已就绪
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 比较两个文件路径是否指向同一文件（win32 下大小写不敏感）
 */
function sameFilePath(a: string, b: string): boolean {
  const na = path.normalize(a)
  const nb = path.normalize(b)
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb
}

/**
 * 查找路径对应的已打开文档（含未加入编辑器的可见缓冲区）
 */
function findOpenDocumentByPath(filePath: string): vscode.TextDocument | undefined {
  return vscode.workspace.textDocuments.find((doc) => !doc.isClosed && sameFilePath(doc.uri.fsPath, filePath))
}

/**
 * 重命名前保存原路径的脏缓冲区（语言服务器插入的模板可能尚未落盘）
 */
async function saveDirtyDocumentForFile(filePath: string): Promise<void> {
  const doc = findOpenDocumentByPath(filePath)
  if (doc && doc.isDirty) {
    await doc.save()
  }
}

/**
 * 将新内容写回文件：优先经编辑器缓冲区（改名后编辑器已跟随到新路径），避免磁盘/缓冲区不一致
 */
async function applyContentToFile(filePath: string, newContent: string): Promise<void> {
  const doc = findOpenDocumentByPath(filePath)
  if (doc) {
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length))
    const edit = new vscode.WorkspaceEdit()
    edit.replace(doc.uri, fullRange, newContent)
    await vscode.workspace.applyEdit(edit)
    await doc.save()
  } else {
    await fs.writeFile(filePath, newContent)
  }
}

/**
 * 读取文件当前内容（优先缓冲区），把翻译前的路径段替换为翻译后并写回
 */
async function translateFileContent(filePath: string, pairs: SegmentPair[]): Promise<void> {
  const doc = findOpenDocumentByPath(filePath)
  let current: string
  try {
    current = doc ? doc.getText() : (await fs.readFile(filePath)).toString('utf8')
  } catch {
    return
  }
  const updated = replaceContentSegments(current, pairs)
  if (updated !== current) {
    await applyContentToFile(filePath, updated)
  }
}

/**
 * 等待文件内容稳定（size+mtime 连续不变），用于迟到写入的落盘收尾
 */
async function waitForFileStable(filePath: string, quietMs: number = 500, maxWaitMs: number = 1500): Promise<void> {
  const startTime = Date.now()
  let prev = ''
  let quietFor = 0
  while (Date.now() - startTime < maxWaitMs) {
    let sig: string
    try {
      const stat = await fs.stat(filePath)
      sig = `${stat.size}:${stat.mtimeMs}`
    } catch {
      return // 文件已消失
    }
    if (sig === prev) {
      quietFor += 250
      if (quietFor >= quietMs) {
        return
      }
    } else {
      quietFor = 0
      prev = sig
    }
    await sleep(250)
  }
}

/**
 * 改名后的迟到写入兜底观察窗口（仅新建文件场景）
 * redhat.java 可能在改名之后才把按旧名生成的模板落盘：
 * 1. 旧路径文件复活 -> 取其内容替换翻译段后并入新文件（迟到模板是语言服务器的权威内容），删除复活文件并再清理空中文目录
 * 2. 模板迟到写入已跟随到新路径的缓冲区 -> 窗口结束时再做一次内容替换
 */
async function settleLateLanguageServerWrites(originalPath: string, finalPath: string, pairs: SegmentPair[], workspaceRoot: string): Promise<void> {
  const settleWindowMs = 4000
  const deadline = Date.now() + settleWindowMs

  while (Date.now() < deadline) {
    if (existsSync(originalPath)) {
      await waitForFileStable(originalPath)
      try {
        const lateContent = (await fs.readFile(originalPath)).toString('utf8')
        const translatedLate = replaceContentSegments(lateContent, pairs)
        const doc = findOpenDocumentByPath(finalPath)
        const current = doc ? doc.getText() : (await fs.readFile(finalPath)).toString('utf8')
        if (translatedLate !== current) {
          await applyContentToFile(finalPath, translatedLate)
        }
        await fs.unlink(originalPath)
      } catch {
        // 兜底路径失败时保留现场（两份文件仍存在），不打断用户操作
      }
      break
    }
    await sleep(250)
  }

  // 迟到编辑落在缓冲区里的情况：改名跟随的文档仍可能含翻译前名称，替换并保存
  await translateFileContent(finalPath, pairs)
  // 复活文件可能重建了中文目录，再清一次空目录
  await cleanupEmptyDirs(path.dirname(originalPath), workspaceRoot)
}

/**
 * 获取翻译创建的目录
 * 通过对比翻译前与翻译后的路径，只有发生变化的路径段才是翻译创建的。
 * 相同的前缀段（如 src）是用户原有目录，绝不清理。
 * @param originalPath 翻译前的文件路径
 * @param translatedPath 翻译后的文件路径
 * @returns 翻译创建的目录列表（从深到浅）
 */
function getTranslationCreatedDirs(originalPath: string, translatedPath: string): string[] {
  const origParts = originalPath.split(/[/\\]/)
  const transParts = translatedPath.split(/[/\\]/)

  // 找到翻译前与翻译后路径的第一个不同段（分歧点）
  // 分歧点之前的段完全相同，属于用户原有目录，绝不清理
  let divergeIndex = 0
  while (divergeIndex < origParts.length && divergeIndex < transParts.length && origParts[divergeIndex] === transParts[divergeIndex]) {
    divergeIndex++
  }

  // 从分歧点到文件名之前的每一级目录都是翻译创建的（从深到浅）
  // transParts 最后一个是文件名，不算目录
  const createdDirs: string[] = []
  for (let i = transParts.length - 2; i >= divergeIndex; i--) {
    createdDirs.push(transParts.slice(0, i + 1).join(path.sep))
  }

  return createdDirs
}

/**
 * 清理空目录（异步版本）
 * @param dirPath 目录路径
 * @param workspaceRoot 工作区根路径
 * @param onlyNonEnglish 是否只清理含非英文字符的目录（默认 true）
 */
async function cleanupEmptyDirs(dirPath: string, workspaceRoot?: string, onlyNonEnglish: boolean = true): Promise<void> {
  try {
    if (!workspaceRoot) {
      return
    }

    // 归一化为相对路径以判定目录是否处于工作区子树内。
    // 采用 path.relative 而非 dirPath.startsWith(workspaceRoot)：win32 下 path.relative 按大小写不敏感比较，
    // 可规避 VSCode 将 URI 盘符归一化为小写（d:）与实际 fsPath（D:）不一致时字符串前缀匹配失效的问题。
    // 相对路径为空（同一目录）、以 '..' 开头（位于工作区之外）或为绝对路径（跨盘符）时，判定越界并直接返回。
    const relativePath = path.relative(workspaceRoot, dirPath)
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return
    }

    // 按分隔符拆分为各级目录段，兼容 posix('/') 与 win32('\\') 两种分隔符。
    const parts = relativePath.split(/[/\\]/)

    // 自叶子目录向根方向逐级回溯：先删深层空目录，使其父级在下一轮迭代中也可能变为空目录被回收。
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      // onlyNonEnglish 为 true 时跳过纯 ASCII 目录段，仅清理含非英文字符的目录（避免误删用户既有的英文目录）。
      if (onlyNonEnglish && !containsNonEnglish(part)) {
        continue
      }
      // 由工作区根 + 前 i+1 段重建绝对路径，规避直接字符串拼接导致的分隔符/盘符不一致。
      const fullPath = path.join(workspaceRoot, ...parts.slice(0, i + 1))
      try {
        const stat = await fs.stat(fullPath)
        // 仅当目标为目录且 readdir 返回空列表（无任何条目）时才执行 rmdir，确保非空目录不被删除。
        if (stat.isDirectory()) {
          const files = await fs.readdir(fullPath)
          if (files.length === 0) {
            await fs.rmdir(fullPath)
          }
        }
      } catch {
        // 忽略错误（目录可能已被删除或无权限）
      }
    }
  } catch {
    // 忽略错误
  }
}

/**
 * 关闭文件的编辑器窗口
 * @param filePath 文件路径
 */
async function closeEditorForFile(filePath: string): Promise<void> {
  const normalizedPath = path.normalize(filePath)

  for (const editor of vscode.window.visibleTextEditors) {
    const editorPath = path.normalize(editor.document.uri.fsPath)

    if (editorPath === normalizedPath) {
      await vscode.window.showTextDocument(editor.document)
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      break
    }
  }
}

/**
 * 显示格式选择器
 * @param isTextTranslation 是否是文本翻译（显示更多格式）
 * @returns 选择的命名格式
 */
async function showFormatPicker(isTextTranslation: boolean = false): Promise<NamingFormat | undefined> {
  try {
    // 根据场景选择格式选项
    const formatOptions = isTextTranslation ? TEXT_FORMAT_OPTIONS : FILE_FORMAT_OPTIONS

    // 创建QuickPick选项
    const options: (vscode.QuickPickItem & { value: NamingFormat; index: number })[] = formatOptions.map((option, index) => ({
      label: option.value,
      description: `${index + 1}. ${option.description}`,
      value: option.value,
      index: index,
    }))

    // 创建QuickPick实例
    const quickPick = vscode.window.createQuickPick<(typeof options)[0]>()
    quickPick.items = options
    quickPick.title = isTextTranslation ? '文本翻译' : '文件名翻译'
    quickPick.placeholder = isTextTranslation ? '输入数字1-8选择格式' : '输入数字1-6选择格式'
    quickPick.ignoreFocusOut = true

    return new Promise<NamingFormat | undefined>((resolve) => {
      // 收集事件监听器，用于清理
      const disposables: vscode.Disposable[] = []

      // 监听输入变化，数字匹配后自动确认
      disposables.push(
        quickPick.onDidChangeValue((value) => {
          const num = parseInt(value)
          if (num >= 1 && num <= options.length) {
            quickPick.hide()
            resolve(options[num - 1].value)
          }
        })
      )

      // 监听选择确认
      disposables.push(
        quickPick.onDidAccept(() => {
          const selected = quickPick.selectedItems[0]
          if (selected) {
            resolve(selected.value)
          } else {
            resolve(undefined)
          }
          quickPick.hide()
        })
      )

      // 监听取消
      disposables.push(
        quickPick.onDidHide(() => {
          resolve(undefined)
        })
      )

      quickPick.show()
    }).finally(() => {
      // 确保 QuickPick 及其事件监听器被正确释放
      quickPick.dispose()
    })
  } catch (error) {
    console.error('格式选择器错误:', error)
    return undefined
  }
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
    baidu: '百度',
    tencent: '腾讯',
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
