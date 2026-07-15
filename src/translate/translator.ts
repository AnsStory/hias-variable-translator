/**
 * 翻译器模块
 * 整合翻译服务，提供统一的翻译接口
 */

import { ITranslationService, TranslationResult, TranslationServiceType } from './services'
import { PinyinService } from './services/pinyin'
import { TencentService } from './services/tencent'
import { OpenAIService } from './services/openai'
import { BaiduService } from './services/baidu'
import { GoogleService } from './services/google'
import { BingService } from './services/bing'
import { DeepLXService } from './services/deeplx'
import { ConfigManager } from './config'

export class Translator {
  private services: Map<TranslationServiceType, ITranslationService> = new Map()
  private pinyinService: PinyinService
  private _translating: boolean = false
  private static readonly TRANSLATION_TIMEOUT = 10000 // 10秒超时

  constructor() {
    this.pinyinService = new PinyinService()
    this.initializeServices()
  }

  /**
   * 初始化翻译服务
   */
  private initializeServices(): void {
    // 注册拼音服务作为降级方案（copilot和pinyin都指向拼音服务）
    this.services.set('copilot', this.pinyinService)
    this.services.set('pinyin', this.pinyinService)

    // 获取配置并初始化需要配置的服务
    const servicesConfig = ConfigManager.getServicesConfig()

    // 注册 DeepLX（本地服务）
    this.services.set('deeplx', new DeepLXService(servicesConfig.deeplx?.baseUrl))

    // 谷歌翻译（官方 Cloud Translation API v2，需要 API Key）
    if (servicesConfig.google?.apiKey) {
      this.services.set('google', new GoogleService(servicesConfig.google.apiKey))
    }

    // 腾讯翻译君
    if (servicesConfig.tencent?.secretId && servicesConfig.tencent?.secretKey) {
      this.services.set('tencent', new TencentService(servicesConfig.tencent.secretId, servicesConfig.tencent.secretKey, servicesConfig.tencent.region))
    }

    // OpenAI
    if (servicesConfig.openai?.apiKey) {
      this.services.set('openai', new OpenAIService(servicesConfig.openai.apiKey, servicesConfig.openai.baseUrl, servicesConfig.openai.model))
    }

    // 百度翻译
    if (servicesConfig.baidu?.appId && servicesConfig.baidu?.secretKey) {
      this.services.set('baidu', new BaiduService(servicesConfig.baidu.appId, servicesConfig.baidu.secretKey))
    }

    // Bing/Azure
    if (servicesConfig.bing?.apiKey) {
      this.services.set('bing', new BingService(servicesConfig.bing.apiKey, servicesConfig.bing.region))
    }
  }

  /**
   * 重新初始化翻译服务（配置变化时调用）
   */
  reinitializeServices(): void {
    this.services.clear()
    this.initializeServices()
  }

  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @param serviceType 指定的翻译服务类型（可选）
   * @returns 翻译结果
   */
  async translate(text: string, serviceType?: TranslationServiceType): Promise<TranslationResult> {
    // 并发控制：防止同时执行多个翻译请求
    if (this._translating) {
      return { success: false, translatedText: text, error: '翻译正在进行中，请稍候' }
    }
    this._translating = true

    try {
      // 使用 Promise.race 添加全局超时保护
      const timeoutPromise = new Promise<TranslationResult>((resolve) =>
        setTimeout(() => resolve({ success: false, translatedText: text, error: '翻译超时，请重试' }), Translator.TRANSLATION_TIMEOUT)
      )
      return await Promise.race([this.doTranslate(text, serviceType), timeoutPromise])
    } finally {
      this._translating = false
    }
  }

  /**
   * 执行翻译逻辑（内部方法，由 translate 包裹超时保护）
   */
  private async doTranslate(text: string, serviceType?: TranslationServiceType): Promise<TranslationResult> {
    // 如果指定了服务，直接尝试该服务
    if (serviceType) {
      const result = await this.tryTranslate(text, serviceType)
      if (result.success) {
        return result
      }
      // 如果指定服务失败，降级到拼音
      return this.pinyinFallback(text, result.error)
    }

    // 获取优先级列表
    const priorityList = ConfigManager.getServicePriority()
    const currentService = ConfigManager.getTranslationService()

    // 将当前选中的服务放到优先级列表最前面
    const servicesToTry = [currentService, ...priorityList.filter((s) => s !== currentService)]

    // 按优先级顺序尝试翻译服务
    for (const serviceType of servicesToTry) {
      const result = await this.tryTranslate(text, serviceType)
      if (result.success) {
        return result
      }
    }

    // 所有服务都失败，降级到拼音
    return this.pinyinFallback(text, '所有翻译服务均不可用，已使用拼音转换')
  }

  /**
   * 拼音降级（防御性回退）
   * 当所有翻译服务失败时，使用拼音作为最后防线
   */
  private async pinyinFallback(text: string, originalError?: string): Promise<TranslationResult> {
    if (!this.pinyinService) {
      return { success: false, translatedText: text, error: originalError || '翻译失败' }
    }
    try {
      const result = await this.pinyinService.translate(text)
      return result
    } catch (e) {
      return { success: false, translatedText: text, error: originalError || '拼音转换失败' }
    }
  }

  /**
   * 尝试使用指定服务翻译
   * @param text 要翻译的文本
   * @param serviceType 翻译服务类型
   * @returns 翻译结果
   */
  private async tryTranslate(text: string, serviceType: TranslationServiceType): Promise<TranslationResult> {
    const service = this.services.get(serviceType)

    if (!service) {
      return {
        success: false,
        translatedText: text,
        error: `翻译服务 ${serviceType} 不可用`,
      }
    }

    if (!service.isAvailable()) {
      return {
        success: false,
        translatedText: text,
        error: `翻译服务 ${serviceType} 未配置`,
      }
    }

    try {
      return await service.translate(text)
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : '翻译失败',
      }
    }
  }

  /**
   * 获取当前可用的翻译服务
   * @returns 可用的翻译服务列表
   */
  getAvailableServices(): TranslationServiceType[] {
    const available: TranslationServiceType[] = []

    for (const [type, service] of this.services.entries()) {
      if (service.isAvailable()) {
        available.push(type)
      }
    }

    return available
  }

  /**
   * 检查翻译服务是否可用
   * @param serviceType 翻译服务类型
   * @returns 是否可用
   */
  isServiceAvailable(serviceType: TranslationServiceType): boolean {
    const service = this.services.get(serviceType)
    return service ? service.isAvailable() : false
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.services.clear()
  }
}
