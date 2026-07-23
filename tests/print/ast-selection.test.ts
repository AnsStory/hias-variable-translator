import { describe, it, expect } from 'vitest'
import { findInsertionLine } from '../../src/print/ast'

function getInsertLine(code: string, name: string, line: number, ext = '.js'): number {
  return findInsertionLine(code, name, line, ext).line
}

/**
 * 选区健壮性回归。
 *
 * 1) 选区带首尾空白/换行：拖拽或三击选中时很常见。历史实现里前 13 个精确场景
 *    使用 `id.name === variableName` 严格比较，一旦选区带空白就全部失配、掉进兜底，
 *    导致定位错误（如插进对象字面量内部）。修复：入口统一 trim。
 *
 * 2) 成员表达式子串误匹配：标识符搜索器对 MemberExpression 用 includes 匹配，
 *    选中 `token` 会误命中 `this.tokenValue`。修复：仅对含 `.` 的成员路径做整体精确匹配。
 */
describe('findInsertionLine - 选区带空白', () => {
  const obj = ['const obj = {', "  name: '张'", '}', 'const b = 2'].join('\n')

  it('无空白 - 对象字面量结束后插入（第 3 行）', () => {
    expect(getInsertLine(obj, 'obj', 0)).toBe(3)
  })

  it('首尾空白 " obj " - 与无空白结果一致', () => {
    expect(getInsertLine(obj, ' obj ', 0)).toBe(3)
  })

  it('尾部换行 "obj\\n" - 与无空白结果一致', () => {
    expect(getInsertLine(obj, 'obj\n', 0)).toBe(3)
  })

  it('全空白选区 - 退回选区下一行', () => {
    expect(getInsertLine(obj, '   ', 0)).toBe(1)
  })
})

describe('findInsertionLine - 成员表达式不误匹配相似标识符', () => {
  it('选中 token 不应被 this.tokenValue 干扰', () => {
    const code = ['function f() {', '  return new Promise((res) => {', '    const token = this.tokenValue', '    res()', '  })', '}'].join('\n')
    // token 是回调内的局部声明，命中场景后应插到其声明之后（第 3 行），
    // 而非因 this.tokenValue 的子串误匹配触发 return 场景插到 return 之前
    expect(getInsertLine(code, 'token', 2)).toBe(3)
  })
})
