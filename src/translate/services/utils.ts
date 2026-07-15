/**
 * 翻译服务公共工具
 */

/**
 * 带超时的 fetch 封装
 * @param url 请求 URL
 * @param options fetch 选项
 * @param timeoutMs 超时时间（毫秒），默认 10 秒
 * @returns Response
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`请求超时（${timeoutMs / 1000}s）`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 检测是否为 Abort 错误（兼容 DOMException 和 Node.js Error）
 * @param error 错误对象
 * @returns 是否为 Abort 错误
 */
export function isAbortError(error: unknown): boolean {
  // 浏览器 / 部分 Node.js 环境：DOMException with name 'AbortError'
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  // Node.js 18+：Error with code 'ABORT_ERR'
  if (error instanceof Error && 'code' in error && (error as any).code === 'ABORT_ERR') {
    return true
  }
  return false
}

/**
 * 安全提取错误消息
 * @param error 错误对象
 * @returns 错误消息字符串
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
