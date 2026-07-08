/**
 * 打印模块处理函数
 * 处理 console.log 的插入、删除、注释、取消注释
 */

import * as vscode from 'vscode'
import { findInsertionLine, getLineIndent } from './ast'
import { isConsoleLogEnabled, getConsoleLogTemplate, parseConsoleLogTemplate, buildConsoleLogRegex } from './config'

/**
 * 处理插入 console.log
 */
export async function handleInsertConsoleLog(): Promise<void> {
  // 检查配置是否启用
  if (!isConsoleLogEnabled()) {
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const selections = editor.selections
  const template = getConsoleLogTemplate()
  const fullText = editor.document.getText()

  // 收集所有需要插入的信息
  const insertions: Array<{
    text: string
    line: number
    indent: string
  }> = []

  for (const selection of selections) {
    const selectedText = editor.document.getText(selection)
    if (!selectedText) {
      continue
    }

    const selectionLine = selection.active.line

    // 使用 AST 解析确定正确的插入位置
    let insertLine = findInsertionLine(fullText, selectedText, selectionLine)

    // 如果 AST 解析失败，使用简单的下一行
    if (insertLine === -1) {
      insertLine = selectionLine + 1
    }

    // 获取插入位置所在行的缩进
    let indent: string
    if (insertLine > 0) {
      const prevLine = editor.document.lineAt(Math.min(insertLine - 1, editor.document.lineCount - 1))
      indent = getLineIndent(prevLine.text)
    } else {
      const currentLine = editor.document.lineAt(selectionLine)
      indent = getLineIndent(currentLine.text)
    }

    const consoleLogContent = parseConsoleLogTemplate(selectedText, template)
    insertions.push({
      text: `${indent}console.log(${consoleLogContent})\n`,
      line: insertLine,
      indent: indent
    })
  }

  if (insertions.length === 0) {
    return
  }

  // 按行号降序排序，避免行号偏移问题
  insertions.sort((a, b) => b.line - a.line)

  // 插入所有 console.log
  await editor.edit((editBuilder) => {
    for (const insertion of insertions) {
      const insertPosition = new vscode.Position(insertion.line, 0)
      editBuilder.insert(insertPosition, insertion.text)
    }
  })
}

/**
 * 处理删除 console.log
 */
export async function handleDeleteConsoleLog(): Promise<void> {
  // 检查配置是否启用
  if (!isConsoleLogEnabled()) {
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const document = editor.document
  const template = getConsoleLogTemplate()
  const regex = buildConsoleLogRegex(template)

  // 收集需要删除的行
  const linesToDelete: number[] = []

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i)
    if (regex.test(line.text)) {
      linesToDelete.push(i)
    }
  }

  if (linesToDelete.length === 0) {
    vscode.window.showInformationMessage('未找到匹配的 console.log')
    return
  }

  // 从后往前删除，避免行号偏移
  await editor.edit((editBuilder) => {
    for (let i = linesToDelete.length - 1; i >= 0; i--) {
      const range = new vscode.Range(new vscode.Position(linesToDelete[i], 0), new vscode.Position(linesToDelete[i] + 1, 0))
      editBuilder.delete(range)
    }
  })

  vscode.window.showInformationMessage(`已删除 ${linesToDelete.length} 行 console.log`)
}

/**
 * 处理注释 console.log
 */
export async function handleCommentConsoleLog(): Promise<void> {
  // 检查配置是否启用
  if (!isConsoleLogEnabled()) {
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const document = editor.document
  const template = getConsoleLogTemplate()
  const regex = buildConsoleLogRegex(template)

  // 收集需要注释的行
  const linesToComment: number[] = []

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i)
    if (regex.test(line.text)) {
      linesToComment.push(i)
    }
  }

  if (linesToComment.length === 0) {
    vscode.window.showInformationMessage('未找到匹配的 console.log')
    return
  }

  // 注释行
  await editor.edit((editBuilder) => {
    for (const lineIndex of linesToComment) {
      const line = document.lineAt(lineIndex)
      const indent = getLineIndent(line.text)
      const content = line.text.trim()
      const newText = `${indent}// ${content}\n`
      const range = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex + 1, 0))
      editBuilder.replace(range, newText)
    }
  })

  vscode.window.showInformationMessage(`已注释 ${linesToComment.length} 行 console.log`)
}

/**
 * 处理取消注释 console.log
 */
export async function handleUncommentConsoleLog(): Promise<void> {
  // 检查配置是否启用
  if (!isConsoleLogEnabled()) {
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const document = editor.document
  const template = getConsoleLogTemplate()
  const regex = buildConsoleLogRegex(template)

  // 收集需要取消注释的行
  const linesToUncomment: number[] = []

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i)
    const trimmed = line.text.trim()

    // 检查是否是注释行
    if (trimmed.startsWith('//')) {
      const uncommented = trimmed.slice(2).trim()
      // 检查取消注释后是否匹配
      if (regex.test(uncommented)) {
        linesToUncomment.push(i)
      }
    }
  }

  if (linesToUncomment.length === 0) {
    vscode.window.showInformationMessage('未找到需要取消注释的 console.log')
    return
  }

  // 取消注释
  await editor.edit((editBuilder) => {
    for (const lineIndex of linesToUncomment) {
      const line = document.lineAt(lineIndex)
      const trimmed = line.text.trim()
      const uncommented = trimmed.slice(2).trim()
      const indent = getLineIndent(line.text)
      const newText = `${indent}${uncommented}\n`
      const range = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex + 1, 0))
      editBuilder.replace(range, newText)
    }
  })

  vscode.window.showInformationMessage(`已取消注释 ${linesToUncomment.length} 行 console.log`)
}
