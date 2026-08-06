import { useEffect, useState } from "react"
import { adminApi, type AdminUserVO, type UserRole } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Pager } from "@/components/pager"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RiUserLine } from "@remixicon/react"

const PAGE_SIZE = 20

const ROLE_VARIANT: Record<UserRole, "default" | "secondary"> = {
  user: "secondary",
  admin: "default",
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserVO[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [loading, setLoading] = useState(true)
  const [usernameFilter, setUsernameFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState<"user" | "admin" | "">("")
  const [kickingId, setKickingId] = useState<number | null>(null)

  const fetchUsers = (page: number) => {
    setLoading(true)
    adminApi
      .listUsers({
        current: page,
        size: PAGE_SIZE,
        username: usernameFilter || undefined,
        role: roleFilter || undefined,
      })
      .then((res) => {
        const p = res.data.data
        setRows(p.records)
        setTotal(p.total)
      })
      .catch(() => {
        setRows([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const handleKickout = async (userId: number) => {
    setKickingId(userId)
    try {
      await adminApi.kickout(userId)
      // 成功后把该用户的 online 标记为 false
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, online: false } : u))
      )
    } catch {
      // ignore
    } finally {
      setKickingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          全站用户列表、在线态、踢人下线。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">搜索条件</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">用户名</label>
            <Input
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              placeholder="精确匹配 username"
              className="h-8 w-48 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">角色</label>
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "user" | "admin" | "")
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">全部</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setCurrent(1)
              fetchUsers(1)
            }}
          >
            <RiUserLine /> 搜索
          </Button>
        </CardContent>
      </Card>

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
                  <TableHead>用户名</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>在线</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-muted-foreground"
                    >
                      无匹配用户
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">
                        {u.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {u.username}
                      </TableCell>
                      <TableCell>{u.nickname ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANT[u.role]}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            "inline-flex items-center gap-1 text-xs " +
                            (u.online
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground")
                          }
                        >
                          <span
                            className={
                              "h-1.5 w-1.5 rounded-full " +
                              (u.online ? "bg-emerald-500" : "bg-muted-foreground/40")
                            }
                          />
                          {u.online ? "在线" : "离线"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs hover:text-destructive"
                          disabled={!u.online || kickingId === u.id}
                          onClick={() => handleKickout(u.id)}
                        >
                          {kickingId === u.id ? "处理中…" : "踢下线"}
                        </Button>
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
    </div>
  )
}
