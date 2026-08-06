import { useEffect, useState, useCallback } from "react"
import { announcementApi, type Announcement } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

/**
 * 进站拉未读弹窗公告。仅在 `isLoggedIn === true` 时触发一次，
 * `user` 切换（登出再换号登录）会重新拉。
 *
 * 后端 POST /{id}/read 是幂等的，本地不再做去重缓存——重复拉到 popup
 * 列表里已读条目后端自然会过滤掉（unread popup 的语义由后端保证）。
 */
export function useAnnouncementsPopup() {
  const { isLoggedIn } = useAuth()
  const [queue, setQueue] = useState<Announcement[]>([])
  const [current, setCurrent] = useState<Announcement | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 登录态变化时拉一次
  useEffect(() => {
    if (!isLoggedIn) {
      setQueue([])
      setCurrent(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    announcementApi
      .popup()
      .then((res) => {
        if (cancelled) return
        const list = res.data.data ?? []
        setQueue(list)
        setCurrent(list[0] ?? null)
      })
      .catch(() => {
        if (cancelled) return
        // 拉弹窗失败不阻塞主流程
        setQueue([])
        setCurrent(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const markCurrentReadAndAdvance = useCallback(async () => {
    const cur = current
    if (!cur) return
    // 后端幂等, 失败也不阻塞弹窗推进
    try {
      await announcementApi.markRead(cur.id)
    } catch {
      // ignore
    }
    setQueue((prev) => {
      const rest = prev.filter((a) => a.id !== cur.id)
      setCurrent(rest[0] ?? null)
      return rest
    })
  }, [current])

  const dismissAll = useCallback(() => {
    setQueue([])
    setCurrent(null)
  }, [])

  return {
    /** 全部未读（用于显示 "还有 N 条"） */
    pendingCount: queue.length,
    /** 当前要展示的公告 */
    current,
    isLoading,
    /** 标记当前已读并推进到下一条；若已是最后一条，关闭弹窗 */
    markCurrentReadAndAdvance,
    /** 直接关掉整个弹窗（不调 /read，下次登录还会弹） */
    dismissAll,
  }
}
