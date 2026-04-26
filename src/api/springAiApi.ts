import api from './axiosInstance'

// Clients
export const fetchSpringAiClients = async () => {
  const { data } = await api.get('/spring-ai/clients')
  return data.data?.data ?? data.data ?? []
}

export const createSpringAiClient = async (body: { name: string; password: string; description?: string }) => {
  const { data } = await api.post('/spring-ai/clients', body)
  return data.data
}

export const deleteSpringAiClient = async (id: number) => {
  await api.delete(`/spring-ai/clients/${id}`)
}

// API Keys
export const fetchApiKeys = async (applicationId?: string) => {
  const params = applicationId ? { applicationId } : {}
  const { data } = await api.get('/spring-ai/api-keys', { params })
  return data.data?.data ?? data.data ?? []
}

export const createApiKey = async (body: {
  applicationId?: string
  vendor: string
  apiKey: string
  description?: string
}) => {
  const { data } = await api.post('/spring-ai/api-keys', body)
  return data.data
}

export const deleteApiKey = async (id: number) => {
  await api.delete(`/spring-ai/api-keys/${id}`)
}

// Pricing Policies
export const fetchPricingPolicies = async () => {
  const { data } = await api.get('/spring-ai/pricing-policies')
  return data.data?.data ?? data.data ?? []
}

export const createPricingPolicy = async (body: {
  vendor: string
  model: string
  inputPricePerMillion: number
  outputPricePerMillion: number
  clientId?: number
}) => {
  const { data } = await api.post('/spring-ai/pricing-policies', body)
  return data.data
}

export const deletePricingPolicy = async (id: number) => {
  await api.delete(`/spring-ai/pricing-policies/${id}`)
}

// Rate Limit Policies
export const fetchRateLimitPolicies = async () => {
  const { data } = await api.get('/spring-ai/rate-limit-policies')
  return data.data?.data ?? data.data ?? []
}

export const createRateLimitPolicy = async (body: {
  vendor: string
  tier: string
  applicationId?: string | null
  rpm: number
  rpd: number
}) => {
  const { data } = await api.post('/spring-ai/rate-limit-policies', body)
  return data.data
}

export const updateRateLimitPolicy = async (params: { id: number; rpm: number; rpd: number }) => {
  const { id, rpm, rpd } = params
  const { data } = await api.put(`/spring-ai/rate-limit-policies/${id}`, { rpm, rpd })
  return data.data
}

export const deleteRateLimitPolicy = async (id: number) => {
  await api.delete(`/spring-ai/rate-limit-policies/${id}`)
}
