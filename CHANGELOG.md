# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-07-27

Initial release of **hias-variable-translator**.

### Added

#### Translation

- Selected text translation with naming-format picker (`Alt+Shift+T`)
- Translate and copy to clipboard (`Alt+Shift+C`)
- File path translation: auto-translate non-English names when creating or renaming files/folders
- Toggle file translation on/off with status bar indicator (`Alt+Shift+D`)
- Undo translation within 1 minute, including cleanup of translation-created empty directories (`Alt+Shift+Z`)
- Auto-detect source language; supports Chinese, Japanese (hiragana/katakana) and Korean (syllables/letters)
- 8 naming formats: camelCase, PascalCase, snake_case, CONSTANT_CASE, param-case, Header-Case, Capital Case, no case
- Multi-format clipboard copy (`copyToClipboard` / `clipboardFormats`), with `originalValue` support and Windows clipboard history (Win+V) compatibility

#### Translation services

- 7 services: Pinyin (zero-config), OpenAI, Google, Bing/Azure, DeepLX, Baidu, Tencent
- Service switching via QuickPick (`Alt+Shift+S`) and editor context menu
- Configurable priority chain (`servicePriority`) with automatic fallback on failure
- Per-request timeout (10s) and global translation timeout with guaranteed pinyin last-resort fallback
- OpenAI: configurable `baseUrl` and `model` for third-party compatible APIs
- DeepLX: configurable `baseUrl` with async health check (60s cache)
- Tencent: configurable `region` (default: ap-guangzhou)
- Status bar shows the current translation service

#### Robustness

- Filename sanitization: strips apostrophes and illegal characters (e.g. `user's` → `users`), falls back to the original name when nothing valid remains
- Auto-resolve filename conflicts by adding a numeric suffix
- Workspace ownership check uses `path.relative` instead of case-sensitive `startsWith`, fixing directory cleanup being skipped on Windows drive-letter case mismatch (`d:` vs `D:`)
- Config value validation for `servicePriority` and `clipboardFormats`
- Activation on `onStartupFinished` for reliable file event listener registration
