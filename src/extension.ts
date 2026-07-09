/**
 * VSCode 插件主入口
 */

import * as vscode from 'vscode'
import {
  initTranslateModule,
  createStatusBarItem,
  handleTranslateSelection,
  handleTranslateCopy,
  handleUndoTranslation,
  handleToggleFileTranslation,
  handleSwitchTranslationService,
  registerFileCreationListener,
  registerFileRenameListener,
  registerConfigListener,
  disposeTranslateModule,
} from './translate'
import { handleInsertConsoleLog, handleDeleteConsoleLog, handleCommentConsoleLog, handleUncommentConsoleLog } from './print'

/**
 * 插件激活函数
 * @param context 插件上下文
 */
export function activate(context: vscode.ExtensionContext) {
  // 初始化翻译模块
  initTranslateModule()

  // 创建状态栏项目
  const statusBarItem = createStatusBarItem()

  // 注册命令
  registerCommands(context)

  // 监听文件创建事件
  registerFileCreationListener(context)

  // 监听文件重命名事件
  registerFileRenameListener(context)

  // 监听配置变化
  registerConfigListener()

  context.subscriptions.push(statusBarItem)
}

/**
 * 注册命令
 * @param context 插件上下文
 */
function registerCommands(context: vscode.ExtensionContext) {
  // 翻译选中文本
  const translateSelectionCmd = vscode.commands.registerCommand('variableTranslator.translateSelection', () => handleTranslateSelection())

  // 翻译并复制到剪贴板
  const translateCopyCmd = vscode.commands.registerCommand('variableTranslator.translateCopy', () => handleTranslateCopy())

  // 撤回翻译
  const undoTranslationCmd = vscode.commands.registerCommand('variableTranslator.undoTranslation', () => handleUndoTranslation())

  // 切换文件翻译开关
  const toggleFileTranslationCmd = vscode.commands.registerCommand('variableTranslator.toggleFileTranslation', () => handleToggleFileTranslation())

  // 切换翻译服务
  const switchTranslationServiceCmd = vscode.commands.registerCommand('variableTranslator.switchTranslationService', () => handleSwitchTranslationService())

  // 插入 console.log
  const insertConsoleLogCmd = vscode.commands.registerCommand('variableTranslator.insertConsoleLog', () => handleInsertConsoleLog())

  // 删除 console.log
  const deleteConsoleLogCmd = vscode.commands.registerCommand('variableTranslator.deleteConsoleLog', () => handleDeleteConsoleLog())

  // 注释 console.log
  const commentConsoleLogCmd = vscode.commands.registerCommand('variableTranslator.commentConsoleLog', () => handleCommentConsoleLog())

  // 取消注释 console.log
  const uncommentConsoleLogCmd = vscode.commands.registerCommand('variableTranslator.uncommentConsoleLog', () => handleUncommentConsoleLog())

  context.subscriptions.push(
    translateSelectionCmd,
    translateCopyCmd,
    undoTranslationCmd,
    toggleFileTranslationCmd,
    switchTranslationServiceCmd,
    insertConsoleLogCmd,
    deleteConsoleLogCmd,
    commentConsoleLogCmd,
    uncommentConsoleLogCmd
  )
}

/**
 * 插件停用函数
 */
export function deactivate() {
  disposeTranslateModule()
}
