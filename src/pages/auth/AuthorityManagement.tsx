import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAuthorities, createAuthority } from '../../api/authApi'

export default function AuthorityManagement() {
  const queryClient = useQueryClient()
  const [newAuthority, setNewAuthority] = useState('')

  const { data: authorities, isLoading } = useQuery({
    queryKey: ['authorities'],
    queryFn: fetchAuthorities,
  })

  const mutation = useMutation({
    mutationFn: (authority: string) => createAuthority(authority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorities'] })
      setNewAuthority('')
    },
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Authority Management</h2>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Create Authority</h3>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. ROLE_MODERATOR"
            value={newAuthority}
            onChange={(e) => setNewAuthority(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            disabled={!newAuthority.trim() || mutation.isPending}
            onClick={() => mutation.mutate(newAuthority.trim())}
          >
            Create
          </button>
        </div>
        {mutation.isError && (
          <p className="text-red-500 text-sm mt-2">Failed to create authority</p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {authorities?.map((auth) => (
              <tr key={auth.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{auth.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{auth.authority}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {auth.level === 2147483647 ? (
                    <span className="text-red-600 font-medium">ADMIN</span>
                  ) : (
                    auth.level
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
