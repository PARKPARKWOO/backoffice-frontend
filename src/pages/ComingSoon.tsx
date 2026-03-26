export default function ComingSoon({ service }: { service: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{service}</h2>
      <p className="text-gray-500">Admin API 구현 후 연동 예정</p>
    </div>
  )
}
