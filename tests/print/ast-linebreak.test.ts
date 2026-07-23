import { describe, it, expect } from 'vitest'
import { parseCode, offsetToLine } from '../../src/print/ast'
import { computeInsertionAnchor } from '../../src/print/locator'

/** 走锚定引擎，用子串定位选区（第 occurrence 次出现，0-based），返回插入行号；解析失败/空选区/SKIP/需补块返回 -1 */
function anchorLine(code: string, selText: string, ext = '.js', occurrence = 0): number {
  const parsed = parseCode(code, 0, ext)
  if (!parsed) return -1
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  const anchor = computeInsertionAnchor(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
  if (!anchor || anchor.placement === 'SKIP' || anchor.needsNormalize) return -1
  let line = offsetToLine(code, anchor.offset)
  // AFTER_STMT 落末行且无尾随换行时 offset==code.length，log 实际渲染在新增行
  if (anchor.placement === 'AFTER_STMT' && anchor.offset >= code.length && !code.endsWith('\n')) line += 1
  return line
}

/**
 * 换行符一致性回归（迁移自旧引擎，改测锚定引擎）：
 * acorn 会把 U+2028 / U+2029 视为换行，而 VSCode 与实际插入坐标不会。
 * 锚定引擎经 offsetToLine 做 offset→行号换算，必须与 VSCode 行模型（\r\n | \r | \n）一致，
 * 否则最终插入行号会与实际坐标错位。以下用例验证该换算的边界行为。
 */
describe('锚定引擎 - 换行符一致性（位置精确性）', () => {
  it('普通 LF - 多行对象字面量插入到结束后', () => {
    const code = `const a = 1\nconst obj = {\n  name: '张'\n}\nconst b = 2`
    expect(anchorLine(code, 'obj')).toBe(4)
  })

  it('CRLF - 与 LF 结果一致', () => {
    const code = `const a = 1\r\nconst obj = {\r\n  name: '张'\r\n}\r\nconst b = 2`
    expect(anchorLine(code, 'obj')).toBe(4)
  })

  it('字符串中含 U+2028 - 不影响后续对象字面量插入行', () => {
    const code = `const s = "a\u2028b"\nconst obj = {\n  x: 1\n}`
    // obj 对象字面量跨 1-3 行，应插入到第 4 行（U+2028 不应被当作换行）
    expect(anchorLine(code, 'obj')).toBe(4)
  })

  it('模板串中含 U+2029 - 不影响后续函数调用赋值插入行', () => {
    const code = `const msg = \`l1\u2029l2\`\nconst data = fetch()\nconst z = 1`
    expect(anchorLine(code, 'data')).toBe(2)
  })

  it('单独 \\r - 行号与 VSCode 模型一致', () => {
    // VSCode 同样把单独的 \r 视为换行，因此注释占据第 0、1 两行，obj 实际在第 2 行
    const code = `/* 多行\r注释 */\nconst obj = {\n  x: 1\n}`
    // obj 对象字面量跨 2-4 行，应插入到第 5 行
    expect(anchorLine(code, 'obj')).toBe(5)
  })

  it('前导内容含 U+2028 - 函数体参数插入位置正确', () => {
    const code = `const t = "x\u2028y"\nfunction greet(name) {\n  return name\n}`
    // 选中 name 参数（第 1 行，首个 name），插入到函数体开始（第 2 行）
    expect(anchorLine(code, 'name')).toBe(2)
  })
})
