/**
 * 翻译服务基础接口和类型定义
 */

/**
 * 翻译服务类型
 */
export type TranslationServiceType = 'copilot' | 'openai' | 'google' | 'bing' | 'deeplx' | 'baidu' | 'tencent' | 'pinyin'

/**
 * 翻译服务选项，用于QuickPick
 */
export interface TranslationServiceOption {
  label: string
  description: string
  value: TranslationServiceType
  requiresConfig: boolean
}

/**
 * 可用的翻译服务选项
 */
export const TRANSLATION_SERVICE_OPTIONS: TranslationServiceOption[] = [
  {
    label: '拼音',
    description: '零配置，推荐（作为降级方案）',
    value: 'copilot',
    requiresConfig: false,
  },
  {
    label: 'ChatGPT / OpenAI',
    description: '需要 API Key',
    value: 'openai',
    requiresConfig: true,
  },
  {
    label: '谷歌翻译',
    description: '免费（有限制）',
    value: 'google',
    requiresConfig: false,
  },
  {
    label: 'Bing / Azure Translator',
    description: '需要 API Key',
    value: 'bing',
    requiresConfig: true,
  },
  {
    label: 'DeepLX',
    description: '本地部署，免费',
    value: 'deeplx',
    requiresConfig: false,
  },
  {
    label: '百度翻译',
    description: '需要 APP_ID + Key',
    value: 'baidu',
    requiresConfig: true,
  },
  {
    label: '腾讯翻译君',
    description: '需要 SecretId + SecretKey',
    value: 'tencent',
    requiresConfig: true,
  },
]

/**
 * 翻译结果
 */
export interface TranslationResult {
  success: boolean
  translatedText: string
  error?: string
}

/**
 * 翻译服务接口
 */
export interface ITranslationService {
  /**
   * 服务类型
   */
  readonly type: TranslationServiceType

  /**
   * 服务名称
   */
  readonly name: string

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  translate(text: string): Promise<TranslationResult>

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean
}

/**
 * 翻译服务配置
 */
export interface TranslationServiceConfig {
  openai?: {
    apiKey?: string
  }
  baidu?: {
    appId?: string
    secretKey?: string
  }
  tencent?: {
    secretId?: string
    secretKey?: string
  }
  bing?: {
    apiKey?: string
    region?: string
  }
}
