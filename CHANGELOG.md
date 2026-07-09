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

## [0.1.1] - 2026-06-30

### Added

- Undo translation feature (Alt+Shift+Z) with 1-minute cache mechanism

### Changed

- Optimized file deletion and window closing logic

## [0.1.2] - 2026-06-30

### Added

- Toggle file translation on/off (Alt+Shift+D)
- Status bar display for current toggle state

### Changed

- Optimized configuration management

## [0.1.3] - 2026-06-30

### Added

- Translation service switching (Alt+Shift+S)
- Translation service priority configuration

### Changed

- Optimized translation service fallback mechanism

## [0.1.4] - 2026-06-30

### Added

- OpenAI translation service

### Changed

- Optimized translation service interface
- Improved configuration management

## [0.1.5] - 2026-06-30

### Added

- Google translation service

### Changed

- Optimized translation service fallback mechanism
- Improved file translation toggle

## [0.1.6] - 2026-06-30

### Added

- Bing/Azure Translator service

### Changed

- Optimized translation service configuration
- Improved error handling

## [0.1.7] - 2026-06-30

### Added

- DeepLX translation service

### Changed

- Optimized translation service switching
- Improved status bar display

## [0.1.8] - 2026-06-30

### Added

- Baidu translation service

### Changed

- Optimized translation service priority configuration
- Improved filename conflict handling

## [0.1.9] - 2026-06-30

### Added

- Tencent translation service

### Changed

- Optimized translation service configuration management
- Fixed status bar display issues

## [0.1.10] - 2026-06-30

### Changed

- Optimized translation service fallback logic
- Fixed edge cases in file renaming
- Improved error messages

## [0.1.11] - 2026-06-30

### Added

- Console log management commands (insert/delete/comment/uncomment)
- Console.log shortcut (Ctrl+Alt+L)

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
