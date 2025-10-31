// src/App.tsx
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Camera from './pages/Camera'
import VoiceTest from "./pages/VoiceTest"
import HandTestPage from "./pages/HandTestPage"
import PoseActionPage from "./pages/PoseActionPage"
import PersonTestPage from "./pages/PersonTestPage"

import './App.css'

function App() {
  return (
    <>
      <nav style={{ marginBottom: '1rem' }}>
        <Link to="/">魚</Link> 
        
      </nav>
      

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/voice" element={<VoiceTest />} />
        <Route path="/handtest" element={<HandTestPage/>} />
        <Route path="/pose" element={<PoseActionPage/>} />
        <Route path="/person" element={<PersonTestPage/>} />
      </Routes>
   </>
  )
}

export default App
