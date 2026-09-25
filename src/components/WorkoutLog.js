import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DAYS, JOINTS, FORM, BANK, SEED_SESSIONS } from '../lib/data'
import './WorkoutLog.css'

const WALK_TABS = [
  { id: 'walk1', label: 'Walk 1', icon: '🚶', cue: 'Easy pace — you should be able to hold a conversation. Focus on nasal breathing.' },
  { id: 'walk2', label: 'Walk 2', icon: '⛰️', cue: 'Easy pace — you should be able to hold a conversation. Focus on nasal breathing.' }
]

export default function WorkoutLog({ userId, initialDay = 0 }) {
  const [dayIdx, setDayIdx] = useState(initialDay) // 0-2 = strength days, 3-4 = walks
  const [draft, setDraft] = useState(null)
  const [lastSession, setLastSession] = useState(null)
  const [view, setView] = useState('log') // log | success | swap
  const [swapTarget, setSwapTarget] = useState(null)
  const [savedSession, setSavedSession] = useState(null)
  const [saving, setSaving] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [walkLog, setWalkLog] = useState({ duration: '', calories: '', hr: '', pace: '', distance: '', elevation: '' })
  const [walkSaved, setWalkSaved] = useState(false)
  const [walkSaving, setWalkSaving] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const autoSaveTimer = React.useRef(null)

  // Auto-save draft to Supabase
  const saveDraft = useCallback(async (idx, draftData) => {
    if (idx >= DAYS.length || !draftData) return
    await supabase.from('session_drafts').upsert({
      user_id: userId,
      day_index: idx,
      draft: draftData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,day_index' })
  }, [userId])

  // Load saved draft from Supabase
  const loadDraft = useCallback(async (idx) => {
    if (idx >= DAYS.length) return null
    const { data } = await supabase
      .from('session_drafts')
      .select('draft, updated_at')
      .eq('user_id', userId)
      .eq('day_index', idx)
      .single()
    return data || null
  }, [userId])

  // Clear draft after finishing
  const clearDraft = useCallback(async (idx) => {
    await supabase.from('session_drafts')
      .delete()
      .eq('user_id', userId)
      .eq('day_index', idx)
  }, [userId])

  const loadLastSession = useCallback(async (idx) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('day_index', idx)
      .order('session_date', { ascending: false })
      .limit(1)
    setLastSession(data && data[0] ? data[0] : null)
  }, [userId])

  const seedSessions = useCallback(async () => {
    const { data: existing } = await supabase.from('sessions').select('id').eq('user_id', userId).limit(1)
    if (existing && existing.length > 0) { setSeeded(true); return; }
    for (const s of SEED_SESSIONS) {
      await supabase.from('sessions').insert({
        user_id: userId,
        day_index: s.day_index,
        day_title: s.day_title,
        session_date: s.session_date,
        notes: s.notes,
        joints: s.joints,
        exercises: s.exercises
      })
    }
    setSeeded(true)
  }, [userId])

  useEffect(() => {
    seedSessions()
  }, [seedSessions])

  useEffect(() => {
    if (seeded && dayIdx < DAYS.length) loadLastSession(dayIdx)
  }, [dayIdx, seeded, loadLastSession])

  useEffect(() => {
    if (lastSession !== undefined) {
      // Check for a saved draft first
      if (dayIdx < DAYS.length) {
        loadDraft(dayIdx).then(saved => {
          if (saved && saved.draft) {
            setDraft(saved.draft)
            setDraftRestored(true)
            setTimeout(() => setDraftRestored(false), 3000)
          } else {
            initDraft(dayIdx, lastSession || null)
          }
        })
      } else {
        initDraft(dayIdx, lastSession || null)
      }
    }
  }, [lastSession, dayIdx])

  // Auto-save draft 2 seconds after any change
  useEffect(() => {
    if (!draft || dayIdx >= DAYS.length) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(dayIdx, draft)
    }, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [draft, dayIdx, saveDraft])

  function initDraft(idx, last) {
    if (idx >= DAYS.length) return
    const D = DAYS[idx]
    const exList = D.exercises.map((ex, ei) => {
      const prevSets = last && last.exercises && last.exercises[ei] && last.exercises[ei].name === ex.n
        ? last.exercises[ei].sets : null
      // Use previous session's set count if available, otherwise default from program
      const setCount = prevSets ? prevSets.length : ex.sets
      // Use last set's values as the fill-forward default
      const lastPrev = prevSets && prevSets.length > 0 ? prevSets[prevSets.length - 1] : null
      const sets = Array.from({ length: setCount }, (_, si) => ({
        reps: prevSets && prevSets[si] ? prevSets[si].reps : (lastPrev ? lastPrev.reps : ex.reps),
        wt: prevSets && prevSets[si] ? prevSets[si].wt : (lastPrev ? lastPrev.wt : ex.wt),
        done: false
      }))
      return { name: ex.n, rest: ex.rest, sets }
    })
    setDraft({ joints: {}, notes: '', exercises: exList, watch: { time: '', activeCal: '', totalCal: '', avgHR: '', effort: '' } })
  }

  function updateSet(ei, si, field, value) {
    setDraft(prev => {
      const next = { ...prev, exercises: prev.exercises.map((ex, i) => {
        if (i !== ei) return ex
        return { ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, [field]: value } : s) }
      })}
      return next
    })
  }

  function toggleDone(ei, si) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== ei) return ex
        return { ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, done: !s.done } : s) }
      })
    }))
  }

  function addSet(ei) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== ei) return ex
        const last = ex.sets[ex.sets.length - 1] || { reps: '8', wt: '—', done: false }
        return { ...ex, sets: [...ex.sets, { reps: last.reps, wt: last.wt, done: false }] }
      })
    }))
  }

  function removeSet(ei, si) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== ei || ex.sets.length <= 1) return ex
        return { ...ex, sets: ex.sets.filter((_, j) => j !== si) }
      })
    }))
  }

  function setJoint(joint, val) {
    setDraft(prev => ({
      ...prev,
      joints: { ...prev.joints, [joint]: prev.joints[joint] === val ? null : val }
    }))
  }

  function doSwap(name) {
    const { ei } = swapTarget
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== ei) return ex
        return { ...ex, name, sets: ex.sets.map(s => ({ ...s, done: false })) }
      })
    }))
    setView('log')
    setSwapTarget(null)
  }

  async function finishSession() {
    const incompleteSets = draft.exercises.reduce((a, ex) => a + ex.sets.filter(s => !s.done).length, 0)
    if (incompleteSets > 0) {
      const go = window.confirm(`You have ${incompleteSets} incomplete set${incompleteSets > 1 ? 's' : ''}. Save anyway?`)
      if (!go) return
    }
    setSaving(true)
    const D = DAYS[dayIdx]
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase.from('sessions').insert({
      user_id: userId,
      day_index: dayIdx,
      day_title: D.title,
      session_date: today,
      notes: draft.notes,
      joints: draft.joints,
      exercises: draft.exercises,
      watch_data: draft.watch
    }).select().single()
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return; }
    await clearDraft(dayIdx)
    setSavedSession(data)
    setView('success')
  }

  function afterSuccess() {
    setView('log')
    setSavedSession(null)
    loadLastSession(dayIdx)
  }

  const D = DAYS[dayIdx]

  if (view === 'success' && savedSession) {
    const exList = savedSession.exercises || []
    const doneSets = exList.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0)
    const totalSets = exList.reduce((a, ex) => a + ex.sets.length, 0)
    const doneEx = exList.filter(ex => ex.sets.some(s => s.done)).length
    return (
      <div className="success-screen">
        <div className="success-icon">🏋️</div>
        <div className="success-title">Session Saved!</div>
        <div className="success-date">{new Date(savedSession.session_date).toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}</div>
        <div className="success-stats">
          <div><div className="success-stat-v">{doneSets}/{totalSets}</div><div className="success-stat-l">Sets done</div></div>
          <div><div className="success-stat-v">{doneEx}/{exList.length}</div><div className="success-stat-l">Exercises</div></div>
        </div>
        <div className="success-exlist">
          {exList.map((ex, i) => {
            const dc = ex.sets.filter(s => s.done).length
            const wt = ex.sets.find(s => s.done && s.wt && s.wt !== 'BW' && s.wt !== 'band' && s.wt !== 'light')
            return (
              <div key={i} className="success-ex-row">
                <span className="success-ex-name">{ex.name}</span>
                <span className="success-ex-stat">{dc}/{ex.sets.length}{wt ? ` @ ${wt.wt} lbs` : ''}</span>
              </div>
            )
          })}
        </div>
        {savedSession.watch_data && (savedSession.watch_data.time || savedSession.watch_data.activeCal) && (
          <div className="success-watch">
            <div className="success-watch-title">⌚ Apple Watch</div>
            <div className="success-watch-grid">
              {savedSession.watch_data.time && <div><span className="sw-v">{savedSession.watch_data.time}</span><span className="sw-l">Time</span></div>}
              {savedSession.watch_data.activeCal && <div><span className="sw-v">{savedSession.watch_data.activeCal}</span><span className="sw-l">Active cal</span></div>}
              {savedSession.watch_data.totalCal && <div><span className="sw-v">{savedSession.watch_data.totalCal}</span><span className="sw-l">Total cal</span></div>}
              {savedSession.watch_data.avgHR && <div><span className="sw-v">{savedSession.watch_data.avgHR}</span><span className="sw-l">Avg BPM</span></div>}
              {savedSession.watch_data.effort && savedSession.watch_data.effort !== 'skipped' && <div><span className="sw-v">{savedSession.watch_data.effort}</span><span className="sw-l">Effort</span></div>}
            </div>
          </div>
        )}
        {savedSession.notes && <div className="success-notes">📝 {savedSession.notes}</div>}
        <button className="success-done-btn" onClick={afterSuccess}>✓ Done</button>
      </div>
    )
  }

  if (view === 'swap' && swapTarget !== null) {
    const curName = draft.exercises[swapTarget.ei].name
    return (
      <div className="swap-view">
        <div className="swap-header">
          <button className="back-btn" onClick={() => { setView('log'); setSwapTarget(null) }}>← Back</button>
          <div className="swap-title">Swap exercise</div>
        </div>
        <div className="swap-current">Currently: <strong>{curName}</strong></div>
        {Object.entries(BANK).map(([group, exArr]) => (
          <div key={group}>
            <div className="swap-group-label">{group}</div>
            {exArr.map(ex => (
              <div key={ex.n} className="swap-opt">
                <div>
                  <div className="swap-opt-name">{ex.n}{ex.n === curName ? ' ✓' : ''}</div>
                  <div className="swap-opt-desc">{ex.d}</div>
                </div>
                {ex.n === curName
                  ? <span className="swap-current-label">Current</span>
                  : <button className="swap-select-btn" onClick={() => doSwap(ex.n)}>Select</button>
                }
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  async function saveWalk() {
    setWalkSaving(true)
    await supabase.from('walk_logs').insert({
      user_id: userId,
      walk_date: new Date().toISOString().split('T')[0],
      walk_index: dayIdx - DAYS.length,
      duration_min: walkLog.duration || null,
      active_cal: walkLog.calories || null,
      avg_hr: walkLog.hr || null,
      avg_pace: walkLog.pace || null,
      distance_mi: walkLog.distance || null,
      elevation_ft: walkLog.elevation || null,
    })
    setWalkSaving(false)
    setWalkSaved(true)
    setTimeout(() => {
      setWalkSaved(false)
      setWalkLog({ duration: '', calories: '', hr: '', pace: '', distance: '', elevation: '' })
    }, 2500)
  }

  if (!draft && dayIdx < DAYS.length) return <div className="loading-msg">Loading...</div>

  const prevDate = lastSession ? new Date(lastSession.session_date).toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'}) : null

  // Session brief — proactive callouts based on last session + time gap
  function getSessionBrief() {
    const notes = []
    if (dayIdx >= DAYS.length) return notes // walks don't need a brief

    const now = new Date()
    const hour = now.getHours()

    // DOMS warning if gap > 5 days
    if (lastSession) {
      const daysSince = Math.floor((Date.now() - new Date(lastSession.session_date).getTime()) / 86400000)
      if (daysSince >= 5) {
        notes.push({ icon: '⚠️', text: `${daysSince} days since your last ${currentTitle} session — expect some DOMS. Go lighter on the first set of each exercise and work up.` })
      } else if (daysSince >= 3) {
        notes.push({ icon: '💡', text: `${daysSince} days since last session — you may feel it tomorrow. That's normal, not a sign to stop.` })
      }
    }

    // Morning mood boost reminder
    if (hour < 12) {
      notes.push({ icon: '🧠', text: 'Morning session — your mood will thank you. IM8 + L-theanine kicking in yet?' })
    }

    // Bicep tendon note if relevant day
    if (dayIdx === 1 || dayIdx === 2) { // upper or whole body
      notes.push({ icon: '👀', text: 'Left bicep tendon — watch the descent on bench and overhead work. Front shoulder ache = reduce range before reducing weight.' })
    }

    return notes
  }

  const sessionBrief = getSessionBrief()

  const SESSION_TITLES = ['Lower Body', 'Upper Body', 'Whole Body', 'Walk', 'Hike']
  const SESSION_ICONS = ['🦵', '💪', '🏋️', '🚶', '⛰️']
  const currentTitle = dayIdx < DAYS.length
    ? SESSION_TITLES[dayIdx]
    : dayIdx - DAYS.length === 1 ? 'Hike' : 'Walk'
  const currentIcon = dayIdx < DAYS.length
    ? SESSION_ICONS[dayIdx]
    : dayIdx - DAYS.length === 1 ? '⛰️' : '🚶'

  return (
    <div className="workout-log">
      <div className="wl-header">
        <div className="wl-session-title">
          <span className="wl-session-icon">{currentIcon}</span>
          <span className="wl-session-name">{currentTitle}</span>
        </div>
        {dayIdx < DAYS.length
          ? <div className="watch-note">⌚ Enable <strong>Functional Strength Training</strong> on Apple Watch before starting.</div>
          : <div className="watch-note">⌚ Open Workout app → <strong>{dayIdx - DAYS.length === 1 ? 'Hiking' : 'Outdoor Walk'}</strong> on your Apple Watch before heading out.</div>
        }
        {sessionBrief.length > 0 && (
          <div className="session-brief">
            {sessionBrief.map((note, i) => (
              <div key={i} className="brief-note">
                <span className="brief-icon">{note.icon}</span>
                <span className="brief-text">{note.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="day-tabs">
          {DAYS.map((d, i) => (
            <button key={i} className={`day-tab ${dayIdx === i ? 'active' : ''}`} onClick={() => setDayIdx(i)}>
              {d.label}<br /><span className="day-tab-sub">{d.title.split(' ')[0]}</span>
            </button>
          ))}
          {WALK_TABS.map((w, i) => (
            <button key={`w${i}`} className={`day-tab walk-tab ${dayIdx === DAYS.length + i ? 'active' : ''}`} onClick={() => setDayIdx(DAYS.length + i)}>
              {w.icon}<br /><span className="day-tab-sub">Walk {i + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {dayIdx >= DAYS.length && (
        <div className="wl-body">
          <div className="sess-title">Walk {dayIdx - DAYS.length + 1}</div>
          <div className="sess-meta">{new Date().toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}</div>
          {walkSaved ? (
            <div className="walk-saved">✓ Walk logged</div>
          ) : (
            <div className="walk-log-form">
              <div className="sec-label" style={{marginTop: 8}}>Log from your watch</div>
              <div className="walk-fields">
                <div className="walk-field">
                  <div className="walk-label">Duration (min)</div>
                  <input className="walk-input" type="number" placeholder="e.g. 25" value={walkLog.duration}
                    onChange={e => setWalkLog(p => ({...p, duration: e.target.value}))} />
                </div>
                <div className="walk-field">
                  <div className="walk-label">Distance (mi)</div>
                  <input className="walk-input" type="number" step="0.01" placeholder="e.g. 1.2" value={walkLog.distance}
                    onChange={e => setWalkLog(p => ({...p, distance: e.target.value}))} />
                </div>
                <div className="walk-field">
                  <div className="walk-label">Active cal</div>
                  <input className="walk-input" type="number" placeholder="e.g. 180" value={walkLog.calories}
                    onChange={e => setWalkLog(p => ({...p, calories: e.target.value}))} />
                </div>
                <div className="walk-field">
                  <div className="walk-label">Avg HR (bpm)</div>
                  <input className="walk-input" type="number" placeholder="e.g. 105" value={walkLog.hr}
                    onChange={e => setWalkLog(p => ({...p, hr: e.target.value}))} />
                </div>
                <div className="walk-field">
                  <div className="walk-label">Avg pace (min/mi)</div>
                  <input className="walk-input" type="text" placeholder="e.g. 18:30" value={walkLog.pace}
                    onChange={e => setWalkLog(p => ({...p, pace: e.target.value}))} />
                </div>
                {dayIdx - DAYS.length === 1 && (
                  <div className="walk-field">
                    <div className="walk-label">Elevation gain (ft)</div>
                    <input className="walk-input" type="number" placeholder="e.g. 320" value={walkLog.elevation}
                      onChange={e => setWalkLog(p => ({...p, elevation: e.target.value}))} />
                  </div>
                )}
              </div>
              <button className="finish-btn" onClick={saveWalk} disabled={walkSaving || !Object.values(walkLog).some(v => v)}>
                {walkSaving ? 'Saving…' : '✓ Log walk'}
              </button>
            </div>
          )}
        </div>
      )}

      {dayIdx < DAYS.length && <div className="wl-body">
        {draftRestored && (
          <div className="draft-restored-banner">↩ Session restored — pick up where you left off</div>
        )}
        <div className="sess-title">{D.title}</div>
        <div className="sess-meta">
          {new Date().toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}
          {prevDate && <span> · Last: {prevDate}</span>}
        </div>
        {D.rehab && <div className="rehab-note">⚠️ {D.rehab}</div>}

        <div className="sec-label">Warm-up</div>
        {D.warmup.map((w, i) => (
          <div key={i} className="wu-card">
            <div className="wu-card-top">
              <div className="wu-name">{w.n}</div>
              {w.tag && <span className={`wu-tag ${w.tag}`}>{w.tag === 'vagus' ? '🧠 Vagus' : '🧘 Mobility'}</span>}
            </div>
            <div className="wu-desc">{w.d}</div>
          </div>
        ))}

        <div className="sec-label">Exercises</div>
        {draft.exercises.map((ex, ei) => {
          const f = FORM[ex.name]
          const prevEx = lastSession && lastSession.exercises && lastSession.exercises[ei] && lastSession.exercises[ei].name === ex.name ? lastSession.exercises[ei] : null
          const prevNote = prevEx && prevEx.sets.length ? `Last: ${prevEx.sets[0].reps} @ ${prevEx.sets[0].wt} lbs` : null
          return (
            <ExerciseCard
              key={ei}
              ex={ex}
              ei={ei}
              form={f}
              prevNote={prevNote}
              onSwap={() => { setSwapTarget({ ei }); setView('swap') }}
              onUpdateSet={updateSet}
              onToggleDone={toggleDone}
              onAddSet={addSet}
              onRemoveSet={removeSet}
            />
          )
        })}

        <div className="sec-label">Joint check-in</div>
        {JOINTS.map(j => (
          <div key={j} className="joint-row">
            <div className="joint-name">{j}</div>
            <div className="joint-btns">
              {['ok','ache','pain'].map(v => (
                <button
                  key={v}
                  className={`jbtn ${draft.joints[j] === v ? v : ''}`}
                  onClick={() => setJoint(j, v)}
                >{v === 'ok' ? 'Good' : v === 'ache' ? 'Ache' : 'Pain'}</button>
              ))}
            </div>
          </div>
        ))}

        <div className="sec-label">⌚ Apple Watch data</div>
        <div className="watch-fields">
          <div className="watch-row">
            <div className="watch-field">
              <label className="watch-label">Workout time</label>
              <input className="watch-input" type="text" placeholder="0:00:00"
                value={draft.watch.time}
                onChange={e => setDraft(prev => ({ ...prev, watch: { ...prev.watch, time: e.target.value } }))} />
            </div>
            <div className="watch-field">
              <label className="watch-label">Active cal</label>
              <input className="watch-input" type="number" placeholder="0"
                value={draft.watch.activeCal}
                onChange={e => setDraft(prev => ({ ...prev, watch: { ...prev.watch, activeCal: e.target.value } }))} />
            </div>
          </div>
          <div className="watch-row">
            <div className="watch-field">
              <label className="watch-label">Total cal</label>
              <input className="watch-input" type="number" placeholder="0"
                value={draft.watch.totalCal}
                onChange={e => setDraft(prev => ({ ...prev, watch: { ...prev.watch, totalCal: e.target.value } }))} />
            </div>
            <div className="watch-field">
              <label className="watch-label">Avg heart rate</label>
              <input className="watch-input" type="number" placeholder="0"
                value={draft.watch.avgHR}
                onChange={e => setDraft(prev => ({ ...prev, watch: { ...prev.watch, avgHR: e.target.value } }))} />
            </div>
          </div>
          <div className="watch-field">
            <label className="watch-label">Effort</label>
            <select className="watch-select"
              value={draft.watch.effort}
              onChange={e => setDraft(prev => ({ ...prev, watch: { ...prev.watch, effort: e.target.value } }))}>
              <option value="">— select —</option>
              <option value="skipped">Skipped</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
              <option value="all out">All Out</option>
            </select>
          </div>
        </div>

        <div className="sec-label">Session notes</div>
        <textarea
          className="notes-input"
          placeholder="How did it feel? Any issues to note..."
          value={draft.notes}
          onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />

        <button className="finish-btn" onClick={finishSession} disabled={saving}>
          {saving ? '⏳ Saving...' : '✓ Finish & Save Session'}
        </button>
      </div>}
    </div>
  )
}

function ExerciseCard({ ex, ei, form, prevNote, onSwap, onUpdateSet, onToggleDone, onAddSet, onRemoveSet }) {
  const [showForm, setShowForm] = useState(false)
  return (
    <div className="ex-card">
      <div className="ex-top">
        <div className="ex-name">{ex.name}</div>
        <button className="ex-swap-btn" onClick={onSwap} title="Swap exercise">⇄</button>
      </div>
      <div className="ex-sub">{ex.sets.length} sets · Rest {ex.rest}</div>
      {prevNote && <div className="ex-prev">↺ {prevNote}</div>}
      {form && (
        <>
          <button className="form-toggle-btn" onClick={() => setShowForm(!showForm)}>
            ℹ Form and cues {showForm ? '▲' : '▼'}
          </button>
          {showForm && (
            <div className="form-panel">
              <div className="form-section">Setup</div>
              {form.setup.map((c, i) => <div key={i} className="form-cue">{c}</div>)}
              <div className="form-section">Movement</div>
              {form.movement.map((c, i) => <div key={i} className="form-cue">{c}</div>)}
              {form.note && <div className="form-note"><strong>Note:</strong> {form.note}</div>}
              {form.rehab && <div className="form-note form-rehab"><strong>Bicep tendon:</strong> {form.rehab}</div>}
            </div>
          )}
        </>
      )}
      <div className="sets-hdr">
        <div className="col-h">Set</div>
        <div className="col-h">Reps</div>
        <div className="col-h">lbs</div>
        <div className="col-h">Done</div>
        <div className="col-h">-</div>
      </div>
      {ex.sets.map((s, si) => (
        <div key={si} className="set-row">
          <div className="set-n">{si + 1}</div>
          <input className="set-inp" type="text" value={s.reps} onChange={e => onUpdateSet(ei, si, 'reps', e.target.value)} />
          <input className="set-inp" type="text" value={s.wt} onChange={e => onUpdateSet(ei, si, 'wt', e.target.value)} />
          <button className={`done-btn ${s.done ? 'on' : ''}`} onClick={() => onToggleDone(ei, si)}>{s.done ? '✓' : '○'}</button>
          <button className="rm-btn" onClick={() => onRemoveSet(ei, si)}>−</button>
        </div>
      ))}
      <button className="add-set-btn" onClick={() => onAddSet(ei)}>+ Add set</button>
      <div className="set-rest">Rest {ex.rest} between sets</div>
    </div>
  )
}
