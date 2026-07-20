import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BookOpen, Brain, Check, ChevronDown, Clock3, Flame, GraduationCap, HelpCircle, Lightbulb, Lock, Menu, MoreHorizontal, PenLine, Play, Plus, Send, Sparkles, Timer, X } from 'lucide-react';
import './styles.css';

const modes = [
  { id: 'socratic', icon: HelpCircle, color: 'violet', title: 'Socratic pathway', desc: 'Find the answer through layered questions', time: '8–12 min', tag: 'Most popular' },
  { id: 'feynman', icon: Lightbulb, color: 'orange', title: 'Feynman explain-back', desc: 'Teach it simply to prove you know it', time: '10–15 min', tag: 'Deep understanding' },
  { id: 'freeze', icon: Timer, color: 'blue', title: 'Focus freeze', desc: 'A quiet window to think before AI joins', time: '5 min', tag: 'Build confidence' },
  { id: 'draft', icon: PenLine, color: 'pink', title: 'Long draft', desc: 'Write your raw thinking before feedback', time: '12–20 min', tag: 'For essays & proofs' }
];

function App() {
  const [selected, setSelected] = useState('socratic');
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const active = modes.find(m => m.id === selected);
  const progress = useMemo(() => Math.min(100, (step / 3) * 100), [step]);
  const prompts = [
    'What do you already notice about the relationship between velocity and time?',
    'If the acceleration stays constant, what shape would the velocity-time graph take?',
    'Now use that shape to explain how you could find the displacement.'
  ];
  const advance = () => { if (answer.trim()) { setAnswer(''); setStep(s => Math.min(3, s + 1)); } };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Sparkles size={18}/></span><span>outside<span className="brand-dot">.</span>bots</span></div>
      <button className="new-task"><Plus size={17}/> New learning task</button>
      <nav>
        <p className="nav-label">YOUR SPACE</p>
        <a className="nav-item active"><BookOpen size={18}/> My desk</a>
        <a className="nav-item"><Clock3 size={18}/> Recent sessions</a>
        <a className="nav-item"><Flame size={18}/> Learning streak <span className="tiny-streak">6</span></a>
        <p className="nav-label second">WORKFLOWS</p>
        <a className="nav-item"><Brain size={18}/> Explore modes <span className="new-badge">NEW</span></a>
        <a className="nav-item"><Plus size={18}/> Create a mode</a>
      </nav>
      <div className="profile"><div className="avatar">AM</div><div><strong>Amelia Morgan</strong><span>Year 11 · Maths</span></div><MoreHorizontal size={18}/></div>
    </aside>

    <main>
      <header><div className="crumb"><span>My desk</span><ChevronDown size={15}/><b>Tuesday, 24 September</b></div><div className="header-actions"><button className="ghost"><HelpCircle size={18}/> How it works</button><button className="mobile-menu"><Menu size={19}/></button></div></header>
      {!started ? <section className="intro-view">
        <div className="welcome"><span className="eyebrow">LEARN BEFORE YOU ASK</span><h1>Hey Amelia, what will you<br/><em>work through</em> today?</h1><p>Choose a thinking mode first. We’ll keep the answer out of reach until you’ve had a proper go.</p></div>
        <div className="task-card">
          <div className="task-top"><div className="subject-icon"><GraduationCap size={21}/></div><div><span className="label">YOUR QUESTION</span><h2>How do I calculate displacement from a velocity-time graph?</h2></div><button className="more"><MoreHorizontal size={20}/></button></div>
          <div className="divider"/>
          <div className="choose-row"><div><span className="label">PICK YOUR PATH</span><h3>How do you want to think?</h3></div><span className="nudger"><Lock size={14}/> Answers unlock after the work</span></div>
          <div className="mode-grid">{modes.map(mode => { const Icon = mode.icon; return <button key={mode.id} onClick={() => setSelected(mode.id)} className={'mode-card ' + (selected === mode.id ? 'selected ' : '') + mode.color}>
            {selected === mode.id && <span className="selected-tick"><Check size={13}/></span>}<span className="mode-icon"><Icon size={19}/></span><div><strong>{mode.title}</strong><p>{mode.desc}</p><span className="mode-meta"><Clock3 size={13}/>{mode.time} <i>·</i> {mode.tag}</span></div>
          </button>})}</div>
          <div className="start-row"><span>Good choice. There’s no rush — just honest thinking.</span><button className="start" onClick={() => setStarted(true)}>Start {active.title}<ArrowRight size={17}/></button></div>
        </div>
        <div className="promise"><span className="promise-icon"><Lock size={16}/></span><div><strong>Built for productive struggle.</strong><p>outside.bots gives you room to reason, make mistakes, and build your own conviction — before the AI steps in.</p></div></div>
      </section> : <section className="session-view">
        <div className="session-top"><button className="back" onClick={() => setStarted(false)}><X size={18}/> Exit session</button><div className="mode-pill"><active.icon size={16}/>{active.title}</div><span className="step-count">Step {step} of 3</span></div>
        <div className="progress"><span style={{width: `${progress}%`}}/></div>
        <div className="session-grid"><div className="thinking-card"><span className="eyebrow">THINK IT THROUGH</span><h1>{prompts[step-1]}</h1><p className="session-copy">Take a minute. Your first thought doesn’t need to be perfect — it just needs to be yours.</p><div className="response-box"><textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write what you think…"/><div className="response-foot"><span>{answer.length ? `${answer.length} characters` : 'Your response is private until you continue'}</span><button disabled={!answer.trim()} onClick={advance}>Continue <ArrowRight size={17}/></button></div></div></div>
          <aside className="support-card"><div className="lock-orb"><Lock size={22}/></div><h3>AI is listening,<br/>not leading.</h3><p>Hints and the worked answer stay locked while you build your own path.</p><div className="support-line"><span>01</span> Notice what you know <Check size={15}/></div><div className={'support-line ' + (step > 1 ? 'done' : 'current')}><span>02</span> Test your reasoning {step > 1 && <Check size={15}/>}</div><div className={'support-line ' + (step > 2 ? 'done' : '')}><span>03</span> Connect the idea {step > 2 && <Check size={15}/>}</div></aside></div>
        {step === 3 && <div className="unlock-strip"><div><span className="unlock-icon"><Sparkles size={17}/></span><strong>You’ve built a path.</strong><p>Want to compare it with a worked explanation?</p></div><button onClick={() => setShowAnswer(!showAnswer)}>{showAnswer ? 'Hide explanation' : 'Unlock AI explanation'} <Lock size={15}/></button></div>}
        {showAnswer && <div className="answer-card"><span className="eyebrow">WORKED EXPLANATION</span><p>Displacement is the area under a velocity–time graph. Split the space beneath the line into simple shapes, calculate each area, then add them together. Areas below the time axis count as negative displacement.</p></div>}
      </section>}
    </main>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
