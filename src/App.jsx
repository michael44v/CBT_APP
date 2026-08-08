import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [screen, setScreen] = useState('DASHBOARD'); // 'DASHBOARD' | 'EXAM' | 'RESULT'

  // User profile
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('fillop_cbt_user') || '';
  });

  // DB and Sync status
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, logs: [] });
  const [errorMessage, setErrorMessage] = useState('');

  // Active exam execution states
  const [activeExam, setActiveExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { questionId: selectedOptionText }
  const [timeLeft, setTimeLeft] = useState(0); // countdown in seconds
  const [activeResult, setActiveResult] = useState(null); // Result row after submission

  // Timers and refs
  const timerRef = useRef(null);
  const timeLeftRef = useRef(0);
  timeLeftRef.current = timeLeft;

  // Initialize and load general data
  useEffect(() => {
    loadDashboardData();

    // Register sync event listener to auto-refresh status when logs update
    if (window.api && window.api.onSyncStatusChanged) {
      window.api.onSyncStatusChanged(() => {
        loadSyncStatus();
        loadResults();
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Save user name to localStorage for convenience
  useEffect(() => {
    localStorage.setItem('fillop_cbt_user', userName);
  }, [userName]);

  const loadDashboardData = async () => {
    try {
      await loadExams();
      await loadResults();
      await loadSyncStatus();
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  };

  const loadExams = async () => {
    if (window.api && window.api.getExams) {
      const data = await window.api.getExams();
      setExams(data);
    }
  };

  const loadResults = async () => {
    if (window.api && window.api.getResults) {
      const data = await window.api.getResults();
      setResults(data);
    }
  };

  const loadSyncStatus = async () => {
    if (window.api && window.api.getSyncStatus) {
      const status = await window.api.getSyncStatus();
      setSyncStatus(status);
    }
  };

  const toggleSimulateOnline = async (checked) => {
    if (window.api && window.api.setOnlineStatus) {
      const status = await window.api.setOnlineStatus(checked);
      setSyncStatus(prev => ({ ...prev, isOnline: status.isOnline }));
      loadSyncStatus();
    }
  };

  const handleManualSync = async () => {
    if (window.api && window.api.startSync) {
      await window.api.startSync();
      loadDashboardData();
    }
  };

  // Exam flow handlers
  const startCBTExam = async (exam) => {
    if (!userName.trim()) {
      setErrorMessage('Please enter your name to begin the exam.');
      return;
    }
    setErrorMessage('');

    try {
      setActiveExam(exam);

      // Load questions for the selected exam
      const loadedQuestions = await window.api.getQuestions(exam.id);
      setQuestions(loadedQuestions);
      setCurrentIdx(0);

      // Load saved answers if any (to handle resume or start fresh)
      const savedAnswers = await window.api.getSavedAnswers(exam.id);
      setUserAnswers(savedAnswers || {});

      // Setup countdown (duration is in minutes, convert to seconds)
      const durationSeconds = exam.duration * 60;
      setTimeLeft(durationSeconds);

      setScreen('EXAM');

      // Start Countdown Timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (timeLeftRef.current <= 1) {
          clearInterval(timerRef.current);
          autoSubmitExam();
        } else {
          setTimeLeft(prev => prev - 1);
        }
      }, 1000);

    } catch (err) {
      console.error('Error starting exam:', err);
      setErrorMessage('Failed to start exam. Please try again.');
    }
  };

  const handleAnswerSelect = async (optionText) => {
    const q = questions[currentIdx];
    if (!q) return;

    // Save locally in React state for instant responsiveness
    const updated = { ...userAnswers, [q.id]: optionText };
    setUserAnswers(updated);

    // Persist to local SQLite db in real time via safe preload bridge
    if (window.api && window.api.saveAnswer) {
      await window.api.saveAnswer(activeExam.id, q.id, optionText);
    }
  };

  const autoSubmitExam = async () => {
    console.log('[App] Auto-submitting due to timeout...');
    await processExamSubmission();
  };

  const handleManualSubmit = async () => {
    if (window.confirm('Are you sure you want to submit your test?')) {
      await processExamSubmission();
    }
  };

  const processExamSubmission = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (window.api && window.api.submitExam) {
        // Submit answers, calculate score, retrieve result row
        const resultRow = await window.api.submitExam(activeExam.id, userName.trim());
        setActiveResult(resultRow);
        setScreen('RESULT');
        loadDashboardData();
      }
    } catch (err) {
      console.error('Failed to submit exam:', err);
      alert('An error occurred while submitting your test. Saving locally.');
    }
  };

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div className="app-container">
      {/* Safe header with simulated network switch */}
      <header className="app-header">
        <div className="app-branding">
          <span className="app-logo">⚡</span>
          <span className="app-title-text">Fillop CBT Guru</span>
        </div>

        <div className="network-controls">
          <div className="network-switch-container">
            <span className="network-label">Network Simulation</span>
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

          <button className="btn btn-primary btn-sm" onClick={handleManualSync} disabled={!syncStatus.isOnline}>
            Sync Now
          </button>
        </div>
      </header>

      <main className="app-content">

        {/* ================= DASHBOARD SCREEN ================= */}
        {screen === 'DASHBOARD' && (
          <div className="dashboard-grid">

            <div className="dashboard-left">
              <div className="welcome-section">
                <h1 className="welcome-title">Empower Your Success</h1>
                <p className="welcome-desc">
                  Welcome to Fillop CBT Guru. Track your performance, practice mock exams offline-first, and sync your scores automatically when connected to the network.
                </p>
              </div>

              {/* User Profile Setup */}
              <div className="setup-card">
                <h2 className="card-title">Candidate Profile</h2>
                <div className="form-group">
                  <label className="form-label" htmlFor="username-input">Full Name / Candidate Name</label>
                  <input
                    type="text"
                    id="username-input"
                    className="form-input"
                    placeholder="Enter your name to unlock practice tests..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                {errorMessage && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: '600' }}>
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* Active Exams Lists */}
              <div className="exams-section">
                <h2 className="card-title">Available Practice Tests</h2>
                <div className="exams-grid">
                  {exams.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No active exams found in the local database.</p>
                  ) : (
                    exams.map((exam) => (
                      <div className="exam-card" key={exam.id}>
                        <div className="exam-meta">
                          <h3 className="exam-title-card">{exam.title}</h3>
                          <p className="exam-desc-card">{exam.description}</p>
                          <div className="exam-details">
                            <span className="detail-badge timer-badge">⏱ {exam.duration} Minutes</span>
                            <span className="detail-badge">📚 Multi-Subject (20 Qs)</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => startCBTExam(exam)}
                        >
                          Start Test
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Results History */}
              <div className="results-card">
                <h2 className="card-title">My Performance History</h2>
                <div className="results-table-container">
                  {results.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>You haven't completed any exams yet.</p>
                  ) : (
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Exam</th>
                          <th>Score</th>
                          <th>Percentage</th>
                          <th>Submitted At</th>
                          <th>Cloud Sync</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => {
                          const dateStr = new Date(r.submitted_at).toLocaleString();
                          const hasPassed = r.percentage >= 50;
                          return (
                            <tr key={r.id}>
                              <td style={{ fontWeight: '600' }}>{r.user_name}</td>
                              <td>{r.exam_title || 'CBT Exam'}</td>
                              <td>
                                <span className={`score-badge ${hasPassed ? 'passed' : 'failed'}`}>
                                  {r.score} / {r.total_questions}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                                {r.percentage.toFixed(1)}%
                              </td>
                              <td>{dateStr}</td>
                              <td>
                                <span className={`sync-status-badge ${r.synced ? 'synced' : 'pending'}`}>
                                  {r.synced ? 'Synced ✓' : 'Pending ⏳'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Sync Status Logs right sidebar */}
            <div className="dashboard-right">
              <div className="logs-card">
                <h2 className="card-title">Offline Engine Sync Log</h2>
                <p className="palette-desc" style={{ marginBottom: '1rem' }}>
                  Real-time synchronization activities log between local SQLite and cloud server simulations.
                </p>
                <div className="logs-list">
                  {syncStatus.logs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No synchronization logs available.</p>
                  ) : (
                    syncStatus.logs.map((log) => {
                      const lTime = new Date(log.timestamp).toLocaleTimeString();
                      const isSuccess = log.status === 'SUCCESS';
                      const isFailed = log.status === 'FAILED';
                      const logStatusClass = isSuccess ? 'success' : isFailed ? 'failed' : 'pending';

                      return (
                        <div className="log-item" key={log.id}>
                          <div className="log-meta">
                            <span className="log-event">{log.event_type}</span>
                            <span className={`log-status ${logStatusClass}`}>{log.status}</span>
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
        {screen === 'EXAM' && questions.length > 0 && (
          <div className="exam-screen">

            {/* Exam Header displaying Info and countdown timer */}
            <div className="exam-header">
              <div className="exam-info-panel">
                <h2>{activeExam.title}</h2>
                <p>Candidate: <strong style={{ color: 'white' }}>{userName}</strong></p>
              </div>

              <div className="timer-panel">
                <span className="timer-icon">⏳</span>
                <span className="timer-countdown">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            <div className="exam-layout">

              {/* Question Selection Pane */}
              <div className="question-card">
                <div className="question-meta-row">
                  <span className="question-number-badge">Question {currentIdx + 1} of {questions.length}</span>
                  <span className="subject-badge">{questions[currentIdx].subject}</span>
                </div>

                <p className="question-text">
                  {questions[currentIdx].text}
                </p>

                <div className="options-list">
                  {questions[currentIdx].options.map((option, idx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const isSelected = userAnswers[questions[currentIdx].id] === option;
                    return (
                      <div
                        key={idx}
                        className={`option-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleAnswerSelect(option)}
                      >
                        <div className="option-marker">{letters[idx]}</div>
                        <div className="option-text">{option}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Back, Next buttons */}
                <div className="navigation-row">
                  <button
                    className="btn"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                  >
                    ← Previous
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      className="btn btn-success"
                      onClick={handleManualSubmit}
                    >
                      Finish and Submit Exam
                    </button>
                  )}
                </div>
              </div>

              {/* Right panel question palette */}
              <div className="palette-card">
                <h2 className="card-title">Question Palette</h2>
                <p className="palette-desc">Click any box to navigate instantly to that question:</p>

                <div className="palette-grid">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentIdx;
                    const isAnswered = !!userAnswers[q.id];
                    let btnClass = 'palette-btn';
                    if (isAnswered) btnClass += ' answered';
                    if (isCurrent) btnClass += ' active';

                    return (
                      <button
                        key={q.id}
                        className={btnClass}
                        onClick={() => setCurrentIdx(idx)}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Legend explanation */}
                <div className="palette-legend">
                  <div className="legend-item">
                    <span className="legend-color unanswered"></span>
                    <span>Unanswered</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color answered"></span>
                    <span>Answered locally</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color current"></span>
                    <span>Current Active Question</span>
                  </div>
                </div>

                {/* Extra explicit Submit button on the palette panel */}
                <div className="submit-box">
                  <button
                    className="btn btn-danger"
                    style={{ width: '100%' }}
                    onClick={handleManualSubmit}
                  >
                    Submit Exam Now
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ================= RESULT SCREEN ================= */}
        {screen === 'RESULT' && activeResult && (
          <div className="result-container">
            <div className="result-header">
              <h1 className="result-congrats">Exam Completed!</h1>
              <p className="result-subtitle">Great effort! Below are your scores recorded inside the offline system.</p>
            </div>

            {/* Circular score presentation */}
            <div className={`percentage-circle ${activeResult.percentage >= 50 ? 'passed' : 'failed'}`}>
              <span className="percentage-value">{activeResult.percentage.toFixed(0)}%</span>
              <span className="percentage-label">Score Percentage</span>
            </div>

            <div className="score-summary-grid">
              <div className="score-summary-card">
                <div className="score-summary-val" style={{ color: 'var(--accent)' }}>
                  {activeResult.user_name}
                </div>
                <div className="score-summary-label">Candidate Name</div>
              </div>

              <div className="score-summary-card">
                <div className="score-summary-val">
                  {activeResult.score} / {activeResult.total_questions}
                </div>
                <div className="score-summary-label">Correct Answers</div>
              </div>
            </div>

            {/* Offline sync status feedback */}
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
              {syncStatus.isOnline ? (
                <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                  ✓ This result has been successfully synchronized to the cloud!
                </span>
              ) : (
                <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                  ⏳ Saved locally. Will automatically sync to cloud when you simulate Online mode.
                </span>
              )}
            </p>

            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                setActiveResult(null);
                setScreen('DASHBOARD');
              }}
            >
              Back to Dashboard
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
