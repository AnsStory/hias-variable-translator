/**
 * 非英文字符检测模块
 * 用于检测文本中是否包含非ASCII字符（中文、日文、韩文等）
 */

/**
 * 检测文本是否包含非英文字符
 * @param text 要检测的文本
 * @returns 是否包含非英文字符
 */
export function containsNonEnglish(text: string): boolean {
  const nonAsciiRegex = /[^\x00-\x7F]/
  return nonAsciiRegex.test(text)
}
