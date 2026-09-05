import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Plus,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  RefreshCw,
  CheckSquare
} from 'lucide-react';
import { Subject, Topic, ParsedRow } from './types';
import { parseFileToRawRows, parseCSVTextToRawRows, validateAndMapRows, isCellBlank } from './utils/parser';

interface QuestionWizardProps {
  apiBase: string;
  dbSubjects: Subject[];
  dbTopics: Topic[];
  onRefreshData: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export default function QuestionWizard({
  apiBase,
  dbSubjects,
  dbTopics,
  onRefreshData,
  showNotification
}: QuestionWizardProps) {
  // Step 1 to 7
  const [step, setStep] = useState<number>(1);

  // Selections
  const [selectedExamType, setSelectedExamType] = useState<string>('JAMB');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Topic Inline Modal
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);
  const [newTopicName, setNewTopicName] = useState<string>('');
  const [addingTopic, setAddingTopic] = useState<boolean>(false);

  // File & Raw Data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fileFormat, setFileFormat] = useState<'csv' | 'xlsx'>('csv');

  // Column Mapping
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    question_text: 'question_text',
    option_a: 'option_a',
    option_b: 'option_b',
    option_c: 'option_c',
    option_d: 'option_d',
    correct_answer: 'correct_answer',
    year: 'year',
    difficulty: 'difficulty',
    topic_explanation: 'topic_explanation',
    correct_explanation: 'correct_explanation',
    wrong_explanations: 'wrong_explanations'
  });

  // Validation Results
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<boolean>(false);

  // Import State
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);

  // Unique list of distinct exam types from subjects
  const availableExamTypes = Array.from(new Set(dbSubjects.map(s => s.exam_type))).filter(Boolean);
  if (availableExamTypes.length === 0) availableExamTypes.push('JAMB', 'WAEC', 'NECO');

  // Filtered subjects for selected exam type
  const filteredSubjects = dbSubjects.filter(s => s.exam_type === selectedExamType);

  // Filtered topics for selected subject (using Number conversion for ID safety)
  const filteredTopics = dbTopics.filter(t => Number(t.subject_id) === Number(selectedSubject?.id || 0));

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      const match = filteredSubjects.find(s => Number(s.id) === Number(selectedSubject?.id));
      if (!match) {
        setSelectedSubject(filteredSubjects[0]);
      }
    } else {
      setSelectedSubject(null);
    }
  }, [selectedExamType, dbSubjects]);

  useEffect(() => {
    if (filteredTopics.length > 0) {
      const match = filteredTopics.find(t => Number(t.id) === Number(selectedTopic?.id));
      if (!match && !selectedTopic) {
        setSelectedTopic(filteredTopics[0]);
      }
    }
  }, [selectedSubject, dbTopics]);

  // Handle inline Topic creation
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !newTopicName.trim()) return;

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
          subject_id: selectedSubject.id,
          topic_name: newTopicName.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Topic created successfully!');
        const createdTopic: Topic = {
          id: Number(data.topic_id),
          subject_id: Number(selectedSubject.id),
          name: newTopicName.trim()
        };
        setSelectedTopic(createdTopic);
        setNewTopicName('');
        setShowAddTopicModal(false);
        onRefreshData();
      } else {
        showNotification(data.message || 'Failed to create topic.', 'error');
      }
    } catch (err) {
      showNotification('Error creating topic.', 'error');
    } finally {
      setAddingTopic(false);
    }
  };

  // Helper to process headers & rows into mapping state
  const processParsedData = (headers: string[], rows: Record<string, string>[]) => {
    setRawHeaders(headers);
    setRawRows(rows);

    const mapping: Record<string, string> = {};
    const targetFields = [
      'id', 'exam_type', 'subject_id', 'topic_id', 'question_text',
      'option_a', 'option_b', 'option_c', 'option_d',
      'correct_answer', 'year', 'difficulty', 'topic_explanation',
      'correct_explanation', 'wrong_explanations'
    ];

    targetFields.forEach(tf => {
      const match = headers.find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_') === tf || h.toLowerCase() === tf);
      if (match) mapping[tf] = match;
    });

    setColumnMapping(prev => ({ ...prev, ...mapping }));
    showNotification(`Data loaded (${rows.length} rows parsed)`);
  };

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    const fname = file.name.toLowerCase();
    setFileFormat(fname.endsWith('.xlsx') || fname.endsWith('.xls') ? 'xlsx' : 'csv');

    try {
      const { headers, rows } = await parseFileToRawRows(file);
      processParsedData(headers, rows);
    } catch (err) {
      showNotification('Error reading uploaded file.', 'error');
    }
  };

  // Handle Raw CSV Text Change
  const handleRawCsvTextChange = async (text: string) => {
    setRawCsvText(text);
    if (!text.trim()) {
      setRawHeaders([]);
      setRawRows([]);
      return;
    }
    try {
      const { headers, rows } = await parseCSVTextToRawRows(text);
      processParsedData(headers, rows);
    } catch (err) {
      console.error(err);
    }
  };

  // Download Expected CSV/XLSX Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        question_text: 'Solve for x in the linear equation 2x + 5 = 15.',
        option_a: '5',
        option_b: '10',
        option_c: '20',
        option_d: '15',
        correct_answer: 'A',
        year: '2024',
        difficulty: 'medium',
        topic_explanation: 'Linear Equations in one variable.',
        correct_explanation: 'Subtracting 5 from both sides gives 2x = 10, so x = 5.',
        wrong_explanations: 'Common errors occur when adding instead of subtracting 5.'
      },
      {
        question_text: 'Which of the following is a primary color?',
        option_a: 'Green',
        option_b: 'Red',
        option_c: 'Orange',
        option_d: 'Purple',
        correct_answer: 'B',
        year: '2023',
        difficulty: 'easy',
        topic_explanation: 'Basic Color Theory.',
        correct_explanation: 'Red is one of the three additive primary colors.',
        wrong_explanations: 'Green, orange, and purple are secondary or tertiary colors.'
      }
    ];

    if (fileFormat === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'QuestionsTemplate');
      XLSX.writeFile(wb, `${selectedSubject?.name || 'CBT'}_Questions_Template.xlsx`);
    } else {
      const csv = Papa.unparse(templateData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSubject?.name || 'CBT'}_Questions_Template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Run Preview Validation
  const handleRunValidation = async () => {
    if (!selectedSubject || !selectedTopic) {
      showNotification('Please select subject and topic first.', 'error');
      return;
    }

    // Fetch existing question texts to check for DB duplicates
    let existingTexts = new Set<string>();
    try {
      const res = await fetch(`${apiBase}/admin/questions.php?subject_id=${selectedSubject.id}&topic_id=${selectedTopic.id}`);
      const data = await res.json();
      if (data.success && data.questions) {
        existingTexts = new Set(data.questions.map((q: any) => String(q.question_text).toLowerCase().trim()));
      }
    } catch (e) {
      console.error(e);
    }

    const validated = validateAndMapRows(
      rawRows,
      columnMapping,
      selectedExamType,
      selectedSubject,
      selectedTopic,
      existingTexts
    );

    setParsedRows(validated);
    setAcknowledgedWarnings(false);
    setStep(5);
  };

  // Selective Import of Valid Rows
  const handleExecuteImport = async (validOnly: boolean = false) => {
    const rowsToImport = validOnly ? parsedRows.filter(r => r.isValid) : parsedRows;
    if (rowsToImport.length === 0) {
      showNotification('No valid rows available to import.', 'error');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    const batchSize = 200;
    let totalImported = 0;
    let totalSkipped = 0;

    for (let i = 0; i < rowsToImport.length; i += batchSize) {
      const batch = rowsToImport.slice(i, i + batchSize);
      try {
        const res = await fetch(`${apiBase}/admin/questions.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: JSON.stringify({
            action: 'bulk_import',
            filename: uploadedFile?.name || 'upload.csv',
            subject_id: selectedSubject?.id,
            topic_id: selectedTopic?.id,
            rows: batch
          }),
        });
        const data = await res.json();
        if (data.success) {
          totalImported += data.inserted_count || 0;
          totalSkipped += data.skipped_duplicates || 0;
        }
      } catch (err) {
        console.error(err);
      }
      setImportProgress(Math.min(100, Math.round(((i + batch.length) / rowsToImport.length) * 100)));
    }

    setImporting(false);
    setImportSummary({ imported: totalImported, skipped: totalSkipped });
    onRefreshData();
    setStep(7);
  };

  // Export Errors-Only CSV
  const handleDownloadErrorsCSV = () => {
    const errorRows = parsedRows.filter(r => !r.isValid);
    if (errorRows.length === 0) return;

    const csvData = errorRows.map(r => ({
      row_number: r.row_number,
      errors: r.errors.join(' | '),
      question_text: r.question_text,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      correct_answer: r.correct_answer,
      year: r.year,
      difficulty: r.difficulty
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_row_log.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;
  const warningCount = parsedRows.filter(r => r.warnings.length > 0).length;

  return (
    <div className="admin-card" style={{ padding: '2rem' }}>
      {/* Wizard Progress Stepper Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={20} /> Multi-Step Question Upload Wizard
        </h2>
        <div style={{ display: 'flex', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
          {[1, 2, 3, 4, 5, 6, 7].map(s => (
            <span
              key={s}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: step === s ? 'var(--primary)' : step > s ? 'var(--success)' : 'var(--primary-light)',
                color: step >= s ? 'white' : 'var(--text-muted)'
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Exam Type */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Step 1: Select Exam Category</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Choose the targeted exam framework for this upload batch.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {availableExamTypes.map(etype => (
              <div
                key={etype}
                onClick={() => {
                  setSelectedExamType(etype);
                  const firstSub = dbSubjects.find(s => s.exam_type === etype);
                  setSelectedSubject(firstSub || null);
                }}
                style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: selectedExamType === etype ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: selectedExamType === etype ? 'var(--primary-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: selectedExamType === etype ? 'var(--primary)' : 'var(--text-main)',
                  transition: 'all 0.2s ease'
                }}
              >
                {etype}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setStep(2)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Next: Select Subject <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* STEP 2: Select Subject */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
            Step 2: Select Subject ({selectedExamType})
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Choose an existing subject under category <strong>{selectedExamType}</strong>. Subject names are read-only.
          </p>
          <div className="form-group" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
            <label className="form-label">Subject</label>
            <select
              className="form-input"
              value={selectedSubject?.id || ''}
              onChange={(e) => {
                const sub = dbSubjects.find(s => Number(s.id) === Number(e.target.value));
                setSelectedSubject(sub || null);
              }}
            >
              {filteredSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (ID: {sub.id})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="btn btn-primary"
              disabled={filteredSubjects.length > 0 && !selectedSubject}
              onClick={() => {
                let activeSub = selectedSubject;
                if (!activeSub && filteredSubjects.length > 0) {
                  activeSub = filteredSubjects[0];
                  setSelectedSubject(filteredSubjects[0]);
                }
                setStep(3);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Next: Select/Create Topic <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Select or Create Topic */}
      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
            Step 3: Select Topic under {selectedSubject?.name}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Select an existing topic or add a new topic inline.
          </p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', maxWidth: '500px', marginBottom: '2rem' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">Topic</label>
              <select
                className="form-input"
                value={selectedTopic?.id || ''}
                onChange={(e) => {
                  const top = dbTopics.find(t => Number(t.id) === Number(e.target.value));
                  setSelectedTopic(top || null);
                }}
              >
                {!filteredTopics.some(t => Number(t.id) === Number(selectedTopic?.id)) && selectedTopic && (
                  <option key={selectedTopic.id} value={selectedTopic.id}>{selectedTopic.name}</option>
                )}
                {filteredTopics.map(top => (
                  <option key={top.id} value={top.id}>{top.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddTopicModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '42px', whiteSpace: 'nowrap' }}
            >
              <Plus size={16} /> Add Topic
            </button>
          </div>

          {/* Modal for adding new topic inline */}
          {showAddTopicModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div className="admin-card" style={{ maxWidth: '400px', width: '90%', padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New Topic</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subject: {selectedSubject?.name}</p>
                <form onSubmit={handleAddTopic}>
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                    <label className="form-label">Topic Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Organic Chemistry"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddTopicModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={addingTopic}>
                      {addingTopic ? 'Adding...' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!selectedTopic && filteredTopics.length === 0}
              onClick={() => {
                let activeTop = selectedTopic;
                if (!activeTop && filteredTopics.length > 0) {
                  activeTop = filteredTopics[0];
                  setSelectedTopic(filteredTopics[0]);
                }
                if (activeTop) {
                  setStep(4);
                } else {
                  showNotification('Please select or add a topic first.', 'error');
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Next: Upload File <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Upload File or Type Raw CSV */}
      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Step 4: Upload File or Paste Raw CSV</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Target: <strong>{selectedExamType}</strong> → <strong>{selectedSubject?.name}</strong> → <strong>{selectedTopic?.name}</strong>
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${inputMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('file')}
            >
              <Upload size={16} /> Upload File (.csv / .xlsx)
            </button>
            <button
              type="button"
              className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('text')}
            >
              <FileText size={16} /> Type / Paste Raw CSV Text
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadTemplate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} /> Download Expected Template ({fileFormat.toUpperCase()})
            </button>
          </div>

          {inputMode === 'file' ? (
            <div className="form-group" style={{ maxWidth: '500px', marginBottom: '2rem' }}>
              <label className="form-label">Select File (.csv or .xlsx)</label>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="form-input"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Type / Paste Raw CSV Content</label>
              <textarea
                className="textarea-csv"
                placeholder={`id,exam_type,subject_id,year,topic_id,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer,topic_explanation,correct_explanation,wrong_explanations\n1,JAMB,1,2024,5,medium,"What is 2+2?",2,3,4,5,C,"Addition explanation","2+2=4","Common miscalculation"`}
                value={rawCsvText}
                onChange={(e) => handleRawCsvTextChange(e.target.value)}
                style={{ height: '220px' }}
              />
            </div>
          )}

          {rawRows.length > 0 && (
            <div style={{ marginBottom: '1.5rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px' }}>
              <strong>Loaded {rawRows.length} raw data rows</strong> with detected headers:
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {rawHeaders.join(', ')}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="btn btn-primary"
              disabled={rawRows.length === 0}
              onClick={handleRunValidation}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Next: Column Mapping &amp; Validation Preview <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Preview & Validate */}
      {step === 5 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Step 5: Validation Preview &amp; Header Mapping</h3>

          {/* Blank Cell Count Summary Banner */}
          <div style={{
            display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap',
            background: 'var(--bg-main)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Parsed Rows:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{parsedRows.length}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Ready to Import:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>{validCount}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Rows with Errors:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger)' }}>{errorCount}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Soft Warnings:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)' }}>{warningCount}</div>
            </div>
          </div>

          {/* Column Mapping Section if headers differ */}
          <details style={{ marginBottom: '1.5rem', background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px' }}>
            <summary style={{ fontWeight: 700, cursor: 'pointer' }}>Adjust Detected Column Mapping</summary>
            <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem', minWidth: '600px' }}>
                {['id', 'exam_type', 'subject_id', 'topic_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'year', 'difficulty', 'topic_explanation', 'correct_explanation', 'wrong_explanations'].map(field => (
                  <div key={field} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>{field}</label>
                    <select
                      className="form-input"
                      value={columnMapping[field] || ''}
                      onChange={(e) => {
                        const newM = { ...columnMapping, [field]: e.target.value };
                        setColumnMapping(newM);
                      }}
                    >
                      <option value="">-- Ignore / Unmapped --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleRunValidation} style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              Re-run Validation with New Mapping
            </button>
          </details>

          {/* Mandatory Checkbox for soft warnings */}
          {warningCount > 0 && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <input
                type="checkbox"
                id="ackWarnings"
                checked={acknowledgedWarnings}
                onChange={(e) => setAcknowledgedWarnings(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="ackWarnings" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--warning)', cursor: 'pointer' }}>
                I acknowledge the soft warnings ({warningCount} rows have blank explanations or potential duplicate questions in DB).
              </label>
            </div>
          )}

          {/* Validation Results Table with Full Texts for All Fields */}
          <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <table style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Row</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>id</th>
                  <th style={{ whiteSpace: 'nowrap' }}>exam_type</th>
                  <th style={{ whiteSpace: 'nowrap' }}>subject_id</th>
                  <th style={{ whiteSpace: 'nowrap' }}>year</th>
                  <th style={{ whiteSpace: 'nowrap' }}>topic_id</th>
                  <th style={{ whiteSpace: 'nowrap' }}>difficulty</th>
                  <th style={{ minWidth: '220px' }}>question_text</th>
                  <th style={{ minWidth: '120px' }}>option_a</th>
                  <th style={{ minWidth: '120px' }}>option_b</th>
                  <th style={{ minWidth: '120px' }}>option_c</th>
                  <th style={{ minWidth: '120px' }}>option_d</th>
                  <th style={{ whiteSpace: 'nowrap' }}>correct_answer</th>
                  <th style={{ minWidth: '180px' }}>topic_explanation</th>
                  <th style={{ minWidth: '180px' }}>correct_explanation</th>
                  <th style={{ minWidth: '180px' }}>wrong_explanations</th>
                  <th style={{ minWidth: '180px' }}>Issues / Warnings</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, idx) => {
                  const rawObj = rawRows[idx] || {};
                  return (
                    <tr key={r.row_number}>
                      <td style={{ whiteSpace: 'nowrap' }}><strong>Row {r.row_number}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {r.isValid ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} /> Ready
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> Invalid
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{rawObj[columnMapping['id'] || 'id'] || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.exam_type}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.subject_id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.year}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.topic_id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.difficulty}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.question_text || '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.option_a || '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.option_b || '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.option_c || '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.option_d || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><strong>{r.correct_answer}</strong></td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.topic_explanation || '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.correct_explanation || '-'}</td>
                      <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.wrong_explanations || '-'}</td>
                      <td style={{ minWidth: '180px' }}>
                        {r.errors.length > 0 && (
                          <div style={{ fontWeight: 600 }}>{r.errors.join('; ')}</div>
                        )}
                        {r.warnings.length > 0 && (
                          <div style={{ fontSize: '11px' }}>{r.warnings.join('; ')}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            position: 'sticky', bottom: '0', backgroundColor: 'var(--bg-card)', padding: '1rem 0 0 0',
            borderTop: '1px solid var(--border-color)', zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(4)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Back
              </button>
              {errorCount > 0 && (
                <button className="btn btn-secondary" onClick={handleDownloadErrorsCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={16} /> Download Errors-Only CSV
                </button>
              )}
            </div>

            <button
              className="btn btn-primary"
              disabled={(warningCount > 0 && !acknowledgedWarnings) || validCount === 0}
              onClick={() => setStep(6)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Next: Confirm &amp; Import ({validCount} valid rows) <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Confirm & Batched Import */}
      {step === 6 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Step 6: Confirmation</h3>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>
              You are about to import {validCount} questions into:
            </h4>
            <p style={{ margin: '8px 0 0 0', fontSize: '1rem', fontWeight: 700 }}>
              {selectedExamType} → {selectedSubject?.name} → {selectedTopic?.name}
            </p>
            {errorCount > 0 && (
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                Note: {errorCount} invalid rows will be skipped. You can separately fix and re-upload them.
              </p>
            )}
          </div>

          {importing && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                <span>Importing batched question payload...</span>
                <span>{importProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${importProgress}%`, height: '100%', backgroundColor: 'var(--success)', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" disabled={importing} onClick={() => setStep(5)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="btn btn-success"
              disabled={importing}
              onClick={() => handleExecuteImport(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={18} /> Confirm &amp; Import Valid Rows Now
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Result Screen */}
      {step === 7 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
          }}>
            <CheckCircle size={36} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Import Completed!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Successfully inserted <strong>{importSummary?.imported}</strong> questions into {selectedSubject?.name} ({selectedTopic?.name}).
            {importSummary?.skipped ? ` Skipped ${importSummary.skipped} duplicate questions.` : ''}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStep(4);
                setUploadedFile(null);
                setRawRows([]);
                setParsedRows([]);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={16} /> Upload Another File for Same Subject/Topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
