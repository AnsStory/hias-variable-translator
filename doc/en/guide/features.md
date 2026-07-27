# Features

## Feature 1: File Path Translation

### Scenario

Create a new file/folder in the VSCode Explorer with a path containing any non-English characters — the extension detects the language and translates it into English.

### Workflow

```
Create file → enter path → Enter → pick a naming format → Enter → translated & created
```

If you press `Esc` to cancel the format picker, the original file/folder is **kept as-is** without translation.

### Example

```
Input: 用户名称/测试文件/测试.test.js

Format options:
- camelCase:      userName/testFile/test.test.js
- PascalCase:     UserName/TestFile/Test.test.js
- snake_case:     user_name/test_file/test.test.js
- CONSTANT_CASE:  USER_NAME/TEST_FILE/TEST.test.js
- param-case:     user-name/test-file/test.test.js
- Header-Case:    User-Name/Test-File/Test.test.js
```

### Undo

```
Press Alt+Shift+Z → translated file/directories deleted → empty directories cleaned up → editor tab closed
```

**Undo rules**:
- Undo deletes the translated file; it does not restore the original non-English path
- Only directories created by the translation are cleaned: the extension compares the paths before and after translation, so unchanged prefix segments (e.g. `src/`) are treated as pre-existing and never removed
- Only the editor tab of the deleted file is closed; other open files are untouched
- Undo is available for **1 minute**; the undo record is cleared automatically afterwards
- Within that minute, `Ctrl+Z` also triggers undo when focus is outside text input areas (e.g. the Explorer); `Ctrl+Z` in the editor keeps its native text undo behavior

> Example: entering `你好/世界/美好.test.js` under `src/`, translated to `src/hello/world/beautiful.test.js`. Undoing removes `hello/world/` and `hello/`, but `src/` is kept whether empty or not.

### File Name Conflicts

```
Scenario: the target file already exists (e.g. test.test.js)
Behavior: a numeric suffix is appended automatically (e.g. test_1.test.js) with a notification
```

### Translation Failure Fallback

```
Scenario: the translation API call fails (network error, quota exhausted, etc.)
Behavior: fall back to the next service by priority → all services fail → fall back to Pinyin
```

::: tip Timeout protection
Every translation service has a **10-second timeout**, and the global translation timeout is also 10 seconds. On timeout the extension falls back to the next service, ending with Pinyin — so file creation always succeeds.
:::

### Copy to Clipboard

After a file path translation, the extension reuses the "Translate & Copy" (`Alt+Shift+C`) clipboard logic: the translation of the **last path segment** (without extension) is written to the clipboard, honoring the `clipboardFormats` setting.

```
Input: 你好/世界/美好.js
Translated: hello/world/beautiful.js
Copied: beautiful (translation of the last segment)
```

- With `copyToClipboard` enabled and `clipboardFormats` configured: each format is written to the clipboard history in order (the format you picked goes first)
- Otherwise: only the single format you picked is copied as a fallback
- `originalValue` copies the pre-translation text of that segment (e.g. `美好`)

::: tip Multiple formats rely on clipboard history (Win+V)
Formats are written to the clipboard history **one by one**. Enable the system clipboard history (press **Win+V** on Windows) to access all of them; a plain `Ctrl+V` only pastes the **current clipboard** (the format you picked). The clipboard writes happen **before** the translated file is opened, so a focus change from the new editor cannot drop intermediate history entries.
:::

### Setting

This feature can be toggled in settings, or quickly via `Alt+Shift+D`:

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

---

## Feature 2: Selection Translation

### Scenario

Write non-English text anywhere, select it and translate-and-replace via shortcut — ideal for naming variables, functions and classes.

### Workflow

```
Select text → press Alt+Shift+T → pick a naming format → Enter → replaced with English
```

### Example

```
Selected: 用户名称
Pressed: Alt+Shift+T

Format options:
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

Use VSCode's built-in `Ctrl+Z` to undo the replacement. To undo a file path translation, use `Alt+Shift+Z`, or press `Ctrl+Z` while focus is in the Explorer or another non-text-input area (see Feature 1).

---

## Feature 3: Translate & Copy to Clipboard

### Scenario

Select non-English text and copy its translation in multiple naming formats to the clipboard history — the original text is **not replaced**. Great for drafting names in comments/docs first, then pasting the English into code.

### Workflow

```
Select text → press Alt+Shift+C → pick a naming format → translation copied to clipboard
```

### Example

```
Selected: 用户名称
Pressed: Alt+Shift+C
Picked format: camelCase

Configured clipboardFormats: ["originalValue", "camelCase", "snake_case"]

Written to clipboard history:
- 用户名称 (originalValue, the pre-translation text)
- userName (camelCase)
- user_name (snake_case)

Current clipboard: userName (the format you picked)
```

### Settings

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

### clipboardFormats Values

| Value | Description |
|-------|-------------|
| `camelCase` | Lower camel case |
| `PascalCase` | Upper camel case |
| `snake_case` | Underscore-separated |
| `CONSTANT_CASE` | Constant style |
| `param-case` | Hyphen-separated |
| `Header-Case` | Capitalized hyphen-separated |
| `Capital Case` | Capitalized space-separated |
| `no case` | Space-separated |
| `originalValue` | The pre-translation text (what you selected) |

---

## Feature 4: Switch Translation Service

Press `Alt+Shift+S` or use the editor context menu to switch between:

- Pinyin (zero configuration, default)
- ChatGPT / OpenAI
- Google Translate
- Bing / Azure Translator
- DeepLX
- Baidu Translate
- Tencent Translator

Picking a service that is not yet configured prompts you to open the settings. See [Translation Services](/en/guide/services).

---

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
