import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import {
  RiUploadCloudLine,
  RiLoader4Line,
  RiSearchLine,
  RiResetRightLine,
} from "@remixicon/react"

import type { BackgroundImage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BackgroundUploadSheet } from "@/components/background-upload-sheet"

interface ImageUploadCardProps {
  backgrounds: BackgroundImage[]
  selectedBgId: string
  selectedFile: File | null
  previewUrl: string | null
  isUploading: boolean
  keyword: string
  category: string
  priceMin: string
  priceMax: string
  sortFields: string
  tags?: string
  onFileSelect: (file: File) => void
  onSelectedBgIdChange: (id: string) => void
  onKeywordChange: (val: string) => void
  onCategoryChange: (val: string) => void
  onPriceMinChange: (val: string) => void
  onPriceMaxChange: (val: string) => void
  onSortFieldsChange: (val: string) => void
  onTagsChange?: (val: string) => void
  onResetFilters: () => void
  onUpload: () => void
  onBackgroundsChange?: () => void
}

const CATEGORIES = [
  { value: "", label: "全部分类" },
  { value: "fushi", label: "服装" },
  { value: "shuma", label: "数码" },
  { value: "jiaju", label: "家居" },
  { value: "meizhuang", label: "美妆" },
  { value: "shipin", label: "食品" },
  { value: "yundong", label: "运动" },
  { value: "muying", label: "母婴" },
  { value: "wenju", label: "文具" },
] as const

export function ImageUploadCard({
  backgrounds,
  selectedBgId,
  selectedFile,
  previewUrl,
  isUploading,
  keyword,
  category,
  priceMin,
  priceMax,
  sortFields,
  tags,
  onFileSelect,
  onSelectedBgIdChange,
  onKeywordChange,
  onCategoryChange,
  onPriceMinChange,
  onPriceMaxChange,
  onSortFieldsChange,
  onTagsChange,
  onResetFilters,
  onUpload,
  onBackgroundsChange,
}: ImageUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }
      onFileSelect(file)
    },
    [onFileSelect]
  )

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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">上传图片</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Upload zone */}
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
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
                className="max-h-44 max-w-full rounded-xl object-contain"
              />
              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
            </div>
          ) : (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <RiUploadCloudLine className="size-8 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-base font-medium">
                  点击上传或拖拽文件到此处
                </p>
                <p className="text-sm text-muted-foreground">
                  支持 PNG、JPG、WEBP 格式，最大 20MB
                </p>
              </div>
            </>
          )}
        </div>

        {/* Background selection + Upload button */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  背景
                </label>
                {onBackgroundsChange && (
                  <BackgroundUploadSheet onSuccess={onBackgroundsChange} />
                )}
              </div>
              <Select value={selectedBgId} onValueChange={onSelectedBgIdChange}>
                <SelectTrigger className="h-11 w-full text-sm">
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
              onClick={onUpload}
              disabled={!selectedFile || isUploading}
              size="default"
              className="h-11 px-8 text-sm"
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

          {/* 1688 search filters */}
          <div className="flex flex-col gap-4 rounded-lg bg-muted/30 p-5">
            <div className="flex items-center gap-2">
              <RiSearchLine className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                1688 搜索筛选（可选）
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
              {/* Keyword */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground/70">
                  关键词
                </label>
                <Input
                  placeholder="商品名称"
                  value={keyword}
                  onChange={(e) => onKeywordChange(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground/70">
                  类目
                </label>
                <Select value={category} onValueChange={onCategoryChange}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="全部分类" />
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

              {/* Price range */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground/70">
                  价格
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="最低"
                    value={priceMin}
                    onChange={(e) => onPriceMinChange(e.target.value)}
                    className="h-10 flex-1 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">—</span>
                  <Input
                    type="number"
                    placeholder="最高"
                    value={priceMax}
                    onChange={(e) => onPriceMaxChange(e.target.value)}
                    className="h-10 flex-1 text-sm"
                  />
                </div>
              </div>

              {/* Sort + Reset */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-muted-foreground/70">
                  排序
                </label>
                <div className="flex gap-1.5">
                  <Select value={sortFields} onValueChange={onSortFieldsChange}>
                    <SelectTrigger className="h-10 flex-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale_amount:desc">销量优先</SelectItem>
                      <SelectItem value="price:asc">价格从低到高</SelectItem>
                      <SelectItem value="price:desc">价格从高到低</SelectItem>
                      <SelectItem value="">默认排序</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-3 text-sm text-muted-foreground"
                    onClick={onResetFilters}
                  >
                    <RiResetRightLine className="size-4" />
                    重置
                  </Button>
                </div>
              </div>
            </div>

            {/* Tags (second row) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground/70">
                Tags
              </label>
              <Input
                placeholder="标签筛选，多个用逗号分隔"
                value={tags ?? ""}
                onChange={(e) => onTagsChange?.(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
