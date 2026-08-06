import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

// ─── Types matching backend DTOs ───

export type TaskStatus =
  | "PENDING"
  | "SEARCHING"
  | "SEARCH_COMPLETED"
  | "USER_SELECTING"
  | "PROCESSING"
  | "PARTIAL_COMPLETED"
  | "COMPLETED"
  | "FAILED"

export type ItemStatus =
  | "PENDING"
  | "SELECTED"
  | "SEGMENTING"
  | "SEGMENTED"
  | "ANALYZING"
  | "ANALYZED"
  | "INPAINTING"
  | "INPAINTED"
  | "COMPOSITING"
  | "QWEN_EDITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"

/**
 * 商品处理模式：
 * - PIPELINE: 原流程（阿里分割→豆包质检→Inpaint→背景合成）
 * - QWEN_TAKEOVER: Qwen 视觉接管（直接发原图给 Qwen-image-2.0 出主图）
 */
export type ProcessingMode = "PIPELINE" | "QWEN_TAKEOVER"

export type UserRole = "user" | "admin"

export interface User {
  id: number
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
  /** 角色：user | admin。后端 User 实体里已存在，前端之前漏接 */
  role?: UserRole
  deleted?: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: number
  userId: number
  sourceImgUrl: string
  backgroundId?: number
  totalItems: number
  selectedItems: number
  completedItems: number
  status: TaskStatus
  errorMsg?: string
  createdAt: string
  updatedAt: string
  items?: TaskItem[]
}

export interface TaskItem {
  id: number
  taskId: number
  sortOrder: number
  offerId?: number
  productTitle?: string
  productImgUrl?: string
  productPrice?: number
  productDetailUrl?: string
  segmentedImgUrl?: string
  isCentered?: boolean
  isSquare?: boolean
  cropRect?: string
  hasViolations?: boolean
  violations?: string
  overallVerdict?: string
  finalImgUrl?: string
  status: ItemStatus
  errorMsg?: string
  userSelected?: boolean
  /** 处理模式：PIPELINE | QWEN_TAKEOVER。新 item 默认 PIPELINE。 */
  processingMode: ProcessingMode
  /** Qwen 视觉接管成本（元），仅 QWEN_TAKEOVER 模式产生 */
  qwenCostYuan?: number
  createdAt: string
}

export interface BackgroundImage {
  id: number
  name: string
  url: string
  thumbnailUrl?: string
  category?: string
  colorHex?: string
  isDefault?: boolean
  sortOrder?: number
  status?: number
  createdAt: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

/**
 * 登录接口返回结构（与后端 AuthService.login 实际返回的 Map 一一对应）。
 *
 * 注意：后端 login 不返回 role 字段，role 必须登录后通过 /api/auth/me 拿到。
 * 见 `AuthContext.refreshProfile` / `useAuth().refreshProfile`。
 */
export interface LoginResult {
  token: string
  tokenName: string
  userId: number
  username: string
  nickname?: string
}

export interface CostTrendPoint {
  date: string
  doubaoTokens: number
  aliyunCalls: number
  otherTokens: number
}

export interface CostDailyPoint {
  date: string
  promptTokens: number
  completionTokens: number
  segmentCalls: number
  /** Qwen 视觉接管成本（元）。可选：旧数据无此字段 */
  qwenCostYuan?: number
  costYuan: number
}

export interface DashboardStats {
  completedTasks: number
  totalTasks: number
  totalExpense: number
  backgroundCount: number
  segmentedCount: number
  qaFailedCount: number
  qaPassedCount: number
  processedCount: number
  /** Qwen 视觉接管已出图商品数 */
  qwenProcessedCount: number
  costTrends?: CostTrendPoint[]
  /** 7-day cost aggregation (index 0 = 6 days ago, index 6 = today) */
  last7dPromptTokens?: number[]
  last7dCompletionTokens?: number[]
  last7dSegmentCalls?: number[]
  last7dCostYuan?: number[]
  last7dDates?: string[]
}

/**
 * MyBatis-Plus `IPage<T>` 序列化后的结构（含 `pages` 总页数）。
 * 对应后端：`ImageController.getTasks`、`AdminController.listUsers/listTasks`
 * 这类直接返回 `IPage<...>` 的接口。
 */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

/**
 * 后端用 `Map.of("rows", ..., "total", ..., "current", ..., "size", ...)`
 * 手搓的分页结构（不带 `pages` 字段）。
 * 对应后端：`AnnouncementController.list`、`AdminController.listAnnouncements`、
 * `ChatController.mySessions`、`AdminController.listChatSessions`。
 *
 * 这俩分页契约并存是后端现状，前端按接口各自选用对应类型——别混用。
 */
export interface PageRows<T> {
  rows: T[]
  total: number
  current: number
  size: number
}

// ─── Announcement ───

export type AnnouncementStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED"

export interface Announcement {
  id: number
  title: string
  /** Markdown 正文 */
  content: string
  /** 0=不弹（只在列表里看）; 1=登录进站弹窗（且用户未读时） */
  popup: number
  status: AnnouncementStatus
  publishedAt?: string
  /** 后端 Announcement 实体里的创建人 ID，admin 视角可见 */
  createdBy?: number
  createdAt: string
  updatedAt: string
}

// ─── Chat ───

export type ChatSessionStatus = "OPEN" | "CLOSED" | "AI_ESCALATED"
export type ChatSenderType = "USER" | "ADMIN" | "AI"

export interface ChatSession {
  id: number
  userId: number
  subject: string
  status: ChatSessionStatus
  closedAt: string | null
  createdAt: string
  updatedAt: string
  /** admin 视角 JOIN user 表带出 (用户端 mySessions 不返此字段) */
  username?: string
  nickname?: string
}

export interface ChatMessage {
  id: number
  sessionId: number
  senderType: ChatSenderType
  /** AI 消息可能为 null */
  senderId: number | null
  content: string
  createdAt: string
}

// ─── Admin ───

export interface AdminUserVO {
  id: number
  username: string
  nickname?: string
  email?: string
  phone?: string
  status?: number
  role: UserRole
  /** 是否在线（Sa-Token Redis 里持有此 userId 的活 token） */
  online: boolean
  createdAt: string
}

// ─── Axios instance ───

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
})

// Request interceptor: attach Sa-Token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("satoken")
  if (token) {
    config.headers.set("satoken", token)
  }
  return config
})

// Response interceptor: unwrap data, handle 401
api.interceptors.response.use(
  (res) => {
    // 二进制响应 (Blob/arrayBuffer) 不走 ApiResponse unwrap, 直接返回 (例: zip 下载)
    if (res.config.responseType === "arraybuffer" || res.config.responseType === "blob") {
      return res
    }
    const body = res.data as ApiResponse<unknown>
    if (body.code !== 200) {
      return Promise.reject(new Error(body.message || "请求失败"))
    }
    return res
  },
  (err: AxiosError<ApiResponse<unknown>>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("satoken")
      localStorage.removeItem("user")
      // 仅在已登录路由下被打回登录页，登录页本身 401 不跳
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = "/login"
      }
    }
    const msg = err.response?.data?.message || err.message || "网络错误"
    return Promise.reject(new Error(msg))
  }
)

// ─── Auth API ───

export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<LoginResult>>("/auth/login", { username, password }),

  register: (username: string, password: string, email?: string) =>
    api.post<ApiResponse<LoginResult>>("/auth/register", {
      username,
      password,
      email,
    }),

  logout: () => api.post<ApiResponse<null>>("/auth/logout"),

  /** 拿当前登录用户完整 User 实体（含 role 字段） */
  me: () => api.get<ApiResponse<User>>("/auth/me"),
}

// ─── Image / Task API ───

export const imageApi = {
  /**
   * 上传图片 & 创建任务.
   *
   * 后端 `ImageController.upload` 实际仅接收 `file` + 可选 `backgroundId` 两个表单字段。
   * 之前前端这里带的 `keyword/priceMin/priceMax/sortFields/category/tags` 6 个参数
   * 后端根本不接收（孤儿死参数，误导后人），已清理。
   */
  upload: (file: File, backgroundId?: number) => {
    const fd = new FormData()
    fd.append("file", file)
    if (backgroundId !== undefined) {
      fd.append("backgroundId", String(backgroundId))
    }
    return api.post<ApiResponse<{ taskId: number; status: string; message: string }>>("/image/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    })
  },

  /** Task list (paginated). 后端用 `page`/`size`，不是 `current`/`size`. */
  tasks: (page = 1, size = 10) =>
    api.get<ApiResponse<PageResult<Task>>>("/image/tasks", {
      params: { page, size },
    }),

  /** Task detail */
  taskDetail: (taskId: number) =>
    api.get<ApiResponse<Task>>(`/image/tasks/${taskId}`),

  /** Task items */
  taskItems: (taskId: number) =>
    api.get<ApiResponse<TaskItem[]>>(`/image/tasks/${taskId}/items`),

  /** Select items to process */
  selectItems: (taskId: number, itemIds: number[]) =>
    api.post<ApiResponse<{ status: string; message: string }>>(
      `/image/tasks/${taskId}/select`,
      { itemIds }
    ),

  /** Single item detail */
  itemDetail: (itemId: number) =>
    api.get<ApiResponse<TaskItem>>(`/image/item/${itemId}`),

  /** Update per-item processing mode (Qwen takeover vs original pipeline) */
  updateItemMode: (itemId: number, mode: ProcessingMode) =>
    api.patch<ApiResponse<{ processingMode: ProcessingMode }>>(
      `/image/item/${itemId}/mode`,
      { processingMode: mode }
    ),

  /**
   * 一键下载任务结果 zip
   *
   * @returns 解析后的 Blob (application/zip), 调用方配合 triggerDownload 触发浏览器下载
   * @throws Error 后端返回 JSON 错误 ({ code, message }) 时抛 Error(message)
   */
  downloadTaskResults: async (taskId: number): Promise<Blob> => {
    const res = await api.get(`/image/tasks/${taskId}/download`, {
      responseType: "arraybuffer",
    })
    const contentType = (res.headers["content-type"] || "") as string
    if (contentType.includes("application/json")) {
      // 后端报错流出的 JSON body → arraybuffer → text → JSON → throw
      const text = new TextDecoder().decode(new Uint8Array(res.data as ArrayBuffer))
      let json: { code?: number; message?: string } = {}
      try {
        json = JSON.parse(text)
      } catch {
        // 非 JSON 的字符串 body — 走默认错误消息
      }
      throw new Error(json.message ?? "下载失败")
    }
    return new Blob([res.data as ArrayBuffer], { type: "application/zip" })
  },

  /** Dashboard stats */
  stats: () =>
    api.get<ApiResponse<DashboardStats>>("/image/stats"),
}

/**
 * 浏览器端触发文件下载 (避免 URL.createObjectURL + 隐藏 <a> 的样板代码在调用点重复)
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 1000ms 后 revoke 避免 DOM 树松开后某些浏览器 download 失败
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ─── Background API ───

export const backgroundApi = {
  list: (category?: string) =>
    api.get<ApiResponse<BackgroundImage[]>>("/backgrounds", {
      params: category ? { category } : {},
    }),

  detail: (id: number) =>
    api.get<ApiResponse<BackgroundImage>>(`/backgrounds/${id}`),

  /** Upload a new background image */
  upload: (
    file: File,
    options?: { name?: string; category?: string; colorHex?: string }
  ) => {
    const fd = new FormData()
    fd.append("file", file)
    if (options?.name) fd.append("name", options.name)
    if (options?.category) fd.append("category", options.category)
    if (options?.colorHex) fd.append("colorHex", options.colorHex)
    return api.post<ApiResponse<BackgroundImage>>("/backgrounds/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    })
  },
}

// ─── Cost API ───

export const costApi = {
  /** Current user total cost */
  total: () =>
    api.get<ApiResponse<{ totalCostYuan: number }>>("/cost/me/total"),

  /** Current user today's cost */
  today: () =>
    api.get<ApiResponse<{ costYuan: number }>>("/cost/me/today"),

  /** Daily cost breakdown for recent N days */
  daily: (days = 7) =>
    api.get<ApiResponse<CostDailyPoint[]>>("/cost/me/daily", {
      params: { days },
    }),

  /** Cost detail for a specific task */
  taskCost: (taskId: number) =>
    api.get<ApiResponse<{
      taskId: number
      promptTokens: number
      completionTokens: number
      segmentCalls: number
      segmentCostYuan: number
      doubaoCostYuan: number
      totalCostYuan: number
    }>>(`/cost/me/task/${taskId}`),
}

// ─── Announcement API（用户端） ───

export const announcementApi = {
  /** 登录进站拉未读弹窗公告（最多 5 条） */
  popup: () => api.get<ApiResponse<Announcement[]>>("/announcements/popup"),

  /** 标记已读（幂等）。看完一条弹窗调一次 */
  markRead: (id: number) =>
    api.post<ApiResponse<null>>(`/announcements/${id}/read`),

  /** 已发布公告分页列表。后端用 `current`/`size`，返回 `PageRows` 结构 */
  list: (current = 1, size = 20) =>
    api.get<ApiResponse<PageRows<Announcement>>>("/announcements", {
      params: { current, size },
    }),

  /** 详情。404 如果不存在或非 PUBLISHED */
  detail: (id: number) =>
    api.get<ApiResponse<Announcement>>(`/announcements/${id}`),
}

// ─── Chat API（用户端） ───

export const chatApi = {
  /** 开会话或复用 OPEN 会话。Subject 可空字符串 */
  openSession: (subject = "") =>
    api.post<ApiResponse<ChatSession>>("/chat/sessions", { subject }),

  /** 我的历史会话（分页，PageRows 结构） */
  mySessions: (current = 1, size = 20) =>
    api.get<ApiResponse<PageRows<ChatSession>>>("/chat/sessions", {
      params: { current, size },
    }),

  /** 拉全部历史消息（按 id 正序，最多 200 条） */
  listMessages: (sessionId: number) =>
    api.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`),

  /** 轮询新消息：id > afterId 的全部新消息，按 id 正序 */
  poll: (sessionId: number, afterId?: number) =>
    api.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/poll`, {
      params: afterId !== undefined ? { afterId } : {},
    }),

  /** 用户发消息。content 空字符串会被后端拒掉 */
  send: (sessionId: number, content: string) =>
    api.post<ApiResponse<ChatMessage>>(`/chat/sessions/${sessionId}/messages`, {
      content,
    }),

  /** 关闭自己的会话 */
  close: (sessionId: number) =>
    api.post<ApiResponse<null>>(`/chat/sessions/${sessionId}/close`),

  /** 修改自己会话的主题 (仅 OPEN / AI_ESCALATED 可改) */
  updateSubject: (sessionId: number, subject: string) =>
    api.patch<ApiResponse<ChatSession>>(`/chat/sessions/${sessionId}/subject`, {
      subject,
    }),
}

// ─── Admin API（仅 role=admin） ───

export const adminApi = {
  // 用户管理

  /** 用户列表 + 在线态（分页，IPage 结构） */
  listUsers: (params: {
    current?: number
    size?: number
    username?: string
    role?: string
  } = {}) =>
    api.get<ApiResponse<PageResult<AdminUserVO>>>("/admin/users", {
      params: { current: 1, size: 20, ...params },
    }),

  /** 踢人下线：该 userId 的所有 token 立即失效 */
  kickout: (userId: number) =>
    api.post<ApiResponse<null>>(`/admin/users/${userId}/kickout`),

  // 全站仪表盘

  /** 全站统计 (无 userId 过滤, admin 看全平台口径, DashboardStats 同结构) */
  dashboardStats: () =>
    api.get<ApiResponse<DashboardStats>>("/admin/dashboard/stats"),

  // Token 管理（doubao / qwen）

  /** 列出所有受管 token 当前状态（不返回明文） */
  listTokens: () =>
    api.get<ApiResponse<Record<string, { value?: boolean; [k: string]: unknown }>>>("/admin/tokens"),

  /** 查单个 provider 的明文 key */
  getToken: (provider: string) =>
    api.get<ApiResponse<{ provider: string; value: string }>>(`/admin/tokens/${provider}`),

  /** 更新单个 provider 的 key（Redis 立即生效） */
  updateToken: (provider: string, value: string) =>
    api.put<ApiResponse<null>>(`/admin/tokens/${provider}`, { value }),

  // 任务管理

  /** 全站任务列表（分页，IPage 结构） */
  listTasks: (params: {
    current?: number
    size?: number
    userId?: number
    status?: TaskStatus
  } = {}) =>
    api.get<ApiResponse<PageResult<Task>>>("/admin/tasks", {
      params: { current: 1, size: 20, ...params },
    }),

  // 公告 CRUD

  /** 创建公告（起草 / 发布） */
  createAnnouncement: (input: {
    title: string
    content: string
    popup: 0 | 1
    status: AnnouncementStatus
  }) => api.post<ApiResponse<Announcement>>("/admin/announcements", input),

  /** 公告全列表（含 DRAFT/ARCHIVED，PageRows 结构） */
  listAnnouncements: (current = 1, size = 20) =>
    api.get<ApiResponse<PageRows<Announcement>>>("/admin/announcements", {
      params: { current, size },
    }),

  /** 单条公告详情 */
  getAnnouncement: (id: number) =>
    api.get<ApiResponse<Announcement>>(`/admin/announcements/${id}`),

  /** 更新公告（只带要改的字段） */
  updateAnnouncement: (id: number, patch: Partial<{
    title: string
    content: string
    popup: 0 | 1
    status: AnnouncementStatus
  }>) => api.put<ApiResponse<Announcement>>(`/admin/announcements/${id}`, patch),

  /** 物理删公告 */
  deleteAnnouncement: (id: number) =>
    api.delete<ApiResponse<null>>(`/admin/announcements/${id}`),

  // 客服 admin 视角

  /** admin 列全部会话，可按 userId / status 过滤 */
  listChatSessions: (params: {
    current?: number
    size?: number
    userId?: number
    status?: ChatSessionStatus
  } = {}) =>
    api.get<ApiResponse<PageRows<ChatSession>>>("/admin/chat/sessions", {
      params: { current: 1, size: 20, ...params },
    }),

  /** admin 看会话全部消息 */
  listChatMessages: (sessionId: number) =>
    api.get<ApiResponse<ChatMessage[]>>(`/admin/chat/sessions/${sessionId}/messages`),

  /** admin 轮询会话新消息 */
  pollChatMessages: (sessionId: number, afterId?: number) =>
    api.get<ApiResponse<ChatMessage[]>>(`/admin/chat/sessions/${sessionId}/poll`, {
      params: afterId !== undefined ? { afterId } : {},
    }),

  /** admin 手工回复 */
  replyChat: (sessionId: number, content: string) =>
    api.post<ApiResponse<ChatMessage>>(`/admin/chat/sessions/${sessionId}/messages`, {
      content,
    }),

  /** admin 强制关会话 */
  closeChat: (sessionId: number) =>
    api.post<ApiResponse<null>>(`/admin/chat/sessions/${sessionId}/close`),
}

export default api
