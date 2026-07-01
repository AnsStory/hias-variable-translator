# 变量翻译助手：让非英文命名不再是烦恼

在多语言开发环境中，我们经常会遇到这样的问题：项目中需要使用英文命名变量、函数和文件，但有时候手边的资料或者需求文档却是中文的。手动翻译不仅费时费力，还容易出错。今天，我为大家介绍一款VSCode插件——**变量翻译助手**，它能自动检测并翻译非英文字符，让你的命名工作变得轻松高效。

## 功能亮点

### 多语言支持

变量翻译助手支持多种语言的自动检测和翻译，包括但不限于：
- 中文
- 日文
- 韩文
- 俄文

无论你的源文本是什么语言，它都能准确识别并翻译成英文。

### 文件路径翻译

新建文件或文件夹时，如果路径中包含非英文字符，插件会自动弹出格式选择框，让你选择合适的命名格式。例如：

1. 在资源管理器中右键新建文件
2. 输入包含中文的路径，如 `测试文件/test.js`
3. 选择命名格式（如camelCase、snake_case等）
4. 文件自动翻译并创建

### 选中文本翻译

在编辑器中选中非英文文本，按 `Alt+Shift+T` 即可快速翻译并替换。支持8种命名格式：

| 格式 | 示例 | 说明 |
|------|------|------|
| camelCase | userName | 小驼峰，首字母小写 |
| PascalCase | UserName | 大驼峰，首字母大写 |
| snake_case | user_name | 下划线分隔，全小写 |
| CONSTANT_CASE | USER_NAME | 下划线分隔，全大写 |
| param-case | user-name | 连字符分隔，全小写 |
| Header-Case | User-Name | 连字符分隔，首字母大写 |
| Capital Case | User Name | 首字母大写，空格分隔 |
| no case | user name | 全小写，空格分隔 |

### 多翻译服务支持

插件支持7种翻译服务，你可以根据需求选择最适合的：

| 服务 | 认证方式 | 费用 | 说明 |
|------|----------|------|------|
| VS Code Copilot | 零配置 | 免费 | 推荐，无需配置 |
| ChatGPT / OpenAI | API Key | 按量付费 | 需要OpenAI API Key |
| 谷歌翻译 | 免费（有限制） | 免费 | 无需配置，但有调用限制 |
| Bing / Azure Translator | API Key | 按量付费 | 需要Azure账号 |
| DeepLX | 本地部署 | 免费 | 需要本地部署服务 |
| 百度翻译 | APP_ID + Key | 按量付费 | 需要百度翻译开放平台账号 |
| 腾讯翻译君 | SecretId + SecretKey | 按量付费 | 需要腾讯云账号 |

### 一键撤回

翻译后发现不满意？1分钟内可以一键撤回！按 `Alt+Shift+Z` 即可删除翻译后的文件，自动清理文件和目录。

## 快捷键一览

| 快捷键 | 功能 |
|--------|------|
| `Alt+Shift+T` | 翻译选中文本 |
| `Alt+Shift+Z` | 撤回文件翻译 |
| `Alt+Shift+D` | 切换文件翻译开关 |
| `Alt+Shift+S` | 切换翻译服务 |

## 配置示例

```json
{
  // 启用文件路径翻译功能（右键新建文件时自动翻译）
  "variableTranslator.enableFileTranslation": true,

  // 选择翻译服务
  "variableTranslator.translationService": "copilot",

  // 翻译服务优先级（从高到低，翻译失败时按顺序降级）
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // 翻译服务配置
  "variableTranslator.services": {
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    }
  }
}
```

## 安装方式

### 从VSCode Marketplace安装（推荐）

1. 打开VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "变量翻译助手"
4. 点击 **Install** 安装

## 开发环境

如果你对这个插件感兴趣，也可以参与开发：

```bash
# 安装依赖
npm install --registry https://registry.npmmirror.com

# 编译
npm run compile

# 开发构建
npm run build:dev

# 生产构建（带代码混淆）
npm run build

# 代码检查
npm run lint

# 打包插件
npm run vsce:package
```

## 总结

变量翻译助手是一款专为多语言开发环境设计的VSCode插件，它能自动检测并翻译非英文字符，支持文件路径翻译和选中文本翻译，提供多种命名格式和翻译服务选择。无论你是个人开发者还是团队协作，这款插件都能帮助你提高工作效率，让非英文命名不再是烦恼。

立即安装体验吧！如果你有任何建议或问题，欢迎在GitHub上提出Issue。

---

**项目地址**: https://github.com/AnsStory/hias-variable-translator

**文档地址**: https://ansstory.github.io/hias-variable-translator/
