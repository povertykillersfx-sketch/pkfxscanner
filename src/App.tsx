import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SignIn } from './pages/SignIn'
import { Dashboard } from './pages/Dashboard'
import { AlertsPage } from './pages/AlertsPage'
import { EBooks } from './pages/EBooks'
import { Courses } from './pages/Courses'
import {
  Billing,
  Community,
  Favorites,
  ForgotPassword,
  Logout,
  More,
  SignUp,
} from './pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/logout" element={<Logout />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/ebooks" element={<EBooks />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/community" element={<Community />} />
        <Route path="/more" element={<More />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/profile" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
