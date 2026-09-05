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
  Edit,
  ChevronDown,
  ChevronRight,
  Eye,
  Ban
} from 'lucide-react';
import fillopIcon from './icon.png';
import Login from './Login';
import QuestionWizard from './QuestionWizard';
import SubjectTopicManager from './SubjectTopicManager';
import QuestionBankBrowser from './QuestionBankBrowser';
import { Subject, Topic, Question, UploadLog } from './types';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'https://cbt.filloptech.com/api/v1'
  : 'https://cbt.filloptech.com/api/v1';

 // const API_BASE = 'https://cbt.filloptech.com/api/v1';

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
    'DASHBOARD' | 'UPLOAD_WIZARD' | 'RESULTS' | 'USERS' | 'PASSCODES' | 'UPGRADES' | 'INSTITUTIONS' | 'PRICING' | 'PROMOS' | 'QUESTIONS' | 'TOPICS' | 'UPLOAD_LOGS' | 'NEWS' | 'UPDATES'
  >('DASHBOARD');

  // Collapsible Sidebar Category Groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    content: true,
    users: true,
    reports: true,
    monetization: true,
    system: true,
  });

  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

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
  const [revenueRange, setRevenueRange] = useState<'week' | 'month' | 'year'>('month');
  const [revenueOverTime, setRevenueOverTime] = useState<{ label: string; amount: number }[]>([]);
  const [rangeTotalRevenue, setRangeTotalRevenue] = useState<number>(0);
  const [newsRailList, setNewsRailList] = useState<{ id: number; title: string; excerpt: string; published_at: string }[]>([]);
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
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [passcodeSearch, setPasscodeSearch] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [uploadLogSearch, setUploadLogSearch] = useState('');
  const [promoSearch, setPromoSearch] = useState('');
  const [newsSearch, setNewsSearch] = useState('');
  const [updateSearch, setUpdateSearch] = useState('');
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  // In-Page Upload History Log Questions View State
  const [viewingLogQuestions, setViewingLogQuestions] = useState<UploadLog | null>(null);
  const [logQuestionsList, setLogQuestionsList] = useState<any[]>([]);
  const [loadingLogQuestions, setLoadingLogQuestions] = useState<boolean>(false);

  const toggleEmailExpand = (emailKey: string) => {
    setExpandedEmails(prev => ({ ...prev, [emailKey]: !prev[emailKey] }));
  };

  // Notifications
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Result details & editing candidate modals
  const [selectedResultDetails, setSelectedResultDetails] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', phone: '', school: '' });

  // Passcode category & subject editing modal state
  const [editingPasscode, setEditingPasscode] = useState<any | null>(null);
  const [editPasscodeCategories, setEditPasscodeCategories] = useState<string[]>([]);
  const [editPasscodeSubjects, setEditPasscodeSubjects] = useState<string[]>([]);

  // Action Handlers
  const handleRevokePasscode = async (passcodeVal: string) => {
    if (!window.confirm(`Are you sure you want to revoke passcode ${passcodeVal}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ action: 'revoke', passcode: passcodeVal })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Passcode revoked successfully.');
        fetchPasscodes();
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to revoke passcode.', 'error');
      }
    } catch (e) {
      showNotification('Error revoking passcode.', 'error');
    }
  };

  const handleDeleteResult = async (resultId: number) => {
    if (!window.confirm(`Are you sure you want to delete exam submission #${resultId}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/analytics.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ action: 'delete_result', id: resultId })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Exam result submission deleted successfully.');
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to delete exam result.', 'error');
      }
    } catch (e) {
      showNotification('Error deleting result.', 'error');
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!window.confirm(`Are you sure you want to delete candidate ${email}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ action: 'admin_delete_user', id: userId, email })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Candidate deleted successfully.');
        fetchUsers();
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to delete candidate.', 'error');
      }
    } catch (e) {
      showNotification('Error deleting candidate.', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'update_user',
          id: editingUser.id,
          name: editUserForm.name,
          phone: editUserForm.phone,
          school: editUserForm.school
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Candidate profile updated successfully!');
        setEditingUser(null);
        fetchUsers();
      } else {
        showNotification(data.message || 'Failed to update candidate.', 'error');
      }
    } catch (e) {
      showNotification('Error updating candidate.', 'error');
    }
  };

  const handleSavePasscodeSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasscode) return;
    try {
      const catStr = editPasscodeCategories.join(',');
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'update_subjects',
          passcode: editingPasscode.passcode,
          exam_category: catStr,
          allowed_subjects: editPasscodeSubjects
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Passcode categories & subjects updated successfully!');
        setEditingPasscode(null);
        fetchPasscodes();
      } else {
        showNotification(data.message || 'Failed to update passcode.', 'error');
      }
    } catch (e) {
      showNotification('Error updating passcode.', 'error');
    }
  };

  // Pricing settings state
  const [pricingForm, setPricingForm] = useState({
    single_passcode_price_6m: 1400,
    small_bulk_price_6m: 1100,
    large_bulk_price_6m: 1000
  });

  // Promo Code Form State
  const [newPromoForm, setNewPromoForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: 100,
    expires_at: ''
  });

  // Software Update Form State
  const [newUpdateForm, setNewUpdateForm] = useState({
    version: '',
    firmware: 'FW-2026.09',
    improvements: '',
    size: '45.0 MB',
    url: ''
  });

  // Action handlers for Pricing, Promo Codes, News, and Software Updates
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/pricing.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Pricing settings updated successfully.');
        fetchPricing();
      } else {
        showNotification(data.message || 'Failed to update pricing.', 'error');
      }
    } catch (err) {
      showNotification('Error saving pricing settings.', 'error');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/promo_codes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromoForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Promo code created successfully.');
        setNewPromoForm({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 100, expires_at: '' });
        fetchPromos();
      } else {
        showNotification(data.message || 'Failed to create promo code.', 'error');
      }
    } catch (err) {
      showNotification('Error creating promo code.', 'error');
    }
  };

  const handleTogglePromo = async (id: number, active: number) => {
    try {
      const res = await fetch(`${API_BASE}/admin/promo_codes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id, active: active ? 0 : 1 })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Promo code status updated.');
        fetchPromos();
      }
    } catch (err) {
      showNotification('Error toggling promo status.', 'error');
    }
  };

  const handleDeletePromo = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/promo_codes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Promo code deleted.');
        fetchPromos();
      }
    } catch (err) {
      showNotification('Error deleting promo code.', 'error');
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newNewsForm })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Admin news published successfully.');
        setNewNewsForm({ title: '', content: '', icon_name: 'newspaper', thumbnail_url: '', published_at: new Date().toISOString().slice(0, 16) });
        fetchNews();
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to publish news.', 'error');
      }
    } catch (err) {
      showNotification('Error publishing news.', 'error');
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this news article?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('News article deleted.');
        fetchNews();
        fetchStatsAndAnalytics();
      }
    } catch (err) {
      showNotification('Error deleting news.', 'error');
    }
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/updates.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newUpdateForm })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Software release published successfully.');
        setNewUpdateForm({ version: '', firmware: 'FW-2026.09', improvements: '', size: '45.0 MB', url: '' });
        fetchUpdates();
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to publish update.', 'error');
      }
    } catch (err) {
      showNotification('Error publishing software update.', 'error');
    }
  };

  const handleDeleteUpdate = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this release update?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/updates.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Software update deleted.');
        fetchUpdates();
        fetchStatsAndAnalytics();
      }
    } catch (err) {
      showNotification('Error deleting software update.', 'error');
    }
  };

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

  const fetchStatsAndAnalytics = async (range: 'week' | 'month' | 'year' = revenueRange) => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics.php?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({ ...prev, ...data.analytics }));
        if (data.results) setResultsList(data.results);
        if (data.revenue_over_time) setRevenueOverTime(data.revenue_over_time);
        if (data.range_total_revenue !== undefined) setRangeTotalRevenue(data.range_total_revenue);
        if (data.news_rail) setNewsRailList(data.news_rail);
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
    fetchStatsAndAnalytics(revenueRange);
    fetchPricing();
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'PASSCODES' || activeTab === 'INSTITUTIONS' || activeTab === 'UPGRADES') fetchPasscodes();
    if (activeTab === 'PROMOS') fetchPromos();
    if (activeTab === 'UPLOAD_LOGS') fetchUploadLogs();
    if (activeTab === 'NEWS') fetchNews();
    if (activeTab === 'UPDATES') fetchUpdates();
  }, [authToken, activeTab, revenueRange]);

  if (!authToken) {
    return <Login onLoginSuccess={handleLoginSuccess} apiBase={API_BASE} />;
  }

  // Real Smooth Area / Line Chart SVG Helper for Revenue
  const renderRevenueAreaChart = (data: { label: string; amount: number }[]) => {
    if (!data || data.length === 0 || data.every(d => d.amount === 0)) {
      return (
        <div style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--primary-light)',
          borderRadius: '12px',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          No real revenue transaction data recorded yet in payment logs.
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 30;
    const maxVal = Math.max(...data.map(d => d.amount), 100);

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - (d.amount / maxVal) * (height - padding * 2);
      return { x, y, amount: d.amount, label: d.label };
    });

    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      pathD += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;
    const peakPoint = [...points].sort((a, b) => b.amount - a.amount)[0];

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="3 3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-color)" strokeDasharray="3 3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" />

        <path d={areaD} fill="url(#revenueGradient)" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />

        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="2" />
            <text x={pt.x} y={height - 10} fontSize="10" textAnchor="middle" fill="var(--text-muted)" fontWeight="600">
              {pt.label}
            </text>
          </g>
        ))}

        {peakPoint && (
          <g transform={`translate(${peakPoint.x},${peakPoint.y - 32})`}>
            <rect x="-42" y="0" width="84" height="22" rx="6" fill="var(--primary)" />
            <text x="0" y="14" fontSize="10" fill="#ffffff" textAnchor="middle" fontWeight="800">
              ₦{peakPoint.amount.toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Real Question Count per Exam Category Bar Chart SVG Helper
  const renderQuestionDistributionChart = (questionsList: Question[], color: string) => {
    const counts: Record<string, number> = {};
    questionsList.forEach(q => {
      const type = (q.exam_type || 'JAMB').toUpperCase();
      counts[type] = (counts[type] || 0) + 1;
    });

    const chartData = Object.keys(counts).length > 0
      ? Object.keys(counts).map(k => ({ label: k, count: counts[k] }))
      : [
          { label: 'JAMB', count: questionsList.filter(q => q.subject_id <= 35).length || 0 },
          { label: 'WAEC', count: questionsList.filter(q => q.subject_id >= 36 && q.subject_id <= 70).length || 0 },
          { label: 'NECO', count: questionsList.filter(q => q.subject_id >= 71).length || 0 }
        ];

    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const height = 160;
    const width = 360;
    const barWidth = 36;
    const gap = (width - chartData.length * barWidth) / (chartData.length + 1);

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {chartData.map((d, i) => {
          const x = gap + i * (barWidth + gap);
          const barHeight = Math.max((d.count / maxCount) * 100, 6);
          const y = 130 - barHeight;
          const r = 8;
          const pathD = `
            M ${x},${y + r}
            A ${r},${r} 0 0,1 ${x + r},${y}
            L ${x + barWidth - r},${y}
            A ${r},${r} 0 0,1 ${x + barWidth},${y + r}
            L ${x + barWidth},${130}
            L ${x},${130}
            Z
          `;
          return (
            <g key={i}>
              <path d={pathD} fill={color} />
              <text x={x + barWidth / 2} y={y - 6} fontSize="11" textAnchor="middle" fill="var(--text-main)" fontWeight="800">
                {d.count}
              </text>
              <text x={x + barWidth / 2} y={150} fontSize="11" textAnchor="middle" fill="var(--text-muted)" fontWeight="700">
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
          {/* Top Level Item */}
          <button className={`menu-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <LayoutDashboard size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Dashboard
          </button>

          {/* Group 1: Content */}
          <div className="sidebar-group">
            <div className="sidebar-group-header" onClick={() => toggleGroup('content')}>
              <span>Content</span>
              {openGroups.content ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {openGroups.content && (
              <div className="sidebar-group-items">
                <button className={`menu-btn ${activeTab === 'UPLOAD_WIZARD' ? 'active' : ''}`} onClick={() => setActiveTab('UPLOAD_WIZARD')}>
                  <Upload size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Upload Questions
                </button>
                <button className={`menu-btn ${activeTab === 'QUESTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTIONS')}>
                  <BookOpen size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Question Bank Browser
                </button>
                <button className={`menu-btn ${activeTab === 'TOPICS' ? 'active' : ''}`} onClick={() => setActiveTab('TOPICS')}>
                  <Layers size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Subjects &amp; Topics
                </button>
                <button className={`menu-btn ${activeTab === 'UPLOAD_LOGS' ? 'active' : ''}`} onClick={() => setActiveTab('UPLOAD_LOGS')}>
                  <History size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Upload History Log
                </button>
              </div>
            )}
          </div>

          {/* Group 2: Users & Access */}
          <div className="sidebar-group">
            <div className="sidebar-group-header" onClick={() => toggleGroup('users')}>
              <span>Users &amp; Access</span>
              {openGroups.users ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {openGroups.users && (
              <div className="sidebar-group-items">
                <button className={`menu-btn ${activeTab === 'USERS' ? 'active' : ''}`} onClick={() => setActiveTab('USERS')}>
                  <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Candidates
                </button>
                <button className={`menu-btn ${activeTab === 'PASSCODES' ? 'active' : ''}`} onClick={() => setActiveTab('PASSCODES')}>
                  <Key size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Passcodes &amp; Licensing
                </button>
              </div>
            )}
          </div>

          {/* Group 3: Reports */}
          <div className="sidebar-group">
            <div className="sidebar-group-header" onClick={() => toggleGroup('reports')}>
              <span>Reports</span>
              {openGroups.reports ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {openGroups.reports && (
              <div className="sidebar-group-items">
                <button className={`menu-btn ${activeTab === 'RESULTS' ? 'active' : ''}`} onClick={() => setActiveTab('RESULTS')}>
                  <BarChart3 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Exam Results &amp; Analytics
                </button>
              </div>
            )}
          </div>

          {/* Group 4: Monetization */}
          <div className="sidebar-group">
            <div className="sidebar-group-header" onClick={() => toggleGroup('monetization')}>
              <span>Monetization</span>
              {openGroups.monetization ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {openGroups.monetization && (
              <div className="sidebar-group-items">
                <button className={`menu-btn ${activeTab === 'PRICING' ? 'active' : ''}`} onClick={() => setActiveTab('PRICING')}>
                  <DollarSign size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Pricing Settings
                </button>
                <button className={`menu-btn ${activeTab === 'PROMOS' ? 'active' : ''}`} onClick={() => setActiveTab('PROMOS')}>
                  <Tag size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Promo Codes
                </button>
              </div>
            )}
          </div>

          {/* Group 5: System */}
          <div className="sidebar-group">
            <div className="sidebar-group-header" onClick={() => toggleGroup('system')}>
              <span>System</span>
              {openGroups.system ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {openGroups.system && (
              <div className="sidebar-group-items">
                <button className={`menu-btn ${activeTab === 'NEWS' ? 'active' : ''}`} onClick={() => setActiveTab('NEWS')}>
                  <Newspaper size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Admin News
                </button>
                <button className={`menu-btn ${activeTab === 'UPDATES' ? 'active' : ''}`} onClick={() => setActiveTab('UPDATES')}>
                  <Settings size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Software Release
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <main className="admin-body">
        {notification && (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px',
            backgroundColor: notification.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'white', padding: '0.85rem 1.4rem', borderRadius: '12px', zIndex: 1000,
            fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Header Control */}
        <header className="admin-header">
          <div>
            <h1 className="admin-title">
              {activeTab === 'DASHBOARD' && 'Admin Control Center'}
              {activeTab === 'UPLOAD_WIZARD' && 'Question Upload Wizard'}
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
             
              onClick={handleLogout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem' }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </header>

        {/* UPLOAD WIZARD TAB */}
        {activeTab === 'UPLOAD_WIZARD' && (
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
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'DASHBOARD' && (
          <div>
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
  <input
    type="text"
    className="form-input"
    placeholder="Filter recent submissions or news..."
    value={dashboardSearch}
    onChange={(e) => setDashboardSearch(e.target.value)}
    style={{
      width: '260px',
      padding: '0.4rem 0.8rem',
      fontSize: '0.85rem',
      border: '1px solid var(--accent)',
      outline: 'none',
      boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)',
    }}
  />
</div>

            {/* Conditional Pending Upgrades CTA Card */}
            {stats.pending_upgrades > 0 && (
              <div className="cta-card">
                <div>
                  <h3>Pending Category Upgrades Action Required</h3>
                  <p>You have {stats.pending_upgrades} pending passcode upgrade requests waiting for admin approval.</p>
                </div>
                <button className="btn btn-white" onClick={() => setActiveTab('PASSCODES')}>
                  Review Requests <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Auto-filling Dense Stat Cards Grid */}
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="stat-card" onClick={() => setActiveTab('QUESTIONS')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Total Questions</div>
                    <div className="stat-val">{questions.length || stats.total_questions}</div>
                  </div>
                  <div className="stat-badge"><BookOpen size={20} /></div>
                </div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab('TOPICS')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Subjects / Topics</div>
                    <div className="stat-val" >{dbSubjects.length} / {dbTopics.length}</div>
                  </div>
                  <div className="stat-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}><Layers size={20} /></div>
                </div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab('PASSCODES')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Active Passcodes</div>
                    <div className="stat-val" >{stats.active_passcodes} / {totalPasscodesCount}</div>
                  </div>
                  <div className="stat-badge" style={{ }}><Key size={20} /></div>
                </div>
              </div>

              <div className="stat-card" onClick={() => setActiveTab('USERS')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Total Candidates</div>
                    <div className="stat-val">{stats.total_users || users.length}</div>
                  </div>
                  <div className="stat-badge" style={{ backgroundColor: 'var(--accent-light)',}}><Users size={20} /></div>
                </div>
              </div>
            </div>

            {/* Main Overview Grid: Left Analytics + Right Admin News Rail */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.25rem', marginBottom: '2rem' }}>
              {/* Left Column: Revenue Trend + Questions Bar + Donut Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Revenue Trend Smooth Area/Line Chart */}
                <div className="admin-card" style={{ marginBottom: 0 }}>
                  <div className="card-title" style={{ flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={18} style={{ color: 'var(--accent)' }} /> Revenue Trend (Completed Payments)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Week / Month / Year Segmented Toggle */}
                      <div style={{ display: 'inline-flex', background: 'var(--primary-light)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        {(['week', 'month', 'year'] as const).map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setRevenueRange(r);
                              fetchStatsAndAnalytics(r);
                            }}
                            style={{
                              border: 'none',
                              padding: '4px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              backgroundColor: revenueRange === r ? 'var(--accent)' : 'transparent',
                              color: revenueRange === r ? '#ffffff' : 'var(--text-muted)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                      <span className="badge badge-info">Real Payment Data</span>
                    </div>
                  </div>

                  {renderRevenueAreaChart(revenueOverTime)}

                  {/* Legend & Prominent Total Display */}
                  <div style={{
                    display: 'flex',
                    width: '100%',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginTop: '0.85rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                      <span>Revenue (₦)</span>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem', textAlign: 'right' }}>
                      Total this {revenueRange}: <span style={{ color: 'var(--accent)' }}>₦{(rangeTotalRevenue || revenueOverTime.reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-grid: Category Questions Bar + Passcodes Donut */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                  {/* Real Question Distribution per Category Bar Chart */}
                  <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="card-title">
                      <span>Questions per Category</span>
                      <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
                    </div>
                    {renderQuestionDistributionChart(questions, 'var(--primary)')}
                  </div>

                  {/* Passcodes Activation Donut Ring Chart */}
                  <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
                    <div className="card-title" style={{ width: '100%', marginBottom: '0.8rem' }}>
                      <span>Passcode Activation Rate</span>
                      <PieChart size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="140" height="140" viewBox="0 0 100 100">
                        {/* Background Track Circle */}
                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--primary-light)" strokeWidth="12" />
                        {/* Active Arc Circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="12"
                          strokeDasharray={strokeDasharray}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div style={{ position: 'absolute', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{activePct}%</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVATED</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block' }} /> Active ({stats.active_passcodes})
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--primary-light)', border: '2px solid var(--border-color)', display: 'inline-block' }} /> Inactive ({stats.suspended_passcodes})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Admin News Rail + System At A Glance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Admin News Rail Card */}
                <div className="admin-card" style={{ marginBottom: 0 }}>
                  <div className="card-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Newspaper size={18}  /> Admin News
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('NEWS')}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      View All <ArrowRight size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {newsRailList.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                        No published news posts found.
                      </div>
                    ) : (
                      newsRailList.map(item => (
                        <div
                          key={item.id}
                          onClick={() => setActiveTab('NEWS')}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '10px',
                            backgroundColor: 'var(--primary-light)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.35', marginBottom: '0.4rem' }}>
                            {item.excerpt}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {new Date(item.published_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* At A Glance - All Sidebar Summary Card */}
                <div className="admin-card" style={{ marginBottom: 0 }}>
                  <div className="card-title">
                    <span>System At A Glance</span>
                    <Zap size={18} style={{ }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div className="list-item-row" style={{ padding: '0.35rem 0', cursor: 'pointer' }} onClick={() => setActiveTab('UPLOAD_LOGS')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <History size={15} style={{ color: 'var(--text-secondary)' }} /> Latest Upload
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {uploadLogs.length > 0 ? uploadLogs[0].filename : 'None'}
                      </span>
                    </div>

                    <div className="list-item-row" style={{ padding: '0.35rem 0', cursor: 'pointer' }} onClick={() => setActiveTab('RESULTS')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <BarChart3 size={15} style={{ color: 'var(--text-secondary)' }} /> Exam Submissions
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {resultsList.length} exams
                      </span>
                    </div>

                    <div className="list-item-row" style={{ padding: '0.35rem 0', cursor: 'pointer' }} onClick={() => setActiveTab('PROMOS')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Tag size={15} style={{ color: 'var(--text-secondary)' }} /> Active Promos
                      </span>
                      <span className="badge badge-info">{stats.active_promos} active</span>
                    </div>

                    <div className="list-item-row" style={{ padding: '0.35rem 0', cursor: 'pointer' }} onClick={() => setActiveTab('UPDATES')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Settings size={15} style={{ color: 'var(--text-secondary)' }} /> Software Release
                      </span>
                      <span className="badge badge-success">{stats.latest_update_version}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Results Row List */}
            <div className="admin-card">
              <div className="card-title">
                <span>Recent Exam Submissions {dashboardSearch ? `(Filtered: "${dashboardSearch}")` : ''}</span>
                <button className="btn btn-secondary" onClick={() => setActiveTab('RESULTS')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  View All <ArrowRight size={14} />
                </button>
              </div>
              {resultsList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>No recent candidate exam submissions recorded.</div>
              ) : (
                resultsList
                  .filter(r => !dashboardSearch || (r.candidate_name || '').toLowerCase().includes(dashboardSearch.toLowerCase()) || (r.email || '').toLowerCase().includes(dashboardSearch.toLowerCase()) || (r.exam_type || '').toLowerCase().includes(dashboardSearch.toLowerCase()))
                  .slice(0, 5)
                  .map(r => (
                    <div className="list-item-row" key={r.id}>
                      <div className="list-item-left">
                        <div className="avatar-circle">
                          {(r.candidate_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.candidate_name || 'Candidate'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.email} • {r.exam_type}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>{r.score} / {r.total_questions}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.submitted_at).toLocaleDateString()}</div>
                        </div>
                        <span className={`badge ${r.percentage >= 70 ? 'badge-success' : r.percentage >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {Number(r.percentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
              )}
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
          viewingLogQuestions ? (
            <div className="admin-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setViewingLogQuestions(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Upload Logs
                </button>

                <span className="badge badge-info" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                  Log #{viewingLogQuestions.id} — {viewingLogQuestions.filename}
                </span>
              </div>

              <h2 className="card-title" style={{ marginBottom: '1rem' }}>
                Questions Added in Upload File "{viewingLogQuestions.filename}" ({logQuestionsList.length} Questions)
              </h2>

              <div style={{ marginBottom: '1rem', background: 'var(--primary-light)', padding: '0.85rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                Subject: <strong>{viewingLogQuestions.subject_name || `ID ${viewingLogQuestions.subject_id}`}</strong> • Topic: <strong>{viewingLogQuestions.topic_name || `ID ${viewingLogQuestions.topic_id}`}</strong> • Imported: <strong>{viewingLogQuestions.rows_imported}</strong> rows on {new Date(viewingLogQuestions.created_at).toLocaleString()}
              </div>

              {loadingLogQuestions ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading questions added for this log file...
                </div>
              ) : logQuestionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No questions found for this specific subject/topic log.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {logQuestionsList.map((q, idx) => (
                    <div key={q.id || idx} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem', backgroundColor: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>Question #{q.id || idx + 1} • Year: {q.year || 'N/A'} • Difficulty: {q.difficulty || 'medium'}</span>
                        <span className="badge badge-info">{q.topic_name || `Topic ID: ${q.topic_id}`}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.8rem', whiteSpace: 'pre-wrap' }}>
                        {q.question_text}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
                        <div style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: q.correct_answer === 'A' ? 'var(--accent-light)' : 'transparent', fontWeight: q.correct_answer === 'A' ? 700 : 400 }}>
                          A. {q.option_a}
                        </div>
                        <div style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: q.correct_answer === 'B' ? 'var(--accent-light)' : 'transparent', fontWeight: q.correct_answer === 'B' ? 700 : 400 }}>
                          B. {q.option_b}
                        </div>
                        <div style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: q.correct_answer === 'C' ? 'var(--accent-light)' : 'transparent', fontWeight: q.correct_answer === 'C' ? 700 : 400 }}>
                          C. {q.option_c}
                        </div>
                        <div style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: q.correct_answer === 'D' ? 'var(--accent-light)' : 'transparent', fontWeight: q.correct_answer === 'D' ? 700 : 400 }}>
                          D. {q.option_d}
                        </div>
                      </div>
                      {(q.correct_explanation || q.topic_explanation) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                          <strong>Explanation:</strong> {q.correct_explanation || q.topic_explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
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
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadLogs.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No upload history recorded yet.</td></tr>
                  ) : (
                    uploadLogs.map(log => (
                      <tr
                        key={log.id}
                        onClick={async () => {
                          setViewingLogQuestions(log);
                          setLoadingLogQuestions(true);
                          try {
                            const res = await fetch(`${API_BASE}/admin/questions.php?subject_id=${log.subject_id}&topic_id=${log.topic_id}`);
                            const data = await res.json();
                            if (data.success) {
                              setLogQuestionsList(data.questions || []);
                            } else {
                              setLogQuestionsList([]);
                            }
                          } catch (e) {
                            showNotification('Failed to load questions for log file', 'error');
                          } finally {
                            setLoadingLogQuestions(false);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>#{log.id}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{log.filename}</td>
                        <td>{log.subject_name || `Sub #${log.subject_id}`}</td>
                        <td>{log.topic_name || `Topic #${log.topic_id}`}</td>
                        <td><span className="badge badge-success">{log.rows_imported}</span></td>
                        <td><span className="badge badge-warning">{log.rows_skipped}</span></td>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          >
                            <Eye size={12} /> View Questions
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* EXAM RESULTS & ANALYTICS TAB */}
        {activeTab === 'RESULTS' && (() => {
          // Group exam results by candidate email
          const groups: Record<string, { email: string; candidate_name: string; attempts: any[]; avg_percentage: number; total_exams: number }> = {};
          resultsList.forEach(r => {
            const emailKey = (r.email || 'unknown').toLowerCase();
            if (!groups[emailKey]) {
              groups[emailKey] = {
                email: r.email || 'Unknown Email',
                candidate_name: r.candidate_name || 'Candidate',
                attempts: [],
                avg_percentage: 0,
                total_exams: 0
              };
            }
            groups[emailKey].attempts.push(r);
          });

          const groupedList = Object.values(groups).map(g => {
            const total_exams = g.attempts.length;
            const avg_percentage = g.attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / (total_exams || 1);
            return { ...g, total_exams, avg_percentage };
          }).filter(g =>
            !resultSearch ||
            g.email.toLowerCase().includes(resultSearch.toLowerCase()) ||
            g.candidate_name.toLowerCase().includes(resultSearch.toLowerCase()) ||
            g.attempts.some(a => (a.exam_type || '').toLowerCase().includes(resultSearch.toLowerCase()))
          );

          return (
            <div className="admin-card">
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={20} /> Candidate Exam Results (Grouped by User Email)
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search candidates or emails..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  style={{ width: '250px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                />
              </div>

              {groupedList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No candidate examination results match your query.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {groupedList.map(group => {
                    const emailKey = group.email.toLowerCase();
                    const isExpanded = expandedEmails[emailKey] ?? true;

                    return (
                      <div
                        key={emailKey}
                        style={{
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--primary-light)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Group Header Row */}
                        <div
                          onClick={() => toggleEmailExpand(emailKey)}
                          style={{
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="avatar-circle">
                              {group.candidate_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                                {group.candidate_name}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {group.email}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                              {group.total_exams} result{group.total_exams === 1 ? '' : 's'}
                            </span>

                            <span className={`badge ${group.avg_percentage >= 70 ? 'badge-success' : group.avg_percentage >= 50 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                              Avg Score: {Number(group.avg_percentage).toFixed(2)}%
                            </span>

                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>

                        {/* Group Collapsible Content Table */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.5rem 1rem 1rem 1rem' }}>
                            <table style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Exam Type</th>
                                  <th>Score / Total</th>
                                  <th>Percentage</th>
                                  <th>Submitted At</th>
                                  <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.attempts.map(r => (
                                  <tr key={r.id}>
                                    <td><span className="badge badge-info">{r.exam_type}</span></td>
                                    <td><strong>{r.score}</strong> / {r.total_questions}</td>
                                    <td>
                                      <span className={`badge ${r.percentage >= 70 ? 'badge-success' : r.percentage >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                                        {Number(r.percentage).toFixed(2)}%
                                      </span>
                                    </td>
                                    <td>{new Date(r.submitted_at).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                                        <button
                                          className="btn btn-secondary"
                                          style={{ padding: '4px 8px' }}
                                          title="View Exam Answer Details"
                                          onClick={(e) => { e.stopPropagation(); setSelectedResultDetails(r); }}
                                        >
                                          <Eye size={14} />
                                        </button>
                                        <button
                                          className="btn btn-danger"
                                          style={{ padding: '4px 8px' }}
                                          title="Delete Exam Submission"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteResult(r.id); }}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* CANDIDATES TAB */}
        {activeTab === 'USERS' && (
          <div className="admin-card">
            <div className="card-title">
              <span>Candidates Management</span>
              <input
                type="text"
                className="form-input"
                placeholder="Search candidates by name/email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '240px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Institution / School</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No candidates registered.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>{u.school || 'N/A'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px' }}
                            title="Edit Candidate Profile"
                            onClick={() => {
                              setEditingUser(u);
                              setEditUserForm({ name: u.name || '', phone: u.phone || '', school: u.school || '' });
                            }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px' }}
                            title="Delete Candidate Account"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PASSCODES TAB */}
        {activeTab === 'PASSCODES' && (() => {
          // Group passcodes by user email
          const groups: Record<string, { email: string; items: any[]; active_count: number; total_paid: number }> = {};
          passcodes.forEach(p => {
            const emailKey = (p.email || 'unassigned').toLowerCase();
            if (!groups[emailKey]) {
              groups[emailKey] = {
                email: p.email || 'Unassigned',
                items: [],
                active_count: 0,
                total_paid: 0
              };
            }
            groups[emailKey].items.push(p);
            if (p.status === 'active') groups[emailKey].active_count += 1;
            groups[emailKey].total_paid += parseFloat(p.amount_paid || 1400);
          });

          const groupedList = Object.values(groups).filter(g =>
            !passcodeSearch ||
            g.email.toLowerCase().includes(passcodeSearch.toLowerCase()) ||
            g.items.some(p => (p.passcode || '').toLowerCase().includes(passcodeSearch.toLowerCase()) || (p.exam_category || '').toLowerCase().includes(passcodeSearch.toLowerCase()))
          );

          return (
            <div className="admin-card">
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={20} /> Passcodes &amp; Licensing (Grouped by Candidate Email)
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search email or passcode..."
                  value={passcodeSearch}
                  onChange={(e) => setPasscodeSearch(e.target.value)}
                  style={{ width: '250px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                />
              </div>

              {groupedList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No passcodes match your search filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {groupedList.map(group => {
                    const emailKey = 'passcode_grp_' + group.email.toLowerCase();
                    const isExpanded = expandedEmails[emailKey] ?? true;

                    return (
                      <div
                        key={emailKey}
                        style={{
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--primary-light)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Group Header Row */}
                        <div
                          onClick={() => toggleEmailExpand(emailKey)}
                          style={{
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="avatar-circle">
                              <Key size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                                {group.email}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {group.items.length} passcode{group.items.length === 1 ? '' : 's'} ({group.active_count} active) • Total Paid: ₦{group.total_paid.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                              {group.items.length} passcode{group.items.length === 1 ? '' : 's'}
                            </span>

                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>

                        {/* Group Collapsible Content Table */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.5rem 1rem 1rem 1rem' }}>
                            <table style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Passcode</th>
                                  <th>Exam Category</th>
                                  <th>Allowed Subjects</th>
                                  <th>Seats / Devices</th>
                                  <th>Price Paid</th>
                                  <th>Status</th>
                                  <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map(p => {
                                  const cats = p.exam_category ? p.exam_category.split(',').filter(Boolean) : ['JAMB'];
                                  const totalAvailableForCats = dbSubjects.filter(s => cats.includes(s.exam_type)).length;
                                  const rawSubList = p.allowed_subjects ? p.allowed_subjects.split(',').filter(Boolean) : [];

                                  const countDisplay = rawSubList.length > 0
                                    ? `${rawSubList.length} Subject${rawSubList.length === 1 ? '' : 's'}`
                                    : `All Subjects (${totalAvailableForCats || 'Full'})`;

                                  const subjectsTooltip = rawSubList.length > 0
                                    ? rawSubList.join(', ')
                                    : 'All subjects in category unlocked';

                                  return (
                                    <tr key={p.id}>
                                      <td style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem' }}>{p.passcode}</td>
                                      <td><span className="badge badge-info">{p.exam_category}</span></td>
                                      <td style={{ fontSize: '0.82rem', fontWeight: 700 }} title={subjectsTooltip}>
                                        <span className="badge badge-warning">{countDisplay}</span>
                                      </td>
                                      <td>{p.activated_devices || 0} / {p.max_devices || 1}</td>
                                      <td style={{ fontWeight: 700 }}>₦{parseFloat(p.amount_paid || 1400).toLocaleString()}</td>
                                      <td>
                                        <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                          {p.status}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                                          <button
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                            title="Edit Passcode Categories & Subjects"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingPasscode(p);
                                              setEditPasscodeCategories(cats);

                                              // Pre-select subjects: if allowed_subjects is empty, pre-check all available subjects for enabled categories
                                              if (rawSubList.length > 0) {
                                                setEditPasscodeSubjects(rawSubList);
                                              } else {
                                                const allSubNames = dbSubjects.filter(s => cats.includes(s.exam_type)).map(s => s.name);
                                                setEditPasscodeSubjects(Array.from(new Set(allSubNames)));
                                              }
                                            }}
                                          >
                                            <Edit size={14} /> Manage Access
                                          </button>
                                          {p.status === 'active' ? (
                                            <button
                                              className="btn btn-danger"
                                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                              title="Revoke / Suspend Passcode"
                                              onClick={(e) => { e.stopPropagation(); handleRevokePasscode(p.passcode); }}
                                            >
                                              <Ban size={14} /> Revoke
                                            </button>
                                          ) : (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Suspended</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* PRICING SETTINGS TAB */}
        {activeTab === 'PRICING' && (
          <div className="admin-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} /> Pricing Settings Configuration
            </h2>
            <form onSubmit={handleSavePricing}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Single Passcode Price (6 Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.single_passcode_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, single_passcode_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Small Bulk Unit Price (2-9 Passcodes, 6 Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.small_bulk_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, small_bulk_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Large Bulk Unit Price (10+ Passcodes, 6 Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.large_bulk_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, large_bulk_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save Pricing Changes
              </button>
            </form>
          </div>
        )}

        {/* PROMO CODES TAB */}
        {activeTab === 'PROMOS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} /> Create New Promo Code
              </h2>
              <form onSubmit={handleCreatePromo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Code String</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SAVE20"
                    value={newPromoForm.code}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Discount Type</label>
                  <select
                    className="form-input"
                    value={newPromoForm.discount_type}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₦)</option>
                    <option value="free">100% Free</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Discount Value</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPromoForm.discount_value}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discount_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Max Usage</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPromoForm.max_uses}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, max_uses: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newPromoForm.expires_at}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, expires_at: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
                  Create Code
                </button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Active &amp; Historical Promo Codes</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter promo codes..."
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  style={{ width: '220px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                />
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Uses / Max</th>
                    <th>Expires At</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No promo codes created yet.</td></tr>
                  ) : (
                    promos
                      .filter(p => !promoSearch || p.code.toLowerCase().includes(promoSearch.toLowerCase()))
                      .map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem' }}>{p.code}</td>
                          <td><span className="badge badge-info">{p.discount_type}</span></td>
                          <td>{p.discount_type === 'percentage' ? `${p.discount_value}%` : p.discount_type === 'fixed' ? `₦${p.discount_value}` : 'Free'}</td>
                          <td>{p.uses_count || 0} / {p.max_uses || '∞'}</td>
                          <td>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Never'}</td>
                          <td>
                            <span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`}>
                              {p.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                onClick={() => handleTogglePromo(p.id, p.active)}
                              >
                                {p.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '4px 8px' }}
                                onClick={() => handleDeletePromo(p.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN NEWS TAB */}
        {activeTab === 'NEWS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Newspaper size={20} /> Publish Admin News Announcement
              </h2>
              <form onSubmit={handleCreateNews}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Article Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CBT Software Version 3.0 Release Notes"
                      value={newNewsForm.title}
                      onChange={(e) => setNewNewsForm({ ...newNewsForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Publication Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={newNewsForm.published_at}
                      onChange={(e) => setNewNewsForm({ ...newNewsForm, published_at: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label">Article Content</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Enter the full announcement news content here..."
                    value={newNewsForm.content}
                    onChange={(e) => setNewNewsForm({ ...newNewsForm, content: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Newspaper size={18} /> Publish News Post
                </button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Published Admin News Articles</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search news posts..."
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                  style={{ width: '220px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {news.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No news articles published.</div>
                ) : (
                  news
                    .filter(n => !newsSearch || n.title.toLowerCase().includes(newsSearch.toLowerCase()) || n.content.toLowerCase().includes(newsSearch.toLowerCase()))
                    .map(n => (
                      <div key={n.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem', backgroundColor: 'var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{n.title}</h3>
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteNews(n.id)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 0.8rem 0' }}>{n.content}</p>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Published: {new Date(n.published_at || n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SOFTWARE RELEASE TAB */}
        {activeTab === 'UPDATES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} /> Publish Desktop Software Release
              </h2>
              <form onSubmit={handleCreateUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Version Tag</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. v3.0.2"
                      value={newUpdateForm.version}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, version: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Firmware Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newUpdateForm.firmware}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, firmware: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Installer Size</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newUpdateForm.size}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, size: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Download Package URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://filloptech.com/downloads/fillop-cbt-v3.0.2.exe"
                    value={newUpdateForm.url}
                    onChange={(e) => setNewUpdateForm({ ...newUpdateForm, url: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label">Changelog &amp; Release Notes</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe new features, bug fixes, performance improvements..."
                    value={newUpdateForm.improvements}
                    onChange={(e) => setNewUpdateForm({ ...newUpdateForm, improvements: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={18} /> Publish Software Update
                </button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Published Release History</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter releases..."
                  value={updateSearch}
                  onChange={(e) => setUpdateSearch(e.target.value)}
                  style={{ width: '220px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                />
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Firmware</th>
                    <th>Size</th>
                    <th>Changelog</th>
                    <th>Download Link</th>
                    <th>Release Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {updatesList.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No software releases published yet.</td></tr>
                  ) : (
                    updatesList
                      .filter(u => !updateSearch || u.version.toLowerCase().includes(updateSearch.toLowerCase()) || u.improvements.toLowerCase().includes(updateSearch.toLowerCase()))
                      .map(u => (
                        <tr key={u.id}>
                          <td><span className="badge badge-success">{u.version}</span></td>
                          <td style={{ fontFamily: 'monospace' }}>{u.firmware}</td>
                          <td>{u.size}</td>
                          <td style={{ maxWidth: '280px', fontSize: '0.82rem' }}>{u.improvements}</td>
                          <td>
                            <a href={u.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                              Download URL
                            </a>
                          </td>
                          <td>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteUpdate(u.id)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* EXAM RESULT DETAILS MODAL */}
      {selectedResultDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Submission Details — {selectedResultDetails.candidate_name || 'Candidate'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', marginBottom: '1rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '10px' }}>
              <div><strong>Email:</strong> {selectedResultDetails.email}</div>
              <div><strong>Exam Type:</strong> {selectedResultDetails.exam_type}</div>
              <div><strong>Score:</strong> {selectedResultDetails.score} / {selectedResultDetails.total_questions} ({Number(selectedResultDetails.percentage).toFixed(2)}%)</div>
              <div><strong>Date:</strong> {new Date(selectedResultDetails.submitted_at).toLocaleString()}</div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Full Response Data (JSON)</h4>
            <pre style={{ background: '#09081e', color: '#38bdf8', padding: '1rem', borderRadius: '10px', fontSize: '0.78rem', overflowX: 'auto', maxHeight: '250px' }}>
              {selectedResultDetails.details ? JSON.stringify(JSON.parse(selectedResultDetails.details || '{}'), null, 2) : 'No raw details logged.'}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedResultDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CANDIDATE MODAL */}
      {editingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '440px', width: '90%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Edit Candidate Details
            </h3>
            <form onSubmit={handleUpdateUser}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">School / Institution</label>
                <input
                  type="text"
                  className="form-input"
                  value={editUserForm.school}
                  onChange={(e) => setEditUserForm({ ...editUserForm, school: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE PASSCODE CATEGORIES & SUBJECTS MODAL */}
      {editingPasscode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '650px', width: '92%', maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Manage Passcode Access — <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{editingPasscode.passcode}</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              Candidate: <strong>{editingPasscode.email}</strong>
            </p>

            <form onSubmit={handleSavePasscodeSubjects}>
              {/* Exam Categories Checkboxes */}
              <div style={{ marginBottom: '1.5rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px' }}>
                <label className="form-label" style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>
                  Exam Categories (Add / Remove)
                </label>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {['JAMB', 'WAEC', 'NECO'].map(cat => {
                    const isChecked = editPasscodeCategories.includes(cat);
                    return (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditPasscodeCategories([...editPasscodeCategories, cat]);
                            } else {
                              setEditPasscodeCategories(editPasscodeCategories.filter(c => c !== cat));
                            }
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        {cat}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Subject Selection Multi-Select Checkboxes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 800, margin: 0 }}>
                    Allowed Subjects (Grouped by Category)
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={() => setEditPasscodeSubjects([])}
                  >
                    Clear Restrictions (Unlock All Subjects)
                  </button>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                  Leave all unchecked to give candidate access to <strong>all subjects</strong> under their enabled categories.
                </p>

                {editPasscodeCategories.length === 0 ? (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Please select at least one exam category above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {editPasscodeCategories.map(cat => {
                      const catSubjects = dbSubjects.filter(s => s.exam_type === cat);
                      return (
                        <div key={cat} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem', backgroundColor: 'var(--bg-card)' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
                            {cat} Category ({catSubjects.length} Subjects)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                            {catSubjects.map(sub => {
                              const isChecked = editPasscodeSubjects.includes(sub.name);
                              return (
                                <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: isChecked ? 700 : 500, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditPasscodeSubjects([...editPasscodeSubjects, sub.name]);
                                      } else {
                                        setEditPasscodeSubjects(editPasscodeSubjects.filter(sName => sName !== sub.name));
                                      }
                                    }}
                                  />
                                  <span>{sub.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPasscode(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Access Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
