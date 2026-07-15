/**
 * DeepLX 翻译服务
 * 使用本地部署的 DeepLX 服务
 */

import { ITranslationService, TranslationResult } from './index'
import { fetchWithTimeout } from './utils'

export class DeepLXService implements ITranslationService {
  readonly type = 'deeplx' as const
  readonly name = 'DeepLX'

  private baseUrl: string
  private _available: boolean = true
  private _lastHealthCheck: number = 0
  private _healthCheckPromise: Promise<void> | null = null
  private static readonly HEALTH_CHECK_INTERVAL = 60_000

  constructor(baseUrl: string = 'http://127.0.0.1:1188') {
    this.baseUrl = baseUrl
  }

  /**
   * 异步健康检查（缓存结果，60秒内不重复检查）
   */
  private async checkHealth(): Promise<void> {
    const now = Date.now()
    if (now - this._lastHealthCheck < DeepLXService.HEALTH_CHECK_INTERVAL) return
    // 防止并发健康检查
    if (this._healthCheckPromise) return this._healthCheckPromise
    this._lastHealthCheck = now
    this._healthCheckPromise = (async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        await fetch(`${this.baseUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'ping', source_lang: 'EN', target_lang: 'EN' }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        this._available = true
      } catch {
        this._available = false
      } finally {
        this._healthCheckPromise = null
      }
    })()
    return this._healthCheckPromise
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await this.callDeepLXAPI(text)
      return {
        success: true,
        translatedText: result,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : 'DeepLX 翻译失败',
      }
    }
  }

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean {
    this.checkHealth() // 触发异步健康检查（有缓存）
    return this._available
  }

  /**
   * 调用 DeepLX API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callDeepLXAPI(text: string): Promise<string> {
    const response = await fetchWithTimeout(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        source_lang: 'AUTO',
        target_lang: 'EN',
      }),
    })

    if (!response.ok) {
      throw new Error('DeepLX API 请求失败')
    }

    const data = (await response.json()) as any

    if (data.code === 200 && data.data) {
      return data.data
    }

    throw new Error(data.message || '翻译结果为空')
  }
}
