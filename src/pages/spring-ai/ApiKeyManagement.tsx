import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApiKeys, createApiKey, deleteApiKey } from '../../api/springAiApi'

const VENDORS = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'X_AI']

export default function ApiKeyManagement() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    applicationId: '', vendor: 'OPENAI', apiKey: '', description: '', projectId: '', location: '',
  })

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => fetchApiKeys(),
  })

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
      setShowForm(false)
      setForm({ applicationId: '', vendor: 'OPENAI', apiKey: '', description: '', projectId: '', location: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apiKeys'] }),
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Spring AI - API Keys</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Register API Key'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Application ID" value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} />
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
              {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {form.vendor === 'GOOGLE' && (
              <>
                <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Project ID" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />
                <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Location (e.g. us-central1)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </>
            )}
          </div>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            disabled={!form.applicationId || !form.apiKey || createMutation.isPending}
            onClick={() => createMutation.mutate(form)}
          >
            Register
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Masked Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(apiKeys as any[])?.map((key: any) => (
              <tr key={key.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{key.id}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {key.vendor}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-500">{key.maskedKey}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{key.description ?? '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    onClick={() => { if (confirm('Delete this API key?')) deleteMutation.mutate(key.id) }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
