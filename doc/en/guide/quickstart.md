# Quick Start

## Installation

### From VSCode Marketplace (Recommended)

1. Open VSCode
2. Press `Ctrl+Shift+X` to open the Extensions panel
3. Search for "variable-translator"
4. Click **Install**

### From VSIX

1. Download the `.vsix` file
2. Press `Ctrl+Shift+P` in VSCode
3. Type "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### Build from Source (Developers)

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

::: tip Zero configuration
The extension uses the **Pinyin service** by default, so it works right after installation with no setup. For higher-quality translation, configure an online service — see [Translation Services](/en/guide/services).
:::

## Basic Usage

### File Path Translation

1. Right-click in the Explorer to create a new file (or folder)
2. Enter a path containing non-English characters, e.g. `测试文件/测试.js`
3. Pick a naming format from the popup (e.g. camelCase)
4. The file is created as `testFile/test.js`

If you press `Esc` to cancel the format picker, the original file is **kept as-is** without translation.

### Selection Translation

1. Select non-English text in the editor, e.g. `用户名称`
2. Press `Alt+Shift+T`
3. Pick a naming format
4. The text is replaced with English, e.g. `userName`

### Translate & Copy to Clipboard

1. Select non-English text
2. Press `Alt+Shift+C`
3. Pick a naming format
4. The translation is copied to the clipboard — the original text is **not replaced**

### Undo a File Translation

1. Press `Alt+Shift+Z` within 1 minute after a file translation (or `Ctrl+Z` when focus is in the Explorer or another non-text-input area)
2. The translated file is deleted and directories created by the translation are cleaned up
3. The corresponding editor tab is closed automatically

## Keyboard Shortcuts

| Shortcut | Feature |
|----------|---------|
| `Alt+Shift+T` | Translate selection |
| `Alt+Shift+C` | Translate & copy to clipboard |
| `Alt+Shift+Z` | Undo file translation |
| `Ctrl+Z` | Undo file translation (within 1 minute, focus outside text input areas) |
| `Alt+Shift+D` | Toggle file translation |
| `Alt+Shift+S` | Switch translation service |

See [Shortcuts](/en/guide/shortcuts) for details.
