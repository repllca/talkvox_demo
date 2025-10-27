// src/App.tsx
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Camera from './pages/Camera'
import Index from "./pages/Index"
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
        <Route path="/index" element={<Index />} />
      </Routes>
    </>
  )
}

export default App
