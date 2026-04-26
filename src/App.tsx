import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Chat from "./pages/Chat"
import Tasks from "./pages/Tasks"
import Settings from "./pages/Settings"
import NotificationsPage from "./pages/NotificationsPage"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
