import { useCallback, useEffect, useState } from "react"
import {
  adminApi,
  type Announcement,
  type AnnouncementStatus,
} from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Pager } from "@/components/pager"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
} from "@remixicon/react"

const PAGE_SIZE = 20

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  PUBLISHED: "已发布",
  DRAFT: "起草",
  ARCHIVED: "归档",
}

const STATUS_VARIANT: Record<
  AnnouncementStatus,
  "default" | "secondary" | "outline"
> = {
  PUBLISHED: "default",
  DRAFT: "outline",
  ARCHIVED: "secondary",
}

interface EditForm {
  id: number | null
  title: string
  content: string
  popup: 0 | 1
  status: AnnouncementStatus
}

const EMPTY_FORM: EditForm = {
  id: null,
  title: "",
  content: "",
  popup: 0,
  status: "DRAFT",
}

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchList = useCallback((page: number) => {
    setLoading(true)
    adminApi
      .listAnnouncements(page, PAGE_SIZE)
      .then((res) => {
        const p = res.data.data
        setRows(p.rows)
        setTotal(p.total)
      })
      .catch(() => {
        setRows([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList(current)
  }, [current, fetchList])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setPreviewMode(false)
    setEditOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setForm({
      id: a.id,
      title: a.title,
      content: a.content,
      popup: a.popup as 0 | 1,
      status: a.status,
    })
    setPreviewMode(false)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      if (form.id == null) {
        await adminApi.createAnnouncement({
          title: form.title,
          content: form.content,
          popup: form.popup,
          status: form.status,
        })
      } else {
        await adminApi.updateAnnouncement(form.id, {
          title: form.title,
          content: form.content,
          popup: form.popup,
          status: form.status,
        })
      }
      setEditOpen(false)
      fetchList(current)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (a: Announcement) => {
    try {
      await adminApi.updateAnnouncement(a.id, { status: "PUBLISHED" })
      setRows((prev) =>
        prev.map((r) => (r.id === a.id ? { ...r, status: "PUBLISHED" } : r))
      )
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await adminApi.deleteAnnouncement(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setTotal((t) => Math.max(0, t - 1))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">公告管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            起草 / 发布 / 归档 / 删除 全站公告，含进站弹窗开关。
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <RiAddLine /> 新建公告
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>弹窗</TableHead>
                  <TableHead>发布时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground"
                    >
                      暂无公告
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">
                        {a.id}
                      </TableCell>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[a.status]}>
                          {STATUS_LABEL[a.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.popup === 1 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            是
                          </span>
                        ) : (
                          <span className="text-muted-foreground">否</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.publishedAt
                          ? new Date(a.publishedAt).toLocaleString("zh-CN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {a.status !== "PUBLISHED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handlePublish(a)}
                            >
                              发布
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openEdit(a)}
                          >
                            <RiEditLine />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs hover:text-destructive"
                            disabled={deletingId === a.id}
                            onClick={() => handleDelete(a.id)}
                          >
                            <RiDeleteBinLine />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && total > 0 && (
        <Pager
          current={current}
          total={total}
          size={PAGE_SIZE}
          onPageChange={setCurrent}
        />
      )}

      {/* 编辑/新建 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              {form.id == null ? "新建公告" : `编辑公告 #${form.id}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">标题</label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="公告标题"
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">状态</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as AnnouncementStatus,
                    }))
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="DRAFT">起草</option>
                  <option value="PUBLISHED">已发布</option>
                  <option value="ARCHIVED">归档</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">进站弹窗</label>
                <select
                  value={form.popup}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      popup: Number(e.target.value) as 0 | 1,
                    }))
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value={0}>否</option>
                  <option value={1}>是</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={previewMode ? "outline" : "secondary"}
                  onClick={() => setPreviewMode(false)}
                >
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant={previewMode ? "secondary" : "outline"}
                  onClick={() => setPreviewMode(true)}
                >
                  <RiEyeLine /> 预览
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                正文（Markdown）
              </label>
              {previewMode ? (
                <div className="min-h-[240px] rounded-md border bg-muted/30 p-3 text-sm leading-6">
                  <MarkdownRenderer content={form.content} />
                </div>
              ) : (
                <Textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  placeholder="支持 GFM Markdown"
                  rows={12}
                  className="font-mono text-xs"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.content.trim()}
            >
              {saving ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
