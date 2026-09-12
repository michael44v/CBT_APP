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
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Question, Subject, Topic } from './types';
import { FormulaEditor, MathRenderer } from './FormulaEditor';
import { RichTextEditor } from './RichTextEditor';

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

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  const handleImageUpload = async (file: File, callback: (imageUrl: string) => void) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'futyApp');

      const res = await fetch('https://api.cloudinary.com/v1_1/dguvkirdr/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        callback(data.secure_url);
        showNotification('Question image attached!');
      } else {
        showNotification(data.error?.message || 'Image upload failed.', 'error');
      }
    } catch (err) {
      showNotification('Error uploading image.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Single Question Quick Add Modal
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickForm, setQuickForm] = useState({
    exam_type: 'JAMB',
    subject_id: dbSubjects[0]?.id || 1,
    year: new Date().getFullYear(),
    topic_id: 1,
    difficulty: 'medium',
    question_text: '',
    formula: '',
    external_link: '',
    image_url: '',
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
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const subjectName = q.subject_name || dbSubjects.find(s => Number(s.id) === Number(q.subject_id))?.name || '';
      const topicName = q.topic_name || dbTopics.find(t => Number(t.id) === Number(q.topic_id))?.name || '';
      const matchText = q.question_text || '';
      const matchFormula = q.formula || '';
      const matchOptA = q.option_a || '';
      const matchOptB = q.option_b || '';
      const matchOptC = q.option_c || '';
      const matchOptD = q.option_d || '';

      const combined = `${subjectName} ${topicName} ${matchText} ${matchFormula} ${matchOptA} ${matchOptB} ${matchOptC} ${matchOptD}`.toLowerCase();
      if (!combined.includes(term)) return false;
    }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
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

  // Delete All Questions
  const handleDeleteAllQuestions = async () => {
    if (!window.confirm(`WARNING: Are you sure you want to delete ALL questions in the question bank? This action cannot be undone!`)) return;

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({ action: 'delete_all' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'All questions deleted successfully!');
        setSelectedQuestionIds([]);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to delete all questions.', 'error');
      }
    } catch (err) {
      showNotification('Error deleting all questions.', 'error');
    }
  };

  // Bulk Move Same Subject Topic
  const handleBulkMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0 || !bulkTargetTopicId) return;

    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
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
      formula: q.formula || '',
      external_link: q.external_link || '',
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

          <button
            className="btn btn-danger"
            onClick={handleDeleteAllQuestions}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Trash2 size={15} /> Delete All Questions
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
          <label className="form-label" style={{ fontSize: '11px' }}>Search Questions, Subjects, Topics, or Formulas</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search subject name, topic, formula, question..."
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
                  <td style={{ maxWidth: '350px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      <MathRenderer text={q.question_text} />
                    </div>
                    {q.formula && (
                      <div style={{ margin: '4px 0', background: 'var(--primary-light)', padding: '4px 8px', borderRadius: '6px' }}>
                        <MathRenderer text={q.formula} />
                      </div>
                    )}
                    {q.image_url && (
                      <div style={{ marginTop: '6px' }}>
                        <img
                          src={q.image_url.startsWith('http') ? q.image_url : `https://cbt.filloptech.com/${q.image_url}`}
                          alt="Question Visual"
                          style={{ maxHeight: '80px', maxWidth: '100%', borderRadius: '6px', border: '1px solid var(--border-color)', objectFit: 'contain' }}
                        />
                      </div>
                    )}
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
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQuickAddModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowQuickAddModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
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

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Formula Editor (LaTeX Supported)</label>
                <FormulaEditor
                  value={quickForm.formula || ''}
                  onChange={(val) => setQuickForm({ ...quickForm, formula: val })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Attached Question Image (Optional Attachment)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, (imgUrl) => setQuickForm({ ...quickForm, image_url: imgUrl }));
                      }
                    }}
                  />
                  {quickForm.image_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '8px' }}>
                      <img
                        src={quickForm.image_url.startsWith('http') ? quickForm.image_url : `https://cbt.filloptech.com/${quickForm.image_url}`}
                        alt="Attached Question Visual"
                        style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        onClick={() => setQuickForm({ ...quickForm, image_url: '' })}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">External Link (Optional)</label>
                <input type="url" className="form-input" placeholder="https://..." value={quickForm.external_link} onChange={(e) => setQuickForm({ ...quickForm, external_link: e.target.value })} />
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

      {/* ENHANCED WIDE SINGLE QUESTION INLINE EDIT MODAL WITH RICH TEXT & LIVE CBT PREVIEW */}
      {editingQuestion && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingQuestion(null); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '1150px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setEditingQuestion(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <BookOpen size={22} style={{ color: 'var(--accent)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Question #{editingQuestion.id}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Use the rich text editor to format question content and inspect the live student CBT view on the right.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveInlineEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
                {/* LEFT COLUMN: EDIT CONTROLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Exam Type</label>
                      <select className="form-input" value={editingQuestion.exam_type} onChange={(e) => setEditingQuestion({ ...editingQuestion, exam_type: e.target.value })}>
                        <option value="JAMB">JAMB</option>
                        <option value="WAEC">WAEC</option>
                        <option value="NECO">NECO</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Subject</label>
                      <select className="form-input" value={editingQuestion.subject_id} onChange={(e) => setEditingQuestion({ ...editingQuestion, subject_id: Number(e.target.value) })}>
                        {dbSubjects.filter(s => s.exam_type === editingQuestion.exam_type).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Topic</label>
                      <select className="form-input" value={editingQuestion.topic_id} onChange={(e) => setEditingQuestion({ ...editingQuestion, topic_id: Number(e.target.value) })}>
                        {dbTopics.filter(t => t.subject_id === editingQuestion.subject_id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Year</label>
                      <input type="number" className="form-input" value={editingQuestion.year} onChange={(e) => setEditingQuestion({ ...editingQuestion, year: Number(e.target.value) })} />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Difficulty</label>
                      <select className="form-input" value={editingQuestion.difficulty} onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Correct Answer</label>
                      <select className="form-input" value={editingQuestion.correct_answer} onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}>
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Question Text (Rich Formatted View)</label>
                    <RichTextEditor
                      value={editingQuestion.question_text || ''}
                      onChange={(val) => setEditingQuestion({ ...editingQuestion, question_text: val })}
                      placeholder="Type question text or format HTML..."
                      rows={6}
                      showMathToolbar
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Formula Editor (LaTeX Supported)</label>
                    <FormulaEditor
                      value={editingQuestion.formula || ''}
                      onChange={(val) => setEditingQuestion({ ...editingQuestion, formula: val })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Attached Question Image</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (imgUrl) => setEditingQuestion({ ...editingQuestion, image_url: imgUrl }));
                          }
                        }}
                      />
                      {editingQuestion.image_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '8px' }}>
                          <img
                            src={editingQuestion.image_url.startsWith('http') ? editingQuestion.image_url : `https://cbt.filloptech.com/${editingQuestion.image_url}`}
                            alt="Attached Question Visual"
                            style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                            onClick={() => setEditingQuestion({ ...editingQuestion, image_url: '' })}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">External Link (Optional)</label>
                    <input type="url" className="form-input" placeholder="https://..." value={editingQuestion.external_link || ''} onChange={(e) => setEditingQuestion({ ...editingQuestion, external_link: e.target.value })} />
                  </div>

                  {/* Option Choices */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Option A {editingQuestion.correct_answer === 'A' && <span style={{ color: 'var(--success)', fontWeight: 800 }}>&bull; Correct Answer</span>}</label>
                      <input type="text" className="form-input" value={editingQuestion.option_a} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Option B {editingQuestion.correct_answer === 'B' && <span style={{ color: 'var(--success)', fontWeight: 800 }}>&bull; Correct Answer</span>}</label>
                      <input type="text" className="form-input" value={editingQuestion.option_b} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Option C {editingQuestion.correct_answer === 'C' && <span style={{ color: 'var(--success)', fontWeight: 800 }}>&bull; Correct Answer</span>}</label>
                      <input type="text" className="form-input" value={editingQuestion.option_c} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Option D {editingQuestion.correct_answer === 'D' && <span style={{ color: 'var(--success)', fontWeight: 800 }}>&bull; Correct Answer</span>}</label>
                      <input type="text" className="form-input" value={editingQuestion.option_d} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })} required />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: LIVE STUDENT CBT PREVIEW BOX */}
                <div style={{
                  position: 'sticky', top: 0,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  boxShadow: 'var(--card-shadow)',
                  display: 'flex', flexDirection: 'column', gap: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={16} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary)' }}>Student CBT Screen Preview</span>
                    </div>
                    <span className="badge badge-primary">{editingQuestion.exam_type || 'JAMB'} &bull; {editingQuestion.year || 2024}</span>
                  </div>

                  {/* Question Content Surface */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                      <MathRenderer text={editingQuestion.question_text || '<em>(Question text preview)</em>'} />
                    </div>

                    {editingQuestion.formula && (
                      <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-light)', borderRadius: '6px', overflowX: 'auto' }}>
                        <MathRenderer text={`\\[${editingQuestion.formula}\\]`} />
                      </div>
                    )}

                    {editingQuestion.image_url && (
                      <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                        <img
                          src={editingQuestion.image_url.startsWith('http') ? editingQuestion.image_url : `https://cbt.filloptech.com/${editingQuestion.image_url}`}
                          alt="Question Visual Preview"
                          style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                        />
                      </div>
                    )}

                    {/* Option Choices Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                      {[
                        { key: 'A', text: editingQuestion.option_a },
                        { key: 'B', text: editingQuestion.option_b },
                        { key: 'C', text: editingQuestion.option_c },
                        { key: 'D', text: editingQuestion.option_d }
                      ].map(opt => {
                        const isCorrect = editingQuestion.correct_answer === opt.key;
                        return (
                          <div
                            key={opt.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: isCorrect ? '2px solid var(--success)' : '1px solid var(--border-color)',
                              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              backgroundColor: isCorrect ? 'var(--success)' : 'var(--border-color)',
                              color: isCorrect ? '#ffffff' : 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.75rem'
                            }}>
                              {opt.key}
                            </span>
                            <span style={{ flex: 1, fontWeight: isCorrect ? 700 : 500, color: 'var(--text-main)' }}>
                              <MathRenderer text={opt.text || `Option ${opt.key}`} />
                            </span>
                            {isCorrect && <CheckCircle size={16} style={{ color: 'var(--success)' }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingQuestion(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>Save &amp; Update Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK MOVE TOPIC MODAL */}
      {showBulkMoveModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBulkMoveModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '400px', width: '90%', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowBulkMoveModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
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
