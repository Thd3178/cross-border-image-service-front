import * as React from "react"
import { Link } from "react-router-dom"

import { NavDocuments } from "@/components/nav-documents"
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
  RiImageEditLine,
  RiUploadCloudLine,
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
  documents: [
    {
      name: "使用指南",
      url: "/guide",
      icon: <RiQuestionLine />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const currentUser = {
    name: user?.nickname || user?.username || "用户",
    email: `${user?.username || "user"}@example.com`,
    avatar: "",
  }

  const navMainWithActive = data.navMain.map((item) => ({
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
                <RiImageEditLine className="size-5!" />
                <span className="text-base font-semibold">
                  图片处理站
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
