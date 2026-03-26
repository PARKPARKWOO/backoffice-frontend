export interface ServiceHealthStatus {
  name: string
  eurekaName: string
  status: string
  error?: string
}

export interface ApiResponse<T> {
  data: T
  code?: string
  message?: string
}
