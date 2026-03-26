import api from './axiosInstance'
import type { ServiceHealthStatus } from '../types/common'

export const fetchServiceHealth = async (): Promise<ServiceHealthStatus[]> => {
  const { data } = await api.get('/dashboard/health')
  return data.data
}
