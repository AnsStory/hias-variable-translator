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
 * 清理 snippet 语法，转换为普通文本
 * @param text 包含 snippet 语法的文本
 * @returns 清理后的普通文本
 */
export function cleanSnippetSyntax(text: string): string {
  // 移除 ${n:placeholder}，只保留 placeholder
  let result = text.replace(/\$\{(\d+):([^}]+)\}/g, '$2')
  // 移除 $n（光标位置标记）
  result = result.replace(/\$\d+/g, '')
  return result
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
  // 先处理 ${name:prefix,suffix} 变量（必须在 ${name} 之前处理）
  let result = template.replace(/\$\{name:([^}]+)\}/g, (match, format) => {
    const parts = format.split(',')
    if (parts.length === 2) {
      return `${parts[0]}${value}${parts[1]}`
    }
    return match
  })

  // 处理 ${value} 变量（只替换非 snippet 的 ${value}）
  result = result.replace(/(?<!\$\{[^}]*)\$\{value\}(?!\})/g, value)

  // 处理 ${name} 变量（只替换非 snippet 的 ${name}）
  result = result.replace(/(?<!\$\{[^}]*)\$\{name\}(?!\})/g, value)

  return result
}

/**
 * 构建 console.log 匹配正则
 * @param template 模板字符串
 * @returns 匹配正则表达式
 */
export function buildConsoleLogRegex(template: string): RegExp {
  // 先替换模板变量为占位符，再转义特殊字符
  let pattern = template
    // 替换模板变量为占位符
    .replace(/\$\{value\}/g, '§VALUE§')
    .replace(/\$\{name:[^}]+\}/g, '§NAME_FORMAT§')
    .replace(/\$\{name\}/g, '§NAME§')
    // 转义特殊字符（不包括 §）
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // 将占位符替换为正则匹配模式
    .replace(/§VALUE§/g, '.+')
    .replace(/§NAME_FORMAT§/g, '.+')
    .replace(/§NAME§/g, '.+')

  // 构建完整的正则表达式
  return new RegExp(`^\\s*console\\.log\\(${pattern}\\)\\s*$`)
}
