import React, { useState } from 'react'
import './JamesRecovery.css'

const VAGUS = [
  {
    id: 'humming',
    name: 'Humming Breath',
    category: 'vagus',
    duration: '2 min',
    icon: '🎵',
    cue: 'Inhale through the nose 4 counts. Exhale with a steady hum — feel the vibration in your chest and throat. The longer the hum, the stronger the signal to your nervous system.',
    benefit: 'Activates the vagus nerve via the larynx. Lowers heart rate, shifts out of fight-or-flight in under 2 minutes.',
    sets: '3 × 5 breaths'
  },
  {
    id: 'cold-splash',
    name: 'Cold Water Face Splash',
    category: 'vagus',
    duration: '30 sec',
    icon: '💧',
    cue: 'Splash cold water on your face — forehead, cheeks, around the eyes. Or hold a cold wet towel to your face for 30 seconds while holding your breath slightly.',
    benefit: 'Triggers the dive reflex via the trigeminal nerve — immediate parasympathetic activation. Fast reset between stressful moments.',
    sets: '1 × 30 sec'
  },
  {
    id: '90-90-breathing',
    name: '90:90 Diaphragmatic Breathing',
    category: 'vagus',
    duration: '3 min',
    icon: '🫁',
    cue: 'Lie on your back, hips and knees at 90 degrees on a chair or wall. One hand on chest, one on belly. Breathe into your belly — only the lower hand should rise. Exhale slowly, belly falls.',
    benefit: 'Turns off thoracic (stress) breathing pattern. Directly activates the vagus nerve through diaphragm movement. Foundation of your program warm-up.',
    sets: '1 set × 2 min'
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    category: 'vagus',
    duration: '4 min',
    icon: '⬜',
    cue: 'Inhale 4 counts → Hold 4 → Exhale 4 → Hold 4. Repeat. Keep your shoulders relaxed throughout — do not let them rise on the inhale.',
    benefit: 'Balances the autonomic nervous system. Excellent between strength sets or when pain levels feel elevated.',
    sets: '5–8 rounds'
  },
  {
    id: 'gargling',
    name: 'Gargling',
    category: 'vagus',
    duration: '1 min',
    icon: '🤐',
    cue: 'Gargle with water vigorously for 30–60 seconds. Really engage the back of the throat. Can do this morning or post-workout.',
    benefit: 'Activates the gag reflex pathway of the vagus nerve. Simple daily habit with measurable HRV effects over time.',
    sets: '2 × 30 sec'
  },
  {
    id: 'singing',
    name: 'Singing / Loud Humming',
    category: 'vagus',
    duration: '3 min',
    icon: '🎤',
    cue: 'Sing or hum loudly in the car, shower, or gym. Sustained exhales on a tone — the louder and longer the better. "Om" chanting works the same way.',
    benefit: 'Engages the laryngeal muscles innervated by the vagus nerve. The sustained exhale lengthens the parasympathetic phase.',
    sets: 'Anytime, 3+ min'
  }
]

const MOBILITY = [
  {
    id: 'suspension-neck',
    name: 'Suspension Neck Stretch',
    category: 'mobility',
    duration: '2 min',
    icon: '🔗',
    cue: 'Hold TRX handles for gentle traction. Let your head fall slightly forward and to each side. Hold each position 30–60 seconds. Never pull — let gravity do the work.',
    benefit: 'Decompresses cervical spine. Reduces upper trap tension. Directly precedes the nervous system settling that makes lifting safer.',
    sets: '1 min each side'
  },
  {
    id: 'hip-flexor-kneeling',
    name: 'Kneeling Hip Flexor Stretch',
    category: 'mobility',
    duration: '2 min',
    icon: '🧎',
    cue: 'Half-kneeling — back knee down, front foot forward. Drive hips forward gently until you feel a pull in the front of the back hip/thigh. Tuck pelvis slightly (posterior tilt). Hold, breathe.',
    benefit: 'Unlocks hip extension — the bottleneck for squat depth and glute activation in deadlifts. Tight hip flexors also pull on the lumbar spine.',
    sets: '60 sec each side'
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic Spine Rotation',
    category: 'mobility',
    duration: '2 min',
    icon: '🌀',
    cue: 'Sit on the floor, knees bent, hands behind head. Rotate your upper back left and right — not your hips. Lead with the elbow. Go slow, breathe into each rotation.',
    benefit: 'Counteracts sitting. Improves bench press mechanics and shoulder health. Reduces rib cage compression that limits breathing depth.',
    sets: '10 rotations each side'
  },
  {
    id: 'cat-cow',
    name: 'Cat-Cow Flow',
    category: 'mobility',
    duration: '2 min',
    icon: '🐱',
    cue: 'On hands and knees. Inhale — drop belly, lift head and tailbone (cow). Exhale — round spine toward ceiling, tuck chin and tailbone (cat). Move slowly. Let the breath drive the movement.',
    benefit: 'Mobilizes the entire spine. Warms up the posterior chain. Pairs beautifully with 90:90 breathing as a pre-workout sequence.',
    sets: '10 slow rounds'
  },
  {
    id: 'ankle-circles',
    name: 'Ankle Circles + Dorsiflexion',
    category: 'mobility',
    duration: '2 min',
    icon: '⭕',
    cue: 'Seated or standing. Circle each ankle 10 times each direction. Then: lean against a wall, front foot forward, knee drives forward over toes without heel lifting. Hold 3 sec, repeat.',
    benefit: 'Ankle dorsiflexion directly controls squat depth and knee tracking. Critical for OA knee — restricted ankles force compensation up the chain.',
    sets: '10 circles + 10 dorsiflexion reps each side'
  },
  {
    id: 'pigeon-glute',
    name: 'Figure-4 Glute Stretch',
    category: 'mobility',
    duration: '2 min',
    icon: '🦢',
    cue: 'Lie on your back. Cross one ankle over the opposite knee. Flex the top foot. Pull both legs toward your chest — or press the top knee away gently. Hold and breathe slowly.',
    benefit: 'Releases piriformis and external hip rotators. Reduces sciatic tension and IT band tightness. High-priority for Right knee (IT band) health.',
    sets: '60 sec each side'
  },
  {
    id: 'world-greatest',
    name: 'World\'s Greatest Stretch',
    category: 'mobility',
    duration: '3 min',
    icon: '🌍',
    cue: 'From a lunge: front foot forward, back knee down. Place same-side hand inside front foot. Rotate top arm toward ceiling, eyes follow. Return. Then push hips back over back heel. 5 reps per side.',
    benefit: 'Hits hip flexors, thoracic spine, groin, and hamstrings in one flow. Best single-movement warm-up for total-body workout days.',
    sets: '5 reps each side'
  },
  {
    id: 'glute-bridge-warmup',
    name: 'Glute Bridge Activation',
    category: 'mobility',
    duration: '2 min',
    icon: '🌉',
    cue: 'Lie on back, feet flat, hip-width. Drive through heels to lift hips. Squeeze glutes hard at top — hold 2 seconds. Lower with control. Focus on feeling the glutes work, not the hamstrings.',
    benefit: 'Fires the glutes before heavy leg work. Reduces compensation where the lower back takes over. Essential warm-up before squats and deadlifts.',
    sets: '2 × 12 reps'
  }
]

const ROUTINES = [
  {
    id: 'pre-workout',
    name: 'Pre-Workout Reset',
    duration: '8 min',
    icon: '⚡',
    description: 'Calm your nervous system before lifting. Better nervous system tone = better strength output.',
    exercises: ['90-90-breathing', 'suspension-neck', 'glute-bridge-warmup', 'ankle-circles']
  },
  {
    id: 'post-workout',
    name: 'Post-Workout Recovery',
    duration: '10 min',
    icon: '🌿',
    description: 'Shift into parasympathetic mode after training. Accelerates muscle recovery and reduces soreness.',
    exercises: ['humming', 'pigeon-glute', 'hip-flexor-kneeling', 'cat-cow']
  },
  {
    id: 'stress-reset',
    name: 'Stress Reset',
    duration: '5 min',
    icon: '🧠',
    description: 'Anytime your nervous system feels fried. Fast vagal tone reset.',
    exercises: ['cold-splash', 'box-breathing', 'humming']
  },
  {
    id: 'morning',
    name: 'Morning Mobility',
    duration: '12 min',
    icon: '🌅',
    description: 'Full-body mobility flow to start the day. Sets up posture and reduces stiffness.',
    exercises: ['cat-cow', 'thoracic-rotation', 'hip-flexor-kneeling', 'ankle-circles', 'pigeon-glute', 'world-greatest']
  }
]

const ALL = [...VAGUS, ...MOBILITY]

export default function Recovery() {
  const [view, setView] = useState('home') // home | routine | exercise | browse
  const [activeRoutine, setActiveRoutine] = useState(null)
  const [routineStep, setRoutineStep] = useState(0)
  const [activeExercise, setActiveExercise] = useState(null)
  const [filter, setFilter] = useState('all') // all | vagus | mobility

  function openRoutine(r) {
    setActiveRoutine(r)
    setRoutineStep(0)
    setView('routine')
  }

  function openExercise(ex) {
    setActiveExercise(ex)
    setView('exercise')
  }

  const routineExs = activeRoutine
    ? activeRoutine.exercises.map(id => ALL.find(e => e.id === id)).filter(Boolean)
    : []

  const currentEx = routineExs[routineStep]
  const isLastStep = routineStep === routineExs.length - 1

  const browseList = ALL.filter(e => filter === 'all' || e.category === filter)

  // Exercise detail view (from browse or routine)
  if (view === 'exercise' && activeExercise) {
    return (
      <div className="rec-page">
        <div className="rec-hdr">
          <button className="rec-back" onClick={() => setView('browse')}>← Back</button>
          <div className="rec-hdr-title">Exercise</div>
        </div>
        <div className="rec-ex-card solo">
          <div className="rec-ex-icon">{activeExercise.icon}</div>
          <div className="rec-ex-name">{activeExercise.name}</div>
          <div className={`rec-ex-tag ${activeExercise.category}`}>
            {activeExercise.category === 'vagus' ? 'Vagus Nerve' : 'Mobility'}
          </div>
          <div className="rec-ex-meta-row">
            <span className="rec-ex-meta">⏱ {activeExercise.duration}</span>
            <span className="rec-ex-meta">🔁 {activeExercise.sets}</span>
          </div>
          <div className="rec-section-label">How to do it</div>
          <div className="rec-ex-cue">{activeExercise.cue}</div>
          <div className="rec-section-label">Why it works</div>
          <div className="rec-ex-benefit">{activeExercise.benefit}</div>
        </div>
      </div>
    )
  }

  // Routine player view
  if (view === 'routine' && activeRoutine) {
    return (
      <div className="rec-page">
        <div className="rec-hdr">
          <button className="rec-back" onClick={() => setView('home')}>✕ End</button>
          <div className="rec-hdr-title">{activeRoutine.name}</div>
          <div className="rec-step-count">{routineStep + 1}/{routineExs.length}</div>
        </div>

        <div className="rec-progress-bar">
          <div className="rec-progress-fill" style={{ width: `${((routineStep + 1) / routineExs.length) * 100}%` }} />
        </div>

        {currentEx && (
          <div className="rec-ex-card active">
            <div className="rec-ex-icon large">{currentEx.icon}</div>
            <div className="rec-ex-name large">{currentEx.name}</div>
            <div className={`rec-ex-tag ${currentEx.category}`}>
              {currentEx.category === 'vagus' ? 'Vagus Nerve' : 'Mobility'}
            </div>
            <div className="rec-ex-meta-row">
              <span className="rec-ex-meta">⏱ {currentEx.duration}</span>
              <span className="rec-ex-meta">🔁 {currentEx.sets}</span>
            </div>
            <div className="rec-section-label">How to do it</div>
            <div className="rec-ex-cue">{currentEx.cue}</div>
            <div className="rec-section-label">Why it works</div>
            <div className="rec-ex-benefit">{currentEx.benefit}</div>
          </div>
        )}

        <div className="rec-routine-nav">
          {routineStep > 0 && (
            <button className="rec-nav-btn prev" onClick={() => setRoutineStep(s => s - 1)}>← Prev</button>
          )}
          {isLastStep ? (
            <button className="rec-nav-btn done" onClick={() => setView('home')}>✓ Done</button>
          ) : (
            <button className="rec-nav-btn next" onClick={() => setRoutineStep(s => s + 1)}>Next →</button>
          )}
        </div>

        <div className="rec-upcoming">
          <div className="rec-upcoming-label">Up next</div>
          <div className="rec-upcoming-list">
            {routineExs.map((ex, i) => (
              <div
                key={ex.id}
                className={`rec-upcoming-item ${i === routineStep ? 'current' : i < routineStep ? 'done' : ''}`}
                onClick={() => setRoutineStep(i)}
              >
                <span className="rui-icon">{ex.icon}</span>
                <span className="rui-name">{ex.name}</span>
                {i < routineStep && <span className="rui-check">✓</span>}
                {i === routineStep && <span className="rui-dot" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Browse view
  if (view === 'browse') {
    return (
      <div className="rec-page">
        <div className="rec-hdr">
          <button className="rec-back" onClick={() => setView('home')}>← Back</button>
          <div className="rec-hdr-title">All Exercises</div>
        </div>
        <div className="rec-filter-row">
          {['all', 'vagus', 'mobility'].map(f => (
            <button
              key={f}
              className={`rec-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'vagus' ? '🧠 Vagus Nerve' : '🧘 Mobility'}
            </button>
          ))}
        </div>
        <div className="rec-browse-list">
          {browseList.map(ex => (
            <div key={ex.id} className="rec-browse-item" onClick={() => openExercise(ex)}>
              <div className="rbi-left">
                <span className="rbi-icon">{ex.icon}</span>
                <div>
                  <div className="rbi-name">{ex.name}</div>
                  <div className="rbi-meta">{ex.duration} · {ex.sets}</div>
                </div>
              </div>
              <div className={`rec-ex-tag sm ${ex.category}`}>
                {ex.category === 'vagus' ? 'Vagus' : 'Mobility'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Home view
  return (
    <div className="rec-page">
      <div className="rec-home-hdr">
        <div className="rec-home-title">Recovery</div>
        <div className="rec-home-sub">Vagus nerve + mobility</div>
      </div>

      <div className="rec-section-label" style={{ marginTop: 0 }}>Guided Routines</div>
      {ROUTINES.map(r => (
        <div key={r.id} className="rec-routine-card" onClick={() => openRoutine(r)}>
          <div className="rrc-top">
            <span className="rrc-icon">{r.icon}</span>
            <div className="rrc-info">
              <div className="rrc-name">{r.name}</div>
              <div className="rrc-desc">{r.description}</div>
            </div>
          </div>
          <div className="rrc-footer">
            <span className="rrc-dur">⏱ {r.duration}</span>
            <span className="rrc-count">{r.exercises.length} exercises</span>
            <span className="rrc-arrow">→</span>
          </div>
        </div>
      ))}

      <div className="rec-section-label">Vagus Nerve Exercises</div>
      <div className="rec-mini-grid">
        {VAGUS.map(ex => (
          <div key={ex.id} className="rec-mini-card" onClick={() => openExercise(ex)}>
            <div className="rmc-icon">{ex.icon}</div>
            <div className="rmc-name">{ex.name}</div>
            <div className="rmc-dur">{ex.duration}</div>
          </div>
        ))}
      </div>

      <div className="rec-section-label">Mobility Exercises</div>
      <div className="rec-mini-grid">
        {MOBILITY.map(ex => (
          <div key={ex.id} className="rec-mini-card" onClick={() => openExercise(ex)}>
            <div className="rmc-icon">{ex.icon}</div>
            <div className="rmc-name">{ex.name}</div>
            <div className="rmc-dur">{ex.duration}</div>
          </div>
        ))}
      </div>

      <button className="rec-browse-btn" onClick={() => setView('browse')}>Browse all exercises →</button>
    </div>
  )
}
