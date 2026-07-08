/**
 * AST 解析模块
 * 使用 acorn 解析代码，确定 console.log 的正确插入位置
 * 支持 Vue、HTML、Svelte、JSX/TSX 等文件的 script 提取
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
 * 脚本提取结果
 */
interface ExtractedScript {
  scriptContent: string
  lineOffset: number
  byteOffset: number
}

/**
 * 从 Vue SFC 中提取 script 内容
 * @param sourceCode 源代码
 * @param selectionLine 选中行（0-based）
 * @returns 提取结果，如果未找到则返回 null
 */
function extractVueScript(sourceCode: string, selectionLine?: number): ExtractedScript | null {
  const scriptTagRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
  const allMatches: Array<{
    fullMatch: string
    scriptContent: string
    startIndex: number
    startLine: number
    endLine: number
  }> = []

  let match
  while ((match = scriptTagRegex.exec(sourceCode)) !== null) {
    const fullMatch = match[0]
    const scriptContent = match[1]
    const startIndex = match.index

    const beforeScript = sourceCode.substring(0, startIndex)
    const startLineOfTag = beforeScript.split('\n').length - 1

    const openingTag = fullMatch.substring(0, fullMatch.indexOf('>') + 1)
    const openingTagLines = openingTag.split('\n').length - 1
    const startLineOfContent = startLineOfTag + openingTagLines

    const endLineOfContent = startLineOfContent + scriptContent.split('\n').length - 1

    allMatches.push({
      fullMatch,
      scriptContent,
      startIndex,
      startLine: startLineOfContent,
      endLine: endLineOfContent,
    })
  }

  if (allMatches.length === 0) {
    return null
  }

  let selectedMatch = allMatches[0]
  if (selectionLine !== undefined) {
    const matchContainingLine = allMatches.find(
      (m) => selectionLine >= m.startLine && selectionLine <= m.endLine
    )
    if (matchContainingLine) {
      selectedMatch = matchContainingLine
    } else {
      return null
    }
  }

  const beforeScript = sourceCode.substring(0, selectedMatch.startIndex)
  const lineOffset = beforeScript.split('\n').length - 1

  const openingTag = selectedMatch.fullMatch.substring(
    0,
    selectedMatch.fullMatch.indexOf('>') + 1
  )
  const openingTagLines = openingTag.split('\n').length - 1

  const byteOffset = selectedMatch.startIndex + openingTag.length

  return {
    scriptContent: selectedMatch.scriptContent,
    lineOffset: lineOffset + openingTagLines,
    byteOffset,
  }
}

/**
 * 调整 AST 位置
 * @param node AST 节点
 * @param lineOffset 行偏移量
 * @param byteOffset 字节偏移量
 * @returns 调整后的 AST 节点
 */
function adjustASTLocations(node: ASTNode, lineOffset: number, byteOffset: number): ASTNode {
  if (typeof node.start === 'number') {
    node.start = node.start + byteOffset
  }
  if (typeof node.end === 'number') {
    node.end = node.end + byteOffset
  }

  if (node.loc) {
    node.loc = {
      start: {
        line: node.loc.start.line + lineOffset,
        column: node.loc.start.column,
      },
      end: {
        line: node.loc.end.line + lineOffset,
        column: node.loc.end.column,
      },
    }
  }

  for (const key in node) {
    const value = (node as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in item) {
          adjustASTLocations(item as ASTNode, lineOffset, byteOffset)
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      adjustASTLocations(value as ASTNode, lineOffset, byteOffset)
    }
  }

  return node
}

/**
 * 解析代码生成 AST
 * @param code 源代码
 * @param selectionLine 选中行（0-based）
 * @param fileExtension 文件扩展名
 * @returns AST 节点
 */
export function parseCode(code: string, selectionLine: number, fileExtension?: string): { ast: ASTNode; lineOffset: number } | null {
  let codeToParse = code
  let lineOffset = 0
  let byteOffset = 0

  const ext = fileExtension?.toLowerCase()

  // 处理 Vue 文件
  if (ext === '.vue') {
    const extracted = extractVueScript(code, selectionLine)
    if (!extracted) {
      return null
    }
    codeToParse = extracted.scriptContent
    lineOffset = extracted.lineOffset
    byteOffset = extracted.byteOffset
  }
  // 处理 HTML 文件
  else if (ext === '.html') {
    const extracted = extractVueScript(code, selectionLine)
    if (!extracted) {
      return null
    }
    codeToParse = extracted.scriptContent
    lineOffset = extracted.lineOffset
    byteOffset = extracted.byteOffset
  }

  // JSX/TSX 文件需要使用 JSX 支持
  const needsJsx = ext === '.jsx' || ext === '.tsx'

  try {
    // 使用 @sveltejs/acorn-typescript 插件，支持 JSX
    const parser = acorn.Parser.extend(tsPlugin({ jsx: needsJsx })) as any
    let ast = parser.parse(codeToParse, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    }) as ASTNode

    // 调整 AST 位置
    if (lineOffset > 0 || byteOffset > 0) {
      ast = adjustASTLocations(ast, lineOffset, byteOffset)
    }

    return { ast, lineOffset }
  } catch {
    // 解析失败时返回 null
    return null
  }
}

/**
 * 遍历 AST 节点
 * @param node AST 节点
 * @param callback 回调函数，返回 true 停止遍历
 */
function walkAST(node: ASTNode, callback: (node: ASTNode) => boolean | void): void {
  if (!node || typeof node !== 'object') {
    return
  }

  if (callback(node) === true) {
    return
  }

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') {
      continue
    }

    const value = node[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && item.type) {
          walkAST(item as ASTNode, callback)
        }
      }
    } else if (value && typeof value === 'object' && (value as ASTNode).type) {
      walkAST(value as ASTNode, callback)
    }
  }
}

/**
 * 检查表达式是否包含函数调用
 * @param expr 表达式节点
 * @returns 是否包含函数调用
 */
function containsFunctionCall(expr: ASTNode): boolean {
  if (!expr) return false

  if (expr.type === 'CallExpression' || expr.type === 'NewExpression') {
    return true
  }

  if (expr.type === 'AwaitExpression') {
    return containsFunctionCall(expr.argument as ASTNode)
  }

  if (expr.type === 'LogicalExpression') {
    return containsFunctionCall(expr.left as ASTNode) || containsFunctionCall(expr.right as ASTNode)
  }

  if (expr.type === 'TSAsExpression' || expr.type === 'TSTypeAssertion' || expr.type === 'ParenthesizedExpression') {
    return containsFunctionCall(expr.expression as ASTNode)
  }

  return false
}

/**
 * 获取完整表达式的结束位置
 * @param expr 表达式节点
 * @returns 结束位置（字节偏移）
 */
function getFullExpressionEnd(expr: ASTNode): number {
  let maxEnd = expr.end || 0

  walkAST(expr, (node: ASTNode) => {
    if (node.end && node.end > maxEnd) {
      maxEnd = node.end
    }
  })

  return maxEnd
}

/**
 * 查找变量声明的结束行
 * @param code 源代码
 * @param variableName 变量名
 * @param selectionLine 选中行（0-based）
 * @param fileExtension 文件扩展名
 * @returns 插入行号（0-based），如果未找到返回 -1
 */
export function findInsertionLine(code: string, variableName: string, selectionLine: number, fileExtension?: string): number {
  const result = parseCode(code, selectionLine, fileExtension)

  if (!result) {
    return selectionLine + 1
  }

  const { ast } = result
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    // 处理变量声明
    if (node.type === 'VariableDeclaration') {
      const declarations = node.declarations as ASTNode[] | undefined
      if (!declarations) return

      for (const decl of declarations) {
        if (decl.type !== 'VariableDeclarator') continue

        const id = decl.id as ASTNode | undefined
        if (!id || id.type !== 'Identifier') continue

        const name = id.name as string
        if (name !== variableName) continue

        const init = decl.init as ASTNode | undefined
        if (!init) continue

        const declLoc = decl.loc
        if (!declLoc) continue

        const declStartLine = declLoc.start.line - 1
        const declEndLine = declLoc.end.line - 1

        if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
          // 如果初始化表达式包含函数调用，使用字节偏移计算结束位置
          if (containsFunctionCall(init)) {
            const targetEnd = getFullExpressionEnd(init)
            // 将字节偏移转换为行号
            const endPosition = code.substring(0, targetEnd).split('\n')
            insertionLine = endPosition.length
            return true
          }

          // 根据初始化表达式类型确定插入位置
          insertionLine = getInsertionLineForInit(init, declEndLine)
          return true
        }
      }
    }

    // 处理函数声明
    if (node.type === 'FunctionDeclaration') {
      const id = node.id as ASTNode | undefined
      if (!id || id.type !== 'Identifier') return

      const name = id.name as string
      if (name !== variableName) return

      const funcLoc = node.loc
      if (!funcLoc) return

      const funcEndLine = funcLoc.end.line - 1
      if (selectionLine >= funcLoc.start.line - 1 && selectionLine <= funcEndLine) {
        insertionLine = funcEndLine + 1
        return true
      }
    }

    // 处理函数表达式赋值
    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as ASTNode | undefined
      if (!expr) return

      if (expr.type === 'AssignmentExpression') {
        const left = expr.left as ASTNode | undefined
        if (!left) return

        let name = ''
        if (left.type === 'Identifier') {
          name = left.name as string
        } else if (left.type === 'MemberExpression') {
          const property = left.property as ASTNode | undefined
          if (property && property.type === 'Identifier') {
            name = property.name as string
          }
        }

        if (name !== variableName) return

        const right = expr.right as ASTNode | undefined
        if (!right) return

        const exprLoc = node.loc
        if (!exprLoc) return

        const exprEndLine = exprLoc.end.line - 1
        if (selectionLine >= exprLoc.start.line - 1 && selectionLine <= exprEndLine) {
          // 如果右边是函数调用，使用字节偏移计算结束位置
          if (containsFunctionCall(right)) {
            const targetEnd = getFullExpressionEnd(right)
            const endPosition = code.substring(0, targetEnd).split('\n')
            insertionLine = endPosition.length
            return true
          }

          if (right.type === 'FunctionExpression' || right.type === 'ArrowFunctionExpression') {
            const rightLoc = right.loc
            if (rightLoc) {
              insertionLine = rightLoc.end.line - 1 + 1
              return true
            }
          }
          insertionLine = exprEndLine + 1
          return true
        }
      }
    }
  })

  return insertionLine
}

/**
 * 根据初始化表达式类型获取插入行号
 * @param init 初始化表达式节点
 * @param declEndLine 声明结束行（0-based）
 * @returns 插入行号（0-based）
 */
function getInsertionLineForInit(init: ASTNode, declEndLine: number): number {
  const initLoc = init.loc

  switch (init.type) {
    case 'ObjectExpression':
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'ArrayExpression':
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'CallExpression':
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'ConditionalExpression':
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'TemplateLiteral':
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    default:
      return declEndLine + 1
  }
}

/**
 * 获取行缩进
 * @param lineText 行文本
 * @returns 缩进字符串
 */
export function getLineIndent(lineText: string): string {
  const match = lineText.match(/^(\s*)/)
  return match ? match[1] : ''
}
