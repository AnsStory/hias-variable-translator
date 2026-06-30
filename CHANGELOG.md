# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-30

### Added

- File path translation feature (auto-translate when creating new files/folders)
- Selected text translation with shortcut (Alt+Shift+T)
- 8 naming formats: camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case, Capital Case, no case
- 7 translation services: Pinyin, OpenAI, Google, Bing, DeepLX, Baidu, Tencent
- Translation service priority configuration (fallback in order)
- Undo translation within 1 minute (Alt+Shift+Z)
- Toggle file translation on/off (Alt+Shift+D)
- Switch translation service (Alt+Shift+S)
- Auto-detect source language for all translation services
- Fallback to pinyin when translation fails
- Auto-handle filename conflicts by adding suffix
- Status bar display for translation status
- Multi-language documentation (Chinese & English)
