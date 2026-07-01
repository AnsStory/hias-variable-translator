# Translation Services

## Service List

| Service | Authentication | Cost | Description |
|---------|---------------|------|-------------|
| VS Code Copilot | Zero config | Requires Copilot subscription | Recommended, no extra configuration needed |
| ChatGPT / OpenAI | API Key | Pay per use | Requires OpenAI API Key |
| Google Translation | Free (limited) | Free | No configuration needed, but has rate limits |
| Bing / Azure Translator | API Key | Pay per use | Requires Azure account |
| DeepLX | Local deployment | Free | Requires local service deployment |
| Baidu Translation | APP_ID + Key | Pay per use | Requires Baidu Translation account |
| Tencent Translation | SecretId + SecretKey | Pay per use | Requires Tencent Cloud account |

## API Key Acquisition

### OpenAI

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Register/Login
3. Go to [API Keys page](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the generated API Key (format: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

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
4. No additional configuration needed

## Switching Methods

### Shortcut Key

Press `Alt+Shift+S` to quickly switch translation service.

### Command Palette

1. Press `Ctrl+Shift+P`
2. Type "Switch Translation Service"
3. Select the service to use

## Service Features

### VS Code Copilot

- **Pros**: Zero config, high translation quality
- **Cons**: Requires Copilot subscription
- **Recommendation**: First choice

### Google Translation

- **Pros**: Free, no configuration needed
- **Cons**: Has rate limits
- **Recommendation**: Backup service

### OpenAI

- **Pros**: High translation quality
- **Cons**: Requires API Key, pay per use
- **Recommendation**: Use when high quality translation is needed

### Baidu Translation

- **Pros**: Domestic service, fast speed
- **Cons**: Requires account registration
- **Recommendation**: Recommended for domestic users

### Tencent Translation

- **Pros**: Domestic service, fast speed
- **Cons**: Requires Tencent Cloud account
- **Recommendation**: Recommended for domestic users

## Service Degradation

When translation service fails, the plugin automatically degrades by priority:

```
Current service failed → Degrade to next service → All services failed → Degrade to pinyin
```

## Auto Language Detection

All translation services support auto language detection, capable of translating:

- Chinese
- Japanese
- Korean
- Russian
- Any other non-English characters
