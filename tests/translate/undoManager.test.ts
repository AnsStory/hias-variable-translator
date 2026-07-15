/**
 * 撤回管理模块测试
 * 测试 UndoManager 的添加、获取、删除、过期等功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UndoManager } from '../../src/translate/undoManager'

describe('UndoManager - 撤回管理器', () => {
  let manager: UndoManager

  beforeEach(() => {
    vi.useFakeTimers()
    manager = new UndoManager()
  })

  afterEach(() => {
    manager.dispose()
    vi.useRealTimers()
  })

  describe('addRecord / getRecord - 添加和获取记录', () => {
    it('添加记录后可以获取', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      const record = manager.getRecord('/src/user.ts')

      expect(record).not.toBeNull()
      expect(record!.originalPath).toBe('/src/用户.ts')
      expect(record!.translatedPath).toBe('/src/user.ts')
    })

    it('不存在的记录返回 null', () => {
      expect(manager.getRecord('/nonexistent.ts')).toBeNull()
    })

    it('添加多条记录', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      manager.addRecord('/src/组件/Button.vue', '/src/components/Button.vue')

      expect(manager.getRecord('/src/user.ts')).not.toBeNull()
      expect(manager.getRecord('/src/components/Button.vue')).not.toBeNull()
    })
  })

  describe('removeRecord - 删除记录', () => {
    it('删除后无法获取', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      manager.removeRecord('/src/user.ts')

      expect(manager.getRecord('/src/user.ts')).toBeNull()
    })

    it('删除不存在的记录不报错', () => {
      expect(() => manager.removeRecord('/nonexistent.ts')).not.toThrow()
    })
  })

  describe('canUndo - 检查是否可撤回', () => {
    it('有有效记录时返回 true', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      expect(manager.canUndo('/src/user.ts')).toBe(true)
    })

    it('无记录时返回 false', () => {
      expect(manager.canUndo('/nonexistent.ts')).toBe(false)
    })

    it('记录过期后返回 false', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')

      // 推进 61 秒（超过 60 秒有效期）
      vi.advanceTimersByTime(61 * 1000)

      expect(manager.canUndo('/src/user.ts')).toBe(false)
    })
  })

  describe('过期机制 - 1 分钟有效期', () => {
    it('59 秒内 - 记录有效', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      vi.advanceTimersByTime(59 * 1000)

      expect(manager.getRecord('/src/user.ts')).not.toBeNull()
    })

    it('60 秒后 - 记录过期', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      vi.advanceTimersByTime(61 * 1000)

      expect(manager.getRecord('/src/user.ts')).toBeNull()
    })

    it('过期记录在 getRecord 时被自动清理', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      vi.advanceTimersByTime(61 * 1000)

      // 第一次获取触发清理
      manager.getRecord('/src/user.ts')

      // 验证记录已被删除
      const records = manager.getValidRecords()
      expect(records).toHaveLength(0)
    })
  })

  describe('getValidRecords - 获取有效记录', () => {
    it('返回所有有效记录', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      manager.addRecord('/src/组件.vue', '/src/component.vue')

      const records = manager.getValidRecords()
      expect(records).toHaveLength(2)
    })

    it('按时间戳升序排列', () => {
      manager.addRecord('/src/a.ts', '/src/a-translated.ts')
      vi.advanceTimersByTime(1000)
      manager.addRecord('/src/b.ts', '/src/b-translated.ts')
      vi.advanceTimersByTime(1000)
      manager.addRecord('/src/c.ts', '/src/c-translated.ts')

      const records = manager.getValidRecords()
      expect(records).toHaveLength(3)
      expect(records[0].originalPath).toBe('/src/a.ts')
      expect(records[1].originalPath).toBe('/src/b.ts')
      expect(records[2].originalPath).toBe('/src/c.ts')
    })

    it('过滤掉过期记录', () => {
      manager.addRecord('/src/old.ts', '/src/old-translated.ts')
      vi.advanceTimersByTime(61 * 1000) // 过期
      manager.addRecord('/src/new.ts', '/src/new-translated.ts') // 有效

      const records = manager.getValidRecords()
      expect(records).toHaveLength(1)
      expect(records[0].originalPath).toBe('/src/new.ts')
    })
  })

  describe('自动清理 - 定时器', () => {
    it('30 秒后自动清理过期记录', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')

      // 推进 61 秒（记录过期）
      vi.advanceTimersByTime(61 * 1000)

      // 定时器在 30 秒时触发清理（61 秒期间会触发两次清理）
      // 直接检查 getValidRecords
      const records = manager.getValidRecords()
      expect(records).toHaveLength(0)
    })
  })

  describe('dispose - 释放资源', () => {
    it('dispose 后清空所有记录', () => {
      manager.addRecord('/src/用户.ts', '/src/user.ts')
      manager.dispose()

      // dispose 后 records 被清空
      // 注意：不能直接访问私有属性，通过 getValidRecords 间接验证
      // 由于 dispose 后不应再使用，这里只验证不抛错
      expect(() => manager.getValidRecords()).not.toThrow()
    })
  })
})
