/**
 * 谷歌翻译服务
 * 使用免费的谷歌翻译 API（有限制）
 */

import { ITranslationService, TranslationResult } from './index'

export class GoogleService implements ITranslationService {
  readonly type = 'google' as const
  readonly name = '谷歌翻译'

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
    return true // 免费服务，始终可用
  }

  /**
   * 调用谷歌翻译 API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callGoogleAPI(text: string): Promise<string> {
    // 使用免费的谷歌翻译 API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error('谷歌翻译 API 请求失败')
    }

    const data = (await response.json()) as any

    // 解析翻译结果
    if (data && data[0]) {
      return data[0].map((item: any) => item[0]).join('')
    }

    throw new Error('翻译结果为空')
  }
}
