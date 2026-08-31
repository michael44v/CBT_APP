import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  Filter,
  MoveRight,
  Zap,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Question, Subject, Topic } from './types';

interface QuestionBankBrowserProps {
  apiBase: string;
  dbSubjects: Subject[];
  dbTopics: Topic[];
  questions: Question[];
  onRefreshData: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export default function QuestionBankBrowser({
  apiBase,
  dbSubjects,
  dbTopics,
  questions,
  onRefreshData,
  showNotification
}: QuestionBankBrowserProps) {
  // Filter States
  const [filterExam, setFilterExam] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<number | ''>('');
  const [filterTopicId, setFilterTopicId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Bulk Actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [bulkTargetTopicId, setBulkTargetTopicId] = useState<number | ''>('');
  const [bulkNewDifficulty, setBulkNewDifficulty] = useState<string>('medium');
  const [showBulkMoveModal, setShowBulkMoveModal] = useState<boolean>(false);

  // Single Question Quick Add Modal
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickForm, setQuickForm] = useState({
    exam_type: 'JAMB',
    subject_id: dbSubjects[0]?.id || 1,
    year: new Date().getFullYear(),
    topic_id: 1,
    difficulty: 'medium',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    topic_explanation: '',
    correct_explanation: '',
    wrong_explanations: ''
  });

  // Single Question Inline Edit Modal
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Filtered List
  const filteredQuestions = questions.filter(q => {
    if (filterExam && q.exam_type !== filterExam) return false;
    if (filterSubjectId && q.subject_id !== Number(filterSubjectId)) return false;
    if (filterTopicId && q.topic_id !== Number(filterTopicId)) return false;
    if (searchTerm && !q.question_text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage) || 1;
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Selection Checkbox Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedQuestionIds(paginatedQuestions.map(q => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const handleToggleSelect = (qId: number) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(prev => prev.filter(id => id !== qId));
    } else {
      setSelectedQuestionIds(prev => [...prev, qId]);
    }
  };

  // Quick Single Question Save
  const handleSaveQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({ action: 'create', ...quickForm }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Question added successfully!');
        setShowQuickAddModal(false);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to add question.', 'error');
      }
    } catch (err) {
      showNotification('Error saving question.', 'error');
    }
  };

  // Inline Edit Save
  const handleSaveInlineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...editingQuestion }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Question updated successfully!');
        setEditingQuestion(null);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to update question.', 'error');
      }
    } catch (err) {
      showNotification('Error updating question.', 'error');
    }
  };

  // Bulk Soft Delete
  const handleBulkDelete = async () => {
    if (selectedQuestionIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to soft-delete ${selectedQuestionIds.length} question(s)?`)) return;

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_delete', ids: selectedQuestionIds }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Bulk delete successful!');
        setSelectedQuestionIds([]);
        onRefreshData();
      } else {
        showNotification(data.message || 'Bulk delete failed.', 'error');
      }
    } catch (err) {
      showNotification('Error performing bulk delete.', 'error');
    }
  };

  // Bulk Move Same Subject Topic
  const handleBulkMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0 || !bulkTargetTopicId) return;

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_move',
          ids: selectedQuestionIds,
          target_topic_id: Number(bulkTargetTopicId)
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Bulk move successful!');
        setShowBulkMoveModal(false);
        setSelectedQuestionIds([]);
        onRefreshData();
      } else {
        showNotification(data.message || 'Bulk move failed.', 'error');
      }
    } catch (err) {
      showNotification('Error performing bulk move.', 'error');
    }
  };

  // Bulk Difficulty Change
  const handleBulkDifficulty = async () => {
    if (selectedQuestionIds.length === 0) return;

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_change_difficulty',
          ids: selectedQuestionIds,
          difficulty: bulkNewDifficulty
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Bulk difficulty updated!');
        setSelectedQuestionIds([]);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed updating difficulty.', 'error');
      }
    } catch (err) {
      showNotification('Error updating difficulty.', 'error');
    }
  };

  // Export Filtered Questions to CSV
  const handleExportCSV = () => {
    if (filteredQuestions.length === 0) return;

    const exportData = filteredQuestions.map(q => ({
      id: q.id,
      exam_type: q.exam_type,
      subject_name: q.subject_name || `Subject #${q.subject_id}`,
      year: q.year,
      topic_name: q.topic_name || `Topic #${q.topic_id}`,
      difficulty: q.difficulty,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      topic_explanation: q.topic_explanation || '',
      correct_explanation: q.correct_explanation || '',
      wrong_explanations: q.wrong_explanations || ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exported_questions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="admin-card">
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} /> Question Bank Browser ({filteredQuestions.length})
        </h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowQuickAddModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Quick Add Single Question
          </button>
        </div>
      </div>

      {/* Filters Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Exam Category</label>
          <select className="form-input" value={filterExam} onChange={(e) => setFilterExam(e.target.value)}>
            <option value="">All Exams</option>
            <option value="JAMB">JAMB</option>
            <option value="WAEC">WAEC</option>
            <option value="NECO">NECO</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Subject</label>
          <select
            className="form-input"
            value={filterSubjectId}
            onChange={(e) => {
              setFilterSubjectId(e.target.value ? Number(e.target.value) : '');
              setFilterTopicId('');
            }}
          >
            <option value="">All Subjects</option>
            {dbSubjects
              .filter(s => !filterExam || s.exam_type === filterExam)
              .map(s => (
                <option key={s.id} value={s.id}>[{s.exam_type}] {s.name}</option>
              ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Topic</label>
          <select
            className="form-input"
            value={filterTopicId}
            onChange={(e) => setFilterTopicId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Topics</option>
            {dbTopics
              .filter(t => !filterSubjectId || t.subject_id === Number(filterSubjectId))
              .map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Search Question Text</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Action Bar if items selected */}
      {selectedQuestionIds.length > 0 && (
        <div style={{
          backgroundColor: 'var(--primary-light)', padding: '0.8rem 1.2rem', borderRadius: '12px',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
        }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
            {selectedQuestionIds.length} question(s) selected
          </span>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowBulkMoveModal(true)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              Move Topic
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                className="form-input"
                value={bulkNewDifficulty}
                onChange={(e) => setBulkNewDifficulty(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', width: '100px' }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button
                className="btn btn-secondary"
                onClick={handleBulkDifficulty}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                Set Diff
              </button>
            </div>

            <button
              className="btn btn-danger"
              onClick={handleBulkDelete}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <Trash2 size={14} /> Soft Delete
            </button>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <table style={{ fontSize: '0.85rem', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={paginatedQuestions.length > 0 && selectedQuestionIds.length === paginatedQuestions.length}
                />
              </th>
              <th>ID</th>
              <th>Exam</th>
              <th>Subject &amp; Topic</th>
              <th>Year</th>
              <th>Question Content</th>
              <th>Ans</th>
              <th>Diff</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedQuestions.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No questions match your filter criteria.</td></tr>
            ) : (
              paginatedQuestions.map((q) => (
                <tr key={q.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(q.id)}
                      onChange={() => handleToggleSelect(q.id)}
                    />
                  </td>
                  <td>{q.id}</td>
                  <td><span className="badge badge-info">{q.exam_type}</span></td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{q.subject_name || `Sub #${q.subject_id}`}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.topic_name || `Topic #${q.topic_id}`}</div>
                  </td>
                  <td><strong>{q.year}</strong></td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.question_text}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>{q.correct_answer}</td>
                  <td>
                    <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditingQuestion(q)}
                        style={{ padding: '4px 8px' }}
                        title="Edit Question"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing page {currentPage} of {totalPages}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Prev
          </button>
          <button
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Next
          </button>
        </div>
      </div>

      {/* SINGLE QUESTION QUICK ADD MODAL */}
      {showQuickAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 800 }}>Quick Add Single Question</h3>
            <form onSubmit={handleSaveQuickAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Exam Type</label>
                <select className="form-input" value={quickForm.exam_type} onChange={(e) => setQuickForm({ ...quickForm, exam_type: e.target.value })}>
                  <option value="JAMB">JAMB</option>
                  <option value="WAEC">WAEC</option>
                  <option value="NECO">NECO</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-input" value={quickForm.subject_id} onChange={(e) => setQuickForm({ ...quickForm, subject_id: Number(e.target.value) })}>
                  {dbSubjects.filter(s => s.exam_type === quickForm.exam_type).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Topic</label>
                <select className="form-input" value={quickForm.topic_id} onChange={(e) => setQuickForm({ ...quickForm, topic_id: Number(e.target.value) })}>
                  {dbTopics.filter(t => t.subject_id === quickForm.subject_id).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={quickForm.year} onChange={(e) => setQuickForm({ ...quickForm, year: Number(e.target.value) })} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Question Text</label>
                <textarea className="form-input" style={{ minHeight: '70px' }} value={quickForm.question_text} onChange={(e) => setQuickForm({ ...quickForm, question_text: e.target.value })} required />
              </div>

              <div className="form-group"><label className="form-label">Option A</label><input type="text" className="form-input" value={quickForm.option_a} onChange={(e) => setQuickForm({ ...quickForm, option_a: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Option B</label><input type="text" className="form-input" value={quickForm.option_b} onChange={(e) => setQuickForm({ ...quickForm, option_b: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Option C</label><input type="text" className="form-input" value={quickForm.option_c} onChange={(e) => setQuickForm({ ...quickForm, option_c: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Option D</label><input type="text" className="form-input" value={quickForm.option_d} onChange={(e) => setQuickForm({ ...quickForm, option_d: e.target.value })} required /></div>

              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <select className="form-input" value={quickForm.correct_answer} onChange={(e) => setQuickForm({ ...quickForm, correct_answer: e.target.value })}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-input" value={quickForm.difficulty} onChange={(e) => setQuickForm({ ...quickForm, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE QUESTION INLINE EDIT MODAL */}
      {editingQuestion && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 800 }}>Edit Question #{editingQuestion.id}</h3>
            <form onSubmit={handleSaveInlineEdit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Exam Type</label>
                <select className="form-input" value={editingQuestion.exam_type} onChange={(e) => setEditingQuestion({ ...editingQuestion, exam_type: e.target.value })}>
                  <option value="JAMB">JAMB</option>
                  <option value="WAEC">WAEC</option>
                  <option value="NECO">NECO</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-input" value={editingQuestion.subject_id} onChange={(e) => setEditingQuestion({ ...editingQuestion, subject_id: Number(e.target.value) })}>
                  {dbSubjects.filter(s => s.exam_type === editingQuestion.exam_type).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Topic (Same Subject)</label>
                <select className="form-input" value={editingQuestion.topic_id} onChange={(e) => setEditingQuestion({ ...editingQuestion, topic_id: Number(e.target.value) })}>
                  {dbTopics.filter(t => t.subject_id === editingQuestion.subject_id).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={editingQuestion.year} onChange={(e) => setEditingQuestion({ ...editingQuestion, year: Number(e.target.value) })} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Question Text</label>
                <textarea className="form-input" style={{ minHeight: '70px' }} value={editingQuestion.question_text} onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })} required />
              </div>

              <div className="form-group"><label className="form-label">Option A</label><input type="text" className="form-input" value={editingQuestion.option_a} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Option B</label><input type="text" className="form-input" value={editingQuestion.option_b} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Option C</label><input type="text" className="form-input" value={editingQuestion.option_c} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Option D</label><input type="text" className="form-input" value={editingQuestion.option_d} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })} required /></div>

              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <select className="form-input" value={editingQuestion.correct_answer} onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-input" value={editingQuestion.difficulty} onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingQuestion(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK MOVE TOPIC MODAL */}
      {showBulkMoveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="admin-card" style={{ maxWidth: '400px', width: '90%', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              Bulk Move ({selectedQuestionIds.length} questions)
            </h3>
            <form onSubmit={handleBulkMove}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Target Topic</label>
                <select
                  className="form-input"
                  value={bulkTargetTopicId}
                  onChange={(e) => setBulkTargetTopicId(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="">-- Choose Target Topic --</option>
                  {dbTopics
                    .filter(t => {
                      if (selectedQuestionIds.length === 0) return true;
                      const firstQ = questions.find(q => q.id === selectedQuestionIds[0]);
                      return firstQ ? t.subject_id === firstQ.subject_id : true;
                    })
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkMoveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Move</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
