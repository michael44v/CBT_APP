import React, { useState, useEffect } from 'react';

// Setup default backend url
const API_BASE = 'http://localhost:8000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'PASSCODES' | 'PROMOS' | 'QUESTIONS'>('DASHBOARD');

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
  const [promos, setPromos] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Search/Filters
  const [userSearch, setUserSearch] = useState('');
  const [questionExamFilter, setQuestionExamFilter] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('');

  // Forms / Actions state
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Passcode Form
  const [newPasscodeForm, setNewPasscodeForm] = useState({
    email: '',
    max_devices: 1,
    duration_days: 180,
    organization_name: '',
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

  // Load Passcodes
  const fetchPasscodes = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`);
      const data = await res.json();
      if (data.success) {
        setPasscodes(data.passcodes);
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

  // Refresh tab data
  useEffect(() => {
    fetchStats();
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'PASSCODES') fetchPasscodes();
    if (activeTab === 'PROMOS') fetchPromos();
    if (activeTab === 'QUESTIONS') fetchQuestions();
  }, [activeTab]);

  // Handle user search debounce
  useEffect(() => {
    if (activeTab !== 'USERS') return;
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [userSearch]);

  // Handle question filter changes
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

  // Suspend/Reactivate user
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

  // Generate Passcode
  const handleGeneratePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/passcodes.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', ...newPasscodeForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Passcode generated: ${data.passcode.passcode}`);
        fetchPasscodes();
        fetchStats();
        setNewPasscodeForm({
          email: '',
          max_devices: 1,
          duration_days: 180,
          organization_name: '',
        });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Failed to generate passcode.', 'error');
    }
  };

  // Revoke Passcode
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

  // Extend Passcode
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

  // Add Promo Code
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

  // Add single question
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

  // Delete question
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

  // Bulk CSV Import
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
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span>🛡️</span> Fillop Guru Admin
        </div>
        <nav className="sidebar-menu">
          <button className={`menu-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>📊 Dashboard</button>
          <button className={`menu-btn ${activeTab === 'USERS' ? 'active' : ''}`} onClick={() => setActiveTab('USERS')}>👥 Candidates</button>
          <button className={`menu-btn ${activeTab === 'PASSCODES' ? 'active' : ''}`} onClick={() => setActiveTab('PASSCODES')}>🔑 Passcodes</button>
          <button className={`menu-btn ${activeTab === 'PROMOS' ? 'active' : ''}`} onClick={() => setActiveTab('PROMOS')}>🎟️ Promo Codes</button>
          <button className={`menu-btn ${activeTab === 'QUESTIONS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTIONS')}>📚 Question Bank</button>
        </nav>
      </aside>

      {/* Main Content Area */}
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
              {activeTab === 'PASSCODES' && 'Product Passcodes & Bulk Licensing'}
              {activeTab === 'PROMOS' && 'Promotions & Referral Codes'}
              {activeTab === 'QUESTIONS' && 'Question Bank Master Management'}
            </h1>
            <p className="admin-subtitle">Fillop CBT Guru Cloud Admin Panel</p>
          </div>
        </header>

        {/* ================== TAB: DASHBOARD ================== */}
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
              <h2 className="card-title">System Overview</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Fillop CBT Guru is currently managing <strong>{stats.total_questions} questions</strong> across JAMB, WAEC, and NECO configurations.
                Passcodes are dynamically linked to organizational hierarchies and validated offline-first, restricting concurrent usage per device fingerprint.
              </p>
              <button className="btn btn-secondary" onClick={fetchStats}>🔄 Refresh Core Analytics</button>
            </div>
          </div>
        )}

        {/* ================== TAB: USERS ================== */}
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

        {/* ================== TAB: PASSCODES ================== */}
        {activeTab === 'PASSCODES' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Generate New Passcode / Org Batch</h2>
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
                <div className="form-group">
                  <label className="form-label">Organization Link (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hope Academy"
                    value={newPasscodeForm.organization_name}
                    onChange={(e) => setNewPasscodeForm({ ...newPasscodeForm, organization_name: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn" style={{ height: '42px' }}>Generate ⚡</button>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="card-title">Existing Passcodes</h2>
              <table>
                <thead>
                  <tr>
                    <th>Passcode</th>
                    <th>Linked Email</th>
                    <th>Organization</th>
                    <th>Device Slots</th>
                    <th>Duration</th>
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
                          <td>{p.email}</td>
                          <td>{p.organization_name || 'Individual'}</td>
                          <td>
                            <strong>{p.activated_devices}</strong> / {p.max_devices} slots Used
                          </td>
                          <td>{p.duration_days} Days</td>
                          <td>
                            <span className={`badge ${statusClass}`}>
                              {p.status === 'suspended' ? 'Suspended' : isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                          <td>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Unactivated'}</td>
                          <td style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => handleExtendPasscode(p.passcode)}>Extend ⏳</button>
                            {p.status === 'active' && (
                              <button className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => handleRevokePasscode(p.passcode)}>Suspend</button>
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

        {/* ================== TAB: PROMOS ================== */}
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

        {/* ================== TAB: QUESTIONS ================== */}
        {activeTab === 'QUESTIONS' && (
          <div>
            <div className="admin-card">
              <h2 className="card-title">Bulk CSV Import Question Bank</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                Paste your CSV content below. The parser rigorously enforces the presence of first-class filterable columns: <strong>exam_type, subject_id, and year</strong>.
                Invalid rows missing any of these parameters are strictly rejected to avoid orphaned data.
              </p>
              <form onSubmit={handleBulkImport}>
                <div className="form-group">
                  <label className="form-label">CSV Input (Headers: exam_type, subject_id, year, topic_id, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer)</label>
                  <textarea
                    className="textarea-csv"
                    placeholder="exam_type,subject_id,year,topic_id,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer&#10;JAMB,1,2024,1,medium,Which is a prime?,2,4,6,8,A"
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success">Start Rigorous Bulk Upload 🚀</button>
              </form>

              {importSuccessMsg && (
                <div style={{ color: 'var(--success)', marginTop: '1rem', fontWeight: 600 }}>{importSuccessMsg}</div>
              )}

              {importErrors.length > 0 && (
                <div className="errors-box">
                  <div className="errors-title">Validation Errors Found ({importErrors.length}):</div>
                  <ul className="errors-list">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>⚠️ {err}</li>
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
                  <label className="form-label">Subject ID</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newQuestionForm.subject_id}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, subject_id: parseInt(e.target.value) || 1 })}
                  />
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
                  <label className="form-label">Topic ID</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newQuestionForm.topic_id}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, topic_id: parseInt(e.target.value) || 1 })}
                  />
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
