import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './layouts/Sidebar'
import Messaging from './components/Messaging'
import Accounts from './components/Accounts'
import Friends from './components/Friends'
import Groups from './components/Groups'
import ExcelContacts from './components/ExcelContacts'
import Campaigns from './components/Campaigns'
import AutoReminders from './components/AutoReminders'

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-[260px] overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Messaging />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/excel-contacts" element={<ExcelContacts />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/auto-reminders" element={<AutoReminders />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
