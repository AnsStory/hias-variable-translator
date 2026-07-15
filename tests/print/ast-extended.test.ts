/**
 * AST 模块扩展测试
 * 测试 Svelte/Astro/HTML 文件支持、TypeScript 特殊语法、getLineIndent 等
 */

import { describe, it, expect } from 'vitest'
import { findInsertionLine, getLineIndent, parseCode } from '../../src/print/ast'

function getInsertLine(code: string, variableName: string, selectionLine: number, fileExtension?: string): number {
  return findInsertionLine(code, variableName, selectionLine, fileExtension).line
}

// ========== Svelte 文件支持 ==========
describe('findInsertionLine - Svelte 文件', () => {
  it('Svelte script 标签 - 变量赋值', () => {
    const code = `<script>
  const obj = {
    name: '张三'
  }
</script>`
    expect(getInsertLine(code, 'obj', 1, '.svelte')).toBe(4)
  })

  it('Svelte script lang="ts" - 函数调用', () => {
    const code = `<script lang="ts">
  const data = fetchData()
</script>`
    expect(getInsertLine(code, 'data', 1, '.svelte')).toBe(2)
  })

  it('Svelte 无 script 标签 - 返回 selectionLine + 1', () => {
    const code = `<div>Hello</div>`
    // 无 script 标签时 parseCode 返回 null，findInsertionLine 回退
    expect(getInsertLine(code, 'x', 0, '.svelte')).toBe(1)
  })
})

// ========== Astro 文件支持 ==========
describe('findInsertionLine - Astro 文件', () => {
  it('Astro frontmatter - 变量赋值', () => {
    const code = `<script>
  const config = {
    title: 'Hello'
  }
</script>`
    expect(getInsertLine(code, 'config', 1, '.astro')).toBe(4)
  })

  it('Astro JSX 支持', () => {
    const code = `const items = [1, 2, 3]`
    expect(getInsertLine(code, 'items', 0, '.astro')).toBe(1)
  })
})

// ========== HTML 文件支持 ==========
describe('findInsertionLine - HTML 文件', () => {
  it('HTML script 标签 - 变量赋值', () => {
    const code = `<script>
  const result = compute()
</script>`
    expect(getInsertLine(code, 'result', 1, '.html')).toBe(2)
  })

  it('HTML 多个 script 标签 - 定位到正确的 script', () => {
    const code = `<script>
  const first = 1
</script>
<div>content</div>
<script>
  const second = 2
</script>`
    // 选中 second（第 5 行），应定位到第二个 script
    expect(getInsertLine(code, 'second', 5, '.html')).toBe(6)
  })
})

// ========== TypeScript 特殊语法扩展 ==========
describe('findInsertionLine - TypeScript 高级语法', () => {
  it('泛型函数调用', () => {
    const code = `const result = fetchData<string>()`
    expect(getInsertLine(code, 'result', 0)).toBe(1)
  })

  it('非空断言 !', () => {
    const code = `const value = getValue()!`
    expect(getInsertLine(code, 'value', 0)).toBe(1)
  })

  it('TSAsExpression 嵌套', () => {
    const code = `const obj = (fn() as Type) as OtherType`
    expect(getInsertLine(code, 'obj', 0)).toBe(1)
  })

  it('interface 声明 - 不影响后续变量', () => {
    const code = `interface User {
  name: string
}
const user: User = { name: 'test' }`
    expect(getInsertLine(code, 'user', 3)).toBe(4)
  })

  it('enum 声明 - 不影响后续变量', () => {
    const code = `enum Status {
  Active,
  Inactive
}
const status = Status.Active`
    expect(getInsertLine(code, 'status', 4)).toBe(5)
  })

  it('class 私有字段 #field', () => {
    const code = `class MyClass {
  #count = 0
}`
    expect(getInsertLine(code, '#count', 1)).toBe(2)
  })

  it('解构赋值 + 函数调用', () => {
    const code = `const { data, error } = await fetch()`
    expect(getInsertLine(code, 'data', 0)).toBe(1)
  })

  it('标签模板字符串 html``', () => {
    const code = 'const msg = html`<div>${name}</div>`'
    expect(getInsertLine(code, 'msg', 0)).toBe(1)
  })

  it('import 解构', () => {
    const code = `import { ref, computed } from 'vue'`
    expect(getInsertLine(code, 'ref', 0)).toBe(1)
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

// ========== 复杂场景组合 ==========
describe('findInsertionLine - 复杂场景', () => {
  it('嵌套函数 - 外层变量', () => {
    const code = `function outer() {
  const data = fetch()
  function inner() {
    return data
  }
}`
    expect(getInsertLine(code, 'data', 1)).toBe(2)
  })

  it('链式调用', () => {
    const code = `const result = arr
  .filter(x => x > 0)
  .map(x => x * 2)`
    expect(getInsertLine(code, 'result', 0)).toBe(3)
  })

  it('await 表达式', () => {
    const code = `async function test() {
  const data = await fetchData()
}`
    expect(getInsertLine(code, 'data', 1)).toBe(2)
  })

  it('switch 语句内', () => {
    const code = `switch (type) {
  case 'a':
    break
}`
    expect(getInsertLine(code, 'type', 0)).toBe(0)
  })

  it('try/catch 内', () => {
    const code = `try {
  const result = risky()
} catch (e) {
  console.error(e)
}`
    expect(getInsertLine(code, 'result', 1)).toBe(2)
  })
})
