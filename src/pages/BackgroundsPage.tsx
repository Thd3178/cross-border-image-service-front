import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  RiUploadCloudLine,
  RiLoader4Line,
  RiImageLine,
} from "@remixicon/react"

import { backgroundApi, type BackgroundImage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CATEGORIES = [
  { value: "", label: "无分类" },
  { value: "fushi", label: "服装" },
  { value: "shuma", label: "数码" },
  { value: "jiaju", label: "家居" },
  { value: "meizhuang", label: "美妆" },
  { value: "shipin", label: "食品" },
  { value: "yundong", label: "运动" },
  { value: "muying", label: "母婴" },
  { value: "wenju", label: "文具" },
] as const

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

export default function BackgroundsPage() {
  // ── Upload state ──
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [colorHex, setColorHex] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── List state ──
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)

  // ── Fetch backgrounds list ──
  const fetchBackgrounds = useCallback(() => {
    setIsLoadingList(true)
    backgroundApi
      .list()
      .then((res) => setBackgrounds(res.data.data))
      .catch((err: Error) => toast.error("加载背景列表失败", { description: err.message }))
      .finally(() => setIsLoadingList(false))
  }, [])

  useEffect(() => {
    fetchBackgrounds()
  }, [fetchBackgrounds])

  // ── File handling ──
  const handleSelectFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("请选择图片文件")
      return
    }
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }, [preview])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleSelectFile(f)
    },
    [handleSelectFile]
  )

  // ── Upload submission ──
  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.error("请先选择图片")
      return
    }
    setIsUploading(true)
    try {
      await backgroundApi.upload(file, {
        name: name || undefined,
        category: category || undefined,
        colorHex: colorHex || undefined,
      })
      toast.success("背景上传成功")
      // Reset upload form
      setFile(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
      setName("")
      setCategory("")
      setColorHex("")
      // Refresh list
      fetchBackgrounds()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "上传失败"
      toast.error(msg)
    } finally {
      setIsUploading(false)
    }
  }, [file, name, category, colorHex, preview, fetchBackgrounds])

  // ── Cleanup preview URL ──
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-6 @container" style={{ containerName: "main" }}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Upload Card ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">上传新背景</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* File upload zone */}
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                preview && "border-solid"
              )}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
              }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleSelectFile(f)
                }}
              />
              {preview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-36 max-w-full rounded-lg object-contain"
                  />
                  <p className="text-xs text-muted-foreground">{file?.name}</p>
                </div>
              ) : (
                <>
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <RiUploadCloudLine className="size-7 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">点击或拖拽上传</p>
                    <p className="text-xs text-muted-foreground">PNG / JPG / WEBP，最大 20MB</p>
                  </div>
                </>
              )}
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bg-name">名称</Label>
              <Input
                id="bg-name"
                placeholder="留空则使用文件名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* Category + Color row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bg-category">分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="bg-category" className="h-10 text-sm">
                    <SelectValue placeholder="无分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bg-color">色号（可选）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="bg-color"
                    placeholder="#FFFFFF"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-10 flex-1 text-sm font-mono"
                  />
                  {colorHex && /^#[0-9a-fA-F]{6}$/.test(colorHex) && (
                    <div
                      className="size-8 shrink-0 rounded-md border"
                      style={{ backgroundColor: colorHex }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="h-11 w-full text-sm"
            >
              {isUploading ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <RiUploadCloudLine className="size-4" />
                  上传背景
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Background List Card ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">背景列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingList ? (
              <div className="flex items-center justify-center py-12">
                <RiLoader4Line className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : backgrounds.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <RiImageLine className="size-10" />
                <p className="text-sm">暂无背景，请上传</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {backgrounds.map((bg) => (
                  <div
                    key={bg.id}
                    className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-muted-foreground/30"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square overflow-hidden bg-muted/30">
                      <img
                        src={bg.thumbnailUrl || bg.url}
                        alt={bg.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex flex-col gap-1 p-2.5">
                      <p className="truncate text-xs font-medium">{bg.name}</p>
                      <div className="flex items-center gap-1.5">
                        {bg.category && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {CATEGORIES.find((c) => c.value === bg.category)?.label || bg.category}
                          </span>
                        )}
                        {bg.colorHex && (
                          <div
                            className="size-3.5 rounded-full border"
                            style={{ backgroundColor: bg.colorHex }}
                            title={bg.colorHex}
                          />
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {fmtDate(bg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
