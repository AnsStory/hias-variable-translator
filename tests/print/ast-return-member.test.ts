import { describe, it, expect } from 'vitest'
import { findInsertionLine } from '../../src/print/ast'

function getInsertLine(code: string, name: string, line: number, ext?: string): number {
  return findInsertionLine(code, name, line, ext).line
}

/**
 * 成员表达式选区在 return 回调内的定位回归。
 *
 * 场景 15（return 语句内）有一个保护：若选中节点嵌套在 return 参数内的回调函数中，
 * 应跳过、交由后续场景处理。但历史实现收集"选中节点"时只匹配 Identifier，
 * 导致选中成员表达式（如 this.token / obj.prop）时保护失效，
 * console.log 被错误插到 return 语句之前。
 */
describe('findInsertionLine - return 回调内的成员表达式选区', () => {
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
    expect(getInsertLine(code, 'this.token', 7, '.js')).toBe(8)
  })

  it('直接 return 成员表达式 - 仍插入到 return 之前', () => {
    const c = `function getToken() {\n  return this.token\n}`
    // 选中 this.token（第 1 行），无回调嵌套，插入到 return 之前（第 1 行）
    expect(getInsertLine(c, 'this.token', 1, '.js')).toBe(1)
  })
})
