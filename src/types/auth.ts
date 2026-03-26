export interface UserInfo {
  userId: string
  userName: string
  applicationRole: string
  email: string
}

export interface UserInfoPage {
  items: UserInfo[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface Authority {
  id: number
  authority: string
  level: number
}

export interface ApplicationInfo {
  id: string
  name: string
}

export interface CurrentUserInfo {
  email?: string
  name?: string
  applicationRole: string
  accessLevel: number
}
