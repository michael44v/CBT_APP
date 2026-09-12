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
  description?: string | null;
  content?: string | null;
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
  formula?: string | null;
  external_link?: string | null;
  image_url?: string | null;
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

export interface WorkerPermissions {
  can_upload_csv: boolean;
  can_use_gui_builder: boolean;
  can_manage_subjects_topics: boolean;
  can_edit_questions: boolean;
  can_delete_questions: boolean;
}

export interface WorkerUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: 'super_admin' | 'admin' | 'worker' | string;
  plain_password?: string;
  permissions?: string;
  permissions_parsed?: WorkerPermissions;
  status: 'active' | 'suspended' | string;
  uploaded_questions_count?: number;
  csv_uploaded_count?: number;
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
  formula?: string;
  external_link?: string;
  image_url?: string;
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
  formula?: string;
  external_link?: string;
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

export interface BuilderQuestionCard {
  id: string; // unique card id for key
  exam_type: string;
  subject_id: number | '';
  topic_id: number | '';
  year: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  formula: string;
  external_link: string;
  image_url: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | '';
  topic_explanation: string;
  correct_explanation: string;
  wrong_explanations: string;
  isCollapsed?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'failed';
  saveError?: string;
}

export interface BuilderFieldErrorMap {
  exam_type?: string;
  subject_id?: string;
  topic_id?: string;
  year?: string;
  difficulty?: string;
  question_text?: string;
  formula?: string;
  external_link?: string;
  image_url?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  topic_explanation?: string;
  correct_explanation?: string;
  wrong_explanations?: string;
}
