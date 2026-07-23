import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

// ─── Types matching backend DTOs ───

export type TaskStatus =
  | "PENDING"
  | "SEARCHING"
  | "SEARCH_COMPLETED"
  | "USER_SELECTING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"

export type ItemStatus =
  | "PENDING"
  | "SELECTED"
  | "SEGMENTING"
  | "SEGMENTED"
  | "ANALYZING"
  | "ANALYZED"
  | "COMPOSITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"

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

export interface DashboardStats {
  completedTasks: number
  totalTasks: number
  totalExpense: number
  backgroundCount: number
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
}

export default api
