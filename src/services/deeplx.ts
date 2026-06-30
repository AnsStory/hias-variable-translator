/**
 * DeepLX 翻译服务
 * 使用本地部署的 DeepLX 服务
 */

import { ITranslationService, TranslationResult } from './index'

export class DeepLXService implements ITranslationService {
  readonly type = 'deeplx' as const
  readonly name = 'DeepLX'

  private baseUrl: string

  constructor(baseUrl: string = 'http://127.0.0.1:1188') {
    this.baseUrl = baseUrl
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
    return true // 假设本地服务始终可用
  }

  /**
   * 调用 DeepLX API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callDeepLXAPI(text: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/translate`, {
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
