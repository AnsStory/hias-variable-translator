# Configuration

## Overview

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableFileTranslation` | boolean | `true` | Enable file path translation |
| `translateNewFileContent` | boolean | `true` | Also replace pre-translation names inside new file content |
| `translationService` | string | `"copilot"` | Current translation service (`copilot` maps to Pinyin) |
| `servicePriority` | string | `"copilot,openai,google,bing,deeplx,baidu,tencent"` | Service priority for fallback (high to low, comma-separated) |
| `copyToClipboard` | boolean | `false` | Auto-copy the result to the clipboard after translation |
| `clipboardFormats` | string[] | `[]` | Naming formats to write to the clipboard history |
| `services` | object | `{}` | API keys / endpoints per service |

All settings are prefixed with `variableTranslator.` — search `variableTranslator` in VSCode Settings (`Ctrl+,`).

## Settings in Detail

### enableFileTranslation

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enables file path translation (translate on file/folder creation). Also toggled via `Alt+Shift+D`

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

### translateNewFileContent

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Applies to **newly created files** only. Language servers (e.g. redhat.java) generate template content (`package` declaration, class name) based on the pre-translation file name. When enabled, path translation also replaces every pre-translation path segment in the content with its translated form. Renaming an existing file never touches its content

**Behavior details**:

1. Before renaming, the dirty editor buffer is saved first, so a template inserted by a language server cannot be written back to the old path after the rename (which would leave both pre- and post-translation files on disk)
2. After renaming, each pre-translation path segment (including directory segments, e.g. `用户`→`User`, `信息`→`Information`) is replaced in the file content and saved
3. Within a 4-second settle window after the rename, if a language server belatedly writes the old-name template back to the old path, it is merged into the translated file and the resurrected old file is deleted

**Example**: creating `用户/信息/用户.java` translates to `User/Information/User.java`, and the content becomes:

```java
package User.Information;

public class User {

}
```

```json
{
  "variableTranslator.translateNewFileContent": true
}
```

### translationService

- **Type**: `string`
- **Default**: `"copilot"`
- **Values**: `"copilot"` | `"openai"` | `"google"` | `"bing"` | `"deeplx"` | `"baidu"` | `"tencent"`
- **Description**: The translation service to use. Also switched via `Alt+Shift+S`

::: info copilot means Pinyin
`copilot` is a legacy value that actually maps to the **Pinyin service** (zero configuration, works offline). It shows up as "拼音 (Pinyin)" in the service picker.
:::

```json
{
  "variableTranslator.translationService": "openai"
}
```

### servicePriority

- **Type**: `string`
- **Default**: `"copilot,openai,google,bing,deeplx,baidu,tencent"`
- **Description**: Fallback priority (high to low, comma-separated). When the current service fails, the next one is tried in this order; invalid names are filtered out

```json
{
  "variableTranslator.servicePriority": "openai,google,bing,deeplx,baidu,tencent"
}
```

### copyToClipboard

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Auto-copy the result to the clipboard after translation (applies to both selection and file path translation)

```json
{
  "variableTranslator.copyToClipboard": true
}
```

### clipboardFormats

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: Naming formats written to the clipboard history in order (the format you pick goes first)

**Values**:
- `camelCase`
- `PascalCase`
- `snake_case`
- `CONSTANT_CASE`
- `param-case`
- `Header-Case`
- `Capital Case`
- `no case`
- `originalValue` — the pre-translation text

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

### services

- **Type**: `object`
- **Default**: `{}`
- **Description**: Per-service configuration (services that need no configuration can be omitted — Pinyin and DeepLX work without any)

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
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    },
    "baidu": {
      "appId": "xxx",
      "secretKey": "xxx"
    },
    "tencent": {
      "secretId": "xxx",
      "secretKey": "xxx",
      "region": "ap-guangzhou"
    }
  }
}
```

## Service Configuration

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

| Parameter | Description | Default | Where to get |
|-----------|-------------|---------|--------------|
| apiKey | OpenAI API Key (required) | - | https://platform.openai.com/api-keys |
| baseUrl | API base URL | `https://api.openai.com` | Any OpenAI-compatible API |
| model | Model name | `gpt-3.5-turbo` | Any OpenAI-compatible model |

### Google Translate

```json
{
  "variableTranslator.services": {
    "google": {
      "apiKey": "your-google-api-key"
    }
  }
}
```

| Parameter | Description | Where to get |
|-----------|-------------|--------------|
| apiKey | Google Cloud Translation API Key (required) | Enable the Cloud Translation API in Google Cloud Console, then create a key |

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

| Parameter | Description | Default | Where to get |
|-----------|-------------|---------|--------------|
| apiKey | Azure Translator API Key (required) | - | https://portal.azure.com/ |
| region | Azure Translator region | `global` | Your Azure resource region |

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
| baseUrl | DeepLX endpoint | `http://127.0.0.1:1188` |

### Baidu Translate

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

| Parameter | Description | Where to get |
|-----------|-------------|--------------|
| appId | Baidu Translate APP_ID (required) | https://fanyi-api.baidu.com/ |
| secretKey | Baidu Translate Secret Key (required) | https://fanyi-api.baidu.com/ |

### Tencent Translator

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

| Parameter | Description | Default | Where to get |
|-----------|-------------|---------|--------------|
| secretId | Tencent Cloud SecretId (required) | - | https://console.cloud.tencent.com/cam/capi |
| secretKey | Tencent Cloud SecretKey (required) | - | https://console.cloud.tencent.com/cam/capi |
| region | Service region | `ap-guangzhou` | See [Tencent region docs](https://cloud.tencent.com/document/product/551/15051) |

## Services Requiring No Configuration

- **Pinyin** (`copilot`): zero configuration, works offline, converts CJK characters to pinyin — the final safety net when all services fail
- **DeepLX**: default endpoint `http://127.0.0.1:1188` with automatic health checks (60s cache); just deploy it locally

---

## Full Example

Copy what you need into `settings.json`:

```json
{
  // Enable file path translation (translate on file creation)
  "variableTranslator.enableFileTranslation": true,

  // Translation service: copilot(Pinyin) | openai | google | bing | deeplx | baidu | tencent
  "variableTranslator.translationService": "openai",

  // Fallback priority (high to low, comma-separated)
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // Auto-copy the result to the clipboard after translation
  "variableTranslator.copyToClipboard": true,

  // Naming formats written to the clipboard history in order
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

  // Per-service configuration (omit services you don't use)
  "variableTranslator.services": {
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    },
    "google": {
      "apiKey": "your-google-api-key"
    },
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    },
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"
    }
  }
}
```
