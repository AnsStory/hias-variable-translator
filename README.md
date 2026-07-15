# [变量翻译助手](https://ansstory.github.io/hias-variable-translator/)

VSCode 插件 - 自动检测并翻译任意非英文字符为英文

# [Extensions for Visual Studio Code](https://marketplace.visualstudio.com/)

## 功能特性

- **多语言支持**：自动检测中文、日文、韩文、俄文等任意非英文字符并翻译为英文
- **文件路径翻译**：新建文件时自动翻译路径中的非英文字符
- **文本翻译**：选中文本后一键翻译替换
- **多种命名格式**：支持 camelCase、PascalCase、snake_case 等 8 种命名格式
- **多翻译服务**：支持 Pinyin、OpenAI、Google、Bing、百度、腾讯等 7 种翻译服务
- **请求超时保护**：所有翻译服务均有 10 秒超时控制，避免长时间等待
- **一键撤回**：1 分钟内可撤回文件翻译，自动清理文件和目录
- **右键菜单**：编辑器右键菜单集成翻译、撤回、切换服务命令
- **剪贴板复制**：翻译后自动复制多种命名格式到剪贴板历史
- **灵活配置**：OpenAI 支持自定义 baseUrl/model，腾讯翻译支持自定义区域，DeepLX 支持自定义服务地址

## 安装

### 从 VSCode Marketplace 安装（推荐）

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "变量翻译助手"
4. 点击 **Install** 安装

## 使用说明

### 文件路径翻译

1. 在资源管理器中右键新建文件
2. 输入包含非英文字符的路径，如: `你好/世界/测试.test.js`
3. 选择命名格式
4. 文件自动翻译创建，结果为: `hello/world/test.test.js`

### 选中文本翻译

1. 在编辑器中选中非英文文本
2. 按 `Alt+Shift+T`
3. 选择命名格式
4. 文本自动替换为英文

### 撤回翻译

1. 按 `Alt+Shift+Z`
2. 删除翻译后的文件/目录，关闭对应编辑器窗口
3. 1 分钟内可撤回

### 翻译并复制到剪贴板

1. 在编辑器中选中非英文文本
2. 按 `Alt+Shift+C`
3. 选择命名格式
4. 翻译结果复制到剪贴板（不替换原文）

**使用前提**：需在设置中开启 `copyToClipboard: true`，并配置 `clipboardFormats` 指定要复制的格式。(其中：originalValue为翻以前的原始文本)

#### 配置示例

```json
{
  "variableTranslator.copyToClipboard": true,
  "variableTranslator.clipboardFormats": ["camelCase","originalValue","PascalCase","no case","snake_case","CONSTANT_CASE","param-case","Header-Case","Capital Case",]
}
```

#### 效果

选中 `用户名称`，按 `Alt+Shift+C` 选择 `snake_case`：

剪贴板历史（Win+V 可查看）：
- `user_name`（snake_case，用户选择的排第一）
- `userName`（camelCase）
- `USER_NAME`（CONSTANT_CASE）

## 快捷键

| 快捷键 (Windows/Linux) | 快捷键 (macOS) | 功能 |
|------------------------|----------------|------|
| `Alt+Shift+T` | `Option+Shift+T` | 翻译选中文本 |
| `Alt+Shift+C` | `Option+Shift+C` | 翻译并复制到剪贴板 |
| `Alt+Shift+Z` | `Option+Shift+Z` | 撤回文件翻译 |
| `Alt+Shift+D` | `Option+Shift+D` | 切换文件翻译开关 |
| `Alt+Shift+S` | `Option+Shift+S` | 切换翻译服务 |

## 命名格式

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

## 翻译服务

| 服务 | 认证方式 | 费用 | 说明 |
|------|----------|------|------|
| Pinyin | 零配置 | 免费 | 降级方案，支持中日韩字符拼音转换 |
| ChatGPT / OpenAI | API Key | 按量付费 | 支持自定义 baseUrl 和 model，兼容第三方 API |
| 谷歌翻译 | API Key | 按量付费 | 官方 Cloud Translation API，需 Google Cloud API Key |
| Bing / Azure Translator | API Key | 按量付费 | 需要 Azure 账号，支持自定义区域 |
| DeepLX | 本地部署 | 免费 | 自动健康检查，支持自定义服务地址 |
| 百度翻译 | APP_ID + Key | 按量付费 | 需要百度翻译开放平台账号 |
| 腾讯翻译君 | SecretId + SecretKey | 按量付费 | 支持自定义区域（默认 ap-guangzhou） |

## 配置项

```json
{
  // 启用文件路径翻译功能（右键新建文件时自动翻译）
  "variableTranslator.enableFileTranslation": true,

  // 选择翻译服务：copilot | openai | google | bing | deeplx | baidu | tencent
  "variableTranslator.translationService": "copilot",

  // 翻译服务优先级（从高到低，翻译失败时按顺序降级，逗号分隔）
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // 翻译后是否自动将结果复制到剪贴板
  "variableTranslator.copyToClipboard": false,

  // 复制到剪贴板的命名格式（支持多选，按顺序逐条写入剪贴板历史）
  // 可选值：camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case, Capital Case, no case, originalValue
  // originalValue 表示复制原始翻译前的文本
  "variableTranslator.clipboardFormats": [],

  // 翻译服务配置（无需配置的服务可省略）
  "variableTranslator.services": {
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.openai.com",  // 可选，支持第三方兼容 API
      "model": "gpt-3.5-turbo"              // 可选，自定义模型
    },
    "google": {
      "apiKey": "your-google-api-key"       // 官方 Cloud Translation API Key
    },
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"              // 可选，自定义区域
    },
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"    // 可选，自定义 DeepLX 服务地址
    }
  }
}
```

## API 获取方式

| 服务 | 获取地址 | 说明 |
|------|----------|------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | 创建 API Key |
| Google 翻译 | [console.cloud.google.com](https://console.cloud.google.com/) | 启用 Cloud Translation API 并创建 API Key |
| 百度翻译 | [fanyi-api.baidu.com](https://fanyi-api.baidu.com/) | 开通通用翻译 API |
| 腾讯翻译君 | [console.cloud.tencent.com/cam/capi](https://console.cloud.tencent.com/cam/capi) | 获取 SecretId/SecretKey |
| Bing/Azure | [portal.azure.com](https://portal.azure.com/) | 创建 Translator 资源 |
| DeepLX | [DeepLX](https://deeplx.owo.network/) 或 [DeepLX GitHub](https://github.com/OwO-Network/DeepLX) | 本地部署服务 |

详细获取步骤请参考 [翻译服务文档](https://ansstory.github.io/hias-variable-translator/guide/services)。

## 更新日志

### v0.1.14
- **翻译超时保护**：全局 10 秒超时，超时后自动降级为拼音转换
- **翻译服务超时**：所有翻译服务均有 10 秒请求超时控制
- **OpenAI**：支持自定义 `baseUrl` 和 `model`，兼容第三方 OpenAI 兼容 API
- **DeepLX**：添加异步健康检查机制（60 秒缓存），修复服务可用性检测
- **DeepLX**：支持自定义 `baseUrl` 配置
- **腾讯翻译**：支持自定义 `region` 配置（默认 ap-guangzhou）
- **拼音服务**：扩展支持日文（平假名/片假名）和韩文（音节/字母）字符
- **右键菜单**：编辑器右键菜单集成翻译选中文本、翻译并复制、撤回翻译、切换服务
- **状态栏**：显示当前翻译服务名称
- **撤回目录清理**：撤回时通过对比翻译前后路径判断翻译创建的目录，不会删除用户原有目录（如 `src/` 即使为空也会保留）
- **Disposable 泄漏修复**：配置监听器正确注册到插件上下文
- **并发控制**：防止重复翻译请求，全局超时保护
- **激活策略**：`onStartupFinished`，确保文件事件监听器可靠注册
- **单元测试**：Vitest 测试框架，208 个测试用例覆盖核心功能

## 许可证

[MIT License](LICENSE)
