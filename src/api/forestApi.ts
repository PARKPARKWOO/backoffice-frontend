import api from './axiosInstance'

export const fetchSupporters = async (page = 0, size = 20) => {
  const { data } = await api.get('/forest/supporters', { params: { page, size } })
  return data.data
}

export const deleteSupporter = async (id: number) => {
  await api.delete(`/forest/supporters/${id}`)
}

export const markSupportComplete = async (id: number) => {
  await api.patch(`/forest/supporters/${id}/complete`)
}
