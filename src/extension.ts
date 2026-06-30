/**
 * 变量翻译助手 - VSCode 插件主入口
 * 将非英文字符翻译为英文，支持文件路径翻译和选中文本翻译
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { containsNonEnglish } from './chineseDetector'
import { NamingFormat, FILE_FORMAT_OPTIONS, TEXT_FORMAT_OPTIONS, convertToFormat, splitIntoWords } from './namingConvention'
import { Translator } from './translator'
import { UndoManager } from './undoManager'
import { ConfigManager } from './config'
import { TranslationServiceType, TRANSLATION_SERVICE_OPTIONS } from './services'

let translator: Translator
let undoManager: UndoManager
let statusBarItem: vscode.StatusBarItem

/**
 * 插件激活函数
 * @param context 插件上下文
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('变量翻译助手已激活')

  // 初始化模块
  translator = new Translator()
  undoManager = new UndoManager()

  console.log('翻译器初始化完成')

  // 创建状态栏项目
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  updateStatusBar()
  statusBarItem.show()

  console.log('状态栏初始化完成')

  // 注册命令
  registerCommands(context)
  console.log('命令注册完成')

  // 监听文件创建事件
  registerFileCreationListener(context)
  console.log('文件创建监听注册完成')

  // 监听配置变化
  registerConfigListener()

  context.subscriptions.push(statusBarItem)
  console.log('插件初始化完成，等待文件创建事件...')
}

/**
 * 注册命令
 * @param context 插件上下文
 */
function registerCommands(context: vscode.ExtensionContext) {
  // 翻译选中文本
  const translateSelectionCmd = vscode.commands.registerCommand('variableTranslator.translateSelection', () => handleTranslateSelection())

  // 撤回翻译
  const undoTranslationCmd = vscode.commands.registerCommand('variableTranslator.undoTranslation', () => handleUndoTranslation())

  // 切换文件翻译开关
  const toggleFileTranslationCmd = vscode.commands.registerCommand('variableTranslator.toggleFileTranslation', () => handleToggleFileTranslation())

  // 切换翻译服务
  const switchTranslationServiceCmd = vscode.commands.registerCommand('variableTranslator.switchTranslationService', () => handleSwitchTranslationService())

  context.subscriptions.push(translateSelectionCmd, undoTranslationCmd, toggleFileTranslationCmd, switchTranslationServiceCmd)
}

/**
 * 处理翻译选中文本
 */
async function handleTranslateSelection() {
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

  // vscode.window.showInformationMessage(`翻译完成: ${translatedText}`);
}

/**
 * 处理撤回翻译
 */
async function handleUndoTranslation() {
  // 获取所有有效的撤回记录
  const validRecords = undoManager.getValidRecords()
  console.log('有效的撤回记录数量:', validRecords.length)

  if (validRecords.length === 0) {
    vscode.window.showWarningMessage('没有可撤回的翻译记录（已超过1分钟有效期）')
    return
  }

  // 获取最近的一条记录
  const latestRecord = validRecords[validRecords.length - 1]
  const filePath = latestRecord.translatedPath
  console.log('删除文件:', filePath)

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log('文件不存在')
      vscode.window.showWarningMessage('文件不存在，可能已被删除')
      undoManager.removeRecord(filePath)
      return
    }

    // 删除文件
    await vscode.workspace.fs.delete(vscode.Uri.file(filePath))
    console.log('文件删除成功')

    // 关闭编辑器窗口
    await closeEditorForFile(filePath)

    // 删除空目录
    await deleteEmptyDirs(path.dirname(filePath))

    // 删除撤回记录
    undoManager.removeRecord(filePath)

    // vscode.window.showInformationMessage('已删除: ' + path.basename(filePath));
  } catch (error) {
    console.error('删除文件失败:', error)
    vscode.window.showErrorMessage(`删除文件失败: ${error}`)
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
    console.log('删除空目录:', dirPath)

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
 * 处理切换文件翻译开关
 */
async function handleToggleFileTranslation() {
  const newState = await ConfigManager.toggleFileTranslation()
  updateStatusBar()

  const message = newState ? '文件翻译：已开启 ✓' : '文件翻译：已关闭 ✗'
  vscode.window.setStatusBarMessage(message, 3000)
}

/**
 * 处理切换翻译服务
 */
async function handleSwitchTranslationService() {
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
function registerFileCreationListener(context: vscode.ExtensionContext) {
  const listener = vscode.workspace.onDidCreateFiles(async (event) => {
    console.log('文件创建事件触发:', event.files.length, '个文件')

    // 检查是否启用了文件翻译
    if (!ConfigManager.isFileTranslationEnabled()) {
      console.log('文件翻译已禁用')
      return
    }

    for (const fileUri of event.files) {
      console.log('处理文件:', fileUri.fsPath)
      await handleFileCreated(fileUri)
    }
  })

  context.subscriptions.push(listener)
}

/**
 * 处理文件创建事件
 * @param fileUri 文件URI
 */
async function handleFileCreated(fileUri: vscode.Uri) {
  const filePath = fileUri.fsPath

  console.log('处理文件:', filePath)

  // 检查是文件还是文件夹
  let isDirectory: boolean
  try {
    const stat = await vscode.workspace.fs.stat(fileUri)
    isDirectory = stat.type === vscode.FileType.Directory
    console.log('类型:', isDirectory ? '文件夹' : '文件')
  } catch {
    console.log('无法获取文件状态，跳过')
    return
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri)
  if (!workspaceFolder) {
    console.log('不在工作区内，跳过')
    return
  }

  // 获取相对路径（包含目录）
  const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath)
  console.log('相对路径:', relativePath)

  // 检测相对路径是否包含非英文字符
  if (!containsNonEnglish(relativePath)) {
    console.log('路径不包含非英文字符，跳过')
    return
  }

  console.log('检测到非英文字符，等待创建完成...')

  // 延迟等待创建完成
  await new Promise((resolve) => setTimeout(resolve, 200))

  console.log('弹出格式选择框')

  // 选择翻译格式
  const format = await showFormatPicker()
  if (!format) {
    console.log('用户取消了格式选择')
    // 用户取消时，删除创建的内容
    try {
      if (!isDirectory) {
        await closeEditorForFile(filePath)
      }
      await vscode.workspace.fs.delete(fileUri, { recursive: true })
      await cleanupEmptyDirs(path.dirname(filePath), workspaceFolder.uri.fsPath)
    } catch {
      // 忽略删除错误
    }
    return
  }

  console.log('用户选择格式:', format)

  // 获取文件名部分（不含扩展名）
  let nameWithoutExt: string
  let ext: string

  if (isDirectory) {
    // 文件夹没有扩展名，整个相对路径就是名称
    nameWithoutExt = relativePath
    ext = ''
  } else {
    ext = path.extname(relativePath)
    nameWithoutExt = relativePath.slice(0, -ext.length)
  }
  console.log('名称（不含扩展名）:', nameWithoutExt, '扩展名:', ext)

  // 翻译路径的每个部分
  const parts = nameWithoutExt.split(/[/\\]/)
  const translatedParts: string[] = []

  for (const part of parts) {
    if (!part) continue

    if (containsNonEnglish(part)) {
      console.log('翻译部分:', part)
      // 翻译非英文部分
      const result = await translator.translate(part)
      if (result.success) {
        console.log('翻译结果:', result.translatedText)
        const words = splitIntoWords(result.translatedText)
        const translated = convertToFormat(words, format)
        console.log('格式转换后:', translated)
        translatedParts.push(translated)
      } else {
        translatedParts.push(part)
      }
    } else {
      // 英文部分保持原样
      translatedParts.push(part)
    }
  }

  console.log('翻译后的部分:', translatedParts)

  // 构建新的相对路径
  const newRelativePath = translatedParts.join('/') + ext
  const newFilePath = path.join(workspaceFolder.uri.fsPath, newRelativePath)
  console.log('新路径:', newFilePath)

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

  console.log('开始重命名...')

  // 重命名
  try {
    await vscode.workspace.fs.rename(fileUri, vscode.Uri.file(finalPath), { overwrite: true })

    console.log('重命名成功')

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
  console.log('显示格式选择器')

  try {
    // 根据场景选择格式选项
    const formatOptions = isTextTranslation ? TEXT_FORMAT_OPTIONS : FILE_FORMAT_OPTIONS

    // 创建QuickPick选项
    const options = formatOptions.map((option) => ({
      label: option.value,
      description: option.description,
      value: option.value,
    }))

    // 使用showQuickPick并添加ignoreFocusOut选项（参考var-translation实现）
    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: isTextTranslation ? '选择翻译格式：' : '检测到非英文文件名，选择命名格式：',
      title: isTextTranslation ? '文本翻译' : '文件名翻译',
      ignoreFocusOut: true,
    })

    console.log('用户选择:', selected)

    if (!selected) {
      return undefined
    }

    return selected.value as NamingFormat
  } catch (error) {
    console.error('格式选择器错误:', error)
    return undefined
  }
}

/**
 * 更新状态栏显示
 */
function updateStatusBar() {
  const isEnabled = ConfigManager.isFileTranslationEnabled()

  const status = isEnabled ? '✓' : '✗'

  statusBarItem.text = `$(globe) 文件翻译: ${status}`
  statusBarItem.tooltip = '点击切换文件翻译开关'
  statusBarItem.command = 'variableTranslator.toggleFileTranslation'
}

/**
 * 监听配置变化
 */
function registerConfigListener() {
  ConfigManager.onConfigurationChanged(() => {
    updateStatusBar()
  })
}

/**
 * 插件停用函数
 */
export function deactivate() {
  console.log('变量翻译助手已停用')

  if (undoManager) {
    undoManager.dispose()
  }
}
