/**
 * 新建文件内容替换模块
 * 语言服务器（如 redhat.java）会按翻译前的文件名生成模板内容（package/类名），
 * 路径翻译完成后需要把内容里的翻译前名称同步替换为翻译后名称。
 * 本模块只含纯函数，不依赖 vscode，便于单测。
 */

/** 一个路径段的翻译映射（翻译前 -> 翻译后） */
export interface SegmentPair {
  original: string
  translated: string
}

/**
 * 收集有效的段映射（过滤空值与前后相同的项，去重保留首个）
 */
export function buildSegmentPairs(pairs: SegmentPair[]): SegmentPair[] {
  const seen = new Map<string, string>()
  for (const pair of pairs) {
    if (!pair.original || !pair.translated || pair.original === pair.translated) {
      continue
    }
    if (!seen.has(pair.original)) {
      seen.set(pair.original, pair.translated)
    }
  }
  return [...seen.entries()].map(([original, translated]) => ({ original, translated }))
}

/**
 * 将内容中出现的所有翻译前路径段替换为翻译后路径段
 * 按原文长度降序替换，避免短段（如"用户"）抢先吞掉长段（如"用户信息"）的一部分。
 * 原文为非英文、译文为英文，多次替换不会互相干扰。
 * @param content 文件内容
 * @param pairs 段映射列表
 * @returns 替换后的内容（无匹配时原样返回）
 */
export function replaceContentSegments(content: string, pairs: SegmentPair[]): string {
  const valid = buildSegmentPairs(pairs).sort((a, b) => b.original.length - a.original.length)
  let result = content
  for (const pair of valid) {
    result = result.split(pair.original).join(pair.translated)
  }
  return result
}

/**
 * 判断内容中是否仍含有翻译前的路径段
 */
export function containsOriginalSegments(content: string, pairs: SegmentPair[]): boolean {
  return buildSegmentPairs(pairs).some((pair) => content.includes(pair.original))
}
