# Shortcuts

## Shortcut List

| Shortcut | Function | Description |
|----------|----------|-------------|
| `Alt+Shift+T` | Translate selected text | Translate non-English text selected in editor |
| `Alt+Shift+Z` | Undo file translation | Delete translated file/directory (valid within 1 minute) |
| `Alt+Shift+D` | Toggle file translation | Enable/disable file path translation feature |
| `Alt+Shift+S` | Switch translation service | Select different translation service |

## Shortcut Details

### Alt+Shift+T - Translate Selected Text

**How to use**:
1. Select non-English text in editor
2. Press `Alt+Shift+T`
3. Select translation format
4. Text is automatically replaced with English

**Supported Formats**:
- camelCase
- PascalCase
- snake_case
- CONSTANT_CASE
- param-case
- Header-Case
- Capital Case
- no case

### Alt+Shift+Z - Undo File Translation

**How to use**:
1. After creating a file, press `Alt+Shift+Z`
2. Translated file is deleted
3. Related editor window is closed

**Notes**:
- Only valid within 1 minute
- Deletes the translated file, not the original file
- Recursively deletes empty directories

### Alt+Shift+D - Toggle File Translation

**How to use**:
1. Press `Alt+Shift+D`
2. Status bar shows current status

**Status Description**:
- Enabled: File Translation: Enabled ✓
- Disabled: File Translation: Disabled ✗

### Alt+Shift+S - Switch Translation Service

**How to use**:
1. Press `Alt+Shift+S`
2. Select the translation service to use

**Available Services**:
- VS Code Copilot
- ChatGPT / OpenAI
- Google Translation
- Bing / Azure Translator
- DeepLX
- Baidu Translation
- Tencent Translation

## Status Bar Display

### File Translation Switch Status

```
When toggling Alt+Shift+D:
- Enabled: File Translation: Enabled ✓
- Disabled: File Translation: Disabled ✗
- Display time: Disappears after 2-3 seconds
```

### Current Translation Service

```
Status bar display:
[Copilot] File Translation: Enabled ✓
```
