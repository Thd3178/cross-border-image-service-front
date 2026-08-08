import { useCallback, useEffect, useState } from "react"
import { adminApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { RiEyeLine, RiEyeOffLine, RiRefreshLine } from "@remixicon/react"

// 所有受管 token. 所有 token 都走 /api/admin/tokens/{endpoint} 的 GET/PUT.
// 1688-access / 1688-refresh 在后端是专门端点 (字面量优先于 {provider} 变量),
// ali1688-app-key / ali1688-app-secret / doubao / qwen 走通用 ApiKeyProvider 端点.
interface TokenDef {
  key: string
  label: string
  endpoint: string
  // listTokens 返回里的状态字段名 (boolean). 1688 系列 bucket 是 "1688",
  // 其余 bucket 是 provider 名本身.
  statusBucket: string
  statusField: string
}

const TOKENS: TokenDef[] = [
  // 1688
  { key: "1688-access", label: "1688 Access Token", endpoint: "1688-access", statusBucket: "1688", statusField: "has_access_token" },
  { key: "1688-refresh", label: "1688 Refresh Token", endpoint: "1688-refresh", statusBucket: "1688", statusField: "has_refresh_token" },
  { key: "ali1688-app-key", label: "1688 App Key", endpoint: "ali1688-app-key", statusBucket: "1688", statusField: "has_app_key" },
  { key: "ali1688-app-secret", label: "1688 App Secret", endpoint: "ali1688-app-secret", statusBucket: "1688", statusField: "has_app_secret" },
  // Doubao / Qwen API Keys
  { key: "doubao", label: "豆包 API Key", endpoint: "doubao", statusBucket: "doubao", statusField: "has_value" },
  { key: "qwen", label: "通义千问 API Key", endpoint: "qwen", statusBucket: "qwen", statusField: "has_value" },
  // Prompts (问题 4: admin 可热更. 复用 ApiKeyProvider 端点, 与 Api Key 走同一套 Redis 优先 / yaml 兜底机制)
  { key: "doubao-prompt", label: "豆包质检 Prompt", endpoint: "doubao-prompt", statusBucket: "doubao-prompt", statusField: "has_value" },
  { key: "qwen-prompt", label: "通义千问编辑 Prompt", endpoint: "qwen-prompt", statusBucket: "qwen-prompt", statusField: "has_value" },
]

interface TokenState {
  hasValue: boolean
  editing: boolean
  draft: string
  revealed: string | null
  saving: boolean
  loading: boolean
}

const initialState = (): TokenState => ({
  hasValue: false,
  editing: false,
  draft: "",
  revealed: null,
  saving: false,
  loading: true,
})

export default function AdminTokensPage() {
  const [states, setStates] = useState<Record<string, TokenState>>(() => {
    const init: Record<string, TokenState> = {}
    for (const t of TOKENS) init[t.key] = initialState()
    return init
  })

  // 初始：拉 listTokens 拿到 hasValue
  const fetchStatus = useCallback(async () => {
    try {
      const res = await adminApi.listTokens()
      const data = res.data.data as Record<string, Record<string, unknown>>
      setStates((prev) => {
        const next: Record<string, TokenState> = { ...prev }
        for (const t of TOKENS) {
          const bucket = data[t.statusBucket]
          const has = bucket ? !!bucket[t.statusField] : false
          next[t.key] = { ...next[t.key], hasValue: has, loading: false }
        }
        return next
      })
    } catch {
      setStates((prev) => {
        const next: Record<string, TokenState> = { ...prev }
        for (const t of TOKENS) next[t.key] = { ...next[t.key], loading: false }
        return next
      })
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleReveal = async (t: TokenDef) => {
    setStates((prev) => ({ ...prev, [t.key]: { ...prev[t.key], loading: true } }))
    try {
      const value = (await adminApi.getToken(t.endpoint)).data.data.value
      setStates((prev) => ({
        ...prev,
        [t.key]: { ...prev[t.key], revealed: value, hasValue: true, loading: false },
      }))
    } catch {
      setStates((prev) => ({ ...prev, [t.key]: { ...prev[t.key], loading: false } }))
    }
  }

  const handleEdit = (t: TokenDef) => {
    setStates((prev) => ({
      ...prev,
      [t.key]: { ...prev[t.key], editing: true, draft: "", revealed: null },
    }))
  }

  const handleCancelEdit = (t: TokenDef) => {
    setStates((prev) => ({ ...prev, [t.key]: { ...prev[t.key], editing: false, draft: "" } }))
  }

  const handleSave = async (t: TokenDef) => {
    const value = states[t.key].draft.trim()
    if (!value) return
    setStates((prev) => ({ ...prev, [t.key]: { ...prev[t.key], saving: true } }))
    try {
      await adminApi.updateToken(t.endpoint, value)
      setStates((prev) => ({
        ...prev,
        [t.key]: {
          ...prev[t.key],
          saving: false,
          editing: false,
          draft: "",
          hasValue: true,
          revealed: null,
        },
      }))
    } catch {
      setStates((prev) => ({ ...prev, [t.key]: { ...prev[t.key], saving: false } }))
    }
  }

  const handleReset = (t: TokenDef) => {
    setStates((prev) => ({
      ...prev,
      [t.key]: { ...prev[t.key], revealed: null, editing: false, draft: "" },
    }))
  }

  // 把 token 分三组: 1688 / AI Key / Prompt 模板
  const group1688 = TOKENS.filter((t) => t.key.includes("1688"))
  const promptsKeys = new Set(["doubao-prompt", "qwen-prompt"])
  const groupAi = TOKENS.filter((t) => !t.key.includes("1688") && !promptsKeys.has(t.key))
  const groupPrompts = TOKENS.filter((t) => promptsKeys.has(t.key))

  const renderCard = (t: TokenDef) => {
    const s = states[t.key]
    const isPrompt = t.key.endsWith("-prompt")
    return (
      <Card key={t.key}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>{t.label}</span>
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
              {isPrompt ? (
                <Textarea
                  value={s.draft}
                  onChange={(e) =>
                    setStates((prev) => ({
                      ...prev,
                      [t.key]: { ...prev[t.key], draft: e.target.value },
                    }))
                  }
                  placeholder={`输入新的 ${t.label}`}
                  rows={8}
                  className="min-h-40 resize-y whitespace-pre-wrap break-words font-mono text-xs"
                />
              ) : (
                <Input
                  type="password"
                  value={s.draft}
                  onChange={(e) =>
                    setStates((prev) => ({
                      ...prev,
                      [t.key]: { ...prev[t.key], draft: e.target.value },
                    }))
                  }
                  placeholder={`输入新的 ${t.label}`}
                  className="font-mono text-xs"
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave(t)} disabled={s.saving || !s.draft.trim()}>
                  {s.saving ? "保存中…" : "保存"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelEdit(t)}
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
                    {isPrompt ? (
                      <Textarea
                        readOnly
                        value={s.revealed}
                        rows={8}
                        className="min-h-40 flex-1 resize-y whitespace-pre-wrap break-words bg-muted font-mono text-xs"
                      />
                    ) : (
                      <code className="block flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                        {s.revealed}
                      </code>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleReset(t)}
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
                    onClick={() => handleReveal(t)}
                    disabled={s.loading || !s.hasValue}
                  >
                    <RiEyeLine />
                    查看明文
                  </Button>
                  <Button size="sm" onClick={() => handleEdit(t)} disabled={s.loading}>
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
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Token 管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          1688 (AppKey/AppSecret/Access/Refresh) + AI 服务 (豆包/通义千问) 凭证管理。
          明文仅在你主动「查看」时短暂回拉，更新后立即写入 Redis 生效，不重启服务。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">1688 跨境选品</h2>
        <div className="grid gap-4 md:grid-cols-2">{group1688.map(renderCard)}</div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">AI 服务</h2>
        <div className="grid gap-4 md:grid-cols-2">{groupAi.map(renderCard)}</div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Prompt 模板</h2>
        <p className="text-xs text-muted-foreground -mt-1">
          豆包质检判定口径与 Qwen 图像编辑策略的提示词模板。改后立即生效（写 Redis），重启回退到代码内默认模板。
        </p>
        <div className="grid gap-4 md:grid-cols-2">{groupPrompts.map(renderCard)}</div>
      </section>

      <p className="text-xs text-muted-foreground">
        注：Admin API 自身背靠 Sa-Token，已校验调用方 role=admin。
      </p>
    </div>
  )
}
