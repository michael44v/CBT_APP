export {};

export interface Question {
  id: number;
  exam_type: 'JAMB' | 'WAEC' | 'NECO';
  subject_id: number;
  subject_name?: string;
  year: number;
  topic_id: number;
  topic_name?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  topic_explanation?: string;
  correct_explanation?: string;
  wrong_explanations?: string;
}

export interface Subject {
  id: number;
  name: string;
  exam_type: 'JAMB' | 'WAEC' | 'NECO';
  created_at?: string;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
  created_at?: string;
}

export interface Result {
  id: number;
  exam_type: 'JAMB' | 'WAEC' | 'NECO';
  user_name: string;
  score: number;
  total_questions: number;
  percentage: number;
  submitted_at: string;
  synced: number;
  details?: string; // JSON with break-down per subject
  exam_title?: string; // support old UI mapping
}

export interface SyncLog {
  id: number;
  event_type: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  message: string;
  timestamp: string;
}

export interface SyncStatus {
  isOnline: boolean;
  logs: SyncLog[];
}

export interface LocalActivation {
  email: string;
  passcode: string;
  activated_at: string;
  expiry_date?: string;
  is_active: boolean;
}

export interface SavedLogin {
  email: string;
  passcode: string;
  user_name?: string;
  profile_picture?: string;
  exam_category?: string;
  allowed_subjects?: string;
  activated_at: string;
  expiry_date?: string;
  last_used_at: string;
}

export interface DesktopAPI {
  // Activation / Auth
  getActivationStatus: () => Promise<LocalActivation | null>;
  activateApp: (email: string, passcode: string) => Promise<{ success: boolean; error?: string; expiry_date?: string }>;
  logoutApp: () => Promise<{ success: boolean }>;
  getSavedLogins: () => Promise<SavedLogin[]>;
  switchSavedLogin: (passcode: string) => Promise<{ success: boolean; account?: SavedLogin; error?: string }>;
  deleteSavedLogin: (passcode: string) => Promise<{ success: boolean }>;

  // Subjects / Topics
  getSubjects: (examType: 'JAMB' | 'WAEC' | 'NECO') => Promise<Subject[]>;
  getTopics: (subjectId: number) => Promise<Topic[]>;

  // Practice / Exam Selection & Logic
  getYearsForSubject: (examType: 'JAMB' | 'WAEC' | 'NECO', subjectId: number) => Promise<number[]>;
  generatePracticeQuestions: (params: {
    examType: 'JAMB' | 'WAEC' | 'NECO';
    subjectId: number;
    topicId?: number;
    year?: number;
    limit?: number;
  }) => Promise<Question[]>;

  generateMockQuestions: (params: {
    examType: 'JAMB' | 'WAEC' | 'NECO';
    subjectIds: number[];
    byYear?: number; // if specified, pull for this year; else random
  }) => Promise<{ questions: Question[]; fallbackNote?: string }>;

  // Scoring and Progress
  saveAnswer: (examType: 'JAMB' | 'WAEC' | 'NECO', examSessionId: string, questionId: number, selectedAnswer: 'A' | 'B' | 'C' | 'D') => Promise<void>;
  getSavedAnswers: (examSessionId: string) => Promise<Record<number, 'A' | 'B' | 'C' | 'D'>>;
  submitExamResult: (params: {
    examType: 'JAMB' | 'WAEC' | 'NECO';
    examSessionId: string;
    userName: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    details: string; // JSON summary of results
  }) => Promise<Result>;

  getResults: (userName?: string) => Promise<Result[]>;

  getNews: () => Promise<any[]>;
  markNewsAsRead: (newsId: number, userName?: string) => Promise<{ success: boolean }>;
  getReadNewsIds: (userName?: string) => Promise<number[]>;

  // Sync API
  getSyncStatus: () => Promise<SyncStatus>;
  startSync: () => Promise<boolean>;
  setOnlineStatus: (isOnline: boolean) => Promise<{ isOnline: boolean }>;
  onSyncStatusChanged: (callback: () => void) => void;
  onPasscodeRevoked?: (callback: () => void) => void;
  setExamActive?: (isActive: boolean) => Promise<{ success: boolean; examActive: boolean }>;

  // Temporary/Backwards compatibility support
  getExams?: () => Promise<any[]>;
  getQuestions?: (examId: number) => Promise<any[]>;
  submitExam?: (examId: number, userName: string) => Promise<any>;
}

declare global {
  interface Window {
    api: DesktopAPI;
  }
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}
