interface Props {
  status: string
}

export default function StatusBadge({ status }: Props) {
  const color =
    status === 'UP'
      ? 'bg-green-100 text-green-800'
      : status === 'DOWN'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}
