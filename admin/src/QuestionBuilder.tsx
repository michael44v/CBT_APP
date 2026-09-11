import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Sparkles,
  Save,
  X
} from 'lucide-react';
import { Subject, Topic, BuilderQuestionCard, BuilderFieldErrorMap } from './types';
import FormulaEditor, { MathRenderer, renderLatexToString } from './FormulaEditor';
import RichTextEditor from './RichTextEditor';

interface QuestionBuilderProps {
  apiBase: string;
  dbSubjects: Subject[];
  dbTopics: Topic[];
  onRefreshData: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export default function QuestionBuilder({
  apiBase,
  dbSubjects,
  dbTopics,
  onRefreshData,
  showNotification
}: QuestionBuilderProps) {
  // Generate a unique ID for cards
  const createNewCard = (overrides?: Partial<BuilderQuestionCard>): BuilderQuestionCard => ({
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    exam_type: 'JAMB',
    subject_id: dbSubjects.length > 0 ? dbSubjects[0].id : '',
    topic_id: '',
    year: new Date().getFullYear(),
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
    wrong_explanations: '',
    isCollapsed: false,
    saveStatus: 'idle',
    saveError: '',
    ...overrides
  });

  const [cards, setCards] = useState<BuilderQuestionCard[]>(() => [createNewCard()]);
  const [savingBatch, setSavingBatch] = useState<boolean>(false);

  // Student CBT Preview Modal
  const [previewCard, setPreviewCard] = useState<BuilderQuestionCard | null>(null);

  // Inline Subject Creation Modal State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [targetCardForSubject, setTargetCardForSubject] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectExamType, setNewSubjectExamType] = useState<string>('JAMB');
  const [addingSubject, setAddingSubject] = useState<boolean>(false);

  // Distinct subjects list (1 per subject name for selection dropdowns)
  const distinctSubjects = Array.from(new Set(dbSubjects.map(s => s.name.trim()))).map(name => {
    return dbSubjects.find(s => s.name.trim().toLowerCase() === name.toLowerCase())!;
  }).filter(Boolean);

  // Inline Topic Creation Modal State
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);
  const [modalSubjectId, setModalSubjectId] = useState<number | ''>('');

  useEffect(() => {
    if (showAddTopicModal) {
      if (targetSubjectForTopic) {
        setModalSubjectId(targetSubjectForTopic.id);
      } else if (distinctSubjects.length > 0) {
        setModalSubjectId(distinctSubjects[0].id);
      }
    }
  }, [showAddTopicModal, targetSubjectForTopic]);

  const [targetCardForTopic, setTargetCardForTopic] = useState<string | null>(null);
  const [targetSubjectForTopic, setTargetSubjectForTopic] = useState<Subject | null>(null);
  const [newTopicName, setNewTopicName] = useState<string>('');
  const [addingTopic, setAddingTopic] = useState<boolean>(false);

  // Accordion Section Toggle State per Card
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, { formula?: boolean; media?: boolean }>>({});

  const toggleAccordion = (cardId: string, section: 'formula' | 'media') => {
    setExpandedAccordions(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        [section]: !prev[cardId]?.[section]
      }
    }));
  };

  // Image Uploading per Card State
  const [uploadingImageCardId, setUploadingImageCardId] = useState<string | null>(null);

  // Sync default subjects & topics when dbSubjects/dbTopics load
  useEffect(() => {
    setCards(prev =>
      prev.map(c => {
        if (!c.subject_id && dbSubjects.length > 0) {
          const matched = dbSubjects.find(s => s.exam_type === c.exam_type) || dbSubjects[0];
          return { ...c, subject_id: matched ? matched.id : '' };
        }
        return c;
      })
    );
  }, [dbSubjects]);

  // Available Exam Types
  const availableExamTypes = Array.from(new Set(dbSubjects.map(s => s.exam_type))).filter(Boolean);
  if (availableExamTypes.length === 0) availableExamTypes.push('JAMB', 'WAEC', 'NECO');

  // Inline Subject Creation Handler
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    setAddingSubject(true);
    try {
      const res = await fetch(`${apiBase}/admin/questions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          action: 'create_subject',
          name: newSubjectName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Subject created across all categories successfully!');
        const newSubId = Number(data.subject_id);
        setNewSubjectName('');
        setShowAddSubjectModal(false);
        await onRefreshData();

        if (targetCardForSubject) {
          updateCard(targetCardForSubject, {
            subject_id: newSubId,
            topic_id: ''
          });
        }
      } else {
        showNotification(data.message || 'Failed to create subject.', 'error');
      }
    } catch (err) {
      showNotification('Error creating subject.', 'error');
    } finally {
      setAddingSubject(false);
    }
  };

  // Inline Topic Creation Handler
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenSubject = dbSubjects.find(s => Number(s.id) === Number(modalSubjectId)) || targetSubjectForTopic;
    if (!chosenSubject || !newTopicName.trim()) return;

    setAddingTopic(true);
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
          topic_name: newTopicName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Topic created across all categories successfully!');
        const createdTopicId = Number(data.topic_id);
        setNewTopicName('');
        setShowAddTopicModal(false);
        await onRefreshData();

        if (targetCardForTopic) {
          updateCard(targetCardForTopic, {
            topic_id: createdTopicId
          });
        }
      } else {
        showNotification(data.message || 'Failed to create topic.', 'error');
      }
    } catch (err) {
      showNotification('Error creating topic.', 'error');
    } finally {
      setAddingTopic(false);
    }
  };

  // Update card helper
  const updateCard = (id: string, patch: Partial<BuilderQuestionCard>) => {
    setCards(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...patch };
          // If saveStatus was failed/saved and user modifies field, reset to idle
          if (c.saveStatus !== 'saving') {
            updated.saveStatus = 'idle';
            updated.saveError = '';
          }
          return updated;
        }
        return c;
      })
    );
  };

  // Card Management Functions
  const handleAddQuestion = () => {
    const lastCard = cards[cards.length - 1];
    const newCard = createNewCard({
      exam_type: lastCard ? lastCard.exam_type : 'JAMB',
      subject_id: lastCard ? lastCard.subject_id : (dbSubjects[0]?.id || ''),
      topic_id: lastCard ? lastCard.topic_id : '',
      year: lastCard ? lastCard.year : new Date().getFullYear(),
      difficulty: lastCard ? lastCard.difficulty : 'medium'
    });
    setCards(prev => [...prev, newCard]);
  };

  const handleDuplicateCard = (card: BuilderQuestionCard) => {
    const duplicated = createNewCard({
      ...card,
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      isCollapsed: false,
      saveStatus: 'idle',
      saveError: ''
    });
    setCards(prev => [...prev, duplicated]);
    showNotification('Question duplicated!');
  };

  const handleRemoveCard = (id: string) => {
    if (cards.length === 1) {
      showNotification('Cannot remove the last remaining question card.', 'error');
      return;
    }
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleResetCard = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    updateCard(id, {
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
      wrong_explanations: '',
      saveStatus: 'idle',
      saveError: ''
    });
    showNotification('Question card reset.');
  };

  const handleToggleCollapseCard = (id: string) => {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, isCollapsed: !c.isCollapsed } : c)));
  };

  const handleCollapseAll = () => {
    setCards(prev => prev.map(c => ({ ...c, isCollapsed: true })));
  };

  const handleExpandAll = () => {
    setCards(prev => prev.map(c => ({ ...c, isCollapsed: false })));
  };

  // Field Validation Helper per Card
  const validateCard = (card: BuilderQuestionCard): BuilderFieldErrorMap => {
    const errors: BuilderFieldErrorMap = {};

    if (!card.exam_type) errors.exam_type = 'Exam Type is required';
    if (!card.subject_id) errors.subject_id = 'Subject is required';
    if (!card.topic_id) errors.topic_id = 'Topic is required';
    if (!card.year || card.year < 1900 || card.year > 2100) errors.year = 'Enter a valid year';
    if (!card.difficulty) errors.difficulty = 'Difficulty level is required';
    if (!card.question_text.trim()) errors.question_text = 'Question Text is required';

    if (!card.option_a.trim()) errors.option_a = 'Option A is required';
    if (!card.option_b.trim()) errors.option_b = 'Option B is required';
    if (!card.option_c.trim()) errors.option_c = 'Option C is required';
    if (!card.option_d.trim()) errors.option_d = 'Option D is required';

    if (!card.correct_answer || !['A', 'B', 'C', 'D'].includes(card.correct_answer)) {
      errors.correct_answer = 'Select the Correct Answer (Option A, B, C, or D)';
    }

    if (card.external_link.trim()) {
      try {
        new URL(card.external_link.trim());
      } catch (e) {
        errors.external_link = 'External resource must be a valid URL (e.g. https://...)';
      }
    }

    if (card.formula.trim()) {
      try {
        const rendered = renderLatexToString(card.formula, false);
        if (rendered.includes('Invalid LaTeX')) {
          errors.formula = 'Formula contains invalid LaTeX syntax';
        }
      } catch (e) {
        errors.formula = 'Formula contains invalid LaTeX syntax';
      }
    }

    return errors;
  };

  // Image Upload Logic
  const handleImageUpload = async (cardId: string, file: File) => {
    // Validate type and size (5MB max)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showNotification('Unsupported file type. Please upload JPEG, PNG, WEBP, GIF, or SVG.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image size exceeds maximum limit of 5MB.', 'error');
      return;
    }

    setUploadingImageCardId(cardId);

    try {
      // First try Cloudinary direct upload preset
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'futyApp');

      let imageUrl = '';
      try {
        const cRes = await fetch('https://api.cloudinary.com/v1_1/dguvkirdr/image/upload', {
          method: 'POST',
          body: formData
        });
        const cData = await cRes.json();
        if (cData.secure_url) {
          imageUrl = cData.secure_url;
        }
      } catch (cErr) {
        console.warn('Cloudinary upload failed, falling back to backend upload endpoint', cErr);
      }

      // Fallback to backend upload_image action if Cloudinary wasn't used
      if (!imageUrl) {
        const backendFormData = new FormData();
        backendFormData.append('action', 'upload_image');
        backendFormData.append('image', file);

        const bRes = await fetch(`${apiBase}/admin/questions.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: backendFormData
        });
        const bData = await bRes.json();
        if (bData.success && bData.image_url) {
          imageUrl = bData.image_url;
        } else {
          throw new Error(bData.message || 'Image upload failed');
        }
      }

      updateCard(cardId, { image_url: imageUrl });
      showNotification('Image uploaded successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to upload image.', 'error');
    } finally {
      setUploadingImageCardId(null);
    }
  };

  // Save All Questions Batch Submission
  const handleSaveAllQuestions = async () => {
    // Validate all cards first
    let hasValidationErrors = false;
    const validatedCards = cards.map(c => {
      const errs = validateCard(c);
      const isCardInvalid = Object.keys(errs).length > 0;
      if (isCardInvalid) {
        hasValidationErrors = true;
      }
      return {
        ...c,
        isCollapsed: isCardInvalid ? false : c.isCollapsed, // auto expand invalid card
        saveStatus: isCardInvalid ? ('failed' as const) : c.saveStatus,
        saveError: isCardInvalid ? Object.values(errs)[0] : c.saveError
      };
    });

    setCards(validatedCards);

    if (hasValidationErrors) {
      showNotification('Please correct validation errors in highlighted questions before saving.', 'error');
      return;
    }

    setSavingBatch(true);

    let savedCount = 0;
    let failedCount = 0;

    const newCardsState = [...validatedCards];

    for (let i = 0; i < newCardsState.length; i++) {
      const card = newCardsState[i];
      if (card.saveStatus === 'saved') {
        savedCount++;
        continue;
      }

      newCardsState[i] = { ...newCardsState[i], saveStatus: 'saving', saveError: '' };
      setCards([...newCardsState]);

      try {
        const payload = {
          action: 'create',
          exam_type: card.exam_type,
          subject_id: Number(card.subject_id),
          topic_id: Number(card.topic_id),
          year: Number(card.year),
          difficulty: card.difficulty,
          question_text: card.question_text.trim(),
          formula: card.formula.trim(),
          external_link: card.external_link.trim(),
          image_url: card.image_url.trim(),
          option_a: card.option_a.trim(),
          option_b: card.option_b.trim(),
          option_c: card.option_c.trim(),
          option_d: card.option_d.trim(),
          correct_answer: card.correct_answer,
          topic_explanation: card.topic_explanation.trim(),
          correct_explanation: card.correct_explanation.trim(),
          wrong_explanations: card.wrong_explanations.trim()
        };

        const res = await fetch(`${apiBase}/admin/questions.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          newCardsState[i] = {
            ...newCardsState[i],
            saveStatus: 'saved',
            saveError: '',
            isCollapsed: true
          };
          savedCount++;
        } else {
          newCardsState[i] = {
            ...newCardsState[i],
            saveStatus: 'failed',
            saveError: data.message || 'Failed to save question.',
            isCollapsed: false
          };
          failedCount++;
        }
      } catch (err: any) {
        newCardsState[i] = {
          ...newCardsState[i],
          saveStatus: 'failed',
          saveError: err.message || 'Server error while saving.',
          isCollapsed: false
        };
        failedCount++;
      }
      setCards([...newCardsState]);
    }

    setSavingBatch(false);
    onRefreshData();

    if (failedCount === 0) {
      showNotification(`Successfully saved all ${savedCount} question(s)!`);
    } else {
      showNotification(`Saved ${savedCount} question(s), ${failedCount} question(s) failed. Please check highlighted errors.`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Batch Controls Bar */}
      <div
        className="admin-card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)',
          borderLeft: '4px solid var(--accent)'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} style={{ color: 'var(--accent)' }} /> Interactive Question Builder
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Author, format, and publish questions directly through a clean form interface without technical field names or CSV files.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExpandAll}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            Expand All
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCollapseAll}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            Collapse All
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddQuestion}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}
          >
            <Plus size={16} /> Add Question Card
          </button>
        </div>
      </div>

      {/* Dynamic Question Cards List */}
      {cards.map((card, idx) => {
        const errors = validateCard(card);
        const filteredSubjects = dbSubjects.filter(s => s.exam_type === card.exam_type);
        const currentSubject = dbSubjects.find(s => Number(s.id) === Number(card.subject_id)) || null;
        const filteredTopics = dbTopics.filter(t => Number(t.subject_id) === Number(card.subject_id));
        const currentTopic = dbTopics.find(t => Number(t.id) === Number(card.topic_id)) || null;

        const subjectDisplayName = currentSubject ? currentSubject.name : 'Select Subject';
        const topicDisplayName = currentTopic ? currentTopic.name : 'Select Topic';

        return (
          <div
            key={card.id}
            className="admin-card"
            style={{
              padding: 0,
              border: card.saveStatus === 'failed'
                ? '2px solid var(--danger)'
                : card.saveStatus === 'saved'
                ? '2px solid var(--success)'
                : '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
              overflow: 'hidden'
            }}
          >
            {/* Question Card Header Bar */}
            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--bg-main)',
                borderBottom: card.isCollapsed ? 'none' : '1px solid var(--border-color)',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleToggleCollapseCard(card.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '4px 10px',
                    borderRadius: '20px'
                  }}
                >
                  Question {idx + 1}
                </span>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {card.exam_type} • {subjectDisplayName} • {topicDisplayName} • {card.year} ({card.difficulty})
                </div>

                {card.saveStatus === 'saved' && (
                  <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Saved
                  </span>
                )}

                {card.saveStatus === 'failed' && (
                  <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={13} /> Action Needed
                  </span>
                )}
              </div>

              {/* Action Buttons Header Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  title="Preview CBT Student View"
                  onClick={() => setPreviewCard(card)}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  title="Duplicate Question"
                  onClick={() => handleDuplicateCard(card)}
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  title="Reset Fields"
                  onClick={() => handleResetCard(card.id)}
                >
                  <RotateCcw size={14} /> Reset
                </button>
                {cards.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                    title="Remove Question"
                    onClick={() => handleRemoveCard(card.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                  onClick={() => handleToggleCollapseCard(card.id)}
                >
                  {card.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>

            {/* Error / Failure Warning Banner inside Card */}
            {card.saveError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                <AlertCircle size={16} /> {card.saveError}
              </div>
            )}

            {/* Collapsible Card Form Body */}
            {!card.isCollapsed && (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                {/* SECTION 1: Question Information */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <BookOpen size={18} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>1. Question Information</h3>
                  </div>

                  {/* 3 Select Dropdowns: Exam Type -> Subject -> Topic */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {/* Exam Type Select */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Exam Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        className="form-input"
                        value={card.exam_type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const firstMatchingSub = dbSubjects.find(s => s.exam_type === newType);
                          updateCard(card.id, {
                            exam_type: newType,
                            subject_id: firstMatchingSub ? firstMatchingSub.id : '',
                            topic_id: ''
                          });
                        }}
                      >
                        {availableExamTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors.exam_type && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.exam_type}</span>}
                    </div>

                    {/* Subject Select + Inline Add Button */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          onClick={() => {
                            setTargetCardForSubject(card.id);
                            setNewSubjectExamType(card.exam_type);
                            setShowAddSubjectModal(true);
                          }}
                        >
                          <Plus size={12} /> Add New
                        </button>
                      </div>
                      <select
                        className="form-input"
                        value={card.subject_id}
                        onChange={(e) => {
                          const subId = Number(e.target.value) || '';
                          updateCard(card.id, {
                            subject_id: subId,
                            topic_id: ''
                          });
                        }}
                      >
                        <option value="">-- Select Subject --</option>
                        {filteredSubjects.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                      {errors.subject_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.subject_id}</span>}
                    </div>

                    {/* Topic Select + Inline Add Button */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Topic <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          disabled={!card.subject_id}
                          onClick={() => {
                            if (!currentSubject) {
                              showNotification('Please select a subject first.', 'error');
                              return;
                            }
                            setTargetCardForTopic(card.id);
                            setTargetSubjectForTopic(currentSubject);
                            setShowAddTopicModal(true);
                          }}
                        >
                          <Plus size={12} /> Add New
                        </button>
                      </div>
                      <select
                        className="form-input"
                        value={card.topic_id}
                        disabled={!card.subject_id}
                        onChange={(e) => {
                          const topId = Number(e.target.value) || '';
                          updateCard(card.id, { topic_id: topId });
                        }}
                      >
                        <option value="">-- Select Topic --</option>
                        {filteredTopics.map(top => (
                          <option key={top.id} value={top.id}>{top.name}</option>
                        ))}
                      </select>
                      {errors.topic_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.topic_id}</span>}
                    </div>

                    {/* Year Input */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Year <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="number"
                        className="form-input"
                        value={card.year}
                        onChange={(e) => updateCard(card.id, { year: parseInt(e.target.value) || new Date().getFullYear() })}
                        min={1990}
                        max={2030}
                      />
                      {errors.year && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.year}</span>}
                    </div>

                    {/* Difficulty Select */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Difficulty <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <select
                        className="form-input"
                        value={card.difficulty}
                        onChange={(e) => updateCard(card.id, { difficulty: e.target.value as any })}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      {errors.difficulty && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.difficulty}</span>}
                    </div>
                  </div>

                  {/* Question Text Editor & Live KaTeX Card Preview */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Question Text <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <RichTextEditor
                      value={card.question_text}
                      onChange={(val) => updateCard(card.id, { question_text: val })}
                      placeholder="Enter question text with inline or block LaTeX formulas (e.g., What is \( x \) if \( x^2 - 4 = 0 \)?)..."
                      rows={3}
                      showMathToolbar={true}
                      showPreview={true}
                      previewTitle="Formatted Question Card Preview"
                    />
                    {errors.question_text && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.question_text}</span>}
                  </div>
                </div>

                {/* SECTION 2: Formula Editor (Collapsible Accordion Dropdown) */}
                {(() => {
                  const isFormulaExpanded = expandedAccordions[card.id]?.formula || Boolean(card.formula.trim());
                  return (
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleAccordion(card.id, 'formula')}
                        style={{
                          padding: '0.8rem 1rem',
                          backgroundColor: 'var(--primary-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                            2. Mathematical Formula (LaTeX) Dropdown
                          </h3>
                          {card.formula.trim() && (
                            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Formula Attached</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>{isFormulaExpanded ? 'Collapse' : 'Expand'}</span>
                          {isFormulaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isFormulaExpanded && (
                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', backgroundColor: 'var(--bg-card)' }}>
                          <FormulaEditor
                            value={card.formula}
                            onChange={(val) => updateCard(card.id, { formula: val })}
                            placeholder="Enter mathematical formula using LaTeX (e.g. x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a})"
                          />
                          {errors.formula && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.formula}</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* SECTION 3: Answer Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>3. Answer Options &amp; Correct Key</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Option A <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Option A value"
                        value={card.option_a}
                        onChange={(e) => updateCard(card.id, { option_a: e.target.value })}
                      />
                      {errors.option_a && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.option_a}</span>}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Option B <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Option B value"
                        value={card.option_b}
                        onChange={(e) => updateCard(card.id, { option_b: e.target.value })}
                      />
                      {errors.option_b && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.option_b}</span>}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Option C <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Option C value"
                        value={card.option_c}
                        onChange={(e) => updateCard(card.id, { option_c: e.target.value })}
                      />
                      {errors.option_c && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.option_c}</span>}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Option D <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Option D value"
                        value={card.option_d}
                        onChange={(e) => updateCard(card.id, { option_d: e.target.value })}
                      />
                      {errors.option_d && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.option_d}</span>}
                    </div>
                  </div>

                  {/* Correct Answer Select Dropdown */}
                  <div className="form-group" style={{ maxWidth: '300px', margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent)' }}>Correct Answer Key <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      className="form-input"
                      value={card.correct_answer}
                      onChange={(e) => updateCard(card.id, { correct_answer: e.target.value as any })}
                      style={{ fontWeight: 800 }}
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                    {errors.correct_answer && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.correct_answer}</span>}
                  </div>
                </div>

                {/* SECTION 4: Media & Resources (Image + External Link Accordion Dropdown) */}
                {(() => {
                  const isMediaExpanded = expandedAccordions[card.id]?.media || Boolean(card.image_url.trim() || card.external_link.trim());
                  return (
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleAccordion(card.id, 'media')}
                        style={{
                          padding: '0.8rem 1rem',
                          backgroundColor: 'var(--primary-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ImageIcon size={18} style={{ color: 'var(--accent)' }} />
                          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                            4. Image &amp; Media Attachments Dropdown
                          </h3>
                          {card.image_url.trim() && (
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Image Attached</span>
                          )}
                          {card.external_link.trim() && (
                            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Link Attached</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>{isMediaExpanded ? 'Collapse' : 'Expand'}</span>
                          {isMediaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isMediaExpanded && (
                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                            {/* Image Upload Box */}
                            <div style={{ border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--primary-light)' }}>
                              <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Question Image Attachment</label>

                              {card.image_url ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                                  <img
                                    src={card.image_url.startsWith('http') ? card.image_url : `${apiBase.replace('/api/v1', '')}/${card.image_url}`}
                                    alt="Question Diagram"
                                    style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-color)' }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => updateCard(card.id, { image_url: '' })}
                                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                  >
                                    <Trash2 size={12} /> Remove Image
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`img_file_${card.id}`}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImageUpload(card.id, file);
                                    }}
                                  />
                                  <label
                                    htmlFor={`img_file_${card.id}`}
                                    className="btn btn-secondary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
                                  >
                                    <Upload size={14} /> {uploadingImageCardId === card.id ? 'Uploading...' : 'Choose Image File'}
                                  </label>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    Supported: PNG, JPG, WEBP, GIF, SVG (Max 5MB)
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* External Link Input */}
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <LinkIcon size={14} /> External Resource / Reference Link (Optional)
                              </label>
                              <input
                                type="url"
                                className="form-input"
                                placeholder="https://cbt.filloptech.com/resources/topic-ref"
                                value={card.external_link}
                                onChange={(e) => updateCard(card.id, { external_link: e.target.value })}
                              />
                              {errors.external_link && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px' }}>{errors.external_link}</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* SECTION 5: Explanations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <HelpCircle size={18} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>5. Concept &amp; Answer Explanations</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Topic Concept Explanation (Optional)</label>
                      <textarea
                        className="form-input"
                        rows={2}
                        placeholder="General explanation of the topic/concept..."
                        value={card.topic_explanation}
                        onChange={(e) => updateCard(card.id, { topic_explanation: e.target.value })}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Correct Answer Explanation (Optional)</label>
                      <RichTextEditor
                        value={card.correct_explanation}
                        onChange={(val) => updateCard(card.id, { correct_explanation: val })}
                        placeholder="Why the selected correct answer option is right (supports formulas, e.g. \( x = \pm 2 \))..."
                        rows={3}
                        showMathToolbar={true}
                        showPreview={true}
                        previewTitle="Explanation KaTeX Preview"
                      />
                    </div>
                  </div>

                  {/* Single text field for Wrong Answer Explanations */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Wrong Answer Explanations (Optional)</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Explain common misconceptions or why incorrect options are wrong..."
                      value={card.wrong_explanations}
                      onChange={(e) => updateCard(card.id, { wrong_explanations: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom Floating Save Bar */}
      <div
        className="admin-card"
        style={{
          position: 'sticky',
          bottom: '16px',
          padding: '1rem 1.5rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          zIndex: 100,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Total Questions in Batch: <span style={{ color: 'var(--accent)' }}>{cards.length}</span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddQuestion}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Question
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={savingBatch}
            onClick={handleSaveAllQuestions}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.5rem', fontWeight: 800 }}
          >
            <Save size={18} /> {savingBatch ? 'Saving Batch Questions...' : 'Save All Questions'}
          </button>
        </div>
      </div>

      {/* STUDENT CBT PREVIEW MODAL */}
      {previewCard && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewCard(null); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '650px', width: '92%', maxHeight: '85vh', overflowY: 'auto', padding: '1.8rem', position: 'relative' }}>
            <button
              onClick={() => setPreviewCard(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
                {previewCard.exam_type} Mock Exam Student View
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Year: {previewCard.year} • Difficulty: {previewCard.difficulty}
              </span>
            </div>

            {/* Question Text & Formula */}
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: '1.5' }}>
              {previewCard.question_text || 'Sample Question Text'}
            </div>

            {previewCard.formula && (
              <div style={{ margin: '1rem 0', padding: '0.85rem', backgroundColor: 'var(--primary-light)', borderRadius: '10px', textAlign: 'center' }}>
                <MathRenderer text={previewCard.formula} />
              </div>
            )}

            {/* Image Preview */}
            {previewCard.image_url && (
              <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                <img
                  src={previewCard.image_url.startsWith('http') ? previewCard.image_url : `${apiBase.replace('/api/v1', '')}/${previewCard.image_url}`}
                  alt="Question Diagram"
                  style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                />
              </div>
            )}

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.5rem 0' }}>
              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                const isCorrect = previewCard.correct_answer === optKey;
                const optVal = previewCard[`option_${optKey.toLowerCase()}` as keyof BuilderQuestionCard];

                return (
                  <div
                    key={optKey}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: isCorrect ? '2px solid var(--success)' : '1px solid var(--border-color)',
                      backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontWeight: isCorrect ? 700 : 500
                    }}
                  >
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: isCorrect ? 'var(--success)' : 'var(--primary-light)',
                        color: isCorrect ? '#ffffff' : 'var(--text-main)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem'
                      }}
                    >
                      {optKey}
                    </span>
                    <span>{String(optVal || '')}</span>
                    {isCorrect && (
                      <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>Correct Answer</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanations Preview */}
            {(previewCard.correct_explanation || previewCard.topic_explanation) && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.3rem' }}>
                  Explanation:
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {previewCard.correct_explanation || previewCard.topic_explanation}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setPreviewCard(null)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE CREATE SUBJECT MODAL */}
      {showAddSubjectModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddSubjectModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '420px', width: '90%', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowAddSubjectModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New Subject</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Category: {newSubjectExamType}</p>

            <form onSubmit={handleAddSubject}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Exam Type</label>
                <select
                  className="form-input"
                  value={newSubjectExamType}
                  onChange={(e) => setNewSubjectExamType(e.target.value)}
                >
                  {availableExamTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Studies"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSubjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addingSubject}>
                  {addingSubject ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE CREATE TOPIC MODAL */}
      {showAddTopicModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddTopicModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div className="admin-card" style={{ maxWidth: '420px', width: '90%', padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowAddTopicModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New Topic</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Creating a topic under a subject automatically adds it to all exam categories (JAMB, WAEC, NECO).
            </p>

            <form onSubmit={handleAddTopic}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Subject</label>
                <select
                  className="form-input"
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(Number(e.target.value))}
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {distinctSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label">Topic Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTopicModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addingTopic}>
                  {addingTopic ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
