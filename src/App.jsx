import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './layouts/Sidebar'
import Messaging from './components/Messaging'
import Accounts from './components/Accounts'
import Friends from './components/Friends'
import Groups from './components/Groups'
import ExcelContacts from './components/ExcelContacts'
import Campaigns from './components/Campaigns'
import AutoReminders from './components/AutoReminders'
import Settings from './components/Settings'
import Login from './components/Login'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Kiểm tra token khi khởi động
    const token = localStorage.getItem('appToken')
    const savedUser = localStorage.getItem('authUser')
    if (token && savedUser) {
      setIsAuthenticated(true)
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error('Invalid user data in storage')
      }
    }
    setIsChecking(false)
  }, [])

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('appToken')
    localStorage.removeItem('authUser')
    setIsAuthenticated(false)
    setUser(null)
  }

  if (isChecking) {
    return <div className="h-screen flex items-center justify-center bg-gray-50">Đang tải...</div>
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 ml-[260px] overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Messaging />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/excel-contacts" element={<ExcelContacts />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/auto-reminders" element={<AutoReminders />} />
            
            {/* Chặn truy cập trang cài đặt nếu không phải Admin */}
            <Route 
              path="/settings" 
              element={user?.role === 'admin' ? <Settings /> : <Navigate to="/" replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
