/**
 * 撤回管理模块
 * 管理翻译操作的撤回，支持1分钟内的撤回操作
 */

/**
 * 撤回记录
 */
export interface UndoRecord {
  originalPath: string
  translatedPath: string
  timestamp: number
}

/**
 * 撤回管理器
 */
export class UndoManager {
  private records: Map<string, UndoRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  // 撤回有效期：1分钟
  private readonly UNDO_VALIDITY_PERIOD = 60 * 1000

  constructor() {
    this.startCleanupInterval()
  }

  /**
   * 添加撤回记录
   * @param originalPath 原始路径
   * @param translatedPath 翻译后的路径
   */
  addRecord(originalPath: string, translatedPath: string): void {
    const record: UndoRecord = {
      originalPath,
      translatedPath,
      timestamp: Date.now(),
    }

    this.records.set(translatedPath, record)
  }

  /**
   * 获取撤回记录
   * @param translatedPath 翻译后的路径
   * @returns 撤回记录，如果不存在或已过期则返回null
   */
  getRecord(translatedPath: string): UndoRecord | null {
    const record = this.records.get(translatedPath)

    if (!record) {
      return null
    }

    // 检查是否过期
    if (this.isExpired(record)) {
      this.records.delete(translatedPath)
      return null
    }

    return record
  }

  /**
   * 删除撤回记录
   * @param translatedPath 翻译后的路径
   */
  removeRecord(translatedPath: string): void {
    this.records.delete(translatedPath)
  }

  /**
   * 检查记录是否过期
   * @param record 撤回记录
   * @returns 是否过期
   */
  private isExpired(record: UndoRecord): boolean {
    return Date.now() - record.timestamp > this.UNDO_VALIDITY_PERIOD
  }

  /**
   * 启动清理定时器
   */
  private startCleanupInterval(): void {
    // 每30秒清理一次过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRecords()
    }, 30 * 1000)
  }

  /**
   * 清理过期记录
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now()

    for (const [key, record] of this.records.entries()) {
      if (now - record.timestamp > this.UNDO_VALIDITY_PERIOD) {
        this.records.delete(key)
      }
    }
  }

  /**
   * 关闭清理定时器
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.records.clear()
  }

  /**
   * 检查是否有可撤回的记录
   * @param translatedPath 翻译后的路径
   * @returns 是否有可撤回的记录
   */
  canUndo(translatedPath: string): boolean {
    return this.getRecord(translatedPath) !== null
  }

  /**
   * 获取所有有效的撤回记录
   * @returns 有效的撤回记录数组
   */
  getValidRecords(): UndoRecord[] {
    const validRecords: UndoRecord[] = []
    const now = Date.now()

    for (const record of this.records.values()) {
      if (now - record.timestamp <= this.UNDO_VALIDITY_PERIOD) {
        validRecords.push(record)
      }
    }

    return validRecords
  }
}
