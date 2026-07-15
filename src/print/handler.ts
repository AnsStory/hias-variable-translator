/**
 * 打印模块处理函数
 * 处理 console.log 的插入、删除、注释、取消注释
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { findInsertionLine, getLineIndent } from './ast'
import {
  isConsoleLogEnabled,
  getConsoleLogTemplate,
  parseConsoleLogTemplate,
  buildConsoleLogRegex,
  buildCommentConsoleLogRegex,
  hasSnippetSyntax,
  isConsoleLogCopyToClipboardEnabled,
  getConsoleLogClipboardPattern,
  extractClipboardText,
} from './config'

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
  const useSnippet = hasSnippetSyntax(template)
  const fileExtension = path.extname(editor.document.fileName)

  // 收集所有需要插入的信息
  const insertions: Array<{
    line: number
    indent: string
    selectedText: string
  }> = []

  for (const selection of selections) {
    const selectedText = editor.document.getText(selection)
    if (!selectedText) {
      continue
    }

    const selectionLine = selection.active.line

    // 使用 AST 解析确定正确的插入位置
    const insertResult = findInsertionLine(fullText, selectedText, selectionLine, fileExtension)
    let insertLine = insertResult.line
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

    insertions.push({
      line: insertLine,
      indent: indent,
      selectedText: selectedText,
    })
  }

  if (insertions.length === 0) {
    return
  }

  // 按行号降序排序，避免行号偏移问题
  insertions.sort((a, b) => b.line - a.line)

  if (useSnippet) {
    // Snippet 模式：使用 WorkspaceEdit + SnippetTextEdit 支持多位置 snippet
    const workspaceEdit = new vscode.WorkspaceEdit()
    const snippetEdits: vscode.SnippetTextEdit[] = []

    for (const insertion of insertions) {
      const consoleLogContent = parseConsoleLogTemplate(insertion.selectedText, template)
      const snippetText = `${insertion.indent}console.log(${consoleLogContent})\n`

      const range = new vscode.Range(new vscode.Position(insertion.line, 0), new vscode.Position(insertion.line, 0))
      const snippetString = new vscode.SnippetString(snippetText)
      snippetEdits.push(vscode.SnippetTextEdit.insert(range.start, snippetString))
    }

    // 使用 set 方法应用 snippet 编辑
    workspaceEdit.set(editor.document.uri, snippetEdits)
    await vscode.workspace.applyEdit(workspaceEdit)
  } else {
    // 普通模式：直接插入文本
    await editor.edit((editBuilder) => {
      for (const insertion of insertions) {
        const consoleLogContent = parseConsoleLogTemplate(insertion.selectedText, template)
        const text = `${insertion.indent}console.log(${consoleLogContent})\n`
        const insertPosition = new vscode.Position(insertion.line, 0)
        editBuilder.insert(insertPosition, text)
      }
    })
  }

  // 复制到剪贴板逻辑
  if (isConsoleLogCopyToClipboardEnabled() && insertions.length > 0) {
    const extractTemplate = getConsoleLogClipboardPattern()
    if (extractTemplate) {
      // 构建完整的 console.log 语句（去除 snippet 语法）
      const firstInsertion = insertions[0]
      let consoleLogContent = parseConsoleLogTemplate(firstInsertion.selectedText, template)
      // 移除 snippet 占位符（${n:placeholder} → placeholder，$n → 空）
      consoleLogContent = consoleLogContent.replace(/\$\{(\d+):([^}]+)\}/g, '$2').replace(/\$\d+/g, '')
      const fullLine = `console.log(${consoleLogContent})`
      const clipboardText = extractClipboardText(firstInsertion.selectedText, extractTemplate, fullLine)
      if (clipboardText) {
        await vscode.env.clipboard.writeText(clipboardText)
      }
    }
  }
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
  const success = await editor.edit((editBuilder) => {
    for (let i = linesToDelete.length - 1; i >= 0; i--) {
      const range = new vscode.Range(new vscode.Position(linesToDelete[i], 0), new vscode.Position(linesToDelete[i] + 1, 0))
      editBuilder.delete(range)
    }
  })

  if (success) {
    vscode.window.showInformationMessage(`已删除 ${linesToDelete.length} 行 console.log`)
  }
}

/**
 * 处理注释 console.log
 * 使用批量 WorkspaceEdit 操作，避免逐行调用 VSCode 命令
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

  // 保存用户当前选区
  const savedSelections = editor.selections.map((s) => new vscode.Selection(s.anchor, s.active))

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

  // 批量操作：在每行的缩进后插入 "// "
  const workspaceEdit = new vscode.WorkspaceEdit()
  const edits: vscode.TextEdit[] = []

  for (const lineIndex of linesToComment) {
    const line = document.lineAt(lineIndex)
    // 找到行内容的起始位置（跳过空白字符）
    const firstNonWhitespace = line.firstNonWhitespaceCharacterIndex
    const insertPos = new vscode.Position(lineIndex, firstNonWhitespace)
    edits.push(vscode.TextEdit.insert(insertPos, '// '))
  }

  workspaceEdit.set(document.uri, edits)
  const success = await vscode.workspace.applyEdit(workspaceEdit)

  // 恢复用户选区
  editor.selections = savedSelections

  if (success) {
    vscode.window.showInformationMessage(`已注释 ${linesToComment.length} 行 console.log`)
  }
}

/**
 * 处理取消注释 console.log
 * 使用批量 WorkspaceEdit 操作，支持 // 和块注释两种注释形式
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
  const commentRegex = buildCommentConsoleLogRegex(template)

  // 保存用户当前选区
  const savedSelections = editor.selections.map((s) => new vscode.Selection(s.anchor, s.active))

  // 收集需要取消注释的行及对应的注释类型
  const linesToUncomment: Array<{ line: number; type: 'line' | 'block' }> = []

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i)
    const match = commentRegex.exec(line.text)
    if (match) {
      // 判断是块注释还是行注释：块注释的匹配中包含 /* 和 */
      const isBlock = match[0].includes('/*') && match[0].includes('*/')
      linesToUncomment.push({ line: i, type: isBlock ? 'block' : 'line' })
    }
  }

  if (linesToUncomment.length === 0) {
    vscode.window.showInformationMessage('未找到需要取消注释的 console.log')
    return
  }

  // 批量操作：移除注释符号
  const workspaceEdit = new vscode.WorkspaceEdit()
  const edits: vscode.TextEdit[] = []

  for (const { line: lineIndex, type } of linesToUncomment) {
    const line = document.lineAt(lineIndex)
    const text = line.text

    if (type === 'block') {
      // 块注释 /* ... */：移除 /* 和 */
      // 移除 /* （包括后面的空格）
      const openMatch = /\/\*\s*/.exec(text)
      if (openMatch) {
        const openStart = line.firstNonWhitespaceCharacterIndex + openMatch.index
        edits.push(
          vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineIndex, openStart), new vscode.Position(lineIndex, openStart + openMatch[0].length)))
        )
      }
      // 移除 */（包括前面的空格）
      const closeMatch = /\s*\*\//.exec(text)
      if (closeMatch) {
        const closeStart = text.indexOf(closeMatch[0])
        edits.push(
          vscode.TextEdit.delete(
            new vscode.Range(new vscode.Position(lineIndex, closeStart), new vscode.Position(lineIndex, closeStart + closeMatch[0].length))
          )
        )
      }
    } else {
      // 行注释 //：移除 // 及其后的一个空格
      const firstNonWs = line.firstNonWhitespaceCharacterIndex
      const afterWs = text.slice(firstNonWs)
      if (afterWs.startsWith('// ')) {
        edits.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineIndex, firstNonWs), new vscode.Position(lineIndex, firstNonWs + 3))))
      } else if (afterWs.startsWith('//')) {
        edits.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineIndex, firstNonWs), new vscode.Position(lineIndex, firstNonWs + 2))))
      }
    }
  }

  workspaceEdit.set(document.uri, edits)
  const success = await vscode.workspace.applyEdit(workspaceEdit)

  // 恢复用户选区
  editor.selections = savedSelections

  if (success) {
    vscode.window.showInformationMessage(`已取消注释 ${linesToUncomment.length} 行 console.log`)
  }
}
