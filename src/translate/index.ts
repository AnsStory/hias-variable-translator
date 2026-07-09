/**
 * 翻译模块
 * 处理文本翻译和文件名翻译相关功能
 */

export { containsNonEnglish } from './chineseDetector'
export { NamingFormat, FILE_FORMAT_OPTIONS, TEXT_FORMAT_OPTIONS, convertToFormat, splitIntoWords } from './namingConvention'
export { Translator } from './translator'
export { UndoManager } from './undoManager'
export { TranslationServiceType, TRANSLATION_SERVICE_OPTIONS } from './services'
export { ConfigManager } from './config'

export {
  initTranslateModule,
  createStatusBarItem,
  handleTranslateSelection,
  handleTranslateCopy,
  handleUndoTranslation,
  handleToggleFileTranslation,
  handleSwitchTranslationService,
  registerFileCreationListener,
  registerFileRenameListener,
  updateStatusBar,
  registerConfigListener,
  disposeTranslateModule,
} from './handler'
