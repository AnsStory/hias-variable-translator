# 快捷键

| 快捷键 (Windows/Linux) | 快捷键 (macOS) | 功能 | 说明 |
|------------------------|----------------|------|------|
| `Alt+Shift+T` | `Option+Shift+T` | 翻译选中文本 | 编辑器中选中非英文文本后翻译替换 |
| `Alt+Shift+C` | `Option+Shift+C` | 翻译并复制到剪贴板 | 翻译后复制多种格式到剪贴板历史，不替换原文 |
| `Alt+Shift+X` | `Option+Shift+X` | 翻译并剪切到剪贴板 | 翻译后复制到剪贴板，同时删除选中的原文 |
| `Alt+Shift+Z` | `Option+Shift+Z` | 撤回文件翻译 | 删除翻译后的文件/目录（1 分钟内有效） |
| `Ctrl+Z` | `Cmd+Z` | 撤回文件翻译（条件生效） | 仅在 1 分钟内且焦点不在文本输入区（如资源管理器）时生效，编辑器内保持原生文字撤销 |
| `Alt+Shift+D` | `Option+Shift+D` | 切换文件翻译开关 | 开启/关闭文件路径翻译功能 |
| `Alt+Shift+S` | `Option+Shift+S` | 切换翻译服务 | 在 7 种翻译服务间快速切换 |

以上功能也可在编辑器右键菜单中找到（翻译选中文本、翻译并复制需先选中文本）。

## 快捷键说明

### Alt+Shift+T - 翻译选中文本

**生效条件**：编辑器聚焦且有选中文本。

**使用方法**：
1. 在编辑器中选中非英文文本
2. 按 `Alt+Shift+T`
3. 选择翻译格式
4. 文本自动替换为英文

**支持格式**：
- camelCase
- PascalCase
- snake_case
- CONSTANT_CASE
- param-case
- Header-Case
- Capital Case
- no case

替换后可用 VSCode 自带的 `Ctrl+Z` 撤销。

### Alt+Shift+C - 翻译并复制到剪贴板

**生效条件**：编辑器聚焦且有选中文本。

**使用方法**：
1. 在编辑器中选中非英文文本
2. 按 `Alt+Shift+C`
3. 选择翻译格式
4. 翻译结果复制到剪贴板历史，原文本不变

**配置示例**：
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

**效果**：选中「用户名称」选择 camelCase 后，剪贴板历史中依次包含：
- `用户名称`（originalValue，原始文本）
- `userName`（camelCase）
- `user_name`（snake_case）

当前剪贴板保留用户选择的格式（`userName`），全部格式需通过 **Win+V** 剪贴板历史取用。

### Alt+Shift+X - 翻译并剪切到剪贴板

**生效条件**：编辑器聚焦且有选中文本。

**使用方法**：
1. 在编辑器中选中非英文文本
2. 按 `Alt+Shift+X`
3. 选择翻译格式
4. 翻译结果复制到剪贴板历史，同时删除选中的原文

**配置示例**：
```json
{
  "variableTranslator.copyToClipboard": true,
  "variableTranslator.clipboardFormats": [
    "camelCase",
    "PascalCase",
    "snake_case"
  ]
}
```

**效果**：选中「用户名称」选择 camelCase 后：
- 原文本「用户名称」被删除
- 剪贴板历史中依次包含：
  - `userName`（camelCase）
  - `UserName`（PascalCase）
  - `user_name`（snake_case）

**与 Alt+Shift+C 的区别**：Alt+Shift+X 在翻译复制后会删除原文，相当于"剪切翻译复制"。

### Alt+Shift+Z / Ctrl+Z - 撤回文件翻译

**使用方法**：
1. 文件翻译完成后，按 `Alt+Shift+Z`（或在资源管理器等非文本输入区按 `Ctrl+Z`）
2. 翻译后的文件被删除
3. 相关编辑器窗口关闭

**注意事项**：
- 仅在 **1 分钟内**有效，超时后撤回记录自动清空
- `Ctrl+Z` 仅在存在可撤回记录且焦点不在文本输入区时生效；编辑器内的 `Ctrl+Z` 始终保持 VSCode 原生文字撤销，不受影响
- 撤回完成后到 1 分钟窗口结束前，再次按 `Ctrl+Z` 会提示“没有可撤回的翻译记录”，而不会触发 VSCode 原生文件撤销（原生撤销栈中“创建原始文件”的记录在翻译重命名后已失效，触发会报错）
- 删除的是翻译后的文件，不会恢复原始非英文路径
- 仅清理翻译时创建的目录（通过对比翻译前后路径判断，不会删除用户原有目录）

### Alt+Shift+D - 切换文件翻译开关

**使用方法**：
1. 按 `Alt+Shift+D`
2. 状态栏显示当前状态

**状态说明**：
- 开启：文件翻译：已开启 ✓
- 关闭：文件翻译：已关闭 ✗

等价于修改配置项 `variableTranslator.enableFileTranslation`。

### Alt+Shift+S - 切换翻译服务

**使用方法**：
1. 按 `Alt+Shift+S`
2. 选择要使用的翻译服务

**可选服务**：
- 拼音（零配置，默认）
- ChatGPT / OpenAI
- 谷歌翻译
- Bing / Azure Translator
- DeepLX
- 百度翻译
- 腾讯翻译君

选择未配置的服务时，插件会提示打开设置页面。

## 状态栏显示

### 文件翻译开关状态

```
切换 Alt+Shift+D 时显示：
- 开启：文件翻译：已开启 ✓
- 关闭：文件翻译：已关闭 ✗
- 显示时间：2-3 秒后自动消失
```

### 当前翻译服务

```
状态栏显示：
[拼音] 文件翻译：已开启 ✓
```

## 修改快捷键

如快捷键与其他插件冲突，可自行修改：

1. 按 `Ctrl+K Ctrl+S` 打开键盘快捷方式
2. 搜索 `variableTranslator`
3. 双击对应命令重新绑定按键
