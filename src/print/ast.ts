/**
 * AST 解析模块
 * 使用 acorn 解析代码，确定 console.log 的正确插入位置
 */

import * as acorn from 'acorn'

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
 * 解析代码生成 AST
 * @param code 源代码
 * @returns AST 节点
 */
export function parseCode(code: string): ASTNode | null {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    }) as unknown as ASTNode
    return ast
  } catch {
    // 解析失败时返回 null，使用简单的行号计算
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
 * 查找变量声明的结束行
 * @param code 源代码
 * @param variableName 变量名
 * @param selectionLine 选中行（0-based）
 * @returns 插入行号（0-based），如果未找到返回 -1
 */
export function findInsertionLine(code: string, variableName: string, selectionLine: number): number {
  const ast = parseCode(code)

  if (!ast) {
    // 解析失败时，简单地在选中行下一行插入
    return selectionLine + 1
  }

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

        // 检查选中行是否在声明范围内
        const declLoc = decl.loc
        if (!declLoc) continue

        const declStartLine = declLoc.start.line - 1 // 转换为 0-based
        const declEndLine = declLoc.end.line - 1

        if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
          // 根据初始化表达式类型确定插入位置
          insertionLine = getInsertionLineForInit(code, init, declEndLine)
          return true // 停止遍历
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
          // 处理 obj.prop = function() {} 的情况
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
          // 如果右边是函数表达式或箭头函数，插入到函数结束后
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
 * @param code 源代码
 * @param init 初始化表达式节点
 * @param declEndLine 声明结束行（0-based）
 * @returns 插入行号（0-based）
 */
function getInsertionLineForInit(code: string, init: ASTNode, declEndLine: number): number {
  const initLoc = init.loc

  switch (init.type) {
    case 'ObjectExpression':
      // 对象字面量：插入到对象结束后
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'ArrayExpression':
      // 数组：插入到数组结束后
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      // 函数表达式：插入到函数结束后
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'CallExpression':
      // 函数调用：插入到调用结束后
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'ConditionalExpression':
      // 三元表达式：插入到表达式结束后
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    case 'TemplateLiteral':
      // 模板字符串：插入到表达式结束后
      if (initLoc) {
        return initLoc.end.line - 1 + 1
      }
      return declEndLine + 1

    default:
      // 其他情况：插入到声明结束后
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
