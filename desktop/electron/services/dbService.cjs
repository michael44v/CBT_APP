const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initializes the local SQLite database, creating tables and indices.
 * @param {string} dbPath The absolute path to the sqlite file.
 */
function initDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(dbPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      db = new Database(dbPath);

      console.log('[SQLite] Database connected:', dbPath);

      // Enable foreign keys.
      db.pragma('foreign_keys = ON');

      createTables()
        .then(resolve)
        .catch(reject);
    } catch (err) {
      console.error('[SQLite] Database connection failed:', err);
      db = null;
      reject(err);
    }
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);

      resolve({
        lastID: info.lastInsertRowid,
        changes: info.changes
      });
    } catch (err) {
      reject(err);
    }
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const row = stmt.get(...params);
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    try {
      db.exec(sql);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

async function createTables() {
  try {
    await exec(`
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
  return new Promise((resolve, reject) => {
    try {
      if (!db) {
        resolve();
        return;
      }

      db.close();
      db = null;
      console.log('[SQLite] Local database connection closed.');
      resolve();
    } catch (err) {
      console.error('[SQLite] Database close failed:', err);
      reject(err);
    }
  });
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
  exec
};
