import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic, Question, Result, SyncStatus } from './global';
import { Sun, Moon, Lock, ShoppingCart, Newspaper, Calculator, Clock, Key, Zap, Trophy } from 'lucide-react';

type Screen = 'ACTIVATION' | 'DASHBOARD' | 'INSTRUCTIONS' | 'EXAM' | 'RESULT' | 'REVIEW' | 'NEWS_DETAIL';

interface ActiveActivation {
  email: string;
  passcode: string;
  user_name?: string;
  profile_picture?: string;
  activated_at?: string;
  expiry_date?: string;
  exam_category?: string;
  allowed_subjects?: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('ACTIVATION');
  const [activation, setActivation] = useState<ActiveActivation | null>(null);
  const [isFreeMode, setIsFreeMode] = useState<boolean>(false);

  // Upgrade / Buy Passcode Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState<string>('');

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
  const [dashboardMode, setDashboardMode] = useState<'PRACTICE' | 'MOCK' | 'DAILY_QUIZ' | 'ANALYTICS'>('PRACTICE');

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          setScreen('EXAM');
          startTimer(timeLeft);
        } else if (key === 'P' || e.key === 'Escape') {
          setScreen('DASHBOARD');
        }
        return;
      }

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
        if (currentIdx < examQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1);
        }
      } else if (key === 'P') {
        if (currentIdx > 0) {
          setCurrentIdx(prev => prev - 1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentAns = answers[currentQuestion.id];
        if (!currentAns) selectAnswer('D');
        else if (currentAns === 'D') selectAnswer('C');
        else if (currentAns === 'C') selectAnswer('B');
        else if (currentAns === 'B') selectAnswer('A');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentAns = answers[currentQuestion.id];
        if (!currentAns) selectAnswer('A');
        else if (currentAns === 'A') selectAnswer('B');
        else if (currentAns === 'B') selectAnswer('C');
        else if (currentAns === 'C') selectAnswer('D');
      } else if (key === 'S') {
        setShowSubmitConfirm(true);
      } else if (key === 'Y') {
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

  useEffect(() => {
    if (screen === 'DASHBOARD') {
      loadSyllabusData();
      loadResultsHistory();
      loadNewsList();
    }
  }, [screen, examType, activation]);

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
          expiry_date: act.expiry_date,
          exam_category: act.exam_category,
          allowed_subjects: act.allowed_subjects
        });
        setIsFreeMode(false);
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
      const activeUser = activation?.email || 'Candidate (Free)';
      const hist = await window.api.getResults(activeUser);
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

  const triggerBuyPasscodeOnline = () => {
    window.open("http://localhost:80/fillop/api/v1/sync/subscribe.php", "_blank");
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActError('');

    if (!actEmail.trim()) {
      setActError('Please enter your email address.');
      return;
    }

    if (!actPasscode.trim()) {
      // Free Version Flow
      setIsFreeMode(true);
      setActivation(null);
      setScreen('DASHBOARD');
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
          expiry_date: res.expiry_date,
          exam_category: res.exam_category,
          allowed_subjects: res.allowed_subjects
        });
        setIsFreeMode(false);
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

  const handleProceedFreeMode = () => {
    setIsFreeMode(true);
    setActivation(null);
    setScreen('DASHBOARD');
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out from this device terminal?')) return;
    if (window.api && window.api.logoutApp) {
      await window.api.logoutApp();
      setActivation(null);
      setIsFreeMode(false);
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

  const startPracticeSession = async () => {
    if (!practiceSubject) {
      alert('Please select a subject to study.');
      return;
    }

    const subObj = subjectsList.find(s => s.id === Number(practiceSubject));
    if (subObj && (subObj as any).is_locked) {
      setUpgradeModalMessage(`Access to ${subObj.name} is restricted under your current activation settings. Upgrade or subscribe online to unlock this subject.`);
      setShowUpgradeModal(true);
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

      setExamSubjects(subObj ? [subObj] : []);
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
    // Check if any selected subject is locked
    const lockedSub = subjectsList.find(s => mockSelectedSubjects.includes(s.id) && (s as any).is_locked);
    if (lockedSub) {
      setUpgradeModalMessage(`Subject ${lockedSub.name} is restricted under your subscription settings. Please subscribe or buy a passcode to access all subjects.`);
      setShowUpgradeModal(true);
      return;
    }

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
        alert('No questions found for selection.');
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

      const totalSecs = 120 * 60;
      setTimeLeft(totalSecs);
      setScreen('INSTRUCTIONS');
    } catch (e) {
      console.error(e);
    }
  };

  const startDailyQuizSession = async () => {
    if (isFreeMode) {
      setUpgradeModalMessage("Daily Quiz mode is only available for activated accounts. Please activate or subscribe to access daily speed quizzes.");
      setShowUpgradeModal(true);
      return;
    }

    try {
      setFallbackNotice('');
      setIsPracticeMode(false);
      setRevealExplanation(false);
      setAnswers({});
      setFlagged({});

      const examCategories: ('JAMB' | 'WAEC' | 'NECO')[] = ['JAMB', 'WAEC', 'NECO'];
      const targetCategory = examCategories[Math.floor(Math.random() * examCategories.length)];
      setExamType(targetCategory);

      const subs = await window.api.getSubjects(targetCategory);
      const unlockedSubs = Array.isArray(subs) ? subs.filter((s: any) => !s.is_locked) : [];

      if (unlockedSubs.length === 0) {
        alert('No available subjects found for Daily Quiz.');
        return;
      }

      const randomSub = unlockedSubs[Math.floor(Math.random() * unlockedSubs.length)];
      const count = Math.floor(Math.random() * 6) + 10; // 10 to 15 questions

      const qList = await window.api.generatePracticeQuestions({
        examType: targetCategory,
        subjectId: randomSub.id,
        limit: count,
      });

      if (!qList || qList.length === 0) {
        alert('No questions found for the Daily Quiz subject.');
        return;
      }

      setExamSubjects([randomSub]);
      const sessId = `session-quiz-${Date.now()}`;
      setExamSessionId(sessId);
      setExamQuestions(qList);
      setCurrentIdx(0);

      // 6 minutes = 360 seconds
      const totalSecs = 6 * 60;
      setTimeLeft(totalSecs);
      setScreen('INSTRUCTIONS');
    } catch (e) {
      console.error("Failed to start Daily Quiz:", e);
    }
  };

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

  const autoSubmitExam = async () => {
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
        difficulty: q.difficulty,
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
        userName: activation?.email || 'Candidate (Free)',
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

  const sidebarNavItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: 'D' },
    { id: 'ANALYTICS', label: 'Analytics', icon: 'A' },
  ];

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
      if (isFreeMode) {
        setUpgradeModalMessage("Analytics performance reports are restricted in Free Mode. Please subscribe or buy a passcode to unlock full analytics.");
        setShowUpgradeModal(true);
        return;
      }
      setDashboardMode('ANALYTICS');
      setScreen('DASHBOARD');
    }
  };

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      {screen !== 'ACTIVATION' && (
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
              onClick={triggerBuyPasscodeOnline}
            >
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                <ShoppingCart size={16} color="#fff" />
              </span>
              Buy Passcode Online
            </button>
          </nav>

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
              {isFreeMode ? 'Free Trial Version' : `Activated: ${activation?.activated_at ? new Date(activation.activated_at).toLocaleDateString() : 'Active'}`}
            </div>
            <div>Offline Terminal v3.0</div>
          </div>
        </aside>
      )}

      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>
              {screen === 'ACTIVATION' && 'Terminal Activation & Login'}
              {screen === 'DASHBOARD' && (isFreeMode ? 'Exam Dashboard (Free Mode)' : 'Exam Dashboard')}
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
            {isFreeMode && (
              <button
                style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSm }}
                onClick={() => setScreen('ACTIVATION')}
              >
                <Key size={14} /> Activate Passcode
              </button>
            )}

            {activation && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '20px',
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                border: '1px solid #f59e0b',
                color: isDarkMode ? '#fbbf24' : '#b45309',
                fontSize: '11px',
                fontWeight: 700
              }}>
                <span>
                  {(() => {
                    if (!activation.expiry_date) return 'Activated';
                    try {
                      const d = new Date(activation.expiry_date);
                      if (isNaN(d.getTime())) return 'Activated';
                      return `Expires: ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    } catch (e) {
                      return 'Activated';
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

            {screen === 'DASHBOARD' && (
              <button style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm }} onClick={handleLogout}>
                {isFreeMode ? 'Change Login' : 'Log Out'}
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
            <div style={{ maxWidth: '460px', margin: '60px auto' }}>
              <div style={styles.card}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <img src="/icon.png" style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px', display: 'block', border: `3px solid ${colors.primary}` }} alt="App Icon" />
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: colors.text, marginBottom: '8px' }}>Candidate Sign In</h1>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                    Enter your email and passcode to activate full access, or proceed directly to the Free Version.
                  </p>
                </div>

                <form onSubmit={handleActivateSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email Address</label>
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
                    <label style={styles.label}>Passcode (Leave blank for Free Version)</label>
                    <input
                      type="text"
                      style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: '0.08em' }}
                      placeholder="GP-XXXX-XXXX"
                      value={actPasscode}
                      onChange={(e) => setActPasscode(e.target.value)}
                    />
                  </div>

                  {actError && (
                    <div style={{ color: colors.danger, fontWeight: 600, fontSize: '13px', marginBottom: '16px', backgroundColor: colors.dangerLight, padding: '12px', borderRadius: '8px' }}>
                      {actError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      type="submit"
                      style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', justifyContent: 'center', padding: '14px' }}
                      disabled={actLoading}
                    >
                      {actLoading ? 'Authenticating...' : (actPasscode.trim() ? 'Activate Device Terminal' : 'Login / Activate')}
                    </button>

                    <button
                      type="button"
                      style={{ ...styles.btn, ...styles.btnSecondary, width: '100%', justifyContent: 'center', padding: '12px' }}
                      onClick={handleProceedFreeMode}
                    >
                      Proceed with Free Version (Max 10 Qs / Math &amp; English)
                    </button>
                  </div>
                </form>

                <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '24px', paddingTop: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '8px' }}>
                    Don't have a passcode yet?
                  </p>
                  <button
                    onClick={triggerBuyPasscodeOnline}
                    style={{ ...styles.btn, backgroundColor: colors.warning, color: '#fff', border: 'none', fontWeight: 700, padding: '8px 16px' }}
                  >
                    <ShoppingCart size={16} /> Buy Passcode &amp; Select Subjects Online
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= NEWS DETAIL SCREEN ================= */}
          {screen === 'NEWS_DETAIL' && selectedNews && (
            <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
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
                <header style={{ marginBottom: '32px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary, fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    <span>Official Announcement</span>
                  </div>

                  <h1 style={{ fontSize: '36px', fontWeight: 800, color: colors.text, lineHeight: 1.2, marginBottom: '20px' }}>
                    {selectedNews.title}
                  </h1>
                </header>

                <section style={{ fontSize: '18px', lineHeight: 1.8, color: colors.text, whiteSpace: 'pre-line' }}>
                  {selectedNews.content}
                </section>
              </article>
            </div>
          )}

          {/* ================= DASHBOARD SCREEN ================= */}
          {screen === 'DASHBOARD' && (
            <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Free Version Callout Banner */}
                {isFreeMode && (
                  <div style={{
                    backgroundColor: colors.warningLight,
                    border: `1px solid ${colors.warning}`,
                    borderRadius: '16px',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#92400e'
                  }}>
                    <div>
                      <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={18} color="#d97706" /> Free Version Active
                      </strong>
                      <p style={{ fontSize: '13px', marginTop: '4px', margin: 0 }}>
                        Restricted to Mathematics and English (Max 10 questions per exam session). Analytics and other subjects require a passcode.
                      </p>
                    </div>
                    <button
                      onClick={triggerBuyPasscodeOnline}
                      style={{ ...styles.btn, backgroundColor: colors.warning, color: '#fff', border: 'none', fontWeight: 700, flexShrink: 0 }}
                    >
                      Buy Passcode Now <ShoppingCart size={16} />
                    </button>
                  </div>
                )}

                {/* Welcome Card */}
                <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>
                      {isFreeMode ? 'Welcome Candidate (Free Mode)' : 'Welcome, Candidate'}
                    </h2>
                    <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                      Profile: <strong style={{ color: colors.primary }}>{activation ? activation.email : 'Unactivated Free Account'}</strong>
                      {!isFreeMode && activation?.exam_category && (
                        <span> • Category: <strong style={{ color: colors.primary }}>{activation.exam_category}</strong></span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={handleOpenLeaderboard}
                      style={{ ...styles.btn, backgroundColor: colors.warning, color: '#fff', border: 'none', fontWeight: 700 }}
                    >
                      <Trophy size={16} /> Weekly Leaderboard
                    </button>
                  </div>
                </div>

                {/* Supported Examination Bodies Showcase */}
                <div style={{ ...styles.card, backgroundColor: isDarkMode ? 'rgba(29, 48, 144, 0.15)' : '#f0f4ff', borderColor: isDarkMode ? '#2d3e60' : '#c7d2fe', padding: '10px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    Supported Official Examination Bodies
                  </div>
                  <div style={styles.grid3}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.surface, padding: '8px 10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <img src="/jamb.webp" alt="JAMB Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      <div style={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>JAMB UTME</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.surface, padding: '8px 10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <img src="/waec.webp" alt="WAEC Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      <div style={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>WAEC SSCE</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.surface, padding: '8px 10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <img src="/NECO.jpg" alt="NECO Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      <div style={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>NECO SSCE</div>
                    </div>
                  </div>
                </div>

                {/* Mode Tabs + Content */}
                <div style={styles.card}>
                  <div style={styles.tabs}>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'PRACTICE' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('PRACTICE')}>Practice Mode</button>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'MOCK' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('MOCK')}>Mock Exam</button>
                    {!isFreeMode && (
                      <button style={{ ...styles.tab, ...(dashboardMode === 'DAILY_QUIZ' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('DAILY_QUIZ')}>Daily Quiz</button>
                    )}
                    <button
                      style={{ ...styles.tab, ...(dashboardMode === 'ANALYTICS' ? styles.tabActive : {}) }}
                      onClick={() => {
                        if (isFreeMode) {
                          setUpgradeModalMessage("Performance analytics are restricted in the Free Version. Upgrade or subscribe online to view detailed analytics.");
                          setShowUpgradeModal(true);
                          return;
                        }
                        setDashboardMode('ANALYTICS');
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        Performance {isFreeMode && <Lock size={14} color={colors.warning} />}
                      </span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                    <span style={{ ...styles.label, margin: 0 }}>Exam Category</span>
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
                          <select
                            style={styles.select}
                            value={practiceSubject}
                            onChange={(e) => {
                              const selectedId = Number(e.target.value);
                              const subObj = subjectsList.find(s => s.id === selectedId);
                              if (subObj && (subObj as any).is_locked) {
                                setUpgradeModalMessage(`Access to ${subObj.name} is restricted. Buy a passcode or upgrade your subscription online to unlock this subject.`);
                                setShowUpgradeModal(true);
                                setPracticeSubject('');
                                return;
                              }
                              setPracticeSubject(selectedId || '');
                            }}
                          >
                            <option value="">-- Choose Subject --</option>
                            {subjectsList.map(s => {
                              const isLocked = (s as any).is_locked;
                              return (
                                <option key={s.id} value={s.id}>
                                  {isLocked ? `[Locked] ${s.name} (Subscription Required)` : s.name}
                                </option>
                              );
                            })}
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
                          Enable Countdown Timer
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
                        {isFreeMode ? 'Free Version is restricted to 10 questions per subject in English & Mathematics.' : 'Select up to 4 subjects assigned to your passcode subscription.'}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Select Subjects (up to 4)</label>
                          <div style={styles.checkboxGrid}>
                            {subjectsList.map(s => {
                              const isChecked = mockSelectedSubjects.includes(s.id);
                              const isLocked = (s as any).is_locked;
                              return (
                                <label key={s.id} style={{ ...styles.checkboxLabel, opacity: isLocked ? 0.6 : 1 }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isLocked) {
                                        setUpgradeModalMessage(`Access to ${s.name} is restricted. Click Buy Now to select and pay for this subject.`);
                                        setShowUpgradeModal(true);
                                        return;
                                      }
                                      if (isChecked) {
                                        setMockSelectedSubjects(prev => prev.filter(id => id !== s.id));
                                      } else {
                                        setMockSelectedSubjects(prev => [...prev, s.id]);
                                      }
                                    }}
                                    style={{ width: '16px', height: '16px', accentColor: colors.primary }}
                                  />
                                  {isLocked ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Lock size={14} color={colors.warning} /> {s.name}
                                    </span>
                                  ) : (
                                    s.name
                                  )}
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

                  {/* --- Mode: DAILY_QUIZ --- */}
                  {dashboardMode === 'DAILY_QUIZ' && !isFreeMode && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: colors.text }}>
                          ⚡ 6-Minute Daily Speed Quiz
                        </h3>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: colors.primary, backgroundColor: colors.primaryLight, padding: '4px 12px', borderRadius: '20px' }}>
                          ACTIVATED EXCLUSIVE
                        </span>
                      </div>

                      <div style={{ backgroundColor: colors.bg, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
                        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                          Challenge yourself with a daily quick-fire quiz! The system automatically selects <strong>10 to 15 random questions</strong> from an examination category and subject assigned to your account.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ backgroundColor: colors.surface, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Time Limit</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: colors.primary, marginTop: '4px' }}>6 Minutes</div>
                          </div>
                          <div style={{ backgroundColor: colors.surface, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Question Count</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: colors.success, marginTop: '4px' }}>10 – 15 Questions</div>
                          </div>
                          <div style={{ backgroundColor: colors.surface, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Submission</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: colors.text, marginTop: '4px' }}>Auto-Submit on Time</div>
                          </div>
                        </div>

                        <button
                          style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnLg, width: '100%', justifyContent: 'center', fontWeight: 800, fontSize: '16px', padding: '16px' }}
                          onClick={startDailyQuizSession}
                        >
                          🚀 Launch 6-Min Daily Quiz
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- Mode: ANALYTICS --- */}
                  {dashboardMode === 'ANALYTICS' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Performance Analytics &amp; Mastery Breakdown</h3>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div style={styles.statCard}>
                          <div style={styles.statLabel}>Total Exams</div>
                          <div style={styles.statValue}>{historyResults.length}</div>
                        </div>
                        <div style={styles.statCard}>
                          <div style={styles.statLabel}>Cumulative Average</div>
                          <div style={{ ...styles.statValue, color: colors.success }}>
                            {historyResults.length > 0 ? (historyResults.reduce((acc, r) => acc + r.percentage, 0) / historyResults.length).toFixed(1) : '0'}%
                          </div>
                        </div>
                        <div style={styles.statCard}>
                          <div style={styles.statLabel}>Top Score</div>
                          <div style={{ ...styles.statValue, color: colors.primary }}>
                            {historyResults.length > 0 ? Math.max(...historyResults.map(r => r.percentage)).toFixed(0) : '0'}%
                          </div>
                        </div>
                      </div>

                      {/* Pie Chart & Performance Metrics */}
                      {(() => {
                        let totalCorrect = 0;
                        let totalQuestions = 0;

                        historyResults.forEach(r => {
                          totalCorrect += (r.score || 0);
                          totalQuestions += (r.total_questions || 0);
                        });

                        const totalIncorrect = Math.max(0, totalQuestions - totalCorrect);
                        const correctPct = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 75; // Default demo split if empty

                        // SVG Pie Chart calculations (Radius: 80, Center: 100, 100)
                        const r = 80;
                        const cx = 100;
                        const cy = 100;
                        const angle = (correctPct / 100) * 360;
                        const radians = (angle - 90) * (Math.PI / 180);
                        const x = cx + r * Math.cos(radians);
                        const y = cy + r * Math.sin(radians);
                        const largeArcFlag = angle > 180 ? 1 : 0;

                        // Slice path for Correct
                        const pathData = totalQuestions === 0 || correctPct === 100
                          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                          : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArcFlag} 1 ${x} ${y} Z`;

                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', backgroundColor: colors.bg, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}`, marginBottom: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="200" height="200" viewBox="0 0 200 200">
                                {/* Base circle for incorrect/unanswered */}
                                <circle cx={cx} cy={cy} r={r} fill={colors.danger} />
                                {/* Overlay sector for correct */}
                                <path d={pathData} fill={colors.success} />
                                {/* Center donut circle */}
                                <circle cx={cx} cy={cy} r="45" fill={colors.surface} />
                                <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" fill={colors.text} fontSize="18" fontWeight="800">
                                  {totalQuestions > 0 ? `${correctPct.toFixed(0)}%` : 'Accuracy'}
                                </text>
                                <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" fill={colors.textMuted} fontSize="10" fontWeight="700">
                                  Correct Rate
                                </text>
                              </svg>

                              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', fontWeight: 700, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors.success }}></span>
                                  Correct ({totalQuestions > 0 ? totalCorrect : '75%'})
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors.danger }}></span>
                                  Incorrect ({totalQuestions > 0 ? totalIncorrect : '25%'})
                                </div>
                              </div>
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px', color: colors.text }}>
                                Exam Attempt History &amp; Right / Wrong Breakdown
                              </h4>
                              <div style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {historyResults.length === 0 ? (
                                  <p style={{ color: colors.textMuted, fontSize: '13px' }}>
                                    No completed exam records found. Take an exam or practice test to view detailed question history!
                                  </p>
                                ) : (
                                  historyResults.map((r, i) => (
                                    <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backgroundColor: colors.surface, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                                      <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: colors.text }}>
                                          {r.exam_type || examType} Test ({r.score} / {r.total_questions} Correct)
                                        </div>
                                        <div style={{ fontSize: '11px', color: colors.textMuted }}>
                                          Submitted: {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'Recently'}
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontWeight: 800, fontSize: '16px', color: r.percentage >= 50 ? colors.success : colors.danger }}>
                                          {r.percentage.toFixed(0)}%
                                        </span>
                                        <button
                                          style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm, fontSize: '12px', fontWeight: 700 }}
                                          onClick={() => {
                                            setActiveResult(r);
                                            setScreen('REVIEW');
                                          }}
                                        >
                                          Inspect Answers
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: News & Sync */}
              <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                            borderBottom: `1px solid ${colors.border}`
                          }}
                        >
                          <div style={{ flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                            <Newspaper size={20} color={colors.primary} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text, marginBottom: '2px' }}>{item.title}</div>
                            <div style={{ fontSize: '11px', color: colors.textSecondary }}>{item.content}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={styles.card}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: '16px', letterSpacing: '0.5px' }}>Sync Log</h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {syncStatus.logs.length === 0 ? (
                      <p style={{ color: colors.textMuted, fontSize: '13px' }}>No synchronization entries.</p>
                    ) : (
                      syncStatus.logs.map((log) => (
                        <div style={styles.logItem} key={log.id}>
                          <div style={styles.logMeta}>
                            <span style={styles.logEvent}>{log.event_type}</span>
                            <span style={{ ...styles.logStatus, backgroundColor: log.status === 'SUCCESS' ? colors.successLight : colors.dangerLight }}>{log.status}</span>
                          </div>
                          <div style={styles.logText}>{log.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= INSTRUCTIONS SCREEN ================= */}
          {screen === 'INSTRUCTIONS' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#d0e5f9', margin: '-32px', padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '60px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {examSubjects.map((sub) => (
                    <div key={sub.id} style={{ backgroundColor: '#1d4ed8', color: 'white', fontWeight: 700, fontSize: '14px', padding: '8px 16px', borderRadius: '4px' }}>
                      {sub.name}
                    </div>
                  ))}
                </div>

                <div onClick={() => setIsCalcOpen(!isCalcOpen)} style={{ cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calculator size={16} /> Calculator
                </div>

                <div style={{ backgroundColor: 'white', padding: '6px 14px', borderRadius: '20px', color: '#1e40af', fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={18} /> {(timeLeft / 60).toFixed(2)} min
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '40px', backgroundColor: 'white', overflowY: 'auto' }}>
                  <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1e3a8a', marginBottom: '24px' }}>Examination Instructions</h1>
                  <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8' }}>
                    1. Read each question carefully before selecting an answer.<br/>
                    2. Use key A, B, C, D to pick options, N for Next, P for Previous, S to Submit.<br/>
                    3. Ensure you complete all questions before the timer expires.
                  </p>

                  <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                    <button onClick={() => { setScreen('EXAM'); startTimer(timeLeft); }} style={{ backgroundColor: '#ef4444', color: 'white', padding: '16px 36px', fontSize: '18px', fontWeight: 800, borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                      START EXAM
                    </button>
                    <button onClick={() => setScreen('DASHBOARD')} style={{ backgroundColor: '#f97316', color: 'white', padding: '16px 36px', fontSize: '18px', fontWeight: 800, borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= EXAM SCREEN ================= */}
          {screen === 'EXAM' && examQuestions.length > 0 && (
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ backgroundColor: colors.surface, padding: '16px 24px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {examSubjects.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        const targetIdx = examQuestions.findIndex(q => q.subject_id === sub.id);
                        if (targetIdx !== -1) setCurrentIdx(targetIdx);
                      }}
                      style={{ backgroundColor: sub.id === examQuestions[currentIdx]?.subject_id ? '#1d4ed8' : colors.bg, color: sub.id === examQuestions[currentIdx]?.subject_id ? 'white' : colors.text, fontWeight: 700, padding: '10px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>

                <div style={styles.timerPanel}>
                  {formatTimer(timeLeft)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={styles.questionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{ padding: '6px 14px', backgroundColor: colors.primaryLight, color: colors.primary, borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                      Question {currentIdx + 1} of {examQuestions.length}
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
                          style={{ ...styles.optionItem, ...(isSelected ? styles.optionItemSelected : {}) }}
                          onClick={() => selectAnswer(opt.key as any)}
                        >
                          <div style={{ ...styles.optionMarker, ...(isSelected ? { backgroundColor: colors.primary, color: '#fff' } : {}) }}>{opt.key}</div>
                          <div>{opt.text}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Practice Mode: Toggle View Answer / Explanation */}
                  {isPracticeMode && (
                    <div style={{ marginTop: '20px', borderTop: `1px dashed ${colors.border}`, paddingTop: '16px' }}>
                      <button
                        style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm, fontWeight: 700, backgroundColor: revealExplanation ? colors.warningLight : colors.primaryLight, color: revealExplanation ? colors.warning : colors.primary, border: 'none' }}
                        onClick={() => setRevealExplanation(!revealExplanation)}
                      >
                        💡 {revealExplanation ? 'Hide Answer & Explanation' : 'View Correct Answer & Explanation'}
                      </button>

                      {revealExplanation && (
                        <div style={styles.explanationBox}>
                          <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: colors.success }}>
                              Correct Answer: Option {examQuestions[currentIdx].correct_answer}
                            </span>
                            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, textTransform: 'uppercase', fontWeight: 700, color: colors.textSecondary }}>
                              Difficulty: {examQuestions[currentIdx].difficulty || 'medium'}
                            </span>
                          </div>

                          {examQuestions[currentIdx].correct_explanation && (
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Explanation:</strong> {examQuestions[currentIdx].correct_explanation}
                            </div>
                          )}

                          {examQuestions[currentIdx].topic_explanation && (
                            <div style={{ color: colors.textSecondary, fontSize: '13px' }}>
                              <strong>Topic Insight:</strong> {examQuestions[currentIdx].topic_explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                    <button style={{ ...styles.btn, ...styles.btnSecondary }} disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)}>
                      Previous
                    </button>
                    {currentIdx < examQuestions.length - 1 ? (
                      <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setCurrentIdx(prev => prev + 1)}>
                        Next
                      </button>
                    ) : (
                      <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={manualSubmitExam}>
                        Complete Exam
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.paletteCard}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Question Palette</h3>
                  <div style={styles.paletteGrid}>
                    {examQuestions.map((q, idx) => (
                      <button
                        key={q.id}
                        style={{ ...styles.paletteBtn, ...(idx === currentIdx ? styles.paletteBtnActive : answers[q.id] ? styles.paletteBtnAnswered : {}) }}
                        onClick={() => setCurrentIdx(idx)}
                      >
                        {idx + 1}
                      </button>
                    ))}
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
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: colors.success }}>Exam Completed</h1>
                </div>

                <div style={{ ...styles.resultCircle, borderColor: colors.success }}>
                  <span style={{ fontSize: '36px', fontWeight: 800 }}>{activeResult.percentage.toFixed(0)}%</span>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>Score</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
                  <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={() => setScreen('REVIEW')}>
                    View Correct Answers &amp; Review
                  </button>
                  <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setScreen('DASHBOARD')}>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= REVIEW SCREEN ================= */}
          {screen === 'REVIEW' && activeResult && (
            <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Detailed Question &amp; Answer Review</h1>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                    Score: <strong style={{ color: colors.primary }}>{activeResult.percentage.toFixed(0)}%</strong> ({activeResult.score} / {activeResult.total_questions} Correct)
                  </p>
                </div>
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setScreen('DASHBOARD')}>
                  Return to Dashboard
                </button>
              </div>

              {(() => {
                let parsedDetails: any[] = [];
                try {
                  parsedDetails = typeof activeResult.details === 'string' ? JSON.parse(activeResult.details) : (activeResult.details || []);
                } catch (e) {
                  parsedDetails = [];
                }

                if (parsedDetails.length === 0) {
                  return <div style={styles.card}>No detailed question records available for this exam.</div>;
                }

                return parsedDetails.map((q: any, idx: number) => {
                  const isCorrect = q.is_correct;
                  const userAns = q.user_answer;
                  const correctAns = q.correct_answer;

                  return (
                    <div
                      key={q.id || idx}
                      style={{
                        ...styles.reviewCard,
                        borderLeftColor: isCorrect ? colors.success : colors.danger
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: colors.textMuted }}>
                          Question {idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, textTransform: 'uppercase', fontWeight: 600 }}>
                            Difficulty: {q.difficulty || 'Medium'}
                          </span>
                          <span style={{ ...styles.badge, ...(isCorrect ? styles.badgeSuccess : styles.badgeDanger) }}>
                            {isCorrect ? 'Correct' : userAns ? 'Incorrect' : 'Unanswered'}
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.6, marginBottom: '20px' }}>
                        {q.question_text}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        {[
                          { key: 'A', text: q.option_a },
                          { key: 'B', text: q.option_b },
                          { key: 'C', text: q.option_c },
                          { key: 'D', text: q.option_d },
                        ].map(opt => {
                          const isUserChoice = userAns === opt.key;
                          const isRightChoice = correctAns === opt.key;

                          let optionBg = colors.bg;
                          let optionBorder = colors.border;
                          let labelText = '';

                          if (isRightChoice) {
                            optionBg = colors.successLight;
                            optionBorder = colors.success;
                            labelText = ' ✓ Correct Answer';
                          } else if (isUserChoice && !isCorrect) {
                            optionBg = colors.dangerLight;
                            optionBorder = colors.danger;
                            labelText = ' ✗ Your Choice';
                          }

                          return (
                            <div
                              key={opt.key}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: `1px solid ${optionBorder}`,
                                backgroundColor: optionBg,
                                fontSize: '14px',
                                fontWeight: (isRightChoice || isUserChoice) ? 700 : 400
                              }}
                            >
                              <strong>{opt.key}.</strong> {opt.text}
                              {labelText && <span style={{ fontSize: '12px', marginLeft: '6px' }}>{labelText}</span>}
                            </div>
                          );
                        })}
                      </div>

                      {(q.correct_explanation || q.topic_explanation) && (
                        <div style={{ ...styles.explanationBox, marginTop: '12px' }}>
                          {q.correct_explanation && (
                            <div style={{ marginBottom: '6px' }}>
                              <strong>Explanation:</strong> {q.correct_explanation}
                            </div>
                          )}
                          {q.topic_explanation && (
                            <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                              <strong>Topic Detail:</strong> {q.topic_explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </main>
      </div>

      {/* ================= UPGRADE / SUBSCRIBE MODAL ================= */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
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
            maxWidth: '460px',
            width: '100%',
            padding: '32px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Lock size={48} color={colors.primary} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: colors.text, marginBottom: '12px' }}>
              Subscription Upgrade Required
            </h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.5, marginBottom: '24px' }}>
              {upgradeModalMessage || "Selected subject or feature is restricted under your current activation. Please select and purchase your subject combination online."}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  triggerBuyPasscodeOnline();
                }}
                style={{ ...styles.btn, ...styles.btnPrimary }}
              >
                Buy Now / Upgrade <ShoppingCart size={16} />
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{ ...styles.btn, ...styles.btnSecondary }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBMIT CONFIRM OVERLAY ================= */}
      {showSubmitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000
        }}>
          <div style={{ backgroundColor: colors.surface, padding: '32px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px' }}>
            <h2>Submit Exam?</h2>
            <p style={{ margin: '16px 0', fontSize: '14px', color: colors.textSecondary }}>Press 'Y' or click Confirm to submit your exam.</p>
            <button onClick={() => { setShowSubmitConfirm(false); processSubmission(); }} style={{ ...styles.btn, ...styles.btnSuccess, marginRight: '10px' }}>
              Confirm (Y)
            </button>
            <button onClick={() => setShowSubmitConfirm(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
