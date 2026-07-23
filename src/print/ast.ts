/**
 * AST 解析模块
 * 使用 acorn 解析代码，确定 console.log 的正确插入位置
 * 支持 Vue、HTML、Svelte、Astro、JSX/TSX 等文件的 script 提取
 * 参考 turbo-console-log 项目的实现
 */

import * as acorn from 'acorn'
import { tsPlugin } from '@sveltejs/acorn-typescript'

/**
 * AST 节点类型
 */
interface ASTNode {
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

/** 类似函数的节点类型（函数声明、函数表达式、箭头函数） */
const FN_LIKE = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])

/** 语句类型集合，用于判断节点是否为最外层语句 */
const STATEMENT_TYPES = new Set([
  'ExpressionStatement',
  'VariableDeclaration',
  'ReturnStatement',
  'IfStatement',
  'WhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
  'ThrowStatement',
  'TryStatement',
  'WithStatement',
  'DebuggerStatement',
  'BreakStatement',
  'ContinueStatement',
  'LabeledStatement',
  'BlockStatement',
  // 类与模块
  'ClassDeclaration',
  'ClassBody',
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
  // TypeScript
  'TSEnumDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSModuleDeclaration',
  'TSModuleBlock',
  // 其他
  'PropertyDefinition',
])

/** 需要递归解包的表达式类型（类型断言、括号、链式表达式等） */
const UNWRAP_TYPES = new Set(['TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression', 'ParenthesizedExpression', 'ChainExpression'])

/** 二元/逻辑表达式类型 */
const BIN_LOGICAL = new Set(['BinaryExpression', 'LogicalExpression'])

/** 模板字符串类型（普通模板字面量和标签模板表达式） */
const TEMPLATE_TYPES = new Set(['TemplateLiteral', 'TaggedTemplateExpression'])

/** 条件块场景中，各语句类型对应的条件属性名 */
const CONDITION_TYPES = new Map<string, string>([
  ['IfStatement', 'test'],
  ['WhileStatement', 'test'],
  ['ForStatement', 'test'],
  ['ForInStatement', 'right'],
  ['ForOfStatement', 'right'],
])

/** for 循环语句类型，用于检测 init 上下文 */
const FOR_INIT_TYPES = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement'])

/** 标识符节点类型（含私有字段） */
const ID_TYPES = new Set(['Identifier', 'PrivateIdentifier'])

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
const unwrapTypeAssertion = (n: ASTNode): ASTNode => (isTypeAssertion(n) ? unwrapTypeAssertion(n.expression as ASTNode) : n)

/**
 * 判断表达式是否包含函数调用（递归检查逻辑/三元/序列等表达式）
 * @param expr AST 表达式节点
 * @returns 是否包含 CallExpression 或 NewExpression
 */
const containsFunctionCall = (expr: ASTNode): boolean => {
  if (!expr) return false
  const u = unwrapTypeAssertion(expr)
  if (u.type === 'CallExpression' || u.type === 'NewExpression') return true
  if (u.type === 'AwaitExpression') return containsFunctionCall(u.argument as ASTNode)
  if (u.type === 'LogicalExpression') return containsFunctionCall(u.left as ASTNode) || containsFunctionCall(u.right as ASTNode)
  if (u.type === 'ConditionalExpression') return containsFunctionCall(u.consequent as ASTNode) || containsFunctionCall(u.alternate as ASTNode)
  if (u.type === 'SequenceExpression') {
    const exprs = u.expressions as ASTNode[] | undefined
    return !!exprs?.length && containsFunctionCall(exprs[exprs.length - 1])
  }
  if (u.type === 'UnaryExpression' || u.type === 'SpreadElement') return containsFunctionCall(u.argument as ASTNode)
  return false
}

/**
 * 获取表达式的最远结束位置（遍历所有子节点取最大 end）
 * @param expr AST 表达式节点
 * @returns 最远子节点的字节偏移量
 */
const getFullExpressionEnd = (expr: ASTNode): number => {
  let maxEnd = expr.end ?? 0
  walkAST(expr, (n) => {
    if (n.end && n.end > maxEnd) maxEnd = n.end
  })
  return maxEnd
}

/* ───────── 行号计算（与 VSCode 行模型一致：\r\n | \r | \n） ───────── */

/** 行起始偏移缓存（同一次 findInsertionLine 调用内会多次复用同一份 code） */
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
const offsetToLine = (code: string, offset: number): number => {
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

/**
 * 获取指定行的原始文本（含行尾换行符），换行规则与 offsetToLine 保持一致
 * @param code 源代码字符串
 * @param lineIndex 行号（0-based）
 * @returns 行文本
 */
const lineTextAt = (code: string, lineIndex: number): string => {
  const starts = getLineStarts(code)
  const start = starts[lineIndex] ?? code.length
  const end = starts[lineIndex + 1] ?? code.length
  return code.slice(start, end)
}

/**
 * 从 loc 中提取行号
 * @param loc 位置信息
 * @param which 取 start 还是 end
 * @returns 行号（0-based）
 */
const lineFromLoc = (loc: NonNullable<ASTNode['loc']>, which: 'start' | 'end'): number => loc[which].line - 1

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
  if (ext === '.vue' || ext === '.html' || ext === '.svelte' || ext === '.astro') {
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
function walkAST(node: ASTNode, cb: (node: ASTNode) => boolean | void): void {
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
 * 构建节点到父节点的映射表
 * @param ast AST 根节点
 * @returns 子节点 → 父节点的 Map
 */
function buildParentMap(ast: ASTNode): Map<ASTNode, ASTNode> {
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
  return map
}

/* ───────── 标识符与模式搜索 ───────── */

/**
 * 创建标识符搜索器，用于在 AST 子树中查找指定名称的标识符
 * 支持 Identifier、PrivateIdentifier 和 MemberExpression 的文本匹配
 * 使用 WeakSet 避免重复访问
 * @param code 源代码字符串
 * @returns 搜索函数，接收节点和名称，返回是否包含匹配
 */
const createIdentifierSearcher = (code: string) => {
  const visited = new WeakSet<ASTNode>()
  const search = (node: ASTNode, name: string): boolean => {
    if (!node || typeof node !== 'object') return false
    if (visited.has(node)) return false
    visited.add(node)
    if (node.type === 'Identifier' && (node as Record<string, unknown>).name === name) return true
    if (node.type === 'PrivateIdentifier') {
      const pname = `#${(node as Record<string, unknown>).name}`
      if (pname === name) return true
    }
    // 成员路径（含 .）按整体文本精确匹配，避免 `token` 误匹配 `this.tokenValue`；
    // 普通标识符由上面的 Identifier 递归覆盖，无需在此按子串匹配
    if (
      name.includes('.') &&
      node.type === 'MemberExpression' &&
      node.start !== undefined &&
      node.end !== undefined &&
      code.slice(node.start, node.end) === name
    )
      return true
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue
      const v = (node as Record<string, unknown>)[key]
      if (Array.isArray(v)) {
        if (v.some((item) => item && typeof item === 'object' && (item as ASTNode).type && search(item as ASTNode, name))) return true
      } else if (v && typeof v === 'object' && (v as ASTNode).type) {
        if (search(v as ASTNode, name)) return true
      }
    }
    return false
  }
  return search
}

/**
 * 在解构模式中查找指定变量名
 * 支持 ObjectPattern、ArrayPattern、AssignmentPattern、RestElement
 * @param pattern 解构模式节点
 * @param name 要查找的变量名
 * @returns 是否在模式中找到该变量
 */
const findVariableInPattern = (pattern: ASTNode, name: string): boolean => {
  if (!pattern) return false
  if (pattern.type === 'Identifier') return (pattern.name as string) === name
  if (pattern.type === 'ObjectPattern')
    return ((pattern.properties as ASTNode[]) ?? []).some((p) =>
      p.type === 'Property'
        ? findVariableInPattern(p.value as ASTNode, name)
        : p.type === 'RestElement'
          ? findVariableInPattern(p.argument as ASTNode, name)
          : false
    )
  if (pattern.type === 'ArrayPattern') return ((pattern.elements as (ASTNode | null)[]) ?? []).some((el) => el && findVariableInPattern(el, name))
  if (pattern.type === 'AssignmentPattern') return findVariableInPattern(pattern.left as ASTNode, name)
  if (pattern.type === 'RestElement') return findVariableInPattern(pattern.argument as ASTNode, name)
  return false
}

/**
 * 从参数节点中提取参数名
 * 支持 Identifier、AssignmentPattern、RestElement、TSParameterProperty
 * @param param 函数参数节点
 * @returns 参数名，无法提取时返回空字符串
 */
const extractParamName = (param: ASTNode): string => {
  if (param.type === 'Identifier') return param.name as string
  if (param.type === 'AssignmentPattern') return extractParamName(param.left as ASTNode)
  if (param.type === 'RestElement') return extractParamName(param.argument as ASTNode)
  if (param.type === 'TSParameterProperty') return extractParamName(param.parameter as ASTNode)
  return ''
}

/* ───────── 返回类型 ───────── */

/**
 * 插入位置结果
 */
export interface InsertionResult {
  /** 插入行号（0-based），-1 表示未匹配 */
  line: number
  /** 箭头函数表达式体转换信息，调用方据此将 expr body 转为 block body */
  arrowBodyTransform?: { declStart: number; exprBodyEnd: number; bodyStart: number }
}

/* ───────── 公共 API ───────── */

/**
 * 根据选中变量名和光标位置，确定 console.log 的最佳插入行号
 * 按优先级依次尝试 16 种场景匹配，首个命中即返回
 * @param code 完整文件内容
 * @param variableName 选中的变量名
 * @param selectionLine 选中行号（0-based）
 * @param fileExtension 文件扩展名
 * @returns 插入位置结果，line 为 -1 时表示未匹配
 */
export function findInsertionLine(code: string, variableName: string, selectionLine: number, fileExtension?: string): InsertionResult {
  // 选区可能带有首尾空白或换行（拖拽/三击选中很常见），统一裁剪后再匹配，
  // 否则精确场景的 `id.name === variableName` 全部失配，会掉进兜底逻辑导致定位错误
  variableName = variableName.trim()
  if (!variableName) return { line: selectionLine + 1 }
  const result = parseCode(code, selectionLine, fileExtension)
  if (!result) return { line: selectionLine + 1 }
  const { ast } = result

  // 16 种场景按优先级排列
  const checks: Array<(ast: ASTNode, code: string, selectionLine: number, variableName: string) => InsertionResult> = [
    checkNamedFunctionAssignment,
    checkFunctionParameter,
    checkObjectFunctionCallAssignment,
    checkFunctionCallAssignment,
    checkPropertyAccessAssignment,
    checkObjectLiteral,
    checkArrayAssignment,
    checkTemplateString,
    checkTernary,
    checkBinaryExpression,
    checkPropertyMethodCall,
    checkRawPropertyAccess,
    checkPrimitiveAssignment,
    checkWithinConditionBlock,
    checkWithinReturnStatement,
    checkWanderingExpression,
  ]

  for (const check of checks) {
    const r = check(ast, code, selectionLine, variableName)
    if (r.line !== -1) return r
  }
  return { line: selectionLine + 1 }
}

/* ────────────────────────────────────────────
   场景 1: 命名函数赋值
   const myFn = function() {} / () => {}
   插入到函数体结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 1：命名函数赋值
 * 匹配 const myFn = function() {} 或 const myFn = () => {} 形式
 * 插入位置为函数体结束行之后
 */
const checkNamedFunctionAssignment = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  /** 根据函数体类型构建插入结果 */
  const makeResult = (fnNode: ASTNode, e: number): InsertionResult => {
    const body = fnNode.body as ASTNode | undefined
    if (!body) return { line: e + 1 }
    if (body.type === 'BlockStatement') {
      return { line: body.end ? offsetToLine(code, body.end) + 1 : e + 1 }
    }
    // 箭头函数表达式体，需要调用方进行转换
    const bodyNode = fnNode.body as ASTNode
    return {
      line: e + 1,
      arrowBodyTransform: { declStart: fnNode.start as number, exprBodyEnd: bodyNode.end as number, bodyStart: bodyNode.start as number },
    }
  }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true

    // 匹配 VariableDeclaration: const myFn = function/arrow
    if (node.type === 'VariableDeclaration') {
      ;((node.declarations as ASTNode[]) ?? []).forEach((decl) => {
        if (result.line !== -1 || decl.type !== 'VariableDeclarator') return
        const id = decl.id as ASTNode | undefined
        if (id?.type !== 'Identifier' || (id.name as string) !== variableName) return
        const init = decl.init as ASTNode | undefined
        if (!init) return
        const u = unwrapTypeAssertion(init)
        if (!FN_LIKE.has(u.type)) return
        const loc = decl.loc
        if (!loc) return
        const s = lineFromLoc(loc, 'start'),
          e = lineFromLoc(loc, 'end')
        if (selectionLine < s || selectionLine > e) return
        result = makeResult(u, e)
      })
      return
    }

    // 匹配 ExpressionStatement: myFn = function/arrow
    if (node.type !== 'ExpressionStatement') return
    const expr = node.expression as ASTNode | undefined
    if (!expr) return
    const u = unwrapTypeAssertion(expr)
    if (u.type !== 'AssignmentExpression') return
    const left = u.left as ASTNode | undefined
    if (!left) return
    const lname =
      left.type === 'Identifier'
        ? (left.name as string)
        : left.type === 'MemberExpression'
          ? (left.property as ASTNode | undefined)?.type === 'Identifier'
            ? ((left.property as ASTNode).name as string)
            : ''
          : ''
    if (lname !== variableName) return
    const right = u.right as ASTNode | undefined
    if (!right) return
    const ru = unwrapTypeAssertion(right)
    if (!FN_LIKE.has(ru.type)) return
    const loc = node.loc
    if (!loc) return
    const s = lineFromLoc(loc, 'start'),
      e = lineFromLoc(loc, 'end')
    if (selectionLine < s || selectionLine > e) return
    result = makeResult(ru, e)
  })

  return result
}

/* ────────────────────────────────────────────
   场景 2: 函数参数
   function greet(name) {}  → log 插入函数体内
   支持 TSParameterProperty 和解构参数
   ──────────────────────────────────────────── */

/**
 * 场景 2：函数参数
 * 匹配 function greet(name) {} 形式，选中参数名时插入函数体内部
 * 支持普通参数、默认参数、剩余参数、TS 参数属性和解构参数
 */
const checkFunctionParameter = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  /** 检查参数是否包含目标变量名（支持直接名称和解构模式） */
  const paramContainsName = (param: ASTNode): boolean => extractParamName(param) === variableName || findVariableInPattern(param, variableName)

  /** 根据函数体类型确定插入行号 */
  const handleFunctionNode = (node: ASTNode, body: ASTNode | undefined, nodeStartLine: number): boolean | void => {
    if (body?.type === 'BlockStatement') {
      // 处理空函数体 {}：大括号在行尾时插入下一行，否则插入当前行
      const braceLine = offsetToLine(code, body.start)
      const text = lineTextAt(code, braceLine)
      result = { line: text.trim().endsWith('{') ? braceLine + 1 : braceLine }
    } else if (body?.loc) {
      // 表达式体：插入到表达式结束之后
      result = { line: lineFromLoc(body.loc, 'end') + 1 }
    } else {
      result = { line: nodeStartLine + 1 }
    }
    return true
  }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true

    // 普通函数声明/函数表达式/箭头函数
    if (FN_LIKE.has(node.type)) {
      const params = (node.params as ASTNode[] | undefined) ?? []
      const loc = node.loc
      if (!loc) return
      const ns = lineFromLoc(loc, 'start'),
        ne = lineFromLoc(loc, 'end')
      if (selectionLine < ns || selectionLine > ne) return
      if (params.some(paramContainsName)) {
        return handleFunctionNode(node, node.body as ASTNode | undefined, ns)
      }
    }

    // 类方法定义
    if (node.type === 'MethodDefinition') {
      const value = node.value as ASTNode | undefined
      if (!value) return
      const params = (value.params as ASTNode[] | undefined) ?? []
      const loc = node.loc
      if (!loc) return
      const ns = lineFromLoc(loc, 'start'),
        ne = lineFromLoc(loc, 'end')
      if (selectionLine < ns || selectionLine > ne) return
      if (params.some(paramContainsName)) {
        return handleFunctionNode(node, value.body as ASTNode | undefined, ns)
      }
    }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 3: 对象方法调用赋值
   const result = obj.method()
   const { data } = obj.method()
   插入到整个表达式结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 3：对象方法调用赋值
 * 匹配 const result = obj.method() 和 const { data } = obj.method() 形式
 * 同时处理 ExpressionStatement 赋值：obj[key] = obj[key].replace(...)
 * 插入位置为整个表达式结束行之后
 */
const checkObjectFunctionCallAssignment = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  /** 检查 VariableDeclarator 是否匹配 */
  const matchDeclarator = (decl: ASTNode): boolean => {
    if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
    const id = decl.id as ASTNode | undefined
    if (!id) return false
    const name =
      id.type === 'Identifier'
        ? (id.name as string)
        : (id.type === 'ObjectPattern' || id.type === 'ArrayPattern') && findVariableInPattern(id, variableName)
          ? variableName
          : ''
    if (name !== variableName) return false
    const init = decl.init as ASTNode | undefined
    if (!init) return false
    const u = unwrapTypeAssertion(init)
    if (!containsFunctionCall(u)) return false
    const loc = decl.loc
    if (!loc) return false
    const s = lineFromLoc(loc, 'start'),
      e = lineFromLoc(loc, 'end')
    if (selectionLine < s || selectionLine > e) return false
    result = { line: offsetToLine(code, getFullExpressionEnd(u)) + 1 }
    return true
  }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true

    if (node.type === 'VariableDeclaration') {
      ;((node.declarations as ASTNode[]) ?? []).some(matchDeclarator)
      return
    }

    // ExpressionStatement: obj[key] = obj[key].replace(...)
    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as ASTNode | undefined
      if (!expr) return
      const u = unwrapTypeAssertion(expr)
      if (u.type !== 'AssignmentExpression') return
      const left = u.left as ASTNode | undefined
      if (!left) return
      const lname = left.type === 'Identifier' ? (left.name as string) : left.type === 'MemberExpression' ? code.slice(left.start, left.end) : ''
      if (lname !== variableName && code.slice(left.start, left.end) !== variableName) return
      const right = u.right as ASTNode | undefined
      if (!right) return
      const ru = unwrapTypeAssertion(right)
      if (!containsFunctionCall(ru)) return
      const loc = node.loc
      if (!loc) return
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return
      result = { line: offsetToLine(code, getFullExpressionEnd(u)) + 1 }
    }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 4: 函数调用赋值
   const result = doSomething()
   const result = await fetch()
   插入到整个表达式结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 4：函数调用赋值（不含对象方法调用）
 * 匹配 const result = doSomething() 和 const result = await fetch() 形式
 * 同时支持 class field: protected config = new Foo()
 * 插入位置为整个表达式结束行之后
 */
const checkFunctionCallAssignment = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true

    // 普通变量声明: const result = doSomething()
    if (node.type === 'VariableDeclaration') {
      ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
        if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
        const id = decl.id as ASTNode | undefined
        if (id?.type !== 'Identifier' || (id.name as string) !== variableName) return false
        const init = decl.init as ASTNode | undefined
        if (!init) return false
        const u = unwrapTypeAssertion(init)
        if (!containsFunctionCall(u)) return false
        const loc = decl.loc
        if (!loc) return false
        const s = lineFromLoc(loc, 'start'),
          e = lineFromLoc(loc, 'end')
        if (selectionLine < s || selectionLine > e) return false
        result = { line: offsetToLine(code, getFullExpressionEnd(u)) + 1 }
        return true
      })
      return
    }

    // Class field: protected config = new Foo()
    if (node.type === 'PropertyDefinition') {
      const key = (node as Record<string, unknown>).key as ASTNode | undefined
      if (key?.type !== 'Identifier' || (key.name as string) !== variableName) return
      const value = (node as Record<string, unknown>).value as ASTNode | undefined
      if (!value) return
      const u = unwrapTypeAssertion(value)
      if (!containsFunctionCall(u)) return
      const loc = node.loc
      if (!loc) return
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return
      result = { line: offsetToLine(code, getFullExpressionEnd(u)) + 1 }
    }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 5: 属性访问赋值
   const value = obj.prop
   插入到声明语句结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 5：属性访问赋值
 * 匹配 const value = obj.prop 形式
 * 插入位置为声明语句结束行之后
 */
const checkPropertyAccessAssignment = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'VariableDeclaration') return

    ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
      if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
      const id = decl.id as ASTNode | undefined
      if (id?.type !== 'Identifier' || (id.name as string) !== variableName) return false
      const init = decl.init as ASTNode | undefined
      if (!init) return false
      if (unwrapTypeAssertion(init).type !== 'MemberExpression') return false
      const loc = decl.loc
      if (!loc) return false
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return false
      result = { line: e + 1 }
      return true
    })
  })

  return result
}

/* ────────────────────────────────────────────
   场景 6: 对象字面量
   const config = { key: value }
   插入到对象字面量结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 6：对象字面量赋值
 * 匹配 const config = { key: value } 形式
 * 插入位置为对象字面量结束行之后
 */
const checkObjectLiteral = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'VariableDeclaration') return

    ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
      if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
      const id = decl.id as ASTNode | undefined
      if (id?.type !== 'Identifier' || (id.name as string) !== variableName) return false
      const init = decl.init as ASTNode | undefined
      if (!init) return false
      const u = unwrapTypeAssertion(init)
      if (u.type !== 'ObjectExpression') return false
      const loc = decl.loc
      if (!loc) return false
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return false
      result = { line: u.loc ? lineFromLoc(u.loc, 'end') + 1 : e + 1 }
      return true
    })
  })

  return result
}

/* ────────────────────────────────────────────
   场景 7: 数组赋值
   const items = [1, 2, 3]
   插入到数组字面量结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 7：数组赋值
 * 匹配 const items = [1, 2, 3] 形式，支持解构赋值
 * 插入位置为数组字面量结束行之后
 */
const checkArrayAssignment = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'VariableDeclaration') return

    ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
      if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
      const id = decl.id as ASTNode | undefined
      if (!id) return false
      const name = id.type === 'Identifier' ? (id.name as string) : id.type === 'ArrayPattern' && findVariableInPattern(id, variableName) ? variableName : ''
      if (name !== variableName) return false
      const init = decl.init as ASTNode | undefined
      if (!init) return false
      if (unwrapTypeAssertion(init).type !== 'ArrayExpression') return false
      const loc = decl.loc
      if (!loc) return false
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return false
      const u = unwrapTypeAssertion(init)
      result = { line: u.loc ? lineFromLoc(u.loc, 'end') + 1 : e + 1 }
      return true
    })
  })

  return result
}

/* ────────────────────────────────────────────
   场景 8: 模板字符串
   const msg = `Hello ${name}`
   const msg = html`<div>${name}</div>`
   插入到模板字符串结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 8：模板字符串赋值
 * 匹配 const msg = `Hello ${name}` 和 const msg = html`<div/>` 形式
 * 插入位置为模板字符串结束行之后
 */
const checkTemplateString = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'VariableDeclaration') return

    ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
      if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
      const id = decl.id as ASTNode | undefined
      if (id?.type !== 'Identifier' || (id.name as string) !== variableName) return false
      const init = decl.init as ASTNode | undefined
      if (!init) return false
      const u = unwrapTypeAssertion(init)
      if (!TEMPLATE_TYPES.has(u.type)) return false
      const loc = decl.loc
      if (!loc) return false
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return false
      // 标签模板表达式使用 quasi 的位置
      const templateNode = u.type === 'TaggedTemplateExpression' ? (u.quasi as ASTNode) : u
      result = { line: templateNode.loc ? lineFromLoc(templateNode.loc, 'end') + 1 : e + 1 }
      return true
    })
  })

  return result
}

/* ────────────────────────────────────────────
   场景 9: 三元表达式
   const x = condition ? a : b
   const { a = cond ? x : y } = obj
   插入到三元表达式结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 9：三元表达式赋值
 * 匹配 const x = condition ? a : b 形式
 * 同时支持解构默认值中的三元：const [x = ternary] = arr
 * 插入位置为三元表达式结束行之后
 */
const checkTernary = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  /** 检查表达式是否为三元表达式 */
  const hasTernary = (node: ASTNode): boolean => {
    const u = unwrapTypeAssertion(node)
    return u.type === 'ConditionalExpression'
  }

  /** 在解构模式中查找包含三元表达式的默认值 */
  const findTernaryInPattern = (pattern: ASTNode): boolean => {
    if (!pattern) return false
    if (pattern.type === 'AssignmentPattern') return hasTernary(pattern.right as ASTNode)
    if (pattern.type === 'ObjectPattern')
      return ((pattern.properties as ASTNode[]) ?? []).some((p) => (p.type === 'Property' ? findTernaryInPattern(p.value as ASTNode) : false))
    if (pattern.type === 'ArrayPattern') return ((pattern.elements as (ASTNode | null)[]) ?? []).some((el) => (el ? findTernaryInPattern(el) : false))
    return false
  }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'VariableDeclaration') return

    ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
      if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
      const id = decl.id as ASTNode | undefined
      if (!id) return false
      const name =
        id.type === 'Identifier'
          ? (id.name as string)
          : (id.type === 'ArrayPattern' || id.type === 'ObjectPattern') && findVariableInPattern(id, variableName)
            ? variableName
            : id.type === 'AssignmentPattern' || id.type === 'ObjectPattern' || id.type === 'ArrayPattern'
              ? findVariableInPattern(id, variableName)
                ? variableName
                : ''
              : ''
      if (name !== variableName) return false
      const init = decl.init as ASTNode | undefined
      if (!init) return false
      const u = unwrapTypeAssertion(init)
      // 直接三元: const x = cond ? a : b
      const isTernary = u.type === 'ConditionalExpression'
      // 解构默认值中的三元: const [x = ternary] = arr
      const isDestructuringDefault = !isTernary && id.type !== 'Identifier' && findTernaryInPattern(id)
      if (!isTernary && !isDestructuringDefault) return false
      const loc = decl.loc
      if (!loc) return false
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return false
      const ternaryNode = isTernary ? u : init
      result = { line: ternaryNode.loc ? lineFromLoc(ternaryNode.loc, 'end') + 1 : e + 1 }
      return true
    })
  })

  return result
}

/* ────────────────────────────────────────────
   场景 10: 二元/逻辑表达式
   const sum = a + b
   total = a + b
   插入到表达式结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 10：二元/逻辑表达式赋值
 * 匹配 const sum = a + b 和 total = a + b 形式
 * 支持解构赋值：const { total } = a + b
 * 插入位置为声明语句结束行之后
 */
const checkBinaryExpression = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true

    // 变量声明: const sum = a + b
    if (node.type === 'VariableDeclaration') {
      ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
        if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
        const id = decl.id as ASTNode | undefined
        if (!id) return false
        const name =
          id.type === 'Identifier'
            ? (id.name as string)
            : (id.type === 'ObjectPattern' || id.type === 'ArrayPattern') && findVariableInPattern(id, variableName)
              ? variableName
              : ''
        if (name !== variableName) return false
        const init = decl.init as ASTNode | undefined
        if (!init) return false
        if (!BIN_LOGICAL.has(unwrapTypeAssertion(init).type)) return false
        const loc = decl.loc
        if (!loc) return false
        const s = lineFromLoc(loc, 'start'),
          e = lineFromLoc(loc, 'end')
        if (selectionLine < s || selectionLine > e) return false
        result = { line: e + 1 }
        return true
      })
      return
    }

    // 赋值表达式: total = a + b
    if (node.type !== 'ExpressionStatement') return
    const expr = node.expression as ASTNode | undefined
    if (!expr) return
    const u = unwrapTypeAssertion(expr)
    if (u.type !== 'AssignmentExpression') return
    const left = u.left as ASTNode | undefined
    if (!left) return
    const lname =
      left.type === 'Identifier'
        ? (left.name as string)
        : left.type === 'MemberExpression'
          ? (left.property as ASTNode | undefined)?.type === 'Identifier'
            ? ((left.property as ASTNode).name as string)
            : ''
          : ''
    if (lname !== variableName) return
    const right = u.right as ASTNode | undefined
    if (!right) return
    if (!BIN_LOGICAL.has(unwrapTypeAssertion(right).type)) return
    const loc = node.loc
    if (!loc) return
    const s = lineFromLoc(loc, 'start'),
      e = lineFromLoc(loc, 'end')
    if (selectionLine < s || selectionLine > e) return
    result = { line: e + 1 }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 11: 属性方法调用
   obj.method()  → 选中 obj → 插入到 method() 后
   排除 return 上下文（由场景 15 处理）
   ──────────────────────────────────────────── */

/**
 * 场景 11：属性方法调用
 * 匹配 obj.method() 形式，选中 obj 时插入到整个调用之后
 * 排除 return 上下文（由场景 15 处理）
 */
const checkPropertyMethodCall = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }
  const parentMap = buildParentMap(ast)

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'CallExpression') return
    const callee = (node as Record<string, unknown>).callee as ASTNode | undefined
    if (callee?.type !== 'MemberExpression') return
    const object = (callee as Record<string, unknown>).object as ASTNode | undefined
    if (!object || object.start === undefined || object.end === undefined) return
    if (code.slice(object.start, object.end) !== variableName) return
    const os = offsetToLine(code, object.start),
      oe = offsetToLine(code, object.end)
    if (selectionLine < os || selectionLine > oe) return
    // 排除 return 语句上下文
    let cur: ASTNode | undefined = node
    while (cur) {
      if (cur.type === 'ReturnStatement') return
      cur = parentMap.get(cur)
    }
    if (node.end !== undefined) result = { line: offsetToLine(code, node.end) + 1 }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 12: 原始属性访问
   const obj = { name: 'value' }  选中 name
   插入到包含该属性的声明语句结束行之后
   ──────────────────────────────────────────── */

/**
 * 场景 12：原始属性访问（对象字面量 key）
 * 匹配 const obj = { name: 'value' } 中选中 name 的场景
 * 向上查找包含该属性的 VariableDeclaration
 */
const checkRawPropertyAccess = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  const wanted = variableName.trim()
  if (!wanted) return { line: -1 }

  // 收集选中行上所有匹配的 Property key
  const props: ASTNode[] = []
  walkAST(ast, (node) => {
    if (node.type !== 'Property') return
    const key = (node as Record<string, unknown>).key as ASTNode | undefined
    if (key?.type !== 'Identifier' || (key.name as string) !== wanted) return
    if (key.start === undefined || offsetToLine(code, key.start) !== selectionLine) return
    props.push(node)
  })

  if (!props.length) return { line: -1 }

  // 向上查找包含属性的 VariableDeclaration
  const parentMap = buildParentMap(ast)
  for (const prop of props) {
    let cur: ASTNode | undefined = prop
    while ((cur = parentMap.get(cur))) {
      if (cur.type === 'VariableDeclaration' && cur.start !== undefined && cur.end !== undefined) {
        return { line: offsetToLine(code, cur.end) + 1 }
      }
    }
  }

  return { line: -1 }
}

/* ────────────────────────────────────────────
   场景 13: 基本类型赋值
   const x = 42
   for (let i = 0; ...)
   插入到声明语句结束行之后（for 循环插入到循环体内）
   ──────────────────────────────────────────── */

/**
 * 场景 13：基本类型赋值（兜底声明场景）
 * 匹配 const x = 42、赋值表达式 x = 1 等形式
 * for 循环的 init 声明会特殊处理，插入到循环体内部
 */
const checkPrimitiveAssignment = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }
  const parentMap = buildParentMap(ast)

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true

    if (node.type === 'VariableDeclaration') {
      ;((node.declarations as ASTNode[]) ?? []).some((decl) => {
        if (result.line !== -1 || decl.type !== 'VariableDeclarator') return false
        const id = decl.id as ASTNode | undefined
        if (id?.type !== 'Identifier' || (id.name as string) !== variableName) return false
        const loc = decl.loc
        if (!loc) return false
        const s = lineFromLoc(loc, 'start'),
          e = lineFromLoc(loc, 'end')
        if (selectionLine < s || selectionLine > e) return false
        // for 循环 init 上下文：插入到循环体内部
        const parent = parentMap.get(node)
        if (parent && FOR_INIT_TYPES.has(parent.type)) {
          const body = (parent as Record<string, unknown>).body as ASTNode | undefined
          if (body?.type === 'BlockStatement') {
            const braceLine = offsetToLine(code, body.start)
            const text = lineTextAt(code, braceLine)
            result = { line: text.trim().endsWith('{') ? braceLine + 1 : braceLine }
          } else if (body?.loc) {
            result = { line: lineFromLoc(body.loc, 'end') + 1 }
          } else {
            result = { line: e + 1 }
          }
        } else {
          result = { line: e + 1 }
        }
        return true
      })
      return
    }

    // 赋值表达式: x = 1
    if (node.type !== 'ExpressionStatement') return
    const expr = node.expression as ASTNode | undefined
    if (!expr) return
    const u = unwrapTypeAssertion(expr)
    if (u.type !== 'AssignmentExpression') return
    const left = u.left as ASTNode | undefined
    if (!left) return
    const lname =
      left.type === 'Identifier'
        ? (left.name as string)
        : left.type === 'MemberExpression'
          ? (left.property as ASTNode | undefined)?.type === 'Identifier'
            ? ((left.property as ASTNode).name as string)
            : ''
          : ''
    if (lname !== variableName) return
    const loc = node.loc
    if (!loc) return
    const s = lineFromLoc(loc, 'start'),
      e = lineFromLoc(loc, 'end')
    if (selectionLine < s || selectionLine > e) return
    result = { line: e + 1 }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 14: 条件块内
   if (variable) {}  选中 variable → 插入到条件语句之前
   ──────────────────────────────────────────── */

/**
 * 场景 14：条件块内
 * 匹配 if (variable)、while (variable)、for (...variable...) 等形式
 * 选中条件中的变量时，插入到条件语句之前
 */
const checkWithinConditionBlock = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }
  const hasRef = createIdentifierSearcher(code)
  const wanted = variableName.trim()

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    const childKey = CONDITION_TYPES.get(node.type)
    if (!childKey) return
    const condition = (node as Record<string, unknown>)[childKey] as ASTNode | undefined
    if (!condition || condition.start === undefined || condition.end === undefined) return
    const cs = offsetToLine(code, condition.start),
      ce = offsetToLine(code, condition.end)
    if (selectionLine < cs || selectionLine > ce) return
    if (!hasRef(condition, wanted)) return
    result = { line: node.loc ? lineFromLoc(node.loc, 'start') : selectionLine }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 15: return 语句内
   return variableName  → 插入到 return 语句之前
   ──────────────────────────────────────────── */

/**
 * 场景 15：return 语句内
 * 匹配 return variableName 形式，选中返回值中的变量时
 * 插入到 return 语句之前
 */
const checkWithinReturnStatement = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }
  const hasRef = createIdentifierSearcher(code)
  const wanted = variableName.trim()
  const parentMap = buildParentMap(ast)

  // 找到选中行上的匹配节点，用于判断是否嵌套在 return 内的回调中
  // 需同时覆盖标识符（如 token）与成员表达式（如 this.token / obj.prop），
  // 与 hasRef 的匹配方式保持一致，避免成员表达式被漏判导致误命中 return 场景
  const selectionNodes: ASTNode[] = []
  walkAST(ast, (node) => {
    let matched = false
    if (ID_TYPES.has(node.type)) {
      const name = node.type === 'PrivateIdentifier' ? `#${(node as Record<string, unknown>).name}` : (node as Record<string, unknown>).name
      matched = name === wanted
    } else if (node.type === 'MemberExpression' && node.start !== undefined && node.end !== undefined) {
      matched = code.slice(node.start, node.end) === wanted
    }
    if (!matched) return
    if (node.start === undefined || node.end === undefined) return
    const sl = offsetToLine(code, node.start)
    const el = offsetToLine(code, node.end)
    if (selectionLine >= sl && selectionLine <= el) selectionNodes.push(node)
  })

  walkAST(ast, (node): boolean | void => {
    if (result.line !== -1) return true
    if (node.type !== 'ReturnStatement') return
    const arg = (node as Record<string, unknown>).argument as ASTNode | undefined
    if (!arg) return
    const loc = node.loc
    if (!loc) return
    const s = lineFromLoc(loc, 'start'),
      e = lineFromLoc(loc, 'end')
    if (selectionLine < s || selectionLine > e) return
    if (!hasRef(arg, wanted)) return

    // 关键修复：如果选中节点嵌套在 return 参数内的回调/函数中，
    // 说明选中节点属于内部作用域，不应由 return 场景处理
    for (const selNode of selectionNodes) {
      let cur: ASTNode | undefined = parentMap.get(selNode)
      while (cur && cur !== node) {
        if (FN_LIKE.has(cur.type)) return // 选中节点在回调内，跳过
        cur = parentMap.get(cur)
      }
    }

    result = { line: s }
  })

  return result
}

/* ────────────────────────────────────────────
   场景 16: 游离表达式（兜底）
   匹配任意未被前 15 种场景覆盖的标识符
   向上查找最近的语句节点，插入到该语句之前
   ──────────────────────────────────────────── */

/**
 * 场景 16：游离表达式（兜底场景）
 * 匹配任意未被前 15 种场景覆盖的标识符引用
 * 向上查找最近的语句节点，插入到该语句之前
 * 支持 Identifier 和 PrivateIdentifier
 */
const checkWanderingExpression = (ast: ASTNode, code: string, selectionLine: number, variableName: string): InsertionResult => {
  let result: InsertionResult = { line: -1 }
  const hasRef = createIdentifierSearcher(code)
  const wanted = variableName.trim()

  // 收集选中行上所有匹配的标识符节点
  const candidates: ASTNode[] = []
  walkAST(ast, (node) => {
    if (!ID_TYPES.has(node.type)) return
    const name = node.type === 'PrivateIdentifier' ? `#${(node as Record<string, unknown>).name}` : (node as Record<string, unknown>).name
    if (name !== wanted) return
    if (node.start === undefined || node.end === undefined) return
    const sl = offsetToLine(code, node.start),
      el = offsetToLine(code, node.end)
    if (selectionLine >= sl && selectionLine <= el) candidates.push(node)
  })
  if (!candidates.length) return result

  const parentMap = buildParentMap(ast)

  for (const candidate of candidates) {
    const p = parentMap.get(candidate)
    if (!p) continue
    // 跳过：变量声明的左值（声明名称）
    if (p.type === 'VariableDeclarator' && (p as Record<string, unknown>).id === candidate) continue
    // 跳过：函数参数
    if (FN_LIKE.has(p.type) && (p.params as ASTNode[] | undefined)?.includes(candidate)) continue
    if (p.type === 'MethodDefinition') {
      const value = p.value as ASTNode | undefined
      if (value && FN_LIKE.has(value.type) && (value.params as ASTNode[] | undefined)?.includes(candidate)) continue
    }
    // 跳过：Property key（但 shorthand 解构除外，因为 key === value 共享同一节点）
    if (p.type === 'Property' && (p as Record<string, unknown>).key === candidate) {
      const isShorthand = (p as Record<string, unknown>).shorthand === true
      if (!isShorthand) continue
    }
    // 跳过：PropertyDefinition key
    if (p.type === 'PropertyDefinition' && (p as Record<string, unknown>).key === candidate) continue
    // 跳过：ImportSpecifier local
    if (p.type === 'ImportSpecifier' && (p as Record<string, unknown>).local === candidate) continue
    // 跳过：TypeScript 枚举成员 / 接口属性 key（类型声明，非运行时引用）
    if (p.type === 'TSEnumMember' && (p as Record<string, unknown>).key === candidate) continue
    if (p.type === 'TSPropertySignature' && (p as Record<string, unknown>).key === candidate) continue

    // 向上爬到最近的语句节点
    let cur: ASTNode | undefined = candidate
    let stmt: ASTNode = candidate
    while (cur) {
      stmt = cur
      if (STATEMENT_TYPES.has(cur.type)) break
      cur = parentMap.get(cur)
    }

    const stmtStart = offsetToLine(code, stmt.start),
      stmtEnd = offsetToLine(code, stmt.end)
    const line = stmtStart < stmtEnd ? stmtStart : stmtEnd + 1

    if (result.line === -1 || (stmt.end ?? 0) > 0) result = { line }
  }

  // 兜底：ExpressionStatement 匹配
  if (result.line === -1) {
    walkAST(ast, (node): boolean | void => {
      if (result.line !== -1) return true
      if (node.type !== 'ExpressionStatement') return
      const expr = node.expression as ASTNode | undefined
      if (!expr) return
      const loc = node.loc
      if (!loc) return
      const s = lineFromLoc(loc, 'start'),
        e = lineFromLoc(loc, 'end')
      if (selectionLine < s || selectionLine > e) return
      if (!hasRef(expr, wanted)) return
      result = { line: e + 1 }
    })
  }

  return result
}

/* ───────── 行缩进工具 ───────── */

/**
 * 获取指定行的缩进前缀（空格或制表符）
 * @param lineText 行文本
 * @returns 缩进字符串
 */
export const getLineIndent = (lineText: string): string => lineText.match(/^(\s*)/)?.[1] ?? ''
