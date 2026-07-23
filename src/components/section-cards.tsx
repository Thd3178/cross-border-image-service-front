"use client"

import type { DashboardStats } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RiArrowUpLine, RiArrowDownLine } from "@remixicon/react"

function fmt(n: number): string {
  if (n >= 1_0000) return (n / 1_0000).toFixed(1) + "万"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

function toCNY(n: number): string {
  return "¥" + n.toFixed(2)
}

interface SectionCardsProps {
  stats: DashboardStats
}

export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>图片处理总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.completedTasks)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {stats.completedTasks}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            累计处理{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">所有已完成的图片处理任务</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>任务总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.totalTasks)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {stats.totalTasks}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            全部任务{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">包含进行中和已完成</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>总支出</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {toCNY(stats.totalExpense)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowDownLine />
              {toCNY(stats.totalExpense)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            本月消耗{" "}
            <RiArrowDownLine className="size-4" />
          </div>
          <div className="text-muted-foreground">包含 API 调用和资源费用</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>上传背景</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.backgroundCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {stats.backgroundCount}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            可用背景{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">当前可选的背景模板数量</div>
        </CardFooter>
      </Card>
    </div>
  )
}
