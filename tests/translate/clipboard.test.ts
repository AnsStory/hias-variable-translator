/**
 * 剪贴板工具模块测试
 * 测试 reorderFormats 格式重排功能
 */

import { describe, it, expect, vi } from 'vitest'

// Mock vscode 模块（clipboard.ts 依赖 vscode）
vi.mock('vscode', () => ({
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
  },
}))

const { reorderFormats } = await import('../../src/translate/clipboard')

describe('reorderFormats - 格式重排', () => {
  it('用户选择的格式排第一', () => {
    const formats = ['camelCase', 'snake_case', 'PascalCase'] as const
    const result = reorderFormats([...formats], 'snake_case')

    // 用户选择的 snake_case 排第一，然后去重，最后反转
    // [snake_case, camelCase, PascalCase] → 反转 → [PascalCase, camelCase, snake_case]
    expect(result).toEqual(['PascalCase', 'camelCase', 'snake_case'])
  })

  it('去重 - 不重复包含用户选择的格式', () => {
    const formats = ['camelCase', 'snake_case', 'camelCase'] as const
    const result = reorderFormats([...formats], 'camelCase')

    // [camelCase, snake_case] → 反转 → [snake_case, camelCase]
    expect(result).toEqual(['snake_case', 'camelCase'])
  })

  it('用户选择不在列表中 - 添加到开头后反转', () => {
    const formats = ['camelCase', 'snake_case'] as const
    const result = reorderFormats([...formats], 'PascalCase')

    // [PascalCase, camelCase, snake_case] → 反转 → [snake_case, camelCase, PascalCase]
    expect(result).toEqual(['snake_case', 'camelCase', 'PascalCase'])
  })

  it('单个格式 - 返回单元素数组', () => {
    const result = reorderFormats(['camelCase'], 'camelCase')
    expect(result).toEqual(['camelCase'])
  })

  it('空列表 + 用户选择 - 只返回用户选择', () => {
    const result = reorderFormats([], 'camelCase')
    expect(result).toEqual(['camelCase'])
  })

  it('完整格式列表 - 正确重排', () => {
    const allFormats = [
      'camelCase',
      'PascalCase',
      'snake_case',
      'CONSTANT_CASE',
      'param-case',
      'Header-Case',
    ] as const
    const result = reorderFormats([...allFormats], 'snake_case')

    // 用户选择排第一: [snake_case, camelCase, PascalCase, CONSTANT_CASE, param-case, Header-Case]
    // 反转: [Header-Case, param-case, CONSTANT_CASE, PascalCase, camelCase, snake_case]
    expect(result[0]).toBe('Header-Case')
    expect(result[result.length - 1]).toBe('snake_case')
  })
})
