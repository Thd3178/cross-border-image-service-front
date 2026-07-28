import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginPage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const { login, register, isLoggedIn, isLoading: authLoading } = useAuth()

  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      navigate("/dashboard", { replace: true })
    }
  }, [authLoading, isLoggedIn, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === "login") {
        await login(username, password)
        toast.success("登录成功")
      } else {
        await register(username, password, email || undefined)
        toast.success("注册成功")
      }
      navigate("/dashboard", { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失败"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login")
  }

  return (
    <div
      className={cn(
        "relative flex min-h-svh items-center justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      {/* 全屏背景图 */}
      <img
        src={`${import.meta.env.BASE_URL}bg.png`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 半透明遮罩保证表单可读 */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-4">
        {/* 站点标题 */}
        <h1 className="text-center text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
          <span className="text-primary">并行·行知澜</span>智能平台 ParaWave
        </h1>

        <Card className="w-full border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-white">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </CardTitle>
          <CardDescription className="text-white/70">
            {mode === "login"
              ? "登录以管理您的商品图片"
              : "注册新账号以开始使用"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <Button variant="outline" type="button" className="w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  联系客服
                </Button>
              </Field>
              <Field>
                <FieldLabel htmlFor="username">
                  {mode === "login" ? "账号" : "用户名"}
                </FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder={mode === "login" ? "请输入账号" : "请输入用户名"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Field>
              {mode === "register" && (
                <Field>
                  <FieldLabel htmlFor="email">邮箱</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              )}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">密码</FieldLabel>
                  {mode === "login" && (
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      忘记密码？
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "处理中..."
                    : mode === "login"
                      ? "登录"
                      : "注册"}
                </Button>
                <FieldDescription className="text-center">
                  {mode === "login" ? (
                    <>
                      没有账号？{" "}
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        注册
                      </button>
                    </>
                  ) : (
                    <>
                      已有账号？{" "}
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        登录
                      </button>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-white/70">
        点击继续即表示你同意我们的
        <a href="#">服务条款</a>和<a href="#">隐私政策</a>。
      </FieldDescription>
      </div>
    </div>
  )
}
