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

export interface User {
  id: number
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  status?: number
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

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
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
      window.location.href = "/login"
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

  me: () => api.get<ApiResponse<User>>("/auth/me"),
}

// ─── Image / Task API ───

export const imageApi = {
  /** Upload image & create task */
  upload: (
    file: File,
    options?: {
      backgroundId?: number
      keyword?: string
      priceMin?: number
      priceMax?: number
      sortFields?: string
      category?: string
      tags?: string
    }
  ) => {
    const fd = new FormData()
    fd.append("file", file)
    if (options?.backgroundId !== undefined) {
      fd.append("backgroundId", String(options.backgroundId))
    }
    if (options?.keyword) fd.append("keyword", options.keyword)
    if (options?.priceMin !== undefined) fd.append("priceMin", String(options.priceMin))
    if (options?.priceMax !== undefined) fd.append("priceMax", String(options.priceMax))
    if (options?.sortFields) fd.append("sortFields", options.sortFields)
    if (options?.category) fd.append("category", options.category)
    if (options?.tags) fd.append("tags", options.tags)
    return api.post<ApiResponse<{ taskId: number; status: string; message: string }>>("/image/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    })
  },

  /** Task list (paginated) */
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

  /** Retry failed task */
  retryTask: (taskId: number) =>
    api.post<ApiResponse<null>>(`/image/tasks/${taskId}/retry`),

  /** Dashboard stats */
  stats: () =>
    api.get<ApiResponse<DashboardStats>>("/image/stats"),
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

export default api
