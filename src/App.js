import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Home from './components/Home'
import WorkoutLog from './components/WorkoutLog'
import History from './components/History'
import Progress from './components/Progress'
import Schedule from './components/Schedule'
import Recovery from './components/Recovery'
import './App.css'
import './JamesSessionGuard.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [logDay, setLogDay] = useState(0)
  const [logKey, setLogKey] = useState(0)
  const [logMounted, setLogMounted] = useState(false)
  const [activeSession, setActiveSession] = useState(null) // day index of an in-progress session

  // On app open, pick up any in-progress session pointer saved on this device
  useEffect(() => {
    if (!session) return
    try {
      const raw = localStorage.getItem(`james_active_${session.user.id}`)
      if (raw) {
        const a = JSON.parse(raw)
        if (a && Date.now() - a.updatedAt < 18 * 3600000) {
          setActiveSession(a.dayIdx)
          setLogDay(a.dayIdx)
        }
      }
    } catch (e) {}
  }, [session])

  function navigateToLog(dayIdx) {
    // Same session already open? Just go back to it — never remount mid-workout
    if (logMounted && dayIdx === activeSession) { setActiveTab('log'); return }
    setLogDay(dayIdx)
    setLogKey(k => k + 1)
    setLogMounted(true)
    setActiveTab('log')
  }

  function openTab(id) {
    if (id === 'log') setLogMounted(true)
    setActiveTab(id)
  }

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
      <div className="loading-icon">💪</div>
      <div className="loading-text">James</div>
    </div>
  )

  if (!session) return <Login />

  return (
    <div className="app">
      <div className="app-content">
        {activeTab === 'home' && <Home userId={session.user.id} onNavigate={openTab} onStartSession={navigateToLog} activeSession={activeSession} />}
        {(logMounted || activeTab === 'log') && (
          // Stays mounted (just hidden) when you switch tabs, so an in-progress session is never lost
          <div style={{ display: activeTab === 'log' ? 'block' : 'none' }}>
            <WorkoutLog key={logKey} userId={session.user.id} initialDay={logDay} onActiveChange={setActiveSession} onExit={() => { setActiveSession(null); setLogMounted(false); setActiveTab('home') }} />
          </div>
        )}
        {activeTab === 'history' && <History userId={session.user.id} />}
        {activeTab === 'progress' && <Progress userId={session.user.id} />}
        {activeTab === 'schedule' && <Schedule userId={session.user.id} />}
        {activeTab === 'recovery' && <Recovery />}
      </div>
      <nav className="bottom-nav">
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'log', icon: '🏋️', label: 'Log' },
          { id: 'progress', icon: '📈', label: 'Progress' },
          { id: 'recovery', icon: '🧠', label: 'Recovery' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => openTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}{tab.id === 'log' && activeSession !== null && <span className="nav-live-dot" />}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
