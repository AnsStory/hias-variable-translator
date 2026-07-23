import { describe, it, expect } from 'vitest'
import { parseCode, offsetToLine } from '../../src/print/ast'
import { computeInsertionAnchor } from '../../src/print/locator'

/** 走锚定引擎，用子串定位选区（第 occurrence 次出现，0-based）返回插入行号；空选区/SKIP/需补块/解析失败返回 -1 */
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
 * 成员表达式选区在 return 回调内的定位回归（迁移自旧引擎，改测锚定引擎）。
 *
 * 选中 return 参数内层回调中的赋值目标（this.token = ...）时，锚定引擎按
 * §2.5 成员路径整体命中 MemberExpression，再由 role/anchor 判定其所属语句为
 * 赋值表达式语句（PRODUCE → AFTER_STMT），插到赋值语句之后，而非误插到外层
 * return 之前。直接 return 成员表达式则判为 USE → BEFORE_STMT。
 */
describe('锚定引擎 - return 回调内的成员表达式选区', () => {
  const code = [
    "const useUserStore = defineStore('user', {",
    '  actions: {',
    '    login(userInfo) {',
    '      return new Promise((resolve, reject) => {',
    '        login(username)',
    '          .then((res) => {',
    '            let data = res.data',
    '            this.token = data.access_token',
    '            resolve()',
    '          })',
    '      })',
    '    },',
    '  },',
    '})',
  ].join('\n')

  it('选中 this.token（return 回调内的赋值）- 插入到赋值语句之后', () => {
    // this.token = data.access_token 在第 7 行，应插入到第 8 行
    expect(anchorLine(code, 'this.token')).toBe(8)
  })

  it('直接 return 成员表达式 - 仍插入到 return 之前', () => {
    const c = `function getToken() {\n  return this.token\n}`
    // 选中 this.token（第 1 行），无回调嵌套，插入到 return 之前（第 1 行）
    expect(anchorLine(c, 'this.token')).toBe(1)
  })
})
