import { useQuery } from '@tanstack/react-query'
import { fetchServiceHealth } from '../api/dashboardApi'
import StatusBadge from '../components/common/StatusBadge'

export default function Dashboard() {
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['serviceHealth'],
    queryFn: fetchServiceHealth,
    refetchInterval: 30000,
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>
  if (error) return <div className="text-red-500">Failed to load service health</div>

  const upCount = services?.filter((s) => s.status === 'UP').length ?? 0
  const totalCount = services?.length ?? 0

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          {upCount}/{totalCount} services healthy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services?.map((service) => (
          <div
            key={service.eurekaName}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{service.name}</h3>
              <StatusBadge status={service.status} />
            </div>
            <p className="text-xs text-gray-400">{service.eurekaName}</p>
            {service.error && (
              <p className="text-xs text-red-400 mt-1 truncate">{service.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
