import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { announcementApi, type Announcement } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { RiArrowLeftSLine } from "@remixicon/react"
import { MarkdownRenderer } from "@/components/markdown-renderer"

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const announcementId = id ? Number(id) : NaN
  const [data, setData] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(announcementId)) {
      setError("公告 ID 无效")
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    announcementApi
      .detail(announcementId)
      .then((res) => {
        if (cancelled) return
        setData(res.data.data)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "公告不存在或未发布")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [announcementId])

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/announcements" className="inline-flex items-center gap-1">
          <RiArrowLeftSLine />
          返回列表
        </Link>
      </Button>

      {loading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="mt-4 h-32 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : data ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <p className="text-xs text-muted-foreground">
              {data.publishedAt
                ? new Date(data.publishedAt).toLocaleString("zh-CN")
                : ""}
            </p>
            <div className="max-w-none pt-2 text-sm leading-6">
              <MarkdownRenderer content={data.content ?? ""} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
