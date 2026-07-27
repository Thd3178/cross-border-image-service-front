import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  imageApi,
  type ItemStatus,
  type Task,
  type TaskItem,
  type TaskStatus,
  type ProcessingMode,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { RiArrowGoBackLine, RiRefreshLine } from "@remixicon/react"

// ─── Status display config ───

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "等待中",
    className:
      "bg-muted text-muted-foreground",
  },
  SEARCHING: {
    label: "搜索中",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  SEARCH_COMPLETED: {
    label: "搜索完成",
    className:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  USER_SELECTING: {
    label: "选择商品",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  PROCESSING: {
    label: "处理中",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  PARTIAL_COMPLETED: {
    label: "部分完成",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  COMPLETED: {
    label: "已完成",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  FAILED: {
    label: "失败",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

// ─── Helpers ───

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    // new Date("invalid") 不抛错而是返回 Invalid Date, catch 永不触发,
    // 必须显式用 isNaN 检查避免渲染 NaN/NaN/NaN (审查 L2).
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

const ALLOW_ITEMS_STATUSES: ReadonlySet<TaskStatus> = new Set([
  "SEARCH_COMPLETED",
  "USER_SELECTING",
  "PROCESSING",
  "PARTIAL_COMPLETED",
  "COMPLETED",
  "FAILED",
])

// ─── Item status display ───

const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  PENDING: "待处理",
  SELECTED: "已选择",
  SEGMENTING: "分割中",
  SEGMENTED: "已分割",
  ANALYZING: "质检中",
  ANALYZED: "已质检",
  INPAINTING: "修复中",
  INPAINTED: "已修复",
  COMPOSITING: "合成中",
  QWEN_EDITING: "Qwen编辑中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELLED: "已取消",
}

const ITEM_STATUS_STYLE: Record<ItemStatus, string> = {
  PENDING: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  SELECTED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  SEGMENTING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  SEGMENTED: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  ANALYZING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  ANALYZED: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  INPAINTING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  INPAINTED: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  COMPOSITING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  QWEN_EDITING: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
  CANCELLED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

// ─── Status stamp palette (右上角印章样式) ───
// 每个状态对应的印章颜色：边框 / 文字 / 背景（透明带轻微淡色, 类似真章盖在纸上）
// 全部配色走 style 内联; className 字段为历史死代码已移除 (审查 L6).
type StampPalette = {
  borderColor: string
  textColor: string
  bgColor: string
}

const ITEM_STAMP_STYLE: Record<ItemStatus, StampPalette> = {
  PENDING: {
    borderColor: "#94a3b8",
    textColor: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.08)",
  },
  SELECTED: {
    borderColor: "#3b82f6",
    textColor: "#1d4ed8",
    bgColor: "rgba(59, 130, 246, 0.10)",
  },
  SEGMENTING: {
    borderColor: "#a855f7",
    textColor: "#7e22ce",
    bgColor: "rgba(168, 85, 247, 0.12)",
  },
  SEGMENTED: {
    borderColor: "#06b6d4",
    textColor: "#0e7490",
    bgColor: "rgba(6, 182, 212, 0.10)",
  },
  ANALYZING: {
    borderColor: "#a855f7",
    textColor: "#7e22ce",
    bgColor: "rgba(168, 85, 247, 0.12)",
  },
  ANALYZED: {
    borderColor: "#14b8a6",
    textColor: "#0f766e",
    bgColor: "rgba(20, 184, 166, 0.10)",
  },
  INPAINTING: {
    borderColor: "#a855f7",
    textColor: "#7e22ce",
    bgColor: "rgba(168, 85, 247, 0.12)",
  },
  INPAINTED: {
    borderColor: "#14b8a6",
    textColor: "#0f766e",
    bgColor: "rgba(20, 184, 166, 0.10)",
  },
  COMPOSITING: {
    borderColor: "#a855f7",
    textColor: "#7e22ce",
    bgColor: "rgba(168, 85, 247, 0.12)",
  },
  QWEN_EDITING: {
    borderColor: "#6366f1",
    textColor: "#4338ca",
    bgColor: "rgba(99, 102, 241, 0.12)",
  },
  COMPLETED: {
    // COMPLETED 用更醒目的红色印章（传统公章朱红）
    borderColor: "#dc2626",
    textColor: "#b91c1c",
    bgColor: "rgba(220, 38, 38, 0.10)",
  },
  FAILED: {
    borderColor: "#7f1d1d",
    textColor: "#7f1d1d",
    bgColor: "rgba(127, 29, 29, 0.10)",
  },
  CANCELLED: {
    borderColor: "#475569",
    textColor: "#475569",
    bgColor: "rgba(71, 85, 105, 0.10)",
  },
}

// ─── Pipeline step config (流水线步骤图) ───
// PIPELINE 流程：PENDING → 分割 → 质检 → 修复 → 合成 → COMPLETED
// QWEN_TAKEOVER 流程：PENDING → Qwen 编辑 → COMPLETED
type PipelineStep = {
  key: number
  label: string
  /** 触发该步的 item.status 集合（处于这步的 item 算"进行中"） */
  liveStatuses: ItemStatus[]
  /** 该步已完成（流转到下一步）的 item.status 集合 */
  doneStatuses: ItemStatus[]
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    key: 0,
    label: "待处理",
    liveStatuses: ["PENDING", "SELECTED"],
    doneStatuses: [],
  },
  {
    key: 1,
    label: "分割背景",
    liveStatuses: ["SEGMENTING"],
    doneStatuses: ["SEGMENTED"],
  },
  {
    key: 2,
    label: "豆包质检",
    liveStatuses: ["ANALYZING"],
    doneStatuses: ["ANALYZED", "INPAINTING", "INPAINTED"],
  },
  {
    key: 3,
    label: "修复",
    liveStatuses: ["INPAINTING"],
    doneStatuses: ["INPAINTED"],
  },
  {
    key: 4,
    label: "合成主图",
    liveStatuses: ["COMPOSITING"],
    doneStatuses: [],
  },
  {
    key: 5,
    label: "部分完成",
    liveStatuses: [],
    doneStatuses: [],
    // PARTIAL_COMPLETED 状态由 task.status 决定，不在 item.status 里；
    // PipelineDiagram 里通过 task.status===PARTIAL_COMPLETED 触发该 node 高亮，不靠 item 累计
  },
  {
    key: 6,
    label: "已完成",
    liveStatuses: [],
    doneStatuses: ["COMPLETED"],
  },
]

const QWEN_STEPS: PipelineStep[] = [
  {
    key: 0,
    label: "待处理",
    liveStatuses: ["PENDING", "SELECTED"],
    doneStatuses: [],
  },
  {
    key: 1,
    label: "Qwen 编辑",
    liveStatuses: ["QWEN_EDITING"],
    doneStatuses: [],
  },
  {
    key: 2,
    label: "部分完成",
    liveStatuses: [],
    doneStatuses: [],
  },
  {
    key: 3,
    label: "已完成",
    liveStatuses: [],
    doneStatuses: ["COMPLETED"],
  },
]

/** 给定一组 item，返回每个 pipeline step 的统计 (inProgressCount / doneCount) */
function computeStepStats(
  items: TaskItem[],
  steps: PipelineStep[],
): Array<{ step: PipelineStep; inProgress: number; done: number }> {
  return steps.map((step) => {
    let inProgress = 0
    let done = 0
    for (const it of items) {
      if (step.liveStatuses.includes(it.status)) inProgress++
      if (step.doneStatuses.includes(it.status)) done++
    }
    return { step, inProgress, done }
  })
}

/** 决定当前"激活"的 step index：第一个仍有 inProgress 的 step；若全无 inProgress，最后非零 done 数的 step */
function pickActiveStep(
  stats: Array<{ step: PipelineStep; inProgress: number; done: number }>,
): number {
  const liveIdx = stats.findIndex((s) => s.inProgress > 0)
  if (liveIdx >= 0) return liveIdx
  // 全部 inProgress=0 → 取最后一个 done 累计 > 0 或者第一步
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i].done > 0) return i
  }
  return 0
}

// ─── Image fallback ───

const FALLBACK_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23e2e8f0"><rect width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="14">无图片</text></svg>'
  )

function imgErrorHandler(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (img.src !== FALLBACK_IMG) {
    img.src = FALLBACK_IMG
  }
}

// ─── Props ───

interface StatusBadgeProps {
  status: TaskStatus
}

function TaskStatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

// ─── Loading skeleton ───

function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <Skeleton className="size-[100px] rounded-xl" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col gap-2 p-0">
              <Skeleton className="aspect-square w-full rounded-t-3xl" />
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Product Card ───

interface ProductCardProps {
  item: TaskItem
  selected: boolean
  selectingMode: boolean
  viewDetailMode: boolean
  onToggle: (itemId: number) => void
  onViewDetail: (itemId: number) => void
}

// ─── Pipeline diagram component (流水线步骤图) ───
interface PipelineDiagramProps {
  items: TaskItem[]
  task: Task | null
}

// ─── 单个 step 气泡 (PIPELINE / QWEN 分支共用) ───
interface StepBubbleProps {
  ordinal: number
  label: string
  inProgress: number
  done: number
  active: boolean
  completed: boolean
  accent?: "indigo" | "emerald" | "amber"
}

function StepBubble({ ordinal, label, inProgress, done, active, completed, accent = "indigo" }: StepBubbleProps) {
  const activeBorder = accent === "indigo" ? "border-indigo-500 bg-indigo-500"
    : accent === "amber" ? "border-amber-500 bg-amber-500"
    : "border-emerald-500 bg-emerald-500"
  const activeText = accent === "indigo" ? "text-indigo-500"
    : accent === "amber" ? "text-amber-600"
    : "text-emerald-600"
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div
        className={
          "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors " +
          (completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : active
              ? `${activeBorder} text-white animate-pulse`
              : "border-muted-foreground/30 bg-background text-muted-foreground")
        }
      >
        {completed ? (
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          ordinal
        )}
      </div>
      <span
        className={
          "text-xs leading-tight " +
          (active
            ? `${activeText} font-medium`
            : completed
              ? "text-emerald-600 font-medium"
              : "text-muted-foreground")
        }
      >
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {inProgress > 0 && `进行 ${inProgress} · `}
        {done > 0 ? `完成 ${done}` : "—"}
      </span>
    </div>
  )
}

const PipelineDiagram = memo(function PipelineDiagram({ items, task }: PipelineDiagramProps) {
  // 派生值 memo 化: items 来自父组件 5s 轮询, 同一 items 引用直接复用前一次计算.
  if (items.length === 0) return null

  const qwenItems = useMemo(
    () => items.filter((it) => it.processingMode === "QWEN_TAKEOVER"),
    [items]
  )
  const pipelineItems = useMemo(
    () => items.filter((it) => it.processingMode !== "QWEN_TAKEOVER"),
    [items]
  )
  const hasQwen = qwenItems.length > 0
  const hasPipeline = pipelineItems.length > 0
  const isMixed = hasQwen && hasPipeline
  const mode = !hasQwen ? "PIPELINE" : !hasPipeline ? "QWEN" : "MIXED"

  const modeLabel = mode === "QWEN"
    ? "Qwen 视觉接管模式"
    : mode === "MIXED"
      ? "混合模式 (原流程 + Qwen 接管)"
      : "原流程模式"
  const stageLabel = task?.status === "PROCESSING"
    ? " · 处理中"
    : task?.status === "PARTIAL_COMPLETED"
      ? " · 部分完成"
      : task?.status === "COMPLETED"
        ? " · 已完成"
        : task?.status === "FAILED"
          ? " · 失败"
          : ""

  // ─── 纯 PIPELINE / 纯 QWEN：单路渲染 ───
  if (!isMixed) {
    const steps = mode === "QWEN" ? QWEN_STEPS : PIPELINE_STEPS
    const stats = useMemo(
      () => computeStepStats(items, steps),
      // steps 是模块常量或由 mode 确定的常量数组, items 变化触发重算
      [items, steps]
    )
    const activeIdx = useMemo(() => pickActiveStep(stats), [stats])

    const forceAllCompleted = task?.status === "COMPLETED"
    const forceAllPartial = task?.status === "PARTIAL_COMPLETED"

    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">处理流水线</h3>
          <span className="text-xs text-muted-foreground">
            {modeLabel}{stageLabel}
          </span>
        </div>
        <div className="flex items-center">
          {steps.map((step, idx) => {
            const s = stats[idx]
            const isLast = idx === steps.length - 1
            const overrideCompleted = forceAllCompleted && isLast
              ? true
              : forceAllPartial && step.label === "部分完成"
                ? true
                : false
            // L3: 用 <= activeIdx 让 idx === activeIdx 但 inProgress=0 的临界窗口也有 completed 视觉
            const allDone = s.done > 0 && s.inProgress === 0 && idx <= activeIdx
            const lastStepDoneAfterAll = isLast && s.done === items.length && items.length > 0
            const completed = overrideCompleted || allDone || lastStepDoneAfterAll
            const active = idx === activeIdx && s.inProgress > 0 && !overrideCompleted
            const accent: "indigo" | "amber" = forceAllPartial && step.label === "部分完成" ? "amber" : "indigo"

            return (
              <div
                key={step.key}
                className="flex flex-1 items-center"
                aria-label={`pipeline-step-${step.label}`}
              >
                <StepBubble
                  ordinal={idx + 1}
                  label={step.label}
                  inProgress={s.inProgress}
                  done={s.done}
                  active={active}
                  completed={completed}
                  accent={accent}
                />
                {!isLast && (
                  <div className="relative h-0.5 flex-1 mx-2 min-w-[20px]">
                    <div className="absolute inset-0 bg-muted-foreground/20" />
                    <div
                      className={
                        "absolute inset-y-0 left-0 transition-all " +
                        (idx < activeIdx ? "bg-emerald-500 w-full"
                          : activeIdx === idx && active ? "bg-indigo-500 w-1/2"
                          : forceAllCompleted ? "bg-emerald-500 w-full" : "w-0")
                      }
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── 混合模式：分支渲染 ───
  const pipelineBranchSteps = PIPELINE_STEPS.slice(1, 5)
  const qwenBranchSteps = QWEN_STEPS.slice(1, 2)

  const pipelineStats = useMemo(
    () => computeStepStats(pipelineItems, pipelineBranchSteps),
    [pipelineItems]
  )
  const qwenStats = useMemo(
    () => computeStepStats(qwenItems, qwenBranchSteps),
    [qwenItems]
  )
  const pipelineActiveIdx = useMemo(() => pickActiveStep(pipelineStats), [pipelineStats])
  const qwenActiveIdx = useMemo(() => pickActiveStep(qwenStats), [qwenStats])

  const pendingInProgress = useMemo(
    () => items.filter((it) => it.status === "PENDING" || it.status === "SELECTED").length,
    [items]
  )
  const pendingActive = pendingInProgress > 0 && task?.status === "PROCESSING"

  const totalCompleted = useMemo(
    () => items.filter((it) => it.status === "COMPLETED").length,
    [items]
  )
  const allDone = totalCompleted === items.length
  const partialNodeActive = task?.status === "PARTIAL_COMPLETED"
  const completedNodeCompleted = task?.status === "COMPLETED"
  const completedNodeActive = allDone && !completedNodeCompleted

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">处理流水线 (分支模式)</h3>
        <span className="text-xs text-muted-foreground">
          {modeLabel}{stageLabel}
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-stretch gap-0">
        <div className="flex flex-col items-center justify-center pr-3">
          <StepBubble
            ordinal={1}
            label="待处理"
            inProgress={pendingInProgress}
            done={0}
            active={pendingActive}
            completed={pendingInProgress === 0 && task?.status !== "PROCESSING"}
            accent="indigo"
          />
        </div>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center">
            {pipelineBranchSteps.map((step, idx) => {
              const s = pipelineStats[idx]
              const allDone = s.done > 0 && s.inProgress === 0 && idx <= pipelineActiveIdx
              const active = idx === pipelineActiveIdx && s.inProgress > 0
              const completed = allDone
              const isLast = idx === pipelineBranchSteps.length - 1
              return (
                <div
                  key={`pa-${step.key}`}
                  className="flex flex-1 items-center"
                  aria-label={`pipeline-branch-${step.label}`}
                >
                  <StepBubble
                    ordinal={idx + 2}
                    label={step.label}
                    inProgress={s.inProgress}
                    done={s.done}
                    active={active}
                    completed={completed}
                    accent="indigo"
                  />
                  {!isLast && (
                    <div className="relative h-0.5 flex-1 mx-2 min-w-[16px]">
                      <div className="absolute inset-0 bg-muted-foreground/20" />
                      <div
                        className={
                          "absolute inset-y-0 left-0 transition-all " +
                          (idx < pipelineActiveIdx ? "bg-emerald-500 w-full"
                            : pipelineActiveIdx === idx && active ? "bg-indigo-500 w-1/2" : "w-0")
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center">
            {qwenBranchSteps.map((step, idx) => {
              const s = qwenStats[idx]
              const allDone = s.done > 0 && s.inProgress === 0 && idx <= qwenActiveIdx
              const active = idx === qwenActiveIdx && s.inProgress > 0
              const completed = allDone
              return (
                <div
                  key={`qa-${step.key}`}
                  className="flex flex-1 items-center"
                  aria-label={`qwen-branch-${step.label}`}
                >
                  <StepBubble
                    ordinal={2}
                    label={step.label}
                    inProgress={s.inProgress}
                    done={s.done}
                    active={active}
                    completed={completed}
                    accent="indigo"
                  />
                </div>
              )
            })}
            <div className="flex-1" />
            <div className="flex-1" />
            <div className="flex-1" />
          </div>
        </div>
        <div className="flex items-center pl-3">
          <div className="flex items-center">
            <StepBubble
              ordinal={0}
              label="部分完成"
              inProgress={0}
              done={totalCompleted}
              active={partialNodeActive || completedNodeActive}
              completed={partialNodeActive || completedNodeCompleted}
              accent="amber"
            />
            <div className="relative h-0.5 w-6 mx-2">
              <div className="absolute inset-0 bg-muted-foreground/20" />
              <div
                className={
                  "absolute inset-y-0 left-0 transition-all " +
                  (partialNodeActive || completedNodeCompleted || completedNodeActive ? "bg-emerald-500 w-full" : "w-0")
                }
              />
            </div>
            <StepBubble
              ordinal={0}
              label="已完成"
              inProgress={0}
              done={totalCompleted}
              active={false}
              completed={completedNodeCompleted}
              accent="emerald"
            />
          </div>
        </div>
      </div>
    </div>
  )
})

function ProductCard({
  item,
  selected,
  selectingMode,
  viewDetailMode,
  onToggle,
  onViewDetail,
}: ProductCardProps) {
  // 已成功 / 失败 / 已取消的商品在 selectingMode 下不可再被勾选 — 后端语义要求
  // 已 COMPLETED 的 item 的状态不应被覆盖 (后端 ImageTaskService.selectItems 已
  // 做合约级兜底, 这里前端禁选避免用户误选后白白一次往返).
  // 同时 PARTIAL_COMPLETED 状态 selectingMode=true 但 COMPLETED item 要禁选.
  const itemSelectable =
    item.status !== "COMPLETED" &&
    item.status !== "FAILED" &&
    item.status !== "CANCELLED"

  return (
    <Card size="sm" className="relative">
      {/* Checkbox overlay — 仅在 selectingMode 且 item 可选时显示 */}
      {selectingMode && (
        <label
          className={cn(
            "absolute left-2 top-2 z-10 inline-flex items-center justify-center rounded-full bg-background/70 p-1 backdrop-blur-sm",
            itemSelectable
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50",
            selected && itemSelectable && "bg-primary/10"
          )}
          aria-label={`选择商品 ${item.productTitle ?? ""} (状态: ${item.status})`}
        >
          <Checkbox
            checked={selected}
            disabled={!itemSelectable}
            onCheckedChange={() => itemSelectable && onToggle(item.id)}
          />
        </label>
      )}

      {/* Stamp disabled in selecting mode; show rotated seal on image top-right otherwise (lines below) */}

      <CardContent className="flex flex-col gap-0 p-0">
        {/* Product image — COMPLETED 且有 finalImgUrl 则显示处理结果，否则原图；右上角盖状态印章 */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-3xl bg-muted">
          <img
            src={item.status === "COMPLETED" && item.finalImgUrl ? item.finalImgUrl : (item.productImgUrl || FALLBACK_IMG)}
            alt={item.productTitle ?? "商品图片"}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={imgErrorHandler}
          />

          {/* 状态印章：非选择模式下，对 PENDING 以外的所有状态显示在图片右上角，旋转 -12deg, 双边框, 文字粗体 */}
          {!selectingMode && (() => {
            const status = item.status
            if (status === "PENDING") return null
            const label = ITEM_STATUS_LABEL[status] ?? status
            const palette = ITEM_STAMP_STYLE[status] ?? ITEM_STAMP_STYLE.PENDING
            return (
              <div
                className={cn(
                  "pointer-events-none absolute right-3 top-3 z-10 select-none",
                  "rotate-[-12deg] origin-top-right",
                )}
                aria-hidden
              >
                <div
                  className="flex items-center justify-center rounded-md border-2 px-3 py-1.5 text-[13px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-[1px]"
                  style={{ borderColor: palette.borderColor, color: palette.textColor, backgroundColor: palette.bgColor }}
                >
                  {label}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2.5">
          <p className="line-clamp-2 text-sm leading-snug text-foreground">
            {item.productTitle || "未知商品"}
          </p>
          <p className="text-sm font-semibold text-amber-600">
            ¥{item.productPrice?.toFixed(2) ?? "0.00"}
          </p>

          {/* 处理方式标签 (新增)：视觉接管=indigo / 原流程=muted */}
          <Badge
            variant="outline"
            className={cn(
              "self-start",
              item.processingMode === "QWEN_TAKEOVER"
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {item.processingMode === "QWEN_TAKEOVER" ? "视觉接管" : "原流程"}
          </Badge>

          {/* View detail button */}
          {viewDetailMode && (
            <Button
              variant="outline"
              size="xs"
              className="mt-1 w-full"
              onClick={() => onViewDetail(item.id)}
            >
              查看详情
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page Component ───

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  const numericTaskId = Number(taskId)

  const [task, setTask] = useState<Task | null>(null)
  const [items, setItems] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  /** Qwen 视觉模型全权接管提交中，独立 loading state 防止与原流程按钮互锁 */
  const [qwenSubmitting, setQwenSubmitting] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data fetching ──

  const fetchTask = useCallback(async () => {
    if (!taskId || isNaN(numericTaskId)) {
      setError("无效的任务ID")
      setLoading(false)
      return
    }
    try {
      const res = await imageApi.taskDetail(numericTaskId)
      const data = res.data.data
      setTask(data)
      setError(null)

      // Items may be included directly in the task detail response
      if (data.items && data.items.length > 0) {
        setItems(data.items)
        setSelectedIds(
          new Set(
            data.items.filter((i) => i.userSelected).map((i) => i.id)
          )
        )
      }
      // If the status allows items but none came with the task, fetch separately
      else if (ALLOW_ITEMS_STATUSES.has(data.status)) {
        const itemsRes = await imageApi.taskItems(numericTaskId)
        const itemData = itemsRes.data.data
        setItems(itemData)
        setSelectedIds(
          new Set(itemData.filter((i) => i.userSelected).map((i) => i.id))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载任务失败")
    } finally {
      setLoading(false)
    }
  }, [taskId, numericTaskId])

  // ── Effects ──

  // Initial fetch
  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  // Poll every 5s when searching or processing (so pipeline diagram stays live)
  useEffect(() => {
    if (task?.status === "SEARCHING" || task?.status === "PROCESSING") {
      pollRef.current = setInterval(() => {
        fetchTask()
      }, 5000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [task?.status, fetchTask])

  // ── Derived state ──

  const selectingMode = task?.status === "SEARCH_COMPLETED" || task?.status === "USER_SELECTING" || task?.status === "PARTIAL_COMPLETED"
  const viewDetailMode =
    task?.status === "PROCESSING" || task?.status === "COMPLETED"
  const showItems =
    items.length > 0 && task && ALLOW_ITEMS_STATUSES.has(task.status)

  // 可被勾选的 item: 排除 COMPLETED / FAILED / CANCELLED (后端语义要求已成功 item
  // 不应被覆盖). selectableItems 也用来过滤全选按钮与"已选全部"判定.
  const selectableItems = items.filter(
    (i) => i.status !== "COMPLETED" && i.status !== "FAILED" && i.status !== "CANCELLED"
  )
  const allSelected = selectableItems.length > 0 && selectedIds.size === selectableItems.length

  // ── Actions ──

  const handleToggleItem = useCallback((itemId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const handleSelectItems = async () => {
    if (selectedIds.size === 0) {
      toast.warning("请至少选择一个商品")
      return
    }

    // 防御兜底: 即使前端禁选, 若 selectedIds 出于任何 stale 来源混入已 COMPLETED/
    // FAILED / CANCELLED 的 id, 提交前先剔掉, 不让到达后端.
    const safeIds = Array.from(selectedIds).filter(
      (id) => {
        const it = items.find((i) => i.id === id)
        return it
          && it.status !== "COMPLETED"
          && it.status !== "FAILED"
          && it.status !== "CANCELLED"
      }
    )
    if (safeIds.length === 0) {
      toast.warning("已完成的商品不可再次处理, 请选择未处理的商品")
      return
    }

    setSubmitting(true)
    try {
      await imageApi.selectItems(numericTaskId, safeIds)
      toast.success("已提交处理请求")
      await fetchTask()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 把当前选中的商品标记为 QWEN_TAKEOVER 模式后提交处理。
   * <ol>
   *   <li>批量 PATCH /api/image/item/{itemId}/mode 把选中项切到 QWEN_TAKEOVER</li>
   *   <li>调 selectItems 触发 processTask (后端按各 item 持久化的 processing_mode 分流)</li>
   * </ol>
   * 任何一项 PATCH 失败都终止本次提交, 不触发 selectItems, 避免半切换状态;
   * 局部失败给用户看到失败清单。
   */
  const handleQwenTakeover = async () => {
    if (selectedIds.size === 0) {
      toast.warning("请至少选择一个商品")
      return
    }

    setQwenSubmitting(true)
    try {
      // 防御兜底: 同 handleSelectItems, 提交前剔掉不可选 item 的 id.
      const ids = Array.from(selectedIds).filter(
        (id) => {
          const it = items.find((i) => i.id === id)
          return it
            && it.status !== "COMPLETED"
            && it.status !== "FAILED"
            && it.status !== "CANCELLED"
        }
      )
      if (ids.length === 0) {
        toast.warning("已完成的商品不可再次处理")
        return
      }
      const mode: ProcessingMode = "QWEN_TAKEOVER"

      // 1. 批量切换模式 — 用 Promise.allSettled 记录失败, 任一失败就终止提交流程
      const results = await Promise.allSettled(
        ids.map((id) => imageApi.updateItemMode(id, mode))
      )
      const failedIds = ids.filter((_, i) => results[i].status === "rejected")
      if (failedIds.length > 0) {
        toast.error(`有 ${failedIds.length} 个商品切换模式失败, 已终止提交`)
        return
      }

      // 2. 调 selectItems 触发处理 (后端 processTask 会按 item.processingMode 分流)
      await imageApi.selectItems(numericTaskId, ids)
      toast.success(`已提交 ${ids.length} 个商品给 Qwen 视觉模型全权接管`)
      // 立即在 UI 上更新 mode 显示, 不等下次 fetchTask
      setItems((prev) =>
        prev.map((it) =>
          ids.includes(it.id) ? { ...it, processingMode: "QWEN_TAKEOVER" } : it
        )
      )
      await fetchTask()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Qwen 接管提交失败")
    } finally {
      setQwenSubmitting(false)
    }
  }

  const handleToggleSelectAll = useCallback(() => {
    if (items.length === 0) return
    if (allSelected) {
      // 已全选 → 取消全部 (留空, 后端也不要 selectedIds 为空提交时被发)
      setSelectedIds(new Set())
    } else {
      // 未全选 → 选全部 "可选" 的 item (排除 COMPLETED / FAILED / CANCELLED)
      setSelectedIds(new Set(selectableItems.map((i) => i.id)))
    }
  }, [allSelected, items, selectableItems])

  const handleRetry = async () => {
    try {
      await imageApi.retryTask(numericTaskId)
      toast.success("已重新提交任务")
      await fetchTask()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重试失败")
    }
  }

  const handleViewDetail = useCallback(
    (itemId: number) => {
      navigate(`/items/${itemId}`)
    },
    [navigate]
  )

  // ── Render ──

  // Loading state
  if (loading && !task) {
    return <DetailSkeleton />
  }

  // Error state (no task loaded)
  if (error && !task) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={fetchTask}>
          <RiRefreshLine className="mr-1 size-4" />
          重试
        </Button>
      </div>
    )
  }

  // Guard: should not happen
  if (!task) {
    return null
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      {/* ─── Header ─── */}
      <div className="flex items-start gap-4">
        {/* Back */}
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          onClick={() => navigate(-1)}
          aria-label="返回上一页"
        >
          <RiArrowGoBackLine className="size-5" />
        </Button>

        {/* Source image */}
        <div className="size-[100px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={task.sourceImgUrl || FALLBACK_IMG}
            alt="源图片"
            className="h-full w-full object-cover"
            onError={imgErrorHandler}
          />
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="truncate text-lg font-medium">任务详情</h1>
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(task.createdAt)}
            </span>
          </div>
          {task.status === "FAILED" && task.errorMsg && (
            <p className="text-xs text-destructive">{task.errorMsg}</p>
          )}
        </div>
      </div>

      {/* ─── Action bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectingMode && (
            <span className="text-sm text-muted-foreground">
              已选 {selectedIds.size} 件商品
            </span>
          )}
          {showItems && !selectingMode && (
            <span className="text-sm text-muted-foreground">
              共 {items.length} 件商品
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectingMode && (
            <>
              <Button
                variant="outline"
                onClick={handleToggleSelectAll}
                disabled={submitting || qwenSubmitting}
              >
                {allSelected ? "取消全选" : "一键全选"}
              </Button>
              <Button
                onClick={handleSelectItems}
                disabled={submitting || qwenSubmitting || selectedIds.size === 0}
              >
                {submitting ? "提交中..." : "开始处理选中商品"}
              </Button>
              <Button
                onClick={handleQwenTakeover}
                disabled={submitting || qwenSubmitting || selectedIds.size === 0}
                className="border border-indigo-300 bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white dark:border-indigo-500"
              >
                {qwenSubmitting ? "提交中..." : "Qwen 视觉模型全权接管"}
              </Button>
            </>
          )}
          {(task.status === "FAILED" || task.status === "PARTIAL_COMPLETED") && (
            <Button variant="outline" onClick={handleRetry}>
              <RiRefreshLine className="mr-1 size-4" />
              重试
            </Button>
          )}
        </div>
      </div>

      {/* ─── Pipeline diagram (顶部流水线步骤图，PROCESSING / PARTIAL_COMPLETED / COMPLETED / FAILED 时显示) ─── */}
      {task && (task.status === "PROCESSING" || task.status === "PARTIAL_COMPLETED" || task.status === "COMPLETED" || task.status === "FAILED") && items.length > 0 && (
        <PipelineDiagram items={items} task={task} />
      )}

      {/* ─── Items grid ─── */}
      {showItems && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              selectingMode={selectingMode}
              viewDetailMode={viewDetailMode}
              onToggle={handleToggleItem}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* Empty items */}
      {task &&
        ALLOW_ITEMS_STATUSES.has(task.status) &&
        items.length === 0 &&
        !loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <p className="text-sm text-muted-foreground">暂无商品数据</p>
          </div>
        )}
    </div>
  )
}
