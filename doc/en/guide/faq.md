# FAQ

## Common Issues

### Q: Why did translation fail?

**Possible Causes**:
1. Network connection issues
2. Invalid or expired API Key
3. Service quota exhausted

**Solutions**:
1. Check network connection
2. Verify API Key is correct
3. Switch to another translation service

### Q: How to switch translation service?

Press `Alt+Shift+S` or use Command Palette `Ctrl+Shift+P` → "Switch Translation Service".

### Q: How to disable file translation?

Press `Alt+Shift+D` to toggle the switch, or modify in settings:

```json
{
  "variableTranslator.enableFileTranslation": false
}
```

### Q: Why can't I use the undo feature?

The undo feature is only valid within 1 minute. After 1 minute, the undo record is automatically cleared.

### Q: Which languages are supported for translation?

The plugin supports auto-detection and translation of:
- Chinese
- Japanese
- Korean
- Russian
- Any other non-English characters

### Q: What if translation result is inaccurate?

1. Try switching to another translation service
2. Check if the original text has special characters
3. For professional terminology, consider using OpenAI service

### Q: How to configure translation services?

Configure `variableTranslator.services` in VSCode settings, see [Configuration](/en/guide/config).

### Q: How to get API Key?

| Service | URL | Description |
|---------|-----|-------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Create API Key |
| Baidu Translation | [fanyi-api.baidu.com](https://fanyi-api.baidu.com/) | Enable General Translation API |
| Tencent Translation | [console.cloud.tencent.com/cam/capi](https://console.cloud.tencent.com/cam/capi) | Get SecretId/SecretKey |
| Bing/Azure | [portal.azure.com](https://portal.azure.com/) | Create Translator resource |
| DeepLX | [github.com/DeepLX/DeepLX](https://github.com/DeepLX/DeepLX) | Local deployment |

For detailed steps, see [Translation Services Documentation](/en/guide/services).

### Q: How is filename conflict handled?

When the target file already exists, the plugin automatically adds a suffix (e.g., `test_1.test.js`) and prompts the user.

### Q: What happens if translation fails?

When translation fails, the plugin automatically degrades to pinyin translation, ensuring the filename is still usable.

## Technical Issues

### Q: How to build from source?

```bash
# Clone the project
git clone https://github.com/AnsStory/hias-variable-translator.git

# Install dependencies
npm install --registry https://registry.npmmirror.com

# Compile
npm run compile

# Build
npm run build
```

### Q: How to debug the plugin?

1. Open the project in VSCode
2. Press F5 to start debugging
3. Test plugin features in the new window

### Q: How to contribute code?

1. Fork the project
2. Create a feature branch
3. Submit a Pull Request

## Contact

- GitHub Issues: https://github.com/AnsStory/hias-variable-translator/issues
