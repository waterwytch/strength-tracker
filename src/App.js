import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import WorkoutLog from './components/WorkoutLog'
import History from './components/History'
import Progress from './components/Progress'
import Schedule from './components/Schedule'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('log')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-icon">🏋️</div>
      <div className="loading-text">Loading...</div>
    </div>
  )

  if (!session) return <Login />

  return (
    <div className="app">
      <div className="app-content">
        {activeTab === 'log' && <WorkoutLog userId={session.user.id} />}
        {activeTab === 'history' && <History userId={session.user.id} />}
        {activeTab === 'progress' && <Progress userId={session.user.id} />}
        {activeTab === 'schedule' && <Schedule userId={session.user.id} />}
      </div>
      <nav className="bottom-nav">
        {[
          { id: 'log', icon: '🏋️', label: 'Log' },
          { id: 'history', icon: '📋', label: 'History' },
          { id: 'progress', icon: '📈', label: 'Progress' },
          { id: 'schedule', icon: '📅', label: 'Schedule' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
