/**
 * 打印模块
 * 处理 console.log 相关功能
 */

export { findInsertionLine, getLineIndent } from './ast'
export type { InsertionResult } from './ast'
export { isConsoleLogEnabled, getConsoleLogTemplate, parseConsoleLogTemplate, buildConsoleLogRegex, buildCommentConsoleLogRegex, isConsoleLogCopyToClipboardEnabled, getConsoleLogClipboardPattern, extractClipboardText } from './config'
export { handleInsertConsoleLog, handleDeleteConsoleLog, handleCommentConsoleLog, handleUncommentConsoleLog } from './handler'
