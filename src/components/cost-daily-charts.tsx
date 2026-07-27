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
    title: "Qwen 接管成本 (元)",
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

  // 若后端尚未返回（首次加载或 fetch 失败），用 mock 填充到选定范围的天数，保证
  // 折线图不缺日期. useMemo 缓存避免每次 render 都重抽随机数导致折线抖动 (审查 L4).
  const mockData = React.useMemo(
    () => generateMockCostDaily(timeRangeDays),
    [timeRangeDays]
  )
  const sourceData = propData ?? apiData ?? mockData

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
  // NOTE: 后端 CostService.getDailyCost 已按 timeRangeDays 严格填充 today-6..today 共 N 个
  // 日期 (含 0 数据的空格), 这里若再用 new Date(dateStr) 跨 UTC↔本地时区比较, 时区跨夜会让
  // 最早一格被误过滤, 表现为"今天之前一天不显示". 直接复用后端 / mock 返回的全集即可.
  // 当切到其他 toggle (7/30/90d) 时, useEffect 已重拉数据, sourceData 与 timeRange 一致,
  // 不需要客户端二次过滤.
  const filteredData = chartData

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
              minTickGap={16}
              // 强制 domain = 日期最小到最大, 避免最早一格被 recharts 默认 padding 裁掉
              domain={["dataMin", "dataMax"]}
              padding={{ left: 0, right: 0 }}
              tickFormatter={(value: string) => {
                // 直接用字符串前 5 位 ("MM-dd" 风格), 避免 new Date("2026-07-27") 的 UTC
                // → 本地时区跨夜把 7/27 0:00 UTC 解析成 7/27 08:00 CST, XAxis tick 又被 recharts
                // 内部按 Date 对象比较, UTC 误差会让最早的 tick 跳一格, 表现为"前一天不显示".
                const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
                if (m) return `${m[2]}/${m[3]}`
                // 兜底: 走原路径
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
                  labelFormatter={(value) => {
                    const label = typeof value === "string" ? value : String(value ?? "")
                    // 兜底正则解 "yyyy-MM-dd", 避免 new Date("2026-07-27") 的 UTC 0:00
                    // 在本地时区跨夜解析成 7/27 08:00, 让 tooltip label 显示错位.
                    const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/)
                    if (m) {
                      return `${m[1]} 年 ${Number(m[2])} 月 ${Number(m[3])} 日`
                    }
                    const d = new Date(label)
                    return d.toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  formatter={(value) => {
                    const v = typeof value === "number" ? value : Number(value ?? 0)
                    return (
                      <span className="font-mono font-medium tabular-nums">
                        {metric.valueFormatter(v)}
                      </span>
                    )
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={metric.dataKey}
              stroke={metric.color}
              strokeWidth={2}
              isAnimationActive={false}
              connectNulls
              // 给每个数据点画 dot: 即使只有 1 个点或值是 0, 也保证最早一格在图上可见,
              // 不再因"line 单段过短被 XAxis padding 裁掉"而表现为缺一格.
              dot={{
                r: 2,
                fill: metric.color,
                strokeWidth: 0,
              }}
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
