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
  Sun,
  Moon,
  Trash2,
  Award,
  Settings,
  Zap,
  Calendar,
  FileCheck,
  UserX,
  UserCheck,
  Bell,
  ArrowRight,
  LogOut,
  Layers,
  History,
  BarChart3,
  BarChart2,
  PieChart,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Edit
} from 'lucide-react';
import fillopIcon from './icon.png';
import Login from './Login';
import QuestionWizard from './QuestionWizard';
import SubjectTopicManager from './SubjectTopicManager';
import QuestionBankBrowser from './QuestionBankBrowser';
import { Subject, Topic, Question, UploadLog } from './types';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api/v1'
  : 'https://cbt.filloptech.com/api/v1';

export default function App() {
  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<any>(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('admin_theme') as 'light' | 'dark') || 'light';
  });

  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'RESULTS' | 'USERS' | 'PASSCODES' | 'UPGRADES' | 'INSTITUTIONS' | 'PRICING' | 'PROMOS' | 'QUESTIONS' | 'TOPICS' | 'UPLOAD_LOGS' | 'NEWS' | 'UPDATES'
  >('DASHBOARD');

  // Stats
  const [stats, setStats] = useState({
    total_users: 0,
    active_passcodes: 0,
    suspended_passcodes: 0,
    total_passcodes: 0,
    estimated_revenue: 0,
    total_questions: 0,
    total_promos: 0,
    active_promos: 0,
    pending_upgrades: 0,
    news_count: 0,
    updates_count: 0,
    latest_update_version: 'v3.0.1'
  });

  // Results & Analytics
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>({
    subject_performance: [],
    topic_analysis: { strong_areas: [], improvement_areas: [], weak_areas: [] },
    progress_tracking: { daily: [], weekly: [], monthly: [] }
  });

  // Data lists
  const [users, setUsers] = useState<any[]>([]);
  const [passcodes, setPasscodes] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [dbTopics, setDbTopics] = useState<Topic[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [updatesList, setUpdatesList] = useState<any[]>([]);

  // Search/Filters
  const [userSearch, setUserSearch] = useState('');

  // Notifications
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Pricing settings state
  const [pricingForm, setPricingForm] = useState({
    single_passcode_price_6m: 1400,
    small_bulk_price_6m: 1100,
    large_bulk_price_6m: 1000
  });

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

  // News Form
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
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

  const handleLoginSuccess = (token: string, user: any) => {
    setAuthToken(token);
    setAdminUser(user);
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    showNotification(`Welcome back, ${user.username || 'Admin'}!`);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAdminUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  const fetchSubjectsAndTopics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ action: 'get_subjects_and_topics' }),
      });
      const data = await res.json();
      if (data.success) {
        setDbSubjects(data.subjects || []);
        setDbTopics(data.topics || []);
      }
    } catch (e) {
      console.error('Failed to fetch subjects and topics', e);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error('Failed to load questions', e);
    }
  };

  const fetchUploadLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php?action=upload_logs`);
      const data = await res.json();
      if (data.success) {
        setUploadLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load upload logs', e);
    }
  };

  const fetchStatsAndAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics.php`);
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({ ...prev, ...data.analytics }));
        if (data.results) setResultsList(data.results);
        if (data.performance) setPerformanceData(data.performance);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
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
      console.error('Failed to load pricing', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users.php?search=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPasscodes = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`);
      const data = await res.json();
      if (data.success) setPasscodes(data.passcodes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPromos = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/promo_codes.php`);
      const data = await res.json();
      if (data.success) setPromos(data.promo_codes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`);
      const data = await res.json();
      if (data.success) setNews(data.news || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUpdates = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/updates.php`);
      const data = await res.json();
      if (data.success) setUpdatesList(data.updates || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!authToken) return;
    fetchSubjectsAndTopics();
    fetchQuestions();
    fetchStatsAndAnalytics();
    fetchPricing();
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'PASSCODES' || activeTab === 'INSTITUTIONS' || activeTab === 'UPGRADES') fetchPasscodes();
    if (activeTab === 'PROMOS') fetchPromos();
    if (activeTab === 'UPLOAD_LOGS') fetchUploadLogs();
    if (activeTab === 'NEWS') fetchNews();
    if (activeTab === 'UPDATES') fetchUpdates();
  }, [authToken, activeTab]);

  if (!authToken) {
    return <Login onLoginSuccess={handleLoginSuccess} apiBase={API_BASE} />;
  }

  // Bar Chart SVG Helper
  const renderSVGChart = (chartData: any[], color: string) => {
    if (!chartData || chartData.length === 0) return null;
    const maxVal = Math.max(...chartData.map(d => d.score), 100);
    const height = 150;
    const width = 360;
    const barWidth = 24;
    const gap = (width - chartData.length * barWidth) / (chartData.length + 1);

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {chartData.map((d, i) => {
          const x = gap + i * (barWidth + gap);
          const barHeight = (d.score / maxVal) * (height - 40);
          const y = height - 20 - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={8} ry={8} fill={color} />
              <text x={x + barWidth / 2} y={y - 6} fontSize="11" textAnchor="middle" fill="var(--text-secondary)" fontWeight="700">
                {d.score}%
              </text>
              <text x={x + barWidth / 2} y={height - 4} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const totalPasscodesCount = stats.total_passcodes || (stats.active_passcodes + stats.suspended_passcodes) || 1;
  const activePct = Math.round((stats.active_passcodes / totalPasscodesCount) * 100) || 85;
  const strokeDasharray = `${activePct * 2.83} 283`;

  return (
    <div className="admin-layout">
      {/* Navigation Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src={fillopIcon} alt="Fillop Icon" style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'contain' }} />
          <span>Fillop Admin</span>
        </div>
        <nav className="sidebar-menu">
          <button className={`menu-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <LayoutDashboard size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Dashboard
          </button>
          <button className={`menu-btn ${activeTab === 'QUESTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTIONS')}>
            <BookOpen size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Question Bank Browser
          </button>
          <button className={`menu-btn ${activeTab === 'TOPICS' ? 'active' : ''}`} onClick={() => setActiveTab('TOPICS')}>
            <Layers size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Subjects &amp; Topics
          </button>
          <button className={`menu-btn ${activeTab === 'UPLOAD_LOGS' ? 'active' : ''}`} onClick={() => setActiveTab('UPLOAD_LOGS')}>
            <History size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Upload History Log
          </button>
          <button className={`menu-btn ${activeTab === 'RESULTS' ? 'active' : ''}`} onClick={() => setActiveTab('RESULTS')}>
            <BarChart3 size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Exam Results &amp; Analytics
          </button>
          <button className={`menu-btn ${activeTab === 'USERS' ? 'active' : ''}`} onClick={() => setActiveTab('USERS')}>
            <Users size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Candidates
          </button>
          <button className={`menu-btn ${activeTab === 'PASSCODES' ? 'active' : ''}`} onClick={() => setActiveTab('PASSCODES')}>
            <Key size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Passcodes &amp; Licensing
          </button>
          <button className={`menu-btn ${activeTab === 'PRICING' ? 'active' : ''}`} onClick={() => setActiveTab('PRICING')}>
            <DollarSign size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Pricing Settings
          </button>
          <button className={`menu-btn ${activeTab === 'PROMOS' ? 'active' : ''}`} onClick={() => setActiveTab('PROMOS')}>
            <Tag size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Promo Codes
          </button>
          <button className={`menu-btn ${activeTab === 'NEWS' ? 'active' : ''}`} onClick={() => setActiveTab('NEWS')}>
            <Newspaper size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Admin News
          </button>
          <button className={`menu-btn ${activeTab === 'UPDATES' ? 'active' : ''}`} onClick={() => setActiveTab('UPDATES')}>
            <Settings size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Software Release
          </button>
        </nav>
      </aside>

      <main className="admin-body">
        {notification && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px',
            backgroundColor: notification.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'white', padding: '1rem 1.5rem', borderRadius: '12px', zIndex: 1000,
            fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            {notification.text}
          </div>
        )}

        {/* Header Control */}
        <header className="admin-header">
          <div>
            <h1 className="admin-title">
              {activeTab === 'DASHBOARD' && 'Admin Control Center'}
              {activeTab === 'QUESTIONS' && 'Question Bank Master Browser'}
              {activeTab === 'TOPICS' && 'Subjects & Topic Management'}
              {activeTab === 'UPLOAD_LOGS' && 'Upload History Log'}
              {activeTab === 'RESULTS' && 'Exam Results & Analytics'}
              {activeTab === 'USERS' && 'Candidate Management'}
              {activeTab === 'PASSCODES' && 'Passcodes & Licensing'}
              {activeTab === 'PRICING' && 'Pricing Settings'}
              {activeTab === 'PROMOS' && 'Promo Codes'}
              {activeTab === 'NEWS' && 'Admin News'}
              {activeTab === 'UPDATES' && 'Software Release'}
            </h1>
            <p className="admin-subtitle">Welcome, {adminUser?.username || 'Admin'} • CBT Guru Central Cloud</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={toggleTheme}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>

            <button
              className="btn btn-danger"
              onClick={handleLogout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem' }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </header>

        {/* DASHBOARD TAB */}
        {activeTab === 'DASHBOARD' && (
          <div>
            {/* Multi-Step Question Upload Wizard */}
            <div style={{ marginBottom: '2rem' }}>
              <QuestionWizard
                apiBase={API_BASE}
                dbSubjects={dbSubjects}
                dbTopics={dbTopics}
                onRefreshData={() => {
                  fetchSubjectsAndTopics();
                  fetchQuestions();
                  fetchStatsAndAnalytics();
                }}
                showNotification={showNotification}
              />
            </div>

            {/* Stat Cards */}
            <div className="dashboard-stats">
              <div className="stat-card" onClick={() => setActiveTab('QUESTIONS')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-label">Total Questions</div>
                  <div className="stat-badge"><BookOpen size={20} /></div>
                </div>
                <div className="stat-val">{questions.length || stats.total_questions}</div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab('TOPICS')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-label">Subjects / Topics</div>
                  <div className="stat-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}><Layers size={20} /></div>
                </div>
                <div className="stat-val" style={{ color: 'var(--success)' }}>{dbSubjects.length} / {dbTopics.length}</div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab('PASSCODES')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-label">Active Passcodes</div>
                  <div className="stat-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}><Key size={20} /></div>
                </div>
                <div className="stat-val" style={{ color: 'var(--warning)' }}>{stats.active_passcodes}</div>
              </div>
            </div>
          </div>
        )}

        {/* QUESTION BANK BROWSER TAB */}
        {activeTab === 'QUESTIONS' && (
          <QuestionBankBrowser
            apiBase={API_BASE}
            dbSubjects={dbSubjects}
            dbTopics={dbTopics}
            questions={questions}
            onRefreshData={() => {
              fetchQuestions();
              fetchStatsAndAnalytics();
            }}
            showNotification={showNotification}
          />
        )}

        {/* SUBJECTS & TOPICS TAB */}
        {activeTab === 'TOPICS' && (
          <SubjectTopicManager
            apiBase={API_BASE}
            dbSubjects={dbSubjects}
            dbTopics={dbTopics}
            onRefreshData={() => {
              fetchSubjectsAndTopics();
              fetchQuestions();
            }}
            showNotification={showNotification}
          />
        )}

        {/* UPLOAD HISTORY LOG TAB */}
        {activeTab === 'UPLOAD_LOGS' && (
          <div className="admin-card">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} /> Bulk Upload History Log
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Filename</th>
                  <th>Target Subject</th>
                  <th>Target Topic</th>
                  <th>Imported Rows</th>
                  <th>Skipped Rows</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {uploadLogs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No upload history recorded yet.</td></tr>
                ) : (
                  uploadLogs.map(log => (
                    <tr key={log.id}>
                      <td>#{log.id}</td>
                      <td style={{ fontWeight: 700 }}>{log.filename}</td>
                      <td>{log.subject_name || `Sub #${log.subject_id}`}</td>
                      <td>{log.topic_name || `Topic #${log.topic_id}`}</td>
                      <td><span className="badge badge-success">{log.rows_imported}</span></td>
                      <td><span className="badge badge-warning">{log.rows_skipped}</span></td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* EXAM RESULTS & ANALYTICS TAB */}
        {activeTab === 'RESULTS' && (
          <div className="admin-card">
            <h2 className="card-title">Candidate Exam Results &amp; Analytics</h2>
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Exam</th>
                  <th>Score / Total</th>
                  <th>Percentage</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {resultsList.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No submitted results found.</td></tr>
                ) : (
                  resultsList.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.candidate_name || 'Candidate'}</td>
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
        )}

        {/* CANDIDATES TAB */}
        {activeTab === 'USERS' && (
          <div className="admin-card">
            <h2 className="card-title">Candidates Management</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No candidates registered.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PASSCODES TAB */}
        {activeTab === 'PASSCODES' && (
          <div className="admin-card">
            <h2 className="card-title">Passcode Licensing</h2>
            <table>
              <thead>
                <tr>
                  <th>Passcode</th>
                  <th>Email</th>
                  <th>Exam Category</th>
                  <th>Seats</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {passcodes.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>{p.passcode}</td>
                    <td>{p.email}</td>
                    <td><span className="badge badge-info">{p.exam_category}</span></td>
                    <td>{p.activated_devices} / {p.max_devices}</td>
                    <td><span className="badge badge-success">{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
