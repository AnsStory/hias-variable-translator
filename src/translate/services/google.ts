/**
 * 谷歌翻译服务
 * 使用官方 Google Cloud Translation API v2（需要 API Key）
 * 申请方式：在 Google Cloud Console 启用 Cloud Translation API 后创建 API Key
 */

import { ITranslationService, TranslationResult } from './index'
import { fetchWithTimeout } from './utils'

export class GoogleService implements ITranslationService {
  readonly type = 'google' as const
  readonly name = '谷歌翻译'

  private apiKey: string

  constructor(apiKey: string = '') {
    this.apiKey = apiKey
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await this.callGoogleAPI(text)
      return {
        success: true,
        translatedText: result,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : '谷歌翻译失败',
      }
    }
  }

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * 调用官方 Google Cloud Translation API v2
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callGoogleAPI(text: string): Promise<string> {
    // 官方接口：https://cloud.google.com/translate/docs/reference/rest/v2/translate
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(this.apiKey)}`

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: 'en',
        format: 'text',
        // 省略 source 让 API 自动检测源语言
      }),
    })

    if (!response.ok) {
      // 尝试解析官方错误结构，给出更明确的提示
      let message = `谷歌翻译 API 请求失败 (HTTP ${response.status})`
      try {
        const errData: any = await response.json()
        if (errData?.error?.message) {
          message = `谷歌翻译 API 错误: ${errData.error.message}`
        }
      } catch {
        // 忽略错误解析失败
      }
      throw new Error(message)
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      throw new Error('谷歌翻译 API 返回无效 JSON')
    }

    const translations = data?.data?.translations
    if (Array.isArray(translations) && translations.length > 0 && typeof translations[0].translatedText === 'string') {
      return translations[0].translatedText
    }

    throw new Error('翻译结果为空')
  }
}
