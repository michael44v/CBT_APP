const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initializes the local SQLite database, creating tables and indices synchronously.
 * @param {string} dbPath The absolute path to the sqlite file.
 */
function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  console.log('[SQLite] Database connected:', dbPath);

  // Enable foreign keys.
  db.pragma('foreign_keys = ON');

  createTables();
}

function run(sql, params = []) {
  if (!db) throw new Error('Database is not initialized.');
  const stmt = db.prepare(sql);
  const info = stmt.run(...params);

  return {
    lastID: info.lastInsertRowid,
    changes: info.changes
  };
}

function get(sql, params = []) {
  if (!db) throw new Error('Database is not initialized.');
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function all(sql, params = []) {
  if (!db) throw new Error('Database is not initialized.');
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function exec(sql) {
  if (!db) throw new Error('Database is not initialized.');
  db.exec(sql);
}

function transaction(fn) {
  if (!db) throw new Error('Database is not initialized.');
  return db.transaction(fn)();
}

function createTables() {
  try {
    exec(`
      CREATE TABLE IF NOT EXISTS activation (
        email TEXT NOT NULL,
        passcode TEXT NOT NULL PRIMARY KEY,
        user_name TEXT,
        profile_picture TEXT,
        activated_at TEXT NOT NULL,
        expiry_date TEXT,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        exam_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_type TEXT NOT NULL,
        subject_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        difficulty TEXT DEFAULT 'medium',
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        topic_explanation TEXT,
        correct_explanation TEXT,
        wrong_explanations TEXT,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_type TEXT NOT NULL,
        user_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        details TEXT,
        submitted_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        icon_name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_questions_filter
        ON questions (exam_type, subject_id, year);

      CREATE INDEX IF NOT EXISTS idx_questions_topic
        ON questions (exam_type, subject_id, topic_id);
    `);

    console.log('[SQLite] Local database tables and indices verified.');
    console.log('[SQLite] Database initialization complete.');
  } catch (error) {
    console.error('[SQLite] Initialization failure:', error);
    throw error;
  }
}

function closeDatabase() {
  if (!db) {
    return;
  }

  db.close();
  db = null;
  console.log('[SQLite] Local database connection closed.');
}

function getDb() {
  if (!db) {
    throw new Error(
      'Database is not initialized. Please call initDatabase first.'
    );
  }

  return db;
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  run,
  get,
  all,
  exec,
  transaction
};
