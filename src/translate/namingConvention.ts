/**
 * 命名格式转换模块
 * 支持6种命名格式：camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case
 */

export type NamingFormat = 'camelCase' | 'PascalCase' | 'snake_case' | 'CONSTANT_CASE' | 'param-case' | 'Header-Case' | 'Capital Case' | 'no case' | 'originalValue'

/**
 * 格式选项，用于QuickPick
 */
export interface FormatOption {
  label: string
  description: string
  value: NamingFormat
  fileOnly?: boolean // 是否仅在文件翻译时显示
  textOnly?: boolean // 是否仅在文本翻译时显示
}

/**
 * 文件翻译时的格式选项
 */
export const FILE_FORMAT_OPTIONS: FormatOption[] = [
  { label: 'camelCase', description: '小驼峰', value: 'camelCase' },
  { label: 'PascalCase', description: '大驼峰', value: 'PascalCase' },
  { label: 'snake_case', description: '全小写下划线分隔', value: 'snake_case' },
  { label: 'CONSTANT_CASE', description: '全大写下划线分隔', value: 'CONSTANT_CASE' },
  { label: 'param-case', description: '全小写连字符分隔', value: 'param-case' },
  { label: 'Header-Case', description: '首字母大写连字符分隔', value: 'Header-Case' },
]

/**
 * 文本翻译时的格式选项（包含文件翻译的所有格式 + 额外格式）
 */
export const TEXT_FORMAT_OPTIONS: FormatOption[] = [
  ...FILE_FORMAT_OPTIONS,
  { label: 'Capital Case', description: '首字母大写空格分隔', value: 'Capital Case' },
  { label: 'no case', description: '小写空格分隔', value: 'no case' },
]

/**
 * 将单词列表转换为指定格式
 * @param words 单词列表
 * @param format 目标格式
 * @returns 转换后的字符串
 */
export function convertToFormat(words: string[], format: NamingFormat): string {
  if (words.length === 0) {
    return ''
  }

  // originalValue 返回原始值（首字母大写，空格分隔）
  if (format === 'originalValue') {
    return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  }

  switch (format) {
    case 'camelCase':
      return toCamelCase(words)
    case 'PascalCase':
      return toPascalCase(words)
    case 'snake_case':
      return toSnakeCase(words)
    case 'CONSTANT_CASE':
      return toConstantCase(words)
    case 'param-case':
      return toParamCase(words)
    case 'Header-Case':
      return toHeaderCase(words)
    case 'Capital Case':
      return toCapitalCase(words)
    case 'no case':
      return toNoCase(words)
    default:
      return toCamelCase(words)
  }
}

/**
 * 转换为camelCase
 * @param words 单词列表
 * @returns camelCase字符串
 */
function toCamelCase(words: string[]): string {
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

/**
 * 转换为PascalCase
 * @param words 单词列表
 * @returns PascalCase字符串
 */
function toPascalCase(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
}

/**
 * 转换为snake_case
 * @param words 单词列表
 * @returns snake_case字符串
 */
function toSnakeCase(words: string[]): string {
  return words.map((word) => word.toLowerCase()).join('_')
}

/**
 * 转换为CONSTANT_CASE
 * @param words 单词列表
 * @returns CONSTANT_CASE字符串
 */
function toConstantCase(words: string[]): string {
  return words.map((word) => word.toUpperCase()).join('_')
}

/**
 * 转换为param-case
 * @param words 单词列表
 * @returns param-case字符串
 */
function toParamCase(words: string[]): string {
  return words.map((word) => word.toLowerCase()).join('-')
}

/**
 * 转换为Header-Case
 * @param words 单词列表
 * @returns Header-Case字符串
 */
function toHeaderCase(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-')
}

/**
 * 转换为Capital Case（每个单词首字母大写，空格分隔）
 * @param words 单词列表
 * @returns Capital Case字符串
 */
function toCapitalCase(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

/**
 * 转换为no case（全部小写，空格分隔）
 * @param words 单词列表
 * @returns no case字符串
 */
function toNoCase(words: string[]): string {
  return words.map((word) => word.toLowerCase()).join(' ')
}

/**
 * 将翻译后的文本按单词分割
 * @param text 翻译后的文本
 * @returns 单词列表
 */
export function splitIntoWords(text: string): string[] {
  // 处理驼峰命名
  const camelCaseWords = text.replace(/([a-z])([A-Z])/g, '$1 $2')
  // 处理下划线和连字符
  const normalizedWords = camelCaseWords.replace(/[_-]/g, ' ')
  // 分割并过滤空字符串
  return normalizedWords.split(/\s+/).filter((word) => word.length > 0)
}

/**
 * 将翻译后的文本按单词分割（文件/文件夹名专用）
 * 相比 splitIntoWords 额外做字符净化，确保结果符合文件命名规范；
 * 仅用于文件/文件夹创建，不影响文件内容（文本）的翻译。
 * - 词内撇号（' ' ＇ `）直接删除，保留单词完整性（如 user's → users）
 * - 其余所有非字母数字字符统一视作分隔符
 * @param text 翻译后的文本
 * @returns 单词列表
 */
export function splitIntoWordsForFileName(text: string): string[] {
  // 词内撇号直接删除，避免单词被拆碎（user's → users）
  const noApostrophe = text.replace(/['’＇`]/g, '')
  // 处理驼峰命名
  const camelCaseWords = noApostrophe.replace(/([a-z])([A-Z])/g, '$1 $2')
  // 其余所有非字母数字字符统一视作分隔符
  const normalizedWords = camelCaseWords.replace(/[^a-zA-Z0-9]+/g, ' ')
  // 分割并过滤空字符串
  return normalizedWords.split(/\s+/).filter((word) => word.length > 0)
}
