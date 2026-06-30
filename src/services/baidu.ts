/**
 * 百度翻译服务
 * 使用百度翻译开放平台 API
 */

import * as crypto from 'crypto'
import { ITranslationService, TranslationResult } from './index'

export class BaiduService implements ITranslationService {
  readonly type = 'baidu' as const
  readonly name = '百度翻译'

  private appId: string
  private secretKey: string

  constructor(appId: string, secretKey: string) {
    this.appId = appId
    this.secretKey = secretKey
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await this.callBaiduAPI(text)
      return {
        success: true,
        translatedText: result,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : '百度翻译失败',
      }
    }
  }

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return !!(this.appId && this.secretKey)
  }

  /**
   * 调用百度翻译 API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callBaiduAPI(text: string): Promise<string> {
    // 生成随机盐
    const salt = Math.random().toString(36).substring(2, 8)

    // 生成签名
    const sign = crypto
      .createHash('md5')
      .update(this.appId + text + salt + this.secretKey)
      .digest('hex')

    // 构建请求参数
    const params = new URLSearchParams({
      q: text,
      from: 'auto',
      to: 'en',
      appid: this.appId,
      salt: salt,
      sign: sign,
    })

    const response = await fetch(`https://fanyi-api.baidu.com/api/trans/vip/translate?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = (await response.json()) as any

    if (data.error_code) {
      throw new Error(`百度翻译错误: ${data.error_msg}`)
    }

    // 拼接翻译结果
    if (data.trans_result && data.trans_result.length > 0) {
      return data.trans_result.map((item: any) => item.dst).join('\n')
    }

    throw new Error('翻译结果为空')
  }
}
