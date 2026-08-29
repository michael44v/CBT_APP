import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  FileCheck,
  UserX,
  UserCheck,
  Eye,
  EyeOff
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

  // Extended Stats State
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

  // Bulk Import State
  const [csvInput, setCsvInput] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

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
        setStats(prev => ({ ...prev, ...data.analytics }));
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
        setUsers(data.users || []);
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
        setPromos(data.promo_codes || []);
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
        setQuestions(data.questions || []);
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
        setNews(data.news || []);
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

  // Update CSV Preview Table whenever csvInput changes
  useEffect(() => {
    if (!csvInput.trim()) {
      setPreviewRows([]);
      return;
    }
    try {
      const lines = csvInput.trim().split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        setPreviewRows([]);
        return;
      }
      const firstLine = lines[0];
      const delimiter = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        return rowObj;
      });
      setPreviewRows(preview);
    } catch (e) {
      setPreviewRows([]);
    }
  }, [csvInput]);

  // Candidate Actions: Disable (Toggle Status) & Delete Account
  const handleToggleUserDisable = async (user: any) => {
    const isSuspended = user.status === 'suspended';
    const newStatus = isSuspended ? 'active' : 'suspended';
    const actionLabel = isSuspended ? 'Enable' : 'Disable';

    if (!window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} candidate "${user.name}" (${user.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_update_user_status',
          email: user.email,
          status: newStatus
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Candidate ${actionLabel.toLowerCase()}d successfully!`);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      } else {
        showNotification(data.message || `Failed to ${actionLabel.toLowerCase()} user.`, 'error');
      }
    } catch (e) {
      showNotification(`Failed to ${actionLabel.toLowerCase()} candidate.`, 'error');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Are you sure you want to permanently DELETE candidate account "${user.name}" (${user.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_delete_user',
          id: user.id,
          email: user.email
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Candidate account deleted successfully!');
        setUsers(prev => prev.filter(u => u.id !== user.id));
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to delete candidate.', 'error');
      }
    } catch (e) {
      showNotification('Failed to delete candidate account.', 'error');
    }
  };

  // Question Action: Delete Question
  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm(`Are you sure you want to delete question #${qId}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_delete_question',
          id: qId
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Question deleted successfully!');
        setQuestions(prev => prev.filter(q => q.id !== qId));
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to delete question.', 'error');
      }
    } catch (e) {
      showNotification('Failed to delete question.', 'error');
    }
  };

  // Handle XLSX / CSV File Select & Client-Side XLSX Conversion via SheetJS
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          setCsvInput(csvText);
          showNotification('Excel file parsed successfully!');
        } catch (err) {
          showNotification('Failed to parse Excel file.', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setCsvInput(evt.target.result as string);
          showNotification('CSV file loaded successfully!');
        }
      };
      reader.readAsText(file);
    }
  };

  // Download Bulk Import Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'exam_type,subject,year,topic,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer,topic_explanation,correct_explanation,wrong_explanations\n' +
      'JAMB,Mathematics,2024,Mathematics Core Topics,medium,Solve for x in the equation 2x + 5 = 15.,5,10,20,15,A,Linear Equations,2x = 10 so x = 5.,Incorrect options arise from algebraic arithmetic errors.\n' +
      'WAEC,English Language,2023,English Language Core Topics,easy,Choose the option opposite in meaning to ANCIENT.,Old,Modern,Aged,Historic,B,Antonyms,Modern is the direct antonym of ancient.,Old and historic are synonyms of ancient.';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'cbt_questions_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // News Actions: Create, Edit, Delete
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editingNewsId
        ? { action: 'update', id: editingNewsId, ...newNewsForm }
        : { action: 'create', ...newNewsForm };

      const res = await fetch(`${API_BASE}/admin/news.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(editingNewsId ? 'News updated successfully!' : 'News announcement published!');
        setEditingNewsId(null);
        setNewNewsForm({
          title: '',
          content: '',
          icon_name: 'newspaper',
          thumbnail_url: '',
          published_at: new Date().toISOString().slice(0, 16)
        });
        fetchNews();
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to save news.', 'error');
      }
    } catch (e) {
      showNotification('Save news failed.', 'error');
    }
  };

  const handleDeleteNews = async (newsId: number) => {
    if (!window.confirm(`Are you sure you want to delete news announcement #${newsId}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: newsId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('News deleted successfully!');
        setNews(prev => prev.filter(n => n.id !== newsId));
        fetchStatsAndAnalytics();
      } else {
        showNotification(data.message || 'Failed to delete news.', 'error');
      }
    } catch (e) {
      showNotification('Delete news failed.', 'error');
    }
  };

  const handleEditNews = (item: any) => {
    setEditingNewsId(item.id);
    setNewNewsForm({
      title: item.title || '',
      content: item.content || '',
      icon_name: item.icon_name || 'newspaper',
      thumbnail_url: item.thumbnail_url || '',
      published_at: item.published_at ? item.published_at.slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
  };

  // Cloudinary News Image Upload
  const handleNewsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingNewsImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'futyApp');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dguvkirdr/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        setNewNewsForm(prev => ({ ...prev, thumbnail_url: data.secure_url }));
        showNotification('Thumbnail image uploaded to Cloudinary!');
      } else {
        showNotification('Image upload failed.', 'error');
      }
    } catch (err) {
      showNotification('Cloudinary upload error.', 'error');
    } finally {
      setUploadingNewsImage(false);
    }
  };

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
        showNotification(data.message || 'Bulk import completed successfully!');
        setCsvInput('');
        fetchQuestions();
        fetchStatsAndAnalytics();
      } else {
        if (data.errors && data.errors.length > 0) {
          setImportErrors(data.errors);
        }
        showNotification(data.message || 'Bulk import validation failed.', 'error');
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
              {activeTab === 'DASHBOARD' && 'Management Dashboard Overview'}
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

        {/* ================= 1. REBUILT MANAGEMENT DASHBOARD OVERVIEW ================= */}
        {activeTab === 'DASHBOARD' && (
          <div>
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>

              {/* Card 1: Uploaded Results & Performance Analytics */}
              <div className="stat-card" onClick={() => setActiveTab('RESULTS')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Results &amp; Analytics</div>
                  <BarChart3 size={22} color="var(--accent)" />
                </div>
                <div className="stat-val">{resultsList.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Uploaded exam attempts ›</div>
              </div>

              {/* Card 2: Passcode Subject Allocations & Licensing */}
              <div className="stat-card" onClick={() => setActiveTab('PASSCODES')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Total Passcodes</div>
                  <Key size={22} color="var(--success)" />
                </div>
                <div className="stat-val" style={{ color: 'var(--success)' }}>{stats.total_passcodes || (stats.active_passcodes + stats.suspended_passcodes)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{stats.active_passcodes} Active • {stats.suspended_passcodes} Suspended ›</div>
              </div>

              {/* Card 3: Passcode Upgrade Requests & Logs */}
              <div className="stat-card" onClick={() => setActiveTab('UPGRADES')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Pending Upgrades</div>
                  <RefreshCw size={22} color="var(--warning)" />
                </div>
                <div className="stat-val" style={{ color: stats.pending_upgrades > 0 ? 'var(--warning)' : 'var(--text-color)' }}>
                  {stats.pending_upgrades}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Awaiting admin approval ›</div>
              </div>

              {/* Card 4: Dynamic Pricing Configuration */}
              <div className="stat-card" onClick={() => setActiveTab('PRICING')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Pricing Configuration</div>
                  <DollarSign size={22} color="var(--accent)" />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '4px' }}>
                  ₦{pricingForm.single_passcode_price_6m} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ Single</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Small: ₦{pricingForm.small_bulk_price_6m} • Bulk: ₦{pricingForm.large_bulk_price_6m} ›
                </div>
              </div>

              {/* Card 5: Promo Codes */}
              <div className="stat-card" onClick={() => setActiveTab('PROMOS')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Active Promos</div>
                  <Tag size={22} color="var(--success)" />
                </div>
                <div className="stat-val" style={{ color: 'var(--success)' }}>{stats.active_promos || stats.total_promos}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{stats.total_promos} total promo codes ›</div>
              </div>

              {/* Card 6: Available Questions */}
              <div className="stat-card" onClick={() => setActiveTab('QUESTIONS')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Question Bank</div>
                  <BookOpen size={22} color="var(--accent)" />
                </div>
                <div className="stat-val">{stats.total_questions}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Total available questions ›</div>
              </div>

              {/* Card 7: News Published */}
              <div className="stat-card" onClick={() => setActiveTab('NEWS')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">News Published</div>
                  <Newspaper size={22} color="var(--accent)" />
                </div>
                <div className="stat-val">{stats.news_count || news.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Active announcements ›</div>
              </div>

              {/* Card 8: Software Updates */}
              <div className="stat-card" onClick={() => setActiveTab('UPDATES')} style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="stat-label">Software Release</div>
                  <Settings size={22} color="var(--accent)" />
                </div>
                <div className="stat-val" style={{ fontSize: '1.5rem' }}>{stats.latest_update_version}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{stats.updates_count || updatesList.length} releases published ›</div>
              </div>

            </div>

            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} /> System Operational Overview
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Welcome to the Fillop CBT Guru central administrative portal. Click any summary card above or sidebar menu item to jump directly to specific management modules.
              </p>
              <button className="btn btn-secondary" onClick={() => { fetchStatsAndAnalytics(); fetchPricing(); fetchNews(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} /> Refresh Dashboard Data
              </button>
            </div>
          </div>
        )}

        {/* ================= RESULTS & ANALYTICS TAB ================= */}
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

        {/* ================= 2. CANDIDATES TAB WITH ACTION BUTTONS ================= */}
        {activeTab === 'USERS' && (
          <div className="admin-card">
            <div className="card-title">
              <span>Candidate List &amp; Subscriptions</span>
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
                  <th>State / School</th>
                  <th>Status</th>
                  <th>Signed Up At</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No candidates registered yet.</td></tr>
                ) : (
                  users.map((u) => {
                    const isSuspended = u.status === 'suspended';
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '600' }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || 'N/A'}</td>
                        <td>{u.school || u.state || 'N/A'}</td>
                        <td>
                          <span className={`badge ${isSuspended ? 'badge-danger' : 'badge-success'}`}>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className={`btn ${isSuspended ? 'btn-success' : 'btn-secondary'}`}
                              onClick={() => handleToggleUserDisable(u)}
                              title={isSuspended ? "Enable Account" : "Disable Account"}
                              style={{ padding: '4px 8px' }}
                            >
                              {isSuspended ? <UserCheck size={16} /> : <UserX size={16} />}
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteUser(u)}
                              title="Delete Account"
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= PASSCODES TAB ================= */}
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
                  <label className="form-label">Allowed Subject Combination</label>
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

        {/* ================= 3. QUESTION MANAGEMENT WITH DELETE & ENHANCED BULK IMPORT ================= */}
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

            {/* Bulk CSV / XLSX Question Import Card */}
            <div className="admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} /> Bulk CSV / XLSX Question Management &amp; Validation
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadTemplate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <Download size={15} /> Download CSV Template
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file or paste raw CSV data. Subject and topic names are validated case-insensitively against the database. Validates all rows before importing.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Upload File (.csv or .xlsx)</label>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="form-input"
                  onChange={handleFileUpload}
                />
              </div>

              <form onSubmit={handleBulkImport}>
                <div className="form-group">
                  <label className="form-label">Or Paste / Edit Raw CSV Data</label>
                  <textarea
                    className="textarea-csv"
                    placeholder="exam_type,subject,year,topic,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer&#10;JAMB,Mathematics,2024,Mathematics Core Topics,medium,Find roots of x^2 - 9 = 0,3,9,-3,0,A"
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    required
                  />
                </div>

                {/* Preview Table for first 5 rows */}
                {previewRows.length > 0 && (
                  <div style={{ marginBottom: '1.2rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-color)' }}>
                      Preview (First 5 Parsed Rows):
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ fontSize: '0.8rem', width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Exam</th>
                            <th>Subject</th>
                            <th>Year</th>
                            <th>Topic</th>
                            <th>Question</th>
                            <th>Ans</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((r, i) => (
                            <tr key={i}>
                              <td><strong>{r.exam_type || 'N/A'}</strong></td>
                              <td>{r.subject || r.subject_name || 'N/A'}</td>
                              <td>{r.year || 'N/A'}</td>
                              <td>{r.topic || r.topic_name || 'N/A'}</td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.question_text || 'N/A'}</td>
                              <td><strong>{r.correct_answer || 'N/A'}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} /> Process &amp; Import Questions
                </button>
              </form>

              {importSuccessMsg && (
                <div style={{ color: 'var(--success)', marginTop: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> {importSuccessMsg}
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="errors-box" style={{ marginTop: '1rem' }}>
                  <div className="errors-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 700 }}>
                    <AlertTriangle size={16} /> Import Validation Issues ({importErrors.length}):
                  </div>
                  <ul className="errors-list" style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
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
                  <label className="form-label">Select Subject</label>
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

            {/* Questions List with Per-Row Delete Button */}
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
                    <th>Ans</th>
                    <th>Difficulty</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No questions match filters.</td></tr>
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
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Delete Question"
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={16} />
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

        {/* ================= 4. ADMIN NEWS MANAGEMENT TAB ================= */}
        {activeTab === 'NEWS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">
                {editingNewsId ? 'Edit Announcement' : 'Publish Admin News Announcement'}
              </h2>
              <form onSubmit={handleSaveNews} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Announcement Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Official JAMB 2026 Registration Announcement"
                    value={newNewsForm.title}
                    onChange={(e) => setNewNewsForm({ ...newNewsForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Full Content / Body</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    placeholder="Enter announcement details..."
                    value={newNewsForm.content}
                    onChange={(e) => setNewNewsForm({ ...newNewsForm, content: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Icon Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="newspaper"
                    value={newNewsForm.icon_name}
                    onChange={(e) => setNewNewsForm({ ...newNewsForm, icon_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Publish Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={newNewsForm.published_at}
                    onChange={(e) => setNewNewsForm({ ...newNewsForm, published_at: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Thumbnail Cover Photo URL (or Upload)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="https://cbt.filloptech.com/uploads/news_banner.jpg"
                      value={newNewsForm.thumbnail_url}
                      onChange={(e) => setNewNewsForm({ ...newNewsForm, thumbnail_url: e.target.value })}
                    />
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={16} /> {uploadingNewsImage ? 'Uploading...' : 'Upload Image'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleNewsImageUpload} disabled={uploadingNewsImage} />
                    </label>
                  </div>
                  {newNewsForm.thumbnail_url && (
                    <img src={newNewsForm.thumbnail_url} alt="Thumbnail Preview" style={{ marginTop: '8px', maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Newspaper size={16} /> {editingNewsId ? 'Update News Announcement' : 'Publish Announcement'}
                  </button>
                  {editingNewsId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingNewsId(null);
                        setNewNewsForm({
                          title: '',
                          content: '',
                          icon_name: 'newspaper',
                          thumbnail_url: '',
                          published_at: new Date().toISOString().slice(0, 16)
                        });
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Published Admin News Announcements</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Published At</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {news.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No news announcements published yet.</td></tr>
                  ) : (
                    news.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ fontWeight: '600', maxWidth: '300px' }}>{item.title}</td>
                        <td>{new Date(item.published_at || item.created_at).toLocaleString()}</td>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleEditNews(item)}
                              title="Edit News"
                              style={{ padding: '4px 8px' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteNews(item.id)}
                              title="Delete News"
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={16} />
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

        {/* ================= PRICING TAB ================= */}
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

        {/* ================= INSTITUTIONS TAB ================= */}
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
