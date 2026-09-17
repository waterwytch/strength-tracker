import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './Progress.css'

export default function Progress({ userId }) {
  const [sessions, setSessions] = useState([])
  const [weighIns, setWeighIns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [exerciseNames, setExerciseNames] = useState([])
  const [newWeight, setNewWeight] = useState('')
  const [newWeighDate, setNewWeighDate] = useState(new Date().toISOString().split('T')[0])
  const [savingWeigh, setSavingWeigh] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: sess }, { data: weigh }] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', userId).order('session_date', { ascending: true }),
        supabase.from('weigh_ins').select('*').eq('user_id', userId).order('weigh_date', { ascending: true })
      ])
      setSessions(sess || [])
      setWeighIns(weigh || [])
      const names = new Set()
      ;(sess || []).forEach(s => (s.exercises || []).forEach(ex => names.add(ex.name)))
      const nameList = Array.from(names).sort()
      setExerciseNames(nameList)
      if (nameList.length) setSelectedExercise(nameList[0])
      setLoading(false)
    }
    load()
  }, [userId])

  async function addWeighIn() {
    if (!newWeight || isNaN(parseFloat(newWeight))) return
    setSavingWeigh(true)
    const { data } = await supabase.from('weigh_ins').insert({
      user_id: userId,
      weigh_date: newWeighDate,
      weight_lbs: parseFloat(newWeight)
    }).select().single()
    if (data) setWeighIns(prev => [...prev, data].sort((a, b) => a.weigh_date.localeCompare(b.weigh_date)))
    setNewWeight('')
    setSavingWeigh(false)
  }

  async function deleteWeighIn(id) {
    await supabase.from('weigh_ins').delete().eq('id', id)
    setWeighIns(prev => prev.filter(w => w.id !== id))
  }

  function getExerciseData() {
    if (!selectedExercise) return []
    const points = []
    sessions.forEach(s => {
      const ex = (s.exercises || []).find(e => e.name === selectedExercise)
      if (!ex) return
      const doneSets = ex.sets.filter(st => st.done && st.wt && !isNaN(parseFloat(st.wt)))
      if (!doneSets.length) return
      const maxWt = Math.max(...doneSets.map(st => parseFloat(st.wt)))
      points.push({
        date: new Date(s.session_date).toLocaleDateString('en-US', {month:'short',day:'numeric'}),
        weight: maxWt
      })
    })
    return points
  }

  const weighData = weighIns.map(w => ({
    date: new Date(w.weigh_date).toLocaleDateString('en-US', {month:'short',day:'numeric'}),
    weight: w.weight_lbs,
    id: w.id
  }))

  const exerciseData = getExerciseData()

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-date">{label}</div>
          <div className="tooltip-val">{payload[0].value} lbs</div>
        </div>
      )
    }
    return null
  }

  if (loading) return <div className="progress-loading">Loading progress...</div>

  return (
    <div className="progress-page">
      <div className="progress-title">Progress</div>

      {/* Exercise progress */}
      <div className="progress-section">
        <div className="progress-section-title">Lift progression</div>
        {exerciseNames.length === 0 ? (
          <div className="progress-empty">No workout data yet.</div>
        ) : (
          <>
            <select className="exercise-select" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
              {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {exerciseData.length < 2 ? (
              <div className="progress-empty">Need at least 2 sessions with this exercise to show a trend.</div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={exerciseData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#555', fontSize: 11 }} />
                    <Tooltip content={customTooltip} />
                    <Line type="monotone" dataKey="weight" stroke="#5b9cf6" strokeWidth={2} dot={{ fill: '#5b9cf6', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Weigh-in */}
      <div className="progress-section">
        <div className="progress-section-title">Body weight trend</div>
        <div className="weigh-add-row">
          <input
            className="weigh-date-inp"
            type="date"
            value={newWeighDate}
            onChange={e => setNewWeighDate(e.target.value)}
          />
          <input
            className="weigh-wt-inp"
            type="number"
            placeholder="lbs"
            step="0.1"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
          />
          <button className="weigh-add-btn" onClick={addWeighIn} disabled={savingWeigh}>
            {savingWeigh ? '...' : '+ Add'}
          </button>
        </div>
        {weighData.length < 2 ? (
          <div className="progress-empty">Add at least 2 weigh-ins to see your trend.</div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weighData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip content={customTooltip} />
                <Line type="monotone" dataKey="weight" stroke="#30c060" strokeWidth={2} dot={{ fill: '#30c060', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {weighIns.length > 0 && (
          <div className="weigh-list">
            {[...weighIns].reverse().map(w => (
              <div key={w.id} className="weigh-row">
                <span className="weigh-date">{new Date(w.weigh_date).toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'})}</span>
                <span className="weigh-wt">{w.weight_lbs} lbs</span>
                <button className="weigh-del" onClick={() => deleteWeighIn(w.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
