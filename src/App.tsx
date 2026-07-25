import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { LoginPage } from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"
import QuickCreatePage from "@/pages/QuickCreatePage"
import BackgroundsPage from "@/pages/BackgroundsPage"
import TaskListPage from "@/pages/TaskListPage"
import TaskDetailPage from "@/pages/TaskDetailPage"
import ItemDetailPage from "@/pages/ItemDetailPage"
import GuidePage from "@/pages/GuidePage"
import AppLayout from "@/components/app-layout"
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
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
