import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic, Question, Result, SyncStatus } from './global';
import { Sun, Moon } from 'lucide-react';

type Screen = 'ACTIVATION' | 'DASHBOARD' | 'INSTRUCTIONS' | 'EXAM' | 'RESULT' | 'REVIEW' | 'NEWS_DETAIL';

interface ActiveActivation {
  email: string;
  passcode: string;
  user_name?: string;
  profile_picture?: string;
  activated_at?: string;
  expiry_date?: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('ACTIVATION');
  const [activation, setActivation] = useState<ActiveActivation | null>(null);

  // News State
  const [newsList, setNewsList] = useState<any[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  // Leaderboard State
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Calculator State
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [calcDisplay, setCalcDisplay] = useState<string>('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [calcPos, setCalcPos] = useState({ x: 400, y: 150 });
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragStart) {
        setCalcPos({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };
    const handleGlobalMouseUp = () => {
      setDragStart(null);
    };

    if (dragStart) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragStart]);

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<string>('This Week');

  // Mini Ads State
  const [activeAdIdx, setActiveAdIdx] = useState<number>(0);
  const imageAdsList = [
    { image: "/ad1.svg", alt: "Get Premium CBT Upgrades" },
    { image: "/ad2.svg", alt: "Practice JAMB, WAEC & NECO Offline" },
    { image: "/ad3.svg", alt: "Contact Fillop Tech Support" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIdx(prev => (prev + 1) % imageAdsList.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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

  // Active Exam Subjects
  const [examSubjects, setExamSubjects] = useState<Subject[]>([]);

  const loadNewsList = async () => {
    if (window.api && window.api.getNews) {
      try {
        const list = await window.api.getNews();
        setNewsList(list || []);
      } catch (e) {
        console.error('Failed to load news:', e);
      }
    }
  };

  // Check Activation Status on Load
  useEffect(() => {
    checkActivation();
    loadSyncLogs();
    loadNewsList();

    if (window.api && window.api.onSyncStatusChanged) {
      window.api.onSyncStatusChanged(() => {
        loadSyncLogs();
        loadResultsHistory();
        loadNewsList();
      });
    }

    return () => {
      stopTimer();
    };
  }, []);

  // JAMB 10-Key Keyboard Shortcuts Integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keys if the user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (screen !== 'EXAM' && screen !== 'INSTRUCTIONS') {
        return;
      }

      const key = e.key.toUpperCase();

      if (screen === 'INSTRUCTIONS') {
        if (key === 'S') {
          // START EXAM
          setScreen('EXAM');
          startTimer(timeLeft);
        } else if (key === 'P' || e.key === 'Escape') {
          // CANCEL
          setScreen('DASHBOARD');
        }
        return;
      }

      // Inside EXAM screen:
      if (examQuestions.length === 0) return;
      const currentQuestion = examQuestions[currentIdx];

      if (key === 'A') {
        selectAnswer('A');
      } else if (key === 'B') {
        selectAnswer('B');
      } else if (key === 'C') {
        selectAnswer('C');
      } else if (key === 'D') {
        selectAnswer('D');
      } else if (key === 'N') {
        // Next
        if (currentIdx < examQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1);
        }
      } else if (key === 'P') {
        // Previous
        if (currentIdx > 0) {
          setCurrentIdx(prev => prev - 1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Cycle active selection up: D -> C -> B -> A
        const currentAns = answers[currentQuestion.id];
        if (!currentAns) {
          selectAnswer('D');
        } else if (currentAns === 'D') {
          selectAnswer('C');
        } else if (currentAns === 'C') {
          selectAnswer('B');
        } else if (currentAns === 'B') {
          selectAnswer('A');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Cycle active selection down: A -> B -> C -> D
        const currentAns = answers[currentQuestion.id];
        if (!currentAns) {
          selectAnswer('A');
        } else if (currentAns === 'A') {
          selectAnswer('B');
        } else if (currentAns === 'B') {
          selectAnswer('C');
        } else if (currentAns === 'C') {
          selectAnswer('D');
        }
      } else if (key === 'S') {
        // Submit Test Confirmation Trigger
        setShowSubmitConfirm(true);
      } else if (key === 'Y') {
        // If the submit confirmation dialog is visible, confirm and submit!
        if (showSubmitConfirm) {
          setShowSubmitConfirm(false);
          processSubmission();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen, examQuestions, currentIdx, answers, showSubmitConfirm, timeLeft]);

  // Sync state & syllabus lists upon dashboard activation
  useEffect(() => {
    if (screen === 'DASHBOARD') {
      loadSyllabusData();
      loadResultsHistory();
      loadNewsList();
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

  const handleOpenLeaderboard = async () => {
    if (!syncStatus.isOnline) {
      alert("⚠️ Leaderboard is an online feature. Please make sure 'Simulate Network' is checked and your device is online.");
      return;
    }
    setShowLeaderboard(true);
    setLeaderboardLoading(true);
    try {
      const res = await fetch("http://localhost:80/fillop/api/v1/leaderboard.php");
      const data = await res.json();
      if (data.success) {
        setLeaderboardData(data.leaderboard || []);
        setLeaderboardTimeframe(data.timeframe || 'This Week');
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const checkActivation = async () => {
    if (window.api && window.api.getActivationStatus) {
      const act = await window.api.getActivationStatus();
      if (act && act.is_active) {
        setActivation({
          email: act.email,
          passcode: act.passcode,
          user_name: act.user_name,
          profile_picture: act.profile_picture,
          activated_at: act.activated_at,
          expiry_date: act.expiry_date
        });
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
        setSyncStatus({ isOnline: false, logs: [] });
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
        setActivation({
          email: actEmail.trim(),
          passcode: actPasscode.trim(),
          user_name: res.user_name,
          profile_picture: res.profile_picture,
          activated_at: res.activated_at || new Date().toISOString(),
          expiry_date: res.expiry_date
        });
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

      const activeSub = subjectsList.find(s => s.id === Number(practiceSubject));
      setExamSubjects(activeSub ? [activeSub] : []);

      const sessId = `session-${Date.now()}`;
      setExamSessionId(sessId);
      setExamQuestions(qList);
      setCurrentIdx(0);

      const totalSecs = practiceTimed ? 60 * 60 : 0;
      setTimeLeft(totalSecs);
      setScreen('INSTRUCTIONS');
    } catch (e) {
      console.error(e);
    }
  };

  const startMockSession = async () => {
    if (examType === 'JAMB') {
      if (mockSelectedSubjects.length !== 4) {
        alert('JAMB Mock exams require exactly 4 subjects.');
        return;
      }
    } else {
      if (mockSelectedSubjects.length === 0) {
        alert('Please choose at least one subject.');
        return;
      }
      if (mockSelectedSubjects.length > 4) {
        alert('Mock exams are limited to a maximum of 4 subjects.');
        return;
      }
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

      const activeSubs = subjectsList.filter(s => mockSelectedSubjects.includes(s.id));
      setExamSubjects(activeSubs);

      const sessId = `session-${Date.now()}`;
      setExamSessionId(sessId);
      setExamQuestions(res.questions);
      setCurrentIdx(0);

      // Enforce 120 minutes for mock exam
      const totalSecs = 120 * 60;
      setTimeLeft(totalSecs);
      setScreen('INSTRUCTIONS');
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

  const getPacingFeedback = () => {
    if (isPracticeMode || timeLeft <= 0) return null;
    const timeSpent = (examQuestions.length * 40) - timeLeft;
    const expectedTimeSpent = (currentIdx + 1) * 40;
    const diff = timeSpent - expectedTimeSpent;

    if (diff > 45) {
      return { text: `Behind pace by ${Math.round(diff / 60)}m (recommended: 40s/Q)`, class: 'behind' };
    }
    return { text: `Ideal pace maintained (~40s per question)`, class: 'on-track' };
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

  const manualSubmitExam = () => {
    setShowSubmitConfirm(true);
  };

  const processSubmission = async () => {
    stopTimer();

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

  // --- Design Tokens ---
  const colors = {
    primary: 'rgb(29, 48, 144)',
    primaryDark: 'rgb(18, 30, 95)',
    primaryLight: isDarkMode ? 'rgba(29, 48, 144, 0.3)' : 'rgba(29, 48, 144, 0.1)',
    sidebar: isDarkMode ? '#1e1e1e' : 'rgb(29, 48, 144)',
    sidebarHover: isDarkMode ? '#2d2d2d' : 'rgba(255, 255, 255, 0.1)',
    bg: isDarkMode ? '#121212' : 'rgb(244, 243, 246)',
    surface: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#f4f3f6' : '#1e293b',
    textSecondary: isDarkMode ? '#a1a0a5' : '#64748b',
    textMuted: isDarkMode ? '#717075' : '#94a3b8',
    border: isDarkMode ? '#2d2d2d' : '#e2e8f0',
    success: '#10b981',
    successLight: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
    danger: '#ef4444',
    dangerLight: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
    warning: '#f59e0b',
    warningLight: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
  };

  const styles: Record<string, React.CSSProperties> = {
    app: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: colors.bg, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: colors.text, overflow: 'hidden' },
    sidebar: { width: '240px', backgroundColor: colors.sidebar, display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 },
    sidebarBrand: { padding: '0 24px 32px', display: 'flex', alignItems: 'center', gap: '12px' },
    sidebarBrandIcon: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' },
    sidebarBrandText: { color: '#fff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' },
    sidebarNav: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', flex: 1 },
    sidebarItem: { padding: '12px 16px', borderRadius: '10px', color: '#c7d2fe', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', border: 'none', background: 'none', width: '100%', textAlign: 'left' },
    sidebarItemActive: { backgroundColor: colors.primary, color: '#fff' },
    sidebarFooter: { padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#818cf8', fontSize: '12px' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { height: '68px', backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerTitle: { fontSize: '20px', fontWeight: 700, color: colors.text },
    headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
    networkPill: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: colors.primaryLight, fontSize: '13px', fontWeight: 600, color: colors.primary },
    dot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' },
    btn: { padding: '10px 20px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    btnPrimary: { backgroundColor: colors.primary, color: '#fff' },
    btnSecondary: { backgroundColor: colors.surface, color: colors.textSecondary, border: `1px solid ${colors.border}` },
    btnSuccess: { backgroundColor: colors.success, color: '#fff' },
    btnDanger: { backgroundColor: colors.danger, color: '#fff' },
    btnSm: { padding: '6px 14px', fontSize: '13px' },
    btnLg: { padding: '14px 28px', fontSize: '15px' },
    content: { flex: 1, overflow: 'auto', padding: '32px' },
    card: { backgroundColor: colors.surface, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)', border: `1px solid ${colors.border}` },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: colors.textSecondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' },
    input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', backgroundColor: colors.surface, color: colors.text, outline: 'none', transition: 'border-color 0.2s' },
    select: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', backgroundColor: colors.surface, color: colors.text, outline: 'none', cursor: 'pointer' },
    tabs: { display: 'flex', gap: '8px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '24px' },
    tab: { padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, color: colors.textSecondary, cursor: 'pointer' },
    tabActive: { backgroundColor: colors.primaryLight, color: colors.primary },
    statCard: { backgroundColor: colors.surface, borderRadius: '16px', padding: '24px', textAlign: 'center', border: `1px solid ${colors.border}` },
    statLabel: { fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
    statValue: { fontSize: '32px', fontWeight: 800, color: colors.primary },
    logItem: { padding: '12px 0', borderBottom: `1px solid ${colors.border}`, fontSize: '13px' },
    logMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
    logEvent: { fontWeight: 600, color: colors.text },
    logStatus: { fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' },
    logStatusSuccess: { backgroundColor: colors.successLight, color: colors.success },
    logStatusFailed: { backgroundColor: colors.dangerLight, color: colors.danger },
    logStatusPending: { backgroundColor: colors.warningLight, color: colors.warning },
    logText: { color: colors.textSecondary, marginBottom: '2px' },
    logTime: { color: colors.textMuted, fontSize: '11px' },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', backgroundColor: colors.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', padding: '6px 0' },
    examHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    timerPanel: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', backgroundColor: colors.primaryDark, color: '#fff', borderRadius: '12px', fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' },
    questionCard: { backgroundColor: colors.surface, borderRadius: '16px', padding: '32px', flex: 1, border: `1px solid ${colors.border}` },
    paletteCard: { backgroundColor: colors.surface, borderRadius: '16px', padding: '24px', width: '280px', flexShrink: 0, border: `1px solid ${colors.border}` },
    optionItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '12px', cursor: 'pointer', transition: 'all 0.15s', fontSize: '15px' },
    optionItemSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    optionMarker: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: colors.primary, flexShrink: 0 },
    paletteGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' },
    paletteBtn: { width: '100%', aspectRatio: '1', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.surface, fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: colors.textSecondary },
    paletteBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary, color: '#fff' },
    paletteBtnAnswered: { borderColor: colors.success, backgroundColor: colors.successLight, color: colors.success },
    paletteBtnFlagged: { borderColor: colors.danger, backgroundColor: colors.dangerLight, color: colors.danger },
    legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: colors.textSecondary },
    legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
    resultCircle: { width: '160px', height: '160px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', border: `8px solid ${colors.primaryLight}` },
    resultCirclePassed: { borderColor: colors.success },
    resultCircleFailed: { borderColor: colors.warning },
    reviewCard: { backgroundColor: colors.surface, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, borderLeftWidth: '6px' },
    badge: { display: 'inline-flex', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' },
    badgeSuccess: { backgroundColor: colors.successLight, color: colors.success },
    badgeDanger: { backgroundColor: colors.dangerLight, color: colors.danger },
    pacingBehind: { padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', backgroundColor: colors.dangerLight, color: colors.danger },
    pacingOnTrack: { padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', backgroundColor: colors.successLight, color: colors.success },
    fallbackBanner: { padding: '14px 18px', backgroundColor: colors.warningLight, border: `1px solid ${colors.warning}`, borderRadius: '10px', color: '#92400e', fontSize: '14px', marginBottom: '20px', fontWeight: 600 },
    explanationBox: { marginTop: '16px', backgroundColor: colors.primaryLight, border: `1px solid #c7d2fe`, borderRadius: '10px', padding: '20px', fontSize: '14px', lineHeight: '1.6' },
  };

  const sidebarNavItems = activation ? [
    { id: 'DASHBOARD', label: 'Dashboard', icon: 'D' },
    { id: 'ANALYTICS', label: 'Analytics', icon: 'A' },
  ] : [];

  const isSidebarActive = (id: string) => {
    if (id === 'DASHBOARD' && screen === 'DASHBOARD') return true;
    if (id === 'ANALYTICS' && screen === 'DASHBOARD' && dashboardMode === 'ANALYTICS') return true;
    return false;
  };

  const handleSidebarClick = (id: string) => {
    if (id === 'DASHBOARD') {
      setDashboardMode('PRACTICE');
      setScreen('DASHBOARD');
    }
    if (id === 'ANALYTICS') {
      setDashboardMode('ANALYTICS');
      setScreen('DASHBOARD');
    }
  };

  return (
    <div style={styles.app}>
      {/* Sidebar - only show when activated */}
      {activation && screen !== 'ACTIVATION' && (
        <aside style={styles.sidebar}>
          <div style={styles.sidebarBrand}>
            <img src="/icon.png" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid white' }} alt="App Icon" />
            <span style={styles.sidebarBrandText}>Fillop CBT</span>
          </div>

          <nav style={styles.sidebarNav}>
            {sidebarNavItems.map(item => (
              <button
                key={item.id}
                style={{
                  ...styles.sidebarItem,
                  ...(isSidebarActive(item.id) ? styles.sidebarItemActive : {})
                }}
                onClick={() => handleSidebarClick(item.id)}
              >
                <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isSidebarActive(item.id) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}

            <button
              style={{
                ...styles.sidebarItem,
                marginTop: '8px',
                border: '1px stroke rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }}
              onClick={() => alert("No updates available")}
            >
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                🔄
              </span>
              Check for updates
            </button>
          </nav>

          {/* Mini Image Ads Slider Section */}
          <div style={{
            margin: '0 16px 16px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: isDarkMode ? '1px solid #2d2d2d' : '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            <img
              src={imageAdsList[activeAdIdx].image}
              alt={imageAdsList[activeAdIdx].alt}
              style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
            />
          </div>

          <div style={styles.sidebarFooter}>
            <div style={{ fontWeight: 600, color: '#c7d2fe', marginBottom: '2px' }}>
              Activated: {(() => {
                if (!activation.activated_at) return 'Jan 15, 2024';
                try {
                  const d = new Date(activation.activated_at);
                  if (isNaN(d.getTime())) return 'Jan 15, 2024';
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } catch (e) {
                  return 'Jan 15, 2024';
                }
              })()}
            </div>
            <div>Offline Terminal v2.0</div>
          </div>
        </aside>
      )}

      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>
              {screen === 'ACTIVATION' && 'Terminal Activation'}
              {screen === 'DASHBOARD' && 'Exam Dashboard'}
              {screen === 'EXAM' && `${examType} Exam Room`}
              {screen === 'RESULT' && 'Exam Results'}
              {screen === 'REVIEW' && 'Question Review'}
            </span>
            {activation && (
              <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 500 }}>
                {activation.email}
              </span>
            )}
          </div>

          <div style={styles.headerRight}>
            {activation && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 4px',
                borderRadius: '20px',
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                border: '1px solid #f59e0b',
                color: isDarkMode ? '#fbbf24' : '#b45309',
                fontSize: '11px',
                fontWeight: 700
              }}>
                
               <span>
  {(() => {
    if (!activation.expiry_date) return 'NULL';
    try {
      const d = new Date(activation.expiry_date);
      if (isNaN(d.getTime())) return 'Expires: NULL';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `Expires: ${year}-${month}`;
    } catch (e) {
      return 'NULL';
    }
  })()}
</span>
              </div>
            )}

   <button
  type="button"
  onClick={() => setIsDarkMode(!isDarkMode)}
  aria-label="Toggle dark mode"
  style={{
    width: '60px',
    height: '32px',
    border: 'none',
    borderRadius: '999px',
    padding: '3px',
    cursor: 'pointer',
    background: isDarkMode ? '#374151' : '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isDarkMode ? 'flex-end' : 'flex-start',
    transition: 'all 0.25s ease',
  }}
>
  <span
    style={{
      width: '26px',
      height: '26px',
      borderRadius: '50%',
      background: isDarkMode ? '#111827' : '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      transition: 'all 0.25s ease',
    }}
  >
    {isDarkMode ? (
      <Moon size={15} strokeWidth={2.2} color="#fff" />
    ) : (
      <Sun size={15} strokeWidth={2.2} color="#374151" />
    )}
  </span>
</button>
            {activation && screen === 'DASHBOARD' && (
              <button style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm }} onClick={handleLogout}>
                Log Out
              </button>
            )}

            <div style={styles.networkPill}>
              <span style={{ ...styles.dot, backgroundColor: syncStatus.isOnline ? colors.success : colors.danger }}></span>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </div>

            <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }} onClick={triggerManualSync} disabled={!syncStatus.isOnline}>
              Sync Now
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: colors.textSecondary, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncStatus.isOnline}
                onChange={(e) => toggleSimulateOnline(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: colors.primary }}
              />
              Simulate Network
            </label>
          </div>
        </header>

        <main style={styles.content}>
          {/* ================= ACTIVATION SCREEN ================= */}
          {screen === 'ACTIVATION' && (
            <div style={{ maxWidth: '440px', margin: '80px auto' }}>
              <div style={styles.card}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <img src="/icon.png" style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px', display: 'block', border: `3px solid ${colors.primary}` }} alt="App Icon" />
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: colors.text, marginBottom: '8px' }}>Terminal Activation</h1>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                    Enter your registration email and 12-digit subscription passcode to activate Fillop CBT Guru offline.
                  </p>
                </div>

                <form onSubmit={handleActivateSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Registration Email</label>
                    <input
                      type="email"
                      style={styles.input}
                      placeholder="user@example.com"
                      value={actEmail}
                      onChange={(e) => setActEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Subscription Passcode</label>
                    <input
                      type="text"
                      style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: '0.08em' }}
                      placeholder="GP-XXXX-XXXX"
                      value={actPasscode}
                      onChange={(e) => setActPasscode(e.target.value)}
                      required
                    />
                  </div>

                  {actError && (
                    <div style={{ color: colors.danger, fontWeight: 600, fontSize: '13px', marginBottom: '16px', backgroundColor: colors.dangerLight, padding: '12px', borderRadius: '8px' }}>
                      {actError}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', justifyContent: 'center', padding: '14px' }}
                    disabled={actLoading}
                  >
                    {actLoading ? 'Authenticating...' : 'Activate Device Terminal'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= NEWS DETAIL SCREEN (Medium Style) ================= */}
          {screen === 'NEWS_DETAIL' && selectedNews && (
            <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
              {/* Back Button */}
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, marginBottom: '32px' }}
                onClick={() => {
                  setSelectedNews(null);
                  setScreen('DASHBOARD');
                }}
              >
                ← Back to Dashboard
              </button>

              <article style={{ backgroundColor: colors.surface, borderRadius: '16px', padding: '40px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                {/* Header Section */}
                <header style={{ marginBottom: '32px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary, fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    <span>
                      {selectedNews.icon_name === 'star' && '⭐'}
                      {selectedNews.icon_name === 'rocket' && '🚀'}
                      {selectedNews.icon_name === 'bell' && '🔔'}
                      {selectedNews.icon_name === 'newspaper' && '📰'}
                    </span>
                    <span>Official Announcement</span>
                  </div>

                  <h1 style={{ fontSize: '36px', fontWeight: 800, color: colors.text, lineHeight: 1.2, marginBottom: '20px' }}>
                    {selectedNews.title}
                  </h1>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                      FC
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: colors.text }}>Fillop CBT Administrator</div>
                      <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                        Published on {new Date(selectedNews.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} • 2 min read
                      </div>
                    </div>
                  </div>
                </header>

                {/* Content Section */}
                <section style={{ fontSize: '18px', lineHeight: 1.8, color: colors.text, whiteSpace: 'pre-line' }}>
                  {selectedNews.content}
                </section>
              </article>
            </div>
          )}

          {/* ================= DASHBOARD SCREEN ================= */}
          {screen === 'DASHBOARD' && activation && (
            <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Welcome Card */}
                <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Welcome, Candidate</h2>
                    <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                      Active profile: <strong style={{ color: colors.primary }}>{activation.email}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={handleOpenLeaderboard}
                      style={{ ...styles.btn, backgroundColor: colors.warning, color: '#fff', border: 'none', fontWeight: 700 }}
                    >
                       Weekly Leaderboard
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', backgroundColor: colors.primaryLight, borderRadius: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: colors.primary }}>OFFLINE TERMINAL</span>
                    </div>
                  </div>
                </div>

              {/* Supported Examination Bodies Showcase */}
<div style={{ ...styles.card, backgroundColor: isDarkMode ? 'rgba(29, 48, 144, 0.15)' : '#f0f4ff', borderColor: isDarkMode ? '#2d3e60' : '#c7d2fe', padding: '10px 14px' }}>
  <div style={{ fontSize: '10px', fontWeight: 800, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
    Supported Official Examination Bodies
  </div>
  <div style={styles.grid3}>
    {/* JAMB */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.surface, padding: '8px 10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
      <img src="/jamb.webp" alt="JAMB Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
      <div>
        <div style={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>JAMB UTME</div>
       
      </div>
    </div>

    {/* WAEC */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.surface, padding: '8px 10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
      <img src="/waec.webp" alt="WAEC Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
      <div>
        <div style={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>WAEC SSCE</div>
       
      </div>
    </div>

    {/* NECO */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.surface, padding: '8px 10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
      <img src="/NECO.jpg" alt="NECO Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
      <div>
        <div style={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>NECO SSCE</div>
       
      </div>
    </div>
  </div>
</div>

                {/* Mode Tabs + Content */}
                <div style={styles.card}>
                  <div style={styles.tabs}>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'PRACTICE' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('PRACTICE')}>Practice Mode</button>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'MOCK' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('MOCK')}>Mock Exam</button>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'ANALYTICS' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('ANALYTICS')}>Performance</button>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                    <span style={{ ...styles.label, margin: 0 }}>Exam Structure</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={examType === 'JAMB' ? '/jamb.webp' : examType === 'WAEC' ? '/waec.webp' : '/NECO.jpg'}
                        alt={`${examType} Logo`}
                        style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                      />
                      <select style={{ ...styles.select, width: '140px' }} value={examType} onChange={(e) => setExamType(e.target.value as any)}>
                        <option value="JAMB">JAMB CBT</option>
                        <option value="WAEC">WAEC</option>
                        <option value="NECO">NECO</option>
                      </select>
                    </div>
                  </div>

                  {/* --- Mode: PRACTICE --- */}
                  {dashboardMode === 'PRACTICE' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Practice Module Setup</h3>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase' }}>
                           PRACTICE MODE
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Subject to Study</label>
                          <select style={styles.select} value={practiceSubject} onChange={(e) => setPracticeSubject(Number(e.target.value))}>
                            <option value="">-- Choose Subject --</option>
                            {subjectsList.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Topic Filter (Optional)</label>
                          <select style={styles.select} value={practiceTopic} onChange={(e) => setPracticeTopic(Number(e.target.value))} disabled={!practiceSubject}>
                            <option value="">All Topics</option>
                            {topicsList.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Past Year Paper (Optional)</label>
                          <select style={styles.select} value={practiceYear} onChange={(e) => setPracticeYear(Number(e.target.value))} disabled={!practiceSubject}>
                            <option value="">Randomized Years</option>
                            {yearsList.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={practiceTimed}
                            onChange={(e) => setPracticeTimed(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: colors.primary }}
                          />
                          Enable 60-Minute Countdown Timer
                        </label>

                        <button style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnLg, marginTop: '8px', width: 'fit-content' }} onClick={startPracticeSession} disabled={!practiceSubject}>
                          Launch Practice Session
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- Mode: MOCK --- */}
                  {dashboardMode === 'MOCK' && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Mock Examination Room</h3>
                      <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.5 }}>
                        Select up to 4 subjects. Evaluates standard conditions: JAMB has 40Q/subject (60 for English) at 40 seconds per question. WAEC/NECO has 50Q/subject.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Select Subjects (up to 4)</label>
                          <div style={styles.checkboxGrid}>
                            {subjectsList.map(s => {
                              const isChecked = mockSelectedSubjects.includes(s.id);
                              return (
                                <label key={s.id} style={styles.checkboxLabel}>
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
                                    style={{ width: '16px', height: '16px', accentColor: colors.primary }}
                                  />
                                  {s.name}
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Selection Mode</label>
                          <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                              <input type="radio" name="mock-mode" checked={mockSelectionMode === 'RANDOM'} onChange={() => setMockSelectionMode('RANDOM')} style={{ accentColor: colors.primary }} />
                              Stratified Random
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                              <input type="radio" name="mock-mode" checked={mockSelectionMode === 'YEAR'} onChange={() => setMockSelectionMode('YEAR')} style={{ accentColor: colors.primary }} />
                              By Past Year
                            </label>
                          </div>
                        </div>

                        {mockSelectionMode === 'YEAR' && (
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Target Past Year</label>
                            <select style={styles.select} value={mockSelectedYear} onChange={(e) => setMockSelectedYear(Number(e.target.value))}>
                              <option value="">-- Choose Year --</option>
                              <option value="2023">2023</option>
                              <option value="2022">2022</option>
                              <option value="2021">2021</option>
                            </select>
                          </div>
                        )}

                        <button style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnLg, width: 'fit-content' }} onClick={startMockSession} disabled={mockSelectedSubjects.length === 0}>
                          Begin Official Mock Exam
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- Mode: ANALYTICS --- */}
                  {dashboardMode === 'ANALYTICS' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Performance Analytics &amp; Mastery Breakdown</h3>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted }}>
                          {historyResults.length > 0 ? `Based on ${historyResults.length} completed exam(s)` : 'Target Performance Metrics'}
                        </span>
                      </div>

                      {/* Stat Cards */}
                      <div style={{ ...styles.grid3, marginBottom: '24px' }}>
                        <div style={styles.statCard}>
                          <div style={styles.statLabel}>Total Exams</div>
                          <div style={styles.statValue}>{historyResults.length}</div>
                        </div>
                        <div style={styles.statCard}>
                          <div style={styles.statLabel}>Cumulative Average</div>
                          <div style={{ ...styles.statValue, color: colors.success }}>
                            {historyResults.length > 0 ? (historyResults.reduce((acc, r) => acc + r.percentage, 0) / historyResults.length).toFixed(1) : '72.5'}%
                          </div>
                        </div>
                        <div style={styles.statCard}>
                          <div style={styles.statLabel}>Top Score</div>
                          <div style={{ ...styles.statValue, color: colors.primary }}>
                            {historyResults.length > 0 ? Math.max(...historyResults.map(r => r.percentage)).toFixed(0) : '92'}%
                          </div>
                        </div>
                      </div>

                      {/* Pie Chart Section */}
                      {(() => {
                        let masteryCount = 0;
                        let passCount = 0;
                        let reviewCount = 0;

                        if (historyResults.length > 0) {
                          historyResults.forEach(r => {
                            if (r.percentage >= 75) masteryCount++;
                            else if (r.percentage >= 50) passCount++;
                            else reviewCount++;
                          });
                        } else {
                          masteryCount = 5;
                          passCount = 3;
                          reviewCount = 2;
                        }

                        const total = masteryCount + passCount + reviewCount;
                        const pMastery = masteryCount / total;
                        const pPass = passCount / total;
                        const pReview = reviewCount / total;

                        return (
                          <div style={{
                            backgroundColor: colors.bg,
                            borderRadius: '16px',
                            padding: '24px',
                            border: `1px solid ${colors.border}`,
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '32px',
                            flexWrap: 'wrap'
                          }}>
                            {/* SVG Pie Chart */}
                            <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                              <svg viewBox="0 0 42 42" style={{ width: '180px', height: '180px', transform: 'rotate(-90deg)', borderRadius: '50%' }}>
                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={colors.border} strokeWidth="6" />
                                {/* Segment 1: Mastery */}
                                <circle
                                  cx="21" cy="21" r="15.91549430918954"
                                  fill="transparent"
                                  stroke="#10b981"
                                  strokeWidth="6"
                                  strokeDasharray={`${pMastery * 100} ${100 - pMastery * 100}`}
                                  strokeDashoffset="0"
                                />
                                {/* Segment 2: Pass */}
                                <circle
                                  cx="21" cy="21" r="15.91549430918954"
                                  fill="transparent"
                                  stroke="#3b82f6"
                                  strokeWidth="6"
                                  strokeDasharray={`${pPass * 100} ${100 - pPass * 100}`}
                                  strokeDashoffset={`${-pMastery * 100}`}
                                />
                                {/* Segment 3: Needs Review */}
                                <circle
                                  cx="21" cy="21" r="15.91549430918954"
                                  fill="transparent"
                                  stroke="#ef4444"
                                  strokeWidth="6"
                                  strokeDasharray={`${pReview * 100} ${100 - pReview * 100}`}
                                  strokeDashoffset={`${-(pMastery + pPass) * 100}`}
                                />
                              </svg>
                              <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{ fontSize: '20px', fontWeight: 800, color: colors.text }}>
                                  {(historyResults.length > 0 ? (historyResults.reduce((acc, r) => acc + r.percentage, 0) / historyResults.length) : 72.5).toFixed(0)}%
                                </span>
                                <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>
                                  Score Avg
                                </span>
                              </div>
                            </div>

                            {/* Legend & Breakdown Parameters */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: colors.text, marginBottom: '4px' }}>
                                Candidate Score Distribution Pie Chart
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: colors.surface, borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' }}></span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>Mastery Level (Score ≥ 75%)</span>
                                </div>
                                <strong style={{ fontSize: '14px', color: '#10b981' }}>{(pMastery * 100).toFixed(0)}% ({masteryCount})</strong>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: colors.surface, borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#3b82f6' }}></span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>Satisfactory Pass (50% – 74%)</span>
                                </div>
                                <strong style={{ fontSize: '14px', color: '#3b82f6' }}>{(pPass * 100).toFixed(0)}% ({passCount})</strong>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: colors.surface, borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444' }}></span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>Needs Review (Score &lt; 50%)</span>
                                </div>
                                <strong style={{ fontSize: '14px', color: '#ef4444' }}>{(pReview * 100).toFixed(0)}% ({reviewCount})</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Historic Results Table */}
                      <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, margin: '24px 0 12px', letterSpacing: '0.5px' }}>Historic Results Log</h4>
                      {historyResults.length === 0 ? (
                        <p style={{ color: colors.textSecondary, fontSize: '13px' }}>No exam logs recorded yet. Take a practice or mock exam to generate live metrics.</p>
                      ) : (
                        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {historyResults.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: colors.bg, borderRadius: '10px', fontSize: '13px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600 }}>{r.exam_type} <span style={{ color: colors.textMuted }}>({r.total_questions} Qs)</span></span>
                              <strong style={{ color: r.percentage >= 50 ? colors.success : colors.danger, fontSize: '15px' }}>{r.percentage.toFixed(0)}%</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Admin News & Sync Logs */}
              <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* News Card */}
                <div style={styles.card}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: '16px', letterSpacing: '0.5px' }}>Latest Admin News</h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newsList.length === 0 ? (
                      <p style={{ color: colors.textMuted, fontSize: '13px' }}>No announcements published.</p>
                    ) : (
                      newsList.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedNews(item);
                            setScreen('NEWS_DETAIL');
                          }}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            transition: 'background-color 0.2s',
                            borderBottom: `1px solid ${colors.border}`
                          }}
                          className="news-item-hover"
                        >
                          <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
                            {item.icon_name === 'star' && '⭐'}
                            {item.icon_name === 'rocket' && '🚀'}
                            {item.icon_name === 'bell' && '🔔'}
                            {item.icon_name === 'newspaper' && '📰'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text, marginBottom: '2px', lineHeight: 1.3 }}>{item.title}</div>
                            <div style={{ fontSize: '11px', color: colors.textSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                              {item.content}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sync Log Card */}
                <div style={styles.card}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: '16px', letterSpacing: '0.5px' }}>Sync Log</h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {syncStatus.logs.length === 0 ? (
                      <p style={{ color: colors.textMuted, fontSize: '13px' }}>No synchronization entries.</p>
                    ) : (
                      syncStatus.logs.map((log) => {
                        const lTime = new Date(log.timestamp).toLocaleTimeString();
                        const statusClass = log.status === 'SUCCESS' ? styles.logStatusSuccess : log.status === 'FAILED' ? styles.logStatusFailed : styles.logStatusPending;
                        return (
                          <div style={styles.logItem} key={log.id}>
                            <div style={styles.logMeta}>
                              <span style={styles.logEvent}>{log.event_type}</span>
                              <span style={{ ...styles.logStatus, ...statusClass }}>{log.status}</span>
                            </div>
                            <div style={styles.logText}>{log.message}</div>
                            <div style={styles.logTime}>{lTime}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= INSTRUCTIONS SCREEN ================= */}
          {screen === 'INSTRUCTIONS' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: '#d0e5f9',
              margin: '-32px', // Override parent padding
              padding: '0',
              fontFamily: 'Inter, system-ui, sans-serif',
              userSelect: 'none',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Top Bar Callout 1, 2, 3 */}
              <div style={{
                height: '60px',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                borderBottom: '3px solid #1d4ed8'
              }}>
                {/* Callout 1: Selected Subjects */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {examSubjects.map((sub) => (
                    <div key={sub.id} style={{
                      backgroundColor: '#1d4ed8',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '14px',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      border: '1px solid #1e40af'
                    }}>
                      {sub.name}
                    </div>
                  ))}
                </div>

                {/* Callout 2: Calculator Icon */}
                <div
                  onClick={() => setIsCalcOpen(!isCalcOpen)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '11px',
                    marginRight: '20px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>📟</span>
                  <span>Calculator</span>
                </div>

                {/* Callout 3: Timer countdown */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'white',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '2px solid #1d4ed8',
                  color: '#1e40af',
                  fontWeight: 700,
                  fontSize: '16px'
                }}>
                  <span>⏱️</span>
                  <span>{(timeLeft / 60).toFixed(2)} min</span>
                </div>
              </div>

              {/* Main Body */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Panel - Instructions (Callout 5) */}
                <div style={{
                  flex: 1,
                  padding: '40px',
                  backgroundColor: 'white',
                  overflowY: 'auto',
                  borderRight: '1px solid #93c5fd',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>Instructions</h1>
                      {isPracticeMode && (
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444', backgroundColor: '#fee2e2', padding: '6px 16px', borderRadius: '8px', letterSpacing: '1px', border: '2px solid #ef4444' }}>
                          🔴 PRACTICE MODE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                      The Buyer shall provide an LPO that will last for three weeks interval.
                      The LPO shall be raised with the name Masterpiece Energies Ltd (The Seller)
                      The Buyer shall provide a Bank Guarantee or a Post-Dated Cheque equivalent to the value of the Purchase Order.
                      Payment shall be made via e-payment to the Seller's designated account. The Seller reserves the right to suspend further deliveries if payments are outstanding beyond the due date.
                      Any disputes on invoices must be raised within 5 business days from the date of receipt.PRODUCT QUALITY & LIABILITYThe Seller guarantees that the AGO supplied meets the specifications listed in Clause 3. In case of any quality dispute, a sample shall be analyzed by a mutually agreed independent laboratory at the instance and cost to the Buyer. If the product is found to be non-compliant, the seller shall replace the defective product.
                      8. FORCE MAJEURENeither Party shall be held liable for failure to perform obligations due to circumstances beyond their reasonable control, including but not limited to:Government regulations or restrictionsNatural disasters, wars, or acts of terrorismStrikes, protests, or industrial actionShortage of raw materials or fuel supply interruptions
                    </p>
                  </div>

                  {/* Actions (Callout 8, 9) */}
                  <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                    <button
                      onClick={() => {
                        setScreen('EXAM');
                        startTimer(timeLeft);
                      }}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '16px 36px',
                        fontSize: '18px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      START EXAM
                    </button>

                    <button
                      onClick={() => {
                        setScreen('DASHBOARD');
                      }}
                      style={{
                        backgroundColor: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '16px 36px',
                        fontSize: '18px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(249, 115, 22, 0.2)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>

                {/* Right Panel - Sidebar (Callout 7) */}
                <div style={{
                  width: '320px',
                  backgroundColor: '#93c5fd',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  overflowY: 'auto',
                  borderLeft: '1px solid #60a5fa'
                }}>
                  {/* Clickable customized QR Code (Callout 4) */}
                  <a
                    href={`https://filloptech.com/profile/${activation?.passcode || '015209'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Click to view candidate result analysis"
                    style={{
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textDecoration: 'none',
                      border: '2px solid transparent',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://filloptech.com/profile/${activation?.passcode || '015209'}`)}`}
                      style={{ width: '130px', height: '130px', display: 'block' }}
                      alt="QR Code"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.qr-fallback') as HTMLElement;
                          if (fallback) fallback.removeAttribute('hidden');
                        }
                      }}
                    />
                    {/* SVG QR Placeholder Fallback */}
                    <div className="qr-fallback" hidden style={{ width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', position: 'relative' }}>
                      <span style={{ fontSize: '36px' }}>📱</span>
                      <span style={{ fontSize: '10px', position: 'absolute', bottom: '10px', fontWeight: 700, color: '#475569' }}>FILLOP PROFILE</span>
                    </div>
                    <span style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '14px', marginTop: '8px' }}>Your Details...</span>
                  </a>

                  {/* Candidate Photo */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}>
                    <img
                      src={activation?.profile_picture || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"}
                      style={{
                        width: '120px',
                        height: '140px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '3px solid #1e3a8a'
                      }}
                      alt="Candidate Portrait"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231e3a8a'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
                      }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                        {activation?.user_name || "Daniel Ezekiel Sunday"}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                        Passcode:
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '1px' }}>
                        {activation?.passcode || "015209"}
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Usage pink panel (Callout 6) */}
                  <div style={{
                    backgroundColor: '#ffe4e6',
                    border: '1px solid #fecdd3',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#881337',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                  }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #fecdd3', paddingBottom: '6px' }}>
                      Keyboard Usage
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>A, B, C, D</span>
                        <span style={{ fontWeight: 500 }}>Select option A, B, C, D</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>N</span>
                        <span style={{ fontWeight: 500 }}>Next/Forward</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>P</span>
                        <span style={{ fontWeight: 500 }}>Previous/Back</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>⬆️ / ⬇️</span>
                        <span style={{ fontWeight: 500 }}>Cycle choices</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>S</span>
                        <span style={{ fontWeight: 500 }}>Submit/End Exam</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Y</span>
                        <span style={{ fontWeight: 500 }}>Confirm/End Exam</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= EXAM SCREEN ================= */}
          {screen === 'EXAM' && examQuestions.length > 0 && (
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              {/* Subject Navigation Tabs & Calculator Trigger */}
              <div style={{
                backgroundColor: colors.surface,
                padding: '16px 24px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {/* Callout 1: Active Subject Navigation tabs */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {examSubjects.map((sub) => {
                    const isActive = sub.id === examQuestions[currentIdx]?.subject_id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          const targetIdx = examQuestions.findIndex(q => q.subject_id === sub.id);
                          if (targetIdx !== -1) {
                            setCurrentIdx(targetIdx);
                          }
                        }}
                        style={{
                          backgroundColor: isActive ? '#1d4ed8' : colors.bg,
                          color: isActive ? 'white' : colors.text,
                          fontWeight: 700,
                          fontSize: '13px',
                          padding: '10px 18px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          border: `1px solid ${isActive ? '#1e40af' : colors.border}`,
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 2px 4px rgba(29, 78, 216, 0.2)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Callout 2: Calculator Trigger */}
                  <button
                    onClick={() => setIsCalcOpen(!isCalcOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: colors.bg,
                      color: colors.text,
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>📟</span>
                    {isCalcOpen ? 'Hide Calculator' : 'Use Calculator'}
                  </button>

                  <div style={styles.timerPanel}>
                    {formatTimer(timeLeft)}
                  </div>
                </div>
              </div>

              <div style={styles.examHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{examType} Exam Room</h2>
                    {isPracticeMode && (
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444', backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', padding: '4px 12px', borderRadius: '6px', border: '2px solid #ef4444', letterSpacing: '1px' }}>
                        🔴 PRACTICE MODE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '4px' }}>
                    Session: <strong style={{ color: colors.text }}>{examSessionId}</strong>
                  </p>
                </div>
              </div>

              {fallbackNotice && (
                <div style={styles.fallbackBanner}>
                  {fallbackNotice}
                </div>
              )}

              {getPacingFeedback() && (
                <div style={getPacingFeedback()?.class === 'behind' ? styles.pacingBehind : styles.pacingOnTrack}>
                  {getPacingFeedback()?.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '24px' }}>
                {/* Question Card */}
                <div style={styles.questionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                    <span style={{ padding: '6px 14px', backgroundColor: colors.primaryLight, color: colors.primary, borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                      Question {currentIdx + 1} of {examQuestions.length}
                    </span>
                    <span style={{ padding: '6px 14px', backgroundColor: colors.bg, color: colors.textSecondary, borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: `1px solid ${colors.border}` }}>
                      {examType} Year {examQuestions[currentIdx].year}
                    </span>
                  </div>

                  <p style={{ fontSize: '17px', lineHeight: 1.7, marginBottom: '28px', fontWeight: 500 }}>
                    {examQuestions[currentIdx].question_text}
                  </p>

                  <div>
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
                          style={{
                            ...styles.optionItem,
                            ...(isSelected ? styles.optionItemSelected : {})
                          }}
                          onClick={() => selectAnswer(opt.key as any)}
                        >
                          <div style={{ ...styles.optionMarker, ...(isSelected ? { backgroundColor: colors.primary, color: '#fff' } : {}) }}>{opt.key}</div>
                          <div>{opt.text}</div>
                        </div>
                      );
                    })}
                  </div>

                  {isPracticeMode && (
                    <div style={{ marginTop: '24px', borderTop: `1px solid ${colors.border}`, paddingTop: '20px' }}>
                      <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setRevealExplanation(!revealExplanation)}>
                        {revealExplanation ? 'Hide Explanation' : 'Reveal Practice Explanation'}
                      </button>

                      {revealExplanation && (
                        <div style={styles.explanationBox}>
                          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: '8px' }}>Topic Overview ({examQuestions[currentIdx].topic_explanation || 'General'}):</div>
                          <p style={{ marginBottom: '12px' }}>{examQuestions[currentIdx].topic_explanation}</p>

                          <div style={{ fontWeight: 700, color: colors.success, marginBottom: '8px' }}>Correct Choice Breakdown:</div>
                          <p style={{ marginBottom: '12px' }}>{examQuestions[currentIdx].correct_explanation}</p>

                          <div style={{ fontWeight: 700, color: colors.danger, marginBottom: '8px' }}>Incorrect Alternatives:</div>
                          <p>{examQuestions[currentIdx].wrong_explanations || 'No incorrect details set.'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '12px' }}>
                    <button style={{ ...styles.btn, ...styles.btnSecondary }} disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)}>
                      Previous
                    </button>

                    <button style={{ ...styles.btn, ...(flagged[examQuestions[currentIdx].id] ? styles.btnDanger : styles.btnSecondary) }} onClick={toggleFlag}>
                      {flagged[examQuestions[currentIdx].id] ? 'Unflag Question' : 'Flag for Review'}
                    </button>

                    {currentIdx < examQuestions.length - 1 ? (
                      <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setCurrentIdx(prev => prev + 1)}>
                        Next Question
                      </button>
                    ) : (
                      <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={manualSubmitExam}>
                        Complete Exam
                      </button>
                    )}
                  </div>
                </div>

                {/* Palette Panel */}
                <div style={styles.paletteCard}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Navigation</h3>
                  <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '16px' }}>Quick jump to any question</p>

                  <div style={styles.paletteGrid}>
                    {examQuestions.map((q, idx) => {
                      const isCurrent = idx === currentIdx;
                      const isAnswered = !!answers[q.id];
                      const isFlagged = flagged[q.id];

                      let btnStyle: React.CSSProperties = { ...styles.paletteBtn };
                      if (isCurrent) btnStyle = { ...btnStyle, ...styles.paletteBtnActive };
                      else if (isFlagged) btnStyle = { ...btnStyle, ...styles.paletteBtnFlagged };
                      else if (isAnswered) btnStyle = { ...btnStyle, ...styles.paletteBtnAnswered };

                      return (
                        <button key={q.id} style={btnStyle} onClick={() => setCurrentIdx(idx)}>
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, backgroundColor: colors.border }}></span> Unanswered
                    </div>
                    <div style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, backgroundColor: colors.success }}></span> Answered
                    </div>
                    <div style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, backgroundColor: colors.danger }}></span> Flagged
                    </div>
                    <div style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, backgroundColor: colors.primary }}></span> Active
                    </div>
                  </div>

                  <button style={{ ...styles.btn, ...styles.btnDanger, width: '100%', marginTop: '24px' }} onClick={manualSubmitExam}>
                    Submit Test Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= RESULT SCREEN ================= */}
          {screen === 'RESULT' && activeResult && (
            <div style={{ maxWidth: '560px', margin: '40px auto' }}>
              <div style={styles.card}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: activeResult.percentage >= 50 ? colors.success : colors.warning, marginBottom: '8px' }}>
                    {activeResult.percentage >= 50 ? 'Congratulations!' : 'Exam Attempt Completed'}
                  </h1>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Your score has been cataloged offline.</p>
                </div>

                <div style={{
                  ...styles.resultCircle,
                  ...(activeResult.percentage >= 50 ? styles.resultCirclePassed : styles.resultCircleFailed)
                }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: colors.text }}>{activeResult.percentage.toFixed(0)}%</span>
                  <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>Score</span>
                </div>

                <div style={styles.grid2}>
                  <div style={{ ...styles.statCard, padding: '20px' }}>
                    <div style={{ ...styles.statValue, fontSize: '24px', color: colors.primary }}>{activeResult.score} / {activeResult.total_questions}</div>
                    <div style={styles.statLabel}>Correct Answers</div>
                  </div>
                  <div style={{ ...styles.statCard, padding: '20px' }}>
                    <div style={{ ...styles.statValue, fontSize: '24px', color: activeResult.synced ? colors.success : colors.warning }}>
                      {activeResult.synced ? 'Synced' : 'Pending'}
                    </div>
                    <div style={styles.statLabel}>Cloud Backup</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
                  <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setScreen('REVIEW')}>
                    Review Answers
                  </button>
                  <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setScreen('DASHBOARD')}>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= REVIEW SCREEN ================= */}
          {screen === 'REVIEW' && activeResult && (
            <div style={{ maxWidth: '840px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Question-by-Question Review</h1>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>Review incorrect selections and read explanations.</p>
                </div>
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setScreen('DASHBOARD')}>Return to Dashboard</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {JSON.parse(activeResult.details || '[]').map((item: any, idx: number) => {
                  return (
                    <div key={idx} style={{ ...styles.reviewCard, borderLeftColor: item.is_correct ? colors.success : colors.danger }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <strong style={{ fontSize: '15px', color: colors.primary }}>Question {idx + 1}</strong>
                        <span style={{ ...styles.badge, ...(item.is_correct ? styles.badgeSuccess : styles.badgeDanger) }}>
                          {item.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      <p style={{ fontSize: '15px', marginBottom: '16px', lineHeight: 1.6, fontWeight: 500 }}>{item.question_text}</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {[
                          { key: 'A', text: item.option_a },
                          { key: 'B', text: item.option_b },
                          { key: 'C', text: item.option_c },
                          { key: 'D', text: item.option_d },
                        ].map(opt => {
                          let rowStyle: React.CSSProperties = {
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                            fontSize: '14px'
                          };

                          if (opt.key === item.correct_answer) {
                            rowStyle.backgroundColor = colors.successLight;
                            rowStyle.borderColor = colors.success;
                          } else if (opt.key === item.user_answer) {
                            rowStyle.backgroundColor = colors.dangerLight;
                            rowStyle.borderColor = colors.danger;
                          }

                          return (
                            <div key={opt.key} style={rowStyle}>
                              <strong style={{ marginRight: '12px', color: colors.textMuted, width: '20px' }}>{opt.key}.</strong>
                              <span>{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ backgroundColor: colors.bg, padding: '16px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700, color: colors.primary, marginBottom: '6px' }}>Topic: {item.topic_explanation || 'General Syllabus'}</div>
                        <div style={{ fontWeight: 700, color: colors.success, marginBottom: '6px' }}>Correct Answer Explanation:</div>
                        <p style={{ marginBottom: '10px' }}>{item.correct_explanation}</p>
                        {item.wrong_explanations && (
                          <>
                            <div style={{ fontWeight: 700, color: colors.danger, marginBottom: '6px' }}>Incorrect Answer Breakdown:</div>
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

      {/* ================= LEADERBOARD MODAL ================= */}
      {showLeaderboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '640px',
            padding: '32px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: colors.text }}>
                   CBT Weekly Leaderboard
                </h2>
                <p style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '4px' }}>
                  Top performing students on the Fillop CBT network ({leaderboardTimeframe})
                </p>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                ×
              </button>
            </div>

            {leaderboardLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: colors.textSecondary }}>
                Loading top performers...
              </div>
            ) : (
              <div>
                {/* #1 Top Performer Spotlight Card */}
                {leaderboardData.length > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(29, 48, 144, 0.1))',
                    border: `2px solid ${colors.warning}`,
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>👑</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: colors.warning, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
                      Best Performer of the Week
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: colors.text, marginBottom: '6px' }}>
                      {leaderboardData[0].email}
                    </div>
                    <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                      Stats: <strong style={{ color: colors.success }}>{Number(leaderboardData[0].average_percentage).toFixed(1)}% Avg</strong> • {leaderboardData[0].total_correct} Correct across {leaderboardData[0].total_exams} Exams ({leaderboardData[0].exam_type})
                    </div>
                  </div>
                )}

                {/* Leaderboard List Table */}
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {leaderboardData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: colors.textMuted, padding: '20px 0' }}>No synchronized weekly results found.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${colors.border}`, paddingBottom: '8px' }}>
                          <th style={{ padding: '10px 8px', fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase' }}>Rank</th>
                          <th style={{ padding: '10px 8px', fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase' }}>Candidate</th>
                          <th style={{ padding: '10px 8px', fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase' }}>Exam</th>
                          <th style={{ padding: '10px 8px', fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>Avg Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.map((item, idx) => {
                          const isTop = idx === 0;
                          return (
                            <tr
                              key={item.email}
                              style={{
                                borderBottom: `1px solid ${colors.border}`,
                                backgroundColor: isTop ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                              }}
                            >
                              <td style={{ padding: '12px 8px', fontWeight: 700, fontSize: '15px' }}>
                                {idx === 0 && '🥇'}
                                {idx === 1 && '🥈'}
                                {idx === 2 && '🥉'}
                                {idx > 2 && `${idx + 1}`}
                              </td>
                              <td style={{ padding: '12px 8px', fontWeight: isTop ? 700 : 500, fontSize: '13px', color: colors.text }}>
                                {item.email}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: '12px', color: colors.textSecondary }}>
                                <span style={{ padding: '2px 8px', backgroundColor: colors.primaryLight, borderRadius: '4px', fontWeight: 600, color: colors.primary }}>
                                  {item.exam_type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 8px', fontWeight: 700, fontSize: '14px', color: colors.success, textAlign: 'right' }}>
                                {Number(item.average_percentage).toFixed(0)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={() => setShowLeaderboard(false)}
                  >
                    Got it!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= DRAGGABLE SCIENTIFIC CALCULATOR ================= */}
      {isCalcOpen && (
        <div style={{
          position: 'fixed',
          left: `${calcPos.x}px`,
          top: `${calcPos.y}px`,
          width: '320px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 99999,
          border: '2px solid #475569',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {/* Header */}
          <div
            onMouseDown={(e) => {
              setDragStart({
                x: e.clientX - calcPos.x,
                y: e.clientY - calcPos.y
              });
            }}
            style={{
              padding: '12px 16px',
              backgroundColor: '#0f172a',
              color: 'white',
              cursor: 'move',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '14px',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📟</span>
              <span>CBT Scientific Calculator</span>
            </div>
            <button
              onClick={() => setIsCalcOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>

          {/* Screen / Display */}
          <div style={{
            padding: '16px',
            backgroundColor: '#020617',
            textAlign: 'right',
            color: '#10b981',
            fontSize: '24px',
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '1px',
            minHeight: '70px',
            wordBreak: 'break-all',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
          }}>
            {calcDisplay || '0'}
          </div>

          {/* Keypad Grid */}
          <div style={{
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            backgroundColor: '#1e293b'
          }}>
            {/* Scientific keys */}
            {[
              { label: 'sin', action: () => setCalcDisplay(prev => prev + 'sin(') },
              { label: 'cos', action: () => setCalcDisplay(prev => prev + 'cos(') },
              { label: 'tan', action: () => setCalcDisplay(prev => prev + 'tan(') },
              { label: 'log', action: () => setCalcDisplay(prev => prev + 'log(') },
              { label: 'ln', action: () => setCalcDisplay(prev => prev + 'ln(') },

              { label: '√', action: () => setCalcDisplay(prev => prev + 'sqrt(') },
              { label: '^', action: () => setCalcDisplay(prev => prev + '^') },
              { label: '(', action: () => setCalcDisplay(prev => prev + '(') },
              { label: ')', action: () => setCalcDisplay(prev => prev + ')') },
              { label: 'Del', action: () => setCalcDisplay(prev => prev.slice(0, -1)), style: { backgroundColor: '#ef4444', color: 'white' } },

              // Numbers and Basic Operators
              { label: '7', action: () => setCalcDisplay(prev => prev + '7') },
              { label: '8', action: () => setCalcDisplay(prev => prev + '8') },
              { label: '9', action: () => setCalcDisplay(prev => prev + '9') },
              { label: '/', action: () => setCalcDisplay(prev => prev + '/') },
              { label: 'C', action: () => setCalcDisplay(''), style: { backgroundColor: '#dc2626', color: 'white' } },

              { label: '4', action: () => setCalcDisplay(prev => prev + '4') },
              { label: '5', action: () => setCalcDisplay(prev => prev + '5') },
              { label: '6', action: () => setCalcDisplay(prev => prev + '6') },
              { label: '*', action: () => setCalcDisplay(prev => prev + '*') },
              { label: ' ', action: () => {}, style: { opacity: 0, cursor: 'default' } }, // Blank placeholder

              { label: '1', action: () => setCalcDisplay(prev => prev + '1') },
              { label: '2', action: () => setCalcDisplay(prev => prev + '2') },
              { label: '3', action: () => setCalcDisplay(prev => prev + '3') },
              { label: '-', action: () => setCalcDisplay(prev => prev + '-') },
              { label: ' ', action: () => {}, style: { opacity: 0, cursor: 'default' } }, // Blank placeholder

              { label: '0', action: () => setCalcDisplay(prev => prev + '0') },
              { label: '.', action: () => setCalcDisplay(prev => prev + '.') },
              { label: '+', action: () => setCalcDisplay(prev => prev + '+') },
              { label: '=', action: () => {
                  try {
                    // Replace visual tokens with JS Math counterparts
                    let processed = calcDisplay
                      .replace(/sin\(/g, 'Math.sin(')
                      .replace(/cos\(/g, 'Math.cos(')
                      .replace(/tan\(/g, 'Math.tan(')
                      .replace(/log\(/g, 'Math.log10(')
                      .replace(/ln\(/g, 'Math.log(')
                      .replace(/sqrt\(/g, 'Math.sqrt(')
                      .replace(/\^/g, '**');

                    const result = new Function(`return (${processed})`)();
                    if (result === undefined || isNaN(result)) {
                      setCalcDisplay('Error');
                    } else {
                      setCalcDisplay(Number(result.toFixed(6)).toString());
                    }
                  } catch (err) {
                    setCalcDisplay('Error');
                  }
                }, style: { gridColumn: 'span 2', backgroundColor: '#f97316', color: 'white' } }
            ].map((btn, index) => (
              <button
                key={index}
                onClick={btn.action}
                style={{
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: btn.style?.opacity === 0 ? 'default' : 'pointer',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  transition: 'background-color 0.1s',
                  userSelect: 'none',
                  ...btn.style
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= SUBMIT CONFIRMATION OVERLAY ================= */}
      {showSubmitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '32px',
            border: `2px solid ${colors.border}`,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.text, marginBottom: '12px' }}>
              Submit Examination?
            </h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to complete and submit your exam results now?
              <br />
              <strong style={{ color: colors.primary }}>Press "Y" or click Confirm below to submit.</strong>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  processSubmission();
                }}
                style={{ ...styles.btn, ...styles.btnSuccess }}
              >
                Confirm (Y)
              </button>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{ ...styles.btn, ...styles.btnSecondary }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
