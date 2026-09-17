import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DAYS } from '../lib/data'
import './Schedule.css'

const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function Schedule({ userId }) {
  const [schedule, setSchedule] = useState(
    DAYS.map(d => ({ day_index: d.id, day_title: d.title, weekday: null, time: '09:00', enabled: false }))
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
          const existing = data.find(r => r.day_index === d.id)
          return existing
            ? { day_index: d.id, day_title: d.title, weekday: existing.weekday, time: existing.time, enabled: existing.enabled }
            : { day_index: d.id, day_title: d.title, weekday: null, time: '09:00', enabled: false }
        }))
      }
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    buildUpcoming()
  }, [schedule])

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
            events.push({ date: new Date(d), dayIndex: s.day_index, dayTitle: s.day_title, time: s.time })
          }
        }
      }
    })
    events.sort((a, b) => a.date - b.date)
    setUpcoming(events.slice(0, 6))
  }

  function updateSchedule(idx, field, value) {
    setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
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
        enabled: s.enabled
      }, { onConflict: 'user_id,day_index' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    buildUpcoming()
  }

  function addToCalendar(event) {
    const start = event.date
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const title = encodeURIComponent(`Strength Training — ${event.dayTitle}`)
    const details = encodeURIComponent('Strength training session')
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

      {upcoming.length > 0 && (
        <div className="sched-section">
          <div className="sched-section-title">Upcoming sessions</div>
          {upcoming.map((ev, i) => (
            <div key={i} className="upcoming-card">
              <div className="upcoming-left">
                <div className="upcoming-day">{ev.date.toLocaleDateString('en-US', {weekday:'long'})}</div>
                <div className="upcoming-date">{ev.date.toLocaleDateString('en-US', {month:'long',day:'numeric'})} at {ev.date.toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit'})}</div>
                <div className="upcoming-type">Day {ev.dayIndex + 1} — {ev.dayTitle}</div>
              </div>
              <button className="cal-btn" onClick={() => addToCalendar(ev)} title="Add to Google Calendar">📅</button>
            </div>
          ))}
          <div className="cal-note">Tap 📅 to add any session to your calendar with an alarm.</div>
        </div>
      )}
    </div>
  )
}
