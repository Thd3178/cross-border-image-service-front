import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { imageApi, type Task } from "@/lib/api"
import { STATUS_CONFIG, STATUS_COLORS, formatDate } from "@/lib/task-status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RiArrowLeftSLine, RiArrowRightSLine, RiImageLine } from "@remixicon/react"

const PAGE_SIZE = 10

export default function TaskListPage() {
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<Task[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const res = await imageApi.tasks(page, PAGE_SIZE)
      const data = res.data.data
      setTasks(data.records)
      setTotalPages(data.pages)
      setCurrentPage(data.current)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载任务列表失败"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks(1)
  }, [fetchTasks])

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      fetchTasks(page)
    },
    [fetchTasks, totalPages]
  )

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <RiImageLine className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">暂无任务</p>
              <p className="text-xs text-muted-foreground/60">
                请上传图片开始使用
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-14">图片</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-center">进度</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{task.id}</TableCell>
                      <TableCell>
                        {task.sourceImgUrl ? (
                          <img
                            src={task.sourceImgUrl}
                            alt=""
                            className="size-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                            <RiImageLine className="size-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_COLORS[task.status] ? "outline" : "secondary"}
                          className={STATUS_COLORS[task.status] ?? ""}
                        >
                          {STATUS_CONFIG[task.status]?.label ?? task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {task.completedItems}/{task.totalItems}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(task.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/tasks/${task.id}`)
                          }}
                        >
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    <RiArrowLeftSLine className="size-4" />
                    上一页
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    下一页
                    <RiArrowRightSLine className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
