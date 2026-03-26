import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, fetchAuthorities, updateUserRole } from '../../api/authApi'
import type { Authority } from '../../types/auth'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [selectedAuthorityId, setSelectedAuthorityId] = useState<number | null>(null)

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page, 20),
  })

  const { data: authorities } = useQuery({
    queryKey: ['authorities'],
    queryFn: fetchAuthorities,
  })

  const mutation = useMutation({
    mutationFn: ({ userId, authorityId }: { userId: string; authorityId: number }) =>
      updateUserRole(userId, authorityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUserId(null)
      setSelectedAuthorityId(null)
    },
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usersPage?.items.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{user.userName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.applicationRole}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {editingUserId === user.userId ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={selectedAuthorityId ?? ''}
                        onChange={(e) => setSelectedAuthorityId(Number(e.target.value))}
                      >
                        <option value="">Select role</option>
                        {authorities?.map((auth: Authority) => (
                          <option key={auth.id} value={auth.id}>
                            {auth.authority}
                          </option>
                        ))}
                      </select>
                      <button
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                        disabled={!selectedAuthorityId || mutation.isPending}
                        onClick={() =>
                          selectedAuthorityId &&
                          mutation.mutate({ userId: user.userId, authorityId: selectedAuthorityId })
                        }
                      >
                        Save
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-600 text-sm"
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      onClick={() => setEditingUserId(user.userId)}
                    >
                      Change Role
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usersPage && usersPage.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {usersPage.page + 1} of {usersPage.totalPages} ({usersPage.totalItems} users)
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              disabled={page >= usersPage.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
