# FAQ

## Frequently Asked Questions

### Q: Do I need to configure anything after installing?

No. The extension uses the **Pinyin service** by default (zero configuration, works offline). For higher-quality translation, configure an online service such as OpenAI or Google Translate — see [Translation Services](/en/guide/services).

### Q: Why is my result in pinyin?

Pinyin is the default service and also the final fallback when online services fail. If you configured an online service but still get pinyin, check:

1. The currently selected service may not be the one you configured (press `Alt+Shift+S` to check/switch)
2. The online service failed (network issue, invalid API key, quota exhausted) and the extension fell back to Pinyin
3. The translation timed out (global 10-second limit) and fell back to Pinyin

### Q: Why did the translation fail?

**Possible causes**:
1. Network connectivity issues
2. Invalid or expired API key
3. Service quota exhausted

**Solutions**:
1. Check your network connection
2. Verify the API key
3. Switch to another service (`Alt+Shift+S`)

Even if every online service fails, the extension falls back to pinyin conversion so the feature keeps working.

### Q: How do I switch translation services?

Press `Alt+Shift+S`, use the Command Palette (`Ctrl+Shift+P` → "切换翻译服务"), or the editor context menu.

### Q: How do I disable file translation?

Press `Alt+Shift+D` to toggle it, or change the setting:

```json
{
  "variableTranslator.enableFileTranslation": false
}
```

### Q: What happens if I cancel the format picker when creating a file?

Pressing `Esc` keeps the original file/folder **as-is** (with its non-English name) — no translation is applied.

### Q: Why doesn't undo work anymore?

Undo is only valid within **1 minute** after a file translation. After that the undo record is cleared automatically.

### Q: Why doesn't Ctrl+Z in the editor undo a file translation?

`Ctrl+Z` triggers the file-translation undo only when **focus is outside text input areas** (e.g. the Explorer) and a valid undo record exists within 1 minute; `Ctrl+Z` in the editor always keeps VSCode's native text undo. Use `Alt+Shift+Z` when the editor is focused.

### Q: Why weren't directories cleaned up after undo?

Undo deletes the translated file and cleans up directories **created by the translation**. This is determined by comparing the paths before and after translation: only changed segments were created by translation; identical prefix segments (e.g. `src/`) are pre-existing and never removed.

Example: entering `你好/世界/美好.test.js` under `src/`, translated to `src/hello/world/beautiful.test.js`. Undo removes `hello/world/` and `hello/`, but `src/` is kept whether empty or not.

### Q: How are file name conflicts handled?

If the target file already exists, a numeric suffix is appended automatically (e.g. `test_1.test.js`) with a notification.

### Q: Why does Ctrl+V only paste one format?

Multiple formats are written to the **clipboard history** one by one. A plain `Ctrl+V` pastes only the **current clipboard** (the format you picked). Enable the system clipboard history (press **Win+V** on Windows) to pick any of the other formats.

### Q: Which languages are supported?

The extension automatically detects and translates:
- Chinese
- Japanese
- Korean
- Russian
- Any other non-English characters

### Q: What if the translation is inaccurate?

1. Try another translation service
2. Check the source text for special characters
3. For technical terms, the OpenAI service is recommended (it understands programming context)

### Q: How do I configure translation services?

Set `variableTranslator.services` in VSCode settings — see [Configuration](/en/guide/config).

### Q: How do I get API keys?

| Service | Where | Notes |
|---------|-------|-------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Create an API key |
| Google Translate | [console.cloud.google.com](https://console.cloud.google.com/) | Enable the Cloud Translation API, then create a key |
| Bing/Azure | [portal.azure.com](https://portal.azure.com/) | Create a Translator resource |
| DeepLX | [DeepLX on GitHub](https://github.com/OwO-Network/DeepLX) | Local deployment, no key needed |
| Baidu Translate | [fanyi-api.baidu.com](https://fanyi-api.baidu.com/) | Enable the General Translation API |
| Tencent Translator | [console.cloud.tencent.com/cam/capi](https://console.cloud.tencent.com/cam/capi) | Obtain SecretId/SecretKey |

See [Translation Services](/en/guide/services) for step-by-step guides.

### Q: What is the `copilot` config value?

`copilot` is a legacy value that actually maps to the **Pinyin service**, shown as "拼音 (Pinyin)" in the service picker.

## Technical Questions

### Q: How do I build from source?

```bash
# Clone the project
git clone https://github.com/AnsStory/hias-variable-translator.git

# Install dependencies
npm install

# Type-check compile
npm run compile

# Build
npm run build

# Package a .vsix
npm run vsce:package
```

### Q: How do I run the tests?

```bash
# Single run
npm run test

# Watch mode
npm run test:watch
```

### Q: How do I debug the extension?

1. Open the project in VSCode
2. Press F5 to start debugging
3. Test the extension in the new window

### Q: How do I contribute?

1. Fork the project
2. Create a feature branch
3. Submit a Pull Request

## Contact

- GitHub Issues: https://github.com/AnsStory/hias-variable-translator/issues
