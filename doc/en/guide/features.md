# Features

## Feature 1: File Path Translation

### Use Case

Users create new files in VSCode explorer with paths containing any non-English characters. The plugin automatically detects the language and translates to English.

### Operation Flow

```
Right-click new file → Enter path → Enter → Select format → Enter → Auto translate and create
```

### Example

```
Input: 用户名称/测试文件/测试.test.js

Format selection:
- camelCase:      userName/testFile/test.test.js
- PascalCase:     UserName/TestFile/Test.test.js
- snake_case:     user_name/test_file/test.test.js
- CONSTANT_CASE:  USER_NAME/TEST_FILE/TEST.test.js
- param-case:     user-name/test-file/test.test.js
- Header-Case:    User-Name/Test-File/Test.test.js
```

### Undo Feature

```
Press Alt+Shift+Z → Delete translated file/directory → Auto-clean empty directories → Close editor window for that file
```

**Undo Rules**:
- Undo operation directly deletes the translated file, not restoring to original non-English path
- Automatically cleans up only directories created by translation: determined by comparing paths before and after translation; identical prefix segments (e.g., `src/`) belong to the user and are never cleaned
- Only closes the editor window for the deleted file, not other open files
- **Can undo within 1 minute**, after which the undo cache is automatically cleared

> Example: typing `你好/世界/美好.test.js` under `src/` translates to `src/hello/world/beautiful.test.js`; undoing will remove `hello/world/` and `hello/`, but `src/` is preserved regardless of whether it is empty.

### Filename Conflict Handling

```
Scenario: Target file already exists (e.g., test.test.js exists)
Handling: Automatically add suffix (e.g., test_1.test.js) and prompt user
```

### Translation Failure Degradation

```
Scenario: Translation API call fails (network error, quota exhausted, etc.)
Handling: Degrade to next service by priority → All services failed → Auto-degrade to pinyin translation
```

::: tip Timeout Protection
All translation services have **10-second timeout control**, and global translation timeout is also 10 seconds. On timeout, automatically degrades to the next service, ultimately falling back to pinyin.
:::

### Configuration

This feature can be enabled/disabled in settings:

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

---

## Feature 2: Selected Text Translation

### Use Case

Users write non-English characters in any file, select them and translate via shortcut.

### Operation Flow

```
Select text → Press Alt+Shift+T → Select format → Enter → Replace with English
```

### Example

```
Select: 用户名称
Press: Alt+Shift+T

Format selection:
- camelCase:      userName
- PascalCase:     UserName
- snake_case:     user_name
- CONSTANT_CASE:  USER_NAME
- param-case:     user-name
- Header-Case:    User-Name
- Capital Case:   User Name
- no case:        user name
```

### Undo

After text translation, use VSCode's built-in `Ctrl+Z` to undo the replacement. For file path translation undo, use `Alt+Shift+Z` (see Feature 1).

---

## Feature 3: Translate and Copy to Clipboard

### Use Case

Users write non-English characters in any file, select them and translate via shortcut, then copy multiple formats to clipboard history.

### Operation Flow

```
Select text → Press Alt+Shift+C → Select format → Translation result copied to clipboard
```

### Example

```
Select: 用户名称
Press: Alt+Shift+C
Select format: camelCase

Configured clipboardFormats: ["originalValue", "camelCase", "snake_case"]

Copied to clipboard history:
- 用户名称 (original value, the text before translation)
- userName (camelCase)
- user_name (snake_case)

Current clipboard: userName (user selected format)
```

### Configuration

```json
{
  "variableTranslator.copyToClipboard": true,
  "variableTranslator.clipboardFormats": [
    "camelCase",
    "originalValue",
    "PascalCase",
    "no case",
    "snake_case",
    "CONSTANT_CASE",
    "param-case",
    "Header-Case",
    "Capital Case"
  ]
}
```

### clipboardFormats Options

| Value | Description |
|-------|-------------|
| `camelCase` | Lower camel case |
| `PascalCase` | Upper camel case |
| `snake_case` | Underscore separated |
| `CONSTANT_CASE` | Constant case |
| `param-case` | Hyphen separated |
| `Header-Case` | Header case |
| `no case` | Space separated |
| `` | Original text before translation (the Chinese text you selected) |

---

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
