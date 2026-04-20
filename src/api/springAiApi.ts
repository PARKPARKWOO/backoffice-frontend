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
