import React, { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen, AlertTriangle, Layers, Lock, Search, Eye, ArrowLeft } from 'lucide-react';
import { Subject, Topic } from './types';
import RichTextEditor from './RichTextEditor';

interface SubjectTopicManagerProps {
  apiBase: string;
  dbSubjects: Subject[];
  dbTopics: Topic[];
  onRefreshData: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  initialAddModalOpen?: boolean;
  onModalClosed?: () => void;
}

export default function SubjectTopicManager({
  apiBase,
  dbSubjects,
  dbTopics,
  onRefreshData,
  showNotification,
  initialAddModalOpen = false,
  onModalClosed
}: SubjectTopicManagerProps) {
  // Add Subject State & Modal
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);


  // Distinct subjects list (1 entry per subject name for selection dropdowns)
  const distinctSubjects = Array.from(new Set(dbSubjects.map(s => s.name.trim()))).map(name => {
    return dbSubjects.find(s => s.name.trim().toLowerCase() === name.toLowerCase())!;
  }).filter(Boolean);

  // Exam Type Filter & Master-Detail Selection
  const [subjectFilterExam, setSubjectFilterExam] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  const jambCount = dbSubjects.filter(s => s.exam_type === 'JAMB').length;
  const waecCount = dbSubjects.filter(s => s.exam_type === 'WAEC').length;
  const necoCount = dbSubjects.filter(s => s.exam_type === 'NECO').length;

  const filteredSubjects = subjectFilterExam === 'ALL'
    ? dbSubjects
    : dbSubjects.filter(s => s.exam_type === subjectFilterExam);

  // Auto-select first subject if none selected
  const activeSubject = dbSubjects.find(s => s.id === selectedSubjectId) || filteredSubjects[0] || null;
  const currentSubjectId = activeSubject ? activeSubject.id : null;

  // Add Topic State
  const [showAddTopicModal, setShowAddTopicModal] = useState(initialAddModalOpen);
  const [modalSubjectId, setModalSubjectId] = useState<number | ''>('');

  React.useEffect(() => {
    if (initialAddModalOpen) {
      setShowAddTopicModal(true);
    }
  }, [initialAddModalOpen]);

  React.useEffect(() => {
    if (showAddTopicModal) {
      if (activeSubject) {
        setModalSubjectId(activeSubject.id);
      } else if (distinctSubjects.length > 0) {
        setModalSubjectId(distinctSubjects[0].id);
      }
    }
  }, [showAddTopicModal, selectedSubjectId]);

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  // Topic Edit Modal
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editTopicName, setEditTopicName] = useState('');
  const [editTopicDesc, setEditTopicDesc] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);

  // Topic Delete Modal
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [deletingProgress, setDeletingProgress] = useState<number | null>(null);

  // Search bar state for topics
  const [topicSearch, setTopicSearch] = useState<string>('');

  // In-Page Subject Questions View State (Page Content)
  const [viewingSubjectQuestions, setViewingSubjectQuestions] = useState<Subject | null>(null);
  const [subjectQuestions, setSubjectQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  // Topics scoped to currently selected subject with search filter applied
  const scopedTopics = (currentSubjectId
    ? dbTopics.filter(t => t.subject_id === currentSubjectId)
    : []
  ).filter(t => !topicSearch || t.name.toLowerCase().includes(topicSearch.toLowerCase()));

  // Fetch subject questions for in-page view
  const handleViewSubjectQuestions = async (sub: Subject) => {
    setViewingSubjectQuestions(sub);
    setLoadingQuestions(true);
    try {
      const res = await fetch(`${apiBase}/admin/questions.php?subject_id=${sub.id}`);
      const data = await res.json();
      if (data.success) {
        setSubjectQuestions(data.questions || []);
      } else {
        setSubjectQuestions([]);
      }
    } catch (err) {
      showNotification('Failed to fetch questions for subject', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Handle Add Subject (Automatically creates for all categories JAMB, WAEC, NECO)
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    setCreatingSub(true);
    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'create_subject',
          name: newSubName.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Subject created across all categories successfully!');
        setNewSubName('');
        setShowCreateSubjectModal(false);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to create subject.', 'error');
      }
    } catch (err) {
      showNotification('Error creating subject.', 'error');
    } finally {
      setCreatingSub(false);
    }
  };

  // Handle Edit Subject Description across all categories
  const handleSaveSubjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    setSavingSub(true);
    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'edit_subject',
          subject_id: editingSubject.id,
          subject_name: editingSubject.name,
          description: editSubDesc.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Subject description updated across all categories!');
        setEditingSubject(null);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to update subject description.', 'error');
      }
    } catch (err) {
      showNotification('Error updating subject description.', 'error');
    } finally {
      setSavingSub(false);
    }
  };

  // Handle Add Topic (Creates topic for subject across ALL exam categories)
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenSubject = dbSubjects.find(s => Number(s.id) === Number(modalSubjectId)) || activeSubject;
    if (!chosenSubject || !newTopicName.trim()) return;

    setCreatingTopic(true);
    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'create_topic',
          subject_id: chosenSubject.id,
          subject_name: chosenSubject.name,
          topic_name: newTopicName.trim(),
          description: newTopicDesc.trim(),
          content: newTopicContent.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Topic created across all categories successfully!');
        setNewTopicName('');
        setNewTopicDesc('');
        setNewTopicContent('');
        setShowAddTopicModal(false);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to create topic.', 'error');
      }
    } catch (err) {
      showNotification('Error creating topic.', 'error');
    } finally {
      setCreatingTopic(false);
    }
  };

  // Save Topic Edit
  const handleSaveTopicEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editTopicName.trim()) return;

    setSavingTopic(true);
    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'edit_topic',
          topic_id: editingTopic.id,
          name: editTopicName.trim(),
          description: editTopicDesc.trim(),
          content: editTopicContent.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Topic updated successfully (sync_version bumped)!');
        setEditingTopic(null);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to update topic.', 'error');
      }
    } catch (err) {
      showNotification('Error updating topic.', 'error');
    } finally {
      setSavingTopic(false);
    }
  };

  // Delete Topic (Clean question deletion with progress bar)
  const handleDeleteTopic = async () => {
    if (!deletingTopic) return;
    setDeleteErrorMsg(null);
    setDeletingProgress(25);

    try {
      const timer1 = setTimeout(() => setDeletingProgress(60), 200);
      const timer2 = setTimeout(() => setDeletingProgress(85), 400);

      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'delete_topic',
          topic_id: deletingTopic.id
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await res.json();
      if (data.success) {
        setDeletingProgress(100);
        setTimeout(() => {
          showNotification(data.message || 'Topic and associated questions deleted cleanly!');
          setDeletingTopic(null);
          setDeletingProgress(null);
          onRefreshData();
        }, 400);
      } else {
        setDeletingProgress(null);
        setDeleteErrorMsg(data.message || 'Failed to delete topic.');
      }
    } catch (err) {
      setDeletingProgress(null);
      setDeleteErrorMsg('Network error deleting topic.');
    }
  };

  if (viewingSubjectQuestions) {
    return (
      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setViewingSubjectQuestions(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to Subject &amp; Topic Management
          </button>

          <span className="badge badge-info" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
            {viewingSubjectQuestions.exam_type} — {viewingSubjectQuestions.name}
          </span>
        </div>

        <h2 className="card-title" style={{ marginBottom: '1rem' }}>
          Available Questions for {viewingSubjectQuestions.name} ({subjectQuestions.length} Questions)
        </h2>

        {loadingQuestions ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading questions for {viewingSubjectQuestions.name}...
          </div>
        ) : subjectQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No questions available for {viewingSubjectQuestions.name} yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {subjectQuestions.map((q, idx) => (
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
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Total Subjects Count Summary Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="stat-card" onClick={() => setSubjectFilterExam('ALL')} style={{ cursor: 'pointer', borderLeft: subjectFilterExam === 'ALL' ? '4px solid var(--accent)' : 'none' }}>
          <div className="stat-label">Total All Subjects</div>
          <div className="stat-val">{dbSubjects.length}</div>
        </div>
        <div className="stat-card" onClick={() => setSubjectFilterExam('JAMB')} style={{ cursor: 'pointer', borderLeft: subjectFilterExam === 'JAMB' ? '4px solid var(--accent)' : 'none' }}>
          <div className="stat-label">JAMB Subjects</div>
          <div className="stat-val" style={{ color: 'var(--primary)' }}>{jambCount}</div>
        </div>
        <div className="stat-card" onClick={() => setSubjectFilterExam('WAEC')} style={{ cursor: 'pointer', borderLeft: subjectFilterExam === 'WAEC' ? '4px solid var(--accent)' : 'none' }}>
          <div className="stat-label">WAEC Subjects</div>
          <div className="stat-val" style={{ color: 'var(--success)' }}>{waecCount}</div>
        </div>
        <div className="stat-card" onClick={() => setSubjectFilterExam('NECO')} style={{ cursor: 'pointer', borderLeft: subjectFilterExam === 'NECO' ? '4px solid var(--accent)' : 'none' }}>
          <div className="stat-label">NECO Subjects</div>
          <div className="stat-val" style={{ color: 'var(--warning)' }}>{necoCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {/* Left Column: Subjects (Master) */}
      <div className="admin-card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} /> Subjects (Select to view topics)
        </h2>

        {/* Create Subject Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem', fontWeight: 800 }}>Create New Subject</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Adds subject &amp; description automatically to all exam categories (JAMB, WAEC, NECO).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateSubjectModal(true)}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> Create Subject
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Category:</span>
          <select
            className="form-input"
            value={subjectFilterExam}
            onChange={(e) => setSubjectFilterExam(e.target.value)}
            style={{ width: '160px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Categories</option>
            <option value="JAMB">JAMB</option>
            <option value="WAEC">WAEC</option>
            <option value="NECO">NECO</option>
          </select>
        </div>

        {/* Subject Table */}
        <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
          <table style={{ fontSize: '0.85rem', width: '100%' }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Subject Name</th>
                <th>Topics</th>
                <th>Questions</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(sub => {
                const isSelected = activeSubject && activeSubject.id === sub.id;
                return (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--accent-light)' : undefined,
                      borderLeft: isSelected ? '4px solid var(--accent)' : '4px solid transparent'
                    }}
                  >
                    <td><span className="badge badge-info">{sub.exam_type}</span></td>
                    <td style={{ fontWeight: isSelected ? 800 : 700, color: isSelected ? 'var(--accent)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sub.name} <Lock size={12} title="Subject names are immutable" style={{ color: 'var(--text-muted)' }} />
                    </td>
                    <td>{sub.topic_count ?? dbTopics.filter(t => t.subject_id === sub.id).length}</td>
                    <td>{sub.question_count ?? 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSubjectQuestions(sub);
                        }}
                        title={`View all available questions for ${sub.name}`}
                      >
                        <Eye size={12} /> Questions
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Topics scoped to selected subject (Detail) */}
      <div className="admin-card">
        <div className="card-title" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} /> Topics for {activeSubject ? `"${activeSubject.name}" (${activeSubject.exam_type})` : 'Selected Subject'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search topics..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                style={{ paddingLeft: '28px', width: '150px', padding: '0.25rem 0.5rem 0.25rem 28px', fontSize: '0.8rem' }}
              />
            </div>
            <span className="badge badge-info">{scopedTopics.length} Topics</span>
            {activeSubject && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddTopicModal(true)}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Topic
              </button>
            )}
          </div>
        </div>

        {!activeSubject ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a subject on the left to view and manage its topics.
          </div>
        ) : (
          <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
            <table style={{ fontSize: '0.85rem', width: '100%' }}>
              <thead>
                <tr>
                  <th>Topic Name</th>
                  <th>Questions</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scopedTopics.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No topics found for {activeSubject.name}. Upload questions to auto-create topics or add a topic.
                    </td>
                  </tr>
                ) : (
                  scopedTopics.map(top => (
                    <tr key={top.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{top.name}</td>
                      <td>{top.question_count ?? 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingTopic(top);
                              setEditTopicName(top.name);
                              setEditTopicDesc(top.description || '');
                              setEditTopicContent(top.content || '');
                            }}
                            style={{ padding: '4px 8px' }}
                            title="Edit Topic"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              setDeletingTopic(top);
                              setReassignTopicId('');
                              setDeleteErrorMsg(null);
                            }}
                            style={{ padding: '4px 8px' }}
                            title="Delete Topic"
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
      </div>

      {/* CREATE TOPIC MODAL */}
      {showAddTopicModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddTopicModal(false);
              if (onModalClosed) onModalClosed();
            }
          }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => {
                setShowAddTopicModal(false);
                if (onModalClosed) onModalClosed();
              }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 800 }}>Create Topic</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Creating a topic under a subject automatically adds it to all exam categories (JAMB, WAEC, NECO) for that subject.
            </p>
            <form onSubmit={handleCreateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', marginTop: '1.2rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Select Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  className="form-input"
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(Number(e.target.value))}
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {distinctSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Topic Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Quadratic Equations"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Topic Description (Formatting Supported)</label>
                <RichTextEditor
                  value={newTopicDesc}
                  onChange={setNewTopicDesc}
                  placeholder="Brief summary or description of this topic (supports bullet lists, bold, italics, line breaks)..."
                  rows={4}
                  showMathToolbar={true}
                  showPreview={true}
                  previewTitle="Description Formatted Preview"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Topic Content / Study Notes</label>
                <RichTextEditor
                  value={newTopicContent}
                  onChange={setNewTopicContent}
                  placeholder="Detailed study content, formulas, or lesson material..."
                  rows={6}
                  showMathToolbar={true}
                  showPreview={true}
                  previewTitle="Content Preview"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.8rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddTopicModal(false);
                    if (onModalClosed) onModalClosed();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingTopic}>
                  {creatingTopic ? 'Creating...' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOPIC MODAL */}
      {editingTopic && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingTopic(null); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setEditingTopic(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Topic: {editingTopic.name}</h3>
            <form onSubmit={handleSaveTopicEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', marginTop: '1.2rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Topic Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={editTopicName}
                  onChange={(e) => setEditTopicName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Topic Description (Formatting Supported)</label>
                <RichTextEditor
                  value={editTopicDesc}
                  onChange={setEditTopicDesc}
                  placeholder="Brief summary or description of this topic (supports bullet lists, bold, italics, line breaks)..."
                  rows={4}
                  showMathToolbar={true}
                  showPreview={true}
                  previewTitle="Description Formatted Preview"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Topic Content / Study Notes</label>
                <RichTextEditor
                  value={editTopicContent}
                  onChange={setEditTopicContent}
                  placeholder="Detailed study content, formulas, or lesson material..."
                  rows={6}
                  showMathToolbar={true}
                  showPreview={true}
                  previewTitle="Content Preview"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '0.8rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTopic(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingTopic}>
                  {savingTopic ? 'Saving...' : 'Update Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {showCreateSubjectModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateSubjectModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '500px', width: '92%', padding: '1.8rem', position: 'relative' }}>
            <button
              onClick={() => setShowCreateSubjectModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 800 }}>Create New Subject (All Exam Categories)</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              Subject created here will be automatically registered across JAMB, WAEC, and NECO frameworks.
            </p>

            <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Subject Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Further Mathematics"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSubjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingSub}>
                  {creatingSub ? 'Creating...' : 'Create for All Categories'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* DELETE TOPIC MODAL (CLEAN QUESTION DELETION WITH PROGRESS BAR) */}
      {deletingTopic && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setDeletingTopic(null); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setDeletingTopic(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Delete Topic "{deletingTopic.name}"
            </h3>

            {deleteErrorMsg && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
                {deleteErrorMsg}
              </div>
            )}

            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '1.2rem', lineHeight: 1.5 }}>
              Are you sure you want to delete topic <strong>"{deletingTopic.name}"</strong>? Deleting this topic will cleanly remove it along with all its associated questions ({deletingTopic.question_count ?? 0} questions).
            </p>

            {deletingProgress !== null && (
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--danger)' }}>
                  <span>Deleting topic and removing associated questions...</span>
                  <span>{deletingProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${deletingProgress}%`, height: '100%', backgroundColor: 'var(--danger)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deletingProgress !== null}
                onClick={() => setDeletingTopic(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletingProgress !== null}
                onClick={handleDeleteTopic}
              >
                {deletingProgress !== null ? 'Deleting...' : 'Confirm Delete Topic'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
