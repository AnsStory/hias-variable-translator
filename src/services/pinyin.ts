/**
 * 拼音翻译服务
 * 作为翻译失败时的降级方案
 */

import { ITranslationService, TranslationResult } from './index'
import { pinyin } from 'pinyin-pro'

export class PinyinService implements ITranslationService {
  readonly type = 'copilot' as const
  readonly name = '拼音（降级方案）'

  /**
   * 翻译文本为拼音
   * @param text 要翻译的文本
   * @returns 翻译结果
   */
  async translate(text: string): Promise<TranslationResult> {
    try {
      const translatedText = this.convertToPinyin(text)
      return {
        success: true,
        translatedText,
      }
    } catch (error) {
      return {
        success: false,
        translatedText: text,
        error: error instanceof Error ? error.message : '拼音转换失败',
      }
    }
  }

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return true
  }

  /**
   * 将文本转换为拼音
   * @param text 要转换的文本
   * @returns 拼音字符串
   */
  private convertToPinyin(text: string): string {
    // 分割文本，保留非中文字符
    const parts = this.splitText(text)

    return parts
      .map((part) => {
        // 如果是中文，转换为拼音
        if (this.isChinese(part)) {
          return pinyin(part, { toneType: 'none', type: 'string' })
        }
        // 否则保留原样
        return part
      })
      .join('')
  }

  /**
   * 分割文本为中文和非中文部分
   * @param text 要分割的文本
   * @returns 文本部分数组
   */
  private splitText(text: string): string[] {
    const parts: string[] = []
    let currentPart = ''
    let isChinese = false

    for (const char of text) {
      const charIsChinese = this.isChinese(char)

      if (currentPart === '') {
        isChinese = charIsChinese
        currentPart = char
      } else if (charIsChinese === isChinese) {
        currentPart += char
      } else {
        parts.push(currentPart)
        isChinese = charIsChinese
        currentPart = char
      }
    }

    if (currentPart !== '') {
      parts.push(currentPart)
    }

    return parts
  }

  /**
   * 检测字符是否为中文
   * @param char 要检测的字符
   * @returns 是否为中文
   */
  private isChinese(char: string): boolean {
    const code = char.charCodeAt(0)
    return code >= 0x4e00 && code <= 0x9fff
  }
}
