import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { RiUploadCloudLine, RiLoader4Line, RiAddLine } from "@remixicon/react"

import type { BackgroundImage } from "@/lib/api"
import { backgroundApi } from "@/lib/api"
import { cn } from "@/lib/utils"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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

interface BackgroundUploadSheetProps {
  onSuccess: (bg: BackgroundImage) => void
}

export function BackgroundUploadSheet({ onSuccess }: BackgroundUploadSheetProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [colorHex, setColorHex] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setName("")
    setCategory("")
    setColorHex("")
  }, [preview])

  const handleSelectFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("请选择图片文件")
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleSelectFile(f)
    },
    [handleSelectFile]
  )

  const handleSubmit = useCallback(async () => {
    if (!file) {
      toast.error("请先选择图片")
      return
    }
    setIsUploading(true)
    try {
      const res = await backgroundApi.upload(file, {
        name: name || undefined,
        category: category || undefined,
        colorHex: colorHex || undefined,
      })
      toast.success("背景上传成功")
      onSuccess(res.data.data)
      reset()
      setOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "上传失败"
      toast.error(msg)
    } finally {
      setIsUploading(false)
    }
  }, [file, name, category, colorHex, onSuccess, reset])

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="size-6 shrink-0">
          <RiAddLine className="size-4" />
          <span className="sr-only">上传背景</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>上传新背景</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-6 pt-4">
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
                  className="max-h-32 max-w-full rounded-lg object-contain"
                />
                <p className="text-xs text-muted-foreground">{file?.name}</p>
              </div>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <RiUploadCloudLine className="size-6 text-muted-foreground" />
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

          {/* Category */}
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

          {/* Color hex */}
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

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="mt-2 h-11 w-full text-sm"
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
        </div>
      </SheetContent>
    </Sheet>
  )
}
