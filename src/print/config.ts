/**
 * 打印模块配置
 * 管理 console.log 相关配置
 */

import * as vscode from 'vscode'

const CONFIG_PREFIX = 'variableTranslator'

/**
 * 检查 console.log 功能是否启用
 * @returns 是否启用
 */
export function isConsoleLogEnabled(): boolean {
  const config = vscode.workspace.getConfiguration(CONFIG_PREFIX)
  return config.get<boolean>('enableConsoleLog', false)
}

/**
 * 获取 console.log 模板
 * @returns 模板字符串
 */
export function getConsoleLogTemplate(): string {
  const config = vscode.workspace.getConfiguration(CONFIG_PREFIX)
  return config.get<string>('consoleLogTemplate', '${value}, `${name}`')
}

/**
 * 检查模板是否包含 snippet 语法
 * @param template 模板字符串
 * @returns 是否包含 snippet 语法
 */
export function hasSnippetSyntax(template: string): boolean {
  // 匹配 $1, $2, ..., $0 或 ${1:...}, ${2:...}, ..., ${0:...}
  return /\$\d/.test(template) || /\$\{\d/.test(template)
}

/**
 * 解析模板变量
 * @param value 选中的文本
 * @param template 模板字符串
 * @returns 解析后的字符串（保留 snippet 语法）
 */
export function parseConsoleLogTemplate(value: string, template: string): string {
  // 先处理 ${n:name:prefix,suffix} 变量（snippet + name + 前后缀）
  let result = template.replace(/\$\{\d+:name:([^}]+)\}/g, (match, format) => {
    const parts = format.split(',')
    if (parts.length === 2) {
      return `${parts[0]}${value}${parts[1]}`
    }
    return match
  })

  // 再处理 ${name:prefix,suffix} 变量（无 snippet）
  result = result.replace(/\$\{name:([^}]+)\}/g, (match, format) => {
    const parts = format.split(',')
    if (parts.length === 2) {
      return `${parts[0]}${value}${parts[1]}`
    }
    return match
  })

  // 处理 ${n:name} snippet 变量（如 ${1:name}）
  result = result.replace(/\$\{\d+:name\}/g, value)

  // 处理 ${n:value} snippet 变量（如 ${1:value}）
  result = result.replace(/\$\{\d+:value\}/g, value)

  // 处理 ${value} 变量
  result = result.replace(/\$\{value\}/g, value)

  // 处理 ${name} 变量
  result = result.replace(/\$\{name\}/g, value)

  return result
}

/**
 * 检查是否启用 console.log 复制到剪贴板
 * @returns 是否启用
 */
export function isConsoleLogCopyToClipboardEnabled(): boolean {
  const config = vscode.workspace.getConfiguration(CONFIG_PREFIX)
  return config.get<boolean>('consoleLogCopyToClipboard', false)
}

/**
 * 获取 console.log 剪贴板提取模板
 * @returns 提取模板字符串，为空字符串时返回 null
 */
export function getConsoleLogClipboardPattern(): string | null {
  const config = vscode.workspace.getConfiguration(CONFIG_PREFIX)
  const pattern = config.get<string>('consoleLogClipboardPattern', '')
  if (!pattern) {
    return null
  }
  return pattern
}

/**
 * 从选中文本解析剪贴板提取模板，返回要复制的文本
 * @param selectedText 选中的文本
 * @param extractTemplate 提取模板
 * @param fullLine 完整的 console.log 语句（如 `console.log(obj, \`obj\`)`）
 * @returns 解析后的文本
 */
export function extractClipboardText(selectedText: string, extractTemplate: string, fullLine?: string): string {
  // 先处理 ${line} 变量（完整的 console.log 语句）
  let result = extractTemplate
  if (fullLine !== undefined) {
    result = result.replace(/\$\{line\}/g, fullLine)
  }
  // 再处理其他模板变量
  return parseConsoleLogTemplate(selectedText, result)
}

/**
 * 构建 console.log 内容匹配模式（无锚点）
 * @param template 模板字符串
 * @returns 匹配 console.log(...) 内部内容的正则源字符串
 */
function buildConsoleLogPattern(template: string): string {
  // 先清理 snippet 语法，再替换模板变量为占位符
  let cleanTemplate = template
  // 移除 ${n:placeholder}，只保留 placeholder
  cleanTemplate = cleanTemplate.replace(/\$\{(\d+):([^}]+)\}/g, '$2')
  // 移除 $n（光标位置标记）
  cleanTemplate = cleanTemplate.replace(/\$\d+/g, '')

  // 替换模板变量为占位符，再转义特殊字符
  const pattern = cleanTemplate
    .replace(/\$\{value\}/g, '§VALUE§')
    .replace(/\$\{name:[^}]+\}/g, '§NAME_FORMAT§')
    .replace(/\$\{name\}/g, '§NAME§')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/§VALUE§/g, '.+')
    .replace(/§NAME_FORMAT§/g, '.+')
    .replace(/§NAME§/g, '.+')

  return `console\\.log\\(${pattern}\\)`
}

/**
 * 构建 console.log 匹配正则
 * @param template 模板字符串
 * @returns 匹配正则表达式
 */
export function buildConsoleLogRegex(template: string): RegExp {
  return new RegExp(`^\\s*${buildConsoleLogPattern(template)}\\s*$`)
}

/**
 * 构建注释形式的 console.log 匹配正则
 * 支持: // console.log(...) 或 # console.log(...) 或块注释
 * @param template 模板字符串
 * @returns 匹配注释形式的正则表达式
 */
export function buildCommentConsoleLogRegex(template: string): RegExp {
  const base = buildConsoleLogPattern(template)
  // 匹配单行注释（// 和 #）以及块注释
  return new RegExp(`^\\s*(?:(?://|#)\\s*${base}|/\\*\\s*${base}\\s*\\*/)`)
}
