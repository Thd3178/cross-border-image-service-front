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
    <>
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>任务处理总数</CardDescription>
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
              累计 · {toCNY(stats.totalExpense)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            累计消耗
          </div>
          <div className="text-muted-foreground">统计自使用本系统起的全部费用（含 Qwen 视觉接管）</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Qwen 接管图片总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.qwenProcessedCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {fmt(stats.qwenProcessedCount)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            视觉接管{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">跳过分割/质检/合成，由 Qwen-image-2.0 直接出图</div>
        </CardFooter>
      </Card>
    </div>

    {/* ── Item-level stat cards (second row) ── */}
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>分割完成图片总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.segmentedCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {fmt(stats.segmentedCount)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            已成功去除背景{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">已完成阿里云分割的商品图片</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>质检成功图片总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.qaPassedCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {fmt(stats.qaPassedCount)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            通过质检{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">豆包检验合规，无需额外处理</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>质检失败图片总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.qaFailedCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowDownLine />
              {fmt(stats.qaFailedCount)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            存在违规{" "}
            <RiArrowDownLine className="size-4" />
          </div>
          <div className="text-muted-foreground">包含严重违规，需人工介入处理</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>处理完成图片总数</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(stats.processedCount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <RiArrowUpLine />
              {fmt(stats.processedCount)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            已完成合成{" "}
            <RiArrowUpLine className="size-4" />
          </div>
          <div className="text-muted-foreground">已合成背景并输出最终图片</div>
        </CardFooter>
      </Card>
    </div>

    {/* ── Qwen takeover card moved to first row (replaced 上传背景 slot) ── */}
    </>
  )
}
