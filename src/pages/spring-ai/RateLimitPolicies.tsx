import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRateLimitPolicies,
  createRateLimitPolicy,
  updateRateLimitPolicy,
  deleteRateLimitPolicy,
} from '../../api/springAiApi'

const VENDORS = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'X_AI']
const TIERS = ['FREE', 'PAID']

interface Policy {
  id: number
  vendor: string
  tier: string
  applicationId: string | null
  rpm: number
  rpd: number
}

export default function RateLimitPolicies() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    vendor: 'GOOGLE',
    tier: 'FREE',
    applicationId: '',
    rpm: '',
    rpd: '',
  })
  const [editing, setEditing] = useState<Record<number, { rpm: string; rpd: string }>>({})

  const { data: policies, isLoading } = useQuery({
    queryKey: ['rateLimitPolicies'],
    queryFn: fetchRateLimitPolicies,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rateLimitPolicies'] })

  const createMutation = useMutation({
    mutationFn: createRateLimitPolicy,
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      setForm({ vendor: 'GOOGLE', tier: 'FREE', applicationId: '', rpm: '', rpd: '' })
    },
  })
  const updateMutation = useMutation({
    mutationFn: updateRateLimitPolicy,
    onSuccess: (_d, vars) => {
      invalidate()
      setEditing((prev) => {
        const next = { ...prev }
        delete next[vars.id]
        return next
      })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteRateLimitPolicy,
    onSuccess: invalidate,
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Spring AI - Rate Limit Policies</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create Policy'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            >
              {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
            >
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="applicationId (비우면 공용 default)"
              value={form.applicationId}
              onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
            />
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              type="number"
              placeholder="RPM (분당 요청수)"
              value={form.rpm}
              onChange={(e) => setForm({ ...form, rpm: e.target.value })}
            />
            <input
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              type="number"
              placeholder="RPD (일일 요청수, PST 자정 리셋)"
              value={form.rpd}
              onChange={(e) => setForm({ ...form, rpd: e.target.value })}
            />
          </div>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            disabled={!form.rpm || !form.rpd || createMutation.isPending}
            onClick={() => createMutation.mutate({
              vendor: form.vendor,
              tier: form.tier,
              applicationId: form.applicationId.trim() === '' ? null : form.applicationId.trim(),
              rpm: Number(form.rpm),
              rpd: Number(form.rpd),
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RPM</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RPD</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(policies as Policy[])?.map((p) => {
              const draft = editing[p.id]
              const isEditing = draft != null
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{p.id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {p.vendor}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.tier === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {p.applicationId ?? <span className="italic text-gray-400">Global default</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {isEditing ? (
                      <input
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm w-24"
                        type="number"
                        value={draft.rpm}
                        onChange={(e) => setEditing({ ...editing, [p.id]: { ...draft, rpm: e.target.value } })}
                      />
                    ) : p.rpm}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {isEditing ? (
                      <input
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm w-28"
                        type="number"
                        value={draft.rpd}
                        onChange={(e) => setEditing({ ...editing, [p.id]: { ...draft, rpd: e.target.value } })}
                      />
                    ) : p.rpd}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-3">
                    {isEditing ? (
                      <>
                        <button
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
                          disabled={!draft.rpm || !draft.rpd || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({
                            id: p.id,
                            rpm: Number(draft.rpm),
                            rpd: Number(draft.rpd),
                          })}
                        >
                          Save
                        </button>
                        <button
                          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                          onClick={() => setEditing((prev) => {
                            const next = { ...prev }
                            delete next[p.id]
                            return next
                          })}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          onClick={() => setEditing({ ...editing, [p.id]: { rpm: String(p.rpm), rpd: String(p.rpd) } })}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          onClick={() => { if (confirm('Delete this policy?')) deleteMutation.mutate(p.id) }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
