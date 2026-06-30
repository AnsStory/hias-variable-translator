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

When translation service call fails, the plugin automatically degrades to pinyin translation:

```
Translation API call failed → Auto degrade to pinyin
```

## Auto Language Detection

All translation services support auto language detection, capable of translating:

- Chinese
- Japanese
- Korean
- Russian
- Any other non-English characters
