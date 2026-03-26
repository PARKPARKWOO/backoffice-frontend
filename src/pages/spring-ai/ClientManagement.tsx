import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSpringAiClients, createSpringAiClient, deleteSpringAiClient } from '../../api/springAiApi'

export default function ClientManagement() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', password: '', description: '' })

  const { data: clients, isLoading } = useQuery({
    queryKey: ['springAiClients'],
    queryFn: fetchSpringAiClients,
  })

  const createMutation = useMutation({
    mutationFn: createSpringAiClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['springAiClients'] })
      setShowForm(false)
      setForm({ name: '', password: '', description: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSpringAiClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['springAiClients'] }),
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Spring AI - Clients</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create Client'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            disabled={!form.name || !form.password || createMutation.isPending}
            onClick={() => createMutation.mutate(form)}
          >
            Create
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(clients as any[])?.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{c.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.description ?? '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {c.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    onClick={() => { if (confirm('Delete this client?')) deleteMutation.mutate(c.id) }}
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
