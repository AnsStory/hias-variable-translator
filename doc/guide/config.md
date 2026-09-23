# 配置项

## 配置总览

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableFileTranslation` | boolean | `true` | 是否启用文件路径翻译功能 |
| `translateNewFileContent` | boolean | `true` | 新建文件翻译后，是否同步替换文件内容中翻译前的名称 |
| `enableDigitFormatShortcut` | boolean | `true` | 是否启用末尾数字快捷选格式（末段以孤立数字 1-8 结尾时跳过弹窗直选格式） |
| `translationService` | string | `"copilot"` | 当前翻译服务（`copilot` 即拼音服务） |
| `servicePriority` | string | `"copilot,openai,google,bing,deeplx,baidu,tencent"` | 翻译服务优先级（从高到低，逗号分隔） |
| `copyToClipboard` | boolean | `false` | 翻译后是否自动将结果复制到剪贴板 |
| `clipboardFormats` | string[] | `[]` | 复制到剪贴板的命名格式（支持多选） |
| `services` | object | `{}` | 各翻译服务的密钥/地址配置 |

所有配置项均以 `variableTranslator.` 为前缀，在 VSCode 设置（`Ctrl+,`）中搜索 `variableTranslator` 即可找到。

## 配置项详情

### enableFileTranslation

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：是否启用文件路径翻译功能（右键新建文件/文件夹时自动翻译）。也可按 `Alt+Shift+D` 快速切换

```json
{
  "variableTranslator.enableFileTranslation": true
}
```

### translateNewFileContent

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：仅对**新建文件**生效。语言服务器（如 redhat.java）会按翻译前的文件名生成模板内容（`package` 声明、类名），开启后路径翻译完成时会同步把内容中翻译前的路径段替换为翻译后；重命名已有文件不会改动内容

**行为细节**：

1. 重命名前先保存编辑器中的脏缓冲区，避免语言服务器插入的模板在改名后按旧路径写回，导致翻译前后两份文件并存
2. 重命名后读取文件内容，将每个翻译前的路径段（含目录段，如 `用户`→`User`、`信息`→`Information`）替换为翻译后并保存
3. 改名后 4 秒观察窗口内，若语言服务器迟到地把旧名模板写回旧路径，会自动并入翻译后的文件并删除复活的旧文件

**示例**：新建 `用户/信息/用户.java`，翻译为 `User/Information/User.java` 后，内容同步变为：

```java
package User.Information;

public class User {

}
```

```json
{
  "variableTranslator.translateNewFileContent": true
}
```

### enableDigitFormatShortcut

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：是否启用「尾部数字快捷选格式」。名称末尾的孤立数字（1 ~ 格式选项编号）视作格式编号，直接跳过翻译格式弹窗

**规则**：

1. 数字编号与弹窗中"输入数字选格式"是同一套映射：1=camelCase、2=PascalCase、3=snake_case、4=CONSTANT_CASE、5=param-case、6=Header-Case，文本场景另有 7=Capital Case、8=no case（文件/文件夹场景 7、8 不生效，正常弹窗）
2. 只识别**路径最后一段**（文件先去掉扩展名）或**选中文本**最右侧的单个数字；数字前一位仍是数字（如 `用户12`）、数字不在末尾（如 `用户1信息`）都视作名称的一部分，不生效
3. 该数字**不参与翻译与写入**：新建 `用户/信息/用户1.java` 命中 1=camelCase，得到 `user/information/user.java`（内容模板中的名称替换为 `user` 而非 `用户1`/`user1`）；选中 `用户1` 翻译后文档中变为 `user`，数字随选区消失
4. 剪贴板中的原文（`originalValue`）同样剥离数字：`用户1` 的原文为 `用户`

```json
{
  "variableTranslator.enableDigitFormatShortcut": true
}
```

### translationService

- **类型**：`string`
- **默认值**：`"copilot"`
- **可选值**：`"copilot"` | `"openai"` | `"google"` | `"bing"` | `"deeplx"` | `"baidu"` | `"tencent"`
- **说明**：选择翻译服务。也可按 `Alt+Shift+S` 快速切换

::: info copilot 即拼音服务
`copilot` 是历史遗留的配置值，实际映射到**拼音服务**（零配置、离线可用），在服务选择列表中显示为「拼音」。
:::

```json
{
  "variableTranslator.translationService": "openai"
}
```

### servicePriority

- **类型**：`string`
- **默认值**：`"copilot,openai,google,bing,deeplx,baidu,tencent"`
- **说明**：翻译服务优先级（从高到低，逗号分隔）。当前服务翻译失败时，按此顺序依次降级尝试；无效的服务名会被自动过滤

```json
{
  "variableTranslator.servicePriority": "openai,google,bing,deeplx,baidu,tencent"
}
```

### copyToClipboard

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：翻译后是否自动将结果复制到剪贴板（选中文本翻译与文件路径翻译均生效）

```json
{
  "variableTranslator.copyToClipboard": true
}
```

### clipboardFormats

- **类型**：`string[]`
- **默认值**：`[]`
- **说明**：复制到剪贴板的命名格式（支持多选，按顺序逐条写入剪贴板历史）。用户选择的格式会排到第一位

**可选值**：
- `camelCase` - 小驼峰
- `PascalCase` - 大驼峰
- `snake_case` - 下划线
- `CONSTANT_CASE` - 常量格式
- `param-case` - 连字符
- `Header-Case` - 头部连字符
- `Capital Case` - 首字母大写空格分隔
- `no case` - 空格分隔
- `originalValue` - 翻译前的原始文本

```json
{
  "variableTranslator.clipboardFormats": [
    "camelCase",
    "originalValue",
    "PascalCase",
    "no case",
    "snake_case",
    "CONSTANT_CASE",
    "param-case",
    "Header-Case",
    "Capital Case"
  ]
}
```

### services

- **类型**：`object`
- **默认值**：`{}`
- **说明**：翻译服务配置（无需配置的服务可省略，拼音和 DeepLX 无需配置）

```json
{
  "variableTranslator.services": {
    "openai": {
      "apiKey": "sk-xxx",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    },
    "google": {
      "apiKey": "your-google-api-key"
    },
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    },
    "baidu": {
      "appId": "xxx",
      "secretKey": "xxx"
    },
    "tencent": {
      "secretId": "xxx",
      "secretKey": "xxx",
      "region": "ap-guangzhou"
    }
  }
}
```

## 服务配置详情

### OpenAI

```json
{
  "variableTranslator.services": {
    "openai": {
      "apiKey": "your-api-key",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    }
  }
}
```

| 参数 | 说明 | 默认值 | 获取方式 |
|------|------|--------|----------|
| apiKey | OpenAI API Key（必填） | - | https://platform.openai.com/api-keys |
| baseUrl | API 基础地址 | `https://api.openai.com` | 支持第三方 OpenAI 兼容 API |
| model | 模型名称 | `gpt-3.5-turbo` | 支持任意 OpenAI 兼容模型 |

### 谷歌翻译

```json
{
  "variableTranslator.services": {
    "google": {
      "apiKey": "your-google-api-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| apiKey | Google Cloud Translation API Key（必填） | 在 Google Cloud Console 启用 Cloud Translation API 后创建 |

### Bing / Azure Translator

```json
{
  "variableTranslator.services": {
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    }
  }
}
```

| 参数 | 说明 | 默认值 | 获取方式 |
|------|------|--------|----------|
| apiKey | Azure Translator API Key（必填） | - | https://portal.azure.com/ |
| region | Azure Translator Region | `global` | Azure 资源区域 |

### DeepLX

```json
{
  "variableTranslator.services": {
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    }
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| baseUrl | DeepLX 服务地址 | `http://127.0.0.1:1188` |

### 百度翻译

```json
{
  "variableTranslator.services": {
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    }
  }
}
```

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| appId | 百度翻译 APP_ID（必填） | https://fanyi-api.baidu.com/ |
| secretKey | 百度翻译 Secret Key（必填） | https://fanyi-api.baidu.com/ |

### 腾讯翻译君

```json
{
  "variableTranslator.services": {
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"
    }
  }
}
```

| 参数 | 说明 | 默认值 | 获取方式 |
|------|------|--------|----------|
| secretId | 腾讯云 SecretId（必填） | - | https://console.cloud.tencent.com/cam/capi |
| secretKey | 腾讯云 SecretKey（必填） | - | https://console.cloud.tencent.com/cam/capi |
| region | 服务区域 | `ap-guangzhou` | 可选值参考[腾讯翻译区域配置](https://cloud.tencent.com/document/product/551/15051) |

## 无需配置的服务

以下服务无需任何配置即可使用：

- **拼音**（`copilot`）：零配置、离线可用，支持中日韩字符拼音转换，是所有翻译失败时的最后兜底
- **DeepLX**：默认地址为 `http://127.0.0.1:1188`，自动健康检查（60 秒缓存），本地部署后即可使用

---

## 完整配置示例

以下是所有配置项的完整示例，可根据需要复制到 `settings.json` 中：

```json
{
  // 启用文件路径翻译功能（右键新建文件时自动翻译）
  "variableTranslator.enableFileTranslation": true,

  // 选择翻译服务：copilot(拼音) | openai | google | bing | deeplx | baidu | tencent
  "variableTranslator.translationService": "openai",

  // 翻译服务优先级（从高到低，翻译失败时按顺序降级，逗号分隔）
  "variableTranslator.servicePriority": "copilot,openai,google,bing,deeplx,baidu,tencent",

  // 翻译后是否自动将结果复制到剪贴板
  "variableTranslator.copyToClipboard": true,

  // 复制到剪贴板的命名格式（支持多选，按顺序逐条写入剪贴板历史）
  "variableTranslator.clipboardFormats": [
    "camelCase",
    "originalValue",
    "PascalCase",
    "no case",
    "snake_case",
    "CONSTANT_CASE",
    "param-case",
    "Header-Case",
    "Capital Case"
  ],

  // 翻译服务配置（无需配置的服务可省略）
  "variableTranslator.services": {
    // OpenAI 配置
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.openai.com",
      "model": "gpt-3.5-turbo"
    },

    // 谷歌翻译配置（官方 Cloud Translation API）
    "google": {
      "apiKey": "your-google-api-key"
    },

    // Bing / Azure Translator 配置
    "bing": {
      "apiKey": "your-api-key",
      "region": "global"
    },

    // DeepLX 配置（默认地址为 http://127.0.0.1:1188）
    "deeplx": {
      "baseUrl": "http://127.0.0.1:1188"
    },

    // 百度翻译配置
    "baidu": {
      "appId": "your-app-id",
      "secretKey": "your-secret-key"
    },

    // 腾讯翻译君配置
    "tencent": {
      "secretId": "your-secret-id",
      "secretKey": "your-secret-key",
      "region": "ap-guangzhou"
    }
  }
}
```
