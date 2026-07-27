---
layout: home

hero:
  name: variable-translator
  text: VSCode 变量翻译插件
  tagline: 自动检测任意非英文字符，一键翻译为符合命名规范的英文
  image:
    src: /logo.svg
    alt: variable-translator
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quickstart
    - theme: alt
      text: 功能说明
      link: /guide/features
    - theme: alt
      text: GitHub
      link: https://github.com/AnsStory/hias-variable-translator

features:
  - icon: 🌏
    title: 多语言自动检测
    details: 自动检测中文、日文、韩文、俄文等任意非英文字符，无需手动指定源语言
  - icon: 📁
    title: 文件路径翻译
    details: 右键新建文件/文件夹时自动翻译路径中的非英文字符，支持多级目录与文件名冲突处理
  - icon: ✏️
    title: 选中文本翻译
    details: 选中文本按 Alt+Shift+T 一键翻译替换，适合变量、函数、类名命名
  - icon: 📋
    title: 翻译并复制
    details: Alt+Shift+C 将翻译结果按多种命名格式逐条写入剪贴板历史（Win+V 可全部取用）
  - icon: 🔤
    title: 8 种命名格式
    details: camelCase、PascalCase、snake_case、CONSTANT_CASE、param-case、Header-Case、Capital Case、no case
  - icon: 🔀
    title: 多服务自动降级
    details: 支持 OpenAI、谷歌、Bing、DeepLX、百度、腾讯等服务，失败时按优先级降级，最终拼音兜底
  - icon: ↩️
    title: 一键撤回
    details: Alt+Shift+Z（资源管理器中也可 Ctrl+Z）在 1 分钟内撤回文件翻译，自动清理翻译时创建的目录
  - icon: 🧩
    title: 零配置可用
    details: 开箱即用，默认拼音服务无需任何 API Key，DeepLX 本地部署免费使用
---
