# 功能说明

## 功能 1：文件路径翻译

### 使用场景

用户在 VSCode 资源管理器中右键新建文件，输入包含任意非英文字符的路径，插件自动检测语言并翻译为英文。

### 操作流程

```
右键新建文件 → 输入路径 → 回车 → 选择翻译格式 → 回车 → 自动翻译创建
```

### 示例

```
输入：用户名称/测试文件/测试.test.js

格式选择：
- camelCase:      userName/testFile/test.test.js
- PascalCase:     UserName/TestFile/Test.test.js
- snake_case:     user_name/test_file/test.test.js
- CONSTANT_CASE:  USER_NAME/TEST_FILE/TEST.test.js
- param-case:     user-name/test-file/test.test.js
- Header-Case:    User-Name/Test-File/Test.test.js
```

### 撤回功能

```
按 Alt+Shift+Z → 删除翻译后的文件/目录 → 关闭该文件的编辑器窗口
```

**撤回规则**：
- 撤回操作会直接删除翻译后的文件，而不是恢复到原始非英文路径
- 只关闭被删除文件的编辑器窗口，不会关闭其他已打开的文件
- **1分钟内可撤回**，1分钟后自动清空撤回缓存

### 文件名冲突处理

```
场景：目标文件已存在（如 test.test.js 已存在）
处理：自动添加后缀（如 test_1.test.js）并提示用户
```

### 翻译失败降级

```
场景：翻译API调用失败（网络错误、配额用完等）
处理：自动降级为拼音翻译
```

### 配置项

此功能可在设置中开启/关闭：

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

---

## 功能 2：选中文本翻译

### 使用场景

用户在任意文件中编写非英文字符，选中后通过快捷键翻译并替换。

### 操作流程

```
选中文本 → 按下 Alt+Shift+T → 选择翻译格式 → 回车 → 替换为英文
```

### 示例

```
选中：用户名称
按下：Alt+Shift+T

格式选择：
- camelCase:      userName
- PascalCase:     UserName
- snake_case:     user_name
- CONSTANT_CASE:  USER_NAME
- param-case:     user-name
- Header-Case:    User-Name
- Capital Case:   User Name
- no case:        user name
```

### 撤回功能

使用 VSCode 自带的撤销功能：`Ctrl+Z`

---

## 功能 3：翻译并复制到剪贴板

### 使用场景

用户在任意文件中编写非英文字符，选中后通过快捷键翻译并复制多种格式到剪贴板历史。

### 操作流程

```
选中文本 → 按下 Alt+Shift+C → 选择翻译格式 → 翻译结果复制到剪贴板
```

### 示例

```
选中：用户名称
按下：Alt+Shift+C
选择格式：camelCase

配置的 clipboardFormats：["originalValue", "camelCase", "snake_case"]

复制到剪贴板历史：
- 用户名称（原始值，翻译前的原始文本）
- userName（camelCase）
- user_name（snake_case）

当前剪贴板：userName（用户选择的格式）
```

### 配置项

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
    "CONSTANT_CASE"
  ]
}
```

### clipboardFormats 可选值

| 值 | 说明 |
|----|------|
| `camelCase` | 小驼峰 |
| `PascalCase` | 大驼峰 |
| `snake_case` | 下划线 |
| `CONSTANT_CASE` | 常量格式 |
| `param-case` | 连字符 |
| `Header-Case` | 头部连字符 |
| `no case` | 空格分隔 |
| `originalValue` | 翻译前的原始文本（即你选中的中文文本） |

---

## 命名格式说明

### 文件翻译格式

| 格式 | 示例 | 说明 |
|------|------|------|
| camelCase | userName | 小驼峰，首字母小写 |
| PascalCase | UserName | 大驼峰，首字母大写 |
| snake_case | user_name | 下划线分隔，全小写 |
| CONSTANT_CASE | USER_NAME | 下划线分隔，全大写 |
| param-case | user-name | 连字符分隔，全小写 |
| Header-Case | User-Name | 连字符分隔，首字母大写 |

### 选中文本翻译额外格式

| 格式 | 示例 | 说明 |
|------|------|------|
| Capital Case | User Name | 首字母大写，空格分隔 |
| no case | user name | 全小写，空格分隔 |
