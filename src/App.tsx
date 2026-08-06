import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import AppLayout from "@/components/app-layout"
import { AdminRoute } from "@/components/admin-route"
import { LoginPage } from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"
import QuickCreatePage from "@/pages/QuickCreatePage"
import BackgroundsPage from "@/pages/BackgroundsPage"
import TaskListPage from "@/pages/TaskListPage"
import TaskDetailPage from "@/pages/TaskDetailPage"
import ItemDetailPage from "@/pages/ItemDetailPage"
import GuidePage from "@/pages/GuidePage"
import AnnouncementsPage from "@/pages/AnnouncementsPage"
import AnnouncementDetailPage from "@/pages/AnnouncementDetailPage"
import ChatPage from "@/pages/ChatPage"
import WelcomePage from "@/pages/WelcomePage"
import AdminUsersPage from "@/pages/admin/AdminUsersPage"
import AdminTasksPage from "@/pages/admin/AdminTasksPage"
import AdminAnnouncementsPage from "@/pages/admin/AdminAnnouncementsPage"
import AdminChatPage from "@/pages/admin/AdminChatPage"
import AdminTokensPage from "@/pages/admin/AdminTokensPage"
import type { ReactNode } from "react"

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      {/* 根路径直显 Welcome 动效落地页; 点"立即体验"按登录态跳 /login 或 /dashboard.
          /welcome 别名保留以防硬编码外链/书签. 两者一起, 不在 ProtectedRoute 下. */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/quick-create" element={<QuickCreatePage />} />
        <Route path="/backgrounds" element={<BackgroundsPage />} />
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/items/:itemId" element={<ItemDetailPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route
          path="/announcements/:id"
          element={<AnnouncementDetailPage />}
        />
        <Route path="/chat" element={<ChatPage />} />

        {/* Admin 路由组：AdminRoute 内部按 isLoggedIn + isAdmin 二次守卫 */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/tasks" element={<AdminTasksPage />} />
          <Route
            path="/admin/announcements"
            element={<AdminAnnouncementsPage />}
          />
          <Route path="/admin/chat" element={<AdminChatPage />} />
          <Route path="/admin/tokens" element={<AdminTokensPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
