"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
} from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { CostTrendPoint } from "@/lib/api"

// ─── Mock data: 30 days of cost trends ───

function generateMockCostData(): CostTrendPoint[] {
  const data: CostTrendPoint[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    data.push({
      date: dateStr,
      doubaoTokens: Math.floor(50000 + Math.random() * 150000),
      aliyunCalls: Math.floor(50 + Math.random() * 200),
      otherTokens: Math.floor(2000 + Math.random() * 10000),
    })
  }
  return data
}

const mockCostData = generateMockCostData()

// ─── Chart config for 3 metrics ───

const chartConfig = {
  doubaoTokens: {
    label: "Doubao Token",
    color: "var(--chart-1)",
  },
  aliyunCalls: {
    label: "阿里云调用次数",
    color: "var(--chart-2)",
  },
  otherTokens: {
    label: "其他 Token",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

// ─── Metric display helpers ───

function fmtToken(n: number): string {
  if (n >= 1_0000) return (n / 1_0000).toFixed(1) + "万"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

const METRICS = [
  {
    key: "doubaoTokens" as const,
    title: "视觉模型消耗 Token",
    desc: "Doubao 视觉模型 Token 消耗趋势",
    unit: "token",
    color: "var(--chart-1)",
    gradientId: "fillDoubao",
  },
  {
    key: "aliyunCalls" as const,
    title: "阿里云视觉调用次数",
    desc: "阿里云分割 API 调用次数（代 Token）",
    unit: "次",
    color: "var(--chart-2)",
    gradientId: "fillAliyun",
  },
  {
    key: "otherTokens" as const,
    title: "其他 Token 消耗",
    desc: "备用通道 Token 消耗趋势",
    unit: "token",
    color: "var(--chart-3)",
    gradientId: "fillOther",
  },
] as const

// ─── Component ───

export function CostTrendCharts() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("7d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = mockCostData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date(mockCostData[mockCostData.length - 1].date)
    let daysToSubtract = 90
    if (timeRange === "30d") daysToSubtract = 30
    else if (timeRange === "7d") daysToSubtract = 7
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Time range toggle */}
      <div className="flex items-center justify-end gap-2">
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(v) => v && setTimeRange(v)}
          variant="outline"
          className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
        >
          <ToggleGroupItem value="90d">最近 3 个月</ToggleGroupItem>
          <ToggleGroupItem value="30d">最近 30 天</ToggleGroupItem>
          <ToggleGroupItem value="7d">最近 7 天</ToggleGroupItem>
        </ToggleGroup>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
            size="sm"
            aria-label="选择时间范围"
          >
            <SelectValue placeholder="最近 7 天" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">最近 3 个月</SelectItem>
            <SelectItem value="30d" className="rounded-lg">最近 30 天</SelectItem>
            <SelectItem value="7d" className="rounded-lg">最近 7 天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 3 metric chart cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric) => (
          <MetricChartCard
            key={metric.key}
            metric={metric}
            data={filteredData}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Individual metric chart card ───

function MetricChartCard({
  metric,
  data,
}: {
  metric: (typeof METRICS)[number]
  data: CostTrendPoint[]
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{metric.title}</CardTitle>
        <CardDescription>{metric.desc}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
        >
          <LineChart data={data}>
            <defs>
              <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const d = new Date(value)
                return d.toLocaleDateString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                })
              }}
            />
            <ChartTooltip
              cursor={{ stroke: metric.color, strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value: string) => {
                    const d = new Date(value)
                    return d.toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  formatter={(value: number) => (
                    <span className="font-mono font-medium tabular-nums">
                      {metric.unit === "次"
                        ? `${value.toLocaleString()} 次`
                        : fmtToken(value)}
                    </span>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={metric.key}
              stroke={metric.color}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: metric.color,
                strokeWidth: 2,
                fill: "var(--background)",
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
