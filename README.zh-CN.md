# [变量翻译助手](https://ansstory.github.io/hias-variable-translator/)


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

# 运行测试
npm run test

# 测试监听模式
npm run test:watch

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

### 项目结构
```
变量翻译助手/
├── src/
│   ├── extension.ts              # 插件入口，整合所有功能
│   ├── translate/                # 翻译模块
│   │   ├── index.ts              # 模块导出
│   │   ├── handler.ts            # 翻译操作处理函数
│   │   ├── translator.ts         # 翻译器，整合翻译服务
│   │   ├── config.ts             # 配置管理器
│   │   ├── clipboard.ts          # 剪贴板工具函数
│   │   ├── namingConvention.ts   # 命名格式转换（8种格式）
│   │   ├── chineseDetector.ts    # 非英文字符检测
│   │   ├── undoManager.ts        # 撤回管理（1分钟缓存）
│   │   └── services/             # 翻译服务实现
│   │       ├── index.ts          # 服务接口定义
│   │       ├── utils.ts          # 共享工具（fetchWithTimeout, isAbortError等）
│   │       ├── pinyin.ts         # 拼音服务（降级方案）
│   │       ├── openai.ts         # OpenAI服务
│   │       ├── google.ts         # Google翻译服务（官方 Cloud Translation API）
│   │       ├── bing.ts           # Bing翻译服务
│   │       ├── deeplx.ts         # DeepLX服务
│   │       ├── baidu.ts          # 百度翻译服务
│   │       └── tencent.ts        # 腾讯翻译服务
│   └── print/                    # 打印模块（console.log功能）
│       ├── index.ts              # 模块导出
│       ├── handler.ts            # console.log操作处理
│       ├── config.ts             # 打印模块配置
│       └── ast.ts                # AST解析，确定插入位置
├── tests/                        # 单元测试（Vitest, 208个测试用例）
│   ├── print/                    # 打印模块测试
│   └── translate/                # 翻译模块测试
├── package.json                  # 插件配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 构建配置
├── eslint.config.js              # ESLint 配置
├── .prettierrc                   # Prettier 配置
├── .gitignore                    # Git 忽略文件
├── LICENSE                       # MIT 许可证
└── README.md                     # 项目文档
```

## 许可证

[MIT License](LICENSE)
