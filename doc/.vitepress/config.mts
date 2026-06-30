import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '变量翻译助手',
  description: 'VSCode 插件 - 将非英文字符翻译为英文',

  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '指南', link: '/guide/' },
          { text: '配置', link: '/guide/config' },
          { text: 'GitHub', link: 'https://github.com/AnsStory/hias-variable-translator' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: '指南',
              items: [
                { text: '简介', link: '/guide/' },
                { text: '快速开始', link: '/guide/quickstart' },
                { text: '功能说明', link: '/guide/features' },
                { text: '配置项', link: '/guide/config' },
                { text: '翻译服务', link: '/guide/services' },
                { text: '快捷键', link: '/guide/shortcuts' },
                { text: 'FAQ', link: '/guide/faq' },
              ],
            },
          ],
        },
        socialLinks: [{ icon: 'github', link: 'https://github.com/AnsStory/hias-variable-translator' }],
        footer: {
          message: '基于 MIT 许可发布',
          copyright: '© 2026 Variable Translator',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/' },
          { text: 'Config', link: '/en/guide/config' },
          { text: 'GitHub', link: 'https://github.com/AnsStory/hias-variable-translator' },
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Introduction', link: '/en/guide/' },
                { text: 'Quick Start', link: '/en/guide/quickstart' },
                { text: 'Features', link: '/en/guide/features' },
                { text: 'Configuration', link: '/en/guide/config' },
                { text: 'Translation Services', link: '/en/guide/services' },
                { text: 'Shortcuts', link: '/en/guide/shortcuts' },
                { text: 'FAQ', link: '/en/guide/faq' },
              ],
            },
          ],
        },
        socialLinks: [{ icon: 'github', link: 'https://github.com/AnsStory/hias-variable-translator' }],
        footer: {
          message: 'Released under the MIT License.',
          copyright: '© 2026 Variable Translator',
        },
      },
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Variable Translator',
    socialLinks: [{ icon: 'github', link: 'https://github.com/AnsStory' }],
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清空搜索',
            footer: {
              selectText: '选择',
              navigateText: '切换',
            },
          },
        },
      },
    },
    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © AnsStory',
    },
  },
  outDir: '../docs',
  base: '/hias-variable-translator',
})
