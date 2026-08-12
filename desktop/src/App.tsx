import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic, Question, Result, SyncStatus } from './global';

type Screen = 'ACTIVATION' | 'DASHBOARD' | 'EXAM' | 'RESULT' | 'REVIEW';

export default function App() {
  const [screen, setScreen] = useState<Screen>('ACTIVATION');
  const [activation, setActivation] = useState<{ email: string; passcode: string } | null>(null);

  // Activation credentials
  const [actEmail, setActEmail] = useState('');
  const [actPasscode, setActPasscode] = useState('');
  const [actError, setActError] = useState('');
  const [actLoading, setActLoading] = useState(false);

  // Sync / Online state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isOnline: true, logs: [] });

  // Mode Selection State
  const [examType, setExamType] = useState<'JAMB' | 'WAEC' | 'NECO'>('JAMB');
  const [dashboardMode, setDashboardMode] = useState<'PRACTICE' | 'MOCK' | 'ANALYTICS'>('PRACTICE');

  // Metadata Lists
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [yearsList, setYearsList] = useState<number[]>([]);

  // Practice Selection Form
  const [practiceSubject, setPracticeSubject] = useState<number | ''>('');
  const [practiceTopic, setPracticeTopic] = useState<number | ''>('');
  const [practiceYear, setPracticeYear] = useState<number | ''>('');
  const [practiceTimed, setPracticeTimed] = useState<boolean>(true);

  // Mock Selection Form
  const [mockSelectedSubjects, setMockSelectedSubjects] = useState<number[]>([]);
  const [mockSelectionMode, setMockSelectionMode] = useState<'YEAR' | 'RANDOM'>('RANDOM');
  const [mockSelectedYear, setMockSelectedYear] = useState<number | ''>('');

  // Exam Screen execution state
  const [examSessionId, setExamSessionId] = useState<string>('');
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [revealExplanation, setRevealExplanation] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string>('');

  // Timers
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = useRef<number>(0);
  timeLeftRef.current = timeLeft;

  // Historic Results & Analytics
  const [historyResults, setHistoryResults] = useState<Result[]>([]);

  // Post Exam results display
  const [activeResult, setActiveResult] = useState<Result | null>(null);

  // Check Activation Status on Load
  useEffect(() => {
    checkActivation();
    loadSyncLogs();

    if (window.api && window.api.onSyncStatusChanged) {
      window.api.onSyncStatusChanged(() => {
        loadSyncLogs();
        loadResultsHistory();
      });
    }

    return () => {
      stopTimer();
    };
  }, []);

  // Sync state & syllabus lists upon dashboard activation
  useEffect(() => {
    if (screen === 'DASHBOARD') {
      loadSyllabusData();
      loadResultsHistory();
    }
  }, [screen, examType]);

  // Load topics & years when practice subject changes
  useEffect(() => {
    if (practiceSubject) {
      loadTopicsAndYears(practiceSubject);
    } else {
      setTopicsList([]);
      setYearsList([]);
    }
  }, [practiceSubject]);

  const checkActivation = async () => {
    if (window.api && window.api.getActivationStatus) {
      const act = await window.api.getActivationStatus();
      if (act && act.is_active) {
        setActivation({ email: act.email, passcode: act.passcode });
        setScreen('DASHBOARD');
      } else {
        setScreen('ACTIVATION');
      }
    }
  };

 const loadSyncLogs = async () => {
  if (window.api && window.api.getSyncStatus) {
    try {
      const status = await window.api.getSyncStatus();

      setSyncStatus({
        isOnline: Boolean(status?.isOnline),
        logs: Array.isArray(status?.logs) ? status.logs : []
      });
    } catch (error) {
      console.error('Failed to load sync status:', error);

      setSyncStatus({
        isOnline: false,
        logs: []
      });
    }
  }
};

  const loadResultsHistory = async () => {
    if (window.api && window.api.getResults) {
      const hist = await window.api.getResults();
      setHistoryResults(hist || []);
    }
  };

 const loadSyllabusData = async () => {
  if (window.api && window.api.getSubjects) {
    try {
      const subs = await window.api.getSubjects(examType);

      console.log("[RENDER] subjects response:", subs);
      console.log("[RENDER] isArray:", Array.isArray(subs));

      setSubjectsList(Array.isArray(subs) ? subs : []);
      setMockSelectedSubjects([]);
      setPracticeSubject('');
    } catch (error) {
      console.error("[RENDER] Failed to load subjects:", error);
      setSubjectsList([]);
    }
  }
};

  const loadTopicsAndYears = async (subjectId: number) => {
    if (window.api && window.api.getTopics && window.api.getYearsForSubject) {
      const tops = await window.api.getTopics(subjectId);
      const yrs = await window.api.getYearsForSubject(examType, subjectId);
      setTopicsList(tops || []);
      setYearsList(yrs || []);
      setPracticeTopic('');
      setPracticeYear('');
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActError('');
    if (!actEmail.trim() || !actPasscode.trim()) {
      setActError('Please provide both registration email and passcode.');
      return;
    }

    setActLoading(true);
    try {
      const res = await window.api.activateApp(actEmail.trim(), actPasscode.trim());
      if (res.success) {
        setActivation({ email: actEmail.trim(), passcode: actPasscode.trim() });
        setScreen('DASHBOARD');
      } else {
        setActError(res.error || 'Failed to authenticate subscription.');
      }
    } catch (err: any) {
      setActError('Activation service unreachable. Check connectivity.');
    } finally {
      setActLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out from this device terminal?')) return;
    if (window.api && window.api.logoutApp) {
      await window.api.logoutApp();
      setActivation(null);
      setScreen('ACTIVATION');
    }
  };

  const toggleSimulateOnline = async (checked: boolean) => {
    if (window.api && window.api.setOnlineStatus) {
      await window.api.setOnlineStatus(checked);
      loadSyncLogs();
    }
  };

  const triggerManualSync = async () => {
    if (window.api && window.api.startSync) {
      await window.api.startSync();
      loadSyncLogs();
      loadResultsHistory();
    }
  };

  // --- Start Exam Session ---

  const startPracticeSession = async () => {
    if (!practiceSubject) {
      alert('Please select a subject to study.');
      return;
    }

    try {
      setFallbackNotice('');
      setIsPracticeMode(true);
      setRevealExplanation(false);
      setAnswers({});
      setFlagged({});

      const qList = await window.api.generatePracticeQuestions({
        examType,
        subjectId: Number(practiceSubject),
        topicId: practiceTopic ? Number(practiceTopic) : undefined,
        year: practiceYear ? Number(practiceYear) : undefined,
        limit: 30,
      });

      if (qList.length === 0) {
        alert('No questions match this configuration. Try another subject/topic.');
        return;
      }

      const sessId = `session-${Date.now()}`;
      setExamSessionId(sessId);
      setExamQuestions(qList);
      setCurrentIdx(0);

      // 60 minutes default for practice if timed
      const totalSecs = practiceTimed ? 60 * 60 : 0;
      setTimeLeft(totalSecs);
      setScreen('EXAM');
      startTimer(totalSecs);
    } catch (e) {
      console.error(e);
    }
  };

  const startMockSession = async () => {
    if (mockSelectedSubjects.length === 0) {
      alert('Please choose at least one subject.');
      return;
    }
    if (mockSelectedSubjects.length > 4) {
      alert('Mock exams are limited to a maximum of 4 subjects.');
      return;
    }
    if (mockSelectionMode === 'YEAR' && !mockSelectedYear) {
      alert('Please choose a past paper year.');
      return;
    }

    try {
      setFallbackNotice('');
      setIsPracticeMode(false);
      setRevealExplanation(false);
      setAnswers({});
      setFlagged({});

      const res = await window.api.generateMockQuestions({
        examType,
        subjectIds: mockSelectedSubjects,
        byYear: mockSelectionMode === 'YEAR' ? Number(mockSelectedYear) : undefined,
      });

      if (res.questions.length === 0) {
        alert('No questions found for selection. Pull more questions or choose other subjects.');
        return;
      }

      if (res.fallbackNote) {
        setFallbackNotice(res.fallbackNote);
      }

      const sessId = `session-${Date.now()}`;
      setExamSessionId(sessId);
      setExamQuestions(res.questions);
      setCurrentIdx(0);

      // Duration: 40 seconds per question
      const totalSecs = res.questions.length * 40;
      setTimeLeft(totalSecs);

      setScreen('EXAM');
      startTimer(totalSecs);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Timer Controls ---

  const startTimer = (secs: number) => {
    stopTimer();
    if (secs <= 0) return;

    timerRef.current = setInterval(() => {
      if (timeLeftRef.current <= 1) {
        stopTimer();
        autoSubmitExam();
      } else {
        setTimeLeft(prev => prev - 1);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTimer = (totalSecs: number) => {
    if (totalSecs <= 0) return 'Untimed Practice';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // Pacing Indicator based on average 40s per question
  const getPacingFeedback = () => {
    if (isPracticeMode || timeLeft <= 0) return null;
    const timeSpent = (examQuestions.length * 40) - timeLeft;
    const expectedTimeSpent = (currentIdx + 1) * 40;
    const diff = timeSpent - expectedTimeSpent;

    if (diff > 45) {
      return { text: `⚠️ You are ${Math.round(diff / 60)}m behind pace (recommended: 40s/Q)`, class: 'pacing-behind' };
    }
    return { text: `⚡ Ideal pace maintained! (~40s per question)`, class: 'pacing-on-track' };
  };

  // --- Handle Candidate Responses ---

  const selectAnswer = async (ans: 'A' | 'B' | 'C' | 'D') => {
    const q = examQuestions[currentIdx];
    if (!q) return;

    setAnswers(prev => ({ ...prev, [q.id]: ans }));
    if (window.api && window.api.saveAnswer) {
      await window.api.saveAnswer(examType, examSessionId, q.id, ans);
    }
  };

  const toggleFlag = () => {
    const q = examQuestions[currentIdx];
    if (!q) return;
    setFlagged(prev => ({ ...prev, [q.id]: !prev[q.id] }));
  };

  // --- Submission Process ---

  const autoSubmitExam = async () => {
    console.warn('[CBT Exam] Time expired. Auto-submitting candidates results.');
    await processSubmission();
  };

  const manualSubmitExam = async () => {
    const total = examQuestions.length;
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = total - answeredCount;

    if (window.confirm(`Are you sure you want to finish your test?\nTotal questions: ${total}\nAnswered: ${answeredCount}\nUnanswered: ${unansweredCount}`)) {
      await processSubmission();
    }
  };

  const processSubmission = async () => {
    stopTimer();

    // Compute grades and scores
    let correctCount = 0;
    const detailsList: any[] = [];

    for (const q of examQuestions) {
      const userAns = answers[q.id] || null;
      const isCorrect = userAns === q.correct_answer;
      if (isCorrect) correctCount++;

      detailsList.push({
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        user_answer: userAns,
        is_correct: isCorrect,
        topic_explanation: q.topic_explanation,
        correct_explanation: q.correct_explanation,
        wrong_explanations: q.wrong_explanations
      });
    }

    const percentage = examQuestions.length > 0 ? (correctCount / examQuestions.length) * 100 : 0;

    try {
      const resultRow = await window.api.submitExamResult({
        examType,
        examSessionId,
        userName: activation?.email || 'Student',
        score: correctCount,
        totalQuestions: examQuestions.length,
        percentage,
        details: JSON.stringify(detailsList)
      });

      setActiveResult(resultRow);
      setScreen('RESULT');
    } catch (e) {
      console.error('Submission failed', e);
      alert('Saved locally. Submission completed.');
    }
  };

  // --- Rendering Helpers ---

  const hasPassed = activeResult && activeResult.percentage >= 50;

  return (
    <div className="app-container">
      {/* App Header Bar with Network Switcher */}
      <header className="app-header">
        <div className="app-branding">
          <span className="app-logo">⚡</span>
          <span className="app-title-text">Fillop CBT Guru</span>
          {activation && <span className="term-badge">OFFLINE TERMINAL</span>}
        </div>

        <div className="network-controls">
          <div className="network-switch-container">
            <span className="network-label">Simulate Network</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={syncStatus.isOnline}
                onChange={(e) => toggleSimulateOnline(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className={`status-indicator ${syncStatus.isOnline ? 'online' : 'offline'}`}>
              <span className={`dot ${syncStatus.isOnline ? 'online' : 'offline'}`}></span>
              {syncStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <button className="btn btn-primary btn-sm" onClick={triggerManualSync} disabled={!syncStatus.isOnline}>
            Sync Now
          </button>
        </div>
      </header>

      <main className="app-content">

        {/* ================= ACTIVATION / LOGIN SCREEN ================= */}
        {screen === 'ACTIVATION' && (
          <div style={{ maxWidth: '480px', margin: '4rem auto', width: '100%' }}>
            <div className="setup-card" style={{ padding: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.5rem' }}>Terminal Activation</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Please enter your email and 12-digit subscription passcode to activate Fillop CBT Guru offline.
                </p>
              </div>

              <form onSubmit={handleActivateSubmit}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ color: '#94a3b8' }}>Registration Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="user@example.com"
                    value={actEmail}
                    onChange={(e) => setActEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ color: '#94a3b8' }}>Subscription Passcode</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="GP-XXXX-XXXX"
                    style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                    value={actPasscode}
                    onChange={(e) => setActPasscode(e.target.value)}
                    required
                  />
                </div>

                {actError && (
                  <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    ❌ {actError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', height: 'auto' }}
                  disabled={actLoading}
                >
                  {actLoading ? 'Authenticating & Syncing...' : 'Secure Register Device Terminal 🚀'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= DASHBOARD SCREEN ================= */}
        {screen === 'DASHBOARD' && activation && (
          <div className="dashboard-grid">

            {/* Left side candidate metadata & quick logs */}
            <div className="dashboard-left">
              <div className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="welcome-title">Welcome Candidate!</h1>
                  <p className="welcome-desc" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                    Active User Profile: <strong>{activation.email}</strong>
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Log Out 👤</button>
              </div>

              {/* Mode Selection Tabs */}
              <div className="setup-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <button className={`btn ${dashboardMode === 'PRACTICE' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDashboardMode('PRACTICE')}>📚 Practice Mode</button>
                  <button className={`btn ${dashboardMode === 'MOCK' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDashboardMode('MOCK')}>⏱ Mock Exam Mode</button>
                  <button className={`btn ${dashboardMode === 'ANALYTICS' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDashboardMode('ANALYTICS')}>📈 Performance Insights</button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <span className="form-label" style={{ alignSelf: 'center' }}>Select Exam Structure:</span>
                  <select className="form-input" style={{ width: '150px' }} value={examType} onChange={(e) => setExamType(e.target.value as any)}>
                    <option value="JAMB">JAMB CBT</option>
                    <option value="WAEC">WAEC</option>
                    <option value="NECO">NECO</option>
                  </select>
                </div>

                {/* --- Mode: PRACTICE --- */}
                {dashboardMode === 'PRACTICE' && (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Practice Module Setup</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Subject to Study</label>
                        <select className="form-input" value={practiceSubject} onChange={(e) => setPracticeSubject(Number(e.target.value))}>
                          <option value="">-- Choose Subject --</option>
                          {subjectsList.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Optional Topic Filter (Single-Subject)</label>
                        <select className="form-input" value={practiceTopic} onChange={(e) => setPracticeTopic(Number(e.target.value))} disabled={!practiceSubject}>
                          <option value="">All Topics</option>
                          {topicsList.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Optional Past Year Paper</label>
                        <select className="form-input" value={practiceYear} onChange={(e) => setPracticeYear(Number(e.target.value))} disabled={!practiceSubject}>
                          <option value="">Randomized Years</option>
                          {yearsList.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.5rem 0' }}>
                        <input
                          type="checkbox"
                          id="practice-timed-check"
                          checked={practiceTimed}
                          onChange={(e) => setPracticeTimed(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="practice-timed-check" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>Enable 60-Minute Countdown Timer</label>
                      </div>

                      <button className="btn btn-success btn-lg" onClick={startPracticeSession} disabled={!practiceSubject}>
                        Launch Practice Session 🚀
                      </button>
                    </div>
                  </div>
                )}

                {/* --- Mode: MOCK --- */}
                {dashboardMode === 'MOCK' && (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Mock Examination Room</h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                      Select up to 4 subjects. Evaluates standard conditions: JAMB has 40Q/subject (60 for English) at 40 seconds per question. WAEC/NECO has 50Q/subject.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <div className="form-group">
                        <label className="form-label">Select Subjects (Multi-Choice)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          {subjectsList.map(s => {
                            const isChecked = mockSelectedSubjects.includes(s.id);
                            return (
                              <label key={s.id} style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', alignItems: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setMockSelectedSubjects(prev => prev.filter(id => id !== s.id));
                                    } else {
                                      setMockSelectedSubjects(prev => [...prev, s.id]);
                                    }
                                  }}
                                />
                                {s.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Mock Selection Mode</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="radio"
                              name="mock-select-mode"
                              checked={mockSelectionMode === 'RANDOM'}
                              onChange={() => setMockSelectionMode('RANDOM')}
                            />
                            Stratified Random
                          </label>
                          <label style={{ cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="radio"
                              name="mock-select-mode"
                              checked={mockSelectionMode === 'YEAR'}
                              onChange={() => setMockSelectionMode('YEAR')}
                            />
                            By Past Year
                          </label>
                        </div>
                      </div>

                      {mockSelectionMode === 'YEAR' && (
                        <div className="form-group">
                          <label className="form-label">Select Target Past Year Paper</label>
                          <select className="form-input" value={mockSelectedYear} onChange={(e) => setMockSelectedYear(Number(e.target.value))}>
                            <option value="">-- Choose Past Year --</option>
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                            <option value="2021">2021</option>
                          </select>
                        </div>
                      )}

                      <button className="btn btn-success btn-lg" onClick={startMockSession} disabled={mockSelectedSubjects.length === 0}>
                        Begin Official Mock Exam ⏱
                      </button>
                    </div>
                  </div>
                )}

                {/* --- Mode: ANALYTICS --- */}
                {dashboardMode === 'ANALYTICS' && (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Performance Insights Aggregator</h3>
                    {historyResults.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No historical exam records completed inside this terminal yet.</p>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                          <div style={{ backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Total Exams Taken</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.3rem' }}>{historyResults.length}</div>
                          </div>
                          <div style={{ backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Cumulative Average</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
                              {(historyResults.reduce((acc, r) => acc + r.percentage, 0) / historyResults.length).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.5rem' }}>Historic Result Stream</h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {historyResults.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.85rem' }}>
                              <span>{r.exam_type} ({r.total_questions} Qs)</span>
                              <strong style={{ color: r.percentage >= 50 ? '#10b981' : '#ef4444' }}>{r.percentage.toFixed(0)}%</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right side real-time logs */}
            <div className="dashboard-right">
              <div className="logs-card">
                <h2 className="card-title">Local Engine Sync Log</h2>
                <div className="logs-list" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                  {syncStatus.logs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No synchronization entries.</p>
                  ) : (
                    syncStatus.logs.map((log) => {
                      const lTime = new Date(log.timestamp).toLocaleTimeString();
                      const statusClass = log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'failed' : 'pending';
                      return (
                        <div className="log-item" key={log.id}>
                          <div className="log-meta">
                            <span className="log-event">{log.event_type}</span>
                            <span className={`log-status ${statusClass}`}>{log.status}</span>
                          </div>
                          <div className="log-text">{log.message}</div>
                          <div className="log-time">{lTime}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================= EXAM SCREEN ================= */}
        {screen === 'EXAM' && examQuestions.length > 0 && (
          <div className="exam-screen">
            <div className="exam-header">
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{examType} Exam Room</h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Session: <strong style={{ color: 'white' }}>{examSessionId}</strong></p>
              </div>

              <div className="timer-panel">
                <span className="timer-icon">⏳</span>
                <span className="timer-countdown">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {fallbackNotice && (
              <div style={{ padding: '0.8rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: '6px', color: 'var(--warning)', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                {fallbackNotice}
              </div>
            )}

            {/* Pacing Indicator inside Mock exams */}
            {getPacingFeedback() && (
              <div className={`pacing-strip ${getPacingFeedback()?.class}`} style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem',
                backgroundColor: getPacingFeedback()?.class === 'pacing-behind' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: getPacingFeedback()?.class === 'pacing-behind' ? '#fca5a5' : '#a7f3d0'
              }}>
                {getPacingFeedback()?.text}
              </div>
            )}

            <div className="exam-layout">
              {/* Question Selection Card */}
              <div className="question-card">
                <div className="question-meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="question-number-badge">Question {currentIdx + 1} of {examQuestions.length}</span>
                  <span className="subject-badge" style={{ backgroundColor: '#1e293b', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                    {examType} Year {examQuestions[currentIdx].year}
                  </span>
                </div>

                <p className="question-text" style={{ fontSize: '1.15rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  {examQuestions[currentIdx].question_text}
                </p>

                <div className="options-list">
                  {[
                    { key: 'A', text: examQuestions[currentIdx].option_a },
                    { key: 'B', text: examQuestions[currentIdx].option_b },
                    { key: 'C', text: examQuestions[currentIdx].option_c },
                    { key: 'D', text: examQuestions[currentIdx].option_d },
                  ].map((opt) => {
                    const isSelected = answers[examQuestions[currentIdx].id] === opt.key;
                    return (
                      <div
                        key={opt.key}
                        className={`option-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => selectAnswer(opt.key as any)}
                      >
                        <div className="option-marker">{opt.key}</div>
                        <div className="option-text">{opt.text}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Single Subject Practice Explanation Expansion */}
                {isPracticeMode && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={() => setRevealExplanation(!revealExplanation)}>
                      {revealExplanation ? '🙈 Hide Explanation' : '💡 Reveal Practice Explanation'}
                    </button>

                    {revealExplanation && (
                      <div style={{ marginTop: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '1rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '0.3rem' }}>Topic Overview ({examQuestions[currentIdx].topic_explanation || 'General'}):</div>
                        <p style={{ marginBottom: '0.8rem' }}>{examQuestions[currentIdx].topic_explanation}</p>

                        <div style={{ fontWeight: 'bold', color: 'var(--success)', marginBottom: '0.3rem' }}>Correct Choice Breakdown:</div>
                        <p style={{ marginBottom: '0.8rem' }}>{examQuestions[currentIdx].correct_explanation}</p>

                        <div style={{ fontWeight: 'bold', color: 'var(--danger)', marginBottom: '0.3rem' }}>Incorrect Alternatives:</div>
                        <p>{examQuestions[currentIdx].wrong_explanations || 'No incorrect details set.'}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Previous / Next row */}
                <div className="navigation-row" style={{ marginTop: '2rem' }}>
                  <button className="btn" disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)}>
                    ← Previous
                  </button>

                  <button className={`btn ${flagged[examQuestions[currentIdx].id] ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleFlag}>
                    {flagged[examQuestions[currentIdx].id] ? '🚩 Unflag Question' : '🏳️ Flag for Review'}
                  </button>

                  {currentIdx < examQuestions.length - 1 ? (
                    <button className="btn btn-primary" onClick={() => setCurrentIdx(prev => prev + 1)}>
                      Next Question →
                    </button>
                  ) : (
                    <button className="btn btn-success" onClick={manualSubmitExam}>
                      Complete & Finish Exam
                    </button>
                  )}
                </div>
              </div>

              {/* Right column palette panel */}
              <div className="palette-card">
                <h3 className="card-title">Test Navigation</h3>
                <p className="palette-desc" style={{ fontSize: '0.8rem' }}>Quick jump to any question box:</p>

                <div className="palette-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                  {examQuestions.map((q, idx) => {
                    const isCurrent = idx === currentIdx;
                    const isAnswered = !!answers[q.id];
                    const isFlagged = flagged[q.id];

                    let btnClass = 'palette-btn';
                    if (isCurrent) btnClass += ' active';
                    if (isFlagged) btnClass += ' flagged';
                    else if (isAnswered) btnClass += ' answered';

                    return (
                      <button key={q.id} className={btnClass} onClick={() => setCurrentIdx(idx)}>
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="palette-legend" style={{ fontSize: '0.8rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="legend-item"><span className="legend-color unanswered"></span> Unanswered</div>
                  <div className="legend-item"><span className="legend-color answered"></span> Answered</div>
                  <div className="legend-item"><span className="legend-color flagged" style={{ backgroundColor: '#ef4444' }}></span> Flagged Review</div>
                  <div className="legend-item"><span className="legend-color current"></span> Active Question</div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={manualSubmitExam}>
                    Submit Test Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= RESULT SCREEN ================= */}
        {screen === 'RESULT' && activeResult && (
          <div className="result-container" style={{ maxWidth: '640px', margin: '4rem auto' }}>
            <div className="result-header">
              <h1 className="result-congrats" style={{ color: hasPassed ? '#10b981' : '#f59e0b' }}>
                {hasPassed ? 'Congratulations!' : 'Exam Attempt Completed'}
              </h1>
              <p className="result-subtitle">Your score has been successfully cataloged offline.</p>
            </div>

            <div className={`percentage-circle ${hasPassed ? 'passed' : 'failed'}`}>
              <span className="percentage-value">{activeResult.percentage.toFixed(0)}%</span>
              <span className="percentage-label">Total Percentage</span>
            </div>

            <div className="score-summary-grid" style={{ marginBottom: '2rem' }}>
              <div className="score-summary-card">
                <div className="score-summary-val" style={{ color: 'var(--accent)' }}>{activeResult.score} / {activeResult.total_questions}</div>
                <div className="score-summary-label">Correct Answers</div>
              </div>
              <div className="score-summary-card">
                <div className="score-summary-val">{activeResult.synced ? 'Synced ✓' : 'Pending ⏳'}</div>
                <div className="score-summary-label">Central Cloud Backup</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setScreen('REVIEW')}>
                📝 Review Incorrect & Answers
              </button>
              <button className="btn btn-primary" onClick={() => setScreen('DASHBOARD')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ================= REVIEW SCREEN ================= */}
        {screen === 'REVIEW' && activeResult && (
          <div style={{ maxWidth: '800px', margin: '3rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Question-by-Question Review</h1>
                <p style={{ color: '#94a3b8' }}>Review incorrect selections and read explanations.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setScreen('DASHBOARD')}>Return to Dashboard</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {JSON.parse(activeResult.details || '[]').map((item: any, idx: number) => {
                return (
                  <div key={idx} className="admin-card" style={{ borderLeft: `6px solid ${item.is_correct ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: '#3b82f6' }}>Question {idx + 1}</strong>
                      <span className={`badge ${item.is_correct ? 'badge-success' : 'badge-danger'}`}>
                        {item.is_correct ? 'Correct ✓' : 'Incorrect ❌'}
                      </span>
                    </div>

                    <p style={{ fontSize: '1.1rem', marginBottom: '1.2rem', lineHeight: '1.5' }}>{item.question_text}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
                      {[
                        { key: 'A', text: item.option_a },
                        { key: 'B', text: item.option_b },
                        { key: 'C', text: item.option_c },
                        { key: 'D', text: item.option_d },
                      ].map(opt => {
                        let rowStyle: React.CSSProperties = {
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.6rem 1rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.95rem'
                        };

                        if (opt.key === item.correct_answer) {
                          rowStyle.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                          rowStyle.borderColor = '#10b981';
                        } else if (opt.key === item.user_answer) {
                          rowStyle.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                          rowStyle.borderColor = '#ef4444';
                        }

                        return (
                          <div key={opt.key} style={rowStyle}>
                            <strong style={{ marginRight: '1rem', color: '#94a3b8' }}>{opt.key}.</strong>
                            <span>{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '0.3rem' }}>Topic: {item.topic_explanation || 'General Syllabus'}</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--success)', marginBottom: '0.3rem' }}>Correct Answer Explanation:</div>
                      <p style={{ marginBottom: '0.5rem' }}>{item.correct_explanation}</p>
                      {item.wrong_explanations && (
                        <>
                          <div style={{ fontWeight: 'bold', color: 'var(--danger)', marginBottom: '0.3rem' }}>Incorrect Answer Breakdown:</div>
                          <p>{item.wrong_explanations}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
