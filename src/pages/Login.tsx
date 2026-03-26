export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-6">Backoffice Login</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          OAuth2 인증을 통해 로그인합니다.
        </p>
        <a
          href="/api/backoffice/v1/auth/login"
          className="block w-full bg-indigo-600 text-white text-center py-2.5 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Login with OAuth
        </a>
      </div>
    </div>
  )
}
