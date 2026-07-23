# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.16] - 2026-07-23

### Fixed

- File/folder name translation now strips apostrophes and other illegal characters (e.g. `user's` → `users`) so results comply with file naming rules; falls back to the original name when sanitization leaves no valid word
- File path translation reuses the multi-format clipboard: the translated file is now opened only after all clipboard writes complete, so Windows clipboard history (Win+V) reliably records every naming format instead of keeping only the last one

## [0.1.15] - 2026-07-15

### Changed

- Google translation now requires an API Key to be treated as configured (skipped in the fallback chain when unconfigured)
- Expanded unit test coverage and updated documentation

### Fixed

- Various fixes for known translation issues

## [0.1.14] - 2026-07-15

### Added

- Request timeout control (10s) for all translation services via shared `fetchWithTimeout` utility
- Global translation timeout (10s) with automatic fallback to pinyin
- OpenAI: configurable `baseUrl` and `model` for third-party compatible APIs
- DeepLX: async health check mechanism (60s cache) for accurate availability detection
- DeepLX: configurable `baseUrl` for custom service endpoints
- Tencent: configurable `region` (default: ap-guangzhou)
- Pinyin service: extended support for Japanese (hiragana/katakana) and Korean (syllables/letters) characters
- Status bar now displays current translation service name
- Editor right-click context menu: translate selection, translate & copy, undo translation, switch service
- Vitest testing framework with 208 unit tests across 9 test files

### Changed

- Improved Disposable leak: config listener properly registered to extension context
- `initTranslateModule` disposes old instances before creating new ones
- `registerConfigListener` now returns Disposable for proper cleanup
- ESLint: enabled `no-explicit-any` warning
- `.vscodeignore`: exclude `*.vsix` old packages
- `category` changed from `Other` to `Formatters`

### Fixed

- QuickPick dispose leak: format picker properly releases resources on hide
- File translation picker focus stealing: added `waitForFileReady` polling with focus buffer
- DeepLX health check race condition: added `_healthCheckPromise` to prevent concurrent checks
- Translator concurrency control: `_translating` flag prevents duplicate requests
- Global translation timeout: `Promise.race` with 10s timeout prevents stuck translations
- Defensive pinyin fallback: null check + try/catch ensures last-resort translation never crashes
- AbortError detection: compatible with both DOMException and Node.js Error.code
- Safe error message extraction: prevents `[object Object]` in error dialogs
- Non-English character notification: shows info message when pure English text is detected
- Google/Bing API error handling: enhanced with HTTP status codes and JSON parse safety
- Config value validation: `getServicePriority` and `getClipboardFormats` filter invalid values
- Undo translation directory cleanup: uses path comparison (original vs translated) to identify translation-created directories, so user's existing directories (e.g., `src/`) are never removed even if empty
- Async `cleanupEmptyDirs`: converted from sync fs to async fs/promises for non-blocking operation
- Activation strategy: `onStartupFinished` for reliable file event listener registration

## [0.1.13] - 2026-07-09

### Changed

- Bug fixes and stability improvements

## [0.1.12] - 2026-07-09

### Added

- Copy translation to clipboard after translating
- `copyToClipboard` configuration option
- `clipboardFormats` configuration option for multi-format clipboard copy
- `Alt+Shift+C` shortcut (translate and copy to clipboard)
- `originalValue` support for copying original text before translation
- File translation copies "last" translation result to clipboard

### Changed

- Optimized clipboard write order (user-selected format first)

## [0.1.10] - 2026-06-30

### Changed

- Optimized translation service fallback logic
- Fixed edge cases in file renaming
- Improved error messages

## [0.1.9] - 2026-06-30

### Added

- Tencent translation service

### Changed

- Optimized translation service configuration management
- Fixed status bar display issues

## [0.1.8] - 2026-06-30

### Added

- Baidu translation service

### Changed

- Optimized translation service priority configuration
- Improved filename conflict handling

## [0.1.7] - 2026-06-30

### Added

- DeepLX translation service

### Changed

- Optimized translation service switching
- Improved status bar display

## [0.1.6] - 2026-06-30

### Added

- Bing/Azure Translator service

### Changed

- Optimized translation service configuration
- Improved error handling

## [0.1.5] - 2026-06-30

### Added

- Google translation service

### Changed

- Optimized translation service fallback mechanism
- Improved file translation toggle

## [0.1.4] - 2026-06-30

### Added

- OpenAI translation service

### Changed

- Optimized translation service interface
- Improved configuration management

## [0.1.3] - 2026-06-30

### Added

- Translation service switching (Alt+Shift+S)
- Translation service priority configuration

### Changed

- Optimized translation service fallback mechanism

## [0.1.2] - 2026-06-30

### Added

- Toggle file translation on/off (Alt+Shift+D)
- Status bar display for current toggle state

### Changed

- Optimized configuration management

## [0.1.1] - 2026-06-30

### Added

- Undo translation feature (Alt+Shift+Z) with 1-minute cache mechanism

### Changed

- Optimized file deletion and window closing logic

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
