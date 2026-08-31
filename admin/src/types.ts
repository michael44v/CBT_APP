export interface Subject {
  id: number;
  name: string;
  exam_type: 'JAMB' | 'WAEC' | 'NECO' | string;
  topic_count?: number;
  question_count?: number;
  sync_version?: number;
  created_at?: string;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
  question_count?: number;
  sync_version?: number;
  created_at?: string;
}

export interface Question {
  id: number;
  exam_type: string;
  subject_id: number;
  subject_name?: string;
  year: number;
  topic_id: number;
  topic_name?: string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | string;
  topic_explanation?: string | null;
  correct_explanation?: string | null;
  wrong_explanations?: string | null;
  sync_version?: number;
  created_at?: string;
}

export interface UploadLog {
  id: number;
  admin_user_id?: number;
  filename: string;
  subject_id: number;
  subject_name?: string;
  topic_id: number;
  topic_name?: string;
  rows_imported: number;
  rows_skipped: number;
  created_at: string;
}

export interface ParsedRow {
  row_number: number;
  exam_type: string;
  subject_name: string;
  subject_id?: number;
  topic_name: string;
  topic_id?: number;
  year: number;
  difficulty: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  topic_explanation?: string;
  correct_explanation?: string;
  wrong_explanations?: string;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export interface ColumnMapping {
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  year?: string;
  difficulty?: string;
  topic_explanation?: string;
  correct_explanation?: string;
  wrong_explanations?: string;
}
