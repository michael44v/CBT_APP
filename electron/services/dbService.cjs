const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initializes the SQLite database, creating tables if they do not exist
 * and seeding sample exams and questions if the exams table is empty.
 * @param {string} dbPath The absolute path to the sqlite file.
 */
function initDatabase(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath, { verbose: console.log });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables in order
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration INTEGER NOT NULL, -- in minutes
      description TEXT,
      version INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      subject TEXT NOT NULL,
      text TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON string representing string array of options
      correct_option TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT,
      saved_at TEXT NOT NULL, -- ISO timestamp
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(exam_id, question_id) -- Ensure one answer per question per exam run
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage REAL NOT NULL,
      submitted_at TEXT NOT NULL, -- ISO timestamp
      synced INTEGER DEFAULT 0, -- 0 for not synced, 1 for synced
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL, -- 'PULL_QUESTIONS', 'PUSH_RESULTS'
      status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'PENDING'
      message TEXT,
      timestamp TEXT NOT NULL -- ISO timestamp
    );
  `);

  console.log('Database tables verified/created.');

  // Seed data if database is empty
  seedDatabaseIfEmpty();
}

/**
 * Seeding helper to pre-fill database with sample CBT practice exam and questions
 */
function seedDatabaseIfEmpty() {
  const examCount = db.prepare('SELECT COUNT(*) as count FROM exams').get();
  if (examCount.count === 0) {
    console.log('Seeding initial CBT questions and exams...');

    // Insert Exam
    const insertExam = db.prepare(`
      INSERT INTO exams (id, title, duration, description, version, is_active)
      VALUES (1, 'CBT Practice Test', 60, 'General CBT Practice', 1, 1)
    `);
    insertExam.run();

    // Insert Questions (Drop-in ready scripts formatted beautifully)
    const questionsToSeed = [
      // ENGLISH
      { exam_id: 1, subject: 'English', text: 'Choose the correct synonym of Happy', options: '["Sad","Joyful","Angry","Tired"]', correct_option: 'Joyful', version: 1 },
      { exam_id: 1, subject: 'English', text: 'Fill in the blank: She ___ going to school.', options: '["is","are","were","be"]', correct_option: 'is', version: 1 },
      { exam_id: 1, subject: 'English', text: 'Which is a noun?', options: '["Run","Beauty","Quickly","Blue"]', correct_option: 'Beauty', version: 1 },
      { exam_id: 1, subject: 'English', text: 'Opposite of Strong is:', options: '["Weak","Hard","Fast","Heavy"]', correct_option: 'Weak', version: 1 },
      { exam_id: 1, subject: 'English', text: 'Which sentence is correct?', options: '["He go to school","He goes to school","He going school","He gone school"]', correct_option: 'He goes to school', version: 1 },

      // MATHEMATICS
      { exam_id: 1, subject: 'Mathematics', text: '2 + 2 = ?', options: '["3","4","5","6"]', correct_option: '4', version: 1 },
      { exam_id: 1, subject: 'Mathematics', text: '5 × 6 = ?', options: '["30","20","25","35"]', correct_option: '30', version: 1 },
      { exam_id: 1, subject: 'Mathematics', text: 'Square root of 16?', options: '["2","3","4","5"]', correct_option: '4', version: 1 },
      { exam_id: 1, subject: 'Mathematics', text: '10 ÷ 2 = ?', options: '["2","3","5","8"]', correct_option: '5', version: 1 },
      { exam_id: 1, subject: 'Mathematics', text: '7 + 8 = ?', options: '["14","15","16","13"]', correct_option: '15', version: 1 },

      // PHYSICS
      { exam_id: 1, subject: 'Physics', text: 'Unit of Force?', options: '["Joule","Newton","Watt","Volt"]', correct_option: 'Newton', version: 1 },
      { exam_id: 1, subject: 'Physics', text: 'Speed = ?', options: '["Distance × Time","Distance ÷ Time","Time ÷ Distance","Mass × Speed"]', correct_option: 'Distance ÷ Time', version: 1 },
      { exam_id: 1, subject: 'Physics', text: 'SI unit of energy?', options: '["Joule","Watt","Newton","Ampere"]', correct_option: 'Joule', version: 1 },
      { exam_id: 1, subject: 'Physics', text: 'Gravity on Earth ≈ ?', options: '["9.8 m/s²","10 m/s","5 m/s²","20 m/s²"]', correct_option: '9.8 m/s²', version: 1 },
      { exam_id: 1, subject: 'Physics', text: 'Light travels fastest in?', options: '["Air","Water","Vacuum","Glass"]', correct_option: 'Vacuum', version: 1 },

      // BIOLOGY
      { exam_id: 1, subject: 'Biology', text: 'Basic unit of life?', options: '["Atom","Cell","Tissue","Organ"]', correct_option: 'Cell', version: 1 },
      { exam_id: 1, subject: 'Biology', text: 'Human heart chambers?', options: '["2","3","4","5"]', correct_option: '4', version: 1 },
      { exam_id: 1, subject: 'Biology', text: 'Photosynthesis occurs in?', options: '["Root","Stem","Leaf","Flower"]', correct_option: 'Leaf', version: 1 },
      { exam_id: 1, subject: 'Biology', text: 'Blood is pumped by?', options: '["Brain","Heart","Lungs","Kidney"]', correct_option: 'Heart', version: 1 },
      { exam_id: 1, subject: 'Biology', text: 'DNA stands for?', options: '["Deoxyribonucleic Acid","Ribonucleic Acid","Dynamic Acid","Digital Nucleus"]', correct_option: 'Deoxyribonucleic Acid', version: 1 }
    ];

    const insertQuestion = db.prepare(`
      INSERT INTO questions (exam_id, subject, text, options, correct_option, version)
      VALUES (@exam_id, @subject, @text, @options, @correct_option, @version)
    `);

    const transaction = db.transaction((questions) => {
      for (const q of questions) {
        insertQuestion.run(q);
      }
    });

    transaction(questionsToSeed);
    console.log('Database successfully seeded with exams and questions.');
  }
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed.');
  }
}

/**
 * Returns the raw database instance
 */
function getDb() {
  if (!db) {
    throw new Error('Database is not initialized. Please call initDatabase first.');
  }
  return db;
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase
};
