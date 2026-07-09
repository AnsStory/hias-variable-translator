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
- **Description**: Whether to automatically copy translation results to clipboard after translation

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
    "Capital Case",
    "CONSTANT_CASE"
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

## Service Configuration Details

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

| Parameter | Description | How to Get |
|-----------|-------------|------------|
| apiKey | OpenAI API Key | https://platform.openai.com/api-keys |

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
      "secretKey": "your-secret-key"
    }
  }
}
```

| Parameter | Description | How to Get |
|-----------|-------------|------------|
| secretId | Tencent Cloud SecretId | https://console.cloud.tencent.com/cam/capi |
| secretKey | Tencent Cloud SecretKey | https://console.cloud.tencent.com/cam/capi |

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

| Parameter | Description | How to Get |
|-----------|-------------|------------|
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

| Parameter | Description | Default |
|-----------|-------------|---------|
| baseUrl | DeepLX service URL | http://127.0.0.1:1188 |

## Services Without Configuration

The following services don't require additional configuration:

- **VS Code Copilot**: Requires Copilot subscription
- **Google Translation**: Free, has rate limits
- **DeepLX**: Default URL is `http://127.0.0.1:1188`, no configuration needed

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
    "Capital Case",
    "CONSTANT_CASE"
  ],

  // Translation service configuration (services that don't require configuration can be omitted)
  "variableTranslator.services": {
    // OpenAI configuration
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },

    // Baidu Translation configuration
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },

    // Tencent Translation configuration
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key"
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
| `services.baidu.appId` | string | `""` | Baidu Translation APP_ID |
| `services.baidu.secretKey` | string | `""` | Baidu Translation Secret Key |
| `services.tencent.secretId` | string | `""` | Tencent Cloud SecretId |
| `services.tencent.secretKey` | string | `""` | Tencent Cloud SecretKey |
| `services.bing.apiKey` | string | `""` | Azure Translator API Key |
| `services.bing.region` | string | `"global"` | Azure Translator Region |
| `services.deeplx.baseUrl` | string | `"http://127.0.0.1:1188"` | DeepLX service URL |
