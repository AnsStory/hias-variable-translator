/**
 * Bing / Azure Translator 服务
 * 使用 Azure Cognitive Services API
 */

import { ITranslationService, TranslationResult } from './index'
import { fetchWithTimeout } from './utils'

export class BingService implements ITranslationService {
  readonly type = 'bing' as const
  readonly name = 'Bing / Azure Translator'

  private apiKey: string
  private region: string

  constructor(apiKey: string, region: string = 'global') {
    this.apiKey = apiKey
    this.region = region
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await this.callBingAPI(text)
      return {
        success: true,
        translatedText: result,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : 'Bing 翻译失败',
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
   * 调用 Bing 翻译 API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callBingAPI(text: string): Promise<string> {
    const url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=en'

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Ocp-Apim-Subscription-Region': this.region,
      },
      body: JSON.stringify([{ Text: text }]),
    })

    if (!response.ok) {
      throw new Error(`Bing 翻译 API 请求失败 (HTTP ${response.status})`)
    }

    let data: any
    try {
      data = await response.json()
    } catch {
      throw new Error('Bing 翻译 API 返回无效 JSON')
    }

    if (data && data[0] && data[0].translations && data[0].translations.length > 0) {
      return data[0].translations[0].text
    }

    throw new Error('翻译结果为空')
  }
}
