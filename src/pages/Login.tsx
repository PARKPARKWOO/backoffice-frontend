export default function Login() {
  const authHost = 'https://auth.platformholder.site'
  const kakaoLoginUrl = `${authHost}/oauth2/authorization/kakao`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-6">Backoffice Login</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          관리자 계정으로 로그인하세요.
        </p>
        <a
          href={kakaoLoginUrl}
          className="block w-full bg-yellow-400 text-gray-900 text-center py-2.5 rounded-md hover:bg-yellow-500 transition-colors font-medium"
        >
          Kakao Login
        </a>
      </div>
    </div>
  )
}
