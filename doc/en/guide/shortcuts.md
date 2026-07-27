# Shortcuts

| Shortcut (Windows/Linux) | Shortcut (macOS) | Feature | Description |
|--------------------------|------------------|---------|-------------|
| `Alt+Shift+T` | `Option+Shift+T` | Translate selection | Translate and replace selected non-English text |
| `Alt+Shift+C` | `Option+Shift+C` | Translate & copy | Copy multiple formats to the clipboard history, without replacing |
| `Alt+Shift+Z` | `Option+Shift+Z` | Undo file translation | Delete the translated file/directories (within 1 minute) |
| `Ctrl+Z` | `Cmd+Z` | Undo file translation (conditional) | Only within 1 minute and when focus is outside text input areas (e.g. the Explorer); `Ctrl+Z` in the editor keeps its native text undo |
| `Alt+Shift+D` | `Option+Shift+D` | Toggle file translation | Enable/disable file path translation |
| `Alt+Shift+S` | `Option+Shift+S` | Switch translation service | Switch between 7 services |

These commands are also available in the editor context menu (translate/copy require a selection).

## Details

### Alt+Shift+T - Translate Selection

**Requires**: editor focused with a selection.

**Usage**:
1. Select non-English text in the editor
2. Press `Alt+Shift+T`
3. Pick a naming format
4. The text is replaced with English

**Formats**:
- camelCase
- PascalCase
- snake_case
- CONSTANT_CASE
- param-case
- Header-Case
- Capital Case
- no case

Use VSCode's built-in `Ctrl+Z` to undo the replacement.

### Alt+Shift+C - Translate & Copy to Clipboard

**Requires**: editor focused with a selection.

**Usage**:
1. Select non-English text in the editor
2. Press `Alt+Shift+C`
3. Pick a naming format
4. The translation is copied to the clipboard history; the original text is untouched

**Example settings**:
```json
{
  "variableTranslator.copyToClipboard": true,
  "variableTranslator.clipboardFormats": [
    "originalValue",
    "camelCase",
    "snake_case"
  ]
}
```

**Result**: selecting `用户名称` and picking camelCase writes to the clipboard history:
- `用户名称` (originalValue, the original text)
- `userName` (camelCase)
- `user_name` (snake_case)

The current clipboard holds the format you picked (`userName`); use **Win+V** clipboard history to access the rest.

### Alt+Shift+Z / Ctrl+Z - Undo File Translation

**Usage**:
1. Press `Alt+Shift+Z` after a file translation (or `Ctrl+Z` when focus is in the Explorer or another non-text-input area)
2. The translated file is deleted
3. The related editor tab is closed

**Notes**:
- Valid for **1 minute** only; the undo record is cleared afterwards
- `Ctrl+Z` only triggers the undo when a valid undo record exists and focus is outside text input areas; `Ctrl+Z` in the editor always keeps VSCode's native text undo
- After a successful undo and until the 1-minute window ends, pressing `Ctrl+Z` again shows "no undoable translation record" instead of falling through to VSCode's native file undo (whose "create original file" entry became stale after the translation rename and would error)
- Deletes the translated file — it does not restore the original non-English path
- Only directories created by the translation are cleaned up (determined by comparing paths before/after translation; pre-existing directories are never removed)

### Alt+Shift+D - Toggle File Translation

**Usage**:
1. Press `Alt+Shift+D`
2. The status bar shows the current state

**States**:
- On: 文件翻译：已开启 ✓
- Off: 文件翻译：已关闭 ✗

Equivalent to changing the `variableTranslator.enableFileTranslation` setting.

### Alt+Shift+S - Switch Translation Service

**Usage**:
1. Press `Alt+Shift+S`
2. Pick a service

**Available services**:
- Pinyin (zero configuration, default)
- ChatGPT / OpenAI
- Google Translate
- Bing / Azure Translator
- DeepLX
- Baidu Translate
- Tencent Translator

Picking an unconfigured service prompts you to open the settings.

## Status Bar

### File Translation State

```
Shown when toggling with Alt+Shift+D:
- On:  文件翻译：已开启 ✓
- Off: 文件翻译：已关闭 ✗
- Disappears automatically after 2-3 seconds
```

### Current Service

```
Status bar:
[拼音] 文件翻译：已开启 ✓
```

## Rebinding Shortcuts

If a shortcut conflicts with another extension:

1. Press `Ctrl+K Ctrl+S` to open Keyboard Shortcuts
2. Search for `variableTranslator`
3. Double-click a command to rebind it
