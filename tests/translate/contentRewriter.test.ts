/**
 * 新建文件内容替换模块测试
 * 覆盖翻译前路径段 -> 翻译后段的内容替换纯函数
 */

import { describe, it, expect } from 'vitest'
import { buildSegmentPairs, replaceContentSegments, containsOriginalSegments } from '../../src/translate/contentRewriter'

describe('buildSegmentPairs - 段映射收集', () => {
  it('过滤空值与前后相同的项', () => {
    const pairs = [
      { original: '用户', translated: 'User' },
      { original: '', translated: 'X' },
      { original: '信息', translated: '' },
      { original: 'a', translated: 'a' },
    ]
    expect(buildSegmentPairs(pairs)).toEqual([{ original: '用户', translated: 'User' }])
  })

  it('同一原文去重保留首个', () => {
    const pairs = [
      { original: '用户', translated: 'User' },
      { original: '用户', translated: 'Consumer' },
    ]
    expect(buildSegmentPairs(pairs)).toEqual([{ original: '用户', translated: 'User' }])
  })
})

describe('replaceContentSegments - 内容替换', () => {
  it('Java 模板：package 与类名全部替换', () => {
    const pairs = [
      { original: '用户', translated: 'User' },
      { original: '信息', translated: 'Information' },
    ]
    const content = 'package 用户.信息;\n\npublic class 用户 {\n\n}\n'
    expect(replaceContentSegments(content, pairs)).toBe('package User.Information;\n\npublic class User {\n\n}\n')
  })

  it('长段优先：短段不得截胡长段的一部分', () => {
    const pairs = [
      { original: '用户', translated: 'User' },
      { original: '用户信息', translated: 'UserInfo' },
    ]
    const content = 'class 用户信息 { /* 用户 */ }'
    expect(replaceContentSegments(content, pairs)).toBe('class UserInfo { /* User */ }')
  })

  it('无匹配时原样返回', () => {
    const pairs = [{ original: '用户', translated: 'User' }]
    expect(replaceContentSegments('public class Foo {}', pairs)).toBe('public class Foo {}')
  })

  it('空段映射不改动内容', () => {
    expect(replaceContentSegments('anything', [])).toBe('anything')
  })

  it('混合中英文段名替换', () => {
    const pairs = [{ original: '订单Service', translated: 'OrderService' }]
    expect(replaceContentSegments('class 订单Service implements 订单Service {}', pairs)).toBe('class OrderService implements OrderService {}')
  })
})

describe('containsOriginalSegments - 残留检测', () => {
  it('含翻译前段返回 true', () => {
    expect(containsOriginalSegments('package 用户;', [{ original: '用户', translated: 'User' }])).toBe(true)
  })

  it('全部替换后返回 false', () => {
    expect(containsOriginalSegments('package User;', [{ original: '用户', translated: 'User' }])).toBe(false)
  })

  it('无效段映射（前后相同）不误报', () => {
    expect(containsOriginalSegments('a', [{ original: 'a', translated: 'a' }])).toBe(false)
  })
})
