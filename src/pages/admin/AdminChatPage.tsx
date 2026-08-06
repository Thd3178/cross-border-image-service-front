import { useCallback, useEffect, useRef, useState } from "react"
import {
  adminApi,
  type ChatMessage,
  type ChatSession,
  type ChatSessionStatus,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  RiSendPlaneLine,
  RiCloseLine,
  RiSearchLine,
} from "@remixicon/react"

const POLL_INTERVAL_MS = 2500

const STATUS_LABEL: Record<ChatSessionStatus, string> = {
  OPEN: "进行中",
  AI_ESCALATED: "AI 接管中",
  CLOSED: "已关闭",
}

const STATUS_VARIANT: Record<
  ChatSessionStatus,
  "default" | "secondary" | "outline"
> = {
  OPEN: "default",
  AI_ESCALATED: "secondary",
  CLOSED: "outline",
}

export default function AdminChatPage() {
  // 左：会话列表 + 过滤
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [current, setCurrent] = useState(1)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [userIdFilter, setUserIdFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<ChatSessionStatus | "">("")
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)

  // 右：消息
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState("")
  const [closing, setClosing] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastIdRef = useRef<number | undefined>(undefined)

  const fetchSessions = useCallback(
    (page: number) => {
      setSessionsLoading(true)
      adminApi
        .listChatSessions({
          current: page,
          size: 50,
          userId: userIdFilter ? Number(userIdFilter) : undefined,
          status: statusFilter || undefined,
        })
        .then((res) => {
          const p = res.data.data
          setSessions(p.rows)
        })
        .catch(() => {
          setSessions([])
        })
        .finally(() => setSessionsLoading(false))
    },
    [userIdFilter, statusFilter]
  )

  useEffect(() => {
    fetchSessions(current)
  }, [current, fetchSessions])

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const loadMessagesAndPoll = useCallback(
    async (sessionId: number) => {
      stopPoll()
      setMessagesLoading(true)
      setMessages([])
      lastIdRef.current = undefined

      try {
        const res = await adminApi.listChatMessages(sessionId)
        const msgs = res.data.data
        setMessages(msgs)
        if (msgs.length > 0) {
          lastIdRef.current = msgs[msgs.length - 1].id
        }
      } catch {
        setMessages([])
      } finally {
        setMessagesLoading(false)
      }

      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await adminApi.pollChatMessages(
            sessionId,
            lastIdRef.current
          )
          const fresh = res.data.data
          if (!fresh || fresh.length === 0) return
          setMessages((prev) => {
            const merged = [...prev, ...fresh]
            lastIdRef.current = merged[merged.length - 1].id
            return merged
          })
        } catch {
          // single failure breaks the interval
        }
      }, POLL_INTERVAL_MS)
    },
    [stopPoll]
  )

  useEffect(() => {
    if (activeSessionId == null) {
      stopPoll()
      setMessages([])
      return
    }
    loadMessagesAndPoll(activeSessionId)
    return () => {
      stopPoll()
    }
  }, [activeSessionId, loadMessagesAndPoll, stopPoll])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleReply = useCallback(async () => {
    const content = draft.trim()
    if (!content || activeSessionId == null || sending) return
    setSending(true)
    const prevDraft = draft
    setDraft("")
    try {
      const res = await adminApi.replyChat(activeSessionId, content)
      const msg = res.data.data
      setMessages((prev) => {
        const next = [...prev, msg]
        lastIdRef.current = msg.id
        return next
      })
    } catch {
      setDraft(prevDraft)
    } finally {
      setSending(false)
    }
  }, [draft, activeSessionId, sending])

  const handleClose = useCallback(async () => {
    if (activeSessionId == null) return
    setClosing(true)
    try {
      await adminApi.closeChat(activeSessionId)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, status: "CLOSED" as const }
            : s
        )
      )
      stopPoll()
    } catch {
      // ignore
    } finally {
      setClosing(false)
    }
  }, [activeSessionId, stopPoll])

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const isActiveOpen = activeSession?.status === "OPEN"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">客服会话</h1>
        <p className="text-sm text-muted-foreground mt-1">
          所有用户会话，可手工接管回复、强制关闭。
        </p>
      </div>

      <div className="flex h-[calc(100vh-220px)] gap-4">
        {/* 左：会话列表 + 过滤 */}
        <Card className="w-72 shrink-0 hidden md:flex md:flex-col">
          <CardHeader>
            <CardTitle className="text-sm">会话</CardTitle>
            <div className="flex gap-2 pt-2">
              <Input
                type="number"
                placeholder="userId"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                className="h-7 text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ChatSessionStatus | "")
                }
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
              >
                <option value="">全部</option>
                <option value="OPEN">进行中</option>
                <option value="AI_ESCALATED">AI 接管</option>
                <option value="CLOSED">已关闭</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => {
                  setCurrent(1)
                  fetchSessions(1)
                }}
              >
                <RiSearchLine />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
            {sessionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : sessions.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                暂无会话
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={cn(
                    "w-full rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:bg-accent/40",
                    s.id === activeSessionId &&
                      "border-primary/30 bg-accent/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">
                      #{s.id} · {s.username || s.nickname || `user${s.userId}`}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[s.status]}
                      className="shrink-0 text-[10px]"
                    >
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {s.subject || "（无主题）"} ·{" "}
                    {new Date(s.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* 右：消息区 */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          {activeSessionId == null ? (
            <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              选择左侧会话开始查看
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
                <CardTitle className="text-sm">
                  #{activeSession?.id} ·{" "}
                  {activeSession?.username ||
                    activeSession?.nickname ||
                    (activeSession ? `user${activeSession.userId}` : "")}
                  {activeSession?.subject ? ` · ${activeSession.subject}` : ""}
                </CardTitle>
                {isActiveOpen && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={closing}
                    className="h-7 px-2 text-xs hover:text-destructive"
                  >
                    <RiCloseLine />
                    {closing ? "处理中…" : "强制关闭"}
                  </Button>
                )}
              </CardHeader>

              <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-3/4" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    该会话暂无消息
                  </p>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} msg={m} />)
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="border-t p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleReply()
                      }
                    }}
                    placeholder={
                      isActiveOpen
                        ? "客服回复，回车发送，Shift+回车换行"
                        : "会话已关闭"
                    }
                    disabled={!isActiveOpen}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Button
                    onClick={handleReply}
                    disabled={!isActiveOpen || sending || !draft.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    <RiSendPlaneLine /> 回复
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.senderType === "USER"
  const isAI = msg.senderType === "AI"
  const label = isUser ? "用户" : isAI ? "AI" : "客服"

  return (
    <div
      className={cn(
        "flex flex-col",
        isUser ? "items-start" : "items-end"
      )}
    >
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span
          className={cn(
            "font-medium",
            isUser && "text-blue-600 dark:text-blue-400",
            isAI && "text-violet-600 dark:text-violet-400",
            !isUser && !isAI && "text-primary"
          )}
        >
          {label}
        </span>
        <span>·</span>
        <span>{new Date(msg.createdAt).toLocaleTimeString("zh-CN")}</span>
      </div>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm leading-6",
          isUser
            ? "border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30"
            : isAI
              ? "border border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30"
              : "bg-primary text-primary-foreground"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
    </div>
  )
}
