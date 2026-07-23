/**
 * AST 解析模块
 * 使用 acorn 解析代码，为锚定引擎（locator）提供 AST 与行号/偏移换算基元
 * 支持 Vue、HTML、Svelte、Astro、JSX/TSX 等文件的 script 提取
 */

import * as acorn from 'acorn'
import { tsPlugin } from '@sveltejs/acorn-typescript'

/**
 * AST 节点类型
 */
export interface ASTNode {
  type: string
  start: number
  end: number
  loc?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  [key: string]: unknown
}

/**
 * 从模板文件中提取的 script 信息
 */
interface ExtractedScript {
  /** script 标签内的代码内容 */
  scriptContent: string
  /** 行号偏移量（用于定位原始文件中的位置） */
  lineOffset: number
  /** 字节偏移量（用于调整 AST 节点位置） */
  byteOffset: number
}

/* ───────── 常量定义 ───────── */

/** AST 遍历时跳过的属性名 */
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc'])

/** 需要递归解包的表达式类型（类型断言、括号、链式表达式等） */
const UNWRAP_TYPES = new Set(['TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression', 'ParenthesizedExpression', 'ChainExpression'])

/* ───────── 工具函数 ───────── */

/**
 * 判断节点是否为类型断言表达式
 * @param n AST 节点
 * @returns 是否为需要解包的类型断言
 */
const isTypeAssertion = (n: ASTNode): boolean => UNWRAP_TYPES.has(n.type)

/**
 * 递归解包类型断言，返回最内层的实际表达式节点
 * 支持 TSAsExpression、TSTypeAssertion、TSNonNullExpression、ParenthesizedExpression、ChainExpression
 * @param n AST 节点
 * @returns 解包后的实际表达式节点
 */
export const unwrapTypeAssertion = (n: ASTNode): ASTNode => (isTypeAssertion(n) ? unwrapTypeAssertion(n.expression as ASTNode) : n)

/* ───────── 行号计算（与 VSCode 行模型一致：\r\n | \r | \n） ───────── */

/** 行起始偏移缓存（同一份 code 在一次定位流程内会被多次复用） */
let _lineStartsCode = ''
let _lineStartsCache: number[] = []

/**
 * 计算每一行的起始字节偏移
 * 换行符识别规则与 VSCode 编辑器模型保持一致：\r\n、\r、\n
 * 注意：不把 U+2028 / U+2029 视为换行（acorn 会，但 VSCode 不会），
 * 否则计算出的行号会与最终插入坐标产生偏差
 * @param code 源代码字符串
 * @returns 每行起始偏移量数组
 */
const computeLineStarts = (code: string): number[] => {
  const starts = [0]
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i)
    if (c === 10) {
      starts.push(i + 1)
    } else if (c === 13) {
      if (code.charCodeAt(i + 1) === 10) i++
      starts.push(i + 1)
    }
  }
  return starts
}

/** 获取（并缓存）指定源代码的行起始偏移数组 */
const getLineStarts = (code: string): number[] => {
  if (code !== _lineStartsCode) {
    _lineStartsCode = code
    _lineStartsCache = computeLineStarts(code)
  }
  return _lineStartsCache
}

/**
 * 将字节偏移量转换为行号（0-based）
 * 使用与 VSCode 一致的换行规则，通过二分查找定位，避免大文件下逐字符切片的性能问题
 * @param code 源代码字符串
 * @param offset 字节偏移量
 * @returns 行号（0-based）
 */
export const offsetToLine = (code: string, offset: number): number => {
  const starts = getLineStarts(code)
  let lo = 0,
    hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return lo
}

/* ───────── Script 提取 ───────── */

/**
 * 从 Vue/HTML 文件中提取 script 标签内容
 * 根据 selectionLine 定位到包含选中行的 script 块
 * @param source 完整文件内容
 * @param selectionLine 选中行号（0-based），未指定则返回第一个 script 块
 * @returns 提取结果，包含脚本内容和偏移量
 */
const extractVueScript = (source: string, selectionLine?: number): ExtractedScript | null => {
  const allMatches = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    const full = m[0],
      content = m[1],
      startIdx = m.index!
    const before = source.slice(0, startIdx)
    const tagLine = before.split('\n').length - 1
    const openTag = full.slice(0, full.indexOf('>') + 1)
    const openLines = openTag.split('\n').length - 1
    const contentStart = tagLine + openLines
    const contentEnd = contentStart + content.split('\n').length - 1
    return { fullMatch: full, scriptContent: content, startIndex: startIdx, startLine: contentStart, endLine: contentEnd }
  })

  if (!allMatches.length) return null

  // 优先匹配包含选中行的 script 块，否则取第一个
  const match = selectionLine !== undefined ? (allMatches.find((m) => selectionLine! >= m.startLine && selectionLine! <= m.endLine) ?? null) : allMatches[0]
  if (!match) return null

  const before = source.slice(0, match.startIndex)
  const lineOffset = before.split('\n').length - 1
  const openTag = match.fullMatch.slice(0, match.fullMatch.indexOf('>') + 1)
  const openLines = openTag.split('\n').length - 1
  return {
    scriptContent: match.scriptContent,
    lineOffset: lineOffset + openLines,
    byteOffset: match.startIndex + openTag.length,
  }
}

/**
 * 从 Svelte/Astro 文件中提取 script 标签内容
 * 逻辑与 Vue 相同，但单独提取以支持不同的解析选项
 * @param source 完整文件内容
 * @param selectionLine 选中行号（0-based）
 * @returns 提取结果
 */
const extractSvelteScript = (source: string, selectionLine?: number): ExtractedScript | null => {
  const allMatches = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    const full = m[0],
      content = m[1],
      startIdx = m.index!
    const before = source.slice(0, startIdx)
    const tagLine = before.split('\n').length - 1
    const openTag = full.slice(0, full.indexOf('>') + 1)
    const openLines = openTag.split('\n').length - 1
    const contentStart = tagLine + openLines
    const contentEnd = contentStart + content.split('\n').length - 1
    return { fullMatch: full, scriptContent: content, startIndex: startIdx, startLine: contentStart, endLine: contentEnd }
  })

  if (!allMatches.length) return null

  const match = selectionLine !== undefined ? (allMatches.find((m) => selectionLine! >= m.startLine && selectionLine! <= m.endLine) ?? null) : allMatches[0]
  if (!match) return null

  const before = source.slice(0, match.startIndex)
  const lineOffset = before.split('\n').length - 1
  const openTag = match.fullMatch.slice(0, match.fullMatch.indexOf('>') + 1)
  const openLines = openTag.split('\n').length - 1
  return {
    scriptContent: match.scriptContent,
    lineOffset: lineOffset + openLines,
    byteOffset: match.startIndex + openTag.length,
  }
}

/* ───────── AST 解析与位置调整 ───────── */

/**
 * 递归调整 AST 节点的位置信息：
 * 1) 将 script 块内的偏移转换为原始文件的绝对偏移（byteOffset）
 * 2) 依据调整后的偏移，用与 VSCode 一致的换行规则重新计算 loc 行号，
 *    以消除 acorn 对 U+2028/U+2029/单独 \r 的换行判定与实际插入坐标不一致的问题
 * @param node AST 节点
 * @param code 原始完整文件内容（用于行号换算）
 * @param byteOffset 字节偏移量
 * @returns 调整后的节点
 */
const adjustASTLocations = (node: ASTNode, code: string, byteOffset: number): ASTNode => {
  if (typeof node.start === 'number') node.start += byteOffset
  if (typeof node.end === 'number') node.end += byteOffset
  if (node.loc) {
    node.loc = {
      start: { line: offsetToLine(code, node.start) + 1, column: node.loc.start.column },
      end: { line: offsetToLine(code, node.end) + 1, column: node.loc.end.column },
    }
  }
  for (const key in node) {
    if (SKIP_KEYS.has(key)) continue
    const v = (node as Record<string, unknown>)[key]
    if (Array.isArray(v))
      v.forEach((item) => {
        if (item && typeof item === 'object' && 'type' in item) adjustASTLocations(item as ASTNode, code, byteOffset)
      })
    else if (v && typeof v === 'object' && 'type' in v) adjustASTLocations(v as ASTNode, code, byteOffset)
  }
  return node
}

/**
 * 判断扩展名是否为需先提取 script 块的模板文件（单一来源）
 * @param fileExtension 文件扩展名
 */
export function isTemplateExtension(fileExtension?: string): boolean {
  const ext = fileExtension?.toLowerCase()
  return ext === '.vue' || ext === '.html' || ext === '.svelte' || ext === '.astro'
}

/**
 * 解析源代码为 AST，支持 Vue/HTML/Svelte/Astro 的 script 提取
 * @param code 源代码字符串
 * @param selectionLine 选中行号（0-based）
 * @param fileExtension 文件扩展名，用于判断解析策略
 * @returns 解析结果（AST + 行偏移量），解析失败返回 null
 */
export function parseCode(code: string, selectionLine: number, fileExtension?: string): { ast: ASTNode; lineOffset: number } | null {
  let codeToParse = code,
    lineOffset = 0,
    byteOffset = 0
  const ext = fileExtension?.toLowerCase()

  // 模板文件需要先提取 script 内容
  if (isTemplateExtension(ext)) {
    const extracted = ext === '.svelte' || ext === '.astro' ? extractSvelteScript(code, selectionLine) : extractVueScript(code, selectionLine)
    if (!extracted) return null
    ;({ scriptContent: codeToParse, lineOffset, byteOffset } = extracted)
  }

  try {
    const parser = acorn.Parser.extend(tsPlugin({ jsx: ext === '.jsx' || ext === '.tsx' || ext === '.astro' })) as any
    let ast = parser.parse(codeToParse, { ecmaVersion: 'latest', sourceType: 'module', locations: true }) as ASTNode
    // 始终调整位置：即便非模板文件（byteOffset=0），也需按 VSCode 行规则重算 loc 行号
    ast = adjustASTLocations(ast, code, byteOffset)
    return { ast, lineOffset }
  } catch {
    return null
  }
}

/* ───────── AST 遍历 ───────── */

/**
 * 深度优先遍历 AST 节点
 * 回调函数返回 true 可提前终止遍历
 * @param node 起始节点
 * @param cb 回调函数，接收节点，返回 true 停止遍历
 */
export function walkAST(node: ASTNode, cb: (node: ASTNode) => boolean | void): void {
  if (!node || typeof node !== 'object') return
  if (cb(node) === true) return
  for (const key in node) {
    if (SKIP_KEYS.has(key)) continue
    const v = (node as Record<string, unknown>)[key]
    if (Array.isArray(v))
      v.forEach((item) => {
        if (item && typeof item === 'object' && (item as ASTNode).type) walkAST(item as ASTNode, cb)
      })
    else if (v && typeof v === 'object' && (v as ASTNode).type) walkAST(v as ASTNode, cb)
  }
}

/**
 * 按 AST 根节点缓存父子映射表
 * 同一次定位流程中所有消费者拿到的是同一个 ast 对象，首次构建后全部命中缓存，
 * 避免重复重建父子表
 */
const parentMapCache = new WeakMap<ASTNode, Map<ASTNode, ASTNode>>()

/**
 * 构建节点到父节点的映射表（按 ast 根节点记忆化）
 * @param ast AST 根节点
 * @returns 子节点 → 父节点的 Map
 */
export function buildParentMap(ast: ASTNode): Map<ASTNode, ASTNode> {
  const cached = parentMapCache.get(ast)
  if (cached) return cached
  const map = new Map<ASTNode, ASTNode>()
  const walk = (node: ASTNode, parent?: ASTNode) => {
    if (!node || typeof node !== 'object') return
    if (parent) map.set(node, parent)
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue
      const v = (node as Record<string, unknown>)[key]
      if (Array.isArray(v))
        v.forEach((item) => {
          if (item && typeof item === 'object' && 'type' in item) walk(item as ASTNode, node)
        })
      else if (v && typeof v === 'object' && 'type' in v) walk(v as ASTNode, node)
    }
  }
  walk(ast)
  parentMapCache.set(ast, map)
  return map
}

/* ───────── 返回类型 ───────── */

/**
 * 选区的起止字符 offset（0-based，针对完整文件内容）
 * 需同时携带列/offset，以消除仅传行号导致的同行同名歧义
 */
export interface SelectionRange {
  /** 选区起始 offset（document.offsetAt(selection.start)）*/
  startOffset: number
  /** 选区结束 offset（document.offsetAt(selection.end)）*/
  endOffset: number
}

/* ───────── 行缩进工具 ───────── */

/**
 * 获取指定行的缩进前缀（空格或制表符）
 * @param lineText 行文本
 * @returns 缩进字符串
 */
export const getLineIndent = (lineText: string): string => lineText.match(/^(\s*)/)?.[1] ?? ''
