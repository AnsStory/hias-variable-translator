# 翻译服务

## 服务列表

| 服务 | 认证方式 | 费用 | 说明 |
|------|----------|------|------|
| VS Code Copilot | 零配置 | 需要 Copilot 订阅 | 推荐，无需额外配置 |
| ChatGPT / OpenAI | API Key | 按量付费 | 需要 OpenAI API Key |
| 谷歌翻译 | 免费（有限制） | 免费 | 无需配置，但有调用限制 |
| Bing / Azure Translator | API Key | 按量付费 | 需要 Azure 账号 |
| DeepLX | 本地部署 | 免费 | 需要本地部署服务 |
| 百度翻译 | APP_ID + Key | 按量付费 | 需要百度翻译开放平台账号 |
| 腾讯翻译君 | SecretId + SecretKey | 按量付费 | 需要腾讯云账号 |

## API 获取方式

### OpenAI

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 进入 [API Keys 页面](https://platform.openai.com/api-keys)
4. 点击 "Create new secret key"
5. 复制生成的 API Key（格式：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 百度翻译

1. 访问 [百度翻译开放平台](https://fanyi-api.baidu.com/)
2. 注册/登录账号
3. 进入 [控制台](https://fanyi-api.baidu.com/aitrans)
4. 开通通用翻译 API 服务
5. 获取 APP_ID 和 Secret Key

### 腾讯翻译君

1. 访问 [腾讯云](https://console.cloud.tencent.com/)
2. 注册/登录账号
3. 开通 [机器翻译](https://console.cloud.tencent.com/tmt) 服务
4. 进入 [API 密钥管理](https://console.cloud.tencent.com/cam/capi)
5. 获取 SecretId 和 SecretKey

### Bing / Azure Translator

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 注册/登录账号
3. 创建 [Translator](https://portal.azure.com/#create/Microsoft.CognitiveServicesMultiService) 资源
4. 进入资源 → "密钥和终结点"
5. 复制 API Key 和 Region

### DeepLX

1. 访问 [DeepLX](https://deeplx.owo.network/) 或 [DeepLX GitHub](https://github.com/OwO-Network/DeepLX)
2. 按照说明本地部署服务
3. 默认地址：`http://127.0.0.1:1188`
4. 无需额外配置

## 切换方式

### 快捷键

按 `Alt+Shift+S` 快速切换翻译服务。

### 命令面板

1. 按 `Ctrl+Shift+P`
2. 输入 "切换翻译服务"
3. 选择要使用的服务

## 服务特点

### VS Code Copilot

- **优点**：零配置，翻译质量高
- **缺点**：需要 Copilot 订阅
- **推荐**：首选服务

### 谷歌翻译

- **优点**：免费，无需配置
- **缺点**：有调用限制
- **推荐**：备用服务

### OpenAI

- **优点**：翻译质量高
- **缺点**：需要 API Key，按量付费
- **推荐**：需要高质量翻译时使用

### 百度翻译

- **优点**：国内服务，速度快
- **缺点**：需要注册账号
- **推荐**：国内用户推荐

### 腾讯翻译君

- **优点**：国内服务，速度快
- **缺点**：需要腾讯云账号
- **推荐**：国内用户推荐

## 服务降级

当翻译服务调用失败时，插件会自动按优先级降级：

```
当前服务失败 → 降级到下一个服务 → 所有服务失败 → 降级为拼音
```

## 自动语言检测

所有翻译服务均支持自动语言检测，可翻译以下语言：

- 中文
- 日文
- 韩文
- 俄文
- 其他非英文字符
