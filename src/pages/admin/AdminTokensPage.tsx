import { useCallback, useEffect, useState } from "react"
import { adminApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { RiEyeLine, RiEyeOffLine, RiRefreshLine } from "@remixicon/react"

const PROVIDERS = ["doubao", "qwen"] as const
type Provider = (typeof PROVIDERS)[number]

interface ProviderState {
  // 已脱敏状态：true 表示后端有 value；false 表示未配置
  hasValue: boolean
  // 编辑模式
  editing: boolean
  // 编辑中的明文 key
  draft: string
  // 是否展示从后端拉回的明文（仅在用户主动「查看」时短暂持有）
  revealed: string | null
  saving: boolean
  loading: boolean
}

const initialState = (): ProviderState => ({
  hasValue: false,
  editing: false,
  draft: "",
  revealed: null,
  saving: false,
  loading: true,
})

export default function AdminTokensPage() {
  const [states, setStates] = useState<Record<Provider, ProviderState>>({
    doubao: initialState(),
    qwen: initialState(),
  })

  // 初始：拉 listTokens 拿到各 provider 的 hasValue（不带明文）
  const fetchStatus = useCallback(async () => {
    try {
      const res = await adminApi.listTokens()
      const data = res.data.data
      setStates((prev) => {
        const next: Record<Provider, ProviderState> = { ...prev }
        for (const p of PROVIDERS) {
          const item = data[p]
          next[p] = {
            ...next[p],
            hasValue: !!item?.value,
            loading: false,
          }
        }
        return next
      })
    } catch {
      setStates((prev) => {
        const next: Record<Provider, ProviderState> = { ...prev }
        for (const p of PROVIDERS) {
          next[p] = { ...next[p], loading: false }
        }
        return next
      })
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleReveal = async (provider: Provider) => {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], loading: true },
    }))
    try {
      const res = await adminApi.getToken(provider)
      const value = res.data.data.value
      setStates((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          revealed: value,
          hasValue: true,
          loading: false,
        },
      }))
    } catch {
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], loading: false },
      }))
    }
  }

  const handleEdit = (provider: Provider) => {
    setStates((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        editing: true,
        draft: "",
        revealed: null,
      },
    }))
  }

  const handleCancelEdit = (provider: Provider) => {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], editing: false, draft: "" },
    }))
  }

  const handleSave = async (provider: Provider) => {
    const value = states[provider].draft.trim()
    if (!value) return
    setStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], saving: true },
    }))
    try {
      await adminApi.updateToken(provider, value)
      setStates((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          saving: false,
          editing: false,
          draft: "",
          hasValue: true,
          revealed: null,
        },
      }))
    } catch {
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], saving: false },
      }))
    }
  }

  const handleReset = (provider: Provider) => {
    setStates((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        revealed: null,
        editing: false,
        draft: "",
      },
    }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Token 管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          豆包 / 通义千问 API key 管理。明文仅在你主动「查看」时短暂回拉，
          更新后立即写入 Redis 生效，不重启服务。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const s = states[provider]
          return (
            <Card key={provider}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="capitalize">{provider}</span>
                  {s.loading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge variant={s.hasValue ? "default" : "outline"}>
                      {s.hasValue ? "已配置" : "未配置"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.editing ? (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      value={s.draft}
                      onChange={(e) =>
                        setStates((prev) => ({
                          ...prev,
                          [provider]: {
                            ...prev[provider],
                            draft: e.target.value,
                          },
                        }))
                      }
                      placeholder={`输入新的 ${provider} key`}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(provider)}
                        disabled={s.saving || !s.draft.trim()}
                      >
                        {s.saving ? "保存中…" : "保存"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelEdit(provider)}
                        disabled={s.saving}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {s.revealed ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="block flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                            {s.revealed}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleReset(provider)}
                          >
                            <RiEyeOffLine />
                          </Button>
                        </div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          注意：当前展示的是明文，请防止旁人窥屏。
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReveal(provider)}
                          disabled={s.loading || !s.hasValue}
                        >
                          <RiEyeLine />
                          查看明文
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEdit(provider)}
                          disabled={s.loading}
                        >
                          <RiRefreshLine />
                          {s.hasValue ? "替换" : "配置"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        注：Admin API 自身背靠 Sa-Token，已校验调用方 role=admin。
      </p>
    </div>
  )
}
