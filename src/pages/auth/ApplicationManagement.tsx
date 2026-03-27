import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApplications, registerApplication, registerOAuthProvider, registerDomain } from '../../api/authApi'

const REDIRECT_TYPES = ['REDIRECT_WITH_COOKIE', 'JSON', 'QUERY_PARAM']
const PROVIDERS = ['KAKAO', 'GOOGLE', 'NAVER', 'BAND']

export default function ApplicationManagement() {
  const queryClient = useQueryClient()
  const [showAppForm, setShowAppForm] = useState(false)
  const [showOAuthForm, setShowOAuthForm] = useState(false)
  const [showDomainForm, setShowDomainForm] = useState(false)
  const [appForm, setAppForm] = useState({ name: '', redirectUrl: '', redirectType: 'REDIRECT_WITH_COOKIE' })
  const [oauthForm, setOauthForm] = useState({ applicationId: '', provider: 'KAKAO', clientId: '', clientSecret: '' })
  const [domainForm, setDomainForm] = useState({ applicationId: '', domains: '' })

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  })

  const appMutation = useMutation({
    mutationFn: registerApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      setShowAppForm(false)
      setAppForm({ name: '', redirectUrl: '', redirectType: 'REDIRECT_WITH_COOKIE' })
    },
  })

  const oauthMutation = useMutation({
    mutationFn: registerOAuthProvider,
    onSuccess: () => setShowOAuthForm(false),
  })

  const domainMutation = useMutation({
    mutationFn: registerDomain,
    onSuccess: () => setShowDomainForm(false),
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Application Management</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700" onClick={() => { setShowAppForm(!showAppForm); setShowOAuthForm(false); setShowDomainForm(false) }}>
            {showAppForm ? 'Cancel' : 'Register App'}
          </button>
          <button className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700" onClick={() => { setShowOAuthForm(!showOAuthForm); setShowAppForm(false); setShowDomainForm(false) }}>
            {showOAuthForm ? 'Cancel' : 'Add OAuth'}
          </button>
          <button className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700" onClick={() => { setShowDomainForm(!showDomainForm); setShowAppForm(false); setShowOAuthForm(false) }}>
            {showDomainForm ? 'Cancel' : 'Add Domain'}
          </button>
        </div>
      </div>

      {/* Register Application */}
      {showAppForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Register Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="App Name" value={appForm.name} onChange={(e) => setAppForm({ ...appForm, name: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Redirect URL" value={appForm.redirectUrl} onChange={(e) => setAppForm({ ...appForm, redirectUrl: e.target.value })} />
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={appForm.redirectType} onChange={(e) => setAppForm({ ...appForm, redirectType: e.target.value })}>
              {REDIRECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-50" disabled={!appForm.name || !appForm.redirectUrl || appMutation.isPending} onClick={() => appMutation.mutate(appForm)}>
            Register
          </button>
          {appMutation.isSuccess && <p className="text-green-600 text-sm mt-2">Application ID: {appMutation.data}</p>}
        </div>
      )}

      {/* Register OAuth Provider */}
      {showOAuthForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Register OAuth Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Application ID" value={oauthForm.applicationId} onChange={(e) => setOauthForm({ ...oauthForm, applicationId: e.target.value })} />
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={oauthForm.provider} onChange={(e) => setOauthForm({ ...oauthForm, provider: e.target.value })}>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Client ID" value={oauthForm.clientId} onChange={(e) => setOauthForm({ ...oauthForm, clientId: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Client Secret (optional)" value={oauthForm.clientSecret} onChange={(e) => setOauthForm({ ...oauthForm, clientSecret: e.target.value })} />
          </div>
          <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-md text-sm disabled:opacity-50" disabled={!oauthForm.applicationId || !oauthForm.clientId || oauthMutation.isPending} onClick={() => oauthMutation.mutate(oauthForm)}>
            Register OAuth
          </button>
          {oauthMutation.isSuccess && <p className="text-green-600 text-sm mt-2">OAuth provider registered</p>}
        </div>
      )}

      {/* Register Domain */}
      {showDomainForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Register CORS Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Application ID" value={domainForm.applicationId} onChange={(e) => setDomainForm({ ...domainForm, applicationId: e.target.value })} />
            <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Domains (comma separated)" value={domainForm.domains} onChange={(e) => setDomainForm({ ...domainForm, domains: e.target.value })} />
          </div>
          <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md text-sm disabled:opacity-50" disabled={!domainForm.applicationId || !domainForm.domains || domainMutation.isPending} onClick={() => domainMutation.mutate({ applicationId: domainForm.applicationId, domains: domainForm.domains.split(',').map(d => d.trim()) })}>
            Register Domain
          </button>
          {domainMutation.isSuccess && <p className="text-green-600 text-sm mt-2">Domains registered</p>}
        </div>
      )}

      {/* Application List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {applications?.map((app) => (
          <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
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
