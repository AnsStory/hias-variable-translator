# Features

## Feature 1: File Path Translation

### Scenario

Create a new file/folder in the VSCode Explorer with a path containing any non-English characters — the extension detects the language and translates it into English.

### Workflow

```
Create file → enter path → Enter → pick a naming format → Enter → translated & created
```

If you press `Esc` to cancel the format picker, the original file/folder is **kept as-is** without translation.

### Trailing-Digit Format Shortcut (skips the picker)

With `enableDigitFormatShortcut` enabled (default), a lone digit at the end of **each path segment** (extension stripped first; segments split by path separators and dots) is used as that **segment's** format number — the same mapping as typing a number in the picker (1=camelCase, 2=PascalCase, 3=snake_case, 4=CONSTANT_CASE, 5=param-case, 6=Header-Case) — and the digit is excluded from that segment's translation and written name. Directory and file formats are independent:

- When the file segment (the last one) hits, **the picker is skipped**; otherwise the picker shows and its choice applies only to the file segment plus segments with "no digit and nothing to inherit"
- A directory segment without a digit inherits the format of the **nearest downstream segment that has a digit**; if nothing in the whole path has a digit, everything uses the picked format (legacy behavior)

```
Input:  用户/信息/用户1.java
Hit:    file segment 1 = camelCase (picker skipped)
Result: user/information/user.java (Java template content is replaced with user, not 用户1/user1)

Input:  用户/信息1/用户2.java
Hit:    信息1 = camelCase(1), 用户2 = PascalCase(2), 用户 inherits 信息1 downstream
Result: user/information/User.java
```

The clipboard original also drops the digit (`用户2.java`'s original is `用户`). A digit stays literal when the shortcut does not apply to that segment: consecutive digits (`用户12`), a digit not at the end (`用户1信息`), or an out-of-range number (`7`/`8`/`9` for files, `0` anywhere). Selected text follows the same rule (7=Capital Case, 8=no case and 9=Sentence case apply to text only) — see Feature 2.

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

::: tip Trailing-digit format shortcut
When the selected text ends with a lone digit (e.g. `用户1`), the picker is skipped and the digit's format number is used directly (1-8 all available for text). The digit is excluded from translation and from the clipboard original (`用户1`'s original is `用户`), and disappears with the replaced selection (result is `user`, not `user1`). See "Trailing-Digit Format Shortcut" under Feature 1 for the full rules.
:::

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
- Sentence case:  User name
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
    "Capital Case",
    "Sentence case"
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
| `Sentence case` | Only the first letter of the phrase capitalized |
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

## Feature 5: Format Selection & Copy (Strip Symbols)

### Scenario

The selection is already English but carries separators such as `/` `.` `+` `@` `-` `_`, and you just want it collapsed into a naming format (e.g. the MIME type `application/json` → `applicationJson`). Non-English fragments inside the selection are translated first.

Unlike "Selection Translation" (`Alt+Shift+T`), which silently skips pure-English text, this command **does not require non-English characters** — it only strips symbols and reformats.

Like "Translate & Copy" (`Alt+Shift+C`), the result **goes to the clipboard and never touches the document**; the difference is that this command also works on pure-English selections.

### Workflow

```
Select text → press Alt+Shift+N → pick a naming format → the result lands on the clipboard (document unchanged)
```

::: tip Trailing-digit format shortcut
Same convention as Feature 2: selecting `application/json1` skips the picker and uses format number 1 (camelCase); the digit is excluded from the result (`applicationJson`).
:::

### Example

```
Selected:   application/json
Pressed:    Alt+Shift+N → type 1 (camelCase)

Clipboard:  applicationJson   (the selection stays as it was)
```

Every symbol acts as a separator, so arbitrarily complex strings split and rejoin:

```
Selected: application/vnd.api+json@2.0

- camelCase:      applicationVndApiJson20
- PascalCase:     ApplicationVndApiJson20
- snake_case:     application_vnd_api_json_2_0
- CONSTANT_CASE:  APPLICATION_VND_API_JSON_2_0
- param-case:     application-vnd-api-json-2-0
- Header-Case:    Application-Vnd-Api-Json-2-0
- Capital Case:   Application Vnd Api Json 2 0
- no case:        application vnd api json 2 0
- Sentence case:  Application vnd api json 2 0
```

Mixed text translates only its non-English fragments; English and symbols feed the splitter as-is:

```
Selected: 用户名称/json
Pressed:  Alt+Shift+N → type 3 (snake_case)

Result:   user_name_json
```

### Notes

- In-word apostrophes (`'` `’` `＇` `` ` ``) are removed to keep words intact (`user's` → `users`); every other non-alphanumeric character is a separator
- A selection of pure symbols (e.g. `///`) yields no words after sanitizing, so nothing is copied
- Without `copyToClipboard` only the format you picked is copied; with it enabled the formats in `clipboardFormats` are written one by one into the clipboard history (**Win+V**), and the current clipboard holds the format you picked
- The selection is never modified, so there is nothing to undo

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
| Capital Case | User Name | Space-separated, every word capitalized |
| no case | user name | Space-separated, lowercase |
| Sentence case | User name | Space-separated, only the first letter capitalized |
