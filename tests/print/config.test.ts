/**
 * 配置模块测试
 * 测试 parseConsoleLogTemplate、buildConsoleLogRegex、buildCommentConsoleLogRegex、extractClipboardText
 */

import { describe, it, expect, vi } from 'vitest'

// Mock vscode 模块
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
}))

// 动态导入（确保 mock 生效）
const {
  parseConsoleLogTemplate,
  buildConsoleLogRegex,
  buildCommentConsoleLogRegex,
  extractClipboardText,
  hasSnippetSyntax,
} = await import('../../src/print/config')

describe('parseConsoleLogTemplate - 模板变量解析', () => {
  it('${value} - 替换为选中文本', () => {
    expect(parseConsoleLogTemplate('obj', '${value}')).toBe('obj')
  })

  it('${name} - 替换为选中文本', () => {
    expect(parseConsoleLogTemplate('obj', '${name}')).toBe('obj')
  })

  it('${name:prefix,suffix} - 前缀+文本+后缀', () => {
    expect(parseConsoleLogTemplate('obj', '${name:log_,}')).toBe('log_obj')
    expect(parseConsoleLogTemplate('obj', '${name:前,后}')).toBe('前obj后')
    expect(parseConsoleLogTemplate('obj', "${name:'," + "'}")).toBe("'obj'")
  })

  it('组合使用 - 多变量', () => {
    expect(parseConsoleLogTemplate('obj', '${value}, `${name}`')).toBe('obj, `obj`')
    expect(parseConsoleLogTemplate('params', "'${value}', '${name}'")).toBe("'params', 'params'")
  })

  it('Snippet 语法 - ${1:value} 替换', () => {
    expect(parseConsoleLogTemplate('obj', '${1:value}')).toBe('obj')
  })

  it('Snippet 语法 - ${1:name} 替换', () => {
    expect(parseConsoleLogTemplate('obj', '${1:name}')).toBe('obj')
  })

  it('Snippet 语法 - ${1:name:prefix,suffix} 替换', () => {
    expect(parseConsoleLogTemplate('obj', '${1:name:log_,}')).toBe('log_obj')
  })
})

describe('hasSnippetSyntax - Snippet 语法检测', () => {
  it('$n 格式 - 检测到 snippet', () => {
    expect(hasSnippetSyntax('$1')).toBe(true)
    expect(hasSnippetSyntax('$0')).toBe(true)
    expect(hasSnippetSyntax('text$2')).toBe(true)
  })

  it('${n:...} 格式 - 检测到 snippet', () => {
    expect(hasSnippetSyntax('${1:placeholder}')).toBe(true)
    expect(hasSnippetSyntax('${0}')).toBe(true)
  })

  it('无 snippet - 未检测到', () => {
    expect(hasSnippetSyntax('${value}')).toBe(false)
    expect(hasSnippetSyntax('${name}')).toBe(false)
    expect(hasSnippetSyntax('${name:pre,suf}')).toBe(false)
  })
})

describe('buildConsoleLogRegex - 匹配正则构建', () => {
  it('默认模板 - 匹配 console.log(obj, `obj`)', () => {
    const regex = buildConsoleLogRegex('${value}, `${name}`')
    expect(regex.test('console.log(obj, `obj`)')).toBe(true)
    expect(regex.test('  console.log(obj, `obj`)  ')).toBe(true)
    expect(regex.test('console.log(obj, `other`)')).toBe(true) // name 用 .+ 匹配
  })

  it('默认模板 - 不匹配其他 console.log', () => {
    const regex = buildConsoleLogRegex('${value}, `${name}`')
    expect(regex.test("console.log('other', x)")).toBe(false)
    expect(regex.test('console.log(obj)')).toBe(false)
  })

  it('${value} 模板 - 匹配 console.log(obj)', () => {
    const regex = buildConsoleLogRegex('${value}')
    expect(regex.test('console.log(obj)')).toBe(true)
    expect(regex.test('console.log(anything)')).toBe(true)
  })

  it('带前后缀模板 - 正确匹配', () => {
    const regex = buildConsoleLogRegex("'前置', ${value}, '后置'")
    expect(regex.test("console.log('前置', obj, '后置')")).toBe(true)
    expect(regex.test("console.log('前置', anything, '后置')")).toBe(true)
    expect(regex.test('console.log(obj)')).toBe(false)
  })

  it('Snippet 语法模板 - 正确清理并匹配', () => {
    const regex = buildConsoleLogRegex('${value}, `${name}`$0')
    expect(regex.test('console.log(obj, `obj`)')).toBe(true)
  })
})

describe('buildCommentConsoleLogRegex - 注释匹配正则', () => {
  it('// 行注释 - 匹配', () => {
    const regex = buildCommentConsoleLogRegex('${value}, `${name}`')
    expect(regex.test('// console.log(obj, `obj`)')).toBe(true)
    expect(regex.test('  // console.log(obj, `obj`)')).toBe(true)
    expect(regex.test('//console.log(obj, `obj`)')).toBe(true)
  })

  it('# 行注释 - 匹配', () => {
    const regex = buildCommentConsoleLogRegex('${value}, `${name}`')
    expect(regex.test('# console.log(obj, `obj`)')).toBe(true)
  })

  it('/* */ 块注释 - 匹配', () => {
    const regex = buildCommentConsoleLogRegex('${value}, `${name}`')
    expect(regex.test('/* console.log(obj, `obj`) */')).toBe(true)
    expect(regex.test('/*console.log(obj, `obj`)*/')).toBe(true)
    expect(regex.test('  /* console.log(obj, `obj`) */  ')).toBe(true)
  })

  it('未注释的 console.log - 不匹配', () => {
    const regex = buildCommentConsoleLogRegex('${value}, `${name}`')
    expect(regex.test('console.log(obj, `obj`)')).toBe(false)
  })
})

describe('extractClipboardText - 剪贴板提取', () => {
  it('${value} - 复制选中文本', () => {
    expect(extractClipboardText('params', '${value}')).toBe('params')
  })

  it('${name:prefix,suffix} - 复制带前后缀', () => {
    expect(extractClipboardText('params', '${name:log_,}')).toBe('log_params')
  })

  it('${line} - 复制完整 console.log 语句', () => {
    expect(extractClipboardText('params', '${line}', 'console.log(params, `params`)')).toBe(
      'console.log(params, `params`)'
    )
  })

  it('${line} 与其他变量组合', () => {
    expect(extractClipboardText('params', '${name}: ${line}', 'console.log(params, `params`)')).toBe(
      'params: console.log(params, `params`)'
    )
  })

  it('${line} 未提供 fullLine - 保留原样', () => {
    expect(extractClipboardText('params', '${line}')).toBe('${line}')
  })
})
