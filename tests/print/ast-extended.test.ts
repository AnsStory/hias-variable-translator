/**
 * AST 模块扩展测试
 * 测试 Svelte/Astro/HTML 模板文件支持（经锚定引擎）、getLineIndent、parseCode 等
 */

import { describe, it, expect } from 'vitest'
import { getLineIndent, parseCode, offsetToLine } from '../../src/print/ast'
import { computeInsertionAnchor } from '../../src/print/locator'

/**
 * 走锚定引擎，用子串定位选区返回插入行号。
 * 模板文件按选区所在行提取对应 <script> 块；parseCode 已把 script 内偏移 rebase 为
 * 全文档绝对 offset，故选区用全文档 indexOf 即与 AST 对齐。解析失败/空选区/SKIP/需补块返回 -1。
 */
function anchorLine(code: string, selText: string, ext?: string, occurrence = 0): number {
  let idx = -1
  for (let i = 0; i <= occurrence; i++) idx = code.indexOf(selText, idx + 1)
  if (idx < 0) throw new Error(`未找到子串: ${selText}`)
  const selectionLine = code.slice(0, idx).split('\n').length - 1
  const parsed = parseCode(code, selectionLine, ext)
  if (!parsed) return -1
  const anchor = computeInsertionAnchor(parsed.ast, code, { startOffset: idx, endOffset: idx + selText.length })
  if (!anchor || anchor.placement === 'SKIP' || anchor.needsNormalize) return -1
  let line = offsetToLine(code, anchor.offset)
  // AFTER_STMT 落末行且无尾随换行时 offset==code.length，log 实际渲染在新增行
  if (anchor.placement === 'AFTER_STMT' && anchor.offset >= code.length && !code.endsWith('\n')) line += 1
  return line
}

// ========== Svelte 文件支持（模板 → 锚定引擎） ==========
describe('锚定引擎 - Svelte 文件', () => {
  it('Svelte script 标签 - 变量赋值', () => {
    const code = `<script>
  const obj = {
    name: '张三'
  }
</script>`
    expect(anchorLine(code, 'obj', '.svelte')).toBe(4)
  })

  it('Svelte script lang="ts" - 函数调用', () => {
    const code = `<script lang="ts">
  const data = fetchData()
</script>`
    expect(anchorLine(code, 'data', '.svelte')).toBe(2)
  })

  it('Svelte 无 script 标签 - parseCode 返回 null（handler 走最小回退）', () => {
    const code = `<div>Hello</div>`
    expect(parseCode(code, 0, '.svelte')).toBeNull()
  })
})

// ========== Astro 文件支持 ==========
describe('锚定引擎 - Astro 文件', () => {
  it('Astro script 块 - 变量赋值', () => {
    const code = `<script>
  const config = {
    title: 'Hello'
  }
</script>`
    expect(anchorLine(code, 'config', '.astro')).toBe(4)
  })
})

// ========== HTML 文件支持 ==========
describe('锚定引擎 - HTML 文件', () => {
  it('HTML script 标签 - 变量赋值', () => {
    const code = `<script>
  const result = compute()
</script>`
    expect(anchorLine(code, 'result', '.html')).toBe(2)
  })

  it('HTML 多个 script 标签 - 定位到正确的 script', () => {
    const code = `<script>
  const first = 1
</script>
<div>content</div>
<script>
  const second = 2
</script>`
    // 选中 second（第 5 行），应定位到第二个 script，插到第 6 行
    expect(anchorLine(code, 'second', '.html')).toBe(6)
  })
})

// ========== getLineIndent 缩进提取 ==========
describe('getLineIndent - 缩进提取', () => {
  it('无缩进 - 返回空字符串', () => {
    expect(getLineIndent('const x = 1')).toBe('')
  })

  it('空格缩进 - 正确提取', () => {
    expect(getLineIndent('  const x = 1')).toBe('  ')
    expect(getLineIndent('    const x = 1')).toBe('    ')
  })

  it('Tab 缩进 - 正确提取', () => {
    expect(getLineIndent('\tconst x = 1')).toBe('\t')
    expect(getLineIndent('\t\tconst x = 1')).toBe('\t\t')
  })

  it('混合缩进 - 正确提取', () => {
    expect(getLineIndent('  \tconst x = 1')).toBe('  \t')
  })

  it('空行 - 返回空字符串', () => {
    expect(getLineIndent('')).toBe('')
  })

  it('纯缩进行 - 返回全部缩进', () => {
    expect(getLineIndent('    ')).toBe('    ')
  })
})

// ========== parseCode - AST 解析 ==========
describe('parseCode - AST 解析', () => {
  it('普通 JS - 解析成功', () => {
    const result = parseCode('const x = 1', 0)
    expect(result).not.toBeNull()
    expect(result!.ast.type).toBe('Program')
  })

  it('TypeScript - 解析成功', () => {
    const result = parseCode('const x: number = 1', 0, '.ts')
    expect(result).not.toBeNull()
  })

  it('JSX - 解析成功', () => {
    const result = parseCode('const el = <div>hello</div>', 0, '.jsx')
    expect(result).not.toBeNull()
  })

  it('TSX - 解析成功', () => {
    const result = parseCode('const el = <div>hello</div>', 0, '.tsx')
    expect(result).not.toBeNull()
  })

  it('Vue script - 提取并解析', () => {
    const code = [
      '<template>',
      '  <div>hello</div>',
      '</template>',
      '<script setup>',
      'const x = 1',
      '</script>',
    ].join('\n')
    const result = parseCode(code, 4, '.vue')
    expect(result).not.toBeNull()
    expect(result!.ast.type).toBe('Program')
    // script 标签前有 3 行 template，lineOffset 应 >= 3
    expect(result!.lineOffset).toBeGreaterThanOrEqual(3)
  })

  it('Svelte script - 提取并解析', () => {
    const code = `<script>
const x = 1
</script>`
    const result = parseCode(code, 1, '.svelte')
    expect(result).not.toBeNull()
  })

  it('无效代码 - 返回 null', () => {
    const result = parseCode('this is {{{ invalid', 0)
    expect(result).toBeNull()
  })

  it('Vue 无 script - 返回 null', () => {
    const result = parseCode('<div>no script</div>', 0, '.vue')
    expect(result).toBeNull()
  })
})
