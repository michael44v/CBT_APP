import React, { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen, AlertTriangle, Layers, Lock } from 'lucide-react';
import { Subject, Topic } from './types';

interface SubjectTopicManagerProps {
  apiBase: string;
  dbSubjects: Subject[];
  dbTopics: Topic[];
  onRefreshData: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export default function SubjectTopicManager({
  apiBase,
  dbSubjects,
  dbTopics,
  onRefreshData,
  showNotification
}: SubjectTopicManagerProps) {
  // Add Subject State
  const [newSubName, setNewSubName] = useState('');
  const [newSubExamType, setNewSubExamType] = useState('JAMB');
  const [creatingSub, setCreatingSub] = useState(false);

  // Topic Edit Modal
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editTopicName, setEditTopicName] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);

  // Topic Delete Modal
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [reassignTopicId, setReassignTopicId] = useState<number | ''>('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Exam Type Filter
  const [subjectFilterExam, setSubjectFilterExam] = useState<string>('ALL');

  const filteredSubjects = subjectFilterExam === 'ALL'
    ? dbSubjects
    : dbSubjects.filter(s => s.exam_type === subjectFilterExam);

  // Handle Add Subject (Immutable name rule enforced)
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
          name: newSubName.trim(),
          exam_type: newSubExamType
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Subject created successfully!');
        setNewSubName('');
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

  // Save Topic Name Edit
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
          name: editTopicName.trim()
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

  // Delete Topic (with optional Question Reassignment)
  const handleDeleteTopic = async () => {
    if (!deletingTopic) return;
    setDeleteErrorMsg(null);

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'delete_topic',
          topic_id: deletingTopic.id,
          reassign_topic_id: reassignTopicId ? Number(reassignTopicId) : 0
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Topic deleted successfully!');
        setDeletingTopic(null);
        setReassignTopicId('');
        onRefreshData();
      } else {
        setDeleteErrorMsg(data.message || 'Failed to delete topic.');
      }
    } catch (err) {
      setDeleteErrorMsg('Network error deleting topic.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {/* Subject Management Section */}
      <div className="admin-card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} /> Subjects (Read-Only Names)
        </h2>

        {/* Create Subject Form */}
        <form onSubmit={handleCreateSubject} style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', fontWeight: 800 }}>Add New Subject</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Further Mathematics"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              style={{ flex: 1, minWidth: '150px' }}
              required
            />
            <select
              className="form-input"
              value={newSubExamType}
              onChange={(e) => setNewSubExamType(e.target.value)}
              style={{ width: '110px' }}
            >
              <option value="JAMB">JAMB</option>
              <option value="WAEC">WAEC</option>
              <option value="NECO">NECO</option>
            </select>
            <button type="submit" className="btn btn-primary" disabled={creatingSub} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> {creatingSub ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>

        {/* Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Category:</span>
          <select
            className="form-input"
            value={subjectFilterExam}
            onChange={(e) => setSubjectFilterExam(e.target.value)}
            style={{ width: '130px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Categories</option>
            <option value="JAMB">JAMB</option>
            <option value="WAEC">WAEC</option>
            <option value="NECO">NECO</option>
          </select>
        </div>

        {/* Subject Table */}
        <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
          <table style={{ fontSize: '0.85rem', width: '100%' }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Subject Name</th>
                <th>Topics</th>
                <th>Questions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(sub => (
                <tr key={sub.id}>
                  <td><span className="badge badge-info">{sub.exam_type}</span></td>
                  <td style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {sub.name} <Lock size={12} title="Subject names are immutable" style={{ color: 'var(--text-muted)' }} />
                  </td>
                  <td>{sub.topic_count ?? 0}</td>
                  <td>{sub.question_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topic Management Section */}
      <div className="admin-card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} /> Topic Browser &amp; Management
        </h2>

        <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
          <table style={{ fontSize: '0.85rem', width: '100%' }}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Topic Name</th>
                <th>Questions</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dbTopics.map(top => {
                const parentSub = dbSubjects.find(s => s.id === top.subject_id);
                return (
                  <tr key={top.id}>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      [{parentSub?.exam_type || 'CBT'}] {parentSub?.name || `Sub #${top.subject_id}`}
                    </td>
                    <td style={{ fontWeight: 700 }}>{top.name}</td>
                    <td>{top.question_count ?? 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditingTopic(top);
                            setEditTopicName(top.name);
                          }}
                          style={{ padding: '4px 8px' }}
                          title="Edit Topic Name"
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT TOPIC MODAL */}
      {editingTopic && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '400px', width: '90%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800 }}>Edit Topic Name</h3>
            <form onSubmit={handleSaveTopicEdit}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">Topic Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTopicName}
                  onChange={(e) => setEditTopicName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTopic(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingTopic}>
                  {savingTopic ? 'Saving...' : 'Update Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TOPIC MODAL (WITH REASSIGNMENT) */}
      {deletingTopic && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '460px', width: '90%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Delete Topic "{deletingTopic.name}"
            </h3>

            {deleteErrorMsg && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
                {deleteErrorMsg}
              </div>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
              If questions already reference this topic, select another topic under the same subject to reassign those questions to before deleting.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Reassign Questions To (Target Topic)</label>
              <select
                className="form-input"
                value={reassignTopicId}
                onChange={(e) => setReassignTopicId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">-- No Reassignment (Delete Directly if 0 Questions) --</option>
                {dbTopics
                  .filter(t => t.subject_id === deletingTopic.subject_id && t.id !== deletingTopic.id)
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingTopic(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteTopic}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
