import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AnnouncementsPopup } from "@/components/announcements-popup"

export default function AppLayout() {
  return (
    <TooltipProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
      {/* 登录后进站弹窗公告。内部自己判 isLoggedIn + 是否有未读 */}
      <AnnouncementsPopup />
    </SidebarProvider>
    </TooltipProvider>
  )
}
