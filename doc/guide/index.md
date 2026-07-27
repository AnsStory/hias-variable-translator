# 简介

**variable-translator** 是一款 VSCode 插件，自动检测文件路径或选中文本中的任意非英文字符（中文、日文、韩文、俄文等），并将其翻译为符合命名规范的英文。

写代码时想好了中文名却卡在英文命名？直接输入中文，让插件帮你翻译成 `camelCase`、`snake_case` 等 8 种命名格式。

## 核心功能

| 功能 | 触发方式 | 说明 |
|------|----------|------|
| 文件路径翻译 | 右键新建文件/文件夹 | 自动检测路径中的非英文字符并翻译创建 |
| 选中文本翻译 | `Alt+Shift+T` | 翻译并替换选中文本 |
| 翻译并复制 | `Alt+Shift+C` | 翻译结果按多种格式写入剪贴板历史 |
| 撤回翻译 | `Alt+Shift+Z` / `Ctrl+Z` | 1 分钟内撤回文件翻译，自动清理创建的目录（Ctrl+Z 仅在焦点不在文本输入区时生效） |
| 文件翻译开关 | `Alt+Shift+D` | 快速开启/关闭文件路径翻译 |
| 切换翻译服务 | `Alt+Shift+S` | 在 7 种翻译服务间快速切换 |

## 功能特点

- **多语言自动检测**：无需指定源语言，任意非英文字符均可识别
- **8 种命名格式**：camelCase、PascalCase、snake_case、CONSTANT_CASE、param-case、Header-Case、Capital Case、no case
- **多翻译服务**：OpenAI、谷歌翻译、Bing/Azure、DeepLX、百度翻译、腾讯翻译君、拼音
- **自动降级**：翻译失败按优先级降级到下一个服务，最终拼音兜底，保证翻译永不失败
- **超时保护**：全局 10 秒翻译超时，不会卡住编辑器
- **零配置可用**：默认拼音服务开箱即用，无需任何 API Key

## 支持的语言

插件会自动检测以下语言并翻译为英文：

| 语言 | 示例 |
|------|------|
| 中文 | 用户名称 → userName |
| 日文 | ユーザー名 → userName |
| 韩文 | 사용자 이름 → userName |
| 俄文 | Имя пользователя → userName |
| 其他 | 任何非英文字符 |

## 命名格式说明

### 文件翻译格式

| 格式 | 示例 | 说明 |
|------|------|------|
| camelCase | userName | 小驼峰，首字母小写 |
| PascalCase | UserName | 大驼峰，首字母大写 |
| snake_case | user_name | 下划线分隔，全小写 |
| CONSTANT_CASE | USER_NAME | 下划线分隔，全大写 |
| param-case | user-name | 连字符分隔，全小写 |
| Header-Case | User-Name | 连字符分隔，首字母大写 |

### 选中文本翻译额外格式

| 格式 | 示例 | 说明 |
|------|------|------|
| Capital Case | User Name | 首字母大写，空格分隔 |
| no case | user name | 全小写，空格分隔 |

## 下一步

- [快速开始](/guide/quickstart) - 安装并上手使用
- [功能说明](/guide/features) - 了解各功能的详细行为
- [配置项](/guide/config) - 完整配置参考
- [翻译服务](/guide/services) - 各翻译服务的申请与配置
