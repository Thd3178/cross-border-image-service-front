import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { announcementApi, type Announcement } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Pager } from "@/components/pager"

const PAGE_SIZE = 20

export default function AnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    announcementApi
      .list(current, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return
        const p = res.data.data
        setRows(p.rows)
        setTotal(p.total)
      })
      .catch(() => {
        if (!cancelled) {
          setRows([])
          setTotal(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [current])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">系统公告</h1>
        <p className="text-sm text-muted-foreground mt-1">
          所有已发布的公告，按发布时间倒序。
        </p>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              暂无公告
            </CardContent>
          </Card>
        ) : (
          rows.map((a) => (
            <Link key={a.id} to={`/announcements/${a.id}`} className="block">
              <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold">
                      {a.title}
                    </CardTitle>
                    {a.popup === 1 && (
                      <Badge variant="secondary" className="shrink-0">
                        进站弹窗
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {a.publishedAt
                      ? new Date(a.publishedAt).toLocaleString("zh-CN")
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {!loading && total > 0 && (
        <Pager
          current={current}
          total={total}
          size={PAGE_SIZE}
          onPageChange={setCurrent}
        />
      )}
    </div>
  )
}
