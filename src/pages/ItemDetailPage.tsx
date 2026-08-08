import { useCallback, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { imageApi, type ItemStatus, type ProcessingMode, type TaskItem } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { RiArrowGoBackLine } from "@remixicon/react"
import { TaskItemProductFields } from "@/components/task-item-product-fields"

// ─── Constants ───

const POLL_MS = 5000

const PROGRESS_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "SEGMENTING",
  "ANALYZING",
  "INPAINTING",
  "COMPOSITING",
  "QWEN_EDITING",
])

const STATUS_LABEL: Record<ItemStatus, string> = {
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

type Verdict = "pass" | "fail" | "needs_inpaint"

function isVerdict(v: string): v is Verdict {
  return v === "pass" || v === "fail" || v === "needs_inpaint"
}

const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "通过",
  fail: "不通过",
  needs_inpaint: "需要修复",
}

// ─── Page Component ───

export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<TaskItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modeSaving, setModeSaving] = useState(false)

  // Initial load
  useEffect(() => {
    if (!itemId) return
    let cancelled = false

    setLoading(true)
    setItem(null)
    setError(null)

    imageApi
      .itemDetail(Number(itemId))
      .then((res) => {
        if (cancelled) return
        setItem(res.data.data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "加载失败")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [itemId])

  // Poll for progress updates
  const poll = useCallback(async () => {
    if (!itemId) return
    try {
      const res = await imageApi.itemDetail(Number(itemId))
      setItem(res.data.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败")
    }
  }, [itemId])

  useEffect(() => {
    if (!item || !PROGRESS_STATUSES.has(item.status)) return
    const timer = setInterval(poll, POLL_MS)
    return () => clearInterval(timer)
  }, [item?.status, poll])

  if (loading) return <ItemDetailSkeleton />
  if (error) return <ErrorState message={error} />
  if (!item) return <NotFoundState />

  const isProgressing = PROGRESS_STATUSES.has(item.status)
  // 仅 PENDING / SELECTED 允许切换处理模式；处理中或已完成一律禁用
  // 后端 ImageTaskService.updateItemProcessingMode 有同样的状态守卫，
  // 这里 UI 提前禁用避免无效请求 + 给清晰的提示
  const canToggleMode = item.status === "PENDING" || item.status === "SELECTED"

  // 视觉接管模式不走分割/质检/合成，所以左侧只显示原图 + Qwen 编辑结果，
  // 右侧也不显示质检结果卡片
  const isQwenTakeover = item.processingMode === "QWEN_TAKEOVER"
  const showQuality =
    !isQwenTakeover &&
    (item.status === "ANALYZED" ||
      item.status === "INPAINTED" ||
      item.status === "COMPLETED")

  const handleModeChange = async (newMode: ProcessingMode) => {
    if (!canToggleMode || newMode === item.processingMode) return
    const prev = item.processingMode
    setModeSaving(true)
    // 乐观更新：先在前端切到新模式，失败回滚
    setItem({ ...item, processingMode: newMode })
    try {
      await imageApi.updateItemMode(item.id, newMode)
      toast.success(
        newMode === "QWEN_TAKEOVER" ? "已切到视觉接管" : "已切到原流程"
      )
    } catch (err) {
      setItem({ ...item, processingMode: prev })
      toast.error(err instanceof Error ? err.message : "切换失败")
    } finally {
      setModeSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* ── Back button ── */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          onClick={() => navigate(-1)}
        >
          <RiArrowGoBackLine className="size-5" />
        </Button>
        <h1 className="text-lg font-medium">商品详情</h1>
      </div>

      {/* ── 三卡横排对比 (原图 / 分割结果或占位 / 最终合成或Qwen编辑) ── */}
      {/* 卡间分割线: 第 2、3 卡左边加 border-l */}
      <div className="mb-6 grid grid-cols-1 gap-0 md:grid-cols-3 md:divide-x md:divide-border">
        <ImageCard title="原始图片" url={item.productImgUrl} className="md:pr-4" />

        {isQwenTakeover ? (
          /* QWEN_TAKEOVER 模式: 中间格 = 空占位 ("未使用分割"); 第三格 = Qwen 编辑结果 */
          <EmptyImageCard title="分割结果" note="此模式不使用分割" className="md:px-4" />
        ) : (
          <ImageCard
            title="分割结果"
            url={item.segmentedImgUrl}
            className="md:px-4"
            placeholder={
              item.status === "SEGMENTING"
                ? "分割中..."
                : "暂无分割结果"
            }
          />
        )}

        {isQwenTakeover ? (
          item.status === "QWEN_EDITING" ? (
            <ProcessingPlaceholder label="Qwen 编辑结果" className="md:pl-4" />
          ) : (
            <ImageCard
              title="Qwen 编辑结果"
              url={item.finalImgUrl}
              className="md:pl-4"
              placeholder="暂无 Qwen 编辑结果"
            />
          )
        ) : (
          <ImageCard
            title="最终合成"
            url={item.finalImgUrl}
            className="md:pl-4"
            placeholder={
              item.status === "COMPOSITING"
                ? "合成中..."
                : "暂无最终合成"
            }
          />
        )}
      </div>

      {/* ── 信息区: 状态/模式一行 + 质检一行 + 商品一行；错误附在状态行旁 ── */}
      <div className="flex flex-col gap-4">
        {/* Row 1: 状态 / 模式 / 处理中提示 / 错误附在右侧 */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <CardHeaderCompact title="处理状态" />
            <div className="flex items-center gap-2">
              <StatusBadge status={item.status} />
              <Badge
                variant="outline"
                  className={
                    isQwenTakeover
                      ? "border-primary/40 bg-primary/10 text-primary dark:border-primary/50 dark:bg-primary/15 dark:text-primary"
                      : "bg-muted text-muted-foreground"
                  }
              >
                {isQwenTakeover ? "视觉接管" : "原流程"}
              </Badge>
              {isProgressing && (
                <span className="animate-pulse text-sm text-muted-foreground">
                  处理中...
                </span>
              )}
            </div>

            {/* 错误信息贴在状态行右侧（如有） */}
            {item.status === "FAILED" && item.errorMsg && (
              <div className="ml-auto rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">
                {item.errorMsg}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 1b: 处理模式切换 */}
        {canToggleMode && (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <CardHeaderCompact title="处理模式" />
              <ToggleGroup
                type="single"
                value={item.processingMode}
                onValueChange={(v) => {
                  if (v === "PIPELINE" || v === "QWEN_TAKEOVER") {
                    void handleModeChange(v)
                  }
                }}
                disabled={modeSaving}
                className="w-auto"
              >
                <ToggleGroupItem
                  value="PIPELINE"
                  aria-label="原流程"
                >
                  原流程
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="QWEN_TAKEOVER"
                  aria-label="视觉接管"
                >
                  视觉接管
                </ToggleGroupItem>
              </ToggleGroup>
              {isQwenTakeover ? (
                <p className="text-xs text-primary">
                  视觉接管：跳过分割/质检/合成，由 Qwen 直接编辑出图
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  切换模式仅限处理前
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Row 2: 质检结果 (仅原流程 适用阶段展示) */}
        {showQuality && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <CardHeaderCompact title="质检结果" />
              {item.overallVerdict && isVerdict(item.overallVerdict) && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">综合判定</span>
                  <VerdictBadge verdict={item.overallVerdict} />
                </div>
              )}
              {item.hasViolations && item.violations && (
                <div>
                  <p className="text-xs text-muted-foreground">违规内容</p>
                  <p className="mt-0.5 text-sm text-destructive">
                    {item.violations}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Row 3: 商品信息 */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <CardHeaderCompact title="商品信息" />
            <div className="flex flex-wrap gap-6">
              {item.productTitle ? (
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="text-xs text-muted-foreground">商品标题</p>
                  <p className="break-words text-sm font-medium">{item.productTitle}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无商品标题</p>
              )}
              {item.productPrice != null && (
                <div>
                  <p className="text-xs text-muted-foreground">商品价格</p>
                  <p className="text-sm font-medium">
                    {item.productPrice}元
                  </p>
                </div>
              )}
            </div>
            <TaskItemProductFields item={item} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Sub-components ───

// 卡片内嵌标题（替代原 CardHeader, 让信息行的卡片更紧凑）
function CardHeaderCompact({ title }: { title: string }) {
  return (
    <p className="text-sm font-semibold text-foreground whitespace-nowrap">
      {title}
    </p>
  )
}

interface ImageCardProps {
  title: string
  url?: string
  className?: string
  /** 自定义无图时的占位提示文案 */
  placeholder?: string
}

function ImageCard({ title, url, className, placeholder = "暂无图片" }: ImageCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {url ? (
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <img
              src={url}
              alt={title}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface EmptyImageCardProps {
  title: string
  note: string
  className?: string
}

// 空占位卡片: 用于 QWEN_TAKEOVER 模式下不展示分割结果时, 三卡布局保留位置占位 "--"
function EmptyImageCard({ title, note, className }: EmptyImageCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
          <span className="text-3xl font-light text-muted-foreground/50">—</span>
          <span className="text-sm text-muted-foreground">{note}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const variant: "default" | "secondary" | "destructive" | "outline" =
    status === "FAILED"
      ? "destructive"
      : status === "COMPLETED"
        ? "default"
        : PROGRESS_STATUSES.has(status)
          ? "outline"
          : "secondary"

  const extraClass =
    status === "COMPLETED"
      ? "bg-green-600 text-white hover:bg-green-700"
      : PROGRESS_STATUSES.has(status)
        ? "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:bg-blue-950/30"
        : ""

  return (
    <Badge variant={variant} className={extraClass}>
      {STATUS_LABEL[status] ?? status}
      {PROGRESS_STATUSES.has(status) && (
        <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
    </Badge>
  )
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const config: Record<
    Verdict,
    {
      variant: "default" | "destructive" | "outline"
      className: string
      icon: string
    }
  > = {
    pass: {
      variant: "default",
      className:
        "bg-green-600 text-white hover:bg-green-700",
      icon: "✓",
    },
    fail: {
      variant: "destructive",
      className: "",
      icon: "✗",
    },
    needs_inpaint: {
      variant: "outline",
      className:
        "border-primary/40 bg-primary/10 text-primary dark:border-primary/50 dark:bg-primary/15 dark:text-primary",
      icon: "🩹",
    },
  }

  const c = config[verdict]
  return (
    <Badge variant={c.variant} className={c.className}>
      {c.icon} {VERDICT_LABEL[verdict]}
    </Badge>
  )
}

function ProcessingPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            正在处理...
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── State Components ───

function ErrorState({ message }: { message: string }) {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <span className="text-4xl text-destructive">✕</span>
          <p className="font-medium text-destructive">加载失败</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function NotFoundState() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <span className="text-4xl text-muted-foreground">?</span>
          <p className="font-medium text-muted-foreground">项目未找到</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ItemDetailSkeleton() {
  return (
    <div className="container mx-auto p-6">
      {/* 三卡横排骨架 */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-3 md:divide-x md:divide-border">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={i === 1 ? "md:pr-4" : i === 2 ? "md:px-4" : "md:pl-4"}>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-square w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* 信息区骨架 */}
      <div className="mt-4 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
