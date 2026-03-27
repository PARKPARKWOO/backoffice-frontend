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

export const registerApplication = async (body: {
  name: string
  redirectUrl: string
  redirectType: string
}): Promise<string> => {
  const { data } = await api.post('/auth/applications', body)
  return data.data
}

export const registerOAuthProvider = async (body: {
  applicationId: string
  provider: string
  clientId: string
  clientSecret?: string
}): Promise<void> => {
  await api.post('/auth/applications/oauth', body)
}

export const registerDomain = async (body: {
  applicationId: string
  domains: string[]
}): Promise<void> => {
  await api.post('/auth/applications/domain', body)
}
