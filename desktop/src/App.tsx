import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic, Question, Result, SyncStatus, SavedLogin } from './global';
import { Sun, Moon, Lock, ShoppingCart, Newspaper, Calculator, Clock, Key, Zap, Trophy, User, Share2 } from 'lucide-react';

type Screen = 'ACTIVATION' | 'DASHBOARD' | 'PROFILE' | 'INSTRUCTIONS' | 'EXAM' | 'RESULT' | 'REVIEW' | 'NEWS_DETAIL';

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
  const [savedLoginsList, setSavedLoginsList] = useState<SavedLogin[]>([]);

  // Upgrade / Buy Passcode Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState<string>('');

  // First Activation Welcome Modal
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  // Network & Updates State
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(navigator.onLine);
  const [softwareUpdates, setSoftwareUpdates] = useState<any[]>([]);

  // News State & Read Tracking
  const [newsList, setNewsList] = useState<any[]>([]);
  const [readNewsIds, setReadNewsIds] = useState<number[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      loadSoftwareUpdates();
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
      setSoftwareUpdates([]);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSoftwareUpdates = async () => {
    if (!navigator.onLine) return;
    try {
      const urls = [
        'https://cbt.filloptech.com/api/v1/admin/updates.php',
        'http://localhost:80/fillop/api/v1/updates.php'
      ];
      for (const url of urls) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout for updates
          let res;
          try {
            res = await fetch(url, { signal: controller.signal });
          } finally {
            clearTimeout(timer);
          }
          if (res && res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.updates)) {
              setSoftwareUpdates(data.updates);
              break;
            }
          }
        } catch (err) {
          // try next url
        }
      }
    } catch (e) {
      console.warn('Failed to fetch software updates:', e);
    }
  };

  const loadReadNewsIds = async () => {
    if (window.api && window.api.getReadNewsIds) {
      try {
        const activeUser = activation?.email || 'Candidate (Free)';
        const ids = await window.api.getReadNewsIds(activeUser);
        setReadNewsIds(ids || []);
      } catch (e) {
        console.error('Failed to load read news IDs:', e);
      }
    }
  };

  const handleOpenNewsDetail = async (item: any) => {
    setSelectedNews(item);
    setScreen('NEWS_DETAIL');
    const activeUser = activation?.email || 'Candidate (Free)';
    if (window.api && window.api.markNewsAsRead) {
      try {
        await window.api.markNewsAsRead(item.id, activeUser);
        if (!readNewsIds.includes(item.id)) {
          setReadNewsIds(prev => [...prev, item.id]);
        }
      } catch (e) {
        console.error('Failed to mark news as read:', e);
      }
    }
  };

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

  const handleCalcInput = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('');
    } else if (val === 'DEL') {
      setCalcDisplay(prev => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        if (!calcDisplay) return;
        let expr = calcDisplay
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, 'Math.PI')
          .replace(/e/g, 'Math.E')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/sqrt\(/g, 'Math.sqrt(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/\^/g, '**');

        const res = Function(`"use strict"; return (${expr})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          setCalcDisplay(Number(res.toFixed(8)).toString());
        } else {
          setCalcDisplay('Error');
        }
      } catch (err) {
        setCalcDisplay('Error');
      }
    } else {
      if (calcDisplay === 'Error') {
        setCalcDisplay(val);
      } else {
        setCalcDisplay(prev => prev + val);
      }
    }
  };

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<string>('This Week');

  // Mini Ads State
  const [activeAdIdx, setActiveAdIdx] = useState<number>(0);
  const imageAdsList = [
    { image: "./exam_hall_1.jpg", alt: "CBT Examination Hall Center" },
    { image: "./computer_center_1.jpg", alt: "Modern Computer Testing Center" },
    { image: "./exam_hall_2.jpg", alt: "Standard Exam Testing Center" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || screen === 'EXAM') return;
      setActiveAdIdx(prev => (prev + 1) % imageAdsList.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [screen]);

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
  const [allCategoriesSubjectsMap, setAllCategoriesSubjectsMap] = useState<Record<string, Subject[]>>({});
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
  const [showAllMockSubjects, setShowAllMockSubjects] = useState<boolean>(false);

  // Exam Screen execution state
  const [examSessionId, setExamSessionId] = useState<string>('');
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [revealExplanation, setRevealExplanation] = useState<boolean>(false);
  const [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({});
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

  const loadSavedLogins = async () => {
    if (window.api && window.api.getSavedLogins) {
      try {
        const list = await window.api.getSavedLogins();
        setSavedLoginsList(list || []);
      } catch (e) {
        console.error('Failed to load saved logins:', e);
      }
    }
  };

  useEffect(() => {
    checkActivation();
    loadSyncLogs();
    loadNewsList();
    loadReadNewsIds();
    loadSavedLogins();

    if (window.api && window.api.onSyncStatusChanged) {
      window.api.onSyncStatusChanged(() => {
        loadSyncLogs();
        loadResultsHistory();
        loadNewsList();
        loadReadNewsIds();
        loadSoftwareUpdates();
      });
    }

    if (window.api && window.api.onPasscodeRevoked) {
      window.api.onPasscodeRevoked(() => {
        setActivation(null);
        setIsFreeMode(true);
        setScreen('ACTIVATION');
        alert("Access Revoked: Your passcode has been suspended or revoked on the central server. Please re-activate with a valid passcode.");
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
          if (window.api && window.api.setExamActive) {
            window.api.setExamActive(false);
          }
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
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) {
          setCurrentIdx(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIdx < examQuestions.length - 1) {
          setCurrentIdx(prev => prev + 1);
        }
      } else if (e.key === 'ArrowUp') {
        const scrollElem = document.getElementById('examQuestionContentPanel');
        if (scrollElem) {
          scrollElem.scrollBy({ top: -80, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: -80, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowDown') {
        const scrollElem = document.getElementById('examQuestionContentPanel');
        if (scrollElem) {
          scrollElem.scrollBy({ top: 80, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: 80, behavior: 'smooth' });
        }
      } else if (e.key === 'Escape') {
        if (showSubmitConfirm) {
          setShowSubmitConfirm(false);
        }
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
    if (screen === 'DASHBOARD' || screen === 'PROFILE') {
      loadSyllabusData();
      loadResultsHistory();
      loadNewsList();
      loadSoftwareUpdates();
      loadReadNewsIds();
      loadSavedLogins();
    }
  }, [screen, examType, activation]);

  useEffect(() => {
    setRevealExplanation(false);
  }, [currentIdx]);

  useEffect(() => {
    if (practiceSubject) {
      loadTopicsAndYears(practiceSubject);
    } else {
      setTopicsList([]);
      setYearsList([]);
    }
  }, [practiceSubject]);

  const handleOpenLeaderboard = async () => {
    if (!syncStatus.isOnline && !navigator.onLine) {
      alert("Leaderboard is an online feature. Please connect to the internet.");
      return;
    }
    setShowLeaderboard(true);
    setLeaderboardLoading(true);
    const urls = [
      "https://cbt.filloptech.com/api/v1/leader.php",
      "http://localhost:80/fillop/api/v1/leader.php"
    ];
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        let res;
        try {
          res = await fetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data.success) {
            setLeaderboardData(data.leaderboard || []);
            setLeaderboardTimeframe(data.timeframe || 'This Week');
            break;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch leaderboard from " + url, e);
      }
    }
    setLeaderboardLoading(false);
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
        const sortedSubs = Array.isArray(subs) ? [...subs].sort((a: any, b: any) => {
          const lockedA = Boolean(a.is_locked);
          const lockedB = Boolean(b.is_locked);
          if (lockedA !== lockedB) return lockedA ? 1 : -1;
          return a.name.localeCompare(b.name);
        }) : [];
        setSubjectsList(sortedSubs);
        setMockSelectedSubjects([]);
        setPracticeSubject('');

        // Preload subjects for all exam categories (JAMB, WAEC, NECO) for Profile table lookup
        const catMap: Record<string, Subject[]> = {};
        for (const cat of ['JAMB', 'WAEC', 'NECO'] as const) {
          try {
            const catSubs = await window.api.getSubjects(cat);
            if (Array.isArray(catSubs)) {
              catMap[cat] = catSubs;
            }
          } catch (e) {}
        }
        setAllCategoriesSubjectsMap(catMap);
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
    window.open("https://cbt.filloptech.com/api/v1/sync/subscribe.php", "_blank");
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

        // Check if first activation welcome screen has been displayed
        const welcomeKey = `welcome_shown_${actPasscode.trim()}`;
        if (!localStorage.getItem(welcomeKey)) {
          setShowWelcomeModal(true);
          localStorage.setItem(welcomeKey, 'true');
        }
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
      loadSoftwareUpdates();
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
      setIsQuizMode(false);
      setRevealExplanation(false);
      setRevealedQuestions({});
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

      setExamSubjects(subObj ? [{ ...subObj, name: subObj.name }] : []);
      const sessId = `session-${Date.now()}`;
      setExamSessionId(sessId);
      if (window.api && window.api.setExamActive) {
        await window.api.setExamActive(true);
      }
      setExamQuestions(qList);
      setCurrentIdx(0);

      const totalSecs = practiceTimed ? qList.length * 40 : 0;
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
    }

    if (mockSelectionMode === 'YEAR' && !mockSelectedYear) {
      alert('Please choose a past paper year.');
      return;
    }

    try {
      setFallbackNotice('');
      setIsPracticeMode(false);
      setIsQuizMode(false);
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
      if (window.api && window.api.setExamActive) {
        await window.api.setExamActive(true);
      }
      setExamQuestions(res.questions);
      setCurrentIdx(0);

      const totalSecs = res.questions.length * 40;
      setTimeLeft(totalSecs);
      setScreen('INSTRUCTIONS');
    } catch (e) {
      console.error(e);
    }
  };

  const startDailyQuizSession = async () => {
    try {
      setFallbackNotice('');
      setIsPracticeMode(false);
      setIsQuizMode(true);
      setRevealExplanation(false);
      setAnswers({});
      setFlagged({});

      const examCategories: ('JAMB' | 'WAEC' | 'NECO')[] = ['JAMB', 'WAEC', 'NECO'];
      const targetCategory = examCategories[Math.floor(Math.random() * examCategories.length)];
      setExamType(targetCategory);

      const subs = await window.api.getSubjects(targetCategory);
      const unlockedSubs = Array.isArray(subs) ? subs.filter((s: any) => !s.is_locked) : [];

      let randomSub = null;
      if (unlockedSubs.length > 0) {
        randomSub = unlockedSubs[Math.floor(Math.random() * unlockedSubs.length)];
      } else if (subs && subs.length > 0) {
        randomSub = subs[Math.floor(Math.random() * subs.length)];
      }

      if (!randomSub) {
        alert('No available subjects found for Daily Quiz.');
        return;
      }

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

      const questionsWithSubjectName = qList.map(q => ({
        ...q,
        subject_name: randomSub.name
      }));

      setExamSubjects([randomSub]);
      const sessId = `session-quiz-${Date.now()}`;
      setExamSessionId(sessId);
      setExamQuestions(questionsWithSubjectName);
      if (window.api && window.api.setExamActive) {
        await window.api.setExamActive(true);
      }
      setCurrentIdx(0);

      // 30 seconds per question (e.g. 10 * 30 = 300s, 12 * 30 = 360s)
      const totalSecs = questionsWithSubjectName.length * 30;
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

    if (isQuizMode && answers[q.id]) {
      return; // Choice is locked in Quiz Mode
    }

    setAnswers(prev => ({ ...prev, [q.id]: ans }));
    if (window.api && window.api.saveAnswer) {
      await window.api.saveAnswer(examType, examSessionId, q.id, ans);
    }

    if (isQuizMode && currentIdx < examQuestions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 250);
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

      if (window.api && window.api.setExamActive) {
        await window.api.setExamActive(false);
      }
      setActiveResult(resultRow);
      setScreen('RESULT');
    } catch (e) {
      console.error('Submission error:', e);
      if (window.api && window.api.setExamActive) {
        await window.api.setExamActive(false).catch(() => {});
      }
      const fallbackResult = {
        id: Date.now(),
        exam_type: examType,
        user_name: activation?.email || 'Candidate (Free)',
        score: correctCount,
        total_questions: examQuestions.length,
        percentage,
        details: JSON.stringify(detailsList),
        submitted_at: new Date().toISOString()
      };
      setActiveResult(fallbackResult);
      setScreen('RESULT');
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
    sidebar: { width: '230px', backgroundColor: colors.sidebar, display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0 },
    sidebarBrand: { padding: '0 20px 24px', display: 'flex', alignItems: 'center', gap: '10px' },
    sidebarBrandText: { color: '#fff', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.2px' },
    sidebarNav: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 10px', flex: 1 },
   sidebarItem: {
  padding: '10px 14px',
  borderRadius: '8px',
  color: '#c7d2fe',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'all 0.15s ease',
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',   // explicit, not shorthand 'none'
  WebkitAppearance: 'none',         // kills native button chrome
  appearance: 'none',
  width: '100%',
  textAlign: 'left'
}, sidebarItemActive: { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' },
    sidebarFooter: { padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#818cf8', fontSize: '12px' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { height: '60px', backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerTitle: { fontSize: '18px', fontWeight: 700, color: colors.text, letterSpacing: '-0.2px' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
    networkPill: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: colors.textSecondary },
    dot: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'currentColor' },
    btn: { padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    btnPrimary: { backgroundColor: colors.primary, color: '#fff' },
    btnSecondary: { backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` },
    btnSuccess: { backgroundColor: colors.success, color: '#fff' },
    btnDanger: { backgroundColor: colors.danger, color: '#fff' },
    btnSm: { padding: '6px 12px', fontSize: '12px' },
    btnLg: { padding: '12px 24px', fontSize: '14px' },
    content: { flex: 1, overflow: 'auto', padding: '24px 28px' },
    card: { backgroundColor: colors.surface, borderRadius: '10px', padding: '20px 24px', border: `1px solid ${colors.border}` },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '12px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '13px', backgroundColor: colors.surface, color: colors.text, outline: 'none', transition: 'border-color 0.2s' },
    select: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '13px', backgroundColor: colors.surface, color: colors.text, outline: 'none', cursor: 'pointer' },
    tabs: { display: 'flex', gap: '20px', borderBottom: `1px solid ${colors.border}`, marginBottom: '20px' },
    tab: { padding: '10px 0', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, color: colors.textSecondary, cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-1px' },
    tabActive: { color: colors.primary, borderBottom: `2px solid ${colors.primary}`, fontWeight: 700 },
    statCard: { backgroundColor: colors.bg, borderRadius: '8px', padding: '16px 20px', textAlign: 'center', border: `1px solid ${colors.border}` },
    statLabel: { fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
    statValue: { fontSize: '26px', fontWeight: 800, color: colors.primary },
    logItem: { padding: '10px 0', borderBottom: `1px solid ${colors.border}`, fontSize: '12px' },
    logMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
    logEvent: { fontWeight: 600, color: colors.text },
    logStatus: { fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' },
    logStatusSuccess: { backgroundColor: colors.successLight, color: colors.success },
    logStatusFailed: { backgroundColor: colors.dangerLight, color: colors.danger },
    logStatusPending: { backgroundColor: colors.warningLight, color: colors.warning },
    logText: { color: colors.textSecondary, marginBottom: '2px' },
    logTime: { color: colors.textMuted, fontSize: '11px' },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', backgroundColor: colors.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, maxHeight: '320px', overflowY: 'auto' },
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
    { id: 'PROFILE', label: 'Profile', icon: 'P' },
    { id: 'ANALYTICS', label: 'Analytics', icon: 'A' },
  ];

  const isSidebarActive = (id: string) => {
    if (id === 'DASHBOARD' && screen === 'DASHBOARD' && dashboardMode !== 'ANALYTICS') return true;
    if (id === 'PROFILE' && screen === 'PROFILE') return true;
    if (id === 'ANALYTICS' && screen === 'DASHBOARD' && dashboardMode === 'ANALYTICS') return true;
    return false;
  };

  const handleSidebarClick = (id: string) => {
    if (id === 'DASHBOARD') {
      setDashboardMode('DAILY_QUIZ');
      setScreen('DASHBOARD');
    }
    if (id === 'PROFILE') {
      setScreen('PROFILE');
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

  const handleSwitchSavedAccount = async (passcode: string) => {
    if (window.api && window.api.switchSavedLogin) {
      const res = await window.api.switchSavedLogin(passcode);
      if (res.success) {
        await checkActivation();
        alert("Switched account profile successfully!");
      } else {
        alert(res.error || "Failed to switch profile.");
      }
    }
  };

  const handleDeleteSavedAccount = async (passcode: string) => {
    if (!window.confirm("Remove this saved passcode profile from device?")) return;
    if (window.api && window.api.deleteSavedLogin) {
      await window.api.deleteSavedLogin(passcode);
      loadSavedLogins();
    }
  };

  return (
    <div style={styles.app}>
      {/* Sidebar - Hidden in Mock Exam Room to prevent distractions */}
      {screen !== 'ACTIVATION' && !(screen === 'EXAM' && !isPracticeMode && !isQuizMode) && !(screen === 'INSTRUCTIONS' && !isPracticeMode && !isQuizMode) && (
        <aside style={styles.sidebar}>
          <div style={styles.sidebarBrand}>
            <img src="./icon.png" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid white' }} alt="App Icon" />
            <span style={styles.sidebarBrandText}>Fillop CBT</span>
          </div>

          <nav style={styles.sidebarNav}>
            {sidebarNavItems.map(item => {
              const active = isSidebarActive(item.id);
              return (
                <button
                  key={item.id}
                  style={{
                    ...styles.sidebarItem,
                    ...(active ? styles.sidebarItemActive : {})
                  }}
                  onClick={() => handleSidebarClick(item.id)}
                >
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}

            <button
              style={{
                ...styles.sidebarItem,
                marginTop: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
               
                marginBottom: '16px'
              }}
              onClick={triggerBuyPasscodeOnline}
            >
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                <ShoppingCart size={16} color="#fff" />
              </span>
              Buy Passcode Online
            </button>
          </nav>

          {/* Sidebar Latest News Widgets */}
          <div style={{ padding: '0 16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newsList.slice(0, 2).map((item) => {
              const pubDate = item.published_at
                ? new Date(item.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const handleSidebarNewsClick = () => {
                const targetUrl = item.url || 'https://news.filloptech.com';
                if (window.api && window.api.openExternal) {
                  window.api.openExternal(targetUrl);
                } else {
                  window.open(targetUrl, '_blank');
                }
              };

              return (
                <div
                  key={item.id}
                  onClick={handleSidebarNewsClick}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ width: '100%', height: '90px', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '6px', marginBottom: '6px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={item.thumbnail_url || item.image || "./icon.png"}
                      alt={item.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "./icon.png";
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', lineHeight: 1.3, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#93c5fd', textAlign: 'right' }}>
                    {pubDate}
                  </div>
                </div>
              );
            })}
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
              <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>
                • {activation.email}
              </span>
            )}
          </div>

          <div style={styles.headerRight}>
            {isFreeMode && (
              <button
                style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSm }}
                onClick={() => setScreen('ACTIVATION')}
              >
                 Activate
              </button>
            )}

            {activation && (
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: colors.successLight,
                color: colors.success
              }}>
                ACTIVATED
              </span>
            )}

            {(() => {
              const isEffectiveOnline = isNetworkOnline && syncStatus.isOnline;
              return (
                <>
                  <div style={styles.networkPill}>
                    <span style={{ ...styles.dot, backgroundColor: isEffectiveOnline ? colors.success : colors.danger }}></span>
                    <span>{isEffectiveOnline ? 'Online' : 'Offline'}</span>
                  </div>

                  <button
                    style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm }}
                    onClick={triggerManualSync}
                    disabled={!isEffectiveOnline}
                  >
                    Sync
                  </button>
                </>
              );
            })()}

            {screen === 'DASHBOARD' && (
              <button style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm }} onClick={handleLogout}>
                {isFreeMode ? 'Change Login' : 'Log Out'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle dark mode"
              style={{
                width: '44px',
                height: '24px',
                border: 'none',
                borderRadius: '12px',
                padding: '2px',
                cursor: 'pointer',
                background: isDarkMode ? '#374151' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isDarkMode ? 'flex-end' : 'flex-start',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isDarkMode ? '#111827' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              >
                {isDarkMode ? (
                  <Moon size={12} strokeWidth={2.2} color="#fff" />
                ) : (
                  <Sun size={12} strokeWidth={2.2} color="#374151" />
                )}
              </span>
            </button>

          </div>
        </header>

      <main
  style={{
    ...styles.content,
    ...((screen === 'EXAM' || screen === 'INSTRUCTIONS') ? { padding: 0, overflow: 'hidden' } : {}),
  }}
>
          {/* ================= ACTIVATION SCREEN ================= */}
          {screen === 'ACTIVATION' && (
            <div style={{ maxWidth: '460px', margin: '60px auto' }}>
              <div style={styles.card}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <img src="./icon.png" style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px', display: 'block', border: `3px solid ${colors.primary}` }} alt="App Icon" />
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
                    <label style={styles.label}>Passcode (10 characters, e.g. 01520976GG)</label>
                    <input
                      type="text"
                      style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: '0.08em' }}
                      placeholder="01520976GG"
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
                      Proceed with Free Version (Max 30 Qs / Math &amp; English)
                    </button>
                  </div>
                </form>

                <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '24px', paddingTop: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '8px' }}>
                    Don't have a passcode yet?
                  </p>
                  <button
                    onClick={triggerBuyPasscodeOnline}
                    style={{ ...styles.btn, backgroundColor: '#5a5858ff', color: '#fff', border: 'none', fontWeight: 700, padding: '8px 16px' }}
                  >
                    Buy Passcode &amp; Select Subjects Online
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= NEWS DETAIL SCREEN ================= */}
          {screen === 'NEWS_DETAIL' && selectedNews && (
            <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, marginBottom: '24px' }}
                onClick={() => {
                  setSelectedNews(null);
                  setScreen('DASHBOARD');
                }}
              >
                ← Back to Dashboard
              </button>

              <article style={{ backgroundColor: colors.surface, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                {/* News Cover Photo Header */}
                {selectedNews.thumbnail_url && (
                  <div style={{ width: '100%', height: '280px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={selectedNews.thumbnail_url}
                      alt={selectedNews.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div style={{ padding: '32px 40px' }}>
                  <header style={{ marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: colors.primary, fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Official Announcement
                      </span>
                      <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 500 }}>
                        {selectedNews.published_at ? new Date(selectedNews.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently Published'}
                      </span>
                    </div>

                    <h1 style={{ fontSize: '30px', fontWeight: 800, color: colors.text, lineHeight: 1.3, margin: 0 }}>
                      {selectedNews.title}
                    </h1>
                  </header>

                  <section style={{ fontSize: '16px', lineHeight: 1.8, color: colors.text, whiteSpace: 'pre-line' }}>
                    {selectedNews.content}
                  </section>
                </div>
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
                    backgroundColor: 'rgba(72, 100, 223, 1)',
                  
                    borderRadius: '12px',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#fff'
                  }}>
                    <div>
                      <strong style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       
                      </strong>
                      <p style={{ fontSize: '13px', marginTop: '4px', margin: 0 }}>
                        Restricted to Mathematics and English. Analytics and other subjects require a passcode.
                      </p>
                    </div>
                    <button
                      onClick={triggerBuyPasscodeOnline}
                      style={{ ...styles.btn, backgroundColor: "#fff", color: '#5a5858ff', border: 'none', fontWeight: 300, flexShrink: 0 }}
                    >
                      Buy Passcode Now 
                    </button>
                  </div>
                )}

                {/* Welcome Banner */}
                <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px', color: colors.text }}>
                      {isFreeMode ? 'Welcome Candidate (Free Mode)' : 'Welcome, Candidate'}
                    </h2>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                      Profile: <strong style={{ color: colors.primary }}>{activation ? activation.email : 'Unactivated Free Account'}</strong>
                      {!isFreeMode && activation?.exam_category && (
                        <span> • Category: <strong style={{ color: colors.primary }}>{activation.exam_category}</strong></span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={handleOpenLeaderboard}
                      style={{ ...styles.btn, ...styles.btnSecondary, fontWeight: 700, fontSize: '12px' }}
                    >
                      <Trophy size={14} color={colors.warning} /> Weekly Leaderboard
                    </button>
                  </div>
                </div>

                {/* Supported Examination Bodies Showcase - Modern Inline Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Supported Bodies:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src="./jamb.webp" alt="JAMB Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      <span style={{ fontWeight: 700, fontSize: '13px', color: colors.text }}>JAMB UTME</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src="./waec.webp" alt="WAEC Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      <span style={{ fontWeight: 700, fontSize: '13px', color: colors.text }}>WAEC SSCE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src="./NECO.jpg" alt="NECO Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      <span style={{ fontWeight: 700, fontSize: '13px', color: colors.text }}>NECO SSCE</span>
                    </div>
                  </div>
                </div>

                {/* Mode Tabs + Content */}
                <div style={styles.card}>
                  <div style={styles.tabs}>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'DAILY_QUIZ' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('DAILY_QUIZ')}>Take Quiz</button>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'PRACTICE' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('PRACTICE')}>Study </button>
                    <button style={{ ...styles.tab, ...(dashboardMode === 'MOCK' ? styles.tabActive : {}) }} onClick={() => setDashboardMode('MOCK')}>Take Exams</button>
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
                        src={examType === 'JAMB' ? './jamb.webp' : examType === 'WAEC' ? './waec.webp' : './NECO.jpg'}
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

                  {/* --- Mode: PRACTICE (STUDY MODE) --- */}
                  {dashboardMode === 'PRACTICE' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Study Module Setup</h3>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase' }}>
                             STUDY MODE
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
                          Launch Study Session
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- Mode: MOCK --- */}
                  {dashboardMode === 'MOCK' && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Mock Examination Room</h3>
                      <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.5 }}>
                        {isFreeMode ? 'Free Version is restricted to 30 questions per subject in English & Mathematics.' : 'Select up to 4 subjects assigned to your passcode subscription.'}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={styles.formGroup}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={styles.label}>Select Subjects (up to 4)</label>
                            {subjectsList.length > 12 && (
                              <button
                                type="button"
                                onClick={() => setShowAllMockSubjects(!showAllMockSubjects)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: colors.primary,
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                {showAllMockSubjects ? '▲ Show Fewer Subjects' : `▼ View More Subjects (${subjectsList.length - 12} More)`}
                              </button>
                            )}
                          </div>

                          <div style={styles.checkboxGrid}>
                            {(() => {
                              const priorityOrder = [
                                'english language', 'english',
                                'mathematics',
                                'physics',
                                'chemistry',
                                'accounting', 'financial accounting',
                                'commerce',
                                'literature', 'literature in english'
                              ];

                              const sortedSubjects = [...subjectsList].sort((a, b) => {
                                const lockedA = Boolean((a as any).is_locked);
                                const lockedB = Boolean((b as any).is_locked);
                                if (lockedA !== lockedB) return lockedA ? 1 : -1;

                                const nameA = a.name.toLowerCase();
                                const nameB = b.name.toLowerCase();

                                const idxA = priorityOrder.findIndex(p => nameA === p || nameA.includes(p));
                                const idxB = priorityOrder.findIndex(p => nameB === p || nameB.includes(p));

                                const rankA = idxA !== -1 ? idxA : 999;
                                const rankB = idxB !== -1 ? idxB : 999;

                                if (rankA !== rankB) return rankA - rankB;
                                return nameA.localeCompare(nameB);
                              });

                              const visibleSubjects = showAllMockSubjects ? sortedSubjects : sortedSubjects.slice(0, 12);

                              return visibleSubjects.map(s => {
                                const isChecked = mockSelectedSubjects.includes(s.id);
                                const isLocked = (s as any).is_locked;
                                return (
                                  <label
                                    key={s.id}
                                    style={{
                                      ...styles.checkboxLabel,
                                      backgroundColor: isLocked ? (isDarkMode ? '#1e293b' : '#f8fafc') : '#1e3a8a',
                                      color: isLocked ? colors.textMuted : '#ffffff',
                                      border: `1px solid ${isLocked ? colors.border : '#1e3a8a'}`,
                                      fontWeight: isLocked ? 500 : 700,
                                      padding: '10px 14px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      transition: 'all 0.15s ease',
                                      boxShadow: isLocked ? 'none' : '0 2px 6px rgba(30, 58, 138, 0.25)'
                                    }}
                                  >
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
                                      style={{ width: '16px', height: '16px', accentColor: '#ffffff', cursor: 'pointer' }}
                                    />
                                    {isLocked ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Lock size={14} color={colors.warning} /> {s.name}
                                      </span>
                                    ) : (
                                      <span>{s.name}</span>
                                    )}
                                  </label>
                                );
                              });
                            })()}
                          </div>

                          {!showAllMockSubjects && subjectsList.length > 12 && (
                            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setShowAllMockSubjects(true)}
                                style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSm, fontWeight: 700 }}
                              >
                                View More Subjects ({subjectsList.length - 12} More)
                              </button>
                            </div>
                          )}
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
                  {dashboardMode === 'DAILY_QUIZ' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: colors.text }}>
                           Daily Speed Quiz
                        </h3>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: colors.primary, backgroundColor: colors.primaryLight, padding: '4px 12px', borderRadius: '20px' }}>
                          {isFreeMode ? 'FREE MODE' : 'ACTIVATED'}
                        </span>
                      </div>

                      <div style={{ backgroundColor: colors.bg, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
                        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                          Challenge yourself with a daily quick-fire quiz! The system selects <strong>10 to 15 random questions</strong> with 30 seconds allocated per question.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ backgroundColor: colors.surface, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Time Rate</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: colors.primary, marginTop: '4px' }}>30 Sec / Question</div>
                          </div>
                          <div style={{ backgroundColor: colors.surface, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Question Count</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: colors.success, marginTop: '4px' }}>10 – 15 Questions</div>
                          </div>
                          <div style={{ backgroundColor: colors.surface, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Submission</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: colors.text, marginTop: '4px' }}>Auto-Advance on Choice</div>
                          </div>
                        </div>

                        <button
                          style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnLg, width: '100%', justifyContent: 'center', fontWeight: 800, fontSize: '16px', padding: '16px' }}
                          onClick={startDailyQuizSession}
                        >
                          Launch Daily Quiz
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

                      {/* Charts: Donut, Line & Bar Charts */}
                      {(() => {
                        let totalCorrect = 0;
                        let totalQuestions = 0;

                        historyResults.forEach(r => {
                          totalCorrect += (r.score || 0);
                          totalQuestions += (r.total_questions || 0);
                        });

                        const totalIncorrect = Math.max(0, totalQuestions - totalCorrect);
                        const correctPct = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 75;

                        // Donut Chart calculations
                        const rad = 80;
                        const cx = 100;
                        const cy = 100;
                        const angle = (correctPct / 100) * 360;
                        const radians = (angle - 90) * (Math.PI / 180);
                        const x = cx + rad * Math.cos(radians);
                        const y = cy + rad * Math.sin(radians);
                        const largeArcFlag = angle > 180 ? 1 : 0;

                        const pathData = totalQuestions === 0 || correctPct === 100
                          ? `M ${cx} ${cy - rad} A ${rad} ${rad} 0 1 1 ${cx - 0.01} ${cy - rad} Z`
                          : `M ${cx} ${cy} L ${cx} ${cy - rad} A ${rad} ${rad} 0 ${largeArcFlag} 1 ${x} ${y} Z`;

                        // Line Chart Data (Performance over time - up to last 10 attempts)
                        const recentHistory = [...historyResults].reverse().slice(-10);
                        const linePoints = recentHistory.map((h, idx) => {
                          const px = 20 + (idx / Math.max(1, recentHistory.length - 1)) * 260;
                          const py = 120 - (h.percentage / 100) * 100;
                          return `${px},${py}`;
                        }).join(' ');

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                              {/* 1. Accuracy Donut Chart */}
                              <div style={{ backgroundColor: colors.bg, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 800, color: colors.text, marginBottom: '12px' }}>Pass/Fail &amp; Accuracy Split</h4>
                                <svg width="200" height="200" viewBox="0 0 200 200">
                                  <circle cx={cx} cy={cy} r={rad} fill={colors.danger} />
                                  <path d={pathData} fill={colors.success} />
                                  <circle cx={cx} cy={cy} r="45" fill={colors.surface} />
                                  <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" fill={colors.text} fontSize="18" fontWeight="800">
                                    {totalQuestions > 0 ? `${correctPct.toFixed(0)}%` : '75%'}
                                  </text>
                                  <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" fill={colors.textMuted} fontSize="10" fontWeight="700">
                                    Accuracy
                                  </text>
                                </svg>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', fontWeight: 700 }}>
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

                              {/* 2. Performance Over Time Line Chart */}
                              <div style={{ backgroundColor: colors.bg, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 800, color: colors.text, marginBottom: '12px' }}>Performance Over Time</h4>
                                {recentHistory.length === 0 ? (
                                  <p style={{ color: colors.textMuted, fontSize: '12px', margin: 'auto' }}>Take exams to plot performance trajectory.</p>
                                ) : (
                                  <svg width="100%" height="160" viewBox="0 0 300 140" style={{ overflow: 'visible' }}>
                                    <line x1="20" y1="20" x2="280" y2="20" stroke={colors.border} strokeDasharray="3 3" />
                                    <line x1="20" y1="70" x2="280" y2="70" stroke={colors.border} strokeDasharray="3 3" />
                                    <line x1="20" y1="120" x2="280" y2="120" stroke={colors.border} />
                                    {recentHistory.length > 1 && (
                                      <polyline fill="none" stroke={colors.primary} strokeWidth="3" points={linePoints} />
                                    )}
                                    {recentHistory.map((h, idx) => {
                                      const px = 20 + (idx / Math.max(1, recentHistory.length - 1)) * 260;
                                      const py = 120 - (h.percentage / 100) * 100;
                                      return (
                                        <g key={idx}>
                                          <circle cx={px} cy={py} r="5" fill={h.percentage >= 50 ? colors.success : colors.danger} />
                                          <text x={px} y={py - 10} fontSize="10" fontWeight="700" fill={colors.text} textAnchor="middle">{h.percentage.toFixed(0)}%</text>
                                        </g>
                                      );
                                    })}
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Attempt History List */}
                            <div style={{ backgroundColor: colors.bg, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px', color: colors.text }}>
                                Exam Attempt History &amp; Breakdown
                              </h4>
                              <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {historyResults.length === 0 ? (
                                  <p style={{ color: colors.textMuted, fontSize: '13px' }}>
                                    No completed exam records found. Take an exam or practice test to view detailed history!
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

              {/* Right Panel: Software Updates & Sync */}
              <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: colors.textMuted, margin: 0, letterSpacing: '0.5px' }}>UPDATES</h3>
                    {softwareUpdates.length > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: colors.primary, color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                        {softwareUpdates.length} New
                      </span>
                    )}
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {softwareUpdates.length === 0 ? (
                      <p style={{ color: colors.textMuted, fontSize: '13px' }}>No software update records available.</p>
                    ) : (
                      softwareUpdates.map(upd => (
                        <div
                          key={upd.id}
                          onClick={() => {
                            if (upd.url) {
                              if (window.api && window.api.openExternal) {
                                window.api.openExternal(upd.url);
                              } else {
                                window.open(upd.url, '_blank');
                              }
                            }
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                            border: `1px solid ${colors.border}`,
                            cursor: upd.url ? 'pointer' : 'default',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: colors.primary }}>
                              {upd.version}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: colors.primaryLight, color: colors.primary, padding: '2px 6px', borderRadius: '4px' }}>
                              {upd.firmware}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: colors.text, lineHeight: 1.4, marginBottom: '6px' }}>
                            {upd.improvements}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: colors.textMuted }}>
                            <span>Size: {upd.size}</span>
                            <span style={{ color: colors.primary, fontWeight: 700 }}>
                              {upd.url ? 'Download Update ↗' : ''}
                            </span>
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

          {/* ================= PROFILE SCREEN ================= */}
          {screen === 'PROFILE' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Candidate Profile &amp; Saved Logins</h2>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0' }}>Manage your active session and saved passcode profiles on this terminal.</p>
                  </div>
                  <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setScreen('DASHBOARD')}>
                    ← Back to Dashboard
                  </button>
                </div>

                <div style={{ backgroundColor: colors.bg, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.primary, marginBottom: '12px' }}>Current Active Session</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginBottom: '16px' }}>
                    <div><strong>Account Email:</strong> {activation ? activation.email : 'Free Mode (Unactivated)'}</div>
                    <div><strong>Passcode:</strong> {activation ? activation.passcode : 'None'}</div>
                    <div><strong>Exam Category:</strong> {activation?.exam_category || 'N/A'}</div>
                    <div><strong>Passcode Expiry Date:</strong> {activation?.expiry_date ? new Date(activation.expiry_date).toLocaleString() : 'Lifetime / N/A'}</div>
                    <div><strong>Activation Date:</strong> {activation?.activated_at ? new Date(activation.activated_at).toLocaleString() : 'N/A'}</div>
                  </div>

                  {/* Registered Subjects Table */}
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: colors.textSecondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registered Subjects by Exam Category</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: colors.surface, borderBottom: `2px solid ${colors.border}`, textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', color: colors.primary }}>Category</th>
                          <th style={{ padding: '8px 12px', color: colors.primary }}>Allowed / Registered Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activation ? (
                          (activation.exam_category || 'JAMB').split(',').map((cat) => {
                            const trimmedCat = cat.trim().toUpperCase();
                            const catSubjs = allCategoriesSubjectsMap[trimmedCat] || subjectsList.filter(s => s.exam_type === trimmedCat);
                            const allowedList = activation.allowed_subjects
                              ? activation.allowed_subjects.split(',').map(s => s.trim().toUpperCase())
                              : [];
                            const activeSubjs = allowedList.length > 0
                              ? catSubjs.filter(s => allowedList.includes(s.name.toUpperCase()) || allowedList.includes(s.id.toString()))
                              : catSubjs;
                            return (
                              <tr key={trimmedCat} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{trimmedCat}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  {activeSubjs.length > 0
                                    ? activeSubjs.map(s => s.name).join(', ')
                                    : (activation.allowed_subjects || 'All Available Subjects')}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>Free Mode</td>
                            <td style={{ padding: '8px 12px' }}>Mathematics, English Language (Max 30 Questions/Session)</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Saved Passcode Accounts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {savedLoginsList.length === 0 ? (
                    <p style={{ color: colors.textMuted, fontSize: '13px' }}>No saved accounts stored on this device. Log in with a passcode to save it here.</p>
                  ) : (
                    savedLoginsList.map((item) => {
                      const isActive = activation?.passcode === item.passcode;
                      return (
                        <div key={item.passcode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isActive ? colors.primaryLight : colors.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${isActive ? colors.primary : colors.border}` }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: colors.text }}>
                              {item.email} {isActive && <span style={{ fontSize: '11px', color: colors.success, backgroundColor: colors.successLight, padding: '2px 8px', borderRadius: '10px', marginLeft: '8px' }}>ACTIVE</span>}
                            </div>
                            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: colors.primary, marginTop: '4px' }}>
                              Passcode: {item.passcode}
                            </div>
                            <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
                              Category: {item.exam_category || 'ALL'} • Expiry: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'Lifetime / N/A'} • Last used: {new Date(item.last_used_at).toLocaleDateString()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            {!isActive && (
                              <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSm }} onClick={() => handleSwitchSavedAccount(item.passcode)}>
                                Switch to Account
                              </button>
                            )}
                            <button style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSm }} onClick={() => handleDeleteSavedAccount(item.passcode)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

{/* ================= INSTRUCTIONS SCREEN ================= */}
{screen === 'INSTRUCTIONS' && (
<div style={{ display: 'flex', height: '100%', backgroundColor: '#d7ecf7', overflow: 'hidden', fontFamily: 'Georgia, "Times New Roman", serif' }}>

  {/* ---------- MAIN COLUMN ---------- */}
  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

    {/* Top bar: subjects / calculator / timer */}
    <div style={{ height: '64px', backgroundColor: '#c3e2ed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto' }}>
        {examSubjects.map((sub) => (
          <div key={sub.id} style={{ backgroundColor: '#2f6fb0', color: 'white', fontWeight: 700, fontSize: '11px', padding: '6px 10px', borderRadius: '4px', letterSpacing: '0.3px', fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap' }}>
            {sub.name.toUpperCase()}
          </div>
        ))}
      </div>

      <div onClick={() => setIsCalcOpen(!isCalcOpen)} style={{ cursor: 'pointer', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#2f6fb0', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <Calculator size={18} color="white" />
        </div>
        <div style={{ color: '#1e3a5f', fontSize: '11px', fontFamily: 'Arial, sans-serif', marginTop: '4px' }}>Calculator</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700, fontSize: '17px', fontFamily: 'Arial, sans-serif' }}>
        <Clock size={18} />
        {(timeLeft / 60).toFixed(2)} min
      </div>
    </div>

    {/* MODE badge */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 28px 0' }}>
      <div style={{ backgroundColor: '#d8362b', color: 'white', fontWeight: 700, fontSize: '12px', padding: '6px 14px', borderRadius: '4px', letterSpacing: '0.5px', fontFamily: 'Arial, sans-serif' }}>
        {isPracticeMode ? 'STUDY MODE' : isQuizMode ? 'DAILY QUIZ MODE' : 'EXAM MODE'}
      </div>
    </div>

    {/* Body: instructions + keyboard usage */}
    <div style={{ display: 'flex', flex: 1, gap: '28px', padding: '20px 28px 28px', overflow: 'hidden' }}>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }}>
        <h1 style={{ fontSize: '26px', color: '#1a1a1a', marginBottom: '20px', marginTop: 0, fontWeight: 400, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '12px' }}>
          Instructions
        </h1>
        <div style={{ fontSize: '14.5px', color: '#1f2937', lineHeight: '1.85', fontFamily: 'Georgia, serif' }}>
          <p style={{ margin: '0 0 14px' }}>The Buyer shall provide an LPO that will last for three weeks interval.</p>
          <p style={{ margin: '0 0 14px' }}>The LPO shall be raised with the name Masterpiece Energies Ltd (The Seller)</p>
          <p style={{ margin: '0 0 14px' }}>The Buyer shall provide a Bank Guarantee or a Post-Dated Cheque equivalent to the value of the Purchase Order.</p>
          <p style={{ margin: '0 0 14px' }}>Payment shall be made via e-payment to the Seller's designated account. The Seller reserves the right to suspend further deliveries if payments are outstanding beyond the due date.</p>
          <p style={{ margin: 0 }}>Any disputes on invoices must be raised within 5 business days from the date of receipt.</p>
          {/* replace the paragraphs above with your real instructions data */}
        </div>
      </div>

      <div style={{ width: '280px', flexShrink: 0 }}>
        <div style={{ backgroundColor: '#f7d3d9', padding: '20px', borderRadius: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', marginBottom: '16px', fontFamily: 'Arial, sans-serif' }}>
            Keyboard Usage
          </div>
          {[
            ['A', 'Select option A'], ['B', 'Select option B'], ['C', 'Select option C'], ['D', 'Select option D'],
            ['N', 'Next/Forward'], ['P', 'Previous/Back'], ['↑', 'Move up'], ['↓', 'Move down'],
            ['S', isPracticeMode ? 'Complete Study' : 'Submit/End Exam'], ['Y', isPracticeMode ? 'Confirm/End Study' : 'Confirm/End Exam'],
          ].map(([key, label], i) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.06)', fontFamily: 'Arial, sans-serif' }}>
              <div style={{
                width: '26px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: (key === 'S') ? '#e8623f' : '#1a1a1a', color: 'white', fontSize: '12px', fontWeight: 700, borderRadius: '4px', flexShrink: 0
              }}>
                {key}
              </div>
              <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Footer buttons */}
    <div style={{ display: 'flex', gap: '16px', padding: '0 28px 28px', flexShrink: 0 }}>
      <button
        onClick={() => { setScreen('EXAM'); startTimer(timeLeft); }}
        style={{ backgroundColor: '#d8362b', color: 'white', padding: '15px 42px', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.3px' }}
      >
        {isPracticeMode ? 'START STUDY' : isQuizMode ? 'START QUIZ' : 'START EXAM'}
      </button>
      <button
        onClick={() => {
          if (window.api && window.api.setExamActive) {
            window.api.setExamActive(false);
          }
          setScreen('DASHBOARD');
        }}
        style={{ backgroundColor: 'transparent', color: '#e8623f', padding: '15px 42px', fontSize: '16px', fontWeight: 700, border: '2px solid #e8623f', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '0.3px' }}
      >
        CANCEL
      </button>
    </div>
  </div>

  {/* ---------- RIGHT SIDEBAR: candidate ID ---------- */}
  <div style={{ width: '250px', flexShrink: 0, backgroundColor: '#2f6fb0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', boxShadow: '-2px 0 10px rgba(0,0,0,0.1)' }}>
    <div style={{ backgroundColor: 'white', padding: '8px', width: '140px', height: '140px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
          activation?.email
            ? `${activation.email}|${activation.passcode}`
            : 'Candidate-Free'
        )}`}
        alt="QR code"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>

    <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginTop: '18px', marginBottom: '16px', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
      Your Details...
    </div>

    <div style={{ backgroundColor: 'white', width: '130px', height: '140px', overflow: 'hidden', borderRadius: '12px', border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <img
        src={activation?.profile_picture || "https://th.bing.com/th/id/OIP.7O4_GREtLbxqPdJCTmfatQHaHa?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3"}
        alt="Candidate Profile"
        onError={(e) => {
          (e.target as HTMLElement).setAttribute('src', "https://th.bing.com/th/id/OIP.7O4_GREtLbxqPdJCTmfatQHaHa?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=32");
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>

    <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: 800, marginTop: '16px', textAlign: 'center', lineHeight: '1.3', wordBreak: 'break-word', padding: '0 8px' }}>
      {activation ? (activation.user_name || activation.email.split('@')[0]) : 'Candidate (Free)'}
      {activation?.email && (
        <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#e0f2fe', marginTop: '3px' }}>
          {activation.email}
        </div>
      )}
    </div>

    <div style={{ marginTop: '18px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '10px', width: '85%' }}>
      <div style={{ color: '#e0f2fe', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passcode</div>
      <div style={{ color: '#ffffff', fontSize: '19px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px', marginTop: '4px' }}>
        {activation ? activation.passcode : 'FREE-MODE'}
      </div>
    </div>

    <div style={{ flex: 1, minHeight: '20px' }} />
    <div style={{ color: 'white', fontWeight: 800, fontSize: '15px', fontFamily: 'Arial, sans-serif' }}>FILLOP TECH</div>
    <div style={{ color: '#cfe0f0', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>...simplifying your tech world</div>
  </div>
</div>
)}

    {/* ================= EXAM SCREEN ================= */}
{screen === 'EXAM' && examQuestions.length > 0 && (() => {
  const curQ = examQuestions[currentIdx];
  const curSubId = curQ?.subject_id;
  const curSubName = curQ?.subject_name || examSubjects.find(s => s.id === curSubId)?.name;

  // Filter questions that belong ONLY to the active subject tab
  const activeSubjectQuestions = examQuestions.filter(q => curSubId ? q.subject_id === curSubId : true);
  const activeSubIndex = activeSubjectQuestions.findIndex(q => q.id === curQ?.id);
  const activeSubAttemptedCount = activeSubjectQuestions.filter(q => !!answers[q.id]).length;

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#d7ecf7',  overflow: 'hidden', fontFamily: 'Georgia, "Times New Roman", serif' }}>

      {/* ---------- MAIN COLUMN ---------- */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>

        {/* Top bar: subjects / calculator / timer / submit */}
        <div style={{ height: '64px', backgroundColor: '#c3e2ed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {examSubjects.map((sub) => {
              const isActive = sub.id === curSubId;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    const targetIdx = examQuestions.findIndex(q => q.subject_id === sub.id);
                    if (targetIdx !== -1) setCurrentIdx(targetIdx);
                  }}
                  style={{
                    backgroundColor: isActive ? '#1e4620' : '#2f6fb0',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '8px 14px',
                    borderRadius: '4px',
                    letterSpacing: '0.3px',
                    fontFamily: 'Arial, sans-serif',
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {sub.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div onClick={() => setIsCalcOpen(!isCalcOpen)} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#2f6fb0', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Calculator size={18} color="white" />
            </div>
            <div style={{ color: '#1e3a5f', fontSize: '11px', fontFamily: 'Arial, sans-serif', marginTop: '4px' }}>Calculator</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700, fontSize: '17px', fontFamily: 'Arial, sans-serif' }}>
            <Clock size={18} />
            {formatTimer(timeLeft)}
          </div>

          <button
            onClick={manualSubmitExam}
            style={{ background: 'none', border: 'none', color: '#b3261e', fontSize: '17px', fontWeight: 700, fontFamily: 'Georgia, serif', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Submit
          </button>
        </div>

        {/* Subject / question label + MODE badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 0' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e6b3c', fontFamily: 'Arial, sans-serif' }}>
              {curSubName ? curSubName.toUpperCase() : ''}
            </div>
            <div style={{ fontSize: '14px', color: '#374151', marginTop: '10px' }}>
              Question {activeSubIndex !== -1 ? activeSubIndex + 1 : currentIdx + 1}
            </div>
          </div>
          <div style={{ backgroundColor: '#e8623f', color: 'white', fontWeight: 700, fontSize: '12px', padding: '6px 14px', borderRadius: '4px', letterSpacing: '0.5px', fontFamily: 'Arial, sans-serif' }}>
            {isPracticeMode ? 'STUDY MODE' : isQuizMode ? 'DAILY QUIZ MODE' : 'EXAM MODE'}
          </div>
        </div>

        {/* Question + options */}
        <div id="examQuestionContentPanel" style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 20px' }}>
          <p style={{ fontSize: '17px', lineHeight: 1.7, color: '#1a1a1a', marginTop: '18px', marginBottom: '32px' }}>
            {curQ.question_text}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { key: 'A', text: curQ.option_a },
              { key: 'B', text: curQ.option_b },
              { key: 'C', text: curQ.option_c },
              { key: 'D', text: curQ.option_d },
            ].map((opt) => {
              const isSelected = answers[curQ.id] === opt.key;
              const isLockedInStudy = isPracticeMode && (revealExplanation || !!revealedQuestions[curQ.id]);
              return (
                <div
                  key={opt.key}
                  onClick={() => {
                    if (isLockedInStudy) return;
                    selectAnswer(opt.key as any);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0',
                    cursor: isLockedInStudy ? 'not-allowed' : 'pointer', fontSize: '16px', color: '#1a1a1a',
                    opacity: isLockedInStudy && !isSelected ? 0.6 : 1
                  }}
                >
                  <span style={{ fontWeight: 700 }}>({opt.key})</span>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#1e4620' : '#4b5563'}`,
                    backgroundColor: isSelected ? '#1e4620' : 'transparent',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  <span>{opt.text}</span>
                </div>
              );
            })}
          </div>

          {/* Practice Mode: Toggle View Answer / Explanation */}
          {isPracticeMode && (
            <div style={{ marginTop: '24px', borderTop: '1px dashed rgba(0,0,0,0.15)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  disabled={!answers[curQ?.id]}
                  onClick={() => {
                    if (!revealExplanation && curQ?.id) {
                      setRevealedQuestions(prev => ({ ...prev, [curQ.id]: true }));
                    }
                    setRevealExplanation(!revealExplanation);
                  }}
                  style={{
                    fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px',
                    padding: '10px 16px', borderRadius: '6px', border: 'none',
                    backgroundColor: revealExplanation ? '#fde8d3' : '#dbeafe',
                    color: revealExplanation ? '#b45309' : '#1d4ed8',
                    opacity: answers[curQ?.id] ? 1 : 0.5,
                    cursor: answers[curQ?.id] ? 'pointer' : 'not-allowed',
                  }}
                >
                  {revealExplanation ? 'Hide Answer & Explanation' : 'View Correct Answer & Explanation'}
                </button>

                {!answers[curQ?.id] && (
                  <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>
                    (Select an option first to view explanation)
                  </span>
                )}
              </div>

              {revealExplanation && answers[curQ?.id] && (
                <div style={{ marginTop: '14px', padding: '16px', backgroundColor: 'white', borderRadius: '10px', fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#1e6b3c' }}>
                      Correct Answer: Option {curQ.correct_answer}
                    </span>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', textTransform: 'uppercase', fontWeight: 700, color: '#4b5563' }}>
                      Difficulty: {curQ.difficulty || 'medium'}
                    </span>
                  </div>

                  {curQ.correct_explanation && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Explanation:</strong> {curQ.correct_explanation}
                    </div>
                  )}

                  {curQ.topic_explanation && (
                    <div style={{ color: '#4b5563' }}>
                      <strong>Topic Insight:</strong> {curQ.topic_explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PREVIOUS / NEXT */}
        <div style={{ display: 'flex', gap: '16px', padding: '0 28px', flexShrink: 0 , marginTop:"120px !important"}}>
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
            style={{
              backgroundColor: '#2f6fb0', color: 'white', padding: '12px 28px', fontSize: '14px', fontWeight: 700,
              border: 'none', borderRadius: '6px', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIdx === 0 ? 0.5 : 1, fontFamily: 'Arial, sans-serif', letterSpacing: '0.3px',
            }}
          >
            PREVIOUS
          </button>
          {currentIdx < examQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(prev => prev + 1)}
              style={{ backgroundColor: '#2f6fb0', color: 'white', padding: '12px 28px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Arial, sans-serif', letterSpacing: '0.3px' }}
            >
              NEXT
            </button>
          ) : (
            <button
              onClick={manualSubmitExam}
              style={{ backgroundColor: '#d8362b', color: 'white', padding: '12px 28px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Arial, sans-serif', letterSpacing: '0.3px' }}
            >
              {isPracticeMode ? 'COMPLETE STUDY' : isQuizMode ? 'COMPLETE QUIZ' : 'COMPLETE EXAM'}
            </button>
          )}
        </div>

        {/* Question palette - Filtered to Active Subject ONLY */}
        <div style={{ padding: '18px 28px 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {activeSubjectQuestions.map((q, subIdx) => {
              const globalIdx = examQuestions.findIndex(gq => gq.id === q.id);
              const isCurrent = globalIdx === currentIdx;
              const isAnswered = !!answers[q.id];
              const bg = isCurrent ? '#2563eb' : isAnswered ? '#16a34a' : '#dc2626';
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(globalIdx)}
                  style={{
                    width: '30px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: bg, color: 'white', fontSize: '12px', fontWeight: 700, borderRadius: '3px',
                    border: 'none', cursor: 'pointer', fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {subIdx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: info + active question details */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 28px', flexShrink: 0, marginTop: 'auto' }}>
          <button
            type="button"
            onClick={() => {
              alert(
                `Active Question Information:\n\n` +
                `Subject: ${curSubName ? curSubName.toUpperCase() : 'N/A'}\n` +
                `Question Number: Question ${activeSubIndex !== -1 ? activeSubIndex + 1 : currentIdx + 1} of ${activeSubjectQuestions.length}\n` +
                `Subject Attempted: ${activeSubAttemptedCount} of ${activeSubjectQuestions.length}\n` +
                `Overall Session: Question ${currentIdx + 1} of ${examQuestions.length}\n` +
                `Topic: ${(curQ as any)?.topic_name || 'General Syllabus'}\n` +
                `Exam Source: ${(curQ as any)?.year || '2025'} ${(curQ as any)?.exam_type || examType}`
              );
            }}
            style={{
              border: '1px solid #1e3a8a',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'Arial, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            INFO
          </button>
          <div style={{ fontSize: '13px', color: '#1f2937', lineHeight: 1.5 }}>
            <div>
              Question {activeSubIndex !== -1 ? activeSubIndex + 1 : currentIdx + 1} of {activeSubjectQuestions.length} (Attempted {activeSubAttemptedCount} of {activeSubjectQuestions.length})
            </div>
            <div>
              {curSubName ? `${curSubName.toUpperCase()}` : ''}
              {(curQ as any)?.topic_name ? ` • ${(curQ as any).topic_name}` : ''}
              {` • Extract of ${(curQ as any)?.year || '2025'} ${(curQ as any)?.exam_type || examType} past questions`}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- RIGHT SIDEBAR: candidate ID ---------- */}
      <div style={{ width: '250px', flexShrink: 0, backgroundColor: '#2f6fb0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', boxShadow: '-2px 0 10px rgba(0,0,0,0.1)' }}>
        <div style={{ backgroundColor: 'white', padding: '8px', width: '140px', height: '140px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
              activation?.email
                ? `${activation.email}|${activation.passcode}`
                : 'Candidate-Free'
            )}`}
            alt="QR code"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginTop: '18px', marginBottom: '16px', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
          Your Details...
        </div>

        <div style={{ backgroundColor: 'white', width: '130px', height: '140px', overflow: 'hidden', borderRadius: '12px', border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <img
            src={activation?.profile_picture || "https://th.bing.com/th/id/OIP.7O4_GREtLbxqPdJCTmfatQHaHa?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3"}
            alt="Candidate Profile"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute('src', "https://i.pravatar.cc/150?img=12");
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: 800, marginTop: '16px', textAlign: 'center', lineHeight: '1.3', wordBreak: 'break-word', padding: '0 8px' }}>
          {activation ? (activation.user_name || activation.email.split('@')[0]) : 'Candidate (Free)'}
          {activation?.email && (
            <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#e0f2fe', marginTop: '3px' }}>
              {activation.email}
            </div>
          )}
        </div>

        <div style={{ marginTop: '18px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '10px', width: '85%' }}>
          <div style={{ color: '#e0f2fe', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passcode</div>
          <div style={{ color: '#ffffff', fontSize: '19px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px', marginTop: '4px' }}>
            {activation ? activation.passcode : 'FREE-MODE'}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: '20px' }} />
        <div style={{ color: 'white', fontWeight: 800, fontSize: '15px', fontFamily: 'Arial, sans-serif' }}>FILLOP TECH</div>
        <div style={{ color: '#cfe0f0', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>...simplifying your tech world</div>
      </div>
    </div>
  );
})()}

          {/* ================= RESULT SCREEN ================= */}
          {screen === 'RESULT' && activeResult && (
            <div style={{ maxWidth: '560px', margin: '40px auto' }}>
              <div style={styles.card}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: colors.success }}>
                    {isPracticeMode ? 'Study Session Completed' : isQuizMode ? 'Daily Quiz Completed' : 'Exam Completed'}
                  </h1>
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

                {/* Result Share Options */}
                <div style={{ marginTop: '24px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: colors.textSecondary, marginBottom: '12px' }}>
                    Share Competition / Test Result
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      style={{ ...styles.btn, backgroundColor: '#25D366', color: 'white' }}
                      onClick={() => {
                        const shareUrl = `https://cbt.filloptech.com/results.php?result=${activeResult.id}`;
                        const text = `I scored ${activeResult.score}/${activeResult.total_questions} (${activeResult.percentage.toFixed(0)}%) in my ${activeResult.exam_type} test on Fillop CBT Guru! View full result online: ${shareUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      <Share2 size={14} /> WhatsApp
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnSecondary }}
                      onClick={() => {
                        const shareUrl = `https://cbt.filloptech.com/results.php?result=${activeResult.id}`;
                        const text = `I scored ${activeResult.score}/${activeResult.total_questions} (${activeResult.percentage.toFixed(0)}%) in my ${activeResult.exam_type} test on Fillop CBT Guru!\n\nView full result online: ${shareUrl}`;
                        window.open(`mailto:?subject=Fillop CBT Result&body=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      Email
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnSecondary }}
                      onClick={() => {
                        const text = `I scored ${activeResult.score}/${activeResult.total_questions} (${activeResult.percentage.toFixed(0)}%) in my ${activeResult.exam_type} test on Fillop CBT Guru!`;
                        navigator.clipboard.writeText(text);
                        alert("Result summary copied to clipboard!");
                      }}
                    >
                      Copy Text
                    </button>
                  </div>
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

                      {!isQuizMode && (q.correct_explanation || q.topic_explanation) && (
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

      {/* First Activation Welcome Modal */}
      {showWelcomeModal && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modal, maxWidth: '520px', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: colors.primaryLight, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trophy size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: colors.text, margin: '0 0 8px' }}>
                Welcome to Fillop CBT Guru!
              </h2>
              <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
                Your subscription has been successfully activated. Prepare fully offline for your JAMB, WAEC, or NECO examinations.
              </p>
            </div>

            <div style={{ backgroundColor: colors.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '24px', fontSize: '13px', color: colors.text, lineHeight: 1.6 }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: colors.primary }}>Quick Instructions:</strong>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Select Practice Mode to study topic-by-topic with detailed explanations.</li>
                <li>Take timed Mock Exams to simulate real exam hall conditions.</li>
                <li>Check your Performance Analytics to track score progress over time.</li>
                <li>All question banks and past papers function 100% offline.</li>
              </ul>
            </div>

            <button
              style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px', fontWeight: 700 }}
              onClick={() => setShowWelcomeModal(false)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* ================= LEADERBOARD MODAL ================= */}
      {showLeaderboard && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '24px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px 32px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Header / Title Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={22} color={colors.primary} />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: colors.text }}>Candidate Leaderboard</h2>
                  <span style={{ fontSize: '12px', color: colors.textSecondary }}>Top performing candidates on Fillop CBT</span>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  fontSize: '22px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Timeframe Filter Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              {['Week', 'Month', 'Year', 'All time'].map((tf) => {
                const isActive = (leaderboardTimeframe.toLowerCase().includes('week') && tf === 'Week') ||
                  (leaderboardTimeframe.toLowerCase().includes('all') && tf === 'All time') ||
                  (leaderboardTimeframe === tf);
                return (
                  <button
                    key={tf}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: isActive ? colors.primary : (isDarkMode ? '#2d2d2d' : '#f1f5f9'),
                      color: isActive ? '#ffffff' : colors.textSecondary,
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setLeaderboardTimeframe(tf)}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>

            {leaderboardLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>
                Fetching live performance rankings...
              </div>
            ) : leaderboardData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>
                No leaderboard entries available for this period.
              </div>
            ) : (
              <>
                {/* Podium Cards for Top 3 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                  {[1, 0, 2].map((rankIdx) => {
                    const candidate = leaderboardData[rankIdx];
                    if (!candidate) return <div key={rankIdx} />;
                    const rankNum = rankIdx + 1;
                    const isFirst = rankNum === 1;
                    const crownBg = isFirst ? '#f59e0b' : rankNum === 2 ? '#94a3b8' : '#cd7f32';
                    const name = candidate.email ? candidate.email.split('@')[0] : 'Candidate';
                    const avgPct = candidate.average_percentage ? Number(candidate.average_percentage).toFixed(0) : '0';

                    return (
                      <div
                        key={rankIdx}
                        style={{
                          backgroundColor: isFirst ? colors.primary : (isDarkMode ? '#27272a' : '#e0e7ff'),
                          color: isFirst ? '#ffffff' : colors.text,
                          borderRadius: '20px',
                          padding: '20px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          boxShadow: isFirst ? '0 10px 20px -3px rgba(29, 48, 144, 0.4)' : 'none',
                          transform: isFirst ? 'scale(1.05)' : 'none',
                          zIndex: isFirst ? 2 : 1
                        }}
                      >
                        {/* Crown Badge */}
                        <div style={{
                          position: 'relative',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            width: '28px',
                            height: '20px',
                            backgroundColor: crownBg,
                            clipPath: 'polygon(0% 100%, 0% 20%, 25% 60%, 50% 0%, 75% 60%, 100% 20%, 100% 100%)',
                            margin: '0 auto 4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 900,
                            color: '#fff'
                          }} />
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: `3px solid ${isFirst ? '#ffffff' : crownBg}`,
                            backgroundColor: colors.surface
                          }}>
                            <img
                              src={`https://i.pravatar.cc/150?u=${encodeURIComponent(candidate.email)}`}
                              alt={name}
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute('src', "https://th.bing.com/th/id/OIP.7O4_GREtLbxqPdJCTmfatQHaHa?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3");
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '2px', wordBreak: 'break-word', width: '100%' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '8px' }}>
                          {candidate.exam_type || 'JAMB'} • {candidate.total_exams || 1} Tests
                        </div>
                        <div style={{
                          backgroundColor: isFirst ? 'rgba(255, 255, 255, 0.2)' : 'rgba(29, 48, 144, 0.12)',
                          color: isFirst ? '#ffffff' : colors.primary,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 800
                        }}>
                          {avgPct}% Avg
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Remaining Rankings List (4+) */}
                {leaderboardData.length > 3 && (
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: colors.text, marginBottom: '14px' }}>
                      Other Featured Candidates ›
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {leaderboardData.slice(3).map((candidate, idx) => {
                        const rankNum = idx + 4;
                        const name = candidate.email ? candidate.email.split('@')[0] : 'Candidate';
                        const avgPct = candidate.average_percentage ? Number(candidate.average_percentage).toFixed(0) : '0';

                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                              border: `1px solid ${colors.border}`,
                              borderRadius: '16px',
                              padding: '12px 18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', backgroundColor: colors.border, flexShrink: 0 }}>
                                <img
                                  src={`https://i.pravatar.cc/150?u=${encodeURIComponent(candidate.email)}`}
                                  alt={name}
                                  onError={(e) => {
                                    (e.target as HTMLElement).setAttribute('src', "https://th.bing.com/th/id/OIP.7O4_GREtLbxqPdJCTmfatQHaHa?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3");
                                  }}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '14px', color: colors.text }}>{name}</div>
                                <div style={{ fontSize: '11px', color: colors.textMuted }}>
                                  Average Score: <strong style={{ color: colors.primary }}>{avgPct}%</strong> • Total Tests: {candidate.total_exams || 1}
                                </div>
                              </div>
                            </div>

                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: colors.primaryLight,
                              color: colors.primary,
                              fontWeight: 800,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {rankNum}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
              
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 500, color: colors.text, marginBottom: '12px' }}>
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
                Buy Now / Upgrade 
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
            <h2>{isPracticeMode ? 'Complete Study?' : isQuizMode ? 'Submit Quiz?' : 'Submit Exam?'}</h2>
            <p style={{ margin: '16px 0', fontSize: '14px', color: colors.textSecondary }}>
              Press 'Y' or click Confirm to {isPracticeMode ? 'complete your study session' : isQuizMode ? 'submit your quiz' : 'submit your exam'}. Press 'ESC' key or click Cancel to close this box.
            </p>
            <button onClick={() => { setShowSubmitConfirm(false); processSubmission(); }} style={{ ...styles.btn, ...styles.btnSuccess, marginRight: '10px' }}>
              Confirm (Y)
            </button>
            <button onClick={() => setShowSubmitConfirm(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>
              Cancel (ESC)
            </button>
          </div>
        </div>
      )}

      {/* ================= SCIENTIFIC CALCULATOR MODAL ================= */}
      {isCalcOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${calcPos.x}px`,
            top: `${calcPos.y}px`,
            width: '320px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
            zIndex: 999999,
            overflow: 'hidden',
            border: '1px solid #334155',
            userSelect: 'none'
          }}
        >
          {/* Header / Drag Bar */}
          <div
            onMouseDown={(e) => setDragStart({ x: e.clientX - calcPos.x, y: e.clientY - calcPos.y })}
            style={{
              padding: '10px 14px',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              cursor: 'grab',
              fontSize: '13px',
              fontWeight: 700,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Scientific Calculator</span>
            </div>
            <button
              onClick={() => setIsCalcOpen(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          {/* Display */}
          <div style={{ padding: '12px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', height: '14px', textAlign: 'right', overflow: 'hidden' }}>
              {calcDisplay || '0'}
            </div>
            <input
              type="text"
              readOnly
              value={calcDisplay || '0'}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '22px',
                fontWeight: 700,
                textAlign: 'right',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* Keypad */}
          <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {[
              'sin(', 'cos(', 'tan(', 'C',
              'sqrt(', 'log(', 'ln(', 'DEL',
              'π', 'e', '^', '/',
              '7', '8', '9', '×',
              '4', '5', '6', '-',
              '1', '2', '3', '+',
              '(', '0', '.', '='
            ].map((btn) => {
              const isOp = ['/', '×', '-', '+', '='].includes(btn);
              const isAction = ['C', 'DEL'].includes(btn);
              const isFunc = ['sin(', 'cos(', 'tan(', 'sqrt(', 'log(', 'ln(', 'π', 'e', '^'].includes(btn);

              return (
                <button
                  key={btn}
                  onClick={() => handleCalcInput(btn)}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isAction ? '#ef4444' : isOp ? '#0284c7' : isFunc ? '#334155' : '#475569',
                    color: '#ffffff',
                    fontSize: isFunc ? '11px' : '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'opacity 0.1s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  {btn}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
