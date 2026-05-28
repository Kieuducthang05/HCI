import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import SelectUser from './pages/SelectUser'
import ParentLayout from './pages/ParentLayout'
import ParentHome from './pages/ParentHome'
import EmotionDiary from './pages/EmotionDiary'
import ParentSettings from './pages/ParentSettings'
import ParentShop from './pages/ParentShop'
import ChildLayout from './pages/ChildLayout'
import ChildHome from './pages/ChildHome'
import ChildLearn from './pages/ChildLearn'
import ChildGames from './pages/ChildGames'
import ChildFriends from './pages/ChildFriends'
import ChildChat from './pages/ChildChat'
import ChildEmotion from './pages/ChildEmotion'
import ChildAvatar from './pages/ChildAvatar'
import ChildInventory from './pages/ChildInventory'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/select-user" element={<SelectUser />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Parent Routes */}
        <Route path="/parent" element={<ParentLayout />}>
          <Route path="home" element={<ParentHome />} />
          <Route path="emotion-diary" element={<EmotionDiary />} />
          <Route path="settings" element={<ParentSettings />} />
          <Route path="shop" element={<ParentShop />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>

        {/* Child Routes */}
        <Route path="/child" element={<ChildLayout />}>
          <Route path="home" element={<ChildHome />} />
          <Route path="learn" element={<ChildLearn />} />
          <Route path="games" element={<ChildGames />} />
          <Route path="chat" element={<ChildChat />} />
          <Route path="emotion" element={<ChildEmotion />} />
          <Route path="friends" element={<ChildFriends />} />
          <Route path="avatar" element={<ChildAvatar />} />
          <Route path="inventory" element={<ChildInventory />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
