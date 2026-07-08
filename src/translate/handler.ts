/**
 * 翻译模块处理函数
 * 处理文本翻译、文件翻译、撤销翻译等功能
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { containsNonEnglish } from './chineseDetector'
import { NamingFormat, FILE_FORMAT_OPTIONS, TEXT_FORMAT_OPTIONS, convertToFormat, splitIntoWords } from './namingConvention'
import { Translator } from './translator'
import { UndoManager } from './undoManager'
import { ConfigManager } from './config'
import { TranslationServiceType } from './services'

let translator: Translator
let undoManager: UndoManager
let statusBarItem: vscode.StatusBarItem

/**
 * 初始化翻译模块
 */
export function initTranslateModule() {
  translator = new Translator()
  undoManager = new UndoManager()
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
    return
  }

  // 选择翻译格式
  const format = await showFormatPicker(true)
  if (!format) {
    return
  }

  // 翻译文本
  const result = await translator.translate(selectedText)

  if (!result.success) {
    vscode.window.showErrorMessage(`翻译失败: ${result.error}`)
    return
  }

  // 转换格式
  const words = splitIntoWords(result.translatedText)
  const translatedText = convertToFormat(words, format)

  // 替换选中文本
  await editor.edit((editBuilder) => {
    editBuilder.replace(selection, translatedText)
  })
}

/**
 * 处理撤回翻译
 */
export async function handleUndoTranslation(): Promise<void> {
  // 获取所有有效的撤回记录
  const validRecords = undoManager.getValidRecords()

  if (validRecords.length === 0) {
    vscode.window.showWarningMessage('没有可撤回的翻译记录（已超过1分钟有效期）')
    return
  }

  // 获取最近的一条记录
  const latestRecord = validRecords[validRecords.length - 1]
  const filePath = latestRecord.translatedPath

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      vscode.window.showWarningMessage('文件不存在，可能已被删除')
      undoManager.removeRecord(filePath)
      return
    }

    // 删除文件
    await vscode.workspace.fs.delete(vscode.Uri.file(filePath))

    // 关闭编辑器窗口
    await closeEditorForFile(filePath)

    // 删除空目录
    await deleteEmptyDirs(path.dirname(filePath))

    // 删除撤回记录
    undoManager.removeRecord(filePath)
  } catch (error) {
    console.error('删除文件失败:', error)
    vscode.window.showErrorMessage(`删除文件失败: ${error}`)
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
  const { TRANSLATION_SERVICE_OPTIONS } = await import('./services')
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
 * 处理文件创建事件
 * @param fileUri 文件URI
 * @param isNewFile 是否是新建文件（取消时删除）
 */
async function handleFileCreated(fileUri: vscode.Uri, isNewFile: boolean): Promise<void> {
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

  // 延迟等待创建完成
  await new Promise((resolve) => setTimeout(resolve, 200))

  // 选择翻译格式
  const format = await showFormatPicker()
  if (!format) {
    // 只有新建文件才删除，重命名文件保留原文件
    if (isNewFile) {
      try {
        if (!isDirectory) {
          await closeEditorForFile(filePath)
        }
        await vscode.workspace.fs.delete(fileUri, { recursive: true })
        await cleanupEmptyDirs(path.dirname(filePath), workspaceFolder.uri.fsPath)
      } catch {
        // 忽略删除错误
      }
    }
    return
  }

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

  // 翻译路径的每个部分（支持路径分隔符和点号作为分隔符）
  const pathParts = nameWithoutExt.split(/[/\\]/)
  const translatedParts: string[] = []

  for (const pathPart of pathParts) {
    if (!pathPart) continue

    // 将点号也作为分隔符处理
    const dotParts = pathPart.split('.')
    const translatedDotParts: string[] = []

    for (const dotPart of dotParts) {
      if (!dotPart) {
        translatedDotParts.push(dotPart)
        continue
      }

      if (containsNonEnglish(dotPart)) {
        // 翻译非英文部分
        const result = await translator.translate(dotPart)
        if (result.success) {
          const words = splitIntoWords(result.translatedText)
          const translated = convertToFormat(words, format)
          translatedDotParts.push(translated)
        } else {
          translatedDotParts.push(dotPart)
        }
      } else {
        // 英文部分保持原样
        translatedDotParts.push(dotPart)
      }
    }

    translatedParts.push(translatedDotParts.join('.'))
  }

  // 翻译扩展名（去掉前面的点号）
  let translatedExt = ext
  if (ext) {
    const extContent = ext.slice(1) // 去掉点号
    if (containsNonEnglish(extContent)) {
      const result = await translator.translate(extContent)
      if (result.success) {
        const words = splitIntoWords(result.translatedText)
        const translated = convertToFormat(words, format)
        translatedExt = '.' + translated
      }
    }
  }

  // 构建新的相对路径
  const newRelativePath = translatedParts.join('/') + translatedExt
  const newFilePath = path.join(workspaceFolder.uri.fsPath, newRelativePath)

  // 处理文件名冲突
  let finalPath = newFilePath
  if (fs.existsSync(finalPath)) {
    const dir = path.dirname(finalPath)
    const baseName = path.basename(finalPath, ext)
    let counter = 1
    while (fs.existsSync(finalPath)) {
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
    await vscode.workspace.fs.rename(fileUri, vscode.Uri.file(finalPath), { overwrite: false })

    // 清理空的中文目录
    await cleanupEmptyDirs(path.dirname(filePath), workspaceFolder.uri.fsPath)

    // 添加撤回记录
    undoManager.addRecord(filePath, finalPath)

    // 文件才需要关闭窗口和打开新文件
    if (!isDirectory) {
      // 关闭原始文件窗口（如果已打开）
      await closeEditorForFile(filePath)
      // 打开翻译后的文件
      await vscode.window.showTextDocument(vscode.Uri.file(finalPath))
    }
  } catch (error) {
    console.error('重命名失败:', error)
    vscode.window.showErrorMessage(`重命名失败: ${error}`)
  }
}

/**
 * 递归创建目录
 * @param dirPath 目录路径
 */
async function createDirectoryRecursive(dirPath: string): Promise<void> {
  if (fs.existsSync(dirPath)) {
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
 * 删除空目录（向上递归删除空目录）
 * @param dirPath 目录路径
 */
async function deleteEmptyDirs(dirPath: string): Promise<void> {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      return
    }

    // 检查目录是否为空
    const files = fs.readdirSync(dirPath)
    if (files.length > 0) {
      return // 目录不为空，不删除
    }

    // 删除空目录
    fs.rmdirSync(dirPath)

    // 递归删除上级空目录
    const parentDir = path.dirname(dirPath)
    if (parentDir !== dirPath) {
      await deleteEmptyDirs(parentDir)
    }
  } catch (error) {
    console.error('删除目录失败:', error)
  }
}

/**
 * 清理空目录
 * @param dirPath 目录路径
 * @param workspaceRoot 工作区根路径
 */
async function cleanupEmptyDirs(dirPath: string, workspaceRoot?: string): Promise<void> {
  try {
    if (workspaceRoot && dirPath.startsWith(workspaceRoot)) {
      const relativePath = path.relative(workspaceRoot, dirPath)
      const parts = relativePath.split(/[/\\]/)

      // 从最深的目录开始，逐级向上检查并删除空的中文目录
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i]
        if (containsNonEnglish(part)) {
          const fullPath = path.join(workspaceRoot, ...parts.slice(0, i + 1))
          try {
            const stat = fs.statSync(fullPath)
            if (stat.isDirectory()) {
              const files = fs.readdirSync(fullPath)
              if (files.length === 0) {
                fs.rmdirSync(fullPath)
              }
            }
          } catch {
            // 忽略错误
          }
        }
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
      // 监听输入变化，数字匹配后自动确认
      quickPick.onDidChangeValue((value) => {
        const num = parseInt(value)
        if (num >= 1 && num <= options.length) {
          quickPick.hide()
          resolve(options[num - 1].value)
        }
      })

      // 监听选择确认
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0]
        if (selected) {
          resolve(selected.value)
        } else {
          resolve(undefined)
        }
        quickPick.hide()
      })

      // 监听取消
      quickPick.onDidHide(() => {
        resolve(undefined)
      })

      quickPick.show()
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

  const status = isEnabled ? '✓' : '✗'

  statusBarItem.text = `$(globe) 文件翻译: ${status}`
  statusBarItem.tooltip = '点击切换文件翻译开关'
  statusBarItem.command = 'variableTranslator.toggleFileTranslation'
}

/**
 * 监听配置变化
 */
export function registerConfigListener(): void {
  ConfigManager.onConfigurationChanged(() => {
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
  if (undoManager) {
    undoManager.dispose()
  }
}
