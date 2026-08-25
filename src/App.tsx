import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminLayout } from './components/admin/AdminLayout'
import { RequireAuth, RequireAdmin, RequireClient } from './components/RequireAuth'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Dashboard } from './pages/Dashboard'
import { AlertsPage } from './pages/AlertsPage'
import { EBooks } from './pages/EBooks'
import { Courses } from './pages/Courses'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminRequests } from './pages/admin/AdminRequests'
import { AdminTutorials } from './pages/admin/AdminTutorials'
import { AdminMembers } from './pages/admin/AdminMembers'
import { AdminEvents } from './pages/admin/AdminEvents'
import {
  Billing,
  Favorites,
  ForgotPassword,
  Logout,
} from './pages/Placeholder'
import { Community } from './pages/Community'
import { EconomicCalendar } from './pages/EconomicCalendar'
import { TradingJournal } from './pages/TradingJournal'
import { ChoosePlan } from './pages/ChoosePlan'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { TermsOfService } from './pages/TermsOfService'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/choose-plan" element={<ChoosePlan />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/logout" element={<Logout />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireClient />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/ebooks" element={<EBooks />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/community" element={<Community />} />
            <Route path="/economic-calendar" element={<EconomicCalendar />} />
            <Route path="/trading-journal" element={<TradingJournal />} />
            <Route path="/more" element={<Navigate to="/economic-calendar" replace />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/profile" element={<Dashboard />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="tutorials" element={<AdminTutorials />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="members" element={<AdminMembers />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
