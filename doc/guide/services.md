# 翻译服务

## 服务列表

| 服务 | 认证方式 | 费用 | 说明 |
|------|----------|------|------|
| 拼音 (Pinyin) | 零配置 | 免费 | 默认服务与降级兜底，支持中日韩字符拼音转换，离线可用 |
| ChatGPT / OpenAI | API Key | 按量付费 | 支持自定义 baseUrl/model，兼容第三方 OpenAI 接口 |
| 谷歌翻译 | API Key | 按量付费 | 官方 Cloud Translation API，需 Google Cloud API Key |
| Bing / Azure Translator | API Key | 按量付费 | 需要 Azure 账号，支持自定义区域 |
| DeepLX | 本地部署 | 免费 | 自动健康检查，支持自定义服务地址 |
| 百度翻译 | APP_ID + Key | 按量付费 | 需要百度翻译开放平台账号 |
| 腾讯翻译君 | SecretId + SecretKey | 按量付费 | 支持自定义区域（默认 ap-guangzhou） |

::: info 配置值说明
配置项 `translationService` 中的 `copilot` 是历史遗留值，实际映射到**拼音服务**。
:::

## API 获取方式

### OpenAI

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 进入 [API Keys 页面](https://platform.openai.com/api-keys)
4. 点击 "Create new secret key"
5. 复制生成的 API Key（格式：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
6. （可选）自定义 `baseUrl` 以使用第三方 OpenAI 兼容 API
7. （可选）自定义 `model` 以使用其他模型（默认 `gpt-3.5-turbo`）

### 谷歌翻译

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 注册/登录账号并创建项目
3. 启用 [Cloud Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)
4. 进入「API 和服务 → 凭据」创建 API Key
5. 复制 API Key 填入插件配置

### Bing / Azure Translator

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 注册/登录账号
3. 创建 [Translator](https://portal.azure.com/#create/Microsoft.CognitiveServicesMultiService) 资源
4. 进入资源 → "密钥和终结点"
5. 复制 API Key 和 Region

### DeepLX

1. 访问 [DeepLX](https://deeplx.owo.network/) 或 [DeepLX GitHub](https://github.com/OwO-Network/DeepLX)
2. 按照说明本地部署服务
3. 默认地址：`http://127.0.0.1:1188`，支持自定义 `baseUrl` 配置
4. 插件自动健康检查（60 秒缓存），确保服务可用性检测准确
5. 无需额外配置

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
6. （可选）自定义 `region` 以使用其他区域（默认 `ap-guangzhou`）

## 切换方式

### 快捷键

按 `Alt+Shift+S` 快速切换翻译服务。

### 命令面板

1. 按 `Ctrl+Shift+P`
2. 输入 "切换翻译服务"
3. 选择要使用的服务

### 右键菜单

在编辑器中右键 → 「切换翻译服务」。

::: tip 未配置的服务
选择需要密钥但尚未配置的服务时，插件会提示「未配置，是否打开设置？」，点击后直接跳转到 `variableTranslator.services` 设置项。
:::

## 服务特点

### 拼音 (Pinyin)

- **优点**：零配置、离线可用，支持中日韩字符拼音转换
- **缺点**：只是拼音转换，不是真正的翻译
- **推荐**：开箱即用的默认方案，也是所有服务失败时的最后兜底

### OpenAI

- **优点**：翻译质量高，理解编程语境，支持自定义 baseUrl/model
- **缺点**：需要 API Key，按量付费
- **推荐**：需要高质量翻译时使用，可通过第三方兼容 API 降低成本

### 谷歌翻译

- **优点**：官方 API，翻译质量稳定，无验证码/封 IP 风险
- **缺点**：需要 Google Cloud 账号与 API Key，按量付费
- **推荐**：需要稳定谷歌翻译质量时使用

### Bing / Azure Translator

- **优点**：微软官方 API，质量稳定，有免费额度
- **缺点**：需要 Azure 账号
- **推荐**：已有 Azure 账号的用户

### DeepLX

- **优点**：本地部署，免费，自动健康检查
- **缺点**：需要本地部署服务
- **推荐**：注重隐私或免费需求时使用

### 百度翻译

- **优点**：国内服务，速度快
- **缺点**：需要注册账号
- **推荐**：国内用户推荐

### 腾讯翻译君

- **优点**：国内服务，速度快，支持自定义区域
- **缺点**：需要腾讯云账号
- **推荐**：国内用户推荐

## 服务降级

当翻译服务调用失败时，插件会按 `servicePriority` 配置的优先级自动降级：

```
当前服务失败 → 按优先级降级到下一个服务 → 所有服务失败 → 降级为拼音
```

- 当前选中的服务始终优先尝试，之后按优先级列表顺序降级
- 所有翻译服务均有 **10 秒超时控制**，超时后自动降级到下一个服务
- 全局翻译超时也为 10 秒，超时后自动降级为拼音转换
- 拼音是最后兜底，保证翻译**永不失败**

## 自动语言检测

所有翻译服务均支持自动语言检测，可翻译以下语言：

- 中文
- 日文
- 韩文
- 俄文
- 其他非英文字符
