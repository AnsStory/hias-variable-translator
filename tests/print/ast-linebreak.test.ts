import { describe, it, expect } from 'vitest'
import { findInsertionLine } from '../../src/print/ast'

function getInsertLine(code: string, name: string, line: number, ext?: string): number {
  return findInsertionLine(code, name, line, ext).line
}

/**
 * 换行符一致性回归：
 * acorn 会把 U+2028 / U+2029 视为换行，而 VSCode 与实际插入坐标不会。
 * 历史上这会导致 loc 行号与 selectionLine 错位，场景匹配失败并回退到兜底逻辑，
 * 表现为"打印位置有时不精确"。以下用例验证行号计算与 VSCode 行模型保持一致。
 */
describe('findInsertionLine - 换行符一致性（位置精确性）', () => {
  it('普通 LF - 多行对象字面量插入到结束后', () => {
    const code = `const a = 1\nconst obj = {\n  name: '张'\n}\nconst b = 2`
    expect(getInsertLine(code, 'obj', 1)).toBe(4)
  })

  it('CRLF - 与 LF 结果一致', () => {
    const code = `const a = 1\r\nconst obj = {\r\n  name: '张'\r\n}\r\nconst b = 2`
    expect(getInsertLine(code, 'obj', 1)).toBe(4)
  })

  it('字符串中含 U+2028 - 不影响后续对象字面量插入行', () => {
    const code = `const s = "a\u2028b"\nconst obj = {\n  x: 1\n}`
    // obj 对象字面量跨 1-3 行，应插入到第 4 行（U+2028 不应被当作换行）
    expect(getInsertLine(code, 'obj', 1)).toBe(4)
  })

  it('模板串中含 U+2029 - 不影响后续函数调用赋值插入行', () => {
    const code = `const msg = \`l1\u2029l2\`\nconst data = fetch()\nconst z = 1`
    expect(getInsertLine(code, 'data', 1)).toBe(2)
  })

  it('单独 \\r - 行号与 VSCode 模型一致', () => {
    // VSCode 同样把单独的 \r 视为换行，因此注释占据第 0、1 两行，obj 实际在第 2 行
    const code = `/* 多行\r注释 */\nconst obj = {\n  x: 1\n}`
    // obj 对象字面量跨 2-4 行，应插入到第 5 行
    expect(getInsertLine(code, 'obj', 2)).toBe(5)
  })

  it('前导内容含 U+2028 - 函数体参数插入位置正确', () => {
    const code = `const t = "x\u2028y"\nfunction greet(name) {\n  return name\n}`
    // 选中 name 参数（第 1 行），插入到函数体开始（第 2 行）
    expect(getInsertLine(code, 'name', 1)).toBe(2)
  })
})
