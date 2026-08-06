import { useCallback, useEffect, useRef, useState } from "react"
import {
  chatApi,
  type ChatMessage,
  type ChatSession,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  RiChat3Line,
  RiAddLine,
  RiCloseLine,
  RiEditLine,
  RiCheckLine,
  RiSendPlaneLine,
} from "@remixicon/react"

/**
 * 用户端聊天页。左侧历史会话列表，右侧选中会话的消息流 + 输入区。
 *
 * 轮询约定（见 frontend-integration.md §5）：
 *   setInterval 2.5s 调 `GET /api/chat/sessions/{id}/poll?afterId=<最后一条 id>`
 *   组件卸载 / 会话切换 / 会话关闭时清掉定时器。
 *
 * ChatMessage.senderType: USER / ADMIN / AI —— 三种渲染样式区分。
 */
const POLL_INTERVAL_MS = 2500

const STATUS_LABEL: Record<ChatSession["status"], string> = {
  OPEN: "进行中",
  AI_ESCALATED: "AI 接管中",
  CLOSED: "已关闭",
}

const STATUS_VARIANT: Record<
  ChatSession["status"],
  "default" | "secondary" | "outline"
> = {
  OPEN: "default",
  AI_ESCALATED: "secondary",
  CLOSED: "outline",
}

export default function ChatPage() {
  // 左栏：历史会话
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)

  // 右栏：当前会话消息
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState("")

  // ─── 主题内联编辑 ───
  const [editingSubject, setEditingSubject] = useState(false)
  const [subjectDraft, setSubjectDraft] = useState("")
  const [savingSubject, setSavingSubject] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastIdRef = useRef<number | undefined>(undefined)

  // ─── 初始拉会话列表 ───
  useEffect(() => {
    let cancelled = false
    setSessionsLoading(true)
    chatApi
      .mySessions(1, 50)
      .then((res) => {
        if (cancelled) return
        const rows = res.data.data.rows
        setSessions(rows)
        // 默认选中最近的 OPEN 会话；没有就空
        const firstOpen = rows.find((s) => s.status === "OPEN")
        if (firstOpen) setActiveSessionId(firstOpen.id)
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ─── 切会话：清旧、拉新、开轮询 ───
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
        const res = await chatApi.listMessages(sessionId)
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

      // 开轮询：每 2.5s 拉 afterId 之后的新消息
      pollTimerRef.current = setInterval(async () => {
        // 闭包捕获 sessionId；切会话时由外层 useEffect cleanup 调 stopPoll 清掉。
        // 这里不持 stale 优化 insurance——React 19 + 严格 cleanup 下就够用。
        try {
          const res = await chatApi.poll(sessionId, lastIdRef.current)
          const fresh = res.data.data
          if (!fresh || fresh.length === 0) return
          setMessages((prev) => {
            const merged = [...prev, ...fresh]
            lastIdRef.current = merged[merged.length - 1].id
            return merged
          })
        } catch {
          // 单次失败不打断轮询；下次再试
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

  // ─── 滚到底 ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ─── 开新会话 ───
  // 后端 openOrCreate 行为: 已有 OPEN 会话则复用返回该会话, 不会真创建新的。
  // 因此本地 setSessions 必须 **按 id 去重**: 若会话已存在只切 active, 不重复 prepend,
  // 否则同一会话会在列表里出现两份。
  const handleNewSession = useCallback(async () => {
    try {
      const res = await chatApi.openSession("")
      const session = res.data.data
      setSessions((prev) =>
        prev.some((s) => s.id === session.id) ? prev : [session, ...prev]
      )
      setActiveSessionId(session.id)
    } catch {
      // ignored: 不打断 UI
    }
  }, [])

  // ─── 关闭会话 ───
  const handleCloseSession = useCallback(async () => {
    if (activeSessionId == null) return
    const closingId = activeSessionId
    try {
      await chatApi.close(closingId)
      let nextActive: number | null = null
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === closingId ? { ...s, status: "CLOSED" as const } : s
        )
        // 关掉当前会话后,自动切到列表里第一个仍 OPEN 的会话;
        // 没有 OPEN 的就置 null,右侧现空态提示。
        const firstOpen = updated.find((s) => s.status === "OPEN")
        nextActive = firstOpen?.id ?? null
        return updated
      })
      // 切走 activeSessionId,触发外层 useEffect cleanup 	stopPoll,
      // 旧 interval 直接被 clear;同时把 UI 高亮从已关会话挪到下一个 OPEN.
      // 若 nextActive 与原 activeSessionId 相同（理论不可能，因为原会话已变 CLOSED）
      // setActiveSessionId 是同一值不会触发 effect,所以下面显式调一次 stopPoll 兜底。
      setActiveSessionId(nextActive)
      stopPoll()
    } catch {
      // ignored
    }
  }, [activeSessionId, stopPoll])

  // ─── 发送 ───
  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || activeSessionId == null || sending) return
    setSending(true)
    const prevDraft = draft
    setDraft("") // 乐观清空输入框
    try {
      const res = await chatApi.send(activeSessionId, content)
      const msg = res.data.data
      setMessages((prev) => {
        const next = [...prev, msg]
        lastIdRef.current = msg.id
        return next
      })
    } catch {
      // 失败回填草稿，用户可重试
      setDraft(prevDraft)
    } finally {
      setSending(false)
    }
  }, [draft, activeSessionId, sending])

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const isActiveOpen = activeSession?.status === "OPEN"
  // 后端 openOrCreate 复用 OPEN 会话, 列表里若已有 OPEN, 点新建也只是切过去;
  // 此时按钮禁用 + title 提示, 避免用户以为"没反应"反复点。
  const hasOpenSession = sessions.some((s) => s.status === "OPEN")

  // ─── 编辑主题 (放在 activeSession 之后, 避免 use-before-decl) ───
  const handleStartEditSubject = useCallback(() => {
    setSubjectDraft(activeSession?.subject ?? "")
    setEditingSubject(true)
  }, [activeSession?.subject])

  const handleCancelEditSubject = useCallback(() => {
    setEditingSubject(false)
    setSubjectDraft("")
  }, [])

  const handleSaveSubjectSubmit = useCallback(async () => {
    if (activeSessionId == null || savingSubject) return
    const trimmed = subjectDraft.trim()
    setSavingSubject(true)
    try {
      const res = await chatApi.updateSubject(activeSessionId, trimmed)
      const updated = res.data.data
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, subject: updated.subject } : s))
      )
      setEditingSubject(false)
      setSubjectDraft("")
    } catch {
      // 失败保留编辑态, 用户可重试
    } finally {
      setSavingSubject(false)
    }
  }, [activeSessionId, subjectDraft, savingSubject])

  return (
    <div className="flex h-[calc(100vh-180px)] gap-4 lg:h-[calc(100vh-140px)]">
      {/* 左：会话列表 */}
      <Card className="w-64 shrink-0 hidden md:flex md:flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">会话列表</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewSession}
            disabled={hasOpenSession}
            title={hasOpenSession ? "已有进行中会话，请先关闭后再开新会话" : "新建会话"}
            className="h-7 px-2"
          >
            <RiAddLine /> 新建
          </Button>
        </CardHeader>
        <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
          {sessionsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : sessions.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              没有历史会话
              <br />
              点击「新建」开始一段对话
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
                  <span className="truncate text-xs font-medium">
                    {s.subject || "（无主题）"}
                  </span>
                  <Badge
                    variant={STATUS_VARIANT[s.status]}
                    className="shrink-0 text-[10px]"
                  >
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(s.updatedAt).toLocaleString("zh-CN")}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* 右：聊天区 */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        {activeSessionId == null ? (
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <RiChat3Line className="text-4xl opacity-40" />
            <p>选择左侧会话，或点击「新建」开始</p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
              <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                {editingSubject ? (
                  <Input
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSaveSubjectSubmit()
                      }
                      if (e.key === "Escape") {
                        e.preventDefault()
                        handleCancelEditSubject()
                      }
                    }}
                    placeholder="输入会话主题"
                    disabled={savingSubject}
                    autoFocus
                    className="h-7 flex-1 max-w-[260px] text-sm"
                  />
                ) : (
                  <span className="truncate">{activeSession?.subject || "（无主题）"}</span>
                )}
                {editingSubject ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveSubjectSubmit}
                      disabled={savingSubject || !subjectDraft.trim()}
                      className="h-7 px-2"
                      title="保存"
                    >
                      <RiCheckLine />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditSubject}
                      disabled={savingSubject}
                      className="h-7 px-2 text-muted-foreground"
                      title="取消"
                    >
                      <RiCloseLine />
                    </Button>
                  </span>
                ) : (
                  isActiveOpen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartEditSubject}
                      className="h-7 px-2 text-muted-foreground"
                      title="编辑主题"
                    >
                      <RiEditLine />
                    </Button>
                  )
                )}
              </CardTitle>
              {isActiveOpen && !editingSubject && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseSession}
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                >
                  <RiCloseLine /> 结束会话
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
                  暂无消息，发条消息试试
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
                      handleSend()
                    }
                  }}
                  placeholder={
                    isActiveOpen ? "输入消息，回车发送，Shift+回车换行" : "会话已关闭"
                  }
                  disabled={!isActiveOpen}
                  rows={2}
                  className="resize-none text-sm"
                />
                <Button
                  onClick={handleSend}
                  disabled={!isActiveOpen || sending || !draft.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  <RiSendPlaneLine /> 发送
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// ─── 单条消息气泡 ───
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.senderType === "USER"
  const isAI = msg.senderType === "AI"

  const label = isUser ? "我" : isAI ? "AI" : "客服"

  // 整体靠右/靠左
  return (
    <div
      className={cn(
        "flex flex-col",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span
          className={cn(
            "font-medium",
            isUser && "text-primary",
            isAI && "text-violet-600 dark:text-violet-400",
            !isUser && !isAI && "text-blue-600 dark:text-blue-400"
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
            ? "bg-primary text-primary-foreground"
            : isAI
              ? "border border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30"
              : "border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30"
        )}
      >
        {/* 消息内容默认按白字符换行渲染 */}
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
    </div>
  )
}
