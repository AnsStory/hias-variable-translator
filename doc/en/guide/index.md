# Introduction

**variable-translator** is a VSCode extension that automatically detects any non-English characters (Chinese, Japanese, Korean, Russian, etc.) in file paths or selected text and translates them into properly-cased English.

Know exactly what to name something in your native language, but stuck on the English? Just type it as-is and let the extension translate it into `camelCase`, `snake_case` or any of the 8 supported naming formats.

## Core Features

| Feature | Trigger | Description |
|---------|---------|-------------|
| File path translation | Create file/folder in Explorer | Detects non-English path segments and translates them on creation |
| Selection translation | `Alt+Shift+T` | Translates and replaces the selected text |
| Translate & copy | `Alt+Shift+C` | Writes the translation in multiple formats to the clipboard history |
| Undo translation | `Alt+Shift+Z` / `Ctrl+Z` | Undoes a file translation within 1 minute and cleans up created directories (Ctrl+Z only when focus is outside text input areas) |
| File translation toggle | `Alt+Shift+D` | Quickly enables/disables file path translation |
| Switch service | `Alt+Shift+S` | Switches between 7 translation services |

## Highlights

- **Automatic language detection**: no source language needed — any non-English characters are recognized
- **8 naming formats**: camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case, Capital Case, no case
- **Multiple translation services**: OpenAI, Google Translate, Bing/Azure, DeepLX, Baidu, Tencent and Pinyin
- **Automatic fallback**: failed services fall back by priority, ending with Pinyin — translation never fails
- **Timeout protection**: a global 10-second translation timeout keeps the editor responsive
- **Zero configuration**: the default Pinyin service works out of the box, no API key required

## Supported Languages

The extension automatically detects and translates the following languages into English:

| Language | Example |
|----------|---------|
| Chinese | 用户名称 → userName |
| Japanese | ユーザー名 → userName |
| Korean | 사용자 이름 → userName |
| Russian | Имя пользователя → userName |
| Others | Any non-English characters |

## Naming Formats

### File Translation Formats

| Format | Example | Description |
|--------|---------|-------------|
| camelCase | userName | Lower camel case |
| PascalCase | UserName | Upper camel case |
| snake_case | user_name | Underscore-separated, lowercase |
| CONSTANT_CASE | USER_NAME | Underscore-separated, uppercase |
| param-case | user-name | Hyphen-separated, lowercase |
| Header-Case | User-Name | Hyphen-separated, capitalized |

### Additional Formats for Selection Translation

| Format | Example | Description |
|--------|---------|-------------|
| Capital Case | User Name | Space-separated, capitalized |
| no case | user name | Space-separated, lowercase |

## Next Steps

- [Quick Start](/en/guide/quickstart) - Install and get started
- [Features](/en/guide/features) - Learn each feature in detail
- [Configuration](/en/guide/config) - Full configuration reference
- [Translation Services](/en/guide/services) - Sign up and configure each service
