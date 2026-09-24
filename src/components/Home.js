import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DAYS } from '../lib/data'
import './JamesHome.css'

const WALK_ADVICE = {
  clear: { icon: '☀️', msg: 'Clear skies — good morning for the walk.' },
  partly_cloudy: { icon: '⛅', msg: 'Partly cloudy — solid walking weather.' },
  cloudy: { icon: '☁️', msg: 'Overcast but dry — no issues for your walk.' },
  drizzle: { icon: '🌦️', msg: 'Light drizzle — grab a jacket.' },
  rain: { icon: '🌧️', msg: 'Rain — waterproof layer for the walk.' },
  snow: { icon: '🌨️', msg: 'Snow on the ground — watch your footing.' },
  thunderstorm: { icon: '⛈️', msg: 'Storm — check before you head out.' },
  fog: { icon: '🌫️', msg: 'Foggy — cars may not see you clearly.' },
  wind: { icon: '💨', msg: 'Windy — feels colder than it looks.' },
}

function getWmoDescription(code) {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly_cloudy'
  if (code <= 3) return 'cloudy'
  if (code <= 49) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'rain'
  if (code <= 99) return 'thunderstorm'
  return 'clear'
}

function getTempAdvice(feelsLike) {
  if (feelsLike <= 20) return '🧥 Very cold — heavy coat, gloves, hat.'
  if (feelsLike <= 32) return '🧥 Freezing — warm layers essential.'
  if (feelsLike <= 45) return '🧣 Cold — jacket and layers.'
  if (feelsLike <= 55) return '🧥 Cool — a light jacket.'
  if (feelsLike <= 68) return '👕 Comfortable — light layer optional.'
  if (feelsLike <= 80) return '😎 Warm — light clothes.'
  return '🥵 Hot — stay hydrated on the walk.'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getNextScheduled(schedule) {
  if (!schedule || !schedule.length) return null
  const today = new Date()
  const todayDay = today.getDay()
  const todayTime = today.getHours() * 60 + today.getMinutes()

  let best = null
  let bestDiff = Infinity

  schedule.filter(s => s.enabled && s.weekday !== null).forEach(s => {
    let diff = s.weekday - todayDay
    if (diff < 0) diff += 7
    if (diff === 0) {
      const [h, m] = s.time.split(':').map(Number)
      const schedMins = h * 60 + m
      if (schedMins <= todayTime) diff = 7
    }
    if (diff < bestDiff) {
      bestDiff = diff
      best = { ...s, daysUntil: diff }
    }
  })
  return best
}

function formatNextDay(item) {
  if (!item) return null
  const d = new Date()
  d.setDate(d.getDate() + item.daysUntil)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
  const [h, m] = item.time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return { weekday, time: `${h12}:${m.toString().padStart(2,'0')} ${ampm}`, daysUntil: item.daysUntil }
}

export default function Home({ userId, onNavigate }) {
  const [weather, setWeather] = useState(null)
  const [weatherErr, setWeatherErr] = useState(false)
  const [schedule, setSchedule] = useState([])
  const [stats, setStats] = useState({ total: 0, streak: 0, thisMonth: 0 })
  const [nextSession, setNextSession] = useState(null)

  useEffect(() => {
    // Load schedule
    async function loadSchedule() {
      const { data } = await supabase.from('schedule').select('*').eq('user_id', userId)
      if (data) {
        const strength = data.filter(r => !r.is_walk)
        setSchedule(strength)
        const next = getNextScheduled(strength)
        setNextSession(next)
      }
    }

    // Load session stats
    async function loadStats() {
      const { data } = await supabase
        .from('sessions')
        .select('session_date, day_index')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })

      if (!data || !data.length) return

      const total = data.length
      const now = new Date()
      const thisMonth = data.filter(s => {
        const d = new Date(s.session_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length

      // streak: consecutive weeks with at least 1 session
      let streak = 0
      const weekSet = new Set()
      data.forEach(s => {
        const d = new Date(s.session_date)
        const week = `${d.getFullYear()}-${Math.floor(d.getDate() / 7)}-${d.getMonth()}`
        weekSet.add(week)
      })
      streak = weekSet.size

      setStats({ total, thisMonth, streak })
    }

    // Fetch weather via GPS
    function fetchWeather(lat, lon) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`)
        .then(r => r.json())
        .then(d => {
          const c = d.current
          const code = getWmoDescription(c.weather_code)
          setWeather({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            wind: Math.round(c.wind_speed_10m),
            condition: code,
          })
        })
        .catch(() => setWeatherErr(true))
    }

    loadSchedule()
    loadStats()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => setWeatherErr(true),
        { timeout: 8000 }
      )
    } else {
      setWeatherErr(true)
    }
  }, [userId])

  const next = formatNextDay(nextSession)
  const wInfo = weather ? WALK_ADVICE[weather.condition] : null
  const tempAdvice = weather ? getTempAdvice(weather.feelsLike) : null

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-greeting">{getGreeting()}, Carolyn</div>
        <div className="home-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* Weather */}
      <div className="home-card weather-card">
        {weather ? (
          <>
            <div className="weather-top">
              <div className="weather-icon">{wInfo?.icon}</div>
              <div className="weather-temps">
                <div className="weather-temp">{weather.temp}°F</div>
                <div className="weather-feels">Feels like {weather.feelsLike}°F · {weather.wind} mph wind</div>
              </div>
            </div>
            <div className="weather-walk-advice">{tempAdvice}</div>
            <div className="weather-walk-note">⏱ 5-min walk to the gym — {wInfo?.msg}</div>
          </>
        ) : weatherErr ? (
          <div className="weather-unavail">Weather unavailable — allow location access to enable this.</div>
        ) : (
          <div className="weather-loading">Fetching weather...</div>
        )}
      </div>

      {/* Next session */}
      <div className="home-card next-card">
        <div className="home-card-label">Next session</div>
        {next ? (
          <>
            <div className="next-day-title">
              Day {nextSession.day_index + 1} — {nextSession.day_title}
            </div>
            <div className="next-day-when">
              {next.daysUntil === 0 ? 'Today' : next.daysUntil === 1 ? 'Tomorrow' : next.weekday} · {next.time}
            </div>
            <button className="next-go-btn" onClick={() => onNavigate('log')}>
              {next.daysUntil === 0 ? '→ Start now' : '→ Go to log'}
            </button>
          </>
        ) : (
          <div className="next-none">
            No sessions scheduled yet.{' '}
            <span className="next-link" onClick={() => onNavigate('schedule')}>Set up your schedule →</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="home-card stats-card">
        <div className="home-card-label">Your program</div>
        <div className="stats-row">
          <div className="stat-block">
            <div className="stat-val">{stats.total}</div>
            <div className="stat-lbl">Sessions logged</div>
          </div>
          <div className="stat-block">
            <div className="stat-val">{stats.thisMonth}</div>
            <div className="stat-lbl">This month</div>
          </div>
          <div className="stat-block">
            <div className="stat-val">{stats.streak}</div>
            <div className="stat-lbl">Active weeks</div>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="home-card-label" style={{marginTop: 4}}>Quick access</div>
      <div className="quick-nav">
        <button className="quick-btn" onClick={() => onNavigate('log')}>
          <span className="quick-icon">🏋️</span>
          <span className="quick-label">Log</span>
        </button>
        <button className="quick-btn" onClick={() => onNavigate('recovery')}>
          <span className="quick-icon">🧠</span>
          <span className="quick-label">Recovery</span>
        </button>
        <button className="quick-btn" onClick={() => onNavigate('schedule')}>
          <span className="quick-icon">📅</span>
          <span className="quick-label">Schedule</span>
        </button>
        <button className="quick-btn" onClick={() => onNavigate('progress')}>
          <span className="quick-icon">📈</span>
          <span className="quick-label">Progress</span>
        </button>
      </div>
    </div>
  )
}
