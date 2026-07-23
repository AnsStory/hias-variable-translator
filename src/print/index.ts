/**
 * 打印模块对外入口
 * 聚合并导出 console.log 插入/删除/注释的处理函数、配置读取与公共工具
 */

export { getLineIndent } from './ast'
export type { SelectionRange } from './ast'
export { isConsoleLogEnabled, getConsoleLogTemplate, parseConsoleLogTemplate, buildConsoleLogRegex, buildCommentConsoleLogRegex, isConsoleLogCopyToClipboardEnabled, getConsoleLogClipboardPattern, extractClipboardText } from './config'
export { handleInsertConsoleLog, handleDeleteConsoleLog, handleCommentConsoleLog, handleUncommentConsoleLog } from './handler'
