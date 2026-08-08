import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { imageApi, backgroundApi, type Task, type BackgroundImage } from "@/lib/api"
import { ImageUploadCard } from "@/components/image-upload-card"
import { TaskHistoryCard } from "@/components/task-history-card"

export default function QuickCreatePage() {
  const navigate = useNavigate()

  // ── Upload state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([])
  const [selectedBgId, setSelectedBgId] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)

  // ── Task list state ──
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const pageSize = 10

  // ── 1688 search params ──
  const [keyword, setKeyword] = useState<string>("")
  const [priceMin, setPriceMin] = useState<string>("")
  const [priceMax, setPriceMax] = useState<string>("")
  const [sortFields, setSortFields] = useState<string>("va_relate")
  const [category, setCategory] = useState<string>("")
  const [tags, setTags] = useState<string>("")

  // ── Fetch backgrounds ──
  useEffect(() => {
    backgroundApi
      .list()
      .then((res) => setBackgrounds(res.data.data))
      .catch((err: Error) => toast.error("加载背景失败", { description: err.message }))
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
      (t) => t.status === "SEARCHING" || t.status === "PROCESSING"
    )
    if (!hasInProgress) return

    // 进度状态轮询 5s — 问题 2 原来是 30s 导致搜索完成显示明显延迟
    // (后端 1688 搜索通常几秒~十几秒完成, 30s 间隔让用户多等将近一个 tick)
    const interval = setInterval(() => {
      fetchTasks(currentPage)
    }, 5000)
    return () => clearInterval(interval)
  }, [tasks, currentPage, fetchTasks])

  // ── File handling ──
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error("请先选择图片")
      return
    }
    setIsUploading(true)
    try {
      const bgId = selectedBgId ? Number(selectedBgId) : undefined
      const res = await imageApi.upload(selectedFile, bgId)
      const data = res.data.data
      toast.success(data.message || "上传成功，正在搜索...")
      setSelectedFile(null)
      setPreviewUrl(null)
      setSelectedBgId("")
      setKeyword("")
      setPriceMin("")
      setPriceMax("")
      setSortFields("va_relate")
      setCategory("")
      setTags("")
      fetchTasks(1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "上传失败"
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, selectedBgId, keyword, priceMin, priceMax, sortFields, category, fetchTasks])

  const handleResetFilters = useCallback(() => {
    setKeyword("")
    setCategory("")
    setPriceMin("")
    setPriceMax("")
    setSortFields("va_relate")
    setTags("")
  }, [])

  const handleTaskClick = useCallback(
    (taskId: number) => navigate(`/tasks/${taskId}`),
    [navigate]
  )

  const handlePageChange = useCallback(
    (page: number) => fetchTasks(page),
    [fetchTasks]
  )

  // ── Cleanup preview URL ──
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-6 @container" style={{ containerName: "main" }}>
      {/* ── Upload & Task History Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ImageUploadCard
          backgrounds={backgrounds}
          selectedBgId={selectedBgId}
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          isUploading={isUploading}
          keyword={keyword}
          category={category}
          priceMin={priceMin}
          priceMax={priceMax}
          sortFields={sortFields}
          tags={tags}
          onFileSelect={handleFileSelect}
          onSelectedBgIdChange={setSelectedBgId}
          onKeywordChange={setKeyword}
          onCategoryChange={setCategory}
          onPriceMinChange={setPriceMin}
          onPriceMaxChange={setPriceMax}
          onSortFieldsChange={setSortFields}
          onTagsChange={setTags}
          onResetFilters={handleResetFilters}
          onUpload={handleUpload}
          onBackgroundsChange={() =>
            backgroundApi.list().then((res) => setBackgrounds(res.data.data)).catch(() => {})
          }
        />
        <TaskHistoryCard
          tasks={tasks}
          isLoading={isLoadingTasks}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onTaskClick={handleTaskClick}
        />
      </div>
    </div>
  )
}
