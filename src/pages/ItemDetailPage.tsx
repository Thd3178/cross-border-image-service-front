import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { imageApi, type ItemStatus, type TaskItem } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// ─── Constants ───

const POLL_MS = 5000

const PROGRESS_STATUSES: ReadonlySet<ItemStatus> = new Set([
  "SEGMENTING",
  "ANALYZING",
  "COMPOSITING",
])

const STATUS_LABEL: Record<ItemStatus, string> = {
  PENDING: "待处理",
  SELECTED: "已选择",
  SEGMENTING: "分割中",
  SEGMENTED: "已分割",
  ANALYZING: "质检中",
  ANALYZED: "已质检",
  COMPOSITING: "合成中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELLED: "已取消",
}

type Verdict = "pass" | "fail" | "needs_crop"

function isVerdict(v: string): v is Verdict {
  return v === "pass" || v === "fail" || v === "needs_crop"
}

const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "通过",
  fail: "不通过",
  needs_crop: "需要裁剪",
}

// ─── Page Component ───

export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const [item, setItem] = useState<TaskItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const showQuality =
    item.status === "ANALYZED" || item.status === "COMPLETED"

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Left: Image Pipeline ── */}
        <div className="flex flex-col gap-6">
          <ImageCard title="原始图片" url={item.productImgUrl} />
          {item.segmentedImgUrl && (
            <ImageCard title="分割结果" url={item.segmentedImgUrl} />
          )}
          {item.finalImgUrl && (
            <ImageCard title="最终合成" url={item.finalImgUrl} />
          )}
        </div>

        {/* ── Right: Status & Info ── */}
        <div className="flex flex-col gap-6">
          {/* Status card */}
          <Card>
            <CardHeader>
              <CardTitle>处理状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                {isProgressing && (
                  <span className="animate-pulse text-sm text-muted-foreground">
                    处理中...
                  </span>
                )}
              </div>
              {item.status === "FAILED" && item.errorMsg && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {item.errorMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product info card */}
          <Card>
            <CardHeader>
              <CardTitle>商品信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.productTitle ? (
                <div>
                  <p className="text-xs text-muted-foreground">商品标题</p>
                  <p className="text-sm font-medium">{item.productTitle}</p>
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
            </CardContent>
          </Card>

          {/* Quality check card */}
          {showQuality && (
            <Card>
              <CardHeader>
                <CardTitle>质检结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.overallVerdict && isVerdict(item.overallVerdict) && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      综合判定
                    </span>
                    <VerdictBadge verdict={item.overallVerdict} />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <QualityCheckItem
                    label="居中检测"
                    passed={item.isCentered}
                  />
                  <QualityCheckItem
                    label="方形检测"
                    passed={item.isSquare}
                  />
                </div>

                {item.cropRect && (
                  <div>
                    <p className="text-xs text-muted-foreground">裁剪区域</p>
                    <p className="mt-0.5 font-mono text-sm">
                      {item.cropRect}
                    </p>
                  </div>
                )}

                {item.hasViolations && item.violations && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      违规内容
                    </p>
                    <p className="mt-0.5 text-sm text-destructive">
                      {item.violations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───

function ImageCard({ title, url }: { title: string; url?: string }) {
  return (
    <Card>
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
            暂无图片
          </div>
        )}
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
    needs_crop: {
      variant: "outline",
      className:
        "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      icon: "⚠",
    },
  }

  const c = config[verdict]
  return (
    <Badge variant={c.variant} className={c.className}>
      {c.icon} {VERDICT_LABEL[verdict]}
    </Badge>
  )
}

function QualityCheckItem({
  label,
  passed,
}: {
  label: string
  passed?: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      <span className={passed ? "text-green-600" : "text-destructive"}>
        {passed ? "✓" : "✗"}
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{passed ? "是" : "否"}</p>
      </div>
    </div>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-square w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
