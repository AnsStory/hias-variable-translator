/**
 * OpenAI 翻译服务
 * 使用 OpenAI 兼容 API
 */

import { ITranslationService, TranslationResult } from './index'

export class OpenAIService implements ITranslationService {
  readonly type = 'openai' as const
  readonly name = 'ChatGPT / OpenAI'

  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await this.callOpenAIAPI(text)
      return {
        success: true,
        translatedText: result,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : 'OpenAI 翻译失败',
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
   * 调用 OpenAI API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callOpenAIAPI(text: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译助手。请将用户输入的非英文文本翻译成英文，只返回翻译结果，不要添加任何解释。',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      const error = (await response.json()) as any
      throw new Error(error.error?.message || 'API 请求失败')
    }

    const data = (await response.json()) as any
    return data.choices[0].message.content.trim()
  }
}
