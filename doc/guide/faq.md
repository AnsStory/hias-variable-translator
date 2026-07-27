# FAQ

## 常见问题

### Q: 插件安装后需要配置吗？

不需要。插件默认使用**拼音服务**（零配置、离线可用），安装后即可使用。如需更高质量的翻译，可配置 OpenAI、谷歌翻译等在线服务，详见[翻译服务](/guide/services)。

### Q: 为什么翻译结果是拼音？

拼音是默认服务，同时也是所有在线服务失败时的兜底方案。如果你配置了在线服务却得到拼音结果，可能原因：

1. 当前选中的服务不是你配置的服务（按 `Alt+Shift+S` 查看/切换）
2. 在线服务调用失败（网络问题、API Key 无效、配额用完），自动降级为拼音
3. 翻译超时（全局 10 秒），自动降级为拼音

### Q: 为什么翻译失败了？

**可能原因**：
1. 网络连接问题
2. API Key 无效或过期
3. 服务配额用完

**解决方案**：
1. 检查网络连接
2. 验证 API Key 是否正确
3. 切换到其他翻译服务（`Alt+Shift+S`）

即使所有在线服务都失败，插件也会自动降级为拼音转换，保证功能可用。

### Q: 如何切换翻译服务？

按 `Alt+Shift+S`，或使用命令面板 `Ctrl+Shift+P` → "切换翻译服务"，也可在编辑器右键菜单中选择。

### Q: 文件翻译功能如何关闭？

按 `Alt+Shift+D` 切换开关状态，或在设置中修改：

```json
{
  "variableTranslator.enableFileTranslation": false
}
```

### Q: 新建文件时取消了格式选择会怎样？

按 `Esc` 取消格式选择时，原文件/文件夹会**原样保留**（保持非英文名称），不做翻译。

### Q: 撤回功能为什么不能用了？

撤回功能仅在文件翻译完成后的 **1 分钟内**有效。超过 1 分钟后，撤回记录会被自动清空。

### Q: 为什么在编辑器里按 Ctrl+Z 没有撤回文件翻译？

`Ctrl+Z` 撤回文件翻译仅在**焦点不在文本输入区**（如资源管理器）且存在 1 分钟内的可撤回记录时生效；编辑器内的 `Ctrl+Z` 始终保持 VSCode 原生文字撤销。在编辑器聚焦时请改用 `Alt+Shift+Z`。

### Q: 撤回翻译后目录没有被清理？

撤回操作会自动删除翻译后的文件，并清理翻译时创建的目录。判断依据是**对比翻译前后的路径**：只有发生变化的路径段才是翻译创建的，相同的前缀段（如 `src/`）属于用户原有目录，绝不清理。

例如：在 `src/` 下输入 `你好/世界/美好.test.js` 翻译为 `src/hello/world/beautiful.test.js` 后撤回，会删除 `hello/world/` 和 `hello/`，但 `src/` 无论是否为空都会保留。

### Q: 文件名冲突怎么处理？

当目标文件已存在时，插件会自动添加数字后缀（如 `test_1.test.js`）并提示用户。

### Q: 为什么按 Ctrl+V 只粘贴出一种格式？

多格式复制是「逐条写入剪贴板历史」，普通 `Ctrl+V` 只会粘贴**当前剪贴板**（你选择的格式）。要取用其他格式，需开启系统剪贴板历史（Windows 按 **Win+V**）并从历史面板中选取。

### Q: 支持哪些语言的翻译？

插件支持自动检测并翻译以下语言：
- 中文
- 日文
- 韩文
- 俄文
- 其他非英文字符

### Q: 翻译结果不准确怎么办？

1. 尝试切换到其他翻译服务
2. 检查原文是否有特殊字符
3. 对于专业术语，建议使用 OpenAI 服务（可理解编程语境）

### Q: 如何配置翻译服务？

在 VSCode 设置中配置 `variableTranslator.services`，详见[配置项](/guide/config)。

### Q: 如何获取 API Key？

| 服务 | 获取地址 | 说明 |
|------|----------|------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | 创建 API Key |
| 谷歌翻译 | [console.cloud.google.com](https://console.cloud.google.com/) | 启用 Cloud Translation API 后创建 |
| Bing/Azure | [portal.azure.com](https://portal.azure.com/) | 创建 Translator 资源 |
| DeepLX | [DeepLX GitHub](https://github.com/OwO-Network/DeepLX) | 本地部署服务，无需 Key |
| 百度翻译 | [fanyi-api.baidu.com](https://fanyi-api.baidu.com/) | 开通通用翻译 API |
| 腾讯翻译君 | [console.cloud.tencent.com/cam/capi](https://console.cloud.tencent.com/cam/capi) | 获取 SecretId/SecretKey |

详细获取步骤请参考[翻译服务文档](/guide/services)。

### Q: 配置项里的 copilot 是什么？

`copilot` 是历史遗留的配置值，实际映射到**拼音服务**，在服务选择列表中显示为「拼音」。

## 技术问题

### Q: 如何从源码构建？

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

### Q: 如何运行测试？

```bash
# 单次运行
npm run test

# 监听模式
npm run test:watch
```

### Q: 如何调试插件？

1. 在 VSCode 中打开项目
2. 按 F5 启动调试
3. 在新窗口中测试插件功能

### Q: 如何贡献代码？

1. Fork 项目
2. 创建功能分支
3. 提交 Pull Request

## 联系方式

- GitHub Issues: https://github.com/AnsStory/hias-variable-translator/issues
