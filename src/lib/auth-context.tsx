import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { authApi, type LoginResult } from "@/lib/api"

interface AuthState {
  user: LoginResult | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => Promise<void>
  /** Fetch full user profile from /api/auth/me */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const STORAGE_KEY_TOKEN = "satoken"
const STORAGE_KEY_USER = "user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResult | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER)
      return raw ? (JSON.parse(raw) as LoginResult) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  // On mount: verify token is still valid
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
        setUser((prev) =>
          prev
            ? { ...prev, nickname: u.nickname || prev.nickname }
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
  }, [])

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
    },
    [saveAuth]
  )

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      const res = await authApi.register(username, password, email)
      saveAuth(res.data.data)
    },
    [saveAuth]
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
      setUser((prev) =>
        prev
          ? { ...prev, ...u, nickname: u.nickname || prev.nickname }
          : null
      )
    } catch {
      // ignore
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
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
