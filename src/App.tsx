import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import UserManagement from './pages/auth/UserManagement'
import ApplicationManagement from './pages/auth/ApplicationManagement'
import AuthorityManagement from './pages/auth/AuthorityManagement'
import ClientManagement from './pages/spring-ai/ClientManagement'
import ApiKeyManagement from './pages/spring-ai/ApiKeyManagement'
import PricingPolicies from './pages/spring-ai/PricingPolicies'
import RateLimitPolicies from './pages/spring-ai/RateLimitPolicies'
import SupporterManagement from './pages/forest/SupporterManagement'
import ExerciseManagement from './pages/barbellrobot/ExerciseManagement'
import RewardManagement from './pages/mirror-view/RewardManagement'
import ComingSoon from './pages/ComingSoon'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth/users" element={<UserManagement />} />
        <Route path="/auth/applications" element={<ApplicationManagement />} />
        <Route path="/auth/authorities" element={<AuthorityManagement />} />
        <Route path="/spring-ai/clients" element={<ClientManagement />} />
        <Route path="/spring-ai/api-keys" element={<ApiKeyManagement />} />
        <Route path="/spring-ai/pricing" element={<PricingPolicies />} />
        <Route path="/spring-ai/rate-limits" element={<RateLimitPolicies />} />
        <Route path="/forest/supporters" element={<SupporterManagement />} />
        <Route path="/barbellrobot/exercises" element={<ExerciseManagement />} />
        <Route path="/mirror-view/rewards" element={<RewardManagement />} />
        <Route path="/animal/posts" element={<ComingSoon service="Animal (Find My Pet)" />} />
        <Route path="/storage/files" element={<ComingSoon service="Storage" />} />
      </Route>
    </Routes>
  )
}
