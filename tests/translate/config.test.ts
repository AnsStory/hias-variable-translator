/**
 * 翻译配置管理模块测试
 * 测试 ConfigManager 的配置读取、设置、切换等功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 配置存储
let mockConfigStore: Record<string, any> = {
  enableFileTranslation: true,
  translationService: 'copilot',
  services: {},
  servicePriority: 'copilot,openai,google,bing,deeplx,baidu,tencent',
  copyToClipboard: false,
  clipboardFormats: ['camelCase', 'snake_case'],
}

// Mock 配置对象
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn((key: string, defaultValue: any) => {
  return mockConfigStore[key] !== undefined ? mockConfigStore[key] : defaultValue
})

// Mock 配置变化监听器
let configChangeCallback: Function | null = null
const mockOnDidChangeConfiguration = vi.fn((callback: Function) => {
  configChangeCallback = callback
  return { dispose: vi.fn() }
})

// Mock vscode 模块
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: mockGet,
      update: mockUpdate,
    }),
    onDidChangeConfiguration: mockOnDidChangeConfiguration,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}))

// 动态导入被测模块
const { ConfigManager } = await import('../../src/translate/config')

describe('ConfigManager - 配置管理器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configChangeCallback = null
    // 重置配置存储为默认值
    mockConfigStore = {
      enableFileTranslation: true,
      translationService: 'copilot',
      services: {},
      servicePriority: 'copilot,openai,google,bing,deeplx,baidu,tencent',
      copyToClipboard: false,
      clipboardFormats: ['camelCase', 'snake_case'],
    }
  })

  describe('isFileTranslationEnabled - 文件翻译开关', () => {
    it('默认启用 - 返回 true', () => {
      expect(ConfigManager.isFileTranslationEnabled()).toBe(true)
    })

    it('配置禁用 - 返回 false', () => {
      mockConfigStore.enableFileTranslation = false
      expect(ConfigManager.isFileTranslationEnabled()).toBe(false)
    })
  })

  describe('setFileTranslationEnabled - 设置文件翻译开关', () => {
    it('设置为 false', async () => {
      await ConfigManager.setFileTranslationEnabled(false)
      expect(mockUpdate).toHaveBeenCalledWith('enableFileTranslation', false, 1)
    })

    it('设置为 true', async () => {
      await ConfigManager.setFileTranslationEnabled(true)
      expect(mockUpdate).toHaveBeenCalledWith('enableFileTranslation', true, 1)
    })
  })

  describe('toggleFileTranslation - 切换文件翻译开关', () => {
    it('当前启用 - 切换后返回 false', async () => {
      mockConfigStore.enableFileTranslation = true
      const result = await ConfigManager.toggleFileTranslation()
      expect(result).toBe(false)
      expect(mockUpdate).toHaveBeenCalledWith('enableFileTranslation', false, 1)
    })

    it('当前禁用 - 切换后返回 true', async () => {
      mockConfigStore.enableFileTranslation = false
      const result = await ConfigManager.toggleFileTranslation()
      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith('enableFileTranslation', true, 1)
    })
  })

  describe('getTranslationService - 获取当前翻译服务', () => {
    it('默认返回 copilot', () => {
      expect(ConfigManager.getTranslationService()).toBe('copilot')
    })

    it('配置为 openai - 返回 openai', () => {
      mockConfigStore.translationService = 'openai'
      expect(ConfigManager.getTranslationService()).toBe('openai')
    })

    it('配置为 google - 返回 google', () => {
      mockConfigStore.translationService = 'google'
      expect(ConfigManager.getTranslationService()).toBe('google')
    })
  })

  describe('setTranslationService - 设置翻译服务', () => {
    it('设置为 openai', async () => {
      await ConfigManager.setTranslationService('openai')
      expect(mockUpdate).toHaveBeenCalledWith('translationService', 'openai', 1)
    })

    it('设置为 baidu', async () => {
      await ConfigManager.setTranslationService('baidu')
      expect(mockUpdate).toHaveBeenCalledWith('translationService', 'baidu', 1)
    })
  })

  describe('getServicesConfig - 获取翻译服务配置', () => {
    it('默认返回空对象', () => {
      expect(ConfigManager.getServicesConfig()).toEqual({})
    })

    it('返回已配置的 API Keys', () => {
      mockConfigStore.services = {
        openai: { apiKey: 'sk-xxx', model: 'gpt-4' },
        baidu: { appId: '123', secretKey: 'abc' },
      }
      const config = ConfigManager.getServicesConfig()
      expect(config.openai?.apiKey).toBe('sk-xxx')
      expect(config.baidu?.appId).toBe('123')
    })
  })

  describe('getServicePriority - 获取翻译服务优先级', () => {
    it('返回默认优先级列表', () => {
      const priority = ConfigManager.getServicePriority()
      expect(priority).toContain('copilot')
      expect(priority).toContain('openai')
      expect(priority).toContain('google')
      expect(priority[0]).toBe('copilot')
    })

    it('自定义优先级 - 正确解析', () => {
      mockConfigStore.servicePriority = 'google,openai,bing'
      const priority = ConfigManager.getServicePriority()
      expect(priority).toEqual(['google', 'openai', 'bing'])
    })

    it('包含空格 - 正确去除', () => {
      mockConfigStore.servicePriority = 'google, openai, bing'
      const priority = ConfigManager.getServicePriority()
      expect(priority).toEqual(['google', 'openai', 'bing'])
    })
  })

  describe('isServiceConfigured - 检查翻译服务是否已配置', () => {
    it('copilot - 始终返回 true（无需配置）', () => {
      expect(ConfigManager.isServiceConfigured('copilot')).toBe(true)
    })

    it('google - 未配置 apiKey 返回 false', () => {
      mockConfigStore.services = {}
      expect(ConfigManager.isServiceConfigured('google')).toBe(false)
    })

    it('google - 已配置 apiKey 返回 true', () => {
      mockConfigStore.services = { google: { apiKey: 'xxx' } }
      expect(ConfigManager.isServiceConfigured('google')).toBe(true)
    })

    it('deeplx - 始终返回 true（本地部署）', () => {
      expect(ConfigManager.isServiceConfigured('deeplx')).toBe(true)
    })

    it('pinyin - 始终返回 true（无需配置）', () => {
      expect(ConfigManager.isServiceConfigured('pinyin')).toBe(true)
    })

    it('openai - 未配置 apiKey 返回 false', () => {
      mockConfigStore.services = {}
      expect(ConfigManager.isServiceConfigured('openai')).toBe(false)
    })

    it('openai - 已配置 apiKey 返回 true', () => {
      mockConfigStore.services = { openai: { apiKey: 'sk-xxx' } }
      expect(ConfigManager.isServiceConfigured('openai')).toBe(true)
    })

    it('baidu - 未完整配置返回 false', () => {
      mockConfigStore.services = { baidu: { appId: '123' } }
      expect(ConfigManager.isServiceConfigured('baidu')).toBe(false)
    })

    it('baidu - 完整配置返回 true', () => {
      mockConfigStore.services = { baidu: { appId: '123', secretKey: 'abc' } }
      expect(ConfigManager.isServiceConfigured('baidu')).toBe(true)
    })

    it('tencent - 未完整配置返回 false', () => {
      mockConfigStore.services = { tencent: { secretId: 'xxx' } }
      expect(ConfigManager.isServiceConfigured('tencent')).toBe(false)
    })

    it('tencent - 完整配置返回 true', () => {
      mockConfigStore.services = { tencent: { secretId: 'xxx', secretKey: 'yyy' } }
      expect(ConfigManager.isServiceConfigured('tencent')).toBe(true)
    })

    it('bing - 未配置 apiKey 返回 false', () => {
      mockConfigStore.services = {}
      expect(ConfigManager.isServiceConfigured('bing')).toBe(false)
    })

    it('bing - 已配置 apiKey 返回 true', () => {
      mockConfigStore.services = { bing: { apiKey: 'xxx' } }
      expect(ConfigManager.isServiceConfigured('bing')).toBe(true)
    })
  })

  describe('isCopyToClipboard - 翻译后复制到剪贴板', () => {
    it('默认禁用 - 返回 false', () => {
      expect(ConfigManager.isCopyToClipboard()).toBe(false)
    })

    it('配置启用 - 返回 true', () => {
      mockConfigStore.copyToClipboard = true
      expect(ConfigManager.isCopyToClipboard()).toBe(true)
    })
  })

  describe('getClipboardFormats - 获取剪贴板格式列表', () => {
    it('返回配置的格式列表', () => {
      const formats = ConfigManager.getClipboardFormats()
      expect(formats).toEqual(['camelCase', 'snake_case'])
    })

    it('空列表 - 返回空数组', () => {
      mockConfigStore.clipboardFormats = []
      expect(ConfigManager.getClipboardFormats()).toEqual([])
    })

    it('多种格式 - 正确返回', () => {
      mockConfigStore.clipboardFormats = ['camelCase', 'PascalCase', 'snake_case', 'CONSTANT_CASE']
      expect(ConfigManager.getClipboardFormats()).toHaveLength(4)
    })
  })

  describe('onConfigurationChanged - 监听配置变化', () => {
    it('注册监听器 - 返回 Disposable', () => {
      const callback = vi.fn()
      const disposable = ConfigManager.onConfigurationChanged(callback)
      expect(disposable).toBeDefined()
      expect(disposable.dispose).toBeDefined()
    })

    it('相关配置变化 - 触发回调', () => {
      const callback = vi.fn()
      ConfigManager.onConfigurationChanged(callback)

      // 模拟配置变化
      const mockEvent = {
        affectsConfiguration: vi.fn((key: string) => key === 'variableTranslator.enableFileTranslation'),
      }
      configChangeCallback?.(mockEvent)

      expect(callback).toHaveBeenCalled()
    })

    it('不相关配置变化 - 不触发回调', () => {
      const callback = vi.fn()
      ConfigManager.onConfigurationChanged(callback)

      // 模拟不相关的配置变化
      const mockEvent = {
        affectsConfiguration: vi.fn(() => false),
      }
      configChangeCallback?.(mockEvent)

      expect(callback).not.toHaveBeenCalled()
    })

    it('监听所有相关配置项', () => {
      const callback = vi.fn()
      ConfigManager.onConfigurationChanged(callback)

      const relevantKeys = [
        'variableTranslator.enableFileTranslation',
        'variableTranslator.enableConsoleLog',
        'variableTranslator.consoleLogTemplate',
        'variableTranslator.translationService',
        'variableTranslator.services',
        'variableTranslator.servicePriority',
        'variableTranslator.copyToClipboard',
        'variableTranslator.clipboardFormats',
      ]

      for (const key of relevantKeys) {
        callback.mockClear()
        const mockEvent = {
          affectsConfiguration: vi.fn((k: string) => k === key),
        }
        configChangeCallback?.(mockEvent)
        expect(callback).toHaveBeenCalled()
      }
    })
  })
})
