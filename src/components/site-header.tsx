import { useLocation } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titleMap: Record<string, string> = {
  "/dashboard": "仪表盘",
  "/quick-create": "快速创建",
  "/tasks": "任务列表",
  "/backgrounds": "背景上传",
  "/guide": "使用指南",
}

export function SiteHeader() {
  const location = useLocation()
  const title = titleMap[location.pathname] || "跨境商品图片处理"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-4"
        />

        {/* 品牌区: Logo + 并行·行知澜智能平台 */}
        <div className="flex items-center gap-1.5">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="logo"
            className="size-5 object-contain"
          />
          <span className="text-sm font-semibold">并行·行知澜智能平台</span>
        </div>

        {/* 分隔 + 当前页名 */}
        <span className="text-muted-foreground/70 px-0.5">-</span>
        <h1 className="text-sm font-semibold">{title}</h1>
      </div>
    </header>
  )
}
