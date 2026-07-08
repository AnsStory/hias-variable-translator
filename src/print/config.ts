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
 * 解析模板变量
 * @param value 选中的文本
 * @param template 模板字符串
 * @returns 解析后的字符串
 */
export function parseConsoleLogTemplate(value: string, template: string): string {
  // 处理 ${value} 变量
  let result = template.replace(/\$\{value\}/g, value)

  // 处理 ${name:prefix,suffix} 变量（必须在 ${name} 之前处理）
  result = result.replace(/\$\{name:([^}]+)\}/g, (match, format) => {
    const parts = format.split(',')
    if (parts.length === 2) {
      return `${parts[0]}${value}${parts[1]}`
    }
    // 只有一个参数时不处理，保留原样
    return match
  })

  // 处理 ${name} 变量（只输出原始文本）
  result = result.replace(/\$\{name\}/g, value)

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
