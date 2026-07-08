/**
 * AST 解析模块
 * 使用 acorn 解析代码，确定 console.log 的正确插入位置
 * 支持 Vue、HTML、JSX/TSX 等文件的 script 提取
 * 参考 turbo-console-log 项目的实现，支持 16 种场景
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
 * 检查节点是否是类型断言
 */
function isTypeAssertion(node: ASTNode): boolean {
  return node.type === 'TSAsExpression' ||
    node.type === 'TSTypeAssertion' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'ParenthesizedExpression'
}

/**
 * 解包类型断言，获取内部表达式
 */
function unwrapTypeAssertion(node: ASTNode): ASTNode {
  if (isTypeAssertion(node)) {
    return node.expression as ASTNode
  }
  return node
}

/**
 * 检查表达式是否包含函数调用
 */
function containsFunctionCall(expr: ASTNode): boolean {
  if (!expr) return false

  const unwrapped = unwrapTypeAssertion(expr)

  if (unwrapped.type === 'CallExpression' || unwrapped.type === 'NewExpression') {
    return true
  }

  if (unwrapped.type === 'AwaitExpression') {
    return containsFunctionCall(unwrapped.argument as ASTNode)
  }

  if (unwrapped.type === 'LogicalExpression') {
    return containsFunctionCall(unwrapped.left as ASTNode) || containsFunctionCall(unwrapped.right as ASTNode)
  }

  if (unwrapped.type === 'ChainExpression') {
    return containsFunctionCall(unwrapped.expression as ASTNode)
  }

  return false
}

/**
 * 获取完整表达式的结束位置
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
 * 从 Vue SFC 中提取 script 内容
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
 */
export function parseCode(code: string, selectionLine: number, fileExtension?: string): { ast: ASTNode; lineOffset: number } | null {
  let codeToParse = code
  let lineOffset = 0
  let byteOffset = 0

  const ext = fileExtension?.toLowerCase()

  if (ext === '.vue' || ext === '.html') {
    const extracted = extractVueScript(code, selectionLine)
    if (!extracted) {
      return null
    }
    codeToParse = extracted.scriptContent
    lineOffset = extracted.lineOffset
    byteOffset = extracted.byteOffset
  }

  const needsJsx = ext === '.jsx' || ext === '.tsx'

  try {
    const parser = acorn.Parser.extend(tsPlugin({ jsx: needsJsx })) as any
    let ast = parser.parse(codeToParse, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    }) as ASTNode

    if (lineOffset > 0 || byteOffset > 0) {
      ast = adjustASTLocations(ast, lineOffset, byteOffset)
    }

    return { ast, lineOffset }
  } catch {
    return null
  }
}

/**
 * 遍历 AST 节点
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
 * 向上查找父节点
 */
function findParentNode(ast: ASTNode, targetNode: ASTNode): ASTNode | null {
  let parent: ASTNode | null = null

  walkAST(ast, (node: ASTNode): boolean | void => {
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') {
        continue
      }

      const value = node[key]
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === targetNode) {
            parent = node
            return true
          }
        }
      } else if (value === targetNode) {
        parent = node
        return true
      }
    }
  })

  return parent
}

/**
 * 查找变量声明的结束行
 */
export function findInsertionLine(code: string, variableName: string, selectionLine: number, fileExtension?: string): number {
  const result = parseCode(code, selectionLine, fileExtension)

  if (!result) {
    return selectionLine + 1
  }

  const { ast } = result
  let insertionLine = -1

  // 按优先级检查各种场景
  const checks = [
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
    checkPrimitiveAssignment,
    checkWithinReturnStatement,
    checkWithinConditionBlock,
    checkWanderingExpression,
  ]

  for (const check of checks) {
    insertionLine = check(ast, code, selectionLine, variableName)
    if (insertionLine !== -1) {
      return insertionLine
    }
  }

  return selectionLine + 1
}

/**
 * 场景1: 检查命名函数赋值
 * const myFn = function() {}
 * const myFn = () => {}
 */
function checkNamedFunctionAssignment(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'FunctionExpression' || unwrapped.type === 'ArrowFunctionExpression') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            if (unwrapped.loc) {
              insertionLine = unwrapped.loc.end.line - 1 + 1
            } else {
              insertionLine = declEndLine + 1
            }
            return true
          }
        }
      }
    }

    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as ASTNode | undefined
      if (!expr) return

      const unwrapped = unwrapTypeAssertion(expr)

      if (unwrapped.type === 'AssignmentExpression') {
        const left = unwrapped.left as ASTNode | undefined
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

        const right = unwrapped.right as ASTNode | undefined
        if (!right) return

        const rightUnwrapped = unwrapTypeAssertion(right)

        if (rightUnwrapped.type === 'FunctionExpression' || rightUnwrapped.type === 'ArrowFunctionExpression') {
          const exprLoc = node.loc
          if (!exprLoc) return

          const exprStartLine = exprLoc.start.line - 1
          const exprEndLine = exprLoc.end.line - 1

          if (selectionLine >= exprStartLine && selectionLine <= exprEndLine) {
            if (rightUnwrapped.loc) {
              insertionLine = rightUnwrapped.loc.end.line - 1 + 1
            } else {
              insertionLine = exprEndLine + 1
            }
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景2: 检查函数参数
 * function greet(name) {}
 * (x, y) => x + y
 */
function checkFunctionParameter(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const params = node.params as ASTNode[] | undefined
      if (!params) return

      for (const param of params) {
        const paramName = extractParamName(param)
        if (paramName !== variableName) continue

        const nodeLoc = node.loc
        if (!nodeLoc) continue

        const nodeStartLine = nodeLoc.start.line - 1
        const nodeEndLine = nodeLoc.end.line - 1

        if (selectionLine >= nodeStartLine && selectionLine <= nodeEndLine) {
          // 找到函数体开始位置
          const body = node.body as ASTNode | undefined
          if (body && body.loc) {
            insertionLine = body.loc.start.line - 1
          } else {
            insertionLine = nodeStartLine + 1
          }
          return true
        }
      }
    }

    if (node.type === 'MethodDefinition') {
      const value = node.value as ASTNode | undefined
      if (!value) return

      const params = value.params as ASTNode[] | undefined
      if (!params) return

      for (const param of params) {
        const paramName = extractParamName(param)
        if (paramName !== variableName) continue

        const nodeLoc = node.loc
        if (!nodeLoc) continue

        const nodeStartLine = nodeLoc.start.line - 1
        const nodeEndLine = nodeLoc.end.line - 1

        if (selectionLine >= nodeStartLine && selectionLine <= nodeEndLine) {
          const body = value.body as ASTNode | undefined
          if (body && body.loc) {
            insertionLine = body.loc.start.line - 1
          } else {
            insertionLine = nodeStartLine + 1
          }
          return true
        }
      }
    }
  })

  return insertionLine
}

/**
 * 提取参数名
 */
function extractParamName(param: ASTNode): string {
  if (param.type === 'Identifier') {
    return param.name as string
  }

  if (param.type === 'AssignmentPattern') {
    return extractParamName(param.left as ASTNode)
  }

  if (param.type === 'RestElement') {
    return extractParamName(param.argument as ASTNode)
  }

  return ''
}

/**
 * 场景3: 检查对象方法调用赋值
 * const result = obj.method()
 * const { data } = obj.method()
 */
function checkObjectFunctionCallAssignment(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'VariableDeclaration') {
      const declarations = node.declarations as ASTNode[] | undefined
      if (!declarations) return

      for (const decl of declarations) {
        if (decl.type !== 'VariableDeclarator') continue

        const id = decl.id as ASTNode | undefined
        if (!id) continue

        let name = ''
        if (id.type === 'Identifier') {
          name = id.name as string
        } else if (id.type === 'ObjectPattern' || id.type === 'ArrayPattern') {
          if (!findVariableInPattern(id, variableName)) continue
          name = variableName
        }

        if (name !== variableName) continue

        const init = decl.init as ASTNode | undefined
        if (!init) continue

        const unwrapped = unwrapTypeAssertion(init)

        if (containsFunctionCall(unwrapped)) {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            const targetEnd = getFullExpressionEnd(unwrapped)
            const endPosition = code.substring(0, targetEnd).split('\n')
            insertionLine = endPosition.length
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 在模式中查找变量
 */
function findVariableInPattern(pattern: ASTNode, variableName: string): boolean {
  if (!pattern) return false

  if (pattern.type === 'Identifier') {
    return (pattern.name as string) === variableName
  }

  if (pattern.type === 'ObjectPattern') {
    const properties = pattern.properties as ASTNode[] | undefined
    if (!properties) return false

    for (const prop of properties) {
      if (prop.type === 'Property') {
        if (findVariableInPattern(prop.value as ASTNode, variableName)) return true
      } else if (prop.type === 'RestElement') {
        if (findVariableInPattern(prop.argument as ASTNode, variableName)) return true
      }
    }
  }

  if (pattern.type === 'ArrayPattern') {
    const elements = pattern.elements as (ASTNode | null)[] | undefined
    if (!elements) return false

    for (const element of elements) {
      if (element && findVariableInPattern(element, variableName)) return true
    }
  }

  if (pattern.type === 'AssignmentPattern') {
    return findVariableInPattern(pattern.left as ASTNode, variableName)
  }

  if (pattern.type === 'RestElement') {
    return findVariableInPattern(pattern.argument as ASTNode, variableName)
  }

  return false
}

/**
 * 场景4: 检查函数调用赋值
 * const result = doSomething()
 * const result = await fetch()
 */
function checkFunctionCallAssignment(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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

        const unwrapped = unwrapTypeAssertion(init)

        if (containsFunctionCall(unwrapped)) {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            const targetEnd = getFullExpressionEnd(unwrapped)
            const endPosition = code.substring(0, targetEnd).split('\n')
            insertionLine = endPosition.length
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景5: 检查属性访问赋值
 * const value = obj.prop
 * const deep = a.b.c
 */
function checkPropertyAccessAssignment(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'MemberExpression') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            insertionLine = declEndLine + 1
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景6: 检查对象字面量
 * const config = { key: value }
 */
function checkObjectLiteral(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'ObjectExpression') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            if (unwrapped.loc) {
              insertionLine = unwrapped.loc.end.line - 1 + 1
            } else {
              insertionLine = declEndLine + 1
            }
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景7: 检查数组赋值
 * const items = [1, 2, 3]
 */
function checkArrayAssignment(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'VariableDeclaration') {
      const declarations = node.declarations as ASTNode[] | undefined
      if (!declarations) return

      for (const decl of declarations) {
        if (decl.type !== 'VariableDeclarator') continue

        const id = decl.id as ASTNode | undefined
        if (!id) continue

        let name = ''
        if (id.type === 'Identifier') {
          name = id.name as string
        } else if (id.type === 'ArrayPattern') {
          if (!findVariableInPattern(id, variableName)) continue
          name = variableName
        }

        if (name !== variableName) continue

        const init = decl.init as ASTNode | undefined
        if (!init) continue

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'ArrayExpression') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            if (unwrapped.loc) {
              insertionLine = unwrapped.loc.end.line - 1 + 1
            } else {
              insertionLine = declEndLine + 1
            }
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景8: 检查模板字符串
 * const msg = `Hello ${name}`
 */
function checkTemplateString(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'TemplateLiteral') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            if (unwrapped.loc) {
              insertionLine = unwrapped.loc.end.line - 1 + 1
            } else {
              insertionLine = declEndLine + 1
            }
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景9: 检查三元表达式
 * const x = condition ? a : b
 */
function checkTernary(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'VariableDeclaration') {
      const declarations = node.declarations as ASTNode[] | undefined
      if (!declarations) return

      for (const decl of declarations) {
        if (decl.type !== 'VariableDeclarator') continue

        const id = decl.id as ASTNode | undefined
        if (!id) continue

        let name = ''
        if (id.type === 'Identifier') {
          name = id.name as string
        } else if (id.type === 'ArrayPattern') {
          if (!findVariableInPattern(id, variableName)) continue
          name = variableName
        } else if (id.type === 'ObjectPattern') {
          if (!findVariableInPattern(id, variableName)) continue
          name = variableName
        }

        if (name !== variableName) continue

        const init = decl.init as ASTNode | undefined
        if (!init) continue

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'ConditionalExpression') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            if (unwrapped.loc) {
              insertionLine = unwrapped.loc.end.line - 1 + 1
            } else {
              insertionLine = declEndLine + 1
            }
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景10: 检查二元/逻辑表达式
 * const sum = a + b
 * const value = a || b
 */
function checkBinaryExpression(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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

        const unwrapped = unwrapTypeAssertion(init)

        if (unwrapped.type === 'BinaryExpression' || unwrapped.type === 'LogicalExpression') {
          const declLoc = decl.loc
          if (!declLoc) continue

          const declStartLine = declLoc.start.line - 1
          const declEndLine = declLoc.end.line - 1

          if (selectionLine >= declStartLine && selectionLine <= declEndLine) {
            insertionLine = declEndLine + 1
            return true
          }
        }
      }
    }

    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as ASTNode | undefined
      if (!expr) return

      const unwrapped = unwrapTypeAssertion(expr)

      if (unwrapped.type === 'AssignmentExpression') {
        const left = unwrapped.left as ASTNode | undefined
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

        const right = unwrapped.right as ASTNode | undefined
        if (!right) return

        const rightUnwrapped = unwrapTypeAssertion(right)

        if (rightUnwrapped.type === 'BinaryExpression' || rightUnwrapped.type === 'LogicalExpression') {
          const exprLoc = node.loc
          if (!exprLoc) return

          const exprStartLine = exprLoc.start.line - 1
          const exprEndLine = exprLoc.end.line - 1

          if (selectionLine >= exprStartLine && selectionLine <= exprEndLine) {
            insertionLine = exprEndLine + 1
            return true
          }
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景11: 检查基本类型赋值
 * const x = 42
 * const name = "hello"
 */
function checkPrimitiveAssignment(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

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
          insertionLine = declEndLine + 1
          return true
        }
      }
    }

    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as ASTNode | undefined
      if (!expr) return

      const unwrapped = unwrapTypeAssertion(expr)

      if (unwrapped.type === 'AssignmentExpression') {
        const left = unwrapped.left as ASTNode | undefined
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

        const exprLoc = node.loc
        if (!exprLoc) return

        const exprStartLine = exprLoc.start.line - 1
        const exprEndLine = exprLoc.end.line - 1

        if (selectionLine >= exprStartLine && selectionLine <= exprEndLine) {
          insertionLine = exprEndLine + 1
          return true
        }
      }
    }
  })

  return insertionLine
}

/**
 * 场景12: 检查 return 语句内
 * return variableName
 */
function checkWithinReturnStatement(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'ReturnStatement') {
      const argument = node.argument as ASTNode | undefined
      if (!argument) return

      const nodeLoc = node.loc
      if (!nodeLoc) return

      const nodeStartLine = nodeLoc.start.line - 1
      const nodeEndLine = nodeLoc.end.line - 1

      if (selectionLine >= nodeStartLine && selectionLine <= nodeEndLine) {
        // 在 return 语句之前插入
        insertionLine = nodeStartLine
        return true
      }
    }
  })

  return insertionLine
}

/**
 * 场景13: 检查条件块内
 * if (variable) {}
 * while (condition) {}
 */
function checkWithinConditionBlock(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'IfStatement' || node.type === 'WhileStatement' || node.type === 'ForStatement' || node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
      const test = node.test as ASTNode | undefined
      if (!test) return

      const nodeLoc = node.loc
      if (!nodeLoc) return

      const nodeStartLine = nodeLoc.start.line - 1

      if (selectionLine === nodeStartLine) {
        // 在条件语句之前插入
        insertionLine = nodeStartLine
        return true
      }
    }
  })

  return insertionLine
}

/**
 * 场景14: 检查游离表达式（兜底）
 */
function checkWanderingExpression(ast: ASTNode, code: string, selectionLine: number, variableName: string): number {
  let insertionLine = -1

  walkAST(ast, (node: ASTNode): boolean | void => {
    if (insertionLine !== -1) return true

    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as ASTNode | undefined
      if (!expr) return

      const nodeLoc = node.loc
      if (!nodeLoc) return

      const nodeStartLine = nodeLoc.start.line - 1
      const nodeEndLine = nodeLoc.end.line - 1

      if (selectionLine >= nodeStartLine && selectionLine <= nodeEndLine) {
        insertionLine = nodeEndLine + 1
        return true
      }
    }
  })

  return insertionLine
}

/**
 * 获取行缩进
 */
export function getLineIndent(lineText: string): string {
  const match = lineText.match(/^(\s*)/)
  return match ? match[1] : ''
}
