import { useQuery } from '@tanstack/react-query'
import { fetchApplications } from '../../api/authApi'

export default function ApplicationManagement() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {applications?.map((app) => (
          <div
            key={app.id}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{app.name}</h3>
            <p className="text-xs text-gray-400 font-mono break-all">{app.id}</p>
          </div>
        ))}
      </div>

      {applications?.length === 0 && (
        <p className="text-gray-400 text-center mt-8">No applications found</p>
      )}
    </div>
  )
}
