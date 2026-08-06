import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAnnouncementsPopup } from "@/hooks/use-announcements-popup"
import { useAuth } from "@/lib/auth-context"
import { MarkdownRenderer } from "@/components/markdown-renderer"

/**
 * 未读弹窗公告浮层。挂在 AppLayout 里，登录后自动出现。
 * Markdown 渲染走共享的 `MarkdownRenderer`（react-markdown + remark-gfm），
 * 样式与 `AnnouncementDetailPage` 一致。
 *
 * 视觉走 DESIGN.md 第 5 节登记的 Dialog 组件 + 第 7 节 borders-only。
 */
export function AnnouncementsPopup() {
  const { isLoggedIn } = useAuth()
  const { current, pendingCount, markCurrentReadAndAdvance, dismissAll } =
    useAnnouncementsPopup()

  // 没登录或没未读 → 不渲染
  if (!isLoggedIn || !current) return null

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) dismissAll()
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{current.title}</span>
            {pendingCount > 1 && (
              <span className="text-xs text-muted-foreground">
                还有 {pendingCount - 1} 条待查看
              </span>
            )}
          </DialogTitle>
          <DialogDescription asChild>
            <span>
              {current.publishedAt
                ? new Date(current.publishedAt).toLocaleString("zh-CN")
                : ""}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-2 text-sm leading-6">
          <MarkdownRenderer content={current.content ?? ""} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={dismissAll}>
            稍后再看
          </Button>
          <Button onClick={markCurrentReadAndAdvance}>
            {pendingCount > 1 ? "我知道了（下一条）" : "我知道了"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
