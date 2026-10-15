/**
 * 文件路径翻译模块
 * 新建/重命名文件与文件夹时翻译路径中的非英文字符，并处理改名后的内容同步、空目录清理与撤回
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import { containsNonEnglish } from './chineseDetector'
import {
  NamingFormat,
  DigitFormatShortcut,
  FILE_FORMAT_OPTIONS,
  convertToFormat,
  detectPathSegmentShortcuts,
  resolveSegmentFormats,
  splitIntoWordsForFileName,
  splitMixedText,
} from './namingConvention'
import { Translator } from './translator'
import { UndoManager, UndoRecord } from './undoManager'
import { ConfigManager } from './config'
import { showFormatPicker } from './formatPicker'
import { copyFileTranslationToClipboard, showFileClipboardStatus } from './clipboard'
import { SegmentPair, buildSegmentPairs, replaceContentSegments } from './contentRewriter'

/**
 * 文件翻译的运行时依赖
 * translator / undoManager 单例由 handler 持有并注入，避免两个模块互相 import 形成循环引用
 */
export interface FileTranslationDeps {
  translator: Translator
  undoManager: UndoManager
}

/**
 * 监听文件创建事件
 * @param context 插件上下文
 * @param deps 运行时依赖
 */
export function registerFileCreationListener(context: vscode.ExtensionContext, deps: FileTranslationDeps): void {
  const listener = vscode.workspace.onDidCreateFiles(async (event) => {
    // 检查是否启用了文件翻译
    if (!ConfigManager.isFileTranslationEnabled()) {
      return
    }

    for (const fileUri of event.files) {
      await handleFileCreated(fileUri, true, deps)
    }
  })

  context.subscriptions.push(listener)
}

/**
 * 监听文件重命名事件
 * @param context 插件上下文
 * @param deps 运行时依赖
 */
export function registerFileRenameListener(context: vscode.ExtensionContext, deps: FileTranslationDeps): void {
  const listener = vscode.workspace.onDidRenameFiles(async (event) => {
    // 检查是否启用了文件翻译
    if (!ConfigManager.isFileTranslationEnabled()) {
      return
    }

    for (const { newUri } of event.files) {
      await handleFileCreated(newUri, false, deps)
    }
  })

  context.subscriptions.push(listener)
}

/**
 * 撤回文件翻译
 * @param record 撤回记录
 * @param deps 运行时依赖
 */
export async function undoFileTranslation(record: UndoRecord, deps: FileTranslationDeps): Promise<void> {
  const filePath = record.translatedPath

  try {
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      vscode.window.showWarningMessage('文件不存在，可能已被删除')
      deps.undoManager.removeRecord(filePath)
      return
    }

    // 删除文件
    await vscode.workspace.fs.delete(vscode.Uri.file(filePath))

    // 关闭编辑器窗口
    await closeEditorForFile(filePath)

    // 只清理翻译时创建的目录（避免删除用户原有目录）
    if (record.createdDirs && record.createdDirs.length > 0) {
      // 从深到浅排序，先删除深层目录
      const sortedDirs = [...record.createdDirs].sort((a, b) => b.length - a.length)
      for (const dir of sortedDirs) {
        try {
          const stat = await fs.stat(dir)
          if (stat.isDirectory()) {
            const files = await fs.readdir(dir)
            if (files.length === 0) {
              await fs.rmdir(dir)
            }
          }
        } catch {
          // 忽略错误（目录可能已被删除）
        }
      }
    }

    // 删除撤回记录
    deps.undoManager.removeRecord(filePath)
  } catch (error) {
    console.error('删除文件失败:', error)
    vscode.window.showErrorMessage(`删除文件失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 处理文件创建事件（取消时保留原文件/文件夹）
 * @param fileUri 文件URI
 * @param isNewFile 是否来自新建文件事件（仅新建时同步替换文件内容，重命名已有文件不动内容）
 * @param deps 运行时依赖
 */
async function handleFileCreated(fileUri: vscode.Uri, isNewFile: boolean, deps: FileTranslationDeps): Promise<void> {
  // 1. 确认事件目标可翻译（在工作区内、含非英文路径），并拆出名称与扩展名
  const target = await resolveTranslationTarget(fileUri)
  if (!target) return

  const { filePath, workspaceRoot, isDirectory, nameWithoutExt, ext } = target

  // 2. 片段拆分 + 每个片段的数字快捷编号
  const { dotSegments, flatParts } = splitNameSegments(nameWithoutExt)
  const shortcuts = detectSegmentShortcuts(nameWithoutExt)

  // 3. 文件段格式：命中末尾数字免弹窗，弹窗取消则保留原名称
  const fileFormat = await resolveFileFormat(filePath, isDirectory, shortcuts[flatParts.length - 1])
  if (!fileFormat) return

  // 4. 逐片段翻译（每片段格式从后向前倒推：优先自身数字编号，否则继承最近下游片段，最终回落到文件段格式）
  const { translatedParts, segmentPairs, lastTranslatedPart, lastOriginalPart } = await translateNameSegments(
    dotSegments,
    shortcuts,
    resolveSegmentFormats(shortcuts, fileFormat),
    deps.translator
  )
  const translatedExt = await translateExtension(ext, fileFormat, deps.translator)

  // 5. 落地：冲突改名 -> 建目录 -> 重命名并同步内容/剪贴板/编辑器
  const finalPath = resolveConflictFreePath(path.join(workspaceRoot, translatedParts.join('/') + translatedExt), ext)
  await createDirectoryRecursive(path.dirname(finalPath))

  await finalizeRename({
    fileUri,
    filePath,
    finalPath,
    workspaceRoot,
    isDirectory,
    isNewFile,
    format: fileFormat,
    segmentPairs,
    lastOriginalPart,
    lastTranslatedPart,
    deps,
  })
}

/** 可翻译的事件目标 */
interface TranslationTarget {
  filePath: string
  workspaceRoot: string
  isDirectory: boolean
  /** 相对路径去掉扩展名的部分（可能含目录） */
  nameWithoutExt: string
  /** 扩展名（含点号），文件夹为空串 */
  ext: string
}

/**
 * 解析新建/重命名目标：确认类型与工作区、校验路径含非英文、等待落盘就绪并拆出名称与扩展名
 * 返回 undefined 表示无需翻译（stat 失败、不在工作区内、纯英文路径）
 */
async function resolveTranslationTarget(fileUri: vscode.Uri): Promise<TranslationTarget | undefined> {
  const filePath = fileUri.fsPath

  // 检查是文件还是文件夹
  let isDirectory: boolean
  try {
    const stat = await vscode.workspace.fs.stat(fileUri)
    isDirectory = stat.type === vscode.FileType.Directory
  } catch {
    return
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri)
  if (!workspaceFolder) return

  // 获取相对路径（包含目录）
  const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath)

  // 检测相对路径是否包含非英文字符
  if (!containsNonEnglish(relativePath)) return

  // 等待文件就绪
  await waitForFileReady(filePath)

  let ext: string
  let nameWithoutExt: string
  if (isDirectory) {
    // 文件夹没有扩展名，整个相对路径就是名称
    nameWithoutExt = relativePath
    ext = ''
  } else {
    ext = path.extname(relativePath)
    nameWithoutExt = relativePath.slice(0, -ext.length || undefined)
  }

  return {
    filePath,
    workspaceRoot: workspaceFolder.uri.fsPath,
    isDirectory,
    nameWithoutExt,
    ext,
  }
}

/** 名称按路径分隔符与点号拆成片段：dotSegments 保留层级结构，flatParts 供数字快捷按下标对齐 */
function splitNameSegments(nameWithoutExt: string): { dotSegments: string[][]; flatParts: string[] } {
  const dotSegments = nameWithoutExt.split(/[/\\]/).map((part) => part.split('.'))
  return { dotSegments, flatParts: dotSegments.flat() }
}

/**
 * 尾部数字快捷约定：每个片段（路径段及其点号子段）末尾的孤立数字视为该片段自身的格式编号，
 * 数字不参与本片段翻译与写入；文件段（最后一个片段）命中时跳过格式弹窗
 */
function detectSegmentShortcuts(nameWithoutExt: string): (DigitFormatShortcut | undefined)[] {
  const detectedShortcuts = detectPathSegmentShortcuts(nameWithoutExt, FILE_FORMAT_OPTIONS).shortcuts
  return ConfigManager.isDigitFormatShortcutEnabled() ? detectedShortcuts : detectedShortcuts.map(() => undefined)
}

/**
 * 文件段格式：命中末尾数字免弹窗；否则弹窗选择（取消时返回 undefined，保留原文件/文件夹）。
 * 事件驱动等待"VSCode 打开新文件"的编辑器激活完成（焦点抢夺发生在打开编辑器那一刻，
 * QuickPick 需要焦点落位后才展示），替代固定延时的魔数。
 * 新建文件夹不会打开编辑器、快捷命中不弹窗，均直接跳过等待
 */
async function resolveFileFormat(filePath: string, isDirectory: boolean, lastPartShortcut?: DigitFormatShortcut): Promise<NamingFormat | undefined> {
  if (lastPartShortcut) return lastPartShortcut.format

  if (!isDirectory) {
    await waitForEditorActivatedForFile(filePath)
  }
  return showFormatPicker()
}

/** 名称片段的翻译结果 */
interface NameTranslation {
  /** 与 dotSegments 一一对应的翻译后路径段 */
  translatedParts: string[]
  /** 所有"翻译前 -> 翻译后"的名称映射，新建文件时用于同步替换内容中的名称（如 Java 模板） */
  segmentPairs: SegmentPair[]
  /** 最后一个翻译片段及其原文，用于剪贴板复制 */
  lastTranslatedPart: string
  lastOriginalPart: string
}

/** 逐片段翻译：空段跳过，快捷数字不参与翻译与写入，净化失败回退原始名称 */
async function translateNameSegments(
  dotSegments: string[][],
  shortcuts: (DigitFormatShortcut | undefined)[],
  partFormats: NamingFormat[],
  translator: Translator
): Promise<NameTranslation> {
  const translatedParts: string[] = []
  const segmentPairs: SegmentPair[] = []
  let lastTranslatedPart = ''
  let lastOriginalPart = ''

  let flatIndex = 0
  for (const dotParts of dotSegments) {
    // 空路径段保持原逻辑：整段跳过，不进入翻译结果
    if (dotParts.length === 1 && dotParts[0] === '') {
      flatIndex++
      continue
    }

    const translatedDotParts: string[] = []

    for (const dotPart of dotParts) {
      const shortcut = shortcuts[flatIndex]
      const partFormat = partFormats[flatIndex]
      flatIndex++

      if (!dotPart) {
        translatedDotParts.push(dotPart)
        continue
      }

      // 快捷命中的数字不参与翻译与写入
      const translateInput = shortcut ? shortcut.baseName : dotPart

      if (!containsNonEnglish(dotPart)) {
        // 英文部分保持原样（快捷命中的数字仍不参与写入）
        translatedDotParts.push(translateInput)
        continue
      }

      const translated = convertToFormat(await collectTranslatedWords(translateInput, translator), partFormat)

      if (translated) {
        translatedDotParts.push(translated)
        lastTranslatedPart = translated
        // 剪贴板原文不含快捷数字；内容替换仍按盘面上的原始名称（含数字）匹配
        lastOriginalPart = translateInput
        segmentPairs.push({ original: shortcut ? shortcut.raw : dotPart, translated })
        continue
      }

      // 净化后无有效单词，回退使用原始名称，避免空或非法文件名
      translatedDotParts.push(dotPart)
      lastOriginalPart = dotPart
    }

    translatedParts.push(translatedDotParts.join('.'))
  }

  return { translatedParts, segmentPairs, lastTranslatedPart, lastOriginalPart }
}

/** 拆分中英文混排文本：非英文片段调用翻译服务并拆词，英文片段原样保留为独立单词 */
async function collectTranslatedWords(text: string, translator: Translator): Promise<string[]> {
  const words: string[] = []

  for (const part of splitMixedText(text)) {
    if (!containsNonEnglish(part)) {
      // 英文部分，保持原样，作为独立单词
      words.push(part)
      continue
    }

    // 中文部分，翻译
    const result = await translator.translate(part)
    if (result.success) {
      // 将翻译结果分割为单词（处理可能的多词翻译）
      words.push(...splitIntoWordsForFileName(result.translatedText))
    } else {
      words.push(part)
    }
  }

  return words
}

/** 翻译扩展名（含点号）；无扩展名、纯英文或净化后无有效单词时保持原样 */
async function translateExtension(ext: string, format: NamingFormat, translator: Translator): Promise<string> {
  if (!ext) return ext

  const extContent = ext.slice(1) // 去掉点号
  if (!containsNonEnglish(extContent)) return ext

  const translated = convertToFormat(await collectTranslatedWords(extContent, translator), format)
  return translated ? '.' + translated : ext
}

/** 目标已存在时追加 _1/_2 直到不冲突，并提示最终名称 */
function resolveConflictFreePath(newFilePath: string, ext: string): string {
  if (!existsSync(newFilePath)) return newFilePath

  const dir = path.dirname(newFilePath)
  const baseName = path.basename(newFilePath, ext)
  let finalPath = newFilePath
  let counter = 1
  while (existsSync(finalPath)) {
    finalPath = path.join(dir, `${baseName}_${counter}${ext}`)
    counter++
  }

  vscode.window.showInformationMessage(`文件名冲突，已重命名为: ${path.basename(finalPath)}`)
  return finalPath
}

/** 重命名及其收尾所需的全部上下文 */
interface RenameContext {
  fileUri: vscode.Uri
  /** 翻译前的绝对路径 */
  filePath: string
  /** 翻译后（含冲突后缀）的绝对路径 */
  finalPath: string
  workspaceRoot: string
  isDirectory: boolean
  isNewFile: boolean
  format: NamingFormat
  segmentPairs: SegmentPair[]
  lastOriginalPart: string
  lastTranslatedPart: string
  deps: FileTranslationDeps
}

/**
 * 收尾流程：保存脏缓冲区 -> 重命名 -> 同步文件内容 -> 清理空目录 -> 记录撤回 -> 关闭原窗口 -> 剪贴板 -> 打开新文件
 * 顺序不可随意调整，各处原因见函数内注释
 */
async function finalizeRename(context: RenameContext): Promise<void> {
  const { fileUri, filePath, finalPath, workspaceRoot, isDirectory, isNewFile, format, segmentPairs, deps } = context
  const { lastOriginalPart, lastTranslatedPart } = context

  try {
    // 重命名前先保存原路径的脏编辑器缓冲区：
    // redhat.java 等语言服务器会向新建文件插入类模板但不保存，若先改名、缓冲区后保存，
    // 会把中文文件按旧路径重新写回，与翻译后的文件并存
    if (!isDirectory) {
      await saveDirtyDocumentForFile(filePath)
    }

    await vscode.workspace.fs.rename(fileUri, vscode.Uri.file(finalPath), { overwrite: false })

    // 新建文件场景：把内容中翻译前的名称（package/类名等模板内容）同步替换为翻译后
    if (!isDirectory && isNewFile && ConfigManager.isTranslateNewFileContentEnabled()) {
      const pairs = buildSegmentPairs(segmentPairs)
      if (pairs.length > 0) {
        await translateFileContent(finalPath, pairs)
        // 语言服务器可能在改名之后才把模板落盘（迟到写入），后台观察窗口内做兜底合并
        void settleLateLanguageServerWrites(filePath, finalPath, pairs, workspaceRoot).catch((error) => {
          console.error('迟到内容兜底处理失败:', error)
        })
      }
    }

    // 清理空的中文目录
    await cleanupEmptyDirs(path.dirname(filePath), workspaceRoot)

    // 添加撤回记录（通过对比翻译前后路径确定翻译创建的目录）
    deps.undoManager.addRecord(filePath, finalPath, getTranslationCreatedDirs(filePath, finalPath))

    // 文件才需要关闭原窗口（打开翻译后的文件放到剪贴板写入之后）
    if (!isDirectory) {
      // 关闭原始文件窗口（如果已打开）
      await closeEditorForFile(filePath)
    }

    // 复制到剪贴板（根据 variableTranslator.clipboardFormats 配置复制"最后一个"翻译结果）
    // 逐条写入系统剪贴板历史（Win+V），若此时 showTextDocument 打开新编辑器造成窗口焦点抖动，
    if (lastTranslatedPart && lastOriginalPart && containsNonEnglish(lastOriginalPart)) {
      // 等待关闭原编辑器后焦点稳定，确保多条剪贴板写入被系统历史逐条记录
      await new Promise((resolve) => setTimeout(resolve, 150))
      const copyCount = await copyFileTranslationToClipboard(lastOriginalPart, lastTranslatedPart, format)
      if (copyCount > 0) {
        showFileClipboardStatus(lastOriginalPart, lastTranslatedPart, format, copyCount)
      } else {
        // 未启用剪贴板复制，只复制用户选择的格式（lastTranslatedPart 已按 format 转换）
        await vscode.env.clipboard.writeText(lastTranslatedPart)
      }
    }

    // 最后再打开翻译后的文件：放在剪贴板写入之后，避免新编辑器打开打断剪贴板历史逐条记录
    if (!isDirectory) {
      await vscode.window.showTextDocument(vscode.Uri.file(finalPath))
    }
  } catch (error) {
    console.error('重命名失败:', error)
    vscode.window.showErrorMessage(`重命名失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 递归创建目录
 * @param dirPath 目录路径
 */
async function createDirectoryRecursive(dirPath: string): Promise<void> {
  if (existsSync(dirPath)) {
    return
  }

  const parentDir = path.dirname(dirPath)
  if (parentDir !== dirPath) {
    await createDirectoryRecursive(parentDir)
  }

  try {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath))
  } catch {
    // 忽略错误（目录可能已存在）
  }
}

/**
 * 目标文件当前是否已是激活编辑器
 */
function isEditorActiveForFile(filePath: string): boolean {
  const editor = vscode.window.activeTextEditor
  return !!editor && sameFilePath(editor.document.uri.fsPath, filePath)
}

/**
 * 等待新文件的编辑器激活（事件驱动 + 超时保险丝）
 * 编辑器激活说明"打开新文件"的焦点抢夺已经完成，此时弹 QuickPick 不会被抢焦点；
 * 文件不会被打开（窗口失焦、后台打开等）时由超时兜底，行为退化为旧的固定延时上限
 * @param filePath 文件路径
 * @param timeoutMs 最长等待时间（毫秒）
 */
async function waitForEditorActivatedForFile(filePath: string, timeoutMs: number = 2000): Promise<void> {
  if (isEditorActiveForFile(filePath)) {
    return
  }

  await new Promise<void>((resolve) => {
    const sub = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && sameFilePath(editor.document.uri.fsPath, filePath)) {
        sub.dispose()
        clearTimeout(timer)
        // active 事件后 VSCode 焦点转移收尾并非同帧完成，留短暂余量再弹窗
        setTimeout(resolve, 600)
      }
    })
    const timer = setTimeout(() => {
      sub.dispose()
      resolve()
    }, timeoutMs)
  })
}

/**
 * 等待文件就绪
 * @param filePath 文件路径
 * @param maxWait 最大等待时间（毫秒）
 */
async function waitForFileReady(filePath: string, maxWait: number = 1000): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWait) {
    try {
      await fs.stat(filePath)
      return // 文件已就绪
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 比较两个文件路径是否指向同一文件（win32 下大小写不敏感）
 */
function sameFilePath(a: string, b: string): boolean {
  const na = path.normalize(a)
  const nb = path.normalize(b)
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb
}

/**
 * 查找路径对应的已打开文档（含未加入编辑器的可见缓冲区）
 */
function findOpenDocumentByPath(filePath: string): vscode.TextDocument | undefined {
  return vscode.workspace.textDocuments.find((doc) => !doc.isClosed && sameFilePath(doc.uri.fsPath, filePath))
}

/**
 * 重命名前保存原路径的脏缓冲区（语言服务器插入的模板可能尚未落盘）
 */
async function saveDirtyDocumentForFile(filePath: string): Promise<void> {
  const doc = findOpenDocumentByPath(filePath)
  if (doc && doc.isDirty) {
    await doc.save()
  }
}

/**
 * 将新内容写回文件：优先经编辑器缓冲区（改名后编辑器已跟随到新路径），避免磁盘/缓冲区不一致
 */
async function applyContentToFile(filePath: string, newContent: string): Promise<void> {
  const doc = findOpenDocumentByPath(filePath)
  if (doc) {
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length))
    const edit = new vscode.WorkspaceEdit()
    edit.replace(doc.uri, fullRange, newContent)
    await vscode.workspace.applyEdit(edit)
    await doc.save()
  } else {
    await fs.writeFile(filePath, newContent)
  }
}

/**
 * 读取文件当前内容（优先缓冲区），把翻译前的路径段替换为翻译后并写回
 */
async function translateFileContent(filePath: string, pairs: SegmentPair[]): Promise<void> {
  const doc = findOpenDocumentByPath(filePath)
  let current: string
  try {
    current = doc ? doc.getText() : (await fs.readFile(filePath)).toString('utf8')
  } catch {
    return
  }
  const updated = replaceContentSegments(current, pairs)
  if (updated !== current) {
    await applyContentToFile(filePath, updated)
  }
}

/**
 * 等待文件内容稳定（size+mtime 连续不变），用于迟到写入的落盘收尾
 */
async function waitForFileStable(filePath: string, quietMs: number = 500, maxWaitMs: number = 1500): Promise<void> {
  const startTime = Date.now()
  let prev = ''
  let quietFor = 0
  while (Date.now() - startTime < maxWaitMs) {
    let sig: string
    try {
      const stat = await fs.stat(filePath)
      sig = `${stat.size}:${stat.mtimeMs}`
    } catch {
      return // 文件已消失
    }
    if (sig === prev) {
      quietFor += 250
      if (quietFor >= quietMs) {
        return
      }
    } else {
      quietFor = 0
      prev = sig
    }
    await sleep(250)
  }
}

/**
 * 改名后的迟到写入兜底观察窗口（仅新建文件场景）
 * redhat.java 可能在改名之后才把按旧名生成的模板落盘：
 * 1. 旧路径文件复活 -> 取其内容替换翻译段后并入新文件（迟到模板是语言服务器的权威内容），删除复活文件并再清理空中文目录
 * 2. 模板迟到写入已跟随到新路径的缓冲区 -> 窗口结束时再做一次内容替换
 */
async function settleLateLanguageServerWrites(originalPath: string, finalPath: string, pairs: SegmentPair[], workspaceRoot: string): Promise<void> {
  const settleWindowMs = 4000
  const deadline = Date.now() + settleWindowMs

  while (Date.now() < deadline) {
    if (existsSync(originalPath)) {
      await waitForFileStable(originalPath)
      try {
        const lateContent = (await fs.readFile(originalPath)).toString('utf8')
        const translatedLate = replaceContentSegments(lateContent, pairs)
        const doc = findOpenDocumentByPath(finalPath)
        const current = doc ? doc.getText() : (await fs.readFile(finalPath)).toString('utf8')
        if (translatedLate !== current) {
          await applyContentToFile(finalPath, translatedLate)
        }
        await fs.unlink(originalPath)
      } catch {
        // 兜底路径失败时保留现场（两份文件仍存在），不打断用户操作
      }
      break
    }
    await sleep(250)
  }

  // 迟到编辑落在缓冲区里的情况：改名跟随的文档仍可能含翻译前名称，替换并保存
  await translateFileContent(finalPath, pairs)
  // 复活文件可能重建了中文目录，再清一次空目录
  await cleanupEmptyDirs(path.dirname(originalPath), workspaceRoot)
}

/**
 * 获取翻译创建的目录
 * 通过对比翻译前与翻译后的路径，只有发生变化的路径段才是翻译创建的。
 * 相同的前缀段（如 src）是用户原有目录，绝不清理。
 * @param originalPath 翻译前的文件路径
 * @param translatedPath 翻译后的文件路径
 * @returns 翻译创建的目录列表（从深到浅）
 */
function getTranslationCreatedDirs(originalPath: string, translatedPath: string): string[] {
  const origParts = originalPath.split(/[/\\]/)
  const transParts = translatedPath.split(/[/\\]/)

  // 找到翻译前与翻译后路径的第一个不同段（分歧点）
  // 分歧点之前的段完全相同，属于用户原有目录，绝不清理
  let divergeIndex = 0
  while (divergeIndex < origParts.length && divergeIndex < transParts.length && origParts[divergeIndex] === transParts[divergeIndex]) {
    divergeIndex++
  }

  // 从分歧点到文件名之前的每一级目录都是翻译创建的（从深到浅）
  // transParts 最后一个是文件名，不算目录
  const createdDirs: string[] = []
  for (let i = transParts.length - 2; i >= divergeIndex; i--) {
    createdDirs.push(transParts.slice(0, i + 1).join(path.sep))
  }

  return createdDirs
}

/**
 * 清理空目录（异步版本）
 * @param dirPath 目录路径
 * @param workspaceRoot 工作区根路径
 * @param onlyNonEnglish 是否只清理含非英文字符的目录（默认 true）
 */
async function cleanupEmptyDirs(dirPath: string, workspaceRoot?: string, onlyNonEnglish: boolean = true): Promise<void> {
  try {
    if (!workspaceRoot) {
      return
    }

    // 归一化为相对路径以判定目录是否处于工作区子树内。
    // 采用 path.relative 而非 dirPath.startsWith(workspaceRoot)：win32 下 path.relative 按大小写不敏感比较，
    // 可规避 VSCode 将 URI 盘符归一化为小写（d:）与实际 fsPath（D:）不一致时字符串前缀匹配失效的问题。
    // 相对路径为空（同一目录）、以 '..' 开头（位于工作区之外）或为绝对路径（跨盘符）时，判定越界并直接返回。
    const relativePath = path.relative(workspaceRoot, dirPath)
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return
    }

    // 按分隔符拆分为各级目录段，兼容 posix('/') 与 win32('\\') 两种分隔符。
    const parts = relativePath.split(/[/\\]/)

    // 自叶子目录向根方向逐级回溯：先删深层空目录，使其父级在下一轮迭代中也可能变为空目录被回收。
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      // onlyNonEnglish 为 true 时跳过纯 ASCII 目录段，仅清理含非英文字符的目录（避免误删用户既有的英文目录）。
      if (onlyNonEnglish && !containsNonEnglish(part)) {
        continue
      }
      // 由工作区根 + 前 i+1 段重建绝对路径，规避直接字符串拼接导致的分隔符/盘符不一致。
      const fullPath = path.join(workspaceRoot, ...parts.slice(0, i + 1))
      try {
        const stat = await fs.stat(fullPath)
        // 仅当目标为目录且 readdir 返回空列表（无任何条目）时才执行 rmdir，确保非空目录不被删除。
        if (stat.isDirectory()) {
          const files = await fs.readdir(fullPath)
          if (files.length === 0) {
            await fs.rmdir(fullPath)
          }
        }
      } catch {
        // 忽略错误（目录可能已被删除或无权限）
      }
    }
  } catch {
    // 忽略错误
  }
}

/**
 * 关闭文件的编辑器窗口
 * @param filePath 文件路径
 */
async function closeEditorForFile(filePath: string): Promise<void> {
  const normalizedPath = path.normalize(filePath)

  for (const editor of vscode.window.visibleTextEditors) {
    const editorPath = path.normalize(editor.document.uri.fsPath)

    if (editorPath === normalizedPath) {
      await vscode.window.showTextDocument(editor.document)
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      break
    }
  }
}
