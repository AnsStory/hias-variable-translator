/**
 * 非英文字符检测模块测试
 * 测试中文、日文、韩文等非 ASCII 字符的检测功能
 */

import { describe, it, expect } from 'vitest'
import { containsNonEnglish } from '../../src/translate/chineseDetector'

describe('containsNonEnglish - 非英文字符检测', () => {
  describe('中文字符', () => {
    it('纯中文 - 返回 true', () => {
      expect(containsNonEnglish('你好世界')).toBe(true)
      expect(containsNonEnglish('用户名称')).toBe(true)
    })

    it('中文 + 英文 - 返回 true', () => {
      expect(containsNonEnglish('hello世界')).toBe(true)
      expect(containsNonEnglish('用户name')).toBe(true)
      expect(containsNonEnglish('test测试test')).toBe(true)
    })
  })

  describe('日文字符', () => {
    it('平假名 - 返回 true', () => {
      expect(containsNonEnglish('こんにちは')).toBe(true)
    })

    it('片假名 - 返回 true', () => {
      expect(containsNonEnglish('コンニチハ')).toBe(true)
    })
  })

  describe('韩文字符', () => {
    it('韩文 - 返回 true', () => {
      expect(containsNonEnglish('안녕하세요')).toBe(true)
    })
  })

  describe('纯英文内容', () => {
    it('纯英文字母 - 返回 false', () => {
      expect(containsNonEnglish('hello')).toBe(false)
      expect(containsNonEnglish('HelloWorld')).toBe(false)
    })

    it('英文 + 数字 - 返回 false', () => {
      expect(containsNonEnglish('hello123')).toBe(false)
      expect(containsNonEnglish('user42')).toBe(false)
    })

    it('英文 + 符号 - 返回 false', () => {
      expect(containsNonEnglish('hello-world')).toBe(false)
      expect(containsNonEnglish('user_name')).toBe(false)
      expect(containsNonEnglish('test.js')).toBe(false)
    })

    it('空字符串 - 返回 false', () => {
      expect(containsNonEnglish('')).toBe(false)
    })
  })

  describe('特殊字符', () => {
    it('Emoji - 返回 true（非 ASCII）', () => {
      expect(containsNonEnglish('hello🎉')).toBe(true)
    })

    it('俄文 - 返回 true', () => {
      expect(containsNonEnglish('Привет')).toBe(true)
    })

    it('阿拉伯文 - 返回 true', () => {
      expect(containsNonEnglish('مرحبا')).toBe(true)
    })
  })

  describe('文件路径检测', () => {
    it('中文文件名 - 返回 true', () => {
      expect(containsNonEnglish('用户信息.ts')).toBe(true)
      expect(containsNonEnglish('测试文件.js')).toBe(true)
    })

    it('中文目录名 - 返回 true', () => {
      expect(containsNonEnglish('src/组件/User.vue')).toBe(true)
    })

    it('纯英文路径 - 返回 false', () => {
      expect(containsNonEnglish('src/components/User.vue')).toBe(false)
      expect(containsNonEnglish('user-info.ts')).toBe(false)
    })
  })
})
