import type { TaskStatus } from "@/lib/api"

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "待处理", variant: "secondary" },
  SEARCHING: { label: "搜索中", variant: "default" },
  SEARCH_COMPLETED: { label: "搜索完成", variant: "default" },
  USER_SELECTING: { label: "选择商品中", variant: "default" },
  PROCESSING: { label: "处理中", variant: "default" },
  PARTIAL_COMPLETED: { label: "部分完成", variant: "default" },
  COMPLETED: { label: "已完成", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  SEARCHING: "bg-primary/10 text-primary border-primary/20",
  SEARCH_COMPLETED: "bg-primary/15 text-primary border-primary/30",
  USER_SELECTING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PROCESSING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PARTIAL_COMPLETED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
