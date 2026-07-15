/**
 * 拼音翻译服务
 * 作为翻译失败时的降级方案
 */

import { ITranslationService, TranslationResult } from './index'
import { pinyin } from 'pinyin-pro'

export class PinyinService implements ITranslationService {
  readonly type = 'pinyin' as const
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
   * 检测字符是否为中文/日文/韩文
   * @param char 要检测的字符
   * @returns 是否为CJK字符
   */
  private isChinese(char: string): boolean {
    const code = char.charCodeAt(0)
    return (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一汉字
      (code >= 0x3400 && code <= 0x4dbf) || // CJK 扩展 A
      (code >= 0x3040 && code <= 0x309f) || // 日文平假名
      (code >= 0x30a0 && code <= 0x30ff) || // 日文片假名
      (code >= 0xac00 && code <= 0xd7af) || // 韩文音节
      (code >= 0x1100 && code <= 0x11ff) || // 韩文字母
      (code >= 0xf900 && code <= 0xfaff) // CJK 兼容汉字
    )
  }
}
