import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic, Question, Result, SyncStatus } from './global';

type Screen = 'ACTIVATION' | 'DASHBOARD' | 'EXAM' | 'RESULT' | 'REVIEW';

export default function App() {
  const [screen, setScreen] = useState<Screen>('ACTIVATION');
  const [activation, setActivation] = useState<{ email: string; passcode: string } | null>(null);

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
          </nav>

          <div style={styles.sidebarFooter}>
            Offline Terminal v2.0
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
            <button
              style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm }}
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px', backgroundColor: colors.primaryLight, borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: colors.primary }}>OFFLINE TERMINAL</span>
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
                    <select style={{ ...styles.select, width: '140px' }} value={examType} onChange={(e) => setExamType(e.target.value as any)}>
                      <option value="JAMB">JAMB CBT</option>
                      <option value="WAEC">WAEC</option>
                      <option value="NECO">NECO</option>
                    </select>
                  </div>

                  {/* --- Mode: PRACTICE --- */}
                  {dashboardMode === 'PRACTICE' && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Practice Module Setup</h3>
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
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Performance Insights</h3>
                      {historyResults.length === 0 ? (
                        <p style={{ color: colors.textSecondary, fontSize: '14px' }}>No historical exam records completed inside this terminal yet.</p>
                      ) : (
                        <div>
                          <div style={styles.grid2}>
                            <div style={styles.statCard}>
                              <div style={styles.statLabel}>Total Exams Taken</div>
                              <div style={styles.statValue}>{historyResults.length}</div>
                            </div>
                            <div style={styles.statCard}>
                              <div style={styles.statLabel}>Cumulative Average</div>
                              <div style={{ ...styles.statValue, color: colors.success }}>
                                {(historyResults.reduce((acc, r) => acc + r.percentage, 0) / historyResults.length).toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, margin: '24px 0 12px', letterSpacing: '0.5px' }}>Historic Results</h4>
                          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {historyResults.map(r => (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: colors.bg, borderRadius: '10px', fontSize: '13px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{r.exam_type} <span style={{ color: colors.textMuted }}>({r.total_questions} Qs)</span></span>
                                <strong style={{ color: r.percentage >= 50 ? colors.success : colors.danger, fontSize: '15px' }}>{r.percentage.toFixed(0)}%</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Sync Logs */}
              <div style={{ width: '340px', flexShrink: 0 }}>
                <div style={styles.card}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: '16px', letterSpacing: '0.5px' }}>Sync Log</h3>
                  <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
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

          {/* ================= EXAM SCREEN ================= */}
          {screen === 'EXAM' && examQuestions.length > 0 && (
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={styles.examHeader}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{examType} Exam Room</h2>
                  <p style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '4px' }}>
                    Session: <strong style={{ color: colors.text }}>{examSessionId}</strong>
                  </p>
                </div>
                <div style={styles.timerPanel}>
                  {formatTimer(timeLeft)}
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
    </div>
  );
}
