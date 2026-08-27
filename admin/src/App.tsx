import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  Key,
  RefreshCw,
  Building2,
  DollarSign,
  Tag,
  BookOpen,
  Newspaper,
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart,
  Sun,
  Moon,
  Plus,
  Trash2,
  Edit,
  Clock,
  ArrowUpRight,
  Check,
  X,
  Award,
  Activity,
  Layers,
  Settings,
  Zap,
  Sparkles,
  HelpCircle,
  BarChart2,
  Calendar,
  CheckSquare,
  FileCheck
} from 'lucide-react';
import fillopIcon from './icon.png';

const API_BASE = 'https://cbt.filloptech.com/api/v1';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('admin_theme') as 'light' | 'dark') || 'light';
  });

  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'RESULTS' | 'USERS' | 'PASSCODES' | 'UPGRADES' | 'INSTITUTIONS' | 'PRICING' | 'PROMOS' | 'QUESTIONS' | 'NEWS' | 'UPDATES'
  >('DASHBOARD');

  // Stats
  const [stats, setStats] = useState({
    total_users: 0,
    active_passcodes: 0,
    suspended_passcodes: 0,
    estimated_revenue: 0,
    total_questions: 0,
    total_promos: 0,
  });

  // Results & Analytics
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<{
    subject_performance: any[];
    topic_analysis: {
      strong_areas: any[];
      improvement_areas: any[];
      weak_areas: any[];
    };
    progress_tracking: {
      daily: any[];
      weekly: any[];
      monthly: any[];
    };
  }>({
    subject_performance: [],
    topic_analysis: { strong_areas: [], improvement_areas: [], weak_areas: [] },
    progress_tracking: { daily: [], weekly: [], monthly: [] }
  });

  // Data lists
  const [users, setUsers] = useState<any[]>([]);
  const [passcodes, setPasscodes] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [updatesList, setUpdatesList] = useState<any[]>([]);

  // Search/Filters
  const [userSearch, setUserSearch] = useState('');
  const [questionExamFilter, setQuestionExamFilter] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');

  // Notifications
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Pricing settings state
  const [pricingForm, setPricingForm] = useState({
    single_passcode_price_6m: 1400,
    small_bulk_price_6m: 1100,
    large_bulk_price_6m: 1000
  });

  // Dynamic Subjects & Topics from Database
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [dbTopics, setDbTopics] = useState<any[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState<number | ''>('');

  // New Passcode Form
  const [newPasscodeForm, setNewPasscodeForm] = useState({
    email: '',
    quantity: 1,
    max_devices: 1,
    duration_days: 180,
    organization_name: '',
    organization_type: 'Secondary School',
    contact_person: '',
    contact_phone: '',
    exam_category: 'JAMB',
    allowed_subjects: [] as string[],
  });

  // Institutional Account Form
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    type: 'Secondary School',
    contact_person: '',
    contact_email: '',
    contact_phone: ''
  });

  // New Promo Form
  const [newPromoForm, setNewPromoForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 20,
    max_uses: 100,
    expires_at: '',
  });

  // New Question Form
  const [newQuestionForm, setNewQuestionForm] = useState({
    exam_type: 'JAMB',
    subject_id: 1,
    year: 2024,
    topic_id: 1,
    difficulty: 'medium',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
  });

  // Software Update Form
  const [newUpdateForm, setNewUpdateForm] = useState({
    version: '',
    firmware: '',
    improvements: '',
    size: '45.0 MB',
    url: ''
  });

  // Bulk Import
  const [csvInput, setCsvInput] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // News Form
  const [newNewsForm, setNewNewsForm] = useState({
    title: '',
    content: '',
    icon_name: 'newspaper',
    thumbnail_url: '',
    published_at: new Date().toISOString().slice(0, 16)
  });
  const [uploadingNewsImage, setUploadingNewsImage] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchSubjectsAndTopics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_subjects_and_topics' }),
      });
      const data = await res.json();
      if (data.success) {
        setDbSubjects(data.subjects || []);
        setDbTopics(data.topics || []);

        // Default allowed_subjects for passcode form if empty
        if (data.subjects && data.subjects.length > 0 && newPasscodeForm.allowed_subjects.length === 0) {
          const jambSubjs = data.subjects.filter((s: any) => s.exam_type === 'JAMB').map((s: any) => s.name).slice(0, 4);
          setNewPasscodeForm(prev => ({ ...prev, allowed_subjects: jambSubjs }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch subjects and topics', e);
    }
  };

  const fetchStatsAndAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics.php`);
      const data = await res.json();
      if (data.success) {
        setStats(data.analytics);
        if (data.results) setResultsList(data.results);
        if (data.performance) setPerformanceData(data.performance);
      }
    } catch (e) {
      console.error('Failed to load stats & analytics', e);
    }
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch(`${API_BASE}/pricing.php`);
      const data = await res.json();
      if (data.success && data.pricing) {
        setPricingForm({
          single_passcode_price_6m: data.pricing.single_passcode_price_6m || 1400,
          small_bulk_price_6m: data.pricing.small_bulk_price_6m || 1100,
          large_bulk_price_6m: data.pricing.large_bulk_price_6m || 1000
        });
      }
    } catch (e) {
      console.error('Failed to load pricing settings', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users.php?search=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to load users', e);
    }
  };

  const fetchPasscodes = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`);
      const data = await res.json();
      if (data.success) {
        setPasscodes(data.passcodes || []);
        setOrganizations(data.organizations || []);
        setUpgrades(data.upgrades || []);
      }
    } catch (e) {
      console.error('Failed to load passcodes', e);
    }
  };

  const fetchPromos = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/promo_codes.php`);
      const data = await res.json();
      if (data.success) {
        setPromos(data.promo_codes);
      }
    } catch (e) {
      console.error('Failed to load promos', e);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/admin/questions.php?exam_type=${questionExamFilter}&subject_id=${questionSubjectFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error('Failed to load questions', e);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`);
      const data = await res.json();
      if (data.success) {
        setNews(data.news);
      }
    } catch (e) {
      console.error('Failed to load news', e);
    }
  };

  const fetchUpdates = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/updates.php`);
      const data = await res.json();
      if (data.success) {
        setUpdatesList(data.updates || []);
      }
    } catch (e) {
      console.error('Failed to load software updates:', e);
    }
  };

  useEffect(() => {
    fetchSubjectsAndTopics();
    fetchStatsAndAnalytics();
    fetchPricing();
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'PASSCODES' || activeTab === 'INSTITUTIONS' || activeTab === 'UPGRADES') fetchPasscodes();
    if (activeTab === 'PROMOS') fetchPromos();
    if (activeTab === 'QUESTIONS') fetchQuestions();
    if (activeTab === 'NEWS') fetchNews();
    if (activeTab === 'UPDATES') fetchUpdates();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'USERS') return;
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(handler);
  }, [userSearch]);

  useEffect(() => {
    if (activeTab === 'QUESTIONS') {
      fetchQuestions();
    }
  }, [questionExamFilter, questionSubjectFilter]);

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/pricing.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Pricing settings updated successfully!");
        fetchPricing();
      } else {
        showNotification(data.message || "Failed to update pricing.", 'error');
      }
    } catch (e) {
      showNotification("Update pricing failed.", 'error');
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_organization', ...newOrgForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Institutional account created successfully!");
        fetchPasscodes();
        setNewOrgForm({
          name: '',
          type: 'Secondary School',
          contact_person: '',
          contact_email: '',
          contact_phone: ''
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification("Create organization failed.", 'error');
    }
  };

  const handleGeneratePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_generate', ...newPasscodeForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Generated ${data.quantity} passcode(s) successfully!`);
        fetchPasscodes();
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to generate passcodes.', 'error');
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectForTopic || !newTopicName.trim()) {
      showNotification('Please select a subject and enter a topic name.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_topic',
          subject_id: Number(selectedSubjectForTopic),
          topic_name: newTopicName.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Topic created successfully!');
        setNewTopicName('');
        fetchSubjectsAndTopics();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Create topic failed.', 'error');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newQuestionForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Question added successfully!');
        fetchQuestions();
        fetchStatsAndAnalytics();
        setNewQuestionForm({
          exam_type: 'JAMB',
          subject_id: dbSubjects[0]?.id || 1,
          year: 2024,
          topic_id: 1,
          difficulty: 'medium',
          question_text: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: 'A',
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to add question.', 'error');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportErrors([]);
    setImportSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_import', csv_data: csvInput }),
      });
      const data = await res.json();

      if (data.success) {
        setImportSuccessMsg(data.message);
        showNotification('Bulk import completed!');
        setCsvInput('');
        fetchQuestions();
        fetchStatsAndAnalytics();
      } else {
        if (data.errors && data.errors.length > 0) {
          setImportErrors(data.errors);
        }
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Bulk import call failed.', 'error');
    }
  };

  const renderSVGChart = (chartData: any[], color: string) => {
    if (!chartData || chartData.length === 0) return null;
    const maxVal = Math.max(...chartData.map(d => d.score), 100);
    const height = 140;
    const width = 360;
    const padding = 25;

    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - (d.score / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {chartData.map((d, i) => {
          const x = padding + (i / (chartData.length - 1 || 1)) * (width - padding * 2);
          const y = height - padding - (d.score / maxVal) * (height - padding * 2);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill={color} />
              <text x={x} y={y - 8} fontSize="10" textAnchor="middle" fill="var(--text-secondary)" fontWeight="600">
                {d.score}%
              </text>
              <text x={x} y={height - 5} fontSize="10" textAnchor="middle" fill="var(--text-secondary)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Available subject options grouped from DB
  const availableSubjectNames = Array.from(new Set(dbSubjects.map(s => s.name)));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
           <img
              src={fillopIcon}
              alt="Fillop Icon"
              style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'contain' }}
            />
          <span>Fillop Admin</span>
        </div>
        <nav className="sidebar-menu">
          <button className={`menu-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <LayoutDashboard size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Dashboard
          </button>
          <button className={`menu-btn ${activeTab === 'RESULTS' ? 'active' : ''}`} onClick={() => setActiveTab('RESULTS')}>
            <BarChart3 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Uploaded Results &amp; Analytics
          </button>
          <button className={`menu-btn ${activeTab === 'USERS' ? 'active' : ''}`} onClick={() => setActiveTab('USERS')}>
            <Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Candidates
          </button>
          <button className={`menu-btn ${activeTab === 'PASSCODES' ? 'active' : ''}`} onClick={() => setActiveTab('PASSCODES')}>
            <Key size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Passcodes
          </button>
          <button className={`menu-btn ${activeTab === 'UPGRADES' ? 'active' : ''}`} onClick={() => setActiveTab('UPGRADES')}>
            <RefreshCw size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Upgrade Queue
          </button>
          <button className={`menu-btn ${activeTab === 'INSTITUTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('INSTITUTIONS')}>
            <Building2 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Institutions
          </button>
          <button className={`menu-btn ${activeTab === 'PRICING' ? 'active' : ''}`} onClick={() => setActiveTab('PRICING')}>
            <DollarSign size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Pricing Settings
          </button>
          <button className={`menu-btn ${activeTab === 'PROMOS' ? 'active' : ''}`} onClick={() => setActiveTab('PROMOS')}>
            <Tag size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Promo Codes
          </button>
          <button className={`menu-btn ${activeTab === 'QUESTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTIONS')}>
            <BookOpen size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Question Bank
          </button>
          <button className={`menu-btn ${activeTab === 'NEWS' ? 'active' : ''}`} onClick={() => setActiveTab('NEWS')}>
            <Newspaper size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Admin News
          </button>
          <button className={`menu-btn ${activeTab === 'UPDATES' ? 'active' : ''}`} onClick={() => setActiveTab('UPDATES')}>
            <Settings size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Software Release
          </button>
        </nav>
      </aside>

      <main className="admin-body">
        {notification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: notification.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '6px',
            zIndex: 1000,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            {notification.text}
          </div>
        )}

        <header className="admin-header">
          <div>
            <h1 className="admin-title">
              {activeTab === 'DASHBOARD' && 'Management Dashboard'}
              {activeTab === 'RESULTS' && 'Uploaded Results & Performance Analytics'}
              {activeTab === 'USERS' && 'Candidates / Subscriptions'}
              {activeTab === 'PASSCODES' && 'Passcode Subject Allocations & Licensing'}
              {activeTab === 'UPGRADES' && 'Passcode Upgrade Requests & Logs'}
              {activeTab === 'INSTITUTIONS' && 'Institutional Licensing & Bulk Accounts'}
              {activeTab === 'PRICING' && 'Dynamic Pricing Configuration'}
              {activeTab === 'PROMOS' && 'Promotions & Referral Codes'}
              {activeTab === 'QUESTIONS' && 'Question Bank Master Management'}
              {activeTab === 'NEWS' && 'Admin News Management'}
              {activeTab === 'UPDATES' && 'Software Release Management'}
            </h1>
            <p className="admin-subtitle">Fillop CBT Guru Cloud Admin Panel</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={toggleTheme}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0.9rem' }}
              title="Toggle Light / Dark Mode"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
           
          </div>
        </header>

        {activeTab === 'DASHBOARD' && (
          <div>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-val">{stats.total_users}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Passcodes</div>
                <div className="stat-val" style={{ color: 'var(--success)' }}>{stats.active_passcodes}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Suspended Codes</div>
                <div className="stat-val" style={{ color: 'var(--danger)' }}>{stats.suspended_passcodes}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Estimated Revenue</div>
                <div className="stat-val" style={{ color: 'var(--warning)' }}>₦{(stats.estimated_revenue).toLocaleString()}</div>
              </div>
            </div>

            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} /> Subject Access Control &amp; Usage Overview
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Fillop CBT Guru manages database subjects dynamically.
                Currently, <strong>{stats.total_questions} questions</strong> are active across all database subjects and exam categories.
              </p>
              <button className="btn btn-secondary" onClick={fetchStatsAndAnalytics} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} /> Refresh Core Analytics
              </button>
            </div>
          </div>
        )}

        {activeTab === 'RESULTS' && (
          <div>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-label">Total Results Uploaded</div>
                <div className="stat-val" style={{ color: 'var(--accent)' }}>{resultsList.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Average Performance</div>
                <div className="stat-val" style={{ color: 'var(--success)' }}>
                  {resultsList.length > 0
                    ? (resultsList.reduce((acc, r) => acc + r.percentage, 0) / resultsList.length).toFixed(1) + '%'
                    : '0%'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Strong Topics (≥75%)</div>
                <div className="stat-val" style={{ color: 'var(--success)' }}>
                  {performanceData.topic_analysis.strong_areas.length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Weak Topics (&lt;50%)</div>
                <div className="stat-val" style={{ color: 'var(--danger)' }}>
                  {performanceData.topic_analysis.weak_areas.length}
                </div>
              </div>
            </div>

            {/* Topic Analysis: Strong, Improvement, Weak Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="admin-card" style={{ borderLeft: '4px solid var(--success)' }}>
                <h3 className="card-title" style={{ color: 'var(--success)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={18} /> Strong Areas (≥75%)
                </h3>
                {performanceData.topic_analysis.strong_areas.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No strong topics recorded yet.</p>
                ) : (
                  performanceData.topic_analysis.strong_areas.map((item, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>{item.topic}</span>
                      <strong style={{ color: 'var(--success)' }}>{item.accuracy}%</strong>
                    </div>
                  ))
                )}
              </div>

              <div className="admin-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <h3 className="card-title" style={{ color: 'var(--warning)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={18} /> Improvement Areas (50% – 74%)
                </h3>
                {performanceData.topic_analysis.improvement_areas.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No improvement topics recorded yet.</p>
                ) : (
                  performanceData.topic_analysis.improvement_areas.map((item, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>{item.topic}</span>
                      <strong style={{ color: 'var(--warning)' }}>{item.accuracy}%</strong>
                    </div>
                  ))
                )}
              </div>

              <div className="admin-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <h3 className="card-title" style={{ color: 'var(--danger)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} /> Weak Areas (&lt;50%)
                </h3>
                {performanceData.topic_analysis.weak_areas.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No weak topics recorded yet.</p>
                ) : (
                  performanceData.topic_analysis.weak_areas.map((item, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>{item.topic}</span>
                      <strong style={{ color: 'var(--danger)' }}>{item.accuracy}%</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Performance Charts: Daily, Weekly, Monthly */}
            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} /> Candidate Progress Tracking Charts
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} /> Daily Performance Trends
                  </h4>
                  {renderSVGChart(performanceData.progress_tracking.daily, '#3b82f6')}
                </div>

                <div style={{ background: 'var(--primary-light)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={16} /> Weekly Performance Trends
                  </h4>
                  {renderSVGChart(performanceData.progress_tracking.weekly, '#10b981')}
                </div>

                <div style={{ background: 'var(--primary-light)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PieChart size={16} /> Monthly Performance Trends
                  </h4>
                  {renderSVGChart(performanceData.progress_tracking.monthly, '#f59e0b')}
                </div>
              </div>
            </div>

            {/* Subject Performance Breakdown */}
            <div className="admin-card">
              <h2 className="card-title">Subject Performance &amp; Supported Subjects</h2>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Average Accuracy Score</th>
                    <th>Total Tests Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.subject_performance.map((sub, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '600' }}>{sub.subject}</td>
                      <td>
                        <span className={`badge ${sub.average_score >= 70 ? 'badge-success' : sub.average_score >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {sub.average_score}%
                        </span>
                      </td>
                      <td>{sub.tests_taken} candidates</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Uploaded Results Table */}
            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={20} /> Uploaded Candidate Exam Results
              </h2>
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Exam Type</th>
                    <th>Score / Total</th>
                    <th>Percentage</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsList.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No uploaded exam results found yet.</td></tr>
                  ) : (
                    resultsList.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: '600' }}>{r.candidate_name}</td>
                        <td>{r.email}</td>
                        <td><span className="badge badge-info">{r.exam_type}</span></td>
                        <td><strong>{r.score}</strong> / {r.total_questions}</td>
                        <td>
                          <span className={`badge ${r.percentage >= 70 ? 'badge-success' : r.percentage >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                            {r.percentage}%
                          </span>
                        </td>
                        <td>{new Date(r.submitted_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="admin-card">
            <div className="card-title">
              <span>Candidate List</span>
              <input
                type="text"
                placeholder="Search candidates..."
                className="form-input"
                style={{ width: '250px' }}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>School</th>
                  <th>Signed Up At</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No candidates registered yet.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600' }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>{u.state || 'N/A'}</td>
                      <td>{u.school || 'N/A'}</td>
                      <td>{new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'PASSCODES' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Generate Passcodes / Bulk Licensing</h2>
              <form onSubmit={handleGeneratePasscode} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Associated Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="user@example.com"
                    value={newPasscodeForm.email}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity to Generate</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPasscodeForm.quantity}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="500"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Organization Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bright Stars School"
                    value={newPasscodeForm.organization_name}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, organization_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Exam Category</label>
                  <select
                    className="form-input"
                    value={newPasscodeForm.exam_category}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, exam_category: e.target.value })}
                  >
                    <option value="JAMB">JAMB</option>
                    <option value="WAEC">WAEC</option>
                    <option value="NECO">NECO</option>
                    <option value="JAMB,WAEC">JAMB + WAEC</option>
                    <option value="JAMB,WAEC,NECO">ALL (JAMB/WAEC/NECO)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Devices (Seats)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPasscodeForm.max_devices}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, max_devices: parseInt(e.target.value) || 1 })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPasscodeForm.duration_days}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, duration_days: parseInt(e.target.value) || 180 })}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Allowed Subject Combination (Pulled from Database)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: 'var(--primary-light)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {availableSubjectNames.map(sub => {
                      const isChecked = newPasscodeForm.allowed_subjects.includes(sub);
                      return (
                        <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewPasscodeForm({
                                  ...newPasscodeForm,
                                  allowed_subjects: newPasscodeForm.allowed_subjects.filter(s => s !== sub)
                                });
                              } else {
                                setNewPasscodeForm({
                                  ...newPasscodeForm,
                                  allowed_subjects: [...newPasscodeForm.allowed_subjects, sub]
                                });
                              }
                            }}
                          />
                          {sub}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="btn" style={{ height: '42px', gridColumn: '1 / -1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Zap size={16} /> Generate Passcode(s)
                </button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Existing Passcodes &amp; Subject Allocations</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Passcode</th>
                    <th>Linked Email / Org</th>
                    <th>Exam Category</th>
                    <th>Allowed Subjects</th>
                    <th>Device Slots</th>
                    <th>Status</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {passcodes.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No passcodes generated.</td></tr>
                  ) : (
                    passcodes.map((p) => {
                      const isExpired = p.expires_at ? new Date(p.expires_at).getTime() < Date.now() : false;
                      const statusClass = p.status === 'suspended' ? 'badge-danger' : isExpired ? 'badge-warning' : 'badge-success';
                      return (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>{p.passcode}</td>
                          <td>
                            <div>{p.email}</div>
                            {p.organization_name && <small style={{ color: 'var(--text-secondary)' }}>{p.organization_name}</small>}
                          </td>
                          <td><span className="badge badge-info">{p.exam_category || 'ALL'}</span></td>
                          <td style={{ maxWidth: '220px', fontSize: '12px' }}>{p.allowed_subjects || 'All Subjects'}</td>
                          <td>
                            <strong>{p.activated_devices}</strong> / {p.max_devices} slots
                          </td>
                          <td>
                            <span className={`badge ${statusClass}`}>
                              {p.status === 'suspended' ? 'Suspended' : isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                          <td>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Unactivated'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'QUESTIONS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Manage Topics per Subject (Database)</h2>
              <form onSubmit={handleCreateTopic} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Database Subject</label>
                  <select
                    className="form-input"
                    value={selectedSubjectForTopic}
                    onChange={(e) => setSelectedSubjectForTopic(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {dbSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>[{sub.exam_type}] {sub.name} (ID: {sub.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">New Topic Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Organic Chemistry / Matrices"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ height: '42px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> Add Topic
                </button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} /> Bulk CSV Question Management &amp; Validation
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                Upload or paste CSV questions. Accepts human-readable subject names, validates rows, checks for duplicate questions, and imports within a transaction!
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        if (evt.target?.result) {
                          setCsvInput(evt.target.result as string);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </div>

              <form onSubmit={handleBulkImport}>
                <div className="form-group">
                  <label className="form-label">Or Paste Raw CSV Data</label>
                  <textarea
                    className="textarea-csv"
                    placeholder="exam_type,subject,year,topic,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer&#10;JAMB,Mathematics,2024,Quadratic Equations,medium,Find roots of x^2 - 9 = 0,3,9,-3,0,A"
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} /> Process &amp; Start Bulk Import
                </button>
              </form>

              {importSuccessMsg && (
                <div style={{ color: 'var(--success)', marginTop: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> {importSuccessMsg}
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="errors-box">
                  <div className="errors-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} /> Validation Issues Found ({importErrors.length}):
                  </div>
                  <ul className="errors-list">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="admin-card">
              <h2 className="card-title">Add Individual Question</h2>
              <form onSubmit={handleAddQuestion} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem' }}>
                <div className="form-group">
                  <label className="form-label">Exam Type</label>
                  <select
                    className="form-input"
                    value={newQuestionForm.exam_type}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, exam_type: e.target.value })}
                  >
                    <option value="JAMB">JAMB</option>
                    <option value="WAEC">WAEC</option>
                    <option value="NECO">NECO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Subject (Database Table)</label>
                  <select
                    className="form-input"
                    value={newQuestionForm.subject_id}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, subject_id: parseInt(e.target.value) || 1 })}
                  >
                    {dbSubjects
                      .filter(s => s.exam_type === newQuestionForm.exam_type)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.exam_type} - {s.name}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newQuestionForm.year}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, year: parseInt(e.target.value) || 2024 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Select Topic</label>
                  <select
                    className="form-input"
                    value={newQuestionForm.topic_id}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, topic_id: parseInt(e.target.value) || 1 })}
                  >
                    {dbTopics
                      .filter(t => t.subject_id === newQuestionForm.subject_id)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    <option value={0}>+ New Topic or General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-input"
                    value={newQuestionForm.difficulty}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Question Text</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newQuestionForm.question_text}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question_text: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option A</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newQuestionForm.option_a}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option_a: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option B</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newQuestionForm.option_b}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option_b: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option C</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newQuestionForm.option_c}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option_c: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option D</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newQuestionForm.option_d}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option_d: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <select
                    className="form-input"
                    value={newQuestionForm.correct_answer}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correct_answer: e.target.value })}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary" style={{ height: '42px', gridColumn: 'span 3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <FileText size={16} /> Save Question
                </button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Core Question Bank Listing</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Exam</th>
                    <th>Subject</th>
                    <th>Year</th>
                    <th>Question Content</th>
                    <th>Correct Ans</th>
                    <th>Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No questions match filters.</td></tr>
                  ) : (
                    questions.map((q) => (
                      <tr key={q.id}>
                        <td>{q.id}</td>
                        <td><span className="badge badge-info">{q.exam_type}</span></td>
                        <td>{q.subject_name || `Sub #${q.subject_id}`}</td>
                        <td><strong>{q.year}</strong></td>
                        <td style={{ maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.question_text}</td>
                        <td style={{ fontWeight: 'bold' }}>{q.correct_answer}</td>
                        <td><span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>{q.difficulty}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'PRICING' && (
          <div className="admin-card">
            <h2 className="card-title">Modify Dynamic Passcode Pricing Tiers</h2>
            <form onSubmit={handleUpdatePricing} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Single Passcode Price (6 Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.single_passcode_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, single_passcode_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Small Bulk Price (2–9 Codes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.small_bulk_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, small_bulk_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Large Bulk Price (10+ Codes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.large_bulk_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, large_bulk_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success" style={{ height: '42px', gridColumn: '1 / -1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Save Pricing Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'INSTITUTIONS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Create Institutional Account</h2>
              <form onSubmit={handleCreateOrg} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bright Stars Secondary School"
                    value={newOrgForm.name}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization Type</label>
                  <select
                    className="form-input"
                    value={newOrgForm.type}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, type: e.target.value })}
                  >
                    <option value="Secondary School">Secondary School</option>
                    <option value="Tutorial Centre">Tutorial Centre</option>
                    <option value="University">University</option>
                    <option value="Polytechnic">Polytechnic</option>
                    <option value="College of Education">College of Education</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mr. Michael Nwankwo"
                    value={newOrgForm.contact_person}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, contact_person: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="info@brightstars.edu.ng"
                    value={newOrgForm.contact_email}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, contact_email: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn" style={{ height: '42px', gridColumn: '1 / -1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Building2 size={16} /> Create Institutional Account
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
