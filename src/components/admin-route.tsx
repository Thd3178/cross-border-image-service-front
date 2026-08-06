import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Admin 布局守卫。包住所有 `/admin/*` 子路由：
 *   - 未登录 → 跳 /login
 *   - 非 admin → 跳 / （回首页，避免暴露 admin 路由存在）
 *   - loading 中 → 骨架屏，避免闪一下内容
 *
 * 子路由直接挂在 `<Outlet />` 下，由各自的 admin 页面组件负责
 * 自己的 layout（当前各 admin 页面共享父布局 `AdminLayout`）。
 */
export function AdminRoute() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}
