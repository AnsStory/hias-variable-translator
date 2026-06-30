# 简介

变量翻译助手是一款 VSCode 插件，用于将任意非英文字符自动检测并翻译为英文。

## 功能特点

- **多语言自动检测**：支持任意非英文字符
- **文件路径翻译**：新建文件时自动翻译路径中的非英文字符
- **选中文本翻译**：选中文本后一键翻译替换
- **多种命名格式**：支持 camelCase、PascalCase、snake_case 等 6 种格式
- **多翻译服务**：支持 7 种翻译服务，可自由切换
- **一键撤回**：1 分钟内可撤回翻译操作

## 支持的语言

插件会自动检测以下语言并翻译为英文：

| 语言 | 示例 |
|------|------|
| 中文 | 用户名称 → userName |
| 日文 | ユーザー名 → userName |
| 韩文 | 사용자 이름 → userName |
| 俄文 | Имя пользователя → userName |
| 其他 | 任何非英文字符 |

## 命名格式

| 格式 | 示例 |
|------|------|
| camelCase | userName |
| PascalCase | UserName |
| snake_case | user_name |
| CONSTANT_CASE | USER_NAME |
| param-case | user-name |
| Header-Case | User-Name |
