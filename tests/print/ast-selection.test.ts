import { describe, it, expect } from 'vitest'
import { parseCode, offsetToLine } from '../../src/print/ast'
import { computeInsertionAnchor } from '../../src/print/locator'

/** 走锚定引擎，按显式 offset 选区返回插入行号；空选区/SKIP/需补块/解析失败返回 -1 */
function anchorLineAt(code: string, startOffset: number, endOffset: number, ext = '.js'): number {
  const parsed = parseCode(code, 0, ext)
  if (!parsed) return -1
  const anchor = computeInsertionAnchor(parsed.ast, code, { startOffset, endOffset })
  if (!anchor || anchor.placement === 'SKIP' || anchor.needsNormalize) return -1
  let line = offsetToLine(code, anchor.offset)
  // AFTER_STMT 落末行且无尾随换行时 offset==code.length，log 实际渲染在新增行
  if (anchor.placement === 'AFTER_STMT' && anchor.offset >= code.length && !code.endsWith('\n')) line += 1
  return line
}

/** 走锚定引擎，用子串定位选区（第 occurrence 次出现，0-based）返回插入行号 */
function anchorLine(code: string, selText: string, ext = '.js', occurrence = 0): number {
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  return anchorLineAt(code, idx, idx + selText.length, ext)
}

/**
 * 选区健壮性回归（迁移自旧引擎，改测锚定引擎）。
 *
 * 1) 选区带首尾空白/换行：拖拽或三击选中时很常见。锚定引擎在 offset 层由
 *    getEffectiveRange 统一 trim，选区多包空白应与精确选区落点一致；全空白选区
 *    trim 后为空 → 引擎返回 null（-1），交由 handler 走最小回退。
 *
 * 2) 成员表达式子串误匹配：选中 `token` 不应因 `this.tokenValue` 的子串关系被干扰。
 *    锚定引擎按 offset 纪律只命中「完整包含选区」的节点，天然规避子串误匹配。
 */
describe('锚定引擎 - 选区带空白', () => {
  const obj = ['const obj = {', "  name: '张'", '}', 'const b = 2'].join('\n')
  const objIdx = obj.indexOf('obj')

  it('无空白 - 对象字面量结束后插入（第 3 行）', () => {
    expect(anchorLineAt(obj, objIdx, objIdx + 3)).toBe(3)
  })

  it('首尾空白（多包前后各一位空白）- 与无空白结果一致', () => {
    // objIdx-1 是 "const " 的尾空格，objIdx+3 后是 " =" 的空格
    expect(anchorLineAt(obj, objIdx - 1, objIdx + 4)).toBe(3)
  })

  it('全空白选区 - 引擎返回 -1（handler 负责最小回退）', () => {
    // 选中行首缩进空白（第 1 行的两个前导空格）
    const wsStart = obj.indexOf('  name') // 指向缩进首个空格
    expect(anchorLineAt(obj, wsStart, wsStart + 2)).toBe(-1)
  })
})

describe('锚定引擎 - 成员表达式不误匹配相似标识符', () => {
  it('选中 token 不应被 this.tokenValue 干扰', () => {
    const code = ['function f() {', '  return new Promise((res) => {', '    const token = this.tokenValue', '    res()', '  })', '}'].join('\n')
    // token 是回调内的局部声明（第 2 行），命中后应插到其声明之后（第 3 行），
    // 而非因 this.tokenValue 的子串关系被误导
    expect(anchorLine(code, 'token')).toBe(3)
  })
})
