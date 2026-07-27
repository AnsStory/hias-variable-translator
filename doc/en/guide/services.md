# Translation Services

## Service List

| Service | Auth | Cost | Notes |
|---------|------|------|-------|
| Pinyin | None | Free | Default service and final fallback; converts CJK characters to pinyin, works offline |
| ChatGPT / OpenAI | API Key | Pay-as-you-go | Custom baseUrl/model, compatible with third-party OpenAI APIs |
| Google Translate | API Key | Pay-as-you-go | Official Cloud Translation API, requires a Google Cloud API key |
| Bing / Azure Translator | API Key | Pay-as-you-go | Requires an Azure account, custom region supported |
| DeepLX | Local deployment | Free | Automatic health checks, custom endpoint supported |
| Baidu Translate | APP_ID + Key | Pay-as-you-go | Requires a Baidu Translate open platform account |
| Tencent Translator | SecretId + SecretKey | Pay-as-you-go | Custom region supported (default ap-guangzhou) |

::: info About the config value
In the `translationService` setting, `copilot` is a legacy value that actually maps to the **Pinyin service**.
:::

## Getting API Keys

### OpenAI

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up / log in
3. Open the [API Keys page](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (format: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
6. (Optional) set a custom `baseUrl` for a third-party OpenAI-compatible API
7. (Optional) set a custom `model` (default `gpt-3.5-turbo`)

### Google Translate

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign up / log in and create a project
3. Enable the [Cloud Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)
4. Create an API key under "APIs & Services → Credentials"
5. Paste the key into the extension settings

### Bing / Azure Translator

1. Visit [Azure Portal](https://portal.azure.com/)
2. Sign up / log in
3. Create a [Translator](https://portal.azure.com/#create/Microsoft.CognitiveServicesMultiService) resource
4. Open the resource → "Keys and Endpoint"
5. Copy the API key and region

### DeepLX

1. Visit [DeepLX](https://deeplx.owo.network/) or [DeepLX on GitHub](https://github.com/OwO-Network/DeepLX)
2. Deploy the service locally following the instructions
3. Default endpoint: `http://127.0.0.1:1188` (custom `baseUrl` supported)
4. The extension performs automatic health checks (60s cache)
5. No further configuration needed

### Baidu Translate

1. Visit the [Baidu Translate Open Platform](https://fanyi-api.baidu.com/)
2. Sign up / log in
3. Open the [console](https://fanyi-api.baidu.com/aitrans)
4. Enable the General Translation API
5. Obtain the APP_ID and Secret Key

### Tencent Translator

1. Visit [Tencent Cloud](https://console.cloud.tencent.com/)
2. Sign up / log in
3. Enable [Machine Translation](https://console.cloud.tencent.com/tmt)
4. Open [API Key Management](https://console.cloud.tencent.com/cam/capi)
5. Obtain the SecretId and SecretKey
6. (Optional) set a custom `region` (default `ap-guangzhou`)

## Switching Services

### Shortcut

Press `Alt+Shift+S` to switch quickly.

### Command Palette

1. Press `Ctrl+Shift+P`
2. Type "切换翻译服务" (Switch Translation Service)
3. Pick a service

### Context Menu

Right-click in the editor → "切换翻译服务".

::: tip Unconfigured services
Picking a service that requires a key but is not configured prompts you to open the settings, jumping straight to `variableTranslator.services`.
:::

## Service Comparison

### Pinyin

- **Pros**: zero configuration, works offline, converts CJK characters to pinyin
- **Cons**: pinyin conversion only, not real translation
- **Best for**: out-of-the-box default and the final fallback when everything else fails

### OpenAI

- **Pros**: high quality, understands programming context, custom baseUrl/model
- **Cons**: requires an API key, pay-as-you-go
- **Best for**: high-quality translation; third-party compatible APIs can lower costs

### Google Translate

- **Pros**: official API, stable quality, no CAPTCHA / IP-ban risk
- **Cons**: requires a Google Cloud account and API key, pay-as-you-go
- **Best for**: reliable Google translation quality

### Bing / Azure Translator

- **Pros**: official Microsoft API, stable quality, free tier available
- **Cons**: requires an Azure account
- **Best for**: users who already have an Azure account

### DeepLX

- **Pros**: local deployment, free, automatic health checks
- **Cons**: requires deploying the service yourself
- **Best for**: privacy-conscious or cost-free usage

### Baidu Translate

- **Pros**: fast within China
- **Cons**: account registration required
- **Best for**: users in China

### Tencent Translator

- **Pros**: fast within China, custom region
- **Cons**: requires a Tencent Cloud account
- **Best for**: users in China

## Fallback Chain

When a translation call fails, the extension falls back automatically by the `servicePriority` order:

```
Current service fails → next service by priority → all fail → Pinyin
```

- The currently selected service is always tried first, then the priority list in order
- Every service has a **10-second timeout**; on timeout the next service is tried
- The global translation timeout is also 10 seconds, after which Pinyin takes over
- Pinyin is the final safety net — translation **never fails**

## Automatic Language Detection

All services detect the source language automatically. Supported:

- Chinese
- Japanese
- Korean
- Russian
- Any other non-English characters
