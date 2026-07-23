/**
 * 打印模块处理函数
 * 处理 console.log 的插入、删除、注释、取消注释
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { getLineIndent, parseCode, isTemplateExtension } from './ast'
import { planInsertions } from './locator'
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
  const lineCount = editor.document.lineCount

  // 每个选区的元信息（索引与 selections 对齐）：携带选中文本、活动行与选区起止 offset，供定位器消费。
  const selMeta = selections.map((selection) => ({
    selectedText: editor.document.getText(selection),
    selectionLine: selection.active.line,
    selectionRange: {
      startOffset: editor.document.offsetAt(selection.start),
      endOffset: editor.document.offsetAt(selection.end),
    },
  }))

  // 解析 AST（offset 经 adjustASTLocations 已换算为全文档绝对坐标）：
  // - 非模板文件：忽略 selectionLine，全量解析一次跨选区复用；
  // - 模板文件（Vue/HTML/Svelte/Astro）：按首个非空选区所在行提取对应 <script> 块；
  //   落在其它 script 块的选区解析不出 target → 走最小回退（多块 + 跨块多选罕见）。
  const templateFile = isTemplateExtension(fileExtension)
  const firstSelLine = selMeta.find((m) => m.selectedText)?.selectionLine ?? 0
  const parsed = parseCode(fullText, templateFile ? firstSelLine : 0, fileExtension)

  // 缩进单位（仅用于空块展开 / 补块的「深一层」渲染；复制现成行缩进时不需）
  const tabSize = typeof editor.options?.tabSize === 'number' ? editor.options.tabSize : 2
  const unit = editor.options?.insertSpaces === false ? '\t' : ' '.repeat(tabSize)
  const lineIndentAt = (offset: number) => getLineIndent(editor.document.lineAt(Math.min(editor.document.positionAt(offset).line, lineCount - 1)).text)

  // 剪贴板复制（去除 snippet 占位符后写入）
  const copyLog = async (selectedText: string) => {
    if (!isConsoleLogCopyToClipboardEnabled()) return
    const extractTemplate = getConsoleLogClipboardPattern()
    if (!extractTemplate) return
    let content = parseConsoleLogTemplate(selectedText, template)
    content = content.replace(/\$\{(\d+):([^}]+)\}/g, '$2').replace(/\$\d+/g, '')
    const clipboardText = extractClipboardText(selectedText, extractTemplate, `console.log(${content})`)
    if (clipboardText) await vscode.env.clipboard.writeText(clipboardText)
  }

  // 每条编辑拆成 prefix + content + suffix：content 为 console.log 实参（可能含 snippet tab stop），
  // prefix/suffix 为字面脚手架（snippet 模式下需转义），便于两种应用方式共用。
  type AnchorEdit = { start: number; end: number; prefix: string; content: string; suffix: string; selectedText: string }
  const anchorEdits: AnchorEdit[] = []

  // 行首 offset（或文件末尾非行首 AFTER）：行首直插、末尾另起一行无尾换行
  const pushLineStart = (offset: number, indent: string, selectedText: string) => {
    const atStart = offset === 0 || fullText[offset - 1] === '\n'
    anchorEdits.push({
      start: offset,
      end: offset,
      prefix: atStart ? `${indent}console.log(` : `\n${indent}console.log(`,
      content: parseConsoleLogTemplate(selectedText, template),
      suffix: atStart ? ')\n' : ')',
      selectedText,
    })
  }

  // 无法解析出锚点的选区（空选区 / 无法解析 / 无法安全补块）→ 最小回退：
  // 在选中行的下一行、复制选中行缩进插入（静默降级）
  const pushFallback = (selectedText: string, selectionLine: number) => {
    if (!selectedText) return
    const indent = getLineIndent(editor.document.lineAt(Math.min(selectionLine, lineCount - 1)).text)
    const off = Math.min(editor.document.offsetAt(new vscode.Position(selectionLine + 1, 0)), fullText.length)
    pushLineStart(off, indent, selectedText)
  }

  if (parsed) {
    // ── 锚定规划 + 原始坐标原子编辑 ──
    // 全部编辑（普通插入 / 空块展开 / 补块 wrap / 回退）均以原始 code 坐标表达，
    // 交由同一次 editor.edit（或 WorkspaceEdit）原子合并，无需 normalize 后重解析。
    const plan = planInsertions(
      parsed.ast,
      fullText,
      selMeta.map((m) => m.selectionRange)
    )

    for (const ins of plan.insertions) {
      const meta = selMeta[ins.selectionIndex]
      if (!meta.selectedText) continue
      const content = parseConsoleLogTemplate(meta.selectedText, template)
      if (ins.normalize) {
        // 补块 wrap：替换原始体区间 [bodyStart,bodyEnd] 为多行块（内含 console.log + 原体）
        const bi = lineIndentAt(ins.normalize.bodyStart)
        const body = fullText.slice(ins.normalize.bodyStart, ins.normalize.bodyEnd)
        const lead = ins.normalize.kind === 'wrap-expr-return' ? 'return ' : ''
        anchorEdits.push({
          start: ins.normalize.bodyStart,
          end: ins.normalize.bodyEnd,
          prefix: `{\n${bi}${unit}console.log(`,
          content,
          suffix: `)\n${bi}${unit}${lead}${body}\n${bi}}`,
          selectedText: meta.selectedText,
        })
      } else if (ins.indentOneLevelDeeper) {
        // 空块 {}：offset 落在 `{` 之后，展开为多行并把 log 落块内
        const bi = lineIndentAt(ins.indentRef)
        anchorEdits.push({
          start: ins.offset,
          end: ins.offset,
          prefix: `\n${bi}${unit}console.log(`,
          content,
          suffix: `)\n${bi}`,
          selectedText: meta.selectedText,
        })
      } else {
        // 行首 offset（AFTER / BEFORE / BLOCK_HEAD 非空块）或文件末尾 AFTER：复制 indentRef 行缩进
        pushLineStart(ins.offset, lineIndentAt(ins.indentRef), meta.selectedText)
      }
    }
    // 无法解析 / 无法安全补块 → 最小回退（SKIP / 重叠丢弃静默省略）
    for (const idx of plan.fallbacks) {
      pushFallback(selMeta[idx].selectedText, selMeta[idx].selectionLine)
    }
  } else {
    // 解析失败：全部选区走最小回退
    for (const meta of selMeta) pushFallback(meta.selectedText, meta.selectionLine)
  }

  if (anchorEdits.length === 0) return
  // 应用顺序按 offset 降序，避免前序编辑移位后序坐标；同 offset 保持规划器给定的稳定序
  anchorEdits.sort((a, b) => b.start - a.start)

  if (useSnippet) {
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/}/g, '\\}')
    const workspaceEdit = new vscode.WorkspaceEdit()
    const snippetEdits = anchorEdits.map((e) => {
      // 模板把最终光标 $0 置于实参末尾时，将其移到闭合括号 ) 之后（语句尾），
      // 否则光标会停在 console.log(... $0) 括号内；仅迁移结尾的 $0，中间的 $0 按用户意图保留。
      let content = e.content
      let suffix = esc(e.suffix)
      if (/\$0\s*$/.test(content) && e.suffix.startsWith(')')) {
        content = content.replace(/\$0(\s*)$/, '$1')
        suffix = ')' + '$0' + esc(e.suffix.slice(1))
      }
      const snippet = new vscode.SnippetString(esc(e.prefix) + content + suffix)
      const startPos = editor.document.positionAt(e.start)
      return e.start === e.end
        ? vscode.SnippetTextEdit.insert(startPos, snippet)
        : vscode.SnippetTextEdit.replace(new vscode.Range(startPos, editor.document.positionAt(e.end)), snippet)
    })
    workspaceEdit.set(editor.document.uri, snippetEdits)
    await vscode.workspace.applyEdit(workspaceEdit)
  } else {
    await editor.edit((editBuilder) => {
      for (const e of anchorEdits) {
        const startPos = editor.document.positionAt(e.start)
        const text = e.prefix + e.content + e.suffix
        if (e.start === e.end) editBuilder.insert(startPos, text)
        else editBuilder.replace(new vscode.Range(startPos, editor.document.positionAt(e.end)), text)
      }
    })
  }

  await copyLog(anchorEdits[0].selectedText)
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
