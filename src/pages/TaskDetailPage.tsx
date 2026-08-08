import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  imageApi,
  triggerDownload,
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
import { TaskItemProductFields } from "@/components/task-item-product-fields"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { RiArrowGoBackLine, RiRefreshLine, RiDownloadLine, RiLoader4Line } from "@remixicon/react"

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
      "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary",
  },
  SEARCH_COMPLETED: {
    label: "搜索完成",
    className:
      "bg-primary/20 text-primary dark:bg-primary/25 dark:text-primary",
  },
  PROCESSING: {
    label: "处理中",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
          {/* 印章逻辑:
              selectingMode (SEARCH_COMPLETED / PARTIAL_COMPLETED) 下整页停在选择模式,
              此时未终态 item 显示 checkbox 不显印章; 但已终态 (COMPLETED / FAILED / CANCELLED)
              item 不可选, 需保留印章让用户看到该 item 真实状态而非被 disabled checkbox 遮蔽.
              问题 1 根因: 原条件 !selectingMode 把终态 item 印章也Suppress掉了. */}
          {(!selectingMode
            || item.status === "COMPLETED"
            || item.status === "FAILED"
            || item.status === "CANCELLED") && (() => {
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

            {/* 处理方式标签：视觉接管=primary 蓝 / 原流程=muted */}
          <Badge
            variant="outline"
            className={cn(
              "self-start",
              item.processingMode === "QWEN_TAKEOVER"
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {item.processingMode === "QWEN_TAKEOVER" ? "视觉接管" : "原流程"}
          </Badge>

          <TaskItemProductFields item={item} compact />

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
  /** 一键下载结果包进行中, 独立 loading state 不与提交按钮互锁 */
  const [downloading, setDownloading] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 轮询时不要把用户本地勾的 selectedIds 擦掉.
  // 问题 11 根因: fetchTask 每次都用 server-side userSelected 重建 selectedIds,
  // 用户勾完未提交的 checkbox 在下个 5s 轮询被擦掉, 表现为"必须很快操作否则自动取消".
  // 策略: 只在初次 hydrate / 进入 selectingMode 时用 server 状态全量重建;
  // 在 selectingMode 期间后续轮询只把"server 标 userSelected=true 且本地未选"的合并进来,
  // 不擦用户本地未提交的选择; 离开 selectingMode 重置 flag 下次重新 hydrate.
  const selectedIdsHydratedRef = useRef(false)

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

      // 在 setSelectedIds 前算好 server-side 已确认勾选的 id 集合 — 问题 11
      let fetchedItems: TaskItem[] = []
      if (data.items && data.items.length > 0) {
        fetchedItems = data.items
      } else if (ALLOW_ITEMS_STATUSES.has(data.status)) {
        const itemsRes = await imageApi.taskItems(numericTaskId)
        fetchedItems = itemsRes.data.data
      }

      const nowSelecting =
        data.status === "SEARCH_COMPLETED" || data.status === "PARTIAL_COMPLETED"

      // 问题 11: 修复轮询擦掉用户未提交勾选的"自动取消"现象.
      //   - 离开 selectingMode → 重置 hydrate flag, 后续 setItems 顺手全量重建 selectedIds.
      //   - 首次进 selectingMode (hydrated=false) → 用 server 的 userSelected 全量 hydrate.
      //   - selectingMode 后续轮询 (hydrated=true) → 不擦, 只把 server 新增 userSelected=true 的
      //     (本地未选) 合并进来; 保留用户本地未提交的选择.
      if (!nowSelecting) {
        selectedIdsHydratedRef.current = false
        setTask(data)
        setItems(fetchedItems)
        setSelectedIds(
          new Set(fetchedItems.filter((i) => i.userSelected).map((i) => i.id))
        )
        setError(null)
        setLoading(false)
        return
      }

      const serverConfirmed = new Set(
        fetchedItems.filter((i) => i.userSelected).map((i) => i.id)
      )

      setTask(data)
      setItems(fetchedItems)

      if (selectedIdsHydratedRef.current) {
        // 选择模式期间的后续轮询: merge server 新增, 不擦本地未提交选择
        setSelectedIds((prev) => {
          const merged = new Set(prev)
          for (const id of serverConfirmed) {
            if (!merged.has(id)) merged.add(id)
          }
          return merged
        })
      } else {
        // 首次进 selectingMode 或刚进: 用 server 数据全量 hydrate
        selectedIdsHydratedRef.current = true
        setSelectedIds(serverConfirmed)
      }
      setError(null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载任务失败")
      setLoading(false)
    }
  }, [taskId, numericTaskId])

  // ── Effects ──

  // Initial fetch
  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  // Poll every 5s while task is in any non-terminal status.
  // 关键: SEARCH_COMPLETED / PARTIAL_COMPLETED 也要轮询 — 用户提交 selectItems
  // 后, 后端 @Async 把 task 推到 PROCESSING, 前端必须用轮询捕获这个状态推进,
  // 否则页面停在 selectingMode 永远看不到处理进度 / 完成结果 (问题 6 根因).
  // 终态 (COMPLETED / FAILED) 停止轮询.
  useEffect(() => {
    const isTerminal = task?.status === "COMPLETED" || task?.status === "FAILED"
    if (task && !isTerminal) {
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

  const selectingMode = task?.status === "SEARCH_COMPLETED" || task?.status === "PARTIAL_COMPLETED"

  // 防二次点击兜底: 两个提交按钮成功后不在 finally 里立即解锁 (留 loading 锁住
  // 防止在 fetchTask 刷新窗口内重复触发 selectItems), 而是等 task 状态离开
  // selectingMode 后由这里统一解锁. 任何能使页面离开选择模式的状态推进
  // (PROCESSING / COMPLETED / FAILED / 后端直接跳其它状态) 都会触发解锁.
  useEffect(() => {
    if (!selectingMode) {
      if (submitting) setSubmitting(false)
      if (qwenSubmitting) setQwenSubmitting(false)
    }
  }, [selectingMode, submitting, qwenSubmitting])
  // "查看详情" 按钮: 处理中、部分完成、全部完成、失败 都该显示.
  // 之前漏了 PARTIAL_COMPLETED, 导致部分完成的已 COMPLETED item 看不到详情入口.
  // 失败时也显示, 让用户能看到每个 item 的 errorMsg 根因。
  const viewDetailMode =
    task?.status === "PROCESSING"
    || task?.status === "PARTIAL_COMPLETED"
    || task?.status === "COMPLETED"
    || task?.status === "FAILED"
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
      const res = await imageApi.selectItems(numericTaskId, safeIds)
      // 后端区分 SATURATED (系统繁忙, 未触发 processTask) vs PROCESSING (已开始处理).
      // 旧代码无脑 toast.success, 用户在饱和短路时以为提交成功实则没动.
      const status = (res.data?.data as unknown as { status?: string } | undefined)?.status
      if (status === "SATURATED") {
        toast.error("系统繁忙, 暂不接受新处理请求, 请稍后重试")
        // 饱和短路: 后端没动 task, 立即解锁让用户重试
        setSubmitting(false)
      } else {
        toast.success("已提交处理请求")
        // 不立即解锁: 等轮询拿到 task 状态离开 selectingMode (SEARCH_COMPLETED /
        // PARTIAL_COMPLETED) 才由 useEffect 解锁, 在此期间按钮保持 loading
        // 防止用户在 fetchTask 刷新前的窗口内重复点击触发 selectItems.
        await fetchTask()
        // fetchTask 后若后端状态推进已离开 selectingMode, useEffect 会解锁;
        // 若仍在 selectingMode (后端异步未推进完), 保持锁定等下一轮轮询解锁.
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败")
      // 失败立即解锁, 不阻塞用户重试
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
        setQwenSubmitting(false)
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
        setQwenSubmitting(false)
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
      // 防二次点击: 同 handleSelectItems, 不在 finally 里立即解锁,
      // 等 task 状态离开 selectingMode 由 useEffect 统一解锁.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Qwen 接管提交失败")
      // 失败立即解锁, 不阻塞用户重试
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

  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const blob = await imageApi.downloadTaskResults(numericTaskId)
      // zip 外名格式 跨境图片-yyyyMMdd-taskId.zip
      // task.createdAt 已是 ISO 字符串
      const tsPart = task
        ? new Date(task.createdAt).toISOString().slice(0, 10).replace(/-/g, "")
        : "unknown"
      triggerDownload(blob, `跨境图片-${tsPart}-${numericTaskId}.zip`)
      toast.success("下载已开始")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "下载失败")
    } finally {
      setDownloading(false)
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
                {submitting && (
                  <RiLoader4Line className="mr-1 size-4 animate-spin" />
                )}
                {submitting ? "提交中..." : "开始处理选中商品"}
              </Button>
              <Button
                onClick={handleQwenTakeover}
                disabled={submitting || qwenSubmitting || selectedIds.size === 0}
                className="border border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                {qwenSubmitting && (
                  <RiLoader4Line className="mr-1 size-4 animate-spin" />
                )}
                {qwenSubmitting ? "提交中..." : "Qwen 视觉模型全权接管"}
              </Button>
            </>
          )}
          {(task.status === "COMPLETED" || task.status === "PARTIAL_COMPLETED") && (
            <Button variant="default" onClick={handleDownload} disabled={downloading}>
              <RiDownloadLine className="mr-1 size-4" />
              {downloading ? "打包中..." : "下载结果包"}
            </Button>
          )}
        </div>
      </div>

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
