# Quick Start

## Installation

### Install from VSCode Marketplace (Recommended)

1. Open VSCode
2. Press `Ctrl+Shift+X` to open the Extensions panel
3. Search for "变量翻译助手"
4. Click **Install**

### Install from VSIX

1. Download the `.vsix` file
2. In VSCode, press `Ctrl+Shift+P`
3. Type "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### Build from Source (Developers)

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

## Basic Usage

### File Path Translation

1. Right-click in the explorer to create a new file
2. Enter a path with non-English characters, e.g., `测试文件/test.js`
3. Select a naming format
4. File is automatically translated and created

### Text Translation

1. Select non-English text in the editor
2. Press `Alt+Shift+T`
3. Select a naming format
4. Text is automatically replaced with English

### Undo Translation

1. Press `Alt+Shift+Z`
2. Translated file is deleted
3. Can undo within 1 minute

## Shortcuts

| Shortcut | Function |
|----------|----------|
| `Alt+Shift+T` | Translate selected text |
| `Alt+Shift+C` | Translate and copy to clipboard |
| `Alt+Shift+Z` | Undo file translation |
| `Alt+Shift+D` | Toggle file translation |
| `Alt+Shift+S` | Switch translation service |
