# 快速开始

## 安装

### 从 VSCode Marketplace 安装（推荐）

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "变量翻译助手" 或 "Variable Translator"
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

# 编译
npm run compile

# 打包
npm run build
```

## 基本使用

### 文件路径翻译

1. 在资源管理器中右键新建文件
2. 输入包含非英文字符的路径，如 `测试文件/test.js`
3. 选择命名格式
4. 文件自动翻译创建

### 选中文本翻译

1. 在编辑器中选中非英文文本
2. 按 `Alt+Shift+T`
3. 选择命名格式
4. 文本自动替换为英文

### 撤回翻译

1. 按 `Alt+Shift+Z`
2. 翻译后的文件被删除
3. 1 分钟内可撤回

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Shift+T` | 翻译选中文本 |
| `Alt+Shift+Z` | 撤回文件翻译 |
| `Alt+Shift+D` | 切换文件翻译开关 |
| `Alt+Shift+S` | 切换翻译服务 |
