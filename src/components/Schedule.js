import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DAYS } from '../lib/data'
import './Schedule.css'

const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const WALKS = [
  { walk_index: 0, label: 'Morning Walk 1', icon: '🚶‍♀️' },
  { walk_index: 1, label: 'Morning Walk 2', icon: '🚶‍♀️' }
]

export default function Schedule({ userId }) {
  const [schedule, setSchedule] = useState(
    DAYS.map(d => ({ day_index: d.id, day_title: d.title, weekday: null, time: '09:00', enabled: false }))
  )
  const [walks, setWalks] = useState(
    WALKS.map(w => ({ walk_index: w.walk_index, label: w.label, weekday: null, time: '07:00', enabled: false, duration: '30' }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upcoming, setUpcoming] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('schedule').select('*').eq('user_id', userId)
      if (data && data.length) {
        setSchedule(DAYS.map(d => {
          const existing = data.find(r => r.day_index === d.id && !r.is_walk)
          return existing
            ? { day_index: d.id, day_title: d.title, weekday: existing.weekday, time: existing.time, enabled: existing.enabled }
            : { day_index: d.id, day_title: d.title, weekday: null, time: '09:00', enabled: false }
        }))
        setWalks(WALKS.map(w => {
          const existing = data.find(r => r.is_walk && r.day_index === w.walk_index + 100)
          return existing
            ? { walk_index: w.walk_index, label: w.label, weekday: existing.weekday, time: existing.time, enabled: existing.enabled, duration: existing.duration || '30' }
            : { walk_index: w.walk_index, label: w.label, weekday: null, time: '07:00', enabled: false, duration: '30' }
        }))
      }
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    buildUpcoming()
  }, [schedule, walks])

  function buildUpcoming() {
    const today = new Date()
    const events = []
    schedule.filter(s => s.enabled && s.weekday !== null).forEach(s => {
      for (let i = 0; i <= 21; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        if (d.getDay() === s.weekday) {
          const [h, m] = s.time.split(':')
          d.setHours(parseInt(h), parseInt(m), 0, 0)
          if (d > today) {
            events.push({ date: new Date(d), dayIndex: s.day_index, dayTitle: s.day_title, time: s.time, type: 'strength' })
          }
        }
      }
    })
    walks.filter(w => w.enabled && w.weekday !== null).forEach(w => {
      for (let i = 0; i <= 21; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        if (d.getDay() === w.weekday) {
          const [h, m] = w.time.split(':')
          d.setHours(parseInt(h), parseInt(m), 0, 0)
          if (d > today) {
            events.push({ date: new Date(d), dayTitle: w.label, time: w.time, duration: w.duration, type: 'walk' })
          }
        }
      }
    })
    events.sort((a, b) => a.date - b.date)
    setUpcoming(events.slice(0, 8))
  }

  function updateSchedule(idx, field, value) {
    setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function updateWalk(idx, field, value) {
    setWalks(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w))
  }

  async function saveSchedule() {
    setSaving(true)
    for (const s of schedule) {
      await supabase.from('schedule').upsert({
        user_id: userId,
        day_index: s.day_index,
        day_title: s.day_title,
        weekday: s.weekday,
        time: s.time,
        enabled: s.enabled,
        is_walk: false
      }, { onConflict: 'user_id,day_index' })
    }
    for (const w of walks) {
      await supabase.from('schedule').upsert({
        user_id: userId,
        day_index: w.walk_index + 100,
        day_title: w.label,
        weekday: w.weekday,
        time: w.time,
        enabled: w.enabled,
        is_walk: true,
        duration: w.duration
      }, { onConflict: 'user_id,day_index' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    buildUpcoming()
  }

  function addToCalendar(event) {
    const start = event.date
    const durationMs = event.type === 'walk' ? (parseInt(event.duration || 30) * 60 * 1000) : (60 * 60 * 1000)
    const end = new Date(start.getTime() + durationMs)
    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const title = event.type === 'walk'
      ? encodeURIComponent(`Morning Walk — ${event.duration || 30} min`)
      : encodeURIComponent(`Strength Training — ${event.dayTitle}`)
    const details = event.type === 'walk'
      ? encodeURIComponent('Morning walk')
      : encodeURIComponent('Strength training session')
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="sched-loading">Loading schedule...</div>

  return (
    <div className="schedule-page">
      <div className="schedule-title">Schedule</div>

      <div className="sched-section">
        <div className="sched-section-title">Workout days</div>
        {schedule.map((s, i) => (
          <div key={i} className="sched-day-card">
            <div className="sched-day-top">
              <div>
                <div className="sched-day-label">Day {s.day_index + 1}</div>
                <div className="sched-day-title">{s.day_title}</div>
              </div>
              <label className="toggle-wrap">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={s.enabled}
                  onChange={e => updateSchedule(i, 'enabled', e.target.checked)}
                />
                <div className={`toggle-track ${s.enabled ? 'on' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
              </label>
            </div>
            {s.enabled && (
              <div className="sched-day-fields">
                <select
                  className="sched-select"
                  value={s.weekday ?? ''}
                  onChange={e => updateSchedule(i, 'weekday', e.target.value === '' ? null : parseInt(e.target.value))}
                >
                  <option value="">Select day</option>
                  {WEEKDAYS.map((d, j) => <option key={j} value={j}>{d}</option>)}
                </select>
                <input
                  className="sched-time"
                  type="time"
                  value={s.time}
                  onChange={e => updateSchedule(i, 'time', e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
        <button className="save-sched-btn" onClick={saveSchedule} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save schedule'}
        </button>
      </div>

      <div className="sched-section">
        <div className="sched-section-title">Morning walks</div>
        <div className="sched-walk-note">Schedule 2 walks on your non-lifting days for active recovery and insulin sensitivity.</div>
        {walks.map((w, i) => (
          <div key={i} className="sched-day-card">
            <div className="sched-day-top">
              <div>
                <div className="sched-day-label">🚶‍♀️ {w.label}</div>
                <div className="sched-day-title sched-walk-sub">Active recovery</div>
              </div>
              <label className="toggle-wrap">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={w.enabled}
                  onChange={e => updateWalk(i, 'enabled', e.target.checked)}
                />
                <div className={`toggle-track ${w.enabled ? 'on' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
              </label>
            </div>
            {w.enabled && (
              <div className="sched-day-fields walk-fields">
                <select
                  className="sched-select"
                  value={w.weekday ?? ''}
                  onChange={e => updateWalk(i, 'weekday', e.target.value === '' ? null : parseInt(e.target.value))}
                >
                  <option value="">Select day</option>
                  {WEEKDAYS.map((d, j) => <option key={j} value={j}>{d}</option>)}
                </select>
                <input
                  className="sched-time"
                  type="time"
                  value={w.time}
                  onChange={e => updateWalk(i, 'time', e.target.value)}
                />
                <select
                  className="sched-select sched-dur"
                  value={w.duration}
                  onChange={e => updateWalk(i, 'duration', e.target.value)}
                >
                  {['20','30','45','60','90'].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
        <button className="save-sched-btn" onClick={saveSchedule} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save schedule'}
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="sched-section">
          <div className="sched-section-title">Upcoming</div>
          {upcoming.map((ev, i) => (
            <div key={i} className={`upcoming-card ${ev.type === 'walk' ? 'walk-card' : ''}`}>
              <div className="upcoming-left">
                <div className="upcoming-day">{ev.date.toLocaleDateString('en-US', {weekday:'long'})}</div>
                <div className="upcoming-date">{ev.date.toLocaleDateString('en-US', {month:'long',day:'numeric'})} at {ev.date.toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit'})}</div>
                {ev.type === 'walk'
                  ? <div className="upcoming-type walk-type">🚶‍♀️ Morning Walk · {ev.duration || 30} min</div>
                  : <div className="upcoming-type">Day {ev.dayIndex + 1} — {ev.dayTitle}</div>
                }
              </div>
              <button className="cal-btn" onClick={() => addToCalendar(ev)} title="Add to Google Calendar">📅</button>
            </div>
          ))}
          <div className="cal-note">Tap 📅 to add any session to your calendar.</div>
        </div>
      )}
    </div>
  )
}
