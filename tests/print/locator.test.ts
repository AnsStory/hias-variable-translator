/**
 * 定位器 · §2.5 selection → node 解析 单元测试
 *
 * 覆盖：区间完全包含取最小节点、成员路径整体优先、解包下钻、
 * 首尾空白 trim、空选区降级。仅验证「解析出的 target 节点」，不涉及 placement。
 */

import { describe, it, expect } from 'vitest'
import { parseCode, offsetToLine } from '../../src/print/ast'
import {
  resolveTargetNode,
  climbToAnchor,
  normalizeAfterStmtOffset,
  normalizeLineStartOffset,
  determineRole,
  decidePlacement,
  computeInsertionAnchor,
  planInsertions,
} from '../../src/print/locator'

/** 用子串定位选区（第 occurrence 次出现，0-based），解析出 target 节点 */
function resolve(code: string, selText: string, occurrence = 0) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  return resolveTargetNode(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
}

describe('resolveTargetNode · §2.5', () => {
  it('规则1：选中简单标识符，命中最小的 Identifier', () => {
    const node = resolve('const x = 1', 'x')
    expect(node?.type).toBe('Identifier')
    expect((node as { name: string }).name).toBe('x')
  })

  it('规则1：选中完整表达式，命中该表达式而非更外层语句', () => {
    const node = resolve('foo()', 'foo()')
    expect(node?.type).toBe('CallExpression')
  })

  it('规则2：选中成员路径整体，命中 MemberExpression 整体', () => {
    const code = 'const a = user.first'
    const node = resolve(code, 'user.first')
    expect(node?.type).toBe('MemberExpression')
    expect(code.slice(node!.start, node!.end)).toBe('user.first')
  })

  it('规则2：this 成员路径整体命中', () => {
    const code = 'const a = this.token'
    const node = resolve(code, 'this.token')
    expect(node?.type).toBe('MemberExpression')
    expect(code.slice(node!.start, node!.end)).toBe('this.token')
  })

  it('规则2 offset 纪律：同名路径只命中包含选区的那一处', () => {
    const code = 'const a = this.token\nconst b = this.token'
    // 选第二处 this.token
    const node = resolve(code, 'this.token', 1)
    expect(node?.type).toBe('MemberExpression')
    // 命中的成员应落在第二行
    const secondIdx = code.indexOf('this.token', code.indexOf('this.token') + 1)
    expect(node!.start).toBe(secondIdx)
  })

  it('无点号选中属性名，命中该属性 Identifier（不上推整条路径）', () => {
    const code = 'const a = user.first'
    // 选 first（无 '.'，规则2 不触发）
    const node = resolve(code, 'first')
    expect(node?.type).toBe('Identifier')
    expect((node as { name: string }).name).toBe('first')
  })

  it('规则3：非空断言解包下钻到内层表达式', () => {
    const node = resolve('const v = x!', 'x!')
    expect(node?.type).toBe('Identifier')
    expect((node as { name: string }).name).toBe('x')
  })

  it('规则3：as 类型断言解包下钻', () => {
    const node = resolve('const v = x as Foo', 'x as Foo')
    expect(node?.type).toBe('Identifier')
    expect((node as { name: string }).name).toBe('x')
  })

  it('首尾空白：选区含前后空白仍命中内层标识符', () => {
    const code = 'const x = 1'
    const idx = code.indexOf('x')
    const parsed = parseCode(code, 0, '.ts')!
    // 人为把选区放宽到含前后空白
    const node = resolveTargetNode(parsed.ast, code, { startOffset: idx - 1, endOffset: idx + 2 })
    expect(node?.type).toBe('Identifier')
    expect((node as { name: string }).name).toBe('x')
  })

  it('空选区降级返回 null', () => {
    const code = 'const x = 1'
    const parsed = parseCode(code, 0, '.ts')!
    expect(resolveTargetNode(parsed.ast, code, { startOffset: 5, endOffset: 5 })).toBeNull()
    // 纯空白选区同样降级
    const wsCode = '   \n  '
    const p2 = parseCode(wsCode, 0, '.ts')
    if (p2) expect(resolveTargetNode(p2.ast, wsCode, { startOffset: 0, endOffset: 3 })).toBeNull()
  })
})

/** 解析 target 后上爬到锚定结果 */
function anchor(code: string, selText: string, occurrence = 0) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  const target = resolveTargetNode(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
  if (!target) throw new Error('resolveTargetNode 返回 null')
  return climbToAnchor(target, parsed.ast)
}

describe('climbToAnchor · §2.1 步 2', () => {
  it('顶层声明：容器为 Program，锚语句为 VariableDeclaration', () => {
    const res = anchor('const x = 1', 'x')
    expect(res?.containerKind).toBe('STATEMENT')
    expect(res?.container.type).toBe('Program')
    expect(res?.stmt.type).toBe('VariableDeclaration')
  })

  it('函数体内：容器为 BlockStatement', () => {
    const code = 'function f() {\n  const y = foo(bar)\n}'
    const res = anchor(code, 'bar')
    expect(res?.containerKind).toBe('STATEMENT')
    expect(res?.container.type).toBe('BlockStatement')
    expect(res?.stmt.type).toBe('VariableDeclaration')
  })

  it('switch case：容器为 SwitchCase（consequent）', () => {
    const code = 'switch (v) {\n  case 1:\n    const z = 2\n    break\n}'
    const res = anchor(code, 'z')
    expect(res?.containerKind).toBe('STATEMENT')
    expect(res?.container.type).toBe('SwitchCase')
    expect(res?.stmt.type).toBe('VariableDeclaration')
  })

  it('类静态块：容器为 StaticBlock', () => {
    const code = 'class C {\n  static {\n    const sv = 1\n  }\n}'
    const res = anchor(code, 'sv')
    expect(res?.containerKind).toBe('STATEMENT')
    expect(res?.container.type).toBe('StaticBlock')
  })

  it('类字段：容器为 ClassBody → CLASS_BODY（后续 SKIP）', () => {
    const code = 'class C {\n  config = new Foo()\n}'
    const res = anchor(code, 'config')
    expect(res?.containerKind).toBe('CLASS_BODY')
    expect(res?.container.type).toBe('ClassBody')
    expect(res?.stmt.type).toBe('PropertyDefinition')
  })

  it('私有字段：容器为 ClassBody → CLASS_BODY', () => {
    const code = 'class C {\n  #secret = 1\n}'
    const res = anchor(code, '#secret')
    expect(res?.containerKind).toBe('CLASS_BODY')
    expect(res?.container.type).toBe('ClassBody')
  })

  it('无花括号 if 单语句体：climb 爬到外层容器（补块交给 normalize）', () => {
    const code = 'if (a) foo()'
    const res = anchor(code, 'foo')
    expect(res?.containerKind).toBe('STATEMENT')
    expect(res?.container.type).toBe('Program')
    expect(res?.stmt.type).toBe('IfStatement')
  })
})

describe('normalizeAfterStmtOffset · §2.6 行尾', () => {
  it('普通行：跨到行尾换行符之后', () => {
    const code = 'const x = 1\nconst y = 2'
    const stmtEnd = code.indexOf('\n') // 第一行末（换行前）
    // 从语句末（即 stmtEnd 位置，此时刚好是 '\n'）往后扫
    expect(normalizeAfterStmtOffset(code, stmtEnd)).toBe(code.indexOf('\n') + 1)
  })

  it('一行多语句：插到整行之后而非分号中间', () => {
    const code = 'const a=1; const b=2\nnext()'
    // 选 a 时 stmt 为 `const a=1`，end 落在分号前/行中
    const aStmtEnd = code.indexOf('1') + 1 // `const a=1` 的 end
    const off = normalizeAfterStmtOffset(code, aStmtEnd)
    expect(off).toBe(code.indexOf('\n') + 1) // 整行之后
  })

  it('行尾注释：跨过注释到行尾之后', () => {
    const code = 'const x = 1 // 注释\nnext()'
    const stmtEnd = code.indexOf('1') + 1 // `const x = 1` 的 end（注释前）
    const off = normalizeAfterStmtOffset(code, stmtEnd)
    expect(off).toBe(code.indexOf('\n') + 1)
  })

  it('文本末尾无换行：返回 code.length', () => {
    const code = 'const x = 1'
    expect(normalizeAfterStmtOffset(code, code.length)).toBe(code.length)
  })
})

describe('normalizeLineStartOffset · §2.6 行首', () => {
  it('中间行：返回该行行首', () => {
    const code = 'const x = 1\n  const y = 2\nnext()'
    const yStart = code.indexOf('const y')
    const off = normalizeLineStartOffset(code, yStart)
    expect(off).toBe(code.indexOf('\n') + 1) // 第二行行首（含前导缩进）
  })

  it('首行：返回 0', () => {
    const code = 'const x = 1\nnext()'
    expect(normalizeLineStartOffset(code, code.indexOf('x'))).toBe(0)
  })
})

/** 解析 target 后得到角色 */
function role(code: string, selText: string, occurrence = 0) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  const target = resolveTargetNode(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
  if (!target) throw new Error('resolveTargetNode 返回 null')
  return determineRole(target, parsed.ast)
}

/** 解析 target 后得到 placement */
function placement(code: string, selText: string, occurrence = 0) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  const target = resolveTargetNode(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
  if (!target) throw new Error('resolveTargetNode 返回 null')
  return decidePlacement(target, parsed.ast)
}

describe('determineRole · §2.2 角色判定', () => {
  it('PRODUCE：声明 id', () => {
    expect(role('const x = 1', 'x')).toBe('PRODUCE')
  })
  it('PRODUCE：赋值左侧', () => {
    expect(role('obj.x = 5', 'obj.x')).toBe('PRODUCE')
  })
  it('PRODUCE：被赋值的表达式（RHS）', () => {
    expect(role('const y = foo()', 'foo')).toBe('PRODUCE')
  })
  it('PARAM：函数声明参数', () => {
    expect(role('function f(a, b) {}', 'b')).toBe('PARAM')
  })
  it('PARAM：箭头函数参数（赋值给变量）', () => {
    expect(role('const f = (a) => a + 1', 'a')).toBe('PARAM')
  })
  it('PARAM：解构参数', () => {
    expect(role('function f({ user }) {}', 'user')).toBe('PARAM')
  })
  it('LOOP_HEAD：for-init 声明', () => {
    expect(role('for (let i = 0; i < n; i++) {}', 'i')).toBe('LOOP_HEAD')
  })
  it('LOOP_HEAD：for-of left', () => {
    expect(role('for (const item of list) {}', 'item')).toBe('LOOP_HEAD')
  })
  it('USE：return 实参', () => {
    expect(role('function f() { return user.name }', 'user.name')).toBe('USE')
  })
  it('USE：if 条件', () => {
    expect(role('if (ready) run()', 'ready')).toBe('USE')
  })
  it('USE：游离读取（裸表达式语句）', () => {
    expect(role('doWork()', 'doWork')).toBe('USE')
  })
  it('TYPE_LAYER：枚举成员', () => {
    expect(role('enum E { Red = 1, Green = 2 }', 'Green')).toBe('TYPE_LAYER')
  })
  it('TYPE_LAYER：接口属性', () => {
    expect(role('interface I { name: string }', 'name')).toBe('TYPE_LAYER')
  })
})

describe('decidePlacement · §2.2 决策表', () => {
  it('PRODUCE → AFTER_STMT', () => {
    expect(placement('const x = 1', 'x')).toBe('AFTER_STMT')
  })
  it('赋值 → AFTER_STMT', () => {
    expect(placement('count = count + 1', 'count')).toBe('AFTER_STMT')
  })
  it('函数参数 → BLOCK_HEAD', () => {
    expect(placement('function f(a) {}', 'a')).toBe('BLOCK_HEAD')
  })
  it('for-init → BLOCK_HEAD', () => {
    expect(placement('for (let i = 0; i < n; i++) {}', 'i')).toBe('BLOCK_HEAD')
  })
  it('构造器参数（ClassBody 下）→ BLOCK_HEAD（PARAM 优先于 CLASS_BODY SKIP）', () => {
    const code = 'class C {\n  constructor(private svc) {}\n}'
    expect(placement(code, 'svc')).toBe('BLOCK_HEAD')
  })
  it('return 实参 → BEFORE_STMT', () => {
    expect(placement('function f() { return total }', 'total')).toBe('BEFORE_STMT')
  })
  it('游离读取 → BEFORE_STMT', () => {
    expect(placement('doWork()', 'doWork')).toBe('BEFORE_STMT')
  })
  it('类字段 → SKIP', () => {
    const code = 'class C {\n  config = new Foo()\n}'
    expect(placement(code, 'config')).toBe('SKIP')
  })
  it('私有字段 → SKIP', () => {
    const code = 'class C {\n  #secret = 1\n}'
    expect(placement(code, '#secret')).toBe('SKIP')
  })
  it('类型层（枚举成员）→ SKIP', () => {
    expect(placement('enum E { Red = 1 }', 'Red')).toBe('SKIP')
  })
  it('类型层（接口属性）→ SKIP', () => {
    expect(placement('interface I { name: string }', 'name')).toBe('SKIP')
  })
})

/** 走锚定引擎，把 offset 锤点换算为行号结果 { placement, line, needsNormalize } */
function anchorLine(code: string, selText: string, occurrence = 0) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  const anchor = computeInsertionAnchor(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
  if (!anchor) return null
  if (anchor.placement === 'SKIP' || anchor.needsNormalize) {
    return { placement: anchor.placement, line: -1, needsNormalize: !!anchor.needsNormalize }
  }
  let line = offsetToLine(code, anchor.offset)
  // AFTER_STMT 落末行且无尾随换行时 offset==code.length，log 实际渲染在新增行
  if (anchor.placement === 'AFTER_STMT' && anchor.offset >= code.length && !code.endsWith('\n')) line += 1
  return { placement: anchor.placement, line, needsNormalize: false }
}

describe('computeInsertionAnchor · 插入行号', () => {
  describe('收敛用例：行号落在预期位置（硬编期望）', () => {
    // [code, sel, 期望插入行号（0-based）]
    const cases: Array<[string, string, number]> = [
      ['const result = doSomething()', 'result', 1], // 赋值 → AFTER_STMT
      ['const result = obj.method()', 'result', 1],
      ['const x = 1\nconst y = 2', 'x', 1],
      ['const a=1; const b=2\nnext()', 'a', 1],
      ['const myFn = function() {\n  const x = 1\n}', 'myFn', 3], // 命名函数赋值 → AFTER_STMT
      ['const obj = { a: 1, b: 2 }', 'obj', 1], // 对象字面量 → AFTER_STMT
      ['const val = cond ? x : y', 'val', 1], // 三元 → AFTER_STMT
      ['const data = compute(\n  a,\n  b\n)', 'data', 4], // 多行调用赋值 → AFTER_STMT
      ['function greet(name) {\n  return name\n}', 'name', 1], // 参数 → BLOCK_HEAD
      ['function f() {\n  return total\n}', 'total', 1], // return → BEFORE_STMT
      ['if (flag) {\n  run()\n}', 'flag', 0], // 条件 → BEFORE_STMT
      ['for (let i = 0; i < n; i++) {\n  use(i)\n}', 'i', 1], // for-init → BLOCK_HEAD
    ]
    for (const [code, sel, expectedLine] of cases) {
      it(`选 ${sel} @ ${JSON.stringify(code)} → 行 ${expectedLine}`, () => {
        const anchor = anchorLine(code, sel)
        expect(anchor).not.toBeNull()
        expect(anchor!.needsNormalize).toBeFalsy()
        expect(anchor!.line).toBe(expectedLine)
      })
    }
  })

  describe('类字段 / 类型层 → SKIP（避免插出非法 JS）', () => {
    it('类字段：SKIP，行号 -1', () => {
      const anchor = anchorLine('class C {\n  config = new Foo()\n}', 'config')
      expect(anchor?.placement).toBe('SKIP')
      expect(anchor?.line).toBe(-1)
    })
    it('私有字段：SKIP', () => {
      const anchor = anchorLine('class C {\n  #secret = 1\n}', '#secret')
      expect(anchor?.placement).toBe('SKIP')
    })
    it('枚举成员（类型层）：SKIP', () => {
      const anchor = anchorLine('enum E { Red = 1 }', 'Red')
      expect(anchor?.placement).toBe('SKIP')
    })
  })

  describe('无花括号体标记 needsNormalize（补块）', () => {
    it('箭头表达式体参数：needsNormalize，行号 -1', () => {
      const anchor = anchorLine('const f = (num) => num + 1', 'num')
      expect(anchor?.placement).toBe('BLOCK_HEAD')
      expect(anchor?.needsNormalize).toBe(true)
      expect(anchor?.line).toBe(-1)
    })
  })

  it('空选区：返回 null（由 handler 走最小回退）', () => {
    const code = 'const x = 1'
    const parsed = parseCode(code, 0, '.ts')!
    expect(computeInsertionAnchor(parsed.ast, code, { startOffset: 5, endOffset: 5 })).toBeNull()
  })
})

/** 解析 target 后得到结构化 offset 锚点 */
function anchorOffset(code: string, selText: string, occurrence = 0) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  return computeInsertionAnchor(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
}

describe('computeInsertionAnchor · §2.4 结构化 offset 锚点', () => {
  it('AFTER_STMT：offset 跨到行尾换行之后，indentRef 指 stmt 行', () => {
    const code = 'const x = 1\nconst y = 2'
    const a = anchorOffset(code, 'x')
    expect(a?.placement).toBe('AFTER_STMT')
    expect(a?.offset).toBe(code.indexOf('\n') + 1) // 第二行行首
    expect(a?.indentRef).toBe(0) // 第一行 stmt 起始
  })

  it('AFTER_STMT：一行多语句跨到整行之后', () => {
    const code = 'const a=1; const b=2\nnext()'
    const a = anchorOffset(code, 'a')
    expect(a?.placement).toBe('AFTER_STMT')
    expect(a?.offset).toBe(code.indexOf('\n') + 1)
  })

  it('AFTER_STMT：文本末尾无换行 → offset = code.length', () => {
    const code = 'const x = 1'
    const a = anchorOffset(code, 'x')
    expect(a?.offset).toBe(code.length)
  })

  it('BEFORE_STMT：offset 取 stmt 行首，indentRef 指 stmt 起始', () => {
    const code = 'function f() {\n  return total\n}'
    const a = anchorOffset(code, 'total')
    expect(a?.placement).toBe('BEFORE_STMT')
    const retStart = code.indexOf('return')
    expect(a?.offset).toBe(normalizeLineStartOffset(code, retStart)) // return 行行首
    expect(a?.indentRef).toBe(retStart) // stmt.start = return 起始
  })

  it('BLOCK_HEAD（非空块）：offset 取首条内层语句行首，indentRef 指该内层行', () => {
    const code = 'function greet(name) {\n  return name\n}'
    const a = anchorOffset(code, 'name') // 参数（第一处）
    expect(a?.placement).toBe('BLOCK_HEAD')
    const innerStart = code.indexOf('return')
    expect(a?.offset).toBe(normalizeLineStartOffset(code, innerStart))
    expect(a?.indentRef).toBe(innerStart)
    expect(a?.indentOneLevelDeeper).toBe(false)
  })

  it('BLOCK_HEAD（for-init 循环体）：落首条循环体语句行', () => {
    const code = 'for (let i = 0; i < n; i++) {\n  use(i)\n}'
    const a = anchorOffset(code, 'i')
    expect(a?.placement).toBe('BLOCK_HEAD')
    const innerStart = code.indexOf('use(i)')
    expect(a?.offset).toBe(normalizeLineStartOffset(code, innerStart))
    expect(a?.indentRef).toBe(innerStart)
  })

  it('SKIP：类字段 offset/indentRef = -1', () => {
    const code = 'class C {\n  config = new Foo()\n}'
    const a = anchorOffset(code, 'config')
    expect(a?.placement).toBe('SKIP')
    expect(a?.offset).toBe(-1)
    expect(a?.indentRef).toBe(-1)
  })

  it('needsNormalize：箭头表达式体参数 → 携 normalize wrap-expr-return', () => {
    const code = 'const f = (num) => num + 1'
    const a = anchorOffset(code, 'num')
    expect(a?.placement).toBe('BLOCK_HEAD')
    expect(a?.needsNormalize).toBe(true)
    expect(a?.offset).toBe(-1)
    expect(a?.normalize?.kind).toBe('wrap-expr-return')
    expect(a?.normalize?.bodyStart).toBe(code.indexOf('num + 1'))
    expect(a?.normalize?.bodyEnd).toBe(code.length)
  })

  it('空函数体参数：offset 落 `{` 之后 + indentOneLevelDeeper（非 needsNormalize）', () => {
    const code = 'function f(a) {}'
    const a = anchorOffset(code, 'a')
    expect(a?.placement).toBe('BLOCK_HEAD')
    expect(a?.needsNormalize).toBeUndefined()
    expect(a?.indentOneLevelDeeper).toBe(true)
    expect(a?.offset).toBe(code.indexOf('{') + 1)
    expect(a?.indentRef).toBe(code.indexOf('{'))
  })

  it('空选区：返回 null', () => {
    const code = 'const x = 1'
    const parsed = parseCode(code, 0, '.ts')!
    expect(computeInsertionAnchor(parsed.ast, code, { startOffset: 5, endOffset: 5 })).toBeNull()
  })
})

describe('ensureBlock · §2.3 补块归一化描述', () => {
  it('wrap-stmt：无花括号循环体（循环变量）', () => {
    const code = 'for (let i = 0; i < n; i++) doThing(i)'
    const a = anchorOffset(code, 'i')
    expect(a?.placement).toBe('BLOCK_HEAD')
    expect(a?.needsNormalize).toBe(true)
    expect(a?.normalize?.kind).toBe('wrap-stmt')
    expect(a?.normalize?.bodyStart).toBe(code.indexOf('doThing(i)'))
    expect(a?.normalize?.bodyEnd).toBe(code.length)
  })

  it('单行块防护：`function f(a) { return a }` 参数 → needsNormalize、无 normalize、offset -1', () => {
    const code = 'function f(a) { return a }'
    const a = anchorOffset(code, 'a') // 第一处 = 参数
    expect(a?.placement).toBe('BLOCK_HEAD')
    expect(a?.needsNormalize).toBe(true)
    expect(a?.normalize).toBeUndefined()
    expect(a?.offset).toBe(-1)
  })

  it('对象字面量体跳过：`(x) => ({ a: x })` 参数 → needsNormalize、无 normalize（避免嵌套括号）', () => {
    const code = 'const g = (x) => ({ a: x })'
    const a = anchorOffset(code, 'x') // 第一处 = 参数
    expect(a?.placement).toBe('BLOCK_HEAD')
    expect(a?.needsNormalize).toBe(true)
    expect(a?.normalize).toBeUndefined()
  })
})

/** 用一组「子串[+第几次出现]」构造多选区，规划整批插入 */
function planFor(code: string, sels: Array<[string, number?]>) {
  const parsed = parseCode(code, 0, '.ts')
  if (!parsed) throw new Error('parseCode 返回 null')
  const selections = sels.map(([selText, occ = 0]) => {
    let idx = -1
    for (let i = 0; i <= occ; i++) idx = code.indexOf(selText, idx + 1)
    if (idx < 0) throw new Error(`未找到子串: ${selText}`)
    return { startOffset: idx, endOffset: idx + selText.length }
  })
  return planInsertions(parsed.ast, code, selections)
}

describe('planInsertions · §2.9 多选批量防漂移', () => {
  it('安全基线：互不重叠的两条 AFTER_STMT，按 offset 降序、无丢弃', () => {
    const code = 'const a = 1\nconst b = 2'
    const plan = planFor(code, [['a'], ['b']])
    expect(plan.insertions.length).toBe(2)
    expect(plan.fallbacks).toEqual([])
    expect(plan.skipped).toEqual([])
    expect(plan.dropped).toEqual([])
    expect(plan.insertions.every((i) => i.placement === 'AFTER_STMT')).toBe(true)
    // offset 降序：靠后的 b（index 1）在前
    expect(plan.insertions[0].offset).toBeGreaterThan(plan.insertions[1].offset)
    expect(plan.insertions[0].selectionIndex).toBe(1)
    expect(plan.insertions[1].selectionIndex).toBe(0)
  })

  it('同 offset（②）：同函数两参数落同一体首行 → 各插一行、稳定保留原选区序、不丢弃', () => {
    const code = 'function g(a, b) {\n  return a\n}'
    const plan = planFor(code, [['a'], ['b']]) // a 第一处=参数，b=参数
    expect(plan.insertions.length).toBe(2)
    expect(plan.dropped).toEqual([])
    expect(plan.insertions[0].offset).toBe(plan.insertions[1].offset) // 同 offset
    // equal offset 稳定排序保留原选区顺序（a 在 b 前）
    expect(plan.insertions[0].selectionIndex).toBe(0)
    expect(plan.insertions[1].selectionIndex).toBe(1)
    expect(plan.insertions.every((i) => i.placement === 'BLOCK_HEAD')).toBe(true)
  })

  it('区间重叠（③）：嵌套箭头双补块，内层补块被丢弃', () => {
    const code = 'const r = arr.map(x => x.filter(y => y.z))'
    const plan = planFor(code, [['x'], ['y']]) // 外层参数 x（先）、内层参数 y（后）
    expect(plan.insertions.length).toBe(1)
    expect(plan.insertions[0].selectionIndex).toBe(0) // 保留先者（外层 x 补块）
    expect(plan.insertions[0].normalize?.kind).toBe('wrap-expr-return')
    expect(plan.dropped).toEqual([1]) // 内层 y 补块与外层区间重叠 → 丢弃
  })

  it('normalize 描述透传：单选箭头表达式体参数 → 携 wrap-expr-return、offset=bodyStart、缩进深一级', () => {
    const code = 'const f = (num) => num + 1'
    const plan = planFor(code, [['num']])
    expect(plan.insertions.length).toBe(1)
    const ins = plan.insertions[0]
    expect(ins.normalize?.kind).toBe('wrap-expr-return')
    expect(ins.indentOneLevelDeeper).toBe(true)
    expect(ins.indentRef).toBe(-1)
    expect(ins.offset).toBe(code.indexOf('num + 1')) // = bodyStart
  })

  it('SKIP 分流：类字段 → skipped、不进 insertions', () => {
    const code = 'class C {\n  config = new Foo()\n}'
    const plan = planFor(code, [['config']])
    expect(plan.insertions).toEqual([])
    expect(plan.skipped).toEqual([0])
    expect(plan.fallbacks).toEqual([])
  })

  it('fallback 分流：单行块参数（needsNormalize 无 normalize）→ fallbacks', () => {
    const code = 'function f(a) { return a }'
    const plan = planFor(code, [['a']]) // 第一处 = 参数
    expect(plan.insertions).toEqual([])
    expect(plan.fallbacks).toEqual([0])
  })

  it('fallback 分流：空选区（解析为 null）→ fallbacks', () => {
    const code = 'const x = 1'
    const parsed = parseCode(code, 0, '.ts')!
    const plan = planInsertions(parsed.ast, code, [{ startOffset: 5, endOffset: 5 }])
    expect(plan.insertions).toEqual([])
    expect(plan.fallbacks).toEqual([0])
  })

  it('混合分流：SKIP + 普通插入同批 → 各归其组、稳定携带原选区下标', () => {
    const code = 'class C {\n  config = 1\n  m() {\n    const v = 1\n  }\n}'
    const plan = planFor(code, [['config'], ['v']]) // 0=类字段(SKIP)，1=方法内声明(AFTER_STMT)
    expect(plan.skipped).toEqual([0])
    expect(plan.insertions.length).toBe(1)
    expect(plan.insertions[0].selectionIndex).toBe(1)
    expect(plan.insertions[0].placement).toBe('AFTER_STMT')
    expect(plan.fallbacks).toEqual([])
    expect(plan.dropped).toEqual([])
  })
})
