import { useCallback } from "react"
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiImageLine,
} from "@remixicon/react"

import type { Task } from "@/lib/api"
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

interface TaskHistoryCardProps {
  tasks: Task[]
  isLoading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onTaskClick: (taskId: number) => void
}

export function TaskHistoryCard({
  tasks,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onTaskClick,
}: TaskHistoryCardProps) {
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      onPageChange(page)
    },
    [onPageChange, totalPages]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">任务历史</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
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
                  <TableHead className="text-center">数量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody style={{ minHeight: "420px" }}>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => onTaskClick(task.id)}
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
                          onTaskClick(task.id)
                        }}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* 不足十条时补空行保持高度 */}
                {tasks.length < 10 &&
                  Array.from({ length: 10 - tasks.length }).map((_, i) => (
                    <TableRow key={`empty-${i}`} className="pointer-events-none">
                      <TableCell colSpan={6}>&nbsp;</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {/* Pagination — always visible */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || totalPages <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <RiArrowLeftSLine className="size-4" />
                上一页
              </Button>
              <span className="text-xs text-muted-foreground">
                第 {currentPage} / {totalPages || 1} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || totalPages <= 1}
                onClick={() => goToPage(currentPage + 1)}
              >
                下一页
                <RiArrowRightSLine className="size-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
