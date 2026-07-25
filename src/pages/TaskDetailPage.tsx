import { useState, useEffect, useCallback, useRef } from "react"
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
  return (
    <Card size="sm" className="relative">
      {/* Checkbox overlay */}
      {selectingMode && (
        <div
          className={cn(
            "absolute left-2 top-2 z-10 cursor-pointer rounded-full bg-background/70 p-1 backdrop-blur-sm",
            selected && "bg-primary/10"
          )}
          onClick={() => onToggle(item.id)}
        >
          <Checkbox
            checked={selected}
          />
        </div>
      )}

      {/* Status badge (非选择模式下显示) */}
      {!selectingMode && item.status !== "PENDING" && (
        <Badge
          variant="outline"
          className={cn(
            "absolute left-2 top-2 z-10",
            ITEM_STATUS_STYLE[item.status] ?? ""
          )}
        >
          {ITEM_STATUS_LABEL[item.status] ?? item.status}
        </Badge>
      )}

      <CardContent className="flex flex-col gap-0 p-0">
        {/* Product image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-3xl bg-muted">
          <img
            src={item.productImgUrl || FALLBACK_IMG}
            alt={item.productTitle ?? "商品图片"}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={imgErrorHandler}
          />
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

  // Poll every 5s when searching
  useEffect(() => {
    if (task?.status === "SEARCHING") {
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

  const selectingMode = task?.status === "SEARCH_COMPLETED" || task?.status === "USER_SELECTING"
  const viewDetailMode =
    task?.status === "PROCESSING" || task?.status === "COMPLETED"
  const showItems =
    items.length > 0 && task && ALLOW_ITEMS_STATUSES.has(task.status)
  const allSelected = items.length > 0 && selectedIds.size === items.length

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

    setSubmitting(true)
    try {
      await imageApi.selectItems(numericTaskId, Array.from(selectedIds))
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
      const ids = Array.from(selectedIds)
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
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }, [allSelected, items])

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
          {task.status === "FAILED" && (
            <Button variant="outline" onClick={handleRetry}>
              <RiRefreshLine className="mr-1 size-4" />
              重试
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
