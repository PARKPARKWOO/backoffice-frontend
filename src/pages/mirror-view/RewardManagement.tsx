import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRewards, createReward, updateReward, deleteReward } from '../../api/mirrorViewApi'

const REWARD_TYPES = ['QUIZ_FREE', 'AD_SKIP']

export default function RewardManagement() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ streakDays: '', rewardType: 'QUIZ_FREE', rewardValue: '', description: '', isActive: true })

  const { data: rewards, isLoading } = useQuery({ queryKey: ['mv-rewards'], queryFn: fetchRewards })

  const createMut = useMutation({
    mutationFn: () => createReward({ streakDays: Number(form.streakDays), rewardType: form.rewardType, rewardValue: form.rewardValue, description: form.description || undefined, isActive: form.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mv-rewards'] }); resetForm() },
  })

  const updateMut = useMutation({
    mutationFn: () => updateReward(editingId!, { streakDays: Number(form.streakDays), rewardType: form.rewardType, rewardValue: form.rewardValue, description: form.description || undefined, isActive: form.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mv-rewards'] }); resetForm() },
  })

  const deleteMut = useMutation({
    mutationFn: deleteReward,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mv-rewards'] }),
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ streakDays: '', rewardType: 'QUIZ_FREE', rewardValue: '', description: '', isActive: true })
  }

  const startEdit = (r: any) => {
    setEditingId(r.id)
    setForm({ streakDays: String(r.streakDays), rewardType: r.rewardType, rewardValue: r.rewardValue, description: r.description ?? '', isActive: r.isActive })
    setShowForm(true)
  }

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mirror View - Attendance Rewards</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? 'Cancel' : 'Create Reward'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">{editingId ? 'Edit Reward' : 'New Reward'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" type="number" placeholder="Streak Days (e.g. 7)" value={form.streakDays} onChange={(e) => setForm({ ...form, streakDays: e.target.value })} />
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value })}>
              {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Reward Value (e.g. 1)" value={form.rewardValue} onChange={(e) => setForm({ ...form, rewardValue: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          </div>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            disabled={!form.streakDays || !form.rewardValue}
            onClick={() => editingId ? updateMut.mutate() : createMut.mutate()}
          >{editingId ? 'Update' : 'Create'}</button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Streak Days</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(rewards as any[])?.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{r.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.streakDays}days</td>
                <td className="px-6 py-4 text-sm"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{r.rewardType}</span></td>
                <td className="px-6 py-4 text-sm text-gray-900">{r.rewardValue}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.description ?? '-'}</td>
                <td className="px-6 py-4 text-sm">{r.isActive ? <span className="text-green-600">Yes</span> : <span className="text-red-500">No</span>}</td>
                <td className="px-6 py-4 text-sm flex gap-3">
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" onClick={() => startEdit(r)}>Edit</button>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={() => { if (confirm('Delete?')) deleteMut.mutate(r.id) }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
