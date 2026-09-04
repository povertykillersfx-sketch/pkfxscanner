import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminLayout } from './components/admin/AdminLayout'
import { RequireAuth, RequireAdmin, RequireClient } from './components/RequireAuth'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Dashboard } from './pages/Dashboard'
import { TradeIdeasPage } from './pages/TradeIdeasPage'
import { EBooks } from './pages/EBooks'
import { Courses } from './pages/Courses'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminRequests } from './pages/admin/AdminRequests'
import { AdminTutorials } from './pages/admin/AdminTutorials'
import { AdminMembers } from './pages/admin/AdminMembers'
import { AdminEvents } from './pages/admin/AdminEvents'
import { AdminTradeIdeas } from './pages/admin/AdminTradeIdeas'
import { AdminWelcomePack } from './pages/admin/AdminWelcomePack'
import {
  Billing,
  Favorites,
  ForgotPassword,
  Logout,
} from './pages/Placeholder'
import { Community } from './pages/Community'
import { EconomicCalendar } from './pages/EconomicCalendar'
import { TradingJournal } from './pages/TradingJournal'
import { JournalDetail } from './pages/JournalDetail'
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
            <Route path="/trade-ideas" element={<TradeIdeasPage />} />
            <Route path="/alerts" element={<Navigate to="/trade-ideas" replace />} />
            <Route path="/ebooks" element={<EBooks />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/community" element={<Community />} />
            <Route path="/economic-calendar" element={<EconomicCalendar />} />
            <Route path="/trading-journal" element={<TradingJournal />} />
            <Route path="/trading-journal/:journalId" element={<JournalDetail />} />
            <Route path="/more" element={<Navigate to="/economic-calendar" replace />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/profile" element={<Dashboard />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="trade-ideas" element={<AdminTradeIdeas />} />
            <Route path="welcome-pack" element={<AdminWelcomePack />} />
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
