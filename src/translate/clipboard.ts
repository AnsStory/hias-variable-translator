/**
 * 剪贴板工具模块
 * 处理翻译结果的剪贴板复制功能
 */

import * as vscode from 'vscode'
import { NamingFormat, convertToFormat, splitIntoWords } from './namingConvention'
import { ConfigManager } from './config'

/**
 * 重排格式列表（用户选择的排第一，然后去重，最后反转）
 * @param formats 原始格式列表
 * @param selected 用户选择的格式
 * @returns 重排后的格式列表（反转后的顺序）
 */
export function reorderFormats(formats: NamingFormat[], selected: NamingFormat): NamingFormat[] {
  // 用户选择的排第一
  const rest = formats.filter((f) => f !== selected)
  const reordered = [selected, ...rest]
  // 去重
  const unique = [...new Set(reordered)]
  // 反转
  return unique.reverse()
}

/**
 * 复制翻译结果到剪贴板
 * @param originalText 原始选中的文本
 * @param translatedText 翻译后的英文文本
 * @param selectedFormat 用户选择的格式
 * @returns 复制的格式数量
 */
export async function copyTranslationToClipboard(originalText: string, translatedText: string, selectedFormat: NamingFormat): Promise<number> {
  const copyToClipboard = ConfigManager.isCopyToClipboard()

  if (!copyToClipboard) {
    return 0
  }

  const clipboardFormats = ConfigManager.getClipboardFormats()
  const words = splitIntoWords(translatedText)

  // 确定要复制的格式列表
  let formatsToCopy: NamingFormat[]

  if (clipboardFormats.length > 0) {
    // 有配置格式：用户选择的排第一 + 配置的其余格式
    formatsToCopy = reorderFormats(clipboardFormats as NamingFormat[], selectedFormat)
  } else {
    // 无配置格式：只复制用户选择的格式
    formatsToCopy = [selectedFormat]
  }

  // 逐条写入剪贴板
  let count = 0
  for (const format of formatsToCopy) {
    let result: string
    if (format === 'originalValue') {
      result = originalText
    } else {
      result = convertToFormat(words, format)
    }
    await vscode.env.clipboard.writeText(result)
    count++
    // 添加延迟让系统剪贴板历史记录每条写入
    if (count < formatsToCopy.length) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return count
}

/**
 * 显示剪贴板复制状态
 * @param originalText 原始选中的文本
 * @param translatedText 翻译后的英文文本
 * @param selectedFormat 用户选择的格式
 * @param copyCount 复制的格式数量
 */
export function showClipboardStatus(originalText: string, translatedText: string, selectedFormat: NamingFormat, copyCount: number): void {
  if (copyCount === 0) {
    return
  }

  const clipboardFormats = ConfigManager.getClipboardFormats()
  const words = splitIntoWords(translatedText)

  // 构建状态消息
  const lines: string[] = []

  if (clipboardFormats.length > 0) {
    // 有配置格式：显示所有格式
    const formatsToCopy = reorderFormats(clipboardFormats as NamingFormat[], selectedFormat)
    lines.push(`已复制 ${formatsToCopy.length} 种格式到剪贴板：`)

    for (const format of formatsToCopy) {
      let result: string
      if (format === 'originalValue') {
        result = originalText
      } else {
        result = convertToFormat(words, format)
      }
      lines.push(`- ${format}: ${result}`)
    }
  } else {
    // 无配置格式：只显示用户选择的格式
    let result: string
    if (selectedFormat === 'originalValue') {
      result = originalText
    } else {
      result = convertToFormat(words, selectedFormat)
    }
    lines.push(`已复制到剪贴板：${result}`)
  }

  // 显示状态消息
  // vscode.window.setStatusBarMessage(lines[0], 5000)

  // 同时显示信息消息
  // vscode.window.showInformationMessage(lines.join('\n'))
}

/**
 * 复制文件翻译结果到剪贴板
 * @param originalFileName 原始文件名（不含扩展名）
 * @param translatedFileName 翻译后的文件名（不含扩展名）
 * @param selectedFormat 用户选择的格式
 * @returns 复制的格式数量
 */
export async function copyFileTranslationToClipboard(originalFileName: string, translatedFileName: string, selectedFormat: NamingFormat): Promise<number> {
  return copyTranslationToClipboard(originalFileName, translatedFileName, selectedFormat)
}

/**
 * 显示文件翻译剪贴板状态
 * @param originalFileName 原始文件名（不含扩展名）
 * @param translatedFileName 翻译后的文件名（不含扩展名）
 * @param selectedFormat 用户选择的格式
 * @param copyCount 复制的格式数量
 */
export function showFileClipboardStatus(originalFileName: string, translatedFileName: string, selectedFormat: NamingFormat, copyCount: number): void {
  showClipboardStatus(originalFileName, translatedFileName, selectedFormat, copyCount)
}
