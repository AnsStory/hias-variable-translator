# 快速开始

## 安装

### 从 VSCode Marketplace 安装（推荐）

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "variable-translator"
4. 点击 **Install** 安装

### 从 VSIX 安装

1. 下载 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P`
3. 输入 "Extensions: Install from VSIX..."
4. 选择下载的 `.vsix` 文件

### 从源码构建（开发者）

```bash
# 克隆项目
git clone https://github.com/AnsStory/hias-variable-translator.git

# 安装依赖
npm install --registry https://registry.npmmirror.com

# 类型检查编译
npm run compile

# 打包构建
npm run build

# 生成 .vsix 安装包
npm run vsce:package
```

::: tip 零配置上手
插件默认使用**拼音服务**，安装后无需任何配置即可使用。如需更高质量的翻译，可在[翻译服务](/guide/services)中配置在线服务。
:::

## 基本使用

### 文件路径翻译

1. 在资源管理器中右键新建文件（或文件夹）
2. 输入包含非英文字符的路径，如 `测试文件/测试.js`
3. 在弹出的选择框中选择命名格式（如 camelCase）
4. 文件自动翻译创建为 `testFile/test.js`

按 `Esc` 取消格式选择时，原文件会**原样保留**，不做翻译。

### 选中文本翻译

1. 在编辑器中选中非英文文本，如 `用户名称`
2. 按 `Alt+Shift+T`
3. 选择命名格式
4. 文本自动替换为英文，如 `userName`

### 翻译并复制到剪贴板

1. 选中非英文文本
2. 按 `Alt+Shift+C`
3. 选择命名格式
4. 翻译结果复制到剪贴板，原文本**不会被替换**

### 撤回文件翻译

1. 文件翻译完成后 1 分钟内按 `Alt+Shift+Z`（或在资源管理器等非文本输入区按 `Ctrl+Z`）
2. 翻译后的文件被删除，翻译时创建的目录被清理
3. 对应的编辑器窗口自动关闭

## 快捷键一览

| 快捷键 | 功能 |
|--------|------|
| `Alt+Shift+T` | 翻译选中文本 |
| `Alt+Shift+C` | 翻译并复制到剪贴板 |
| `Alt+Shift+Z` | 撤回文件翻译 |
| `Ctrl+Z` | 撤回文件翻译（1 分钟内且焦点不在文本输入区时） |
| `Alt+Shift+D` | 切换文件翻译开关 |
| `Alt+Shift+S` | 切换翻译服务 |

详见[快捷键](/guide/shortcuts)。
