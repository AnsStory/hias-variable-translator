# FAQ

## 常见问题

### Q: 为什么翻译失败了？

**可能原因**：
1. 网络连接问题
2. API Key 无效或过期
3. 服务配额用完

**解决方案**：
1. 检查网络连接
2. 验证 API Key 是否正确
3. 切换到其他翻译服务

### Q: 如何切换翻译服务？

按 `Alt+Shift+S` 或使用命令面板 `Ctrl+Shift+P` → "切换翻译服务"。

### Q: 文件翻译功能如何关闭？

按 `Alt+Shift+D` 切换开关状态，或在设置中修改：

```json
{
  "variableTranslator.enableFileTranslation": false
}
```

### Q: 撤回功能为什么不能用了？

撤回功能仅在 1 分钟内有效。超过 1 分钟后，撤回记录会被自动清空。

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
3. 对于专业术语，建议使用 OpenAI 服务

### Q: 如何配置翻译服务？

在 VSCode 设置中配置 `variableTranslator.services`，详见 [配置项](/guide/config)。

### Q: 文件名冲突怎么处理？

当目标文件已存在时，插件会自动添加后缀（如 `test_1.test.js`）并提示用户。

### Q: 翻译失败会怎样？

翻译失败时，插件会自动降级为拼音翻译，确保文件名仍然可以使用。

## 技术问题

### Q: 如何从源码构建？

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

### Q: 如何调试插件？

1. 在 VSCode 中打开项目
2. 按 F5 启动调试
3. 在新窗口中测试插件功能

### Q: 如何贡献代码？

1. Fork 项目
2. 创建功能分支
3. 提交 Pull Request

## 联系方式

- GitHub Issues: https://github.com/variable-translator-publisher/variable-translator/issues
