import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import Layout from './components/layout/Layout.jsx'

// Pages
import Dashboard from './pages/Dashboard.jsx'
import AIStudio  from './pages/AIStudio.jsx'
import { Social, Marketing, Finance, Operations, Unauthorized } from './pages/stubs.jsx'
import Sales     from './pages/Sales.jsx'
import Scripts   from './pages/Scripts.jsx'
import Content   from './pages/Content.jsx'
import Settings  from './pages/Settings.jsx'
import Launches  from './pages/Launches.jsx'
import Ads       from './pages/Ads.jsx'
import Products  from './pages/Products.jsx'
import Analytics from './pages/Analytics.jsx'

// Protected route wrapper
function Protected({ page, children }) {
  const { hasAccess } = useAuth()
  return hasAccess(page) ? children : <Navigate to="/unauthorized" replace />
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"     element={<Protected page="dashboard"><Dashboard /></Protected>} />
        <Route path="/social"        element={<Protected page="social"><Social /></Protected>} />
        <Route path="/scripts"       element={<Protected page="scripts"><Scripts /></Protected>} />
        <Route path="/content"       element={<Protected page="content"><Content /></Protected>} />
        <Route path="/launches"      element={<Protected page="launches"><Launches /></Protected>} />
        <Route path="/ads"           element={<Protected page="ads"><Ads /></Protected>} />
        <Route path="/products"      element={<Protected page="products"><Products /></Protected>} />
        <Route path="/analytics"     element={<Protected page="analytics"><Analytics /></Protected>} />
        <Route path="/sales"         element={<Protected page="sales"><Sales /></Protected>} />
        <Route path="/marketing"     element={<Protected page="marketing"><Marketing /></Protected>} />
        <Route path="/finance"       element={<Protected page="finance"><Finance /></Protected>} />
        <Route path="/operations"    element={<Protected page="operations"><Operations /></Protected>} />
        <Route path="/ai"            element={<Protected page="ai"><AIStudio /></Protected>} />
        <Route path="/settings"      element={<Protected page="settings"><Settings /></Protected>} />
        <Route path="/unauthorized"  element={<Unauthorized />} />
        <Route path="*"              element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
