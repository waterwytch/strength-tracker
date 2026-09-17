import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { JOINTS } from '../lib/data'
import './History.css'

export default function History({ userId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <div className="hist-loading">Loading history...</div>

  if (selected) {
    const s = selected
    const exList = s.exercises || []
    const doneSets = exList.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0)
    const totalSets = exList.reduce((a, ex) => a + ex.sets.length, 0)
    const doneEx = exList.filter(ex => ex.sets.some(s => s.done)).length
    const jEntries = JOINTS.map(j => ({ j, v: s.joints && s.joints[j] })).filter(x => x.v)
    return (
      <div className="hist-detail">
        <div className="hist-detail-hdr">
          <button className="back-btn" onClick={() => setSelected(null)}>← Back</button>
          <div>
            <div className="detail-title">Day {s.day_index + 1} — {s.day_title}</div>
            <div className="detail-sub">{new Date(s.session_date).toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}</div>
          </div>
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
        {s.notes && <div className="detail-notes">📝 {s.notes}</div>}
        <div className="sec-label">Exercises</div>
        {exList.map((ex, ei) => {
          const dc = ex.sets.filter(s => s.done).length
          return (
            <div key={ei} className="detail-ex">
              <div className="detail-ex-hdr">
                <div className="detail-ex-name">{ex.name}</div>
                <div className="detail-ex-ct">{dc}/{ex.sets.length} sets</div>
              </div>
              <table className="detail-table">
                <thead><tr><th>Set</th><th>Reps</th><th>lbs</th><th>Status</th></tr></thead>
                <tbody>
                  {ex.sets.map((s, si) => (
                    <tr key={si}>
                      <td>{si + 1}</td>
                      <td>{s.reps || '—'}</td>
                      <td>{s.wt || '—'}</td>
                      <td className={s.done ? 'td-done' : 'td-skip'}>{s.done ? '✓ Done' : '— Skip'}</td>
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
