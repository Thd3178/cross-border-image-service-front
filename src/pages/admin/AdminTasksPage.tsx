import { useEffect, useState } from "react"
import { adminApi, type Task, type TaskStatus } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Pager } from "@/components/pager"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RiSearchLine } from "@remixicon/react"

const PAGE_SIZE = 20

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "待处理",
  SEARCHING: "搜索中",
  SEARCH_COMPLETED: "搜索完成",
  PROCESSING: "处理中",
  PARTIAL_COMPLETED: "部分完成",
  COMPLETED: "已完成",
  FAILED: "失败",
}

const STATUS_VARIANT: Record<
  TaskStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  SEARCHING: "secondary",
  SEARCH_COMPLETED: "secondary",
  PROCESSING: "secondary",
  PARTIAL_COMPLETED: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
}

export default function AdminTasksPage() {
  const [rows, setRows] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [loading, setLoading] = useState(true)
  const [userIdFilter, setUserIdFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("")

  const fetchTasks = (page: number) => {
    setLoading(true)
    adminApi
      .listTasks({
        current: page,
        size: PAGE_SIZE,
        userId: userIdFilter ? Number(userIdFilter) : undefined,
        status: statusFilter || undefined,
      })
      .then((res) => {
        const p = res.data.data
        setRows(p.records)
        setTotal(p.total)
      })
      .catch(() => {
        setRows([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTasks(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">任务管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          全站图片处理任务列表，可按 userId / status 过滤。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">过滤条件</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">用户 ID</label>
            <Input
              type="number"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="精确 userId"
              className="h-8 w-40 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">状态</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as TaskStatus | "")
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">全部</option>
              {Object.entries(STATUS_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setCurrent(1)
              fetchTasks(1)
            }}
          >
            <RiSearchLine /> 搜索
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>用户 ID</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>商品数</TableHead>
                  <TableHead>已选</TableHead>
                  <TableHead>完成</TableHead>
                  <TableHead>错误</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-sm text-muted-foreground"
                    >
                      无匹配任务
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">
                        {t.id}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {t.userId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[t.status]}>
                          {STATUS_LABEL[t.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.totalItems}</TableCell>
                      <TableCell>{t.selectedItems}</TableCell>
                      <TableCell>{t.completedItems}</TableCell>
                      <TableCell
                        className="max-w-48 truncate text-xs text-destructive"
                        title={t.errorMsg ?? ""}
                      >
                        {t.errorMsg ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString("zh-CN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
