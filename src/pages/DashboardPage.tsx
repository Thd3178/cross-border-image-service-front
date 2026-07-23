import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  RiUploadCloudLine,
  RiImageLine,
  RiArrowRightSLine,
  RiArrowLeftSLine,
  RiLoader4Line,
} from "@remixicon/react"

import { imageApi, backgroundApi, type Task, type BackgroundImage, type DashboardStats } from "@/lib/api"
import { cn } from "@/lib/utils"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Status badge config ───

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "待处理", variant: "secondary" },
  SEARCHING: { label: "搜索中", variant: "default" },
  SEARCH_COMPLETED: { label: "搜索完成", variant: "default" },
  USER_SELECTING: { label: "选择商品中", variant: "default" },
  PROCESSING: { label: "处理中", variant: "default" },
  COMPLETED: { label: "已完成", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  SEARCHING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  SEARCH_COMPLETED: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  USER_SELECTING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PROCESSING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function DashboardPage() {
  const navigate = useNavigate()

  // ── Dashboard stats ──
  const [stats, setStats] = useState<DashboardStats | null>(null)

  // ── Upload state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([])
  const [selectedBgId, setSelectedBgId] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // ── Task list state ──
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const pageSize = 10

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch backgrounds ──
  useEffect(() => {
    backgroundApi
      .list()
      .then((res) => setBackgrounds(res.data.data))
      .catch((err: Error) => toast.error("加载背景失败", { description: err.message }))
  }, [])

  // ── Fetch dashboard stats ──
  useEffect(() => {
    imageApi
      .stats()
      .then((res) => setStats(res.data.data))
      .catch((err: Error) => toast.error("加载统计数据失败", { description: err.message }))
  }, [])

  // ── Fetch tasks ──
  const fetchTasks = useCallback(async (page: number) => {
    setIsLoadingTasks(true)
    try {
      const res = await imageApi.tasks(page, pageSize)
      const data = res.data.data
      setTasks(data.records)
      setTotalPages(data.pages)
      setCurrentPage(data.current)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load tasks"
      toast.error(message)
    } finally {
      setIsLoadingTasks(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks(1)
  }, [fetchTasks])

  // ── Auto-refresh for in-progress tasks ──
  useEffect(() => {
    const hasInProgress = tasks.some(
      (t) =>
        t.status === "PENDING" ||
        t.status === "SEARCHING" ||
        t.status === "SEARCH_COMPLETED" ||
        t.status === "USER_SELECTING" ||
        t.status === "PROCESSING"
    )
    if (!hasInProgress) return

    const interval = setInterval(() => {
      fetchTasks(currentPage)
    }, 10000)
    return () => clearInterval(interval)
  }, [tasks, currentPage, fetchTasks])

  // ── File handling ──
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select an image first")
      return
    }
    setIsUploading(true)
    try {
      const bgId = selectedBgId ? Number(selectedBgId) : undefined
      const res = await imageApi.upload(selectedFile, bgId)
      const data = res.data.data
      toast.success(data.message || "Upload successful")
      setSelectedFile(null)
      setPreviewUrl(null)
      setSelectedBgId("")
      fetchTasks(1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed"
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, selectedBgId, fetchTasks])

  // ── Pagination ──
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      fetchTasks(page)
    },
    [fetchTasks, totalPages]
  )

  // ── Cleanup preview URL ──
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-6 @container" style={{ containerName: "main" }}>   
      {/* ── Stat Cards ── */}
      <SectionCards stats={stats ?? { completedTasks: 0, totalTasks: 0, totalExpense: 0, backgroundCount: 0 }} />

      {/* ── Upload Section ── */}
      <Card>
        <CardHeader>
          <CardTitle>上传图片</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Upload zone */}
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              previewUrl && "border-solid"
            )}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 max-w-full rounded-2xl object-contain"
                />
                <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
              </div>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <RiUploadCloudLine className="size-6 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">
                      点击上传或拖拽文件到此处
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持 PNG、JPG、WEBP 格式，最大 20MB
                    </p>
                </div>
              </>
            )}
          </div>

          {/* Background selection + Upload button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                背景
              </label>
              <Select value={selectedBgId} onValueChange={setSelectedBgId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="无背景（透明）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无背景（透明）</SelectItem>
                  {backgrounds.map((bg) => (
                    <SelectItem key={bg.id} value={String(bg.id)}>
                      <span className="flex items-center gap-2">
                        {bg.thumbnailUrl && (
                          <img
                            src={bg.thumbnailUrl}
                            alt=""
                            className="size-5 rounded object-cover"
                          />
                        )}
                        {bg.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="mt-1 sm:mt-0"
            >
              {isUploading ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <RiUploadCloudLine className="size-4" />
                  上传
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Task & Chart Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Task List ── */}
      <Card>
        <CardHeader>
          <CardTitle>任务历史</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
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

              {/* ── Pagination ── */}
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

      {/* ── Chart Section ── */}
      <ChartAreaInteractive />
      </div>
    </div>
  )
}
