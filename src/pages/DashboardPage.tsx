import { useEffect, useState } from "react"
import { toast } from "sonner"

import { imageApi, type DashboardStats } from "@/lib/api"
import { SectionCards } from "@/components/section-cards"
import { CostDailyCharts } from "@/components/cost-daily-charts"

export default function DashboardPage() {
  // ── Dashboard stats ──
  const [stats, setStats] = useState<DashboardStats | null>(null)

  // ── Fetch dashboard stats ──
  useEffect(() => {
    imageApi
      .stats()
      .then((res) => setStats(res.data.data))
      .catch((err: Error) => toast.error("加载统计数据失败", { description: err.message }))
  }, [])

  return (
    <div className="flex w-full flex-col gap-6 p-4 md:p-6 @container" style={{ containerName: "main" }}>
      {/* ── Cost Daily Charts (top) ── */}
      <CostDailyCharts />

      {/* ── Stat Cards (bottom) ── */}
      <SectionCards
        stats={stats ?? { completedTasks: 0, totalTasks: 0, totalExpense: 0, backgroundCount: 0, segmentedCount: 0, qaFailedCount: 0, qaPassedCount: 0, processedCount: 0 }}
      />
    </div>
  )
}
