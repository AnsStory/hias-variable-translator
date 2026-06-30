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
      "apiKey": "sk-xxx"
    },
    "baidu": {
      "appId": "xxx",
      "secretKey": "xxx"
    },
    "tencent": {
      "secretId": "xxx",
      "secretKey": "xxx"
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
      "apiKey": "your-api-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| apiKey | OpenAI API Key | https://platform.openai.com/api-keys |

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
      "secretKey": "your-secret-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| secretId | 腾讯云 SecretId | https://console.cloud.tencent.com/cam/capi |
| secretKey | 腾讯云 SecretKey | https://console.cloud.tencent.com/cam/capi |

### Bing / Azure Translator

```json
{
  "variableTranslator.services": {
    "bing": {
      "apiKey": "your-api-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| apiKey | Azure Translator API Key | https://portal.azure.com/ |

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

- **VS Code Copilot**：需要 Copilot 订阅
- **谷歌翻译**：免费，有调用限制
