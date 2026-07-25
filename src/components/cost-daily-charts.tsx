"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

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
import type { CostDailyPoint } from "@/lib/api"
import { costApi } from "@/lib/api"

// ─── Mock data: fallback when API unavailable ───

function generateMockCostDaily(days = 7): CostDailyPoint[] {
  const data: CostDailyPoint[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    data.push({
      date: dateStr,
      promptTokens: Math.floor(30000 + Math.random() * 100000),
      completionTokens: Math.floor(2000 + Math.random() * 15000),
      segmentCalls: Math.floor(30 + Math.random() * 120),
      costYuan: parseFloat((0.1 + Math.random() * 0.8).toFixed(4)),
      qwenCostYuan: parseFloat((Math.random() * 0.2).toFixed(4)),
    })
  }
  return data
}

// ─── Chart config for 3 metrics ───

const chartConfig = {
  totalTokens: {
    label: "Token 总量",
    color: "var(--chart-1)",
  },
  segmentCalls: {
    label: "阿里云调用次数",
    color: "var(--chart-2)",
  },
  qwenCostYuan: {
    label: "Qwen 接管成本 (元)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

// ─── Unit helpers ───

function fmtToken(n: number): string {
  if (n >= 1_0000) return (n / 1_0000).toFixed(1) + "万"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

function fmtYuan(n: number): string {
  return "¥" + n.toFixed(4)
}

// ─── Metric definitions ───

const METRICS = [
  {
    key: "totalTokens" as const,
    title: "视觉模型 Token 消耗",
    desc: "Doubao 模型每日 Prompt + Completion 总量",
    unit: "token",
    color: "var(--chart-1)",
    gradientId: "fillCostTokens",
    dataKey: "totalTokens" as const,
    valueFormatter: (v: number) => fmtToken(v),
  },
  {
    key: "segmentCalls" as const,
    title: "阿里云视觉调用次数",
    desc: "阿里云分割 API 每日调用次数",
    unit: "次",
    color: "var(--chart-2)",
    gradientId: "fillCostCalls",
    dataKey: "segmentCalls" as const,
    valueFormatter: (v: number) => `${v.toLocaleString()} 次`,
  },
  {
    key: "qwenCostYuan" as const,
    title: "Qwen 接管 Token 消耗",
    desc: "Qwen-image-2.0 视觉接管每日累计成本（元）",
    unit: "元",
    color: "var(--chart-3)",
    gradientId: "fillCostQwen",
    dataKey: "qwenCostYuan" as const,
    valueFormatter: (v: number) => fmtYuan(v),
  },
] as const

// ─── Props ───

interface CostDailyChartsProps {
  data?: CostDailyPoint[]
}

// ─── Component ───

export function CostDailyCharts({ data: propData }: CostDailyChartsProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("7d")
  const [apiData, setApiData] = React.useState<CostDailyPoint[] | null>(null)

  // Fetch from backend API on mount; fall back to mock on error
  React.useEffect(() => {
    const days = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7
    costApi
      .daily(days)
      .then((res) => setApiData(res.data.data))
      .catch(() => {
        // silent fail — mock fallback computed lazily below
        setApiData(null)
      })
  }, [timeRange])

  // 当前选中的天数（7/30/90）—— 用于 mock fallback 时按需生成对应天数
  const timeRangeDays = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7

  // 若后端尚未返回（首次加载或 fetch 失败），用 mock 填充到选定范围的天数，保证折线图不缺日期
  const sourceData = propData ?? apiData ?? generateMockCostDaily(timeRangeDays)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // Build derived data: totalTokens = promptTokens + completionTokens
  // qwenCostYuan 直接来自后端字段（Qwen 视觉接管每日累计成本，单位元）
  const chartData = React.useMemo(
    () =>
      sourceData.map((d) => ({
        ...d,
        totalTokens: d.promptTokens + d.completionTokens,
        qwenCostYuan: d.qwenCostYuan ?? 0,
      })),
    [sourceData]
  )

  // Filter by time range
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date(chartData[chartData.length - 1].date)
    let daysToSubtract = 90
    if (timeRange === "30d") daysToSubtract = 30
    else if (timeRange === "7d") daysToSubtract = 7
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Section header + toggle */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">成本趋势</h3>
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
            <SelectItem value="90d" className="rounded-lg">
              最近 3 个月
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              最近 30 天
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              最近 7 天
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 3 cost metric chart cards */}
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
  data: Array<{
    date: string
    totalTokens: number
    segmentCalls: number
    qwenCostYuan: number
  }>
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
              <linearGradient
                id={metric.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={metric.color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={metric.color}
                  stopOpacity={0.02}
                />
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
              cursor={{
                stroke: metric.color,
                strokeDasharray: "3 3",
              }}
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
                      {metric.valueFormatter(value)}
                    </span>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={metric.dataKey}
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
