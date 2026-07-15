/**
 * 腾讯翻译君服务
 * 使用腾讯云机器翻译API
 */

import * as crypto from 'crypto'
import { ITranslationService, TranslationResult } from './index'
import { fetchWithTimeout } from './utils'

export class TencentService implements ITranslationService {
  readonly type = 'tencent' as const
  readonly name = '腾讯翻译君'

  private secretId: string
  private secretKey: string
  private region: string

  constructor(secretId: string, secretKey: string, region: string = 'ap-guangzhou') {
    this.secretId = secretId
    this.secretKey = secretKey
    this.region = region
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const result = await this.callTencentAPI(text)
      return {
        success: true,
        translatedText: result,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : '腾讯翻译失败',
      }
    }
  }

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return !!(this.secretId && this.secretKey)
  }

  /**
   * 调用腾讯翻译API
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  private async callTencentAPI(text: string): Promise<string> {
    const service = 'tmt'
    const action = 'TextTranslate'
    const version = '2018-03-21'
    const region = this.region

    // 构建请求体
    const payload = JSON.stringify({
      SourceText: text,
      Source: 'auto',
      Target: 'en',
      ProjectId: 0,
    })

    // 构建请求头
    const timestamp = Math.floor(Date.now() / 1000)
    const date = new Date(timestamp * 1000).toISOString().split('T')[0]

    // 构建规范请求
    const httpRequestMethod = 'POST'
    const canonicalUri = '/'
    const canonicalQueryString = ''
    const canonicalHeaders = `content-type:application/json\nhost:tmt.tencentcloudapi.com\n`
    const signedHeaders = 'content-type;host'
    const hashedRequestPayload = this.sha256(payload)
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`

    // 构建签名字符串
    const algorithm = 'TC3-HMAC-SHA256'
    const credentialScope = `${date}/${service}/tc3_request`
    const hashedCanonicalRequest = this.sha256(canonicalRequest)
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`

    // 计算签名
    const secretDate = this.hmacSha256(`TC3${this.secretKey}`, date)
    const secretService = this.hmacSha256(secretDate, service)
    const secretSigning = this.hmacSha256(secretService, 'tc3_request')
    const signature = this.hmacSha256(secretSigning, stringToSign, 'hex')

    // 构建Authorization
    const authorization = `${algorithm} Credential=${this.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    // 发送请求
    const response = await fetchWithTimeout('https://tmt.tencentcloudapi.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'tmt.tencentcloudapi.com',
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': region,
        Authorization: authorization,
      },
      body: payload,
    })

    const data = (await response.json()) as any

    if (data.Response.Error) {
      throw new Error(data.Response.Error.Message)
    }

    return data.Response.TargetText
  }

  /**
   * SHA256哈希
   * @param data 数据
   * @returns 哈希值
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * HMAC-SHA256
   * @param key 密钥
   * @param data 数据
   * @param encoding 输出编码
   * @returns 哈希值
   */
  private hmacSha256(key: string | Buffer, data: string, encoding: 'hex' | 'buffer' = 'buffer'): string | Buffer {
    const hmac = crypto.createHmac('sha256', key)
    hmac.update(data)
    if (encoding === 'hex') {
      return hmac.digest('hex')
    }
    return hmac.digest()
  }
}
