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
Press Alt+Shift+Z → Delete translated file/directory → Close editor window for that file
```

**Undo Rules**:
- Undo operation directly deletes the translated file, not restoring to original non-English path
- Only closes the editor window for the deleted file, not other open files
- **Can undo within 1 minute**, after which the undo cache is automatically cleared

### Filename Conflict Handling

```
Scenario: Target file already exists (e.g., test.test.js exists)
Handling: Automatically add suffix (e.g., test_1.test.js) and prompt user
```

### Translation Failure Degradation

```
Scenario: Translation API call fails (network error, quota exhausted, etc.)
Handling: Automatically degrade to pinyin translation
```

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

### Undo Feature

Use VSCode's built-in undo: `Ctrl+Z`

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
