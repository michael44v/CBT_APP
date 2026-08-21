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
  AlertTriangle
} from 'lucide-react';

const API_BASE = 'http://localhost:80/fillop/api/v1';

const ALL_SUBJECT_OPTIONS = ["Mathematics", "English", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature"];

export default function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'PASSCODES' | 'INSTITUTIONS' | 'PRICING' | 'PROMOS' | 'QUESTIONS' | 'NEWS' | 'UPGRADES' | 'UPDATES'>('DASHBOARD');

  // Stats
  const [stats, setStats] = useState({
    total_users: 0,
    active_passcodes: 0,
    suspended_passcodes: 0,
    estimated_revenue: 0,
    total_questions: 0,
    total_promos: 0,
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
  const [newUpdateForm, setNewUpdateForm] = useState({
    version: '',
    firmware: '',
    improvements: '',
    size: '45.0 MB',
    url: ''
  });

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

  // New Passcode / Bulk Form
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
    allowed_subjects: ['Mathematics', 'English', 'Physics', 'Chemistry'],
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

  // Bulk Import
  const [csvInput, setCsvInput] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Subjects and Topics master list for Question Bank and Topic Management
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [dbTopics, setDbTopics] = useState<any[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState<number | ''>('');

  // New News Form
  const [newNewsForm, setNewNewsForm] = useState({
    title: '',
    content: '',
    icon_name: 'newspaper',
    thumbnail_url: '',
    published_at: new Date().toISOString().slice(0, 16)
  });
  const [uploadingNewsImage, setUploadingNewsImage] = useState(false);

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
      }
    } catch (e) {
      console.error('Failed to fetch subjects and topics', e);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'futyApp');

    const res = await fetch('https://api.cloudinary.com/v1_1/dguvkirdr/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error(data.error?.message || 'Cloudinary upload failed');
    }
  };

  const handleNewsImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNewsImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setNewNewsForm(prev => ({ ...prev, thumbnail_url: url }));
      showNotification('Thumbnail uploaded to Cloudinary successfully!');
    } catch (err: any) {
      showNotification(`Image upload failed: ${err.message}`, 'error');
    } finally {
      setUploadingNewsImage(false);
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

  // Load stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics.php`);
      const data = await res.json();
      if (data.success) {
        setStats(data.analytics);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  // Load Pricing Settings
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

  // Load Users
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

  // Load Passcodes, Organizations & Upgrade Requests
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

  // Load Promos
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

  // Load Questions
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

  // Load News
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

  useEffect(() => {
    fetchStats();
    fetchPricing();
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'PASSCODES' || activeTab === 'INSTITUTIONS' || activeTab === 'UPGRADES') fetchPasscodes();
    if (activeTab === 'PROMOS') fetchPromos();
    if (activeTab === 'QUESTIONS') {
      fetchQuestions();
      fetchSubjectsAndTopics();
    }
    if (activeTab === 'NEWS') fetchNews();
    if (activeTab === 'UPDATES') fetchUpdates();
    if (activeTab === 'PRICING') fetchPricing();
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

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
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
        fetchStats();
        setNewPasscodeForm({
          email: '',
          quantity: 1,
          max_devices: 1,
          duration_days: 180,
          organization_name: '',
          organization_type: 'Secondary School',
          contact_person: '',
          contact_phone: '',
          exam_category: 'JAMB',
          allowed_subjects: ['Mathematics', 'English', 'Physics', 'Chemistry'],
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to generate passcodes.', 'error');
    }
  };

  const handleReplacePasscode = async (oldPasscode: string) => {
    if (!window.confirm(`Revoke passcode ${oldPasscode} and generate a replacement passcode with the same duration/settings?`)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'replace', passcode: oldPasscode }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Replacement created: ${data.new_passcode}`);
        fetchPasscodes();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Replace passcode failed.', 'error');
    }
  };

  const handleToggleUserStatus = async (email: string, currentStatus: string) => {
    try {
      const action = currentStatus === 'suspended' ? 'reactivate' : 'suspend';
      const res = await fetch(`${API_BASE}/admin/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchUsers();
        fetchStats();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Action failed.', 'error');
    }
  };

  const handleUpdatePasscodeSubjects = async (passcode: string, currentCategory: string, currentSubjs: string) => {
    const newCategory = window.prompt("Enter Exam Category (JAMB, WAEC, NECO, ALL or comma-separated):", currentCategory || 'JAMB');
    if (!newCategory) return;
    const newSubjsStr = window.prompt("Enter Comma-Separated Subjects:", currentSubjs || 'Mathematics,English,Physics,Chemistry');
    if (newSubjsStr === null) return;

    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_subjects',
          passcode,
          exam_category: newCategory.trim().toUpperCase(),
          allowed_subjects: newSubjsStr.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchPasscodes();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Update subject allocations failed.', 'error');
    }
  };

  const handleRevokePasscode = async (passcode: string) => {
    if (!window.confirm('Are you sure you want to suspend/revoke this passcode?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', passcode }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchPasscodes();
        fetchStats();
      }
    } catch (e) {
      showNotification('Revoke action failed.', 'error');
    }
  };

  const handleExtendPasscode = async (passcode: string) => {
    const daysStr = window.prompt('Enter number of days to extend this passcode subscription:', '30');
    if (!daysStr) return;
    const days = parseInt(daysStr);
    if (isNaN(days) || days <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', passcode, days }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchPasscodes();
      }
    } catch (e) {
      showNotification('Extend action failed.', 'error');
    }
  };

  const handleApproveUpgrade = async (upgradeId: number) => {
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_upgrade', upgrade_id: upgradeId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchPasscodes();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Approve upgrade action failed.', 'error');
    }
  };

  const handleRejectUpgrade = async (upgradeId: number) => {
    const notes = window.prompt("Reason or notes for rejecting upgrade request:", "Rejected by administrator");
    if (notes === null) return;

    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_upgrade', upgrade_id: upgradeId, admin_notes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchPasscodes();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Reject upgrade action failed.', 'error');
    }
  };

  const exportPasscodesCSV = () => {
    let csv = "Passcode,Email,Organization,Category,Allowed Subjects,Devices,Status,Expires At\n";
    passcodes.forEach(p => {
      csv += `"${p.passcode}","${p.email}","${p.organization_name || ''}","${p.exam_category}","${p.allowed_subjects || ''}",${p.max_devices},"${p.status}","${p.expires_at || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fillop_Passcode_Report.csv';
    a.click();
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/promo_codes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromoForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Promo code created successfully.');
        fetchPromos();
        fetchStats();
        setNewPromoForm({
          code: '',
          discount_type: 'percentage',
          discount_value: 20,
          max_uses: 100,
          expires_at: '',
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Create promo code failed.', 'error');
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
        fetchStats();
        setNewQuestionForm({
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
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to add question.', 'error');
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchQuestions();
        fetchStats();
      }
    } catch (e) {
      showNotification('Delete failed.', 'error');
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newNewsForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('News article posted successfully!');
        fetchNews();
        setNewNewsForm({
          title: '',
          content: '',
          icon_name: 'newspaper',
          thumbnail_url: '',
          published_at: new Date().toISOString().slice(0, 16)
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to post news.', 'error');
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!window.confirm('Delete this news article permanently?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/news.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchNews();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Delete news failed.', 'error');
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

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/updates.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newUpdateForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Software update added successfully!');
        fetchUpdates();
        setNewUpdateForm({
          version: '',
          firmware: '',
          improvements: '',
          size: '45.0 MB',
          url: ''
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to add software update.', 'error');
    }
  };

  const handleDeleteUpdate = async (id: number) => {
    if (!window.confirm('Delete this software update record?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/updates.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchUpdates();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Delete update failed.', 'error');
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
        fetchStats();
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

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span>🛡️</span> Fillop Guru Admin
        </div>
        <nav className="sidebar-menu">
          <button className={`menu-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>📊 Dashboard</button>
          <button className={`menu-btn ${activeTab === 'USERS' ? 'active' : ''}`} onClick={() => setActiveTab('USERS')}>👥 Candidates</button>
          <button className={`menu-btn ${activeTab === 'PASSCODES' ? 'active' : ''}`} onClick={() => setActiveTab('PASSCODES')}>🔑 Passcodes</button>
          <button className={`menu-btn ${activeTab === 'UPGRADES' ? 'active' : ''}`} onClick={() => setActiveTab('UPGRADES')}>🔄 Upgrade Requests &amp; Logs</button>
          <button className={`menu-btn ${activeTab === 'INSTITUTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('INSTITUTIONS')}>🏫 Institutions &amp; Bulk</button>
          <button className={`menu-btn ${activeTab === 'PRICING' ? 'active' : ''}`} onClick={() => setActiveTab('PRICING')}>💰 Pricing Settings</button>
          <button className={`menu-btn ${activeTab === 'PROMOS' ? 'active' : ''}`} onClick={() => setActiveTab('PROMOS')}>🎟️ Promo Codes</button>
          <button className={`menu-btn ${activeTab === 'QUESTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTIONS')}>📚 Question Bank</button>
          <button className={`menu-btn ${activeTab === 'NEWS' ? 'active' : ''}`} onClick={() => setActiveTab('NEWS')}>📰 Admin News</button>
          <button className={`menu-btn ${activeTab === 'UPDATES' ? 'active' : ''}`} onClick={() => setActiveTab('UPDATES')}>⚙️ Software Updates</button>
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {notification.text}
          </div>
        )}

        <header className="admin-header">
          <div>
            <h1 className="admin-title">
              {activeTab === 'DASHBOARD' && 'Management Dashboard'}
              {activeTab === 'USERS' && 'Candidates / Subscriptions'}
              {activeTab === 'PASSCODES' && 'Passcode Subject Allocations & Licensing'}
              {activeTab === 'UPGRADES' && 'Passcode Subject & Category Upgrade Requests'}
              {activeTab === 'INSTITUTIONS' && 'Institutional Licensing & Bulk Accounts'}
              {activeTab === 'PRICING' && 'Dynamic Pricing Configuration'}
              {activeTab === 'PROMOS' && 'Promotions & Referral Codes'}
              {activeTab === 'QUESTIONS' && 'Question Bank Master Management'}
              {activeTab === 'NEWS' && 'Admin News Management'}
              {activeTab === 'UPDATES' && 'Software Release & Firmware Updates Management'}
            </h1>
            <p className="admin-subtitle">Fillop CBT Guru Cloud Admin Panel</p>
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
              <h2 className="card-title">Subject Access Control & Usage Statistics</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Fillop CBT Guru enforces subject restrictions tied directly to passcodes.
                Currently, <strong>{stats.total_questions} questions</strong> are active across Mathematics, English, Physics, Chemistry, Biology, Economics, Government, and Literature.
              </p>
              <button className="btn btn-secondary" onClick={fetchStats}>🔄 Refresh Core Analytics</button>
            </div>
          </div>
        )}

        {activeTab === 'UPGRADES' && (
          <div className="admin-card">
            <div className="card-title">
              <span>Passcode Upgrade Activity &amp; Admin Approval Queue</span>
              <button className="btn btn-secondary btn-sm" onClick={fetchPasscodes}>🔄 Refresh Queue</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Passcode</th>
                  <th>Candidate Email</th>
                  <th>Categories (Old → New)</th>
                  <th>New Subjects Requested</th>
                  <th>Amount Paid</th>
                  <th>Payment Status</th>
                  <th>Request Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upgrades.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No upgrade requests or history recorded yet.</td></tr>
                ) : (
                  upgrades.map((upg) => {
                    const statusClass = upg.status === 'completed' || upg.status === 'approved' ? 'badge-success' : upg.status === 'rejected' ? 'badge-danger' : 'badge-warning';
                    return (
                      <tr key={upg.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>{upg.passcode}</td>
                        <td>{upg.email}</td>
                        <td>
                          <div><small style={{ color: 'var(--text-secondary)' }}>From:</small> {upg.old_categories}</div>
                          <div><strong>To:</strong> <span className="badge badge-info">{upg.new_categories}</span></div>
                        </td>
                        <td style={{ maxWidth: '200px', fontSize: '12px' }}>{upg.new_subjects}</td>
                        <td><strong>₦{parseFloat(upg.amount_paid || 0).toLocaleString()}</strong></td>
                        <td>
                          <span className={`badge ${upg.payment_status === 'paid' ? 'badge-success' : upg.payment_status === 'free' ? 'badge-info' : 'badge-warning'}`}>
                            {upg.payment_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusClass}`}>
                            {upg.status}
                          </span>
                        </td>
                        <td>{new Date(upg.created_at).toLocaleString()}</td>
                        <td>
                          {upg.status === 'pending_approval' ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn btn-success btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleApproveUpgrade(upg.id)}>Approve ✅</button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleRejectUpgrade(upg.id)}>Reject ❌</button>
                            </div>
                          ) : (
                            <small style={{ color: 'var(--text-secondary)' }}>{upg.admin_notes || 'Processed'}</small>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'PRICING' && (
          <div className="admin-card">
            <h2 className="card-title">Modify Dynamic Passcode Pricing Tiers</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Update subscription pricing tiers without modifying source code. Prices take effect dynamically across all web subscription checkout flows and API calculations.
            </p>
            <form onSubmit={handleUpdatePricing} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Single Passcode Price (1 Code, 6 Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.single_passcode_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, single_passcode_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Small Bulk Price (2–9 Codes, 6 Months Unit)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.small_bulk_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, small_bulk_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Large Bulk Price (10+ Codes, 6 Months Unit)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pricingForm.large_bulk_price_6m}
                  onChange={(e) => setPricingForm({ ...pricingForm, large_bulk_price_6m: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success" style={{ height: '42px', gridColumn: '1 / -1' }}>Save Pricing Settings 💾</button>
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
                    <option value="Government Agency">Government Agency</option>
                    <option value="NGO">NGO</option>
                    <option value="Scholarship Program">Scholarship Program</option>
                    <option value="Educational Foundation">Educational Foundation</option>
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

                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="08115501712"
                    value={newOrgForm.contact_phone}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, contact_phone: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn" style={{ height: '42px', gridColumn: '1 / -1' }}>Create Institutional Account 🏫</button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title">Registered Institutional Accounts</h2>
              <table>
                <thead>
                  <tr>
                    <th>Organization Name</th>
                    <th>Type</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Passcodes Count</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No institutional accounts registered.</td></tr>
                  ) : (
                    organizations.map((org) => (
                      <tr key={org.id}>
                        <td style={{ fontWeight: 'bold' }}>{org.name}</td>
                        <td><span className="badge badge-info">{org.type}</span></td>
                        <td>{org.contact_person || 'N/A'}</td>
                        <td>{org.contact_email || 'N/A'}</td>
                        <td>{org.contact_phone || 'N/A'}</td>
                        <td><strong>{org.passcode_count || 0}</strong> codes</td>
                        <td>{new Date(org.created_at).toLocaleDateString()}</td>
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
                  <th>Status Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No candidates registered yet.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600' }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>{u.state || 'N/A'}</td>
                      <td>{u.school || 'N/A'}</td>
                      <td>{new Date(u.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleUserStatus(u.email, 'active')}
                        >
                          Toggle Suspension ⚙️
                        </button>
                      </td>
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
                  <label className="form-label">Allowed Subject Combination</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {ALL_SUBJECT_OPTIONS.map(sub => {
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

                <button type="submit" className="btn" style={{ height: '42px', gridColumn: '1 / -1' }}>Generate Passcode(s) ⚡</button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Existing Passcodes &amp; Subject Allocations</span>
                <button className="btn btn-secondary btn-sm" onClick={exportPasscodesCSV}>📊 Export Passcodes Report (CSV)</button>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passcodes.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No passcodes generated.</td></tr>
                  ) : (
                    passcodes.map((p) => {
                      const isExpired = p.expires_at ? new Date(p.expires_at).getTime() < Date.now() : false;
                      const statusClass = p.status === 'suspended' ? 'badge-danger' : isExpired ? 'badge-warning' : 'badge-success';
                      return (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>{p.passcode}</td>
                          <td>
                            <div>{p.email}</div>
                            {p.organization_name && <small style={{ color: 'var(--text-secondary)' }}>🏫 {p.organization_name}</small>}
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
                          <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleUpdatePasscodeSubjects(p.passcode, p.exam_category, p.allowed_subjects)}>Edit ✏️</button>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleReplacePasscode(p.passcode)}>Replace 🔄</button>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleExtendPasscode(p.passcode)}>Extend ⏳</button>
                            {p.status === 'active' && (
                              <button className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleRevokePasscode(p.passcode)}>Suspend</button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'PROMOS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Create Referral / Promo Code</h2>
              <form onSubmit={handleAddPromo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Promo Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. GURUS50"
                    value={newPromoForm.code}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Type</label>
                  <select
                    className="form-input"
                    value={newPromoForm.discount_type}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₦)</option>
                    <option value="free">100% Free Login</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Value</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPromoForm.discount_value}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discount_value: parseFloat(e.target.value) || 0 })}
                    disabled={newPromoForm.discount_type === 'free'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Allowed Uses</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPromoForm.max_uses}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, max_uses: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <button type="submit" className="btn" style={{ height: '42px' }}>Create Promo 🎟️</button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title">Active Referral / Promo Campaigns</h2>
              <table>
                <thead>
                  <tr>
                    <th>Promo Code</th>
                    <th>Discount Details</th>
                    <th>Max Uses</th>
                    <th>Used Count</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No campaigns active.</td></tr>
                  ) : (
                    promos.map((pr) => (
                      <tr key={pr.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--success)' }}>{pr.code}</td>
                        <td>
                          {pr.discount_type === 'free' && '100% Free Login Activation'}
                          {pr.discount_type === 'percentage' && `${pr.discount_value}% Discount`}
                          {pr.discount_type === 'fixed' && `₦${parseFloat(pr.discount_value).toLocaleString()} Off`}
                        </td>
                        <td>{pr.max_uses}</td>
                        <td>
                          <strong>{pr.uses_count}</strong> times used
                        </td>
                        <td>
                          <span className={`badge ${pr.active ? 'badge-success' : 'badge-danger'}`}>
                            {pr.active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>{new Date(pr.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'UPDATES' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Add New Software Release Update</h2>
              <form onSubmit={handleAddUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Version</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. v3.0.2"
                      value={newUpdateForm.version}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, version: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Firmware</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. FW-2026.08"
                      value={newUpdateForm.firmware}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, firmware: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Update Size</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 45.2 MB"
                      value={newUpdateForm.size}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, size: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Download / Info URL</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="https://filloptech.com/downloads/v3.0.2"
                      value={newUpdateForm.url}
                      onChange={(e) => setNewUpdateForm({ ...newUpdateForm, url: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Improvements &amp; Bug Fixes</label>
                  <textarea
                    className="form-input"
                    style={{ height: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="List improvements, new features, and patch details..."
                    value={newUpdateForm.improvements}
                    onChange={(e) => setNewUpdateForm({ ...newUpdateForm, improvements: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn" style={{ width: 'fit-content' }}>Save Software Update 🚀</button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title">Software Update History</h2>
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Firmware</th>
                    <th>Size</th>
                    <th>Improvements / Release Notes</th>
                    <th>URL</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {updatesList.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No software updates recorded yet.</td></tr>
                  ) : (
                    updatesList.map((item) => (
                      <tr key={item.id}>
                        <td><span className="badge badge-info">{item.version}</span></td>
                        <td><strong>{item.firmware}</strong></td>
                        <td>{item.size}</td>
                        <td style={{ maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.improvements}</td>
                        <td><a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Link</a></td>
                        <td>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUpdate(item.id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'NEWS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Publish New Admin Announcement / News</h2>
              <form onSubmit={handleAddNews} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Article Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. JAMB 2026 CBT Update"
                      value={newNewsForm.title}
                      onChange={(e) => setNewNewsForm({ ...newNewsForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Icon Name</label>
                    <select
                      className="form-input"
                      value={newNewsForm.icon_name}
                      onChange={(e) => setNewNewsForm({ ...newNewsForm, icon_name: e.target.value })}
                    >
                      <option value="newspaper">📰 Newspaper</option>
                      <option value="star">⭐ Star / Guidance</option>
                      <option value="rocket">🚀 Rocket / Launch</option>
                      <option value="bell">🔔 Bell / Notification</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Thumbnail Photo (Cloudinary Upload)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-input"
                      onChange={handleNewsImageChange}
                      disabled={uploadingNewsImage}
                    />
                    {uploadingNewsImage && <small style={{ color: 'var(--warning)' }}>Uploading thumbnail to Cloudinary...</small>}
                    {newNewsForm.thumbnail_url && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={newNewsForm.thumbnail_url} alt="Thumbnail Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                        <small style={{ color: 'var(--success)' }}>Uploaded! Ready to publish.</small>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Publish Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={newNewsForm.published_at}
                      onChange={(e) => setNewNewsForm({ ...newNewsForm, published_at: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">News Content (Medium Style)</label>
                  <textarea
                    className="form-input"
                    style={{ height: '200px', resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="Write detailed informational news here..."
                    value={newNewsForm.content}
                    onChange={(e) => setNewNewsForm({ ...newNewsForm, content: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn" style={{ width: 'fit-content' }}>Publish Announcement 📣</button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title">Active News Articles</h2>
              <table>
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Icon</th>
                    <th>Title</th>
                    <th>Content Preview</th>
                    <th>Published At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {news.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No news published yet.</td></tr>
                  ) : (
                    news.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="News Thumb" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ width: '48px', height: '48px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>No Img</div>
                          )}
                        </td>
                        <td style={{ fontSize: '1.5rem' }}>
                          {item.icon_name === 'star' && '⭐'}
                          {item.icon_name === 'rocket' && '🚀'}
                          {item.icon_name === 'bell' && '🔔'}
                          {item.icon_name === 'newspaper' && '📰'}
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{item.title}</td>
                        <td style={{ maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.content}</td>
                        <td>{item.published_at ? new Date(item.published_at).toLocaleString() : new Date(item.created_at).toLocaleString()}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNews(item.id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'QUESTIONS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Manage Topics per Subject</h2>
              <form onSubmit={handleCreateTopic} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Subject</label>
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

                <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Add Topic ➕</button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} /> Bulk CSV Question Management &amp; Validation
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                Upload or paste CSV questions. Accepts human-readable subject names (e.g., <code>JAMB - Mathematics</code>), validates rows, checks for duplicate questions, and imports within a safe transaction!
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
                  <label className="form-label">Or Paste Raw CSV Data (Headers: exam_type, subject, year, topic, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer)</label>
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
                <div className="errors-box" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                  <div className="errors-title" style={{ fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} /> Validation Issues Found ({importErrors.length}):
                  </div>
                  <ul className="errors-list" style={{ margin: 0, paddingLeft: '1.2rem', color: '#7f1d1d', fontSize: '0.85rem' }}>
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
                  <label className="form-label">Select Subject (Human-Readable)</label>
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
                <button type="submit" className="btn btn-secondary" style={{ height: '42px', gridColumn: 'span 3' }}>Save Question 💾</button>
              </form>
            </div>

            <div className="admin-card">
              <div className="card-title">
                <span>Core Question Bank Listing</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <select
                    className="form-input"
                    style={{ width: '150px' }}
                    value={questionExamFilter}
                    onChange={(e) => setQuestionExamFilter(e.target.value)}
                  >
                    <option value="">All Exams</option>
                    <option value="JAMB">JAMB</option>
                    <option value="WAEC">WAEC</option>
                    <option value="NECO">NECO</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Subject ID"
                    className="form-input"
                    style={{ width: '120px' }}
                    value={questionSubjectFilter}
                    onChange={(e) => setQuestionSubjectFilter(e.target.value)}
                  />
                </div>
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
                    <th>Actions</th>
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
                        <td>
                          <button className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
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
    </div>
  );
}
