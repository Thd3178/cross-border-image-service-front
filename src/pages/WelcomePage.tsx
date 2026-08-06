import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import gsap from "gsap"
import { Button } from "@/components/ui/button"
import { RiArrowRightLine } from "@remixicon/react"

/**
 * 欢迎页: 单张 logo.png 整体入场动画 + 标题逐字 + 副标 + CTA.
 *
 * 不再搞三张图飞入合成 — 改成单一整体 logo 动效: 从远处(小+模糊+透明)冲向
 * 中央 elastic 弹出到正常大小, 一气呵成.
 *
 * 图片路径用 ${BASE_URL} 前缀适配 vite base: '/image/'.
 * "logo.png" 直接引用 public/logo.png (已在仓库存在).
 *
 * 时间线 (default 1x):
 *   t=0     logo.png 从远处 scale 0.1 + blur 飞扑到中央 + elastic 弹出 (1.4s)
 *   t=1.5   主标题"跨境图像服务" 逐字 stagger 飞入 (6字总 0.48s)
 *   t=2.0   副标一"并 行 科 技" 淡入上推
 *   t=2.2   副标二"并行澜(蓝)智能平台" 淡入上推
 *   t=2.45  CTA "立即体验" 淡入
 */
const BASE = import.meta.env.BASE_URL
const TITLE = "跨境图像服务"

export default function WelcomePage() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitle1Ref = useRef<HTMLParagraphElement>(null)
  const subtitle2Ref = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const [animDone, setAnimDone] = useState(false)

  // 把标题拆成字符 span. useMemo 避免每次 render 重排导致 gsap 丢 ref.
  const titleChars = useMemo(() => Array.from(TITLE), [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (reduceMotion) {
        gsap.set(logoRef, { opacity: 1, scale: 1, filter: "blur(0px)" })
        gsap.set([titleRef, subtitle1Ref, subtitle2Ref, ctaRef], { opacity: 1, y: 0 })
        setAnimDone(true)
        return
      }

      const tl = gsap.timeline({
        onComplete: () => setAnimDone(true),
      })

      // ─── 1. logo 整体入场: 远处 scale 0.1 + 模糊 + 透明 → 中央 scale 1 + 清晰 + elastic 弹出 ───
      // y 起点用 -100 让 logo 从上方略高处冲下来, 配 elastic 落地回弹感更强.
      tl.fromTo(
          logoRef.current,
          {
            opacity: 0,
            scale: 0.1,
            y: -100,
            filter: "blur(20px)",
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.4,
            ease: "elastic.out(1, 0.6)",
          },
          0
        )

      // ─── 2. 主标题 "跨境图像服务" 逐字 stagger 飞入 ───
      // 每字 opacity 0→1, y 24→0, blur 8px→0; stagger 0.08s, 共 6 字总时长约 0.98s.
        .fromTo(
          titleRef.current?.querySelectorAll("span") ?? [],
          { opacity: 0, y: 24, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.08,
          },
          1.5
        )

      // ─── 3. 副标一 ───
        .fromTo(
          subtitle1Ref.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          2.0
        )

      // ─── 4. 副标二 ───
        .fromTo(
          subtitle2Ref.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          2.2
        )

      // ─── 5. CTA ───
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          2.45
        )
    }, rootRef)
    return () => ctx.revert()
  }, [])

  // 已登录 → dashboard, 未登录 → login; 不读 useAuth 避免 re-render 打断 gsap.
  const handleEnter = () => {
    const token = localStorage.getItem("satoken")
    navigate(token ? "/dashboard" : "/login", { replace: true })
  }

  return (
    <div
      ref={rootRef}
      className="relative min-h-svh overflow-hidden bg-background"
      aria-busy={!animDone}
    >
      {/* ─── 中央内容栈: logo + 网站名逐字 + 副标两行 + CTA ─── */}
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
        <img
          ref={logoRef}
          src={`${BASE}logo.png`}
          alt="跨境图像服务 logo"
          className="h-auto w-[clamp(80px,14vw,160px)] select-none opacity-0 [filter:drop-shadow(0_24px_48px_rgba(0,0,0,0.22))] dark:brightness-90"
        />
        <div className="space-y-2">
          {/* 主标题: 逐字 span. inline-block 让 transform 生效; aria-label 给屏幕阅读器读整句. */}
          <h1
            ref={titleRef}
            aria-label={TITLE}
            className="text-[clamp(28px,6vw,56px)] font-bold leading-tight tracking-tight"
          >
            {titleChars.map((ch, i) => (
              <span
                key={i}
                className="inline-block bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
                style={{ willChange: "transform, opacity, filter" }}
              >
                {ch}
              </span>
            ))}
          </h1>
          <p ref={subtitle1Ref} className="text-base text-muted-foreground sm:text-lg">
            并 行 科 技
          </p>
          <p ref={subtitle2Ref} className="text-base sm:text-lg">
            <span className="font-medium text-blue-600 dark:text-blue-400">并行澜</span>
            <span className="text-muted-foreground">智能平台</span>
          </p>
        </div>
        <div ref={ctaRef} className="flex items-center gap-3">
          <Button size="lg" onClick={handleEnter} className="group">
            立即体验
            <RiArrowRightLine className="transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
