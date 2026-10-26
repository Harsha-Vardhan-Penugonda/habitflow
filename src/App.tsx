import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { NotFound } from './components/Feedback'
import { Layout } from './components/Layout'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { supabaseConfig } from './lib/env'
import { LoginPage, SignupPage } from './pages/AuthPages'
import { DashboardPage } from './pages/DashboardPage'
import { HabitDetailPage } from './pages/HabitDetailPage'
import { HabitsPage } from './pages/HabitsPage'
import { SetupScreen } from './pages/SetupScreen'
import { WelcomeScreen } from './pages/WelcomeScreen'

export default function App() {
  // Without valid Supabase settings nothing else can work, so show setup help instead.
  if (!supabaseConfig.ok) return <SetupScreen issues={supabaseConfig.issues} />

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/welcome" element={<WelcomeScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/habits" element={<HabitsPage />} />
                <Route path="/habits/:habitId" element={<HabitDetailPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
