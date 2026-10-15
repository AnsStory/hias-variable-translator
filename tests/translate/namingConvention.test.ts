/**
 * 命名格式转换模块测试
 * 测试 9 种命名格式转换和单词分割功能
 */

import * as path from 'path'
import { describe, it, expect } from 'vitest'
import {
  convertToFormat,
  splitIntoWords,
  splitIntoWordsForFileName,
  detectTrailingFormatDigit,
  detectPathSegmentShortcuts,
  resolveSegmentFormats,
  FILE_FORMAT_OPTIONS,
  TEXT_FORMAT_OPTIONS,
  NamingFormat,
} from '../../src/translate/namingConvention'

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

  it('Sentence case - 仅整句首字母大写空格分隔', () => {
    expect(convertToFormat(words, 'Sentence case')).toBe('Hello world')
    expect(convertToFormat(['user', 'full', 'name'], 'Sentence case')).toBe('User full name')
    expect(convertToFormat(['HELLO', 'WORLD'], 'Sentence case')).toBe('Hello world')
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

describe('splitIntoWordsForFileName - 文件名专用分割（字符净化）', () => {
  it('词内撇号删除 - 保留单词完整性', () => {
    expect(splitIntoWordsForFileName("user's")).toEqual(['users'])
    expect(splitIntoWordsForFileName("user's data")).toEqual(['users', 'data'])
    expect(splitIntoWordsForFileName("don't stop")).toEqual(['dont', 'stop'])
  })

  it('多种撇号变体 - 统一删除', () => {
    expect(splitIntoWordsForFileName('it’s ＇fine` now')).toEqual(['its', 'fine', 'now'])
  })

  it('标点符号 - 视作分隔符', () => {
    expect(splitIntoWordsForFileName('hello, world!')).toEqual(['hello', 'world'])
    expect(splitIntoWordsForFileName('user (full) name')).toEqual(['user', 'full', 'name'])
    expect(splitIntoWordsForFileName('a/b:c')).toEqual(['a', 'b', 'c'])
  })

  it('数字保留 - 不被过滤', () => {
    expect(splitIntoWordsForFileName('version 2 test')).toEqual(['version', '2', 'test'])
  })

  it('驼峰/下划线/连字符 - 兼容原有拆分', () => {
    expect(splitIntoWordsForFileName('helloWorld_test-case')).toEqual(['hello', 'World', 'test', 'case'])
  })

  it('纯符号 - 返回空数组（触发回退原名）', () => {
    expect(splitIntoWordsForFileName('***')).toEqual([])
    expect(splitIntoWordsForFileName("'''")).toEqual([])
  })

  it('端到端 - 带撇号转各命名格式', () => {
    const words = splitIntoWordsForFileName("user's profile")
    expect(convertToFormat(words, 'camelCase')).toBe('usersProfile')
    expect(convertToFormat(words, 'snake_case')).toBe('users_profile')
    expect(convertToFormat(words, 'param-case')).toBe('users-profile')
  })
})

describe('选中内容去符号格式化 - 端到端（application/json 场景）', () => {
  it('斜杠分隔 → camelCase', () => {
    expect(convertToFormat(splitIntoWordsForFileName('application/json'), 'camelCase')).toBe('applicationJson')
  })

  it('多种复杂符号混合 → 各命名格式', () => {
    const words = splitIntoWordsForFileName('application/vnd.api+json@2.0')
    expect(words).toEqual(['application', 'vnd', 'api', 'json', '2', '0'])
    expect(convertToFormat(words, 'camelCase')).toBe('applicationVndApiJson20')
    expect(convertToFormat(words, 'PascalCase')).toBe('ApplicationVndApiJson20')
    expect(convertToFormat(words, 'snake_case')).toBe('application_vnd_api_json_2_0')
    expect(convertToFormat(words, 'CONSTANT_CASE')).toBe('APPLICATION_VND_API_JSON_2_0')
    expect(convertToFormat(words, 'param-case')).toBe('application-vnd-api-json-2-0')
    expect(convertToFormat(words, 'Header-Case')).toBe('Application-Vnd-Api-Json-2-0')
    expect(convertToFormat(words, 'Capital Case')).toBe('Application Vnd Api Json 2 0')
    expect(convertToFormat(words, 'no case')).toBe('application vnd api json 2 0')
    expect(convertToFormat(words, 'Sentence case')).toBe('Application vnd api json 2 0')
  })

  it('已带分隔符的命名互转', () => {
    expect(convertToFormat(splitIntoWordsForFileName('user_name.test'), 'camelCase')).toBe('userNameTest')
    expect(convertToFormat(splitIntoWordsForFileName('HTTP Status/Code'), 'camelCase')).toBe('httpStatusCode')
  })

  it('纯符号（无可格式化文字）→ 空数组', () => {
    expect(splitIntoWordsForFileName('///')).toEqual([])
    expect(splitIntoWordsForFileName(' - @#$% ')).toEqual([])
  })

  it('尾部快捷数字剥离后仍按符号切分', () => {
    const shortcut = detectTrailingFormatDigit('application/json1', TEXT_FORMAT_OPTIONS)
    expect(shortcut).toEqual({ format: 'camelCase', baseName: 'application/json', raw: 'application/json1' })
    expect(convertToFormat(splitIntoWordsForFileName(shortcut!.baseName), shortcut!.format)).toBe('applicationJson')
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

  it('TEXT_FORMAT_OPTIONS - 包含 9 种格式（文件 + Capital Case + no case + Sentence case）', async () => {
    const { TEXT_FORMAT_OPTIONS } = await import('../../src/translate/namingConvention')
    expect(TEXT_FORMAT_OPTIONS).toHaveLength(9)
    expect(TEXT_FORMAT_OPTIONS.map((o) => o.value)).toContain('Capital Case')
    expect(TEXT_FORMAT_OPTIONS.map((o) => o.value)).toContain('no case')
    expect(TEXT_FORMAT_OPTIONS.map((o) => o.value)).toContain('Sentence case')
  })
})

describe('detectTrailingFormatDigit - 尾部数字快捷选格式', () => {
  it('文件场景 - 1-6 命中对应格式并剥离数字', () => {
    const cases: [string, NamingFormat, string][] = [
      ['用户1', 'camelCase', '用户'],
      ['用户2', 'PascalCase', '用户'],
      ['用户3', 'snake_case', '用户'],
      ['用户4', 'CONSTANT_CASE', '用户'],
      ['用户5', 'param-case', '用户'],
      ['用户6', 'Header-Case', '用户'],
    ]
    for (const [text, format, baseName] of cases) {
      expect(detectTrailingFormatDigit(text, FILE_FORMAT_OPTIONS)).toEqual({ format, baseName, raw: text })
    }
  })

  it('文件场景 - 7/8/9 超出选项范围不生效', () => {
    expect(detectTrailingFormatDigit('用户7', FILE_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('用户8', FILE_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('用户9', FILE_FORMAT_OPTIONS)).toBeUndefined()
  })

  it('文本场景 - 7/8/9 命中 Capital Case、no case 与 Sentence case', () => {
    expect(detectTrailingFormatDigit('用户7', TEXT_FORMAT_OPTIONS)).toEqual({ format: 'Capital Case', baseName: '用户', raw: '用户7' })
    expect(detectTrailingFormatDigit('用户8', TEXT_FORMAT_OPTIONS)).toEqual({ format: 'no case', baseName: '用户', raw: '用户8' })
    expect(detectTrailingFormatDigit('用户9', TEXT_FORMAT_OPTIONS)).toEqual({ format: 'Sentence case', baseName: '用户', raw: '用户9' })
  })

  it('连续多位数字不生效（仅孤立末尾数字有效）', () => {
    expect(detectTrailingFormatDigit('用户12', FILE_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('用户18', TEXT_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('用户19', TEXT_FORMAT_OPTIONS)).toBeUndefined()
  })

  it('0 或无数字不生效', () => {
    expect(detectTrailingFormatDigit('用户0', TEXT_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('用户', FILE_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('用户信息', TEXT_FORMAT_OPTIONS)).toBeUndefined()
  })

  it('数字不在末尾或位于开头不生效', () => {
    expect(detectTrailingFormatDigit('用户1信息', FILE_FORMAT_OPTIONS)).toBeUndefined()
    expect(detectTrailingFormatDigit('1用户', FILE_FORMAT_OPTIONS)).toBeUndefined()
  })

  it('剥离后为空不生效', () => {
    expect(detectTrailingFormatDigit('1', TEXT_FORMAT_OPTIONS)).toBeUndefined()
  })

  it('中英文混合与含空格文本 - 数字仍按末尾规则剥离', () => {
    expect(detectTrailingFormatDigit('use用户1', TEXT_FORMAT_OPTIONS)).toEqual({ format: 'camelCase', baseName: 'use用户', raw: 'use用户1' })
    expect(detectTrailingFormatDigit('用户 2', TEXT_FORMAT_OPTIONS)).toEqual({ format: 'PascalCase', baseName: '用户 ', raw: '用户 2' })
  })

  it('路径场景配合 extname 只看最后一段', () => {
    // '用户/信息/用户.java' 中名称主体末段无数字 → 不生效
    const relFile = path.join('用户', '信息', '用户.java')
    const ext = path.extname(relFile)
    const body = relFile.slice(0, -ext.length)
    const lastSeg = body.split(path.sep).pop()!
    expect(detectTrailingFormatDigit(lastSeg, FILE_FORMAT_OPTIONS)).toBeUndefined()

    // '用户/信息/用户1.java' → camelCase + '用户'
    const relFile1 = path.join('用户', '信息', '用户1.java')
    const ext1 = path.extname(relFile1)
    const body1 = relFile1.slice(0, -ext1.length)
    const lastSeg1 = body1.split(path.sep).pop()!
    expect(detectTrailingFormatDigit(lastSeg1, FILE_FORMAT_OPTIONS)).toEqual({ format: 'camelCase', baseName: '用户', raw: '用户1' })
  })
})

describe('detectPathSegmentShortcuts + resolveSegmentFormats - 路径级分段格式', () => {
  const resolve = (nameWithoutExt: string, pickedFormat: NamingFormat) => {
    const { shortcuts } = detectPathSegmentShortcuts(nameWithoutExt, FILE_FORMAT_OPTIONS)
    const last = shortcuts[shortcuts.length - 1]
    return resolveSegmentFormats(shortcuts, last ? last.format : pickedFormat)
  }

  it("'用户/信息/用户2.java' → 全 PascalCase（文件段数字兜底）", () => {
    expect(resolve('用户/信息/用户2', 'CONSTANT_CASE')).toEqual(['PascalCase', 'PascalCase', 'PascalCase'])
  })

  it("'用户/信息1/用户2.java' → 目录 camelCase（用户继承信息1），文件 PascalCase", () => {
    expect(resolve('用户/信息1/用户2', 'CONSTANT_CASE')).toEqual(['camelCase', 'camelCase', 'PascalCase'])
  })

  it("'用户/信息1/用户.java'（弹窗选 snake_case）→ 目录 camelCase，文件段用弹窗", () => {
    expect(resolve('用户/信息1/用户', 'snake_case')).toEqual(['camelCase', 'camelCase', 'snake_case'])
  })

  it("'用户12/信息/用户.java' → 连续数字按字面，全部弹窗格式", () => {
    expect(resolve('用户12/信息/用户', 'Header-Case')).toEqual(['Header-Case', 'Header-Case', 'Header-Case'])
  })

  it('点号子段独立判定：用户2.信息1 → 各取自身数字，最上游继承下游', () => {
    expect(resolve('用户/用户2.信息1', 'CONSTANT_CASE')).toEqual(['PascalCase', 'PascalCase', 'camelCase'])
  })
})

describe('resolveSegmentFormats - 分段格式倒推继承', () => {
  const camel = detectTrailingFormatDigit('信息1', FILE_FORMAT_OPTIONS)
  const pascal = detectTrailingFormatDigit('用户2', FILE_FORMAT_OPTIONS)

  it("'用户/信息/用户2.java'：无数字段回落到文件段格式（全 PascalCase）", () => {
    expect(resolveSegmentFormats([undefined, undefined, pascal], 'PascalCase')).toEqual(['PascalCase', 'PascalCase', 'PascalCase'])
  })

  it("'用户/信息1/用户2.java'：前段继承最近下游带数字段，文件段用自己的数字", () => {
    expect(resolveSegmentFormats([undefined, camel, pascal], 'PascalCase')).toEqual(['camelCase', 'camelCase', 'PascalCase'])
  })

  it("'用户/信息1/用户.java'（弹窗选 snake_case）：弹窗只兜底文件段，前段仍继承目录数字", () => {
    expect(resolveSegmentFormats([undefined, camel, undefined], 'snake_case')).toEqual(['camelCase', 'camelCase', 'snake_case'])
  })

  it('全无数字：所有段沿用弹窗格式', () => {
    expect(resolveSegmentFormats([undefined, undefined, undefined], 'CONSTANT_CASE')).toEqual(['CONSTANT_CASE', 'CONSTANT_CASE', 'CONSTANT_CASE'])
  })

  it('单一片段：直接取文件段格式', () => {
    expect(resolveSegmentFormats([camel], 'PascalCase')).toEqual(['PascalCase'])
  })
})
