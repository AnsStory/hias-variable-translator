/**
 * 命名格式选择模块
 * 格式 QuickPick 与选中文本的格式解析（尾部数字快捷约定）
 */

import * as vscode from 'vscode'
import { NamingFormat, FILE_FORMAT_OPTIONS, TEXT_FORMAT_OPTIONS, detectTrailingFormatDigit } from './namingConvention'
import { ConfigManager } from './config'

/**
 * 显示格式选择器
 * @param isTextTranslation 是否是文本翻译（显示更多格式）
 * @returns 选择的命名格式
 */
export async function showFormatPicker(isTextTranslation: boolean = false): Promise<NamingFormat | undefined> {
  try {
    // 根据场景选择格式选项
    const formatOptions = isTextTranslation ? TEXT_FORMAT_OPTIONS : FILE_FORMAT_OPTIONS

    // 创建QuickPick选项
    const options: (vscode.QuickPickItem & { value: NamingFormat; index: number })[] = formatOptions.map((option, index) => ({
      label: option.value,
      description: `${index + 1}. ${option.description}`,
      value: option.value,
      index: index,
    }))

    // 创建QuickPick实例
    const quickPick = vscode.window.createQuickPick<(typeof options)[0]>()
    quickPick.items = options
    quickPick.title = isTextTranslation ? '文本翻译' : '文件名翻译'
    quickPick.placeholder = `输入数字1-${formatOptions.length}选择格式`
    quickPick.ignoreFocusOut = true

    return new Promise<NamingFormat | undefined>((resolve) => {
      // 收集事件监听器，用于清理
      const disposables: vscode.Disposable[] = []

      // 监听输入变化，数字匹配后自动确认
      disposables.push(
        quickPick.onDidChangeValue((value) => {
          const num = parseInt(value)
          if (num >= 1 && num <= options.length) {
            quickPick.hide()
            resolve(options[num - 1].value)
          }
        })
      )

      // 监听选择确认
      disposables.push(
        quickPick.onDidAccept(() => {
          const selected = quickPick.selectedItems[0]
          if (selected) {
            resolve(selected.value)
          } else {
            resolve(undefined)
          }
          quickPick.hide()
        })
      )

      // 监听取消
      disposables.push(
        quickPick.onDidHide(() => {
          resolve(undefined)
        })
      )

      quickPick.show()
    }).finally(() => {
      // 确保 QuickPick 及其事件监听器被正确释放
      quickPick.dispose()
    })
  } catch (error) {
    console.error('格式选择器错误:', error)
    return undefined
  }
}

/**
 * 文本翻译格式解析：命中尾部数字快捷约定（如选中 '用户1'）时跳过弹窗，
 * 直接使用数字对应的格式，并返回剥离数字后的翻译文本（数字不参与翻译与剪贴板原文）
 * @param selectedText 选中的文本
 * @returns 格式与待翻译文本，用户取消选择时返回 undefined
 */
export async function resolveTextFormat(selectedText: string): Promise<{ format: NamingFormat; translateText: string } | undefined> {
  if (ConfigManager.isDigitFormatShortcutEnabled()) {
    const shortcut = detectTrailingFormatDigit(selectedText, TEXT_FORMAT_OPTIONS)
    if (shortcut) {
      return { format: shortcut.format, translateText: shortcut.baseName }
    }
  }

  const format = await showFormatPicker(true)
  return format ? { format, translateText: selectedText } : undefined
}
