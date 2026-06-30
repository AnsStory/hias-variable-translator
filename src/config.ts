/**
 * 配置管理模块
 * 管理插件的配置项
 */

import * as vscode from 'vscode'
import { TranslationServiceType, TranslationServiceConfig } from './services'

/**
 * 插件配置接口
 */
export interface PluginConfig {
  enableFileTranslation: boolean
  translationService: TranslationServiceType
  services: TranslationServiceConfig
}

/**
 * 配置管理器
 */
export class ConfigManager {
  private static readonly CONFIG_PREFIX = 'variableTranslator'

  /**
   * 获取插件配置
   * @returns 插件配置
   */
  static getConfig(): PluginConfig {
    const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX)

    return {
      enableFileTranslation: config.get<boolean>('enableFileTranslation', true),
      translationService: config.get<TranslationServiceType>('translationService', 'copilot'),
      services: config.get<TranslationServiceConfig>('services', {}),
    }
  }

  /**
   * 获取文件翻译开关状态
   * @returns 是否启用文件翻译
   */
  static isFileTranslationEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX)
    return config.get<boolean>('enableFileTranslation', true)
  }

  /**
   * 设置文件翻译开关状态
   * @param enabled 是否启用
   */
  static async setFileTranslationEnabled(enabled: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX)
    await config.update('enableFileTranslation', enabled, vscode.ConfigurationTarget.Global)
  }

  /**
   * 切换文件翻译开关
   * @returns 切换后的状态
   */
  static async toggleFileTranslation(): Promise<boolean> {
    const current = this.isFileTranslationEnabled()
    await this.setFileTranslationEnabled(!current)
    return !current
  }

  /**
   * 获取当前翻译服务
   * @returns 翻译服务类型
   */
  static getTranslationService(): TranslationServiceType {
    const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX)
    return config.get<TranslationServiceType>('translationService', 'copilot')
  }

  /**
   * 设置翻译服务
   * @param service 翻译服务类型
   */
  static async setTranslationService(service: TranslationServiceType): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX)
    await config.update('translationService', service, vscode.ConfigurationTarget.Global)
  }

  /**
   * 获取翻译服务配置
   * @returns 翻译服务配置
   */
  static getServicesConfig(): TranslationServiceConfig {
    const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX)
    return config.get<TranslationServiceConfig>('services', {})
  }

  /**
   * 检查翻译服务是否已配置
   * @param service 翻译服务类型
   * @returns 是否已配置
   */
  static isServiceConfigured(service: TranslationServiceType): boolean {
    if (service === 'copilot' || service === 'google' || service === 'deeplx') {
      return true // 这些服务不需要配置
    }

    const servicesConfig = this.getServicesConfig()

    switch (service) {
      case 'openai':
        return !!servicesConfig.openai?.apiKey
      case 'baidu':
        return !!servicesConfig.baidu?.appId && !!servicesConfig.baidu?.secretKey
      case 'tencent':
        return !!servicesConfig.tencent?.secretId && !!servicesConfig.tencent?.secretKey
      case 'bing':
        return !!servicesConfig.bing?.apiKey
      default:
        return false
    }
  }

  /**
   * 监听配置变化
   * @param callback 配置变化回调
   * @returns 取消监听的Disposable
   */
  static onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (
        e.affectsConfiguration(`${this.CONFIG_PREFIX}.enableFileTranslation`) ||
        e.affectsConfiguration(`${this.CONFIG_PREFIX}.translationService`) ||
        e.affectsConfiguration(`${this.CONFIG_PREFIX}.services`)
      ) {
        callback(e)
      }
    })
  }
}
