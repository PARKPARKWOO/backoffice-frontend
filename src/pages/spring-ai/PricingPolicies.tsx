import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPricingPolicies, createPricingPolicy, deletePricingPolicy } from '../../api/springAiApi'

const VENDORS = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'X_AI']

export default function PricingPolicies() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    vendor: 'OPENAI', model: '', inputPricePerMillion: '', outputPricePerMillion: '',
  })

  const { data: policies, isLoading } = useQuery({
    queryKey: ['pricingPolicies'],
    queryFn: fetchPricingPolicies,
  })

  const createMutation = useMutation({
    mutationFn: createPricingPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingPolicies'] })
      setShowForm(false)
      setForm({ vendor: 'OPENAI', model: '', inputPricePerMillion: '', outputPricePerMillion: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePricingPolicy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricingPolicies'] }),
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Spring AI - Pricing Policies</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create Policy'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
              {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Model (e.g. gpt-4o)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" type="number" placeholder="Input price per 1M tokens" value={form.inputPricePerMillion} onChange={(e) => setForm({ ...form, inputPricePerMillion: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" type="number" placeholder="Output price per 1M tokens" value={form.outputPricePerMillion} onChange={(e) => setForm({ ...form, outputPricePerMillion: e.target.value })} />
          </div>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            disabled={!form.model || !form.inputPricePerMillion || createMutation.isPending}
            onClick={() => createMutation.mutate({
              vendor: form.vendor,
              model: form.model,
              inputPricePerMillion: Number(form.inputPricePerMillion),
              outputPricePerMillion: Number(form.outputPricePerMillion),
            })}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input/1M</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output/1M</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(policies as any[])?.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{p.id}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {p.vendor}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.model}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{p.inputTokenPricePerMillion}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{p.outputTokenPricePerMillion}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {p.clientId ? `Client #${p.clientId}` : 'Global'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    onClick={() => { if (confirm('Delete this policy?')) deleteMutation.mutate(p.id) }}
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
