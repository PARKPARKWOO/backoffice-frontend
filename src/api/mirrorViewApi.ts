import api from './axiosInstance'

export const fetchRewards = async () => {
  const { data } = await api.get('/mirror-view/rewards')
  return data.data?.data ?? data.data ?? []
}

export const createReward = async (body: {
  streakDays: number
  rewardType: string
  rewardValue: string
  description?: string
  isActive?: boolean
}) => {
  const { data } = await api.post('/mirror-view/rewards', body)
  return data.data
}

export const updateReward = async (id: number, body: {
  streakDays: number
  rewardType: string
  rewardValue: string
  description?: string
  isActive?: boolean
}) => {
  const { data } = await api.put(`/mirror-view/rewards/${id}`, body)
  return data.data
}

export const deleteReward = async (id: number) => {
  await api.delete(`/mirror-view/rewards/${id}`)
}
