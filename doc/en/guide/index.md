# Introduction

Variable Translator is a VSCode extension that automatically detects and translates any non-English characters to English.

## Features

- **Multi-language Auto-detection**: Support Chinese, Japanese, Korean, Russian and any other non-English characters
- **File Path Translation**: Automatically translate non-English characters in file paths when creating new files
- **Text Translation**: One-click translate and replace selected text
- **Multiple Naming Formats**: Support camelCase, PascalCase, snake_case and 6 other formats
- **Multiple Translation Services**: Support 7 translation services, switch freely
- **One-click Undo**: Undo translations within 1 minute

## Supported Languages

The plugin automatically detects and translates the following languages:

| Language | Example |
|----------|---------|
| Chinese | 用户名称 → userName |
| Japanese | ユーザー名 → userName |
| Korean | 사용자 이름 → userName |
| Russian | Имя пользователя → userName |
| Others | Any non-English characters |


## Naming Format Description

### File Translation Formats

| Format | Example | Description |
|--------|---------|-------------|
| camelCase | userName | Lower camel case, first letter lowercase |
| PascalCase | UserName | Upper camel case, first letter uppercase |
| snake_case | user_name | Underscore separated, all lowercase |
| CONSTANT_CASE | USER_NAME | Underscore separated, all uppercase |
| param-case | user-name | Hyphen separated, all lowercase |
| Header-Case | User-Name | Hyphen separated, first letter uppercase |

### Selected Text Translation Additional Formats

| Format | Example | Description |
|--------|---------|-------------|
| Capital Case | User Name | First letter uppercase, space separated |
| no case | user name | All lowercase, space separated |
