/**
 * 命名格式转换模块测试
 * 测试 8 种命名格式转换和单词分割功能
 */

import { describe, it, expect } from 'vitest'
import { convertToFormat, splitIntoWords, NamingFormat } from '../../src/translate/namingConvention'

describe('convertToFormat - 命名格式转换', () => {
  const words = ['hello', 'world']

  it('camelCase - 小驼峰', () => {
    expect(convertToFormat(words, 'camelCase')).toBe('helloWorld')
  })

  it('PascalCase - 大驼峰', () => {
    expect(convertToFormat(words, 'PascalCase')).toBe('HelloWorld')
  })

  it('snake_case - 下划线分隔', () => {
    expect(convertToFormat(words, 'snake_case')).toBe('hello_world')
  })

  it('CONSTANT_CASE - 全大写下划线', () => {
    expect(convertToFormat(words, 'CONSTANT_CASE')).toBe('HELLO_WORLD')
  })

  it('param-case - 连字符分隔', () => {
    expect(convertToFormat(words, 'param-case')).toBe('hello-world')
  })

  it('Header-Case - 首字母大写连字符', () => {
    expect(convertToFormat(words, 'Header-Case')).toBe('Hello-World')
  })

  it('Capital Case - 首字母大写空格分隔', () => {
    expect(convertToFormat(words, 'Capital Case')).toBe('Hello World')
  })

  it('no case - 全小写空格分隔', () => {
    expect(convertToFormat(words, 'no case')).toBe('hello world')
  })

  it('originalValue - 原始值（首字母大写空格分隔）', () => {
    expect(convertToFormat(words, 'originalValue')).toBe('Hello World')
  })
})

describe('convertToFormat - 边界情况', () => {
  it('空数组 - 返回空字符串', () => {
    expect(convertToFormat([], 'camelCase')).toBe('')
  })

  it('单个单词 - 正确转换', () => {
    expect(convertToFormat(['hello'], 'camelCase')).toBe('hello')
    expect(convertToFormat(['hello'], 'PascalCase')).toBe('Hello')
    expect(convertToFormat(['hello'], 'CONSTANT_CASE')).toBe('HELLO')
  })

  it('三个单词 - 正确转换', () => {
    const words = ['user', 'full', 'name']
    expect(convertToFormat(words, 'camelCase')).toBe('userFullName')
    expect(convertToFormat(words, 'PascalCase')).toBe('UserFullName')
    expect(convertToFormat(words, 'snake_case')).toBe('user_full_name')
    expect(convertToFormat(words, 'CONSTANT_CASE')).toBe('USER_FULL_NAME')
    expect(convertToFormat(words, 'param-case')).toBe('user-full-name')
    expect(convertToFormat(words, 'Header-Case')).toBe('User-Full-Name')
  })

  it('大写单词 - 自动转换大小写', () => {
    const words = ['HELLO', 'WORLD']
    expect(convertToFormat(words, 'camelCase')).toBe('helloWorld')
    expect(convertToFormat(words, 'PascalCase')).toBe('HelloWorld')
    expect(convertToFormat(words, 'snake_case')).toBe('hello_world')
  })

  it('混合大小写 - 正确处理', () => {
    const words = ['HeLLo', 'WoRLd']
    expect(convertToFormat(words, 'camelCase')).toBe('helloWorld')
    expect(convertToFormat(words, 'snake_case')).toBe('hello_world')
  })
})

describe('splitIntoWords - 单词分割', () => {
  it('驼峰命名 - 正确分割', () => {
    expect(splitIntoWords('helloWorld')).toEqual(['hello', 'World'])
    expect(splitIntoWords('userFullName')).toEqual(['user', 'Full', 'Name'])
  })

  it('下划线命名 - 正确分割', () => {
    expect(splitIntoWords('hello_world')).toEqual(['hello', 'world'])
    expect(splitIntoWords('user_full_name')).toEqual(['user', 'full', 'name'])
  })

  it('连字符命名 - 正确分割', () => {
    expect(splitIntoWords('hello-world')).toEqual(['hello', 'world'])
    expect(splitIntoWords('user-full-name')).toEqual(['user', 'full', 'name'])
  })

  it('空格分隔 - 正确分割', () => {
    expect(splitIntoWords('hello world')).toEqual(['hello', 'world'])
  })

  it('多个空格 - 过滤空字符串', () => {
    expect(splitIntoWords('hello  world')).toEqual(['hello', 'world'])
  })

  it('混合分隔符 - 正确处理', () => {
    expect(splitIntoWords('helloWorld_test')).toEqual(['hello', 'World', 'test'])
  })

  it('空字符串 - 返回空数组', () => {
    expect(splitIntoWords('')).toEqual([])
  })

  it('单个单词 - 返回单元素数组', () => {
    expect(splitIntoWords('hello')).toEqual(['hello'])
  })
})

describe('splitIntoWords + convertToFormat - 端到端转换', () => {
  it('驼峰转蛇形', () => {
    const words = splitIntoWords('userFullName')
    expect(convertToFormat(words, 'snake_case')).toBe('user_full_name')
  })

  it('蛇形转驼峰', () => {
    const words = splitIntoWords('user_full_name')
    expect(convertToFormat(words, 'camelCase')).toBe('userFullName')
  })

  it('连字符转大写常量', () => {
    const words = splitIntoWords('api-key')
    expect(convertToFormat(words, 'CONSTANT_CASE')).toBe('API_KEY')
  })

  it('中文翻译结果 - 英文单词转换', () => {
    // 模拟翻译结果 "user name" 转换为各格式
    const words = splitIntoWords('user name')
    expect(convertToFormat(words, 'camelCase')).toBe('userName')
    expect(convertToFormat(words, 'PascalCase')).toBe('UserName')
    expect(convertToFormat(words, 'snake_case')).toBe('user_name')
  })
})

describe('FILE_FORMAT_OPTIONS 和 TEXT_FORMAT_OPTIONS', () => {
  it('FILE_FORMAT_OPTIONS - 包含 6 种格式', async () => {
    const { FILE_FORMAT_OPTIONS } = await import('../../src/translate/namingConvention')
    expect(FILE_FORMAT_OPTIONS).toHaveLength(6)
    expect(FILE_FORMAT_OPTIONS.map((o) => o.value)).toEqual([
      'camelCase',
      'PascalCase',
      'snake_case',
      'CONSTANT_CASE',
      'param-case',
      'Header-Case',
    ])
  })

  it('TEXT_FORMAT_OPTIONS - 包含 8 种格式（文件 + Capital Case + no case）', async () => {
    const { TEXT_FORMAT_OPTIONS } = await import('../../src/translate/namingConvention')
    expect(TEXT_FORMAT_OPTIONS).toHaveLength(8)
    expect(TEXT_FORMAT_OPTIONS.map((o) => o.value)).toContain('Capital Case')
    expect(TEXT_FORMAT_OPTIONS.map((o) => o.value)).toContain('no case')
  })
})
