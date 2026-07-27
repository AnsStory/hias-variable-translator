/**
 * 撤回管理模块
 * 管理翻译操作的撤回，支持1分钟内的撤回操作
 */

/**
 * 撤回记录（文件翻译）
 */
export interface UndoRecord {
  originalPath: string
  translatedPath: string
  timestamp: number
  /** 翻译时创建的目录（只包含翻译文件的目录，不包含用户原有目录） */
  createdDirs: string[]
}

/**
 * 撤回管理器
 */
export class UndoManager {
  private records: Map<string, UndoRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private expiryTimers: Set<NodeJS.Timeout> = new Set()
  private stateChangeListener: ((isUndoWindowActive: boolean) => void) | null = null

  // 撤回窗口结束时刻：最近一条记录的过期时间点。撤回完成后窗口未结束前仍保持激活，
  // 避免重复按 Ctrl+Z 落到 VSCode 原生文件撤销上（原生撤销栈中“创建原始文件”的记录
  // 在翻译重命名后已失效，触发会报“文件不存在无法删除”）
  private undoWindowEnd = 0

  // 撤回有效期：1分钟
  private readonly UNDO_VALIDITY_PERIOD = 60 * 1000

  constructor() {
    this.startCleanupInterval()
  }

  /**
   * 注册状态变化监听器
   * 在撤回窗口状态可能变化时触发（新增、删除、过期、释放），用于同步外部状态（如 VSCode context key）
   * @param listener 监听回调，参数为撤回窗口当前是否激活（记录被撤回后到窗口结束前仍为 true）
   */
  onStateChange(listener: (isUndoWindowActive: boolean) => void): void {
    this.stateChangeListener = listener
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    this.stateChangeListener?.(Date.now() < this.undoWindowEnd)
  }

  /**
   * 添加撤回记录
   * @param originalPath 原始路径
   * @param translatedPath 翻译后的路径
   * @param createdDirs 翻译时创建的目录列表
   */
  addRecord(originalPath: string, translatedPath: string, createdDirs: string[] = []): void {
    const record: UndoRecord = {
      originalPath,
      translatedPath,
      timestamp: Date.now(),
      createdDirs,
    }

    this.records.set(translatedPath, record)
    this.undoWindowEnd = Math.max(this.undoWindowEnd, record.timestamp + this.UNDO_VALIDITY_PERIOD)

    // 到期后精确清理并刷新状态（避免依赖 30 秒清理间隔导致状态滞后）
    const timer = setTimeout(() => {
      this.expiryTimers.delete(timer)
      this.cleanupExpiredRecords()
    }, this.UNDO_VALIDITY_PERIOD + 100)
    this.expiryTimers.add(timer)

    this.notifyStateChange()
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
      this.notifyStateChange()
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
    this.notifyStateChange()
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

    // 无论是否删除了记录都刷新状态：记录被撤回消耗后窗口到期时也需要将 context 置为 false
    this.notifyStateChange()
  }

  /**
   * 关闭清理定时器
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    for (const timer of this.expiryTimers) {
      clearTimeout(timer)
    }
    this.expiryTimers.clear()
    this.records.clear()
    this.undoWindowEnd = 0
    this.notifyStateChange()
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
   * 获取所有有效的撤回记录（按时间戳升序排列）
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

    // 按时间戳升序排列，确保最后一条是最新的
    validRecords.sort((a, b) => a.timestamp - b.timestamp)

    return validRecords
  }
}
