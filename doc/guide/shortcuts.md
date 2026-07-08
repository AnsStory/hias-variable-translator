# 快捷键

| 快捷键 (Windows/Linux) | 快捷键 (macOS) | 功能 | 说明 |
|------------------------|----------------|------|------|
| `Alt+Shift+T` | `Option+Shift+T` | 翻译选中文本 | 编辑器中选中非英文文本后翻译 |
| `Alt+Shift+Z` | `Option+Shift+Z` | 撤回文件翻译 | 删除翻译后的文件/目录（1分钟内有效） |
| `Alt+Shift+D` | `Option+Shift+D` | 切换文件翻译开关 | 开启/关闭文件路径翻译功能 |
| `Alt+Shift+S` | `Option+Shift+S` | 切换翻译服务 | 选择不同的翻译服务 |

## 快捷键说明

### Alt+Shift+T - 翻译选中文本

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

### Alt+Shift+Z - 撤回文件翻译

**使用方法**：
1. 新建文件后，按 `Alt+Shift+Z`
2. 翻译后的文件被删除
3. 相关编辑器窗口关闭

**注意事项**：
- 仅在 1 分钟内有效
- 删除的是翻译后的文件，不是原始文件
- 会递归删除空目录

### Alt+Shift+D - 切换文件翻译开关

**使用方法**：
1. 按 `Alt+Shift+D`
2. 状态栏显示当前状态

**状态说明**：
- 开启：文件翻译：已开启 ✓
- 关闭：文件翻译：已关闭 ✗

### Alt+Shift+S - 切换翻译服务

**使用方法**：
1. 按 `Alt+Shift+S`
2. 选择要使用的翻译服务

**可选服务**：
- VS Code Copilot
- ChatGPT / OpenAI
- 谷歌翻译
- Bing / Azure Translator
- DeepLX
- 百度翻译
- 腾讯翻译君

## 状态栏显示

### 文件翻译开关状态

```
切换 Alt+Shift+D 时显示：
- 开启：文件翻译：已开启 ✓
- 关闭：文件翻译：已关闭 ✗
- 显示时间：2-3秒后自动消失
```

### 当前翻译服务

```
状态栏显示：
[Copilot] 文件翻译：已开启 ✓
```
