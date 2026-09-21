import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { JOINTS } from '../lib/data'
import './JamesHistory.css'

export default function History({ userId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  function startEdit(s) {
    setEditDraft({
      exercises: s.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(st => ({ ...st }))
      })),
      joints: { ...(s.joints || {}) },
      notes: s.notes || '',
      watch: s.watch_data || { time: '', activeCal: '', totalCal: '', avgHR: '', effort: '' }
    })
    setEditing(true)
  }

  function updateEditSet(ei, si, field, value) {
    setEditDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== ei ? ex : {
        ...ex,
        sets: ex.sets.map((st, j) => j !== si ? st : { ...st, [field]: value })
      })
    }))
  }

  function toggleEditDone(ei, si) {
    setEditDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i !== ei ? ex : {
        ...ex,
        sets: ex.sets.map((st, j) => j !== si ? st : { ...st, done: !st.done })
      })
    }))
  }

  function setEditJoint(joint, val) {
    setEditDraft(prev => ({
      ...prev,
      joints: { ...prev.joints, [joint]: prev.joints[joint] === val ? null : val }
    }))
  }

  async function deleteSession() {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    const { error } = await supabase.from('sessions').delete().eq('id', selected.id)
    if (error) { alert('Delete failed: ' + error.message); return; }
    setSessions(prev => prev.filter(s => s.id !== selected.id))
    setSelected(null)
  }

  async function saveEdit() {
    setSaving(true)
    const { data, error } = await supabase.from('sessions').update({
      exercises: editDraft.exercises,
      joints: editDraft.joints,
      notes: editDraft.notes,
      watch_data: editDraft.watch
    }).eq('id', selected.id).select().single()
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return; }
    setSelected(data)
    setSessions(prev => prev.map(s => s.id === data.id ? data : s))
    setEditing(false)
    setEditDraft(null)
  }

  if (loading) return <div className="hist-loading">Loading history...</div>

  if (selected) {
    const s = selected
    const exList = s.exercises || []
    const doneSets = exList.reduce((a, ex) => a + ex.sets.filter(st => st.done).length, 0)
    const totalSets = exList.reduce((a, ex) => a + ex.sets.length, 0)
    const doneEx = exList.filter(ex => ex.sets.some(st => st.done)).length
    const jEntries = JOINTS.map(j => ({ j, v: s.joints && s.joints[j] })).filter(x => x.v)

    if (editing && editDraft) {
      return (
        <div className="hist-detail">
          <div className="hist-detail-hdr">
            <button className="back-btn" onClick={() => { setEditing(false); setEditDraft(null) }}>✕ Cancel</button>
            <div>
              <div className="detail-title">Editing session</div>
              <div className="detail-sub">{new Date(s.session_date).toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}</div>
            </div>
            <button className="save-edit-btn" onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Save'}</button>
          </div>

          <div className="sec-label">Exercises</div>
          {editDraft.exercises.map((ex, ei) => (
            <div key={ei} className="detail-ex">
              <div className="detail-ex-hdr">
                <div className="detail-ex-name">{ex.name}</div>
              </div>
              <table className="detail-table">
                <thead><tr><th>Set</th><th>Reps</th><th>lbs</th><th>Done</th></tr></thead>
                <tbody>
                  {ex.sets.map((st, si) => (
                    <tr key={si}>
                      <td>{si + 1}</td>
                      <td><input className="edit-cell-input" type="text" value={st.reps} onChange={e => updateEditSet(ei, si, 'reps', e.target.value)} /></td>
                      <td><input className="edit-cell-input" type="text" value={st.wt} onChange={e => updateEditSet(ei, si, 'wt', e.target.value)} /></td>
                      <td><button className={`edit-done-btn ${st.done ? 'done' : 'skip'}`} onClick={() => toggleEditDone(ei, si)}>{st.done ? '✓' : '—'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="sec-label">Joint check-in</div>
          {JOINTS.map(j => (
            <div key={j} className="joint-row">
              <div className="joint-name">{j}</div>
              <div className="joint-btns">
                {['ok','ache','pain'].map(v => (
                  <button key={v} className={`jbtn ${editDraft.joints[j] === v ? v : ''}`} onClick={() => setEditJoint(j, v)}>
                    {v === 'ok' ? 'Good' : v === 'ache' ? 'Ache' : 'Pain'}
                  </button>
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
                  value={editDraft.watch.time}
                  onChange={e => setEditDraft(prev => ({ ...prev, watch: { ...prev.watch, time: e.target.value } }))} />
              </div>
              <div className="watch-field">
                <label className="watch-label">Active cal</label>
                <input className="watch-input" type="number" placeholder="0"
                  value={editDraft.watch.activeCal}
                  onChange={e => setEditDraft(prev => ({ ...prev, watch: { ...prev.watch, activeCal: e.target.value } }))} />
              </div>
            </div>
            <div className="watch-row">
              <div className="watch-field">
                <label className="watch-label">Total cal</label>
                <input className="watch-input" type="number" placeholder="0"
                  value={editDraft.watch.totalCal}
                  onChange={e => setEditDraft(prev => ({ ...prev, watch: { ...prev.watch, totalCal: e.target.value } }))} />
              </div>
              <div className="watch-field">
                <label className="watch-label">Avg heart rate</label>
                <input className="watch-input" type="number" placeholder="0"
                  value={editDraft.watch.avgHR}
                  onChange={e => setEditDraft(prev => ({ ...prev, watch: { ...prev.watch, avgHR: e.target.value } }))} />
              </div>
            </div>
            <div className="watch-field">
              <label className="watch-label">Effort</label>
              <select className="watch-select"
                value={editDraft.watch.effort}
                onChange={e => setEditDraft(prev => ({ ...prev, watch: { ...prev.watch, effort: e.target.value } }))}>
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
          <textarea className="notes-input" rows={3} value={editDraft.notes}
            onChange={e => setEditDraft(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="How did it feel?" />

          <button className="finish-btn" onClick={saveEdit} disabled={saving}>
            {saving ? '⏳ Saving...' : '✓ Save Changes'}
          </button>
        </div>
      )
    }

    return (
      <div className="hist-detail">
        <div className="hist-detail-hdr">
          <button className="back-btn" onClick={() => setSelected(null)}>← Back</button>
          <div>
            <div className="detail-title">Day {s.day_index + 1} — {s.day_title}</div>
            <div className="detail-sub">{new Date(s.session_date).toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}</div>
          </div>
          <button className="edit-session-btn" onClick={() => startEdit(s)}>✏️ Edit</button>
          <button className="delete-session-btn" onClick={deleteSession}>🗑️</button>
        </div>
        <div className="detail-summ">
          <div><div className="detail-sv">{doneSets}/{totalSets}</div><div className="detail-sl">Sets done</div></div>
          <div><div className="detail-sv">{doneEx}/{exList.length}</div><div className="detail-sl">Exercises</div></div>
        </div>
        {jEntries.length > 0 && (
          <div className="detail-joints-wrap">
            <div className="sec-label">Joint check-in</div>
            <div className="detail-joints">{jEntries.map(x => <span key={x.j} className={`h-joint ${x.v}`}>{x.j}: {x.v}</span>)}</div>
          </div>
        )}
        {s.watch_data && (s.watch_data.time || s.watch_data.activeCal) && (
          <div className="detail-watch">
            <div className="sec-label">⌚ Apple Watch</div>
            <div className="detail-watch-grid">
              {s.watch_data.time && <div><div className="dw-v">{s.watch_data.time}</div><div className="dw-l">Time</div></div>}
              {s.watch_data.activeCal && <div><div className="dw-v">{s.watch_data.activeCal}</div><div className="dw-l">Active cal</div></div>}
              {s.watch_data.totalCal && <div><div className="dw-v">{s.watch_data.totalCal}</div><div className="dw-l">Total cal</div></div>}
              {s.watch_data.avgHR && <div><div className="dw-v">{s.watch_data.avgHR}</div><div className="dw-l">Avg BPM</div></div>}
              {s.watch_data.effort && s.watch_data.effort !== 'skipped' && <div><div className="dw-v">{s.watch_data.effort}</div><div className="dw-l">Effort</div></div>}
            </div>
          </div>
        )}
        {s.notes && <div className="detail-notes">📝 {s.notes}</div>}
        <div className="sec-label">Exercises</div>
        {exList.map((ex, ei) => {
          const dc = ex.sets.filter(st => st.done).length
          return (
            <div key={ei} className="detail-ex">
              <div className="detail-ex-hdr">
                <div className="detail-ex-name">{ex.name}</div>
                <div className="detail-ex-ct">{dc}/{ex.sets.length} sets</div>
              </div>
              <table className="detail-table">
                <thead><tr><th>Set</th><th>Reps</th><th>lbs</th><th>Status</th></tr></thead>
                <tbody>
                  {ex.sets.map((st, si) => (
                    <tr key={si}>
                      <td>{si + 1}</td>
                      <td>{st.reps || '—'}</td>
                      <td>{st.wt || '—'}</td>
                      <td className={st.done ? 'td-done' : 'td-skip'}>{st.done ? '✓ Done' : '— Skip'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  if (!sessions.length) return <div className="hist-empty">No sessions yet. Finish a workout to see it here.</div>

  return (
    <div className="history-page">
      <div className="history-title">Session History</div>
      {sessions.map(s => {
        const exList = s.exercises || []
        const doneSets = exList.reduce((a, ex) => a + ex.sets.filter(st => st.done).length, 0)
        const totalSets = exList.reduce((a, ex) => a + ex.sets.length, 0)
        const doneEx = exList.filter(ex => ex.sets.some(st => st.done)).length
        const jEntries = JOINTS.map(j => ({ j, v: s.joints && s.joints[j] })).filter(x => x.v)
        return (
          <div key={s.id} className="h-card">
            <div className="h-top">
              <div className="h-title">Day {s.day_index + 1} — {s.day_title}</div>
              <div className="h-dt">{new Date(s.session_date).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</div>
            </div>
            <div className="h-divider" />
            <div className="h-stats">
              <div><div className="h-sv">{doneSets}/{totalSets}</div><div className="h-sl">Sets</div></div>
              <div><div className="h-sv">{doneEx}/{exList.length}</div><div className="h-sl">Exercises</div></div>
            </div>
            {jEntries.length > 0 && (
              <div className="h-joints">{jEntries.map(x => <span key={x.j} className={`h-joint ${x.v}`}>{x.j}: {x.v}</span>)}</div>
            )}
            {s.notes && <div className="h-notes">📝 {s.notes}</div>}
            <button className="view-detail-btn" onClick={() => setSelected(s)}>View session detail</button>
          </div>
        )
      })}
    </div>
  )
}
