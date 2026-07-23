/**
 * console.log 插入定位器：语句锚定模型。
 *
 * 输入选区 offset，经三步纯函数链路得到插入坐标：
 *   1. resolveTargetNode：选区 offset → 目标 AST 节点；
 *   2. climbToAnchor / determineRole / decidePlacement：节点 → 锚语句 + 插入位分类；
 *   3. computeInsertionAnchor / planInsertions：分类 → 原始 code 坐标的插入编辑。
 *
 * 全部导出均为无副作用纯函数：不读取编辑器状态、不生成打印文本、不执行编辑，
 * 文本渲染与编辑应用由 handler 负责。定位逻辑与文本渲染解耦，可独立单元测试。
 */

import { ASTNode, SelectionRange, walkAST, unwrapTypeAssertion, buildParentMap, offsetToLine } from './ast'

/**
 * 语句容器：某字段为「语句数组」的节点类型 → 该字段名。
 * 合法插入点即「某语句容器的语句数组中的某个下标处」。
 */
const STATEMENT_CONTAINERS: Record<string, string> = {
  Program: 'body',
  BlockStatement: 'body',
  StaticBlock: 'body',
  TSModuleBlock: 'body',
  SwitchCase: 'consequent',
}

/**
 * 成员容器：字段装的是成员声明（PropertyDefinition/MethodDefinition）而非语句。
 * 类体直属层不能放置语句，故锚点落在此类容器时判为不可插入（SKIP）。
 */
const MEMBER_CONTAINERS: Record<string, string> = {
  ClassBody: 'body',
}

/** 锚定结果：target 挂在 stmt 上，stmt 是 container 语句/成员数组的直接元素 */
export interface AnchorResult {
  /** 目标节点 */
  target: ASTNode
  /** 锚语句：container 的语句/成员数组中包含 target 的那条直接子节点 */
  stmt: ASTNode
  /** 语句容器 / 成员容器节点 */
  container: ASTNode
  /** 容器类别：STATEMENT 可插入语句；CLASS_BODY 为类体，不可插入 */
  containerKind: 'STATEMENT' | 'CLASS_BODY'
}

/**
 * 计算选区的「有效区间」：跳过首尾空白字符。
 *
 * 拖选可能带上前后空白（如 ` user `），offset 虽精确但会使「包含选区的最小节点」
 * 误判为更大的节点，故先在 offset 层双端向内收缩。
 * @param code 完整文件内容
 * @param selection 原始选区 offset
 * @returns 去除首尾空白后的 [start, end]；收缩后为空则返回 null
 */
function getEffectiveRange(code: string, selection: SelectionRange): { start: number; end: number } | null {
  let start = selection.startOffset
  let end = selection.endOffset
  while (start < end && /\s/u.test(code[start])) start++
  while (end > start && /\s/u.test(code[end - 1])) end--
  if (start >= end) return null
  return { start, end }
}

/**
 * 递归解包类型断言 / 括号 / 链式等包裹节点，下钻到内层实表达式。
 * 直接复用 ast 的 unwrapTypeAssertion，保证解包类型集合与 AST 模块一致。
 * @param node 命中节点
 * @returns 解包后的实际表达式节点
 */
function unwrapDown(node: ASTNode): ASTNode {
  return unwrapTypeAssertion(node)
}

/**
 * 选区 offset → 目标节点解析。
 *
 * 依优先级：
 *  1. 区间完全包含：取「完整包含有效选区、且自身区间最小」的节点；
 *  2. 成员路径整体优先：若选区文本含 `.` 且与某 MemberExpression 源文本逐字相等，命中该成员整体
 *     （避免选 `token` 误命中 `this.tokenValue`）；
 *  3. 解包下钻：命中节点若为包裹类型，递归解包到内层实表达式。
 *
 * @param ast parseCode 返回的 AST 根节点（offset 与传入 code 对齐）
 * @param code 与 ast 对应的完整代码文本
 * @param selection 选区 offset 区间
 * @returns 解析出的 target 节点；无法解析（空选区 / 无命中）时返回 null
 */
export function resolveTargetNode(ast: ASTNode, code: string, selection: SelectionRange): ASTNode | null {
  const range = getEffectiveRange(code, selection)
  if (!range) return null
  const { start, end } = range
  const selText = code.slice(start, end)

  // 规则 2：成员路径整体优先（选区文本含 '.'，且与某包含选区的 MemberExpression 源文本逐字相等）
  // 只匹配「完整包含有效选区」的成员，不因同名路径误命中别处
  if (selText.includes('.')) {
    let memberHit: ASTNode | null = null
    walkAST(ast, (node) => {
      if (node.start > start || node.end < end) return true // 不含选区 → 剪掉该子树
      if (!memberHit && node.type === 'MemberExpression' && code.slice(node.start, node.end) === selText) memberHit = node
    })
    if (memberHit) return unwrapDown(memberHit)
  }

  // 规则 1：完整包含有效选区的节点中取自身区间最小者（不包含选区的子树整体剪枝）
  // 含选区的节点必互相嵌套，同宽时取更深者（如 foo() 的 Program/ExpressionStatement/CallExpression 同界 → 取 CallExpression）
  let best: ASTNode | null = null
  walkAST(ast, (node) => {
    if (node.start > start || node.end < end) return true // 不含选区 → 剪掉该子树
    if (!best || node.end - node.start <= best.end - best.start) best = node
  })
  if (!best) return null

  // 规则 3：解包下钻
  return unwrapDown(best)
}

/**
 * 从 target 沿祖先链上爬，找到锚语句 stmt 与其所属容器 container。
 *
 * 用（记忆化的）parentMap 从 target 向上，直到某父节点是语句容器（其某字段为语句数组）
 * 且当前节点是该数组的直接元素为止。若先遇到成员容器（ClassBody），返回
 * containerKind='CLASS_BODY'（表示不可插入）。
 *
 * 无花括号的单语句体（if(x) stmt / for(...) stmt）的 consequent/body 不是语句数组，
 * climb 会继续上爬到更外层容器，补块交由 computeInsertionAnchor 的 normalize 处理。
 *
 * @param target 目标节点
 * @param ast 与 target 同源的 AST 根节点
 * @returns 锚定结果；未找到任何容器（理论上不应发生）时返回 null
 */
export function climbToAnchor(target: ASTNode, ast: ASTNode): AnchorResult | null {
  const parentMap = buildParentMap(ast)
  let node: ASTNode = target
  let parent = parentMap.get(node)
  while (parent) {
    const stmtField = STATEMENT_CONTAINERS[parent.type]
    if (stmtField && Array.isArray(parent[stmtField]) && (parent[stmtField] as ASTNode[]).includes(node)) {
      return { target, stmt: node, container: parent, containerKind: 'STATEMENT' }
    }
    const memField = MEMBER_CONTAINERS[parent.type]
    if (memField && Array.isArray(parent[memField]) && (parent[memField] as ASTNode[]).includes(node)) {
      return { target, stmt: node, container: parent, containerKind: 'CLASS_BODY' }
    }
    node = parent
    parent = parentMap.get(node)
  }
  return null
}

/* ───── 角色判定与 placement 决策表 ───── */

/** target 在 stmt 语句中承担的角色 */
export type TargetRole = 'PRODUCE' | 'USE' | 'PARAM' | 'LOOP_HEAD' | 'TYPE_LAYER'

/** 插入位分类（不含 SKIP 第三态） */
export type Placement = 'AFTER_STMT' | 'BEFORE_STMT' | 'BLOCK_HEAD'

/** 类似函数的节点类型（参数属于其 params） */
const FN_LIKE = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])

/** 编译期类型层节点：无运行时值，不可打印 */
const TYPE_LAYER_TYPES = new Set([
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSPropertySignature',
  'TSMethodSignature',
  'TSEnumMember',
  'TSIndexSignature',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
])

/** 遍历节点字段时跳过的元信息键 */
const META_KEYS = new Set(['type', 'start', 'end', 'loc'])

/**
 * 找出 child 在 parent 中所处的字段名（直接引用或数组成员）。
 * @returns 字段名；未找到时 null
 */
function fieldOf(parent: ASTNode, child: ASTNode): string | null {
  for (const key in parent) {
    if (META_KEYS.has(key)) continue
    const v = (parent as Record<string, unknown>)[key]
    if (v === child) return key
    if (Array.isArray(v) && v.includes(child)) return key
  }
  return null
}

/**
 * 判定 target 在其 stmt 语句中承担的角色。
 *
 * 优先级：TYPE_LAYER > PARAM > LOOP_HEAD > (stmt 上下文) PRODUCE / USE。
 * PARAM / TYPE_LAYER 沿 target→stmt 路径整体扫描（可捕获嵌套函数参数，
 * 如 `const f = (a) => ...` 的 a）；LOOP_HEAD / PRODUCE / USE 由 target 相对 stmt
 * 的直接字段判定（for-init 时 stmt 即 ForStatement）。
 *
 * @param target 目标节点
 * @param ast 与 target 同源的 AST 根节点
 * @returns 角色；无法归类时默认 USE（游离读取）
 */
export function determineRole(target: ASTNode, ast: ASTNode): TargetRole {
  const pm = buildParentMap(ast)
  const anchor = climbToAnchor(target, ast)
  const stmt = anchor?.stmt

  // 沿 target → stmt 收集路径（每步记录 node 在 parent 中的字段）
  const path: { node: ASTNode; parent: ASTNode; field: string | null }[] = []
  let node: ASTNode = target
  while (node !== stmt) {
    const parent = pm.get(node)
    if (!parent) break
    path.push({ node, parent, field: fieldOf(parent, node) })
    if (parent === stmt) break
    node = parent
  }

  // 1. TYPE_LAYER：target 自身或路径上任一父节点为类型层构造
  if (TYPE_LAYER_TYPES.has(target.type)) return 'TYPE_LAYER'
  for (const e of path) if (TYPE_LAYER_TYPES.has(e.parent.type)) return 'TYPE_LAYER'

  // 2. PARAM：路径上存在「某函数的 params」边
  for (const e of path) if (FN_LIKE.has(e.parent.type) && e.field === 'params') return 'PARAM'

  // 3/4：由 target 相对 stmt 的直接字段判定（outer = stmt 的直接子节点）
  const outer = path.length ? path[path.length - 1] : null
  if (stmt && outer) {
    const f = outer.field
    if (stmt.type === 'ForStatement' && f === 'init') return 'LOOP_HEAD'
    if ((stmt.type === 'ForInStatement' || stmt.type === 'ForOfStatement') && f === 'left') return 'LOOP_HEAD'
    if (stmt.type === 'ReturnStatement' && f === 'argument') return 'USE'
    if (stmt.type === 'ThrowStatement' && f === 'argument') return 'USE'
    if ((stmt.type === 'IfStatement' || stmt.type === 'WhileStatement' || stmt.type === 'DoWhileStatement') && f === 'test') return 'USE'
    if (stmt.type === 'SwitchStatement' && f === 'discriminant') return 'USE'
    if (stmt.type === 'ForStatement' && (f === 'test' || f === 'update')) return 'USE'
    if ((stmt.type === 'ForInStatement' || stmt.type === 'ForOfStatement') && f === 'right') return 'USE'
  }

  // 5. PRODUCE / USE：声明与赋值为产生位；其余游离读取为使用位
  if (stmt) {
    if (stmt.type === 'VariableDeclaration') return 'PRODUCE'
    if (stmt.type === 'ExpressionStatement') {
      const expr = stmt.expression as ASTNode | undefined
      if (expr && expr.type === 'AssignmentExpression') return 'PRODUCE'
      return 'USE'
    }
  }
  return 'USE'
}

/**
 * 由 (target, container) 决定 placement。
 *
 * 决策表（优先级自上而下）：
 *  - TYPE_LAYER → SKIP（编译期声明，无运行时值）
 *  - PARAM / LOOP_HEAD → BLOCK_HEAD（插到函数体 / 循环体首行；优先于 CLASS_BODY，
 *    因为构造器参数虽处 ClassBody 下但落点是构造器体，应正常插入）
 *  - CLASS_BODY 容器（类字段）→ SKIP（类体直属层不能放语句）
 *  - PRODUCE → AFTER_STMT；USE → BEFORE_STMT
 *
 * @param target 目标节点
 * @param ast 与 target 同源的 AST 根节点
 * @returns placement 分类；不可插入时返回 'SKIP'
 */
export function decidePlacement(target: ASTNode, ast: ASTNode): Placement | 'SKIP' {
  const role = determineRole(target, ast)
  if (role === 'TYPE_LAYER') return 'SKIP'
  if (role === 'PARAM' || role === 'LOOP_HEAD') return 'BLOCK_HEAD'
  const anchor = climbToAnchor(target, ast)
  if (anchor?.containerKind === 'CLASS_BODY') return 'SKIP'
  if (role === 'PRODUCE') return 'AFTER_STMT'
  return 'BEFORE_STMT'
}

/* ───── offset → 插入点归一化 ───── */

/**
 * AFTER_STMT 归一化：从 stmt 语句末尾跨到行尾换行符之后。
 *
 * `stmt.end` 可能落在行中（`const a=1; const b=2` 选 `a`）或行尾注释之前
 * （`const x = 1 // 注释`）。插入点需从 stmt.end 向后扫到当前行的行尾换行符之后，
 * 以保证插到整行之后而非分号中间。
 *
 * @param code 完整代码
 * @param stmtEnd stmt 语句的 end offset
 * @returns 行尾换行符之后的 offset；若已到文本末尾则为 code.length
 */
export function normalizeAfterStmtOffset(code: string, stmtEnd: number): number {
  const nl = code.indexOf('\n', stmtEnd)
  return nl === -1 ? code.length : nl + 1
}

/**
 * BEFORE_STMT / BLOCK_HEAD 行首归一化：取 stmt 行/块首行的行首 offset。
 *
 * 插入点对齐到 stmt 行行首（缩进由后续 indentRef 给定，本函数不处理缩进）。
 *
 * @param code 完整代码
 * @param anchorStart stmt 行上任意 offset（通常为 stmt.start / 块首行内首条语句 start）
 * @returns 该行行首 offset（上一个换行符之后，或 0）
 */
export function normalizeLineStartOffset(code: string, anchorStart: number): number {
  const nl = code.lastIndexOf('\n', anchorStart - 1)
  return nl === -1 ? 0 : nl + 1
}

/* ───── BLOCK_HEAD 共用助手 ───── */

/**
 * 从 target 沿父链上爬，找到最近的「类函数」祖先（其体即 BLOCK_HEAD 的目标块）。
 * @param target 目标节点
 * @param ast 与 target 同源的 AST 根节点
 * @returns 最近的 FunctionDeclaration/FunctionExpression/ArrowFunctionExpression；无则 null
 */
function enclosingFunction(target: ASTNode, ast: ASTNode): ASTNode | null {
  const pm = buildParentMap(ast)
  let node = pm.get(target)
  while (node) {
    if (FN_LIKE.has(node.type)) return node
    node = pm.get(node)
  }
  return null
}

/* ───── 结构化 offset 锚点输出（供 handler 机械对齐，根绝缩进漂移） ───── */

/**
 * 补块归一化描述。为**结构化描述而非原始文本编辑**：
 * 只标记「哪个体节点要被包进块」与包法，具体的换行 / 缩进渲染由 handler
 * 用 editor 配置（tabSize/insertSpaces）完成（缩进属 handler 职责）。
 */
export interface BlockEdit {
  /** wrap-expr-return：箭头表达式体补为 `{ return EXPR }`；wrap-stmt：无块单语句补为 `{ STMT }` */
  kind: 'wrap-expr-return' | 'wrap-stmt'
  /** 需被包进块的原始体节点起始 offset（原始 code 坐标） */
  bodyStart: number
  /** 需被包进块的原始体节点结束 offset（原始 code 坐标） */
  bodyEnd: number
}

/**
 * 结构化插入锚点。所有 offset 均以**原始 code 坐标**表达，
 * 供 handler 在同一批编辑中机械定位；缩进由 indentRef 指向的现成行决定，不再启发式猜测。
 */
export interface InsertionAnchor {
  /** 插入位分类；SKIP = 不可插入（类型层 / 类字段） */
  placement: Placement | 'SKIP'
  /** 精确插入 offset（原始 code 坐标）；SKIP 或 needsNormalize 时为 -1 */
  offset: number
  /** 缩进对齐锚点：指向一个现成行上的 offset，handler 复制该行缩进前缀；SKIP/needsNormalize 时为 -1 */
  indentRef: number
  /** BLOCK_HEAD 且块内无现成语句行（空块 / normalize 新建块）时置 true：缩进 = 块头行缩进 + 一个缩进单位 */
  indentOneLevelDeeper?: boolean
  /** 落点为无花括号体 / 单行块等需先补块重解析的形态；true 时 offset/indentRef=-1，handler 据 normalize 渲染 */
  needsNormalize?: boolean
  /** needsNormalize 且可自动补块时携带的归一化描述；缺失则 handler 回退（无法安全补块） */
  normalize?: BlockEdit
}

/**
 * ensureBlock：当 BLOCK_HEAD 落点的目标体**不是 BlockStatement**时，
 * 产出一个结构化补块描述（而非直接改文本）。无法安全补块时返回 null（handler 回退）。
 *  - 箭头表达式体 `(x) => EXPR` → wrap-expr-return（括号包围的对象字面量体 `() => ({..})` 不处理，避免产出嵌套括号坏代码）；
 *  - 无花括号循环/条件单语句体 `for(..) STMT` → wrap-stmt。
 */
function ensureBlock(body: ASTNode): BlockEdit | null {
  if (body.type === 'BlockStatement') return null
  // 对象字面量体必带括号（`() => ({a})`），包入块会产生嵌套括号坏代码→不处理
  if (body.type === 'ObjectExpression') return null
  // 语句类体（ExpressionStatement / 其它 Statement）→ wrap-stmt；否则视为表达式体 → wrap-expr-return
  const isStatement = body.type.endsWith('Statement') || body.type === 'VariableDeclaration'
  return { kind: isStatement ? 'wrap-stmt' : 'wrap-expr-return', bodyStart: body.start, bodyEnd: body.end }
}

/**
 * 结构化锚点入口：把选区解析为**基于 offset 的结构化锚点**。
 *
 * offset / indentRef 语义：
 *  - AFTER_STMT：offset 跨到 stmt 行尾换行之后（normalizeAfterStmtOffset）；indentRef 指 stmt 行（同级缩进）；
 *  - BEFORE_STMT：offset 取 stmt 行首（normalizeLineStartOffset）；indentRef 指 stmt 行；
 *  - BLOCK_HEAD（非空块）：offset 取首条内层语句行首；indentRef 指该内层行（现成正确缩进）；
 *  - BLOCK_HEAD（空块 / 无花括号体）：needsNormalize=true，offset/indentRef=-1；
 *  - SKIP：类型层 / 类字段，offset/indentRef=-1。
 *
 * @param ast parseCode 返回的 AST 根节点（offset 与 code 对齐）
 * @param code 与 ast 对应的完整代码
 * @param selection 选区 offset 区间
 * @returns 结构化锚点；无法解析出 target（空选区等）时返回 null
 */
export function computeInsertionAnchor(ast: ASTNode, code: string, selection: SelectionRange): InsertionAnchor | null {
  const target = resolveTargetNode(ast, code, selection)
  if (!target) return null

  const placement = decidePlacement(target, ast)
  if (placement === 'SKIP') return { placement: 'SKIP', offset: -1, indentRef: -1 }

  const anchor = climbToAnchor(target, ast)
  if (!anchor) return null
  const stmt = anchor.stmt

  if (placement === 'AFTER_STMT') {
    return { placement, offset: normalizeAfterStmtOffset(code, stmt.end), indentRef: stmt.start }
  }
  if (placement === 'BEFORE_STMT') {
    return { placement, offset: normalizeLineStartOffset(code, stmt.start), indentRef: stmt.start }
  }

  // BLOCK_HEAD：LOOP_HEAD 落循环体，PARAM 落所在函数体
  const role = determineRole(target, ast)
  const body = (role === 'LOOP_HEAD' ? (stmt.body as ASTNode | undefined) : (enclosingFunction(target, ast)?.body as ASTNode | undefined)) ?? undefined
  if (!body) return { placement, offset: -1, indentRef: -1, needsNormalize: true }
  if (body.type !== 'BlockStatement') {
    // 无花括号体（箭头表达式体 / 无块单语句）→ ensureBlock 产出归一化描述，交 handler 渲染
    const norm = ensureBlock(body)
    return { placement, offset: -1, indentRef: -1, needsNormalize: true, ...(norm ? { normalize: norm } : {}) }
  }
  const inner = (body.body as ASTNode[])[0]
  if (!inner) {
    // 空块 {}：无现成内层行，插入点落在 `{` 之后，缩进由 handler 按块头行 + 一个单位得出
    return { placement, offset: body.start + 1, indentRef: body.start, indentOneLevelDeeper: true }
  }
  if (offsetToLine(code, inner.start) === offsetToLine(code, body.start)) {
    // 单行块（`{ return x }`）：首条内层语句与 `{` 同行，行首 offset 会落到块外→需重排为多行，交由 handler 渲染
    return { placement, offset: -1, indentRef: -1, needsNormalize: true }
  }
  return { placement, offset: normalizeLineStartOffset(code, inner.start), indentRef: inner.start, indentOneLevelDeeper: false }
}

/* ───── 多选批量插入规划（防漂移：原始坐标原子编辑 + 重叠自检） ───── */

/**
 * 单条已规划插入（所有 offset 均为**原始 code 坐标**）。handler 据此渲染文本、
 * 按 offset 降序在同一批 WorkspaceEdit 中原子应用。
 */
export interface PlannedInsertion {
  /** 原选区下标：handler 据此取 selectedText 渲染模板，并在同 offset 时保持稳定顺序 */
  selectionIndex: number
  /** 插入位分类（不含 SKIP：SKIP 选区不进 insertions） */
  placement: Placement
  /** 插入 offset（原始坐标）。普通落点=行首/行尾锚点；normalize 时为块体 bodyStart（补块内落点由 handler 渲染） */
  offset: number
  /** 缩进锚点 offset；indentOneLevelDeeper=true 时为 -1（缩进 = 块头行缩进 + 一个单位） */
  indentRef: number
  /** 块内无现成语句行（空块 / normalize 新建块）→ 缩进 = 块头行缩进 + 一个 editor 缩进单位 */
  indentOneLevelDeeper: boolean
  /** 补块归一化（原始坐标）。存在时 handler 需把 [bodyStart,bodyEnd] 包成块、把 log 放进块首 */
  normalize?: BlockEdit
}

/**
 * 批量规划结果。`insertions` 已去冲突并按 offset 降序；其余三组为分流的原选区下标。
 */
export interface InsertionPlan {
  /** 去冲突、按 offset 降序、同 offset 保原选区序的最终插入编辑 */
  insertions: PlannedInsertion[]
  /** 需回退（空选区 / 无法解析 / 无法安全补块）的原选区下标 */
  fallbacks: number[]
  /** 静默跳过（SKIP：类型层 / 类字段）的原选区下标 */
  skipped: number[]
  /** 因编辑区间重叠被丢弃的原选区下标 */
  dropped: number[]
}

/** 携带占用区间 [lo,hi] 的候选，用于重叠自检；lo===hi 表示零宽插入点 */
interface PlanCandidate {
  edit: PlannedInsertion
  lo: number
  hi: number
}

/**
 * 两候选的编辑区间是否冲突：
 *  - 两个零宽点（同 / 异 offset）永不冲突（同 offset 稳定顺序各插一行）；
 *  - 点 vs 区间：点**严格落在**区间开区间内 `(lo,hi)` → 结构扩张使兄弟锚点失效；端点相切属边界插入，放行；
 *  - 区间 vs 区间：半开重叠（含包含）`a.lo < b.hi && b.lo < a.hi`（如嵌套箭头双补块）。
 */
function candidatesConflict(a: PlanCandidate, b: PlanCandidate): boolean {
  const aWidth = a.hi > a.lo
  const bWidth = b.hi > b.lo
  if (!aWidth && !bWidth) return false
  if (!aWidth) return a.lo > b.lo && a.lo < b.hi
  if (!bWidth) return b.lo > a.lo && b.lo < a.hi
  return a.lo < b.hi && b.lo < a.hi
}

/**
 * 把一批选区规划为**互不重叠**的原始坐标插入编辑。
 *
 * 逐选区经 `computeInsertionAnchor` 解析后分流：
 *  - null（空选区 / 无法解析）→ fallbacks（handler 回退）；
 *  - SKIP（类型层 / 类字段）→ skipped（静默丢弃）；
 *  - needsNormalize 但无安全补块描述（单行块 / 对象字面量体）→ fallbacks；
 *  - needsNormalize 且有 normalize → 候选占用整个体区间 `[bodyStart,bodyEnd]`，log 落补块块首；
 *  - 普通落点 → 候选为零宽插入点 `[offset,offset]`。
 *
 * 随后按原选区顺序做**重叠自检**（稳定保序，冲突丢后者 → dropped），
 * 最后按 offset 降序排序；同 offset 借稳定排序保留原选区顺序。
 *
 * 纯函数、无副作用、不读 editor 配置（换行 / 缩进渲染属 handler），可独立单测。
 *
 * @param ast parseCode 返回的 AST 根节点（offset 与 code 对齐）
 * @param code 与 ast 对应的完整代码
 * @param selections 各选区 offset 区间（原选区顺序）
 * @returns 批量规划结果
 */
export function planInsertions(ast: ASTNode, code: string, selections: SelectionRange[]): InsertionPlan {
  const skipped: number[] = []
  const fallbacks: number[] = []
  const dropped: number[] = []
  const candidates: PlanCandidate[] = []

  selections.forEach((selection, selectionIndex) => {
    const anchor = computeInsertionAnchor(ast, code, selection)
    if (!anchor) {
      fallbacks.push(selectionIndex)
      return
    }
    if (anchor.placement === 'SKIP') {
      skipped.push(selectionIndex)
      return
    }
    if (anchor.needsNormalize) {
      if (!anchor.normalize) {
        // 无法安全补块（单行块 / 对象字面量体等）→ 回退
        fallbacks.push(selectionIndex)
        return
      }
      // 补块：占用整个体区间 [bodyStart,bodyEnd]，log 落补块块首（缩进较块头深一级）
      candidates.push({
        edit: {
          selectionIndex,
          placement: anchor.placement,
          offset: anchor.normalize.bodyStart,
          indentRef: -1,
          indentOneLevelDeeper: true,
          normalize: anchor.normalize,
        },
        lo: anchor.normalize.bodyStart,
        hi: anchor.normalize.bodyEnd,
      })
      return
    }
    // 普通落点：零宽插入，占用点 [offset,offset]
    candidates.push({
      edit: {
        selectionIndex,
        placement: anchor.placement,
        offset: anchor.offset,
        indentRef: anchor.indentRef,
        indentOneLevelDeeper: !!anchor.indentOneLevelDeeper,
      },
      lo: anchor.offset,
      hi: anchor.offset,
    })
  })

  // 重叠自检：按原选区顺序稳定处理，与已接受候选冲突者丢弃（保留先者）
  const accepted: PlanCandidate[] = []
  for (const cand of candidates) {
    if (accepted.some((a) => candidatesConflict(a, cand))) {
      dropped.push(cand.edit.selectionIndex)
    } else {
      accepted.push(cand)
    }
  }

  // offset 降序；Array.sort 稳定，equal offset 保留原选区顺序
  const insertions = accepted.map((c) => c.edit).sort((a, b) => b.offset - a.offset)
  return { insertions, fallbacks, skipped, dropped }
}
