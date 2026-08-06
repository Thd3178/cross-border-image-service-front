import * as React from "react"
import { Link } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  RiDashboardLine,
  RiListUnordered,
  RiSettingsLine,
  RiQuestionLine,
  RiAddCircleLine,
  RiUploadCloudLine,
  RiNotification3Line,
  RiChat3Line,
  RiAdminLine,
  RiTeamLine,
  RiTaskLine,
  RiKey2Line,
} from "@remixicon/react"
import { useAuth } from "@/lib/auth-context"

const data = {
  navMain: [
    {
      title: "仪表盘",
      url: "/dashboard",
      icon: <RiDashboardLine />,
    },
    {
      title: "快速创建",
      url: "/quick-create",
      icon: <RiAddCircleLine />,
    },
    {
      title: "背景上传",
      url: "/backgrounds",
      icon: <RiUploadCloudLine />,
    },
    {
      title: "任务列表",
      url: "/tasks",
      icon: <RiListUnordered />,
    },
    {
      title: "系统公告",
      url: "/announcements",
      icon: <RiNotification3Line />,
    },
    {
      title: "联系客服",
      url: "/chat",
      icon: <RiChat3Line />,
    },
  ],
  navAdmin: [
    {
      title: "用户管理",
      url: "/admin/users",
      icon: <RiTeamLine />,
    },
    {
      title: "任务管理",
      url: "/admin/tasks",
      icon: <RiTaskLine />,
    },
    {
      title: "公告管理",
      url: "/admin/announcements",
      icon: <RiAdminLine />,
    },
    {
      title: "客服会话",
      url: "/admin/chat",
      icon: <RiChat3Line />,
    },
    {
      title: "Token 管理",
      url: "/admin/tokens",
      icon: <RiKey2Line />,
    },
  ],
  navSecondary: [
    {
      title: "设置",
      url: "#",
      icon: <RiSettingsLine />,
    },
    {
      title: "帮助",
      url: "#",
      icon: <RiQuestionLine />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isAdmin } = useAuth()

  const currentUser = {
    name: user?.nickname || user?.username || "用户",
    email: `${user?.username || "user"}@example.com`,
    avatar: "",
  }

  const navMainWithActive = data.navMain
    // admin 看全站视角，普通用户的"系统公告"和"联系客服"这两项个人入口对 admin 无意义，隐藏。
    // admin 有对应的后台管理页面（公告管理 / 客服会话），不再走用户侧入口。
    .filter((item) => !isAdmin || (item.url !== "/announcements" && item.url !== "/chat"))
    .map((item) => ({
      ...item,
      url: item.url,
    }))

  const navAdminWithActive = data.navAdmin.map((item) => ({
    ...item,
    url: item.url,
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/dashboard">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="logo"
                  className="size-5! object-contain"
                />
                <span className="text-base font-semibold">
                  行知澜ParaWave
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              管理员
            </div>
            <NavMain items={navAdminWithActive} />
          </>
        )}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
