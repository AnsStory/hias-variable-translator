# Translation Services

## Service List

| Service | Authentication | Cost | Description |
|---------|---------------|------|-------------|
| Pinyin | Zero config | Free | Fallback service, supports CJK character pinyin conversion |
| ChatGPT / OpenAI | API Key | Pay per use | Custom baseUrl/model, compatible with third-party APIs |
| Google Translation | API Key | Pay per use | Official Cloud Translation API, requires Google Cloud API Key |
| Bing / Azure Translator | API Key | Pay per use | Requires Azure account, supports custom region |
| DeepLX | Local deployment | Free | Auto health check, supports custom service URL |
| Baidu Translation | APP_ID + Key | Pay per use | Requires Baidu Translation account |
| Tencent Translation | SecretId + SecretKey | Pay per use | Supports custom region (default: ap-guangzhou) |

## API Key Acquisition

### OpenAI

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Register/Login
3. Go to [API Keys page](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the generated API Key (format: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
6. (Optional) Customize `baseUrl` to use third-party OpenAI-compatible APIs
7. (Optional) Customize `model` to use other models (default: `gpt-3.5-turbo`)

### Google Translation

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Register/Login and create a project
3. Enable [Cloud Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)
4. Go to "APIs & Services → Credentials" and create an API Key
5. Copy the API Key into the plugin configuration

### Baidu Translation

1. Visit [Baidu Translation Open Platform](https://fanyi-api.baidu.com/)
2. Register/Login
3. Go to [Console](https://fanyi-api.baidu.com/aitrans)
4. Enable General Translation API service
5. Get APP_ID and Secret Key

### Tencent Translation

1. Visit [Tencent Cloud](https://console.cloud.tencent.com/)
2. Register/Login
3. Enable [Machine Translation](https://console.cloud.tencent.com/tmt) service
4. Go to [API Key Management](https://console.cloud.tencent.com/cam/capi)
5. Get SecretId and SecretKey
6. (Optional) Customize `region` to use a different region (default: `ap-guangzhou`)

### Bing / Azure Translator

1. Visit [Azure Portal](https://portal.azure.com/)
2. Register/Login
3. Create [Translator](https://portal.azure.com/#create/Microsoft.CognitiveServicesMultiService) resource
4. Go to resource → "Keys and Endpoint"
5. Copy API Key and Region

### DeepLX

1. Visit [DeepLX](https://deeplx.owo.network/) or [DeepLX GitHub](https://github.com/OwO-Network/DeepLX)
2. Follow instructions for local deployment
3. Default URL: `http://127.0.0.1:1188`
4. Auto health check on startup (60s cache) for accurate availability detection
5. Supports custom `baseUrl` configuration
6. No additional configuration needed

## Switching Methods

### Shortcut Key

Press `Alt+Shift+S` to quickly switch translation service.

### Command Palette

1. Press `Ctrl+Shift+P`
2. Type "Switch Translation Service"
3. Select the service to use

## Service Features

### Pinyin

- **Pros**: Zero config, supports CJK character pinyin conversion
- **Cons**: Lower translation quality than online services
- **Recommendation**: As fallback service

### Google Translation

- **Pros**: Official API, stable quality, no captcha / IP ban risk
- **Cons**: Requires Google Cloud account and API Key, pay per use
- **Recommendation**: Use when stable Google translation quality is needed

### OpenAI

- **Pros**: High translation quality, supports custom baseUrl/model
- **Cons**: Requires API Key, pay per use
- **Recommendation**: Use when high quality translation is needed, compatible with third-party APIs

### Baidu Translation

- **Pros**: Domestic service, fast speed
- **Cons**: Requires account registration
- **Recommendation**: Recommended for domestic users

### DeepLX

- **Pros**: Local deployment, free, auto health check
- **Cons**: Requires local service deployment
- **Recommendation**: Use when privacy or free service is important

### Tencent Translation

- **Pros**: Domestic service, fast speed, supports custom region
- **Cons**: Requires Tencent Cloud account
- **Recommendation**: Recommended for domestic users

## Service Degradation

When translation service fails, the plugin automatically degrades by priority:

```
Current service failed → Degrade to next service → All services failed → Degrade to pinyin
```

All translation services have **10-second timeout control**, automatically degrading to the next service on timeout. Global translation timeout is also 10 seconds, after which it automatically degrades to pinyin conversion.

## Auto Language Detection

All translation services support auto language detection, capable of translating:

- Chinese
- Japanese
- Korean
- Russian
- Any other non-English characters
