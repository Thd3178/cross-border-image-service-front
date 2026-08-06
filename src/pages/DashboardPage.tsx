import { useEffect, useState } from "react"
import { toast } from "sonner"

import { adminApi, imageApi, type DashboardStats } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { SectionCards } from "@/components/section-cards"
import { CostDailyCharts } from "@/components/cost-daily-charts"

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  // ── Dashboard stats ──
  const [stats, setStats] = useState<DashboardStats | null>(null)

  // ── Fetch dashboard stats ──
  // admin 看全站口径 (无 userId 过滤), 普通用户看自己口径
  useEffect(() => {
    const req = isAdmin ? adminApi.dashboardStats() : imageApi.stats()
    req
      .then((res) => setStats(res.data.data))
      .catch((err: Error) =>
        toast.error("加载统计数据失败", { description: err.message })
      )
  }, [isAdmin])

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-6 @container" style={{ containerName: "main" }}>
      {/* ── Cost Daily Charts (top) ── */}
      <CostDailyCharts />

      {/* ── Stat Cards (bottom) ── */}
      <SectionCards
        stats={stats ?? { completedTasks: 0, totalTasks: 0, totalExpense: 0, backgroundCount: 0, segmentedCount: 0, qaFailedCount: 0, qaPassedCount: 0, processedCount: 0, qwenProcessedCount: 0 }}
      />
    </div>
  )
}
