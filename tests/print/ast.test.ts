/**
 * AST 模块测试
 * 测试 findInsertionLine 的 16 种场景
 */

import { describe, it, expect } from 'vitest'
import { findInsertionLine } from '../../src/print/ast'

/**
 * 辅助函数：获取插入行号
 * @param code 代码
 * @param variableName 选中的变量名
 * @param selectionLine 选中行号（0-based）
 * @param fileExtension 文件扩展名
 * @returns 插入行号（0-based）
 */
function getInsertLine(code: string, variableName: string, selectionLine: number, fileExtension?: string): number {
  return findInsertionLine(code, variableName, selectionLine, fileExtension).line
}

describe('findInsertionLine - 16 种场景', () => {
  // ========== 场景 1: 命名函数赋值 ==========
  describe('场景 1: 命名函数赋值', () => {
    it('const myFn = function() {} - 插入到函数结束后', () => {
      const code = `const myFn = function() {
  const x = 1
}`
      // 选中 myFn（第 0 行），应插入到函数结束后（第 2 行之后 = 第 3 行）
      expect(getInsertLine(code, 'myFn', 0)).toBe(3)
    })

    it('const myFn = () => {} - 箭头函数块体', () => {
      const code = `const myFn = () => {
  const x = 1
}`
      expect(getInsertLine(code, 'myFn', 0)).toBe(3)
    })
  })

  // ========== 场景 2: 函数参数 ==========
  describe('场景 2: 函数参数', () => {
    it('function greet(name) - 插入到函数体开始处', () => {
      const code = `function greet(name) {
  return name
}`
      // 选中 name（第 0 行），应插入到函数体开始处（第 1 行）
      expect(getInsertLine(code, 'name', 0)).toBe(1)
    })

    it('解构参数 function greet({ name }) - 插入到函数体开始处', () => {
      const code = `function greet({ name, age }) {
  return name
}`
      expect(getInsertLine(code, 'name', 0)).toBe(1)
    })
  })

  // ========== 场景 3: 对象方法调用赋值 ==========
  describe('场景 3: 对象方法调用赋值', () => {
    it('const result = obj.method() - 插入到调用结束后', () => {
      const code = `const result = obj.method()`
      expect(getInsertLine(code, 'result', 0)).toBe(1)
    })
  })

  // ========== 场景 4: 函数调用赋值 ==========
  describe('场景 4: 函数调用赋值', () => {
    it('const result = doSomething() - 插入到调用结束后', () => {
      const code = `const result = doSomething()`
      expect(getInsertLine(code, 'result', 0)).toBe(1)
    })

    it('const obj = ref({}) - Vue 风格', () => {
      const code = `const obj = ref({
  name: '张三'
})`
      expect(getInsertLine(code, 'obj', 0)).toBe(3)
    })
  })

  // ========== 场景 5: 属性访问赋值 ==========
  describe('场景 5: 属性访问赋值', () => {
    it('const value = obj.prop - 插入到声明结束后', () => {
      const code = `const value = obj.prop`
      expect(getInsertLine(code, 'value', 0)).toBe(1)
    })
  })

  // ========== 场景 6: 对象字面量 ==========
  describe('场景 6: 对象字面量', () => {
    it('const config = { key: value } - 插入到对象结束后', () => {
      const code = `const config = {
  key: 'value'
}`
      expect(getInsertLine(code, 'config', 0)).toBe(3)
    })
  })

  // ========== 场景 7: 数组赋值 ==========
  describe('场景 7: 数组赋值', () => {
    it('const items = [1, 2, 3] - 插入到数组结束后', () => {
      const code = `const items = [1, 2, 3]`
      expect(getInsertLine(code, 'items', 0)).toBe(1)
    })

    it('多行数组', () => {
      const code = `const items = [
  1,
  2,
  3
]`
      expect(getInsertLine(code, 'items', 0)).toBe(5)
    })
  })

  // ========== 场景 8: 模板字符串 ==========
  describe('场景 8: 模板字符串', () => {
    it('const msg = `Hello` - 插入到表达式结束后', () => {
      const code = 'const msg = `Hello ${name}`'
      expect(getInsertLine(code, 'msg', 0)).toBe(1)
    })
  })

  // ========== 场景 9: 三元表达式 ==========
  describe('场景 9: 三元表达式', () => {
    it('const x = condition ? a : b - 插入到表达式结束后', () => {
      const code = `const x = condition ? a : b`
      expect(getInsertLine(code, 'x', 0)).toBe(1)
    })
  })

  // ========== 场景 10: 二元/逻辑表达式 ==========
  describe('场景 10: 二元/逻辑表达式', () => {
    it('const sum = a + b - 插入到声明结束后', () => {
      const code = `const sum = a + b`
      expect(getInsertLine(code, 'sum', 0)).toBe(1)
    })
  })

  // ========== 场景 11: 属性方法调用 ==========
  describe('场景 11: 属性方法调用', () => {
    it('obj.method() - 插入到方法调用之后', () => {
      const code = `obj.method()`
      expect(getInsertLine(code, 'obj', 0)).toBe(1)
    })

    it('排除 return 上下文 - 由场景 15 处理', () => {
      const code = `function test() {
  return obj.method()
}`
      // 选中 obj 在 return 语句中，应由场景 15 处理（插入到 return 之前）
      expect(getInsertLine(code, 'obj', 1)).toBe(1)
    })
  })

  // ========== 场景 12: 原始属性访问 ==========
  describe('场景 12: 原始属性访问', () => {
    it('obj.prop - 插入到表达式结束后', () => {
      const code = `obj.prop`
      expect(getInsertLine(code, 'obj', 0)).toBe(1)
    })
  })

  // ========== 场景 13: 基本类型赋值 ==========
  describe('场景 13: 基本类型赋值', () => {
    it('const x = 42 - 插入到声明结束后', () => {
      const code = `const x = 42`
      expect(getInsertLine(code, 'x', 0)).toBe(1)
    })

    it('for 循环 init - 插入到循环体内部', () => {
      const code = `for (let i = 0; i < 10; i++) {
  doSomething()
}`
      // 选中 i（第 0 行），应插入到循环体内部（第 1 行）
      expect(getInsertLine(code, 'i', 0)).toBe(1)
    })
  })

  // ========== 场景 14: 条件块内 ==========
  describe('场景 14: 条件块内', () => {
    it('if (isValid) - 插入到条件语句之前', () => {
      const code = `if (isValid) {
  doSomething()
}`
      // 选中 isValid（第 0 行），应插入到 if 语句之前（第 0 行）
      expect(getInsertLine(code, 'isValid', 0)).toBe(0)
    })

    it('while (condition) - 插入到循环之前', () => {
      const code = `while (condition) {
  doSomething()
}`
      expect(getInsertLine(code, 'condition', 0)).toBe(0)
    })
  })

  // ========== 场景 15: return 语句内 ==========
  describe('场景 15: return 语句内', () => {
    it('return variableName - 插入到 return 语句之前', () => {
      const code = `function test() {
  return user
}`
      // 选中 user（第 1 行），应插入到 return 之前（第 1 行）
      expect(getInsertLine(code, 'user', 1)).toBe(1)
    })
  })

  // ========== 场景 16: 游离表达式（兜底）==========
  describe('场景 16: 游离表达式（兜底）', () => {
    it('任意表达式 - 插入到表达式结束后', () => {
      const code = `someExpression`
      expect(getInsertLine(code, 'someExpression', 0)).toBe(1)
    })
  })
})

describe('findInsertionLine - TypeScript 特殊语法', () => {
  it('as 类型断言 - 自动解包', () => {
    const code = `const obj = fn() as Type`
    expect(getInsertLine(code, 'obj', 0)).toBe(1)
  })

  it('可选链 ?. - 支持', () => {
    const code = `const value = obj?.prop`
    expect(getInsertLine(code, 'value', 0)).toBe(1)
  })

  it('ChainExpression - 自动解包', () => {
    const code = `const value = obj?.method()`
    expect(getInsertLine(code, 'value', 0)).toBe(1)
  })
})

describe('findInsertionLine - 文件类型支持', () => {
  it('Vue 文件 - script 提取', () => {
    const code = `<script setup>
const obj = ref({
  name: '张三'
})
</script>`
    // 选中 obj（第 1 行），应插入到 ref 调用结束后（第 4 行）
    expect(getInsertLine(code, 'obj', 1, '.vue')).toBe(4)
  })

  it('JSX 文件 - 支持', () => {
    const code = `const obj = ref({
  name: '张三'
})`
    expect(getInsertLine(code, 'obj', 0, '.jsx')).toBe(3)
  })

  it('TSX 文件 - 支持', () => {
    const code = `const obj = ref({
  name: '张三'
})`
    expect(getInsertLine(code, 'obj', 0, '.tsx')).toBe(3)
  })
})

describe('findInsertionLine - 边界情况', () => {
  it('未选中任何变量 - 返回 selectionLine + 1', () => {
    const code = `const x = 1`
    // 变量名不匹配时，应返回 selectionLine + 1
    expect(getInsertLine(code, 'nonexistent', 0)).toBe(1)
  })

  it('AST 解析失败 - 静默降级到 selectionLine + 1', () => {
    // 无效代码，AST 解析失败
    const code = `this is not valid javascript {{{`
    expect(getInsertLine(code, 'x', 0)).toBe(1)
  })
})
