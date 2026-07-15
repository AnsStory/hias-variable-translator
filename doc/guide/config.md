# 配置项

## 配置说明

在 VSCode 设置中可以配置以下选项：

```json
{
  "variableTranslator.enableFileTranslation": true,
  "variableTranslator.translationService": "copilot",
  "variableTranslator.services": {}
}
```

## 配置项详情

### enableFileTranslation

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：是否启用文件路径翻译功能（右键新建文件时自动翻译）

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

### copyToClipboard

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：翻译后是否自动将结果复制到剪贴板

```json
{
  "variableTranslator.copyToClipboard": true
}
```

### clipboardFormats

- **类型**：`string[]`
- **默认值**：`[]`
- **说明**：复制到剪贴板的命名格式（支持多选，按顺序逐条写入剪贴板历史）。用户选择的格式会排到第一位

**可选值**：
- `camelCase` - 小驼峰
- `PascalCase` - 大驼峰
- `snake_case` - 下划线
- `CONSTANT_CASE` - 常量格式
- `param-case` - 连字符
- `Header-Case` - 头部连字符
- `no case` - 空格分隔
- `originalValue` - 翻译前的原始文本

```json
{
  "variableTranslator.clipboardFormats": [
    "camelCase",
    "originalValue",
    "PascalCase",
    "no case",
    "snake_case",
    "CONSTANT_CASE",
    "param-case",
    "Header-Case",
    "Capital Case"
  ]
}
```

### translationService

- **类型**：`string`
- **默认值**：`"copilot"`
- **可选值**：`"copilot"` | `"openai"` | `"google"` | `"bing"` | `"deeplx"` | `"baidu"` | `"tencent"`
- **说明**：选择翻译服务

```json
{
  "variableTranslator.translationService": "google"
}
```

### services

- **类型**：`object`
- **默认值**：`{}`
- **说明**：翻译服务配置（无需配置的服务可省略）

```json
{
  "variableTranslator.services": {
    "openai": {
      "apiKey": "sk-xxx",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    },
    "google": {
      "apiKey": "your-google-api-key"
    },
    "baidu": {
      "appId": "xxx",
      "secretKey": "xxx"
    },
    "tencent": {
      "secretId": "xxx",
      "secretKey": "xxx",
      "region": "ap-guangzhou"
    },
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    }
  }
}
```

## 服务配置详情

### OpenAI

```json
{
  "variableTranslator.services": {
    "openai": {
      "apiKey": "your-api-key",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    }
  }
}
```

| 参数 | 说明 | 默认值 | 获取方式 |
|------|------|--------|----------|
| apiKey | OpenAI API Key | - | https://platform.openai.com/api-keys |
| baseUrl | API 基础地址 | `https://api.openai.com` | 支持第三方 OpenAI 兼容 API |
| model | 模型名称 | `gpt-3.5-turbo` | 支持任意 OpenAI 兼容模型 |

### 谷歌翻译

```json
{
  "variableTranslator.services": {
    "google": {
      "apiKey": "your-google-api-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| apiKey | Google Cloud Translation API Key | 在 Google Cloud Console 启用 Cloud Translation API 后创建 |

### 百度翻译

```json
{
  "variableTranslator.services": {
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| appId | 百度翻译 APP_ID | https://fanyi-api.baidu.com/ |
| secretKey | 百度翻译 Secret Key | https://fanyi-api.baidu.com/ |

### 腾讯翻译君

```json
{
  "variableTranslator.services": {
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"
    }
  }
}
```

| 参数 | 说明 | 默认值 | 获取方式 |
|------|------|--------|----------|
| secretId | 腾讯云 SecretId | - | https://console.cloud.tencent.com/cam/capi |
| secretKey | 腾讯云 SecretKey | - | https://console.cloud.tencent.com/cam/capi |
| region | 服务区域 | `ap-guangzhou` | 可选值参考[腾讯翻译区域配置](https://cloud.tencent.com/document/product/551/15051) |

### Bing / Azure Translator

```json
{
  "variableTranslator.services": {
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    }
  }
}
```

| 参数 | 说明 | 默认值 | 获取方式 |
|------|------|--------|----------|
| apiKey | Azure Translator API Key | - | https://portal.azure.com/ |
| region | Azure Translator Region | `global` | Azure 资源区域 |

### DeepLX

```json
{
  "variableTranslator.services": {
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    }
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| baseUrl | DeepLX 服务地址 | http://127.0.0.1:1188 |

## 无需配置的服务

以下服务无需额外配置：

- **拼音**：零配置，支持中日韩字符拼音转换
- **DeepLX**：默认地址为 `http://127.0.0.1:1188`，自动健康检查，无需配置

---

## 完整配置示例

以下是所有配置项的完整示例，可根据需要复制到 `settings.json` 中：

```json
{
  // 启用文件路径翻译功能（右键新建文件时自动翻译）
  "variableTranslator.enableFileTranslation": true,

  // 选择翻译服务：copilot | openai | google | bing | deeplx | baidu | tencent
  "variableTranslator.translationService": "openai",

  // 翻译服务优先级（从高到低，翻译失败时按顺序降级，逗号分隔）
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // 翻译后是否自动将结果复制到剪贴板
  "variableTranslator.copyToClipboard": true,

  // 复制到剪贴板的命名格式（支持多选，按顺序逐条写入剪贴板历史）
  // 可选值：camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case, no case, originalValue
  "variableTranslator.clipboardFormats": [
    "camelCase",
    "originalValue",
    "PascalCase",
    "no case",
    "snake_case",
    "CONSTANT_CASE",
    "param-case",
    "Header-Case",
    "Capital Case"
  ],

  // 翻译服务配置（无需配置的服务可省略）
  "variableTranslator.services": {
    // OpenAI 配置
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    },

    // 谷歌翻译配置（官方 Cloud Translation API）
    "google": {
      "apiKey": "your-google-api-key"
    },

    // 百度翻译配置
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },

    // 腾讯翻译君配置
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"
    },

    // Bing / Azure Translator 配置
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },

    // DeepLX 配置（默认地址为 http://127.0.0.1:1188）
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    }
  }
}
```

### 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableFileTranslation` | boolean | `true` | 是否启用文件路径翻译功能 |
| `translationService` | string | `"copilot"` | 选择翻译服务 |
| `servicePriority` | string | `"copilot,openai,google,bing,deeplx,baidu,tencent"` | 翻译服务优先级（从高到低，逗号分隔） |
| `copyToClipboard` | boolean | `false` | 翻译后是否自动将结果复制到剪贴板 |
| `clipboardFormats` | string[] | `[]` | 复制到剪贴板的命名格式（支持多选） |
| `services.openai.apiKey` | string | `""` | OpenAI API Key |
| `services.openai.baseUrl` | string | `"https://api.openai.com"` | OpenAI API 基础地址（支持第三方兼容 API） |
| `services.openai.model` | string | `"gpt-3.5-turbo"` | OpenAI 模型名称 |
| `services.google.apiKey` | string | `""` | Google Cloud Translation API Key |
| `services.baidu.appId` | string | `""` | 百度翻译 APP_ID |
| `services.baidu.secretKey` | string | `""` | 百度翻译 Secret Key |
| `services.tencent.secretId` | string | `""` | 腾讯云 SecretId |
| `services.tencent.secretKey` | string | `""` | 腾讯云 SecretKey |
| `services.tencent.region` | string | `"ap-guangzhou"` | 腾讯翻译服务区域 |
| `services.bing.apiKey` | string | `""` | Azure Translator API Key |
| `services.bing.region` | string | `"global"` | Azure Translator Region |
| `services.deeplx.baseUrl` | string | `"http://127.0.0.1:1188"` | DeepLX 服务地址 |
