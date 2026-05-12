import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import { AuthCallback } from './pages/AuthCallback'

export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={<Home />} />
    </Routes>
  )
}
