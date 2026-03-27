import api from './axiosInstance'

// Exercise Areas
export const fetchAreas = async () => {
  const { data } = await api.get('/bbr/areas')
  return data.data?.data ?? data.data ?? []
}
export const createArea = async (body: { name: string }) => {
  const { data } = await api.post('/bbr/areas', body)
  return data.data
}
export const deleteArea = async (id: number) => { await api.delete(`/bbr/areas/${id}`) }

// Exercise Items
export const fetchItems = async (areaId?: number) => {
  const params = areaId ? { areaId } : {}
  const { data } = await api.get('/bbr/items', { params })
  return data.data?.data ?? data.data ?? []
}
export const getItem = async (id: number) => {
  const { data } = await api.get(`/bbr/items/${id}`)
  return data.data?.data ?? data.data
}
export const deleteItem = async (id: number) => { await api.delete(`/bbr/items/${id}`) }

// YouTube
export const addYoutube = async (body: { exerciseItemId: number; youtubeUrl: string; title?: string }) => {
  const { data } = await api.post('/bbr/youtube', body)
  return data.data
}
export const deleteYoutube = async (id: number) => { await api.delete(`/bbr/youtube/${id}`) }
