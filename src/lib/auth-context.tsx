import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { authApi, type LoginResult, type UserRole } from "@/lib/api"

/**
 * 当前登录态的完整快照。除了 login/register 返回的字段外，还把从 `/api/auth/me`
 * 拿到的 `role`/`nickname` 等字段合并进来——后端 login 接口不返回 role，
 * 必须登录后立即调一次 me() 才能拿到，否则 admin 入口判断无据。
 */
export interface AuthUser extends LoginResult {
  /** 从 /api/auth/me 注入；未拿到前为 undefined */
  role?: UserRole
  nickname?: string
}

interface AuthState {
  user: AuthUser | null
  isLoggedIn: boolean
  isLoading: boolean
  /** role === "admin" 的便捷旗标。user 为 null 时为 false */
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => Promise<void>
  /** 重新拉 /api/auth/me，刷新 role / nickname */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const STORAGE_KEY_TOKEN = "satoken"
const STORAGE_KEY_USER = "user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  // 把内存里的 user 状态同步回 localStorage（主要是 me() 拿到 role/nickname 后）。
  // 否则刷新时 useState 初始化从 localStorage 读的仍是没 role 的旧版,
  // AdminRoute 在 me() 异步返回前就已是 isAdmin=false,在 reload 后第一个 render
  // 就把非 admin 重定向走,误锁管理员后台。
  const persistUserState = useCallback((updater: (prev: AuthUser | null) => AuthUser | null) => {
    setUser((prev) => {
      const next = updater(prev)
      if (next) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(next))
      }
      return next
    })
  }, [])

  // On mount: verify token is still valid + 把后端 login 没返回的 role 拉回来
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN)
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then((res) => {
        const u = res.data.data
        persistUserState((prev) =>
          prev
            ? { ...prev, role: u.role, nickname: u.nickname ?? prev.nickname }
            : prev
        )
      })
      .catch(() => {
        // Token invalid
        localStorage.removeItem(STORAGE_KEY_TOKEN)
        localStorage.removeItem(STORAGE_KEY_USER)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [persistUserState])

  const saveAuth = useCallback((data: LoginResult) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data))
    setUser(data)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_USER)
    setUser(null)
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.login(username, password)
      saveAuth(res.data.data)
      // 后端 login 不返回 role，必须立即调一次 me() 把 role 拉到，
      // 否则 admin 入口判断（isAdmin）拿不到值。
      try {
        const meRes = await authApi.me()
        const u = meRes.data.data
        persistUserState((prev) =>
          prev
            ? { ...prev, role: u.role, nickname: u.nickname ?? prev.nickname }
            : prev
        )
      } catch {
        // me() 失败不阻塞登录主流程，下游按未拿到 role 处理（isAdmin=false）
      }
    },
    [saveAuth, persistUserState]
  )

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      const res = await authApi.register(username, password, email)
      saveAuth(res.data.data)
      try {
        const meRes = await authApi.me()
        const u = meRes.data.data
        persistUserState((prev) =>
          prev
            ? { ...prev, role: u.role, nickname: u.nickname ?? prev.nickname }
            : prev
        )
      } catch {
        // 同上
      }
    },
    [saveAuth, persistUserState]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    clearAuth()
  }, [clearAuth])

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authApi.me()
      const u = res.data.data
      persistUserState((prev) =>
        prev
          ? { ...prev, ...u, nickname: u.nickname ?? prev.nickname, role: u.role }
          : null
      )
    } catch {
      // ignore
    }
  }, [persistUserState])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
