import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSupporters, deleteSupporter, markSupportComplete } from '../../api/forestApi'

export default function SupporterManagement() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['forest-supporters', page],
    queryFn: () => fetchSupporters(page, 20),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupporter,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forest-supporters'] }),
  })

  const completeMutation = useMutation({
    mutationFn: markSupportComplete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forest-supporters'] }),
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  const supporters = data?.contents ?? data?.items ?? []
  const hasNext = data?.hasNextPage ?? false
  const totalCount = data?.totalCount ?? 0

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Forest - Supporters</h2>
        <p className="text-sm text-gray-500 mt-1">{totalCount} total</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {supporters.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{s.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.title ?? s.content ?? '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    s.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {s.completed ? 'Completed' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm flex gap-3">
                  {!s.completed && (
                    <button
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                      onClick={() => completeMutation.mutate(s.id)}
                    >
                      Complete
                    </button>
                  )}
                  <button
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.id) }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">Page {page + 1}</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
