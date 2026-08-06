import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface PagerProps {
  /** 当前页（1-based） */
  current: number
  /** 总条数 */
  total: number
  /** 每页条数 */
  size: number
  /** 翻页回调；传入下一个 current */
  onPageChange: (next: number) => void
  /**
   * 翻页语义。`row`: 直接传入新的页码；`prev`/`next`: 由本组件自行
   * 计算 +/-1。本组件内部已统一为「直接传页码」, 见 onPageChange。
   *
   * 支持 PageRows（不带 pages 字段）与 PageResult（带 pages 字段）双契约
   * —— 只要给 current/total/size 即可算出总页数。
   */
}

/**
 * 轻量翻页器。复用 shadcn pagination 的视觉 token，但把原本 `<a href>`
 * 改成 `<button onClick>` 以适配 SPA 语义（避免整页刷新）。
 *
 * 使用方在 DESIGN.md Section 5 已登记为复用组件（公告列表 + admin 各列表）。
 */
export function Pager({ current, total, size, onPageChange }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  if (totalPages <= 1) return null

  const canPrev = current > 1
  const canNext = current < totalPages

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="上一页"
            className={
              canPrev
                ? "cursor-pointer"
                : "pointer-events-none opacity-50"
            }
            onClick={(e) => {
              e.preventDefault()
              if (canPrev) onPageChange(current - 1)
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="text-xs text-muted-foreground px-2">
            第 {current} / {totalPages} 页（共 {total} 条）
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            text="下一页"
            className={
              canNext
                ? "cursor-pointer"
                : "pointer-events-none opacity-50"
            }
            onClick={(e) => {
              e.preventDefault()
              if (canNext) onPageChange(current + 1)
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
