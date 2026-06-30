# 变量翻译助手

VSCode 插件 - 自动检测并翻译任意非英文字符为英文

## 功能特性

- **多语言支持**：自动检测中文、日文、韩文、俄文等任意非英文字符并翻译为英文
- **文件路径翻译**：新建文件时自动翻译路径中的非英文字符
- **文本翻译**：选中文本后一键翻译替换
- **多种命名格式**：支持 camelCase、PascalCase、snake_case 等 8 种命名格式
- **多翻译服务**：支持 Pinyin、OpenAI、Google、Bing、百度、腾讯等 7 种翻译服务
- **一键撤回**：1 分钟内可撤回翻译，自动清理文件和目录

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

### 从源码构建

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

## 使用说明

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

## 命名格式

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

## 翻译服务

| 服务 | 认证方式 | 费用 | 说明 |
|------|----------|------|------|
| Pinyin | 零配置 | 免费 | 降级方案，无需配置 |
| ChatGPT / OpenAI | API Key | 按量付费 | 需要 OpenAI API Key |
| 谷歌翻译 | 免费（有限制） | 免费 | 无需配置，但有调用限制 |
| Bing / Azure Translator | API Key | 按量付费 | 需要 Azure 账号 |
| DeepLX | 本地部署 | 免费 | 需要本地部署服务 |
| 百度翻译 | APP_ID + Key | 按量付费 | 需要百度翻译开放平台账号 |
| 腾讯翻译君 | SecretId + SecretKey | 按量付费 | 需要腾讯云账号 |

## 配置项

```json
{
  // 启用文件路径翻译功能（右键新建文件时自动翻译）
  "variableTranslator.enableFileTranslation": true,

  // 选择翻译服务：copilot | openai | google | bing | deeplx | baidu | tencent
  "variableTranslator.translationService": "copilot",

  // 翻译服务优先级（从高到低，翻译失败时按顺序降级，逗号分隔）
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // 翻译服务配置（无需配置的服务可省略）
  "variableTranslator.services": {
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key"
    },
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    }
  }
}
```

## 开发

### 环境要求

- Node.js >= 20
- VSCode >= 1.80.0

### 开发命令

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

# 代码格式化
npm run format

# 打包插件
npm run vsce:package
```

### 调试

1. 在 VSCode 中打开项目
2. 按 F5 启动调试（会自动编译并打开新窗口）
3. 在新窗口中测试插件功能

### 文档开发

```bash
# 启动文档开发服务器
npm run docs:dev

# 构建文档
npm run docs:build

# 预览文档
npm run docs:preview
```

## 项目结构

```
变量翻译助手/
├── src/
│   ├── extension.ts              # 插件入口
│   ├── translator.ts             # 翻译器
│   ├── namingConvention.ts       # 命名格式转换
│   ├── chineseDetector.ts        # 非英文字符检测
│   ├── undoManager.ts            # 撤回管理
│   ├── config.ts                 # 配置管理
│   └── services/                 # 翻译服务实现
│       ├── index.ts              # 服务接口定义
│       ├── pinyin.ts             # 拼音服务
│       ├── openai.ts             # OpenAI服务
│       ├── google.ts             # Google翻译服务
│       ├── bing.ts               # Bing翻译服务
│       ├── deeplx.ts             # DeepLX服务
│       ├── baidu.ts              # 百度翻译服务
│       └── tencent.ts            # 腾讯翻译服务
├── doc/                          # VitePress 文档
├── package.json                  # 插件配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 构建配置
├── eslint.config.js              # ESLint 配置
├── .prettierrc                   # Prettier 配置
└── LICENSE                       # MIT 许可证
```

## 许可证

[MIT License](LICENSE)
