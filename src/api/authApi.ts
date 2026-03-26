import api from './axiosInstance'
import type { UserInfoPage, Authority, ApplicationInfo, CurrentUserInfo } from '../types/auth'

export const fetchUsers = async (page = 0, size = 20): Promise<UserInfoPage> => {
  const { data } = await api.get('/auth/users', { params: { page, size } })
  return data.data
}

export const fetchCurrentUser = async (): Promise<CurrentUserInfo> => {
  const { data } = await api.get('/auth/me')
  return data.data
}

export const fetchAuthorities = async (): Promise<Authority[]> => {
  const { data } = await api.get('/auth/authorities')
  return data.data
}

export const createAuthority = async (authority: string): Promise<void> => {
  await api.post('/auth/authorities', { authority })
}

export const updateUserRole = async (targetUserId: string, authorityId: number): Promise<void> => {
  await api.put('/auth/users/role', { targetUserId, authorityId })
}

export const fetchApplications = async (): Promise<ApplicationInfo[]> => {
  const { data } = await api.get('/auth/applications')
  return data.data
}
