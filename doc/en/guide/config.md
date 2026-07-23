# Configuration

## Configuration Description

The following options can be configured in VSCode settings:

```json
{
  "variableTranslator.enableFileTranslation": true,
  "variableTranslator.translationService": "copilot",
  "variableTranslator.services": {}
}
```

## Configuration Details

### enableFileTranslation

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable file path translation feature (auto-translate when creating new files)

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

### copyToClipboard

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Whether to automatically copy translation results to clipboard after translation (applies to both selected-text translation and file path translation)

```json
{
  "variableTranslator.copyToClipboard": true
}
```

### clipboardFormats

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: Naming formats to copy to clipboard (supports multiple selections, written sequentially to clipboard history). User selected format will be moved to first position

**Options**:
- `camelCase` - Lower camel case
- `PascalCase` - Upper camel case
- `snake_case` - Underscore separated
- `CONSTANT_CASE` - Constant case
- `param-case` - Hyphen separated
- `Header-Case` - Header case
- `no case` - Space separated
- `originalValue` - The original text before translation (e.g., the Chinese text you selected)

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

- **Type**: `string`
- **Default**: `"copilot"`
- **Options**: `"copilot"` | `"openai"` | `"google"` | `"bing"` | `"deeplx"` | `"baidu"` | `"tencent"`
- **Description**: Select translation service

```json
{
  "variableTranslator.translationService": "google"
}
```

### services

- **Type**: `object`
- **Default**: `{}`
- **Description**: Translation service configuration (services that don't require configuration can be omitted)

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

## Service Configuration Details

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

| Parameter | Description | Default | How to Get |
|-----------|-------------|---------|------------|
| apiKey | OpenAI API Key | - | https://platform.openai.com/api-keys |
| baseUrl | API base URL | `https://api.openai.com` | Supports third-party OpenAI-compatible APIs |
| model | Model name | `gpt-3.5-turbo` | Any OpenAI-compatible model |

### Google Translation

```json
{
  "variableTranslator.services": {
    "google": {
      "apiKey": "your-google-api-key"
    }
  }
}
```

| Parameter | Description | How to Get |
|-----------|-------------|------------|
| apiKey | Google Cloud Translation API Key | Create after enabling Cloud Translation API in Google Cloud Console |

### Baidu Translation

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

| Parameter | Description | How to Get |
|-----------|-------------|------------|
| appId | Baidu Translation APP_ID | https://fanyi-api.baidu.com/ |
| secretKey | Baidu Translation Secret Key | https://fanyi-api.baidu.com/ |

### Tencent Translation

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

| Parameter | Description | Default | How to Get |
|-----------|-------------|---------|------------|
| secretId | Tencent Cloud SecretId | - | https://console.cloud.tencent.com/cam/capi |
| secretKey | Tencent Cloud SecretKey | - | https://console.cloud.tencent.com/cam/capi |
| region | Service region | `ap-guangzhou` | See [Tencent region config](https://cloud.tencent.com/document/product/551/15051) |

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

| Parameter | Description | Default | How to Get |
|-----------|-------------|---------|------------|
| apiKey | Azure Translator API Key | - | https://portal.azure.com/ |
| region | Azure Translator Region | `global` | Azure resource region |

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

| Parameter | Description | Default |
|-----------|-------------|---------|
| baseUrl | DeepLX service URL | http://127.0.0.1:1188 |

## Services Without Configuration

The following services don't require additional configuration:

- **Pinyin**: Zero config, supports CJK character pinyin conversion
- **DeepLX**: Default URL is `http://127.0.0.1:1188`, auto health check, no configuration needed

---

## Complete Configuration Example

Here is a complete example of all configuration options. Copy this to your `settings.json` as needed:

```json
{
  // Enable file path translation feature (auto-translate when creating new files)
  "variableTranslator.enableFileTranslation": true,

  // Select translation service: copilot | openai | google | bing | deeplx | baidu | tencent
  "variableTranslator.translationService": "openai",

  // Translation service priority (high to low, fallback in order when translation fails, comma separated)
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // Whether to automatically copy translation results to clipboard after translation
  "variableTranslator.copyToClipboard": true,

  // Naming formats to copy to clipboard (supports multiple selections, written sequentially to clipboard history)
  // Options: camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case, no case, originalValue
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

  // Translation service configuration (services that don't require configuration can be omitted)
  "variableTranslator.services": {
    // OpenAI configuration
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    },

    // Google Translation configuration (official Cloud Translation API)
    "google": {
      "apiKey": "your-google-api-key"
    },

    // Baidu Translation configuration
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },

    // Tencent Translation configuration
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"
    },

    // Bing / Azure Translator configuration
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },

    // DeepLX configuration (default URL is http://127.0.0.1:1188)
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    }
  }
}
```

### Configuration Description

| Configuration | Type | Default | Description |
|---------------|------|---------|-------------|
| `enableFileTranslation` | boolean | `true` | Enable file path translation feature |
| `translationService` | string | `"copilot"` | Select translation service |
| `servicePriority` | string | `"copilot,openai,google,bing,deeplx,baidu,tencent"` | Translation service priority (high to low, comma separated) |
| `copyToClipboard` | boolean | `false` | Whether to automatically copy translation results to clipboard |
| `clipboardFormats` | string[] | `[]` | Naming formats to copy to clipboard |
| `services.openai.apiKey` | string | `""` | OpenAI API Key |
| `services.openai.baseUrl` | string | `"https://api.openai.com"` | OpenAI API base URL (supports third-party compatible APIs) |
| `services.openai.model` | string | `"gpt-3.5-turbo"` | OpenAI model name |
| `services.google.apiKey` | string | `""` | Google Cloud Translation API Key |
| `services.baidu.appId` | string | `""` | Baidu Translation APP_ID |
| `services.baidu.secretKey` | string | `""` | Baidu Translation Secret Key |
| `services.tencent.secretId` | string | `""` | Tencent Cloud SecretId |
| `services.tencent.secretKey` | string | `""` | Tencent Cloud SecretKey |
| `services.tencent.region` | string | `"ap-guangzhou"` | Tencent Translation service region |
| `services.bing.apiKey` | string | `""` | Azure Translator API Key |
| `services.bing.region` | string | `"global"` | Azure Translator Region |
| `services.deeplx.baseUrl` | string | `"http://127.0.0.1:1188"` | DeepLX service URL |
