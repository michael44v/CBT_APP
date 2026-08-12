const { getDb } = require('./dbService.cjs');

let simulateOnline = true;
let syncTimer = null;
let changeCallback = null;

function logSyncEvent(eventType, status, message) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO sync_logs (event_type, status, message, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(eventType, status, message, new Date().toISOString());
    console.log(`[Sync Log] [${eventType}] [${status}] - ${message}`);

    if (changeCallback) {
      changeCallback();
    }
  } catch (err) {
    console.error('Failed to log sync event:', err);
  }
}

function checkInternet() {
  return simulateOnline;
}

/**
 * Downloads subjects, topics, and questions from the cloud PHP backend
 * and integrates them into local SQLite database.
 */
async function downloadQuestions() {
  if (!checkInternet()) {
    logSyncEvent('PULL_QUESTIONS', 'FAILED', 'Sync offline: Simulation set to offline.');
    return false;
  }

  logSyncEvent('PULL_QUESTIONS', 'PENDING', 'Connecting to Fillop central sync API...');

  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch("http://localhost:8000/api/v1/sync/pull.php");
    const data = await response.json();

    if (data.success) {
      const db = getDb();

      // Clear existing tables and insert downloaded rows to preserve synchronization integrity
      db.transaction(() => {
        // Clear old metadata
        db.prepare("DELETE FROM subjects").run();
        db.prepare("DELETE FROM topics").run();
        db.prepare("DELETE FROM questions").run();

        // Insert new subjects
        const insertSubject = db.prepare("INSERT INTO subjects (id, name, exam_type) VALUES (?, ?, ?)");
        for (const sub of data.subjects) {
          insertSubject.run(sub.id, sub.name, sub.exam_type);
        }

        // Insert new topics
        const insertTopic = db.prepare("INSERT INTO topics (id, subject_id, name) VALUES (?, ?, ?)");
        for (const top of data.topics) {
          insertTopic.run(top.id, top.subject_id, top.name);
        }

        // Insert new questions
        const insertQuestion = db.prepare(`
          INSERT INTO questions (
            id, exam_type, subject_id, year, topic_id, difficulty,
            question_text, option_a, option_b, option_c, option_d, correct_answer,
            topic_explanation, correct_explanation, wrong_explanations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const q of data.questions) {
          insertQuestion.run(
            q.id, q.exam_type, q.subject_id, q.year, q.topic_id, q.difficulty,
            q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
            q.topic_explanation, q.correct_explanation, q.wrong_explanations
          );
        }
      })();

      logSyncEvent('PULL_QUESTIONS', 'SUCCESS', `Synchronized ${data.questions.length} questions, ${data.subjects.length} subjects, and ${data.topics.length} topics.`);
      return true;
    } else {
      logSyncEvent('PULL_QUESTIONS', 'FAILED', `Server returned failure: ${data.message}`);
      return false;
    }
  } catch (err) {
    logSyncEvent('PULL_QUESTIONS', 'FAILED', `Cloud sync service unreachable: ${err.message}`);
    return false;
  }
}

/**
 * Pushes local results to PHP backend
 */
async function uploadResults() {
  if (!checkInternet()) {
    logSyncEvent('PUSH_RESULTS', 'FAILED', 'Sync offline: Simulation set to offline.');
    return false;
  }

  try {
    const db = getDb();
    const unsynced = db.prepare('SELECT * FROM results WHERE synced = 0').all();

    if (unsynced.length === 0) {
      return true;
    }

    logSyncEvent('PUSH_RESULTS', 'PENDING', `Syncing ${unsynced.length} pending candidate result records...`);

    // Fetch local user email from activation
    const actRow = db.prepare("SELECT email FROM activation LIMIT 1").get();
    const email = actRow ? actRow.email : "candidate@filloptech.com";

    // Transform results for server payload
    const resultsPayload = unsynced.map(r => ({
      email: email,
      exam_type: r.exam_type,
      score: r.score,
      total_questions: r.total_questions,
      percentage: r.percentage,
      details: r.details,
      submitted_at: r.submitted_at
    }));

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch("http://localhost:8000/api/v1/sync/push.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: resultsPayload })
    });
    const resultData = await response.json();

    if (resultData.success) {
      db.transaction(() => {
        const updateStmt = db.prepare('UPDATE results SET synced = 1 WHERE id = ?');
        for (const res of unsynced) {
          updateStmt.run(res.id);
        }
      })();

      logSyncEvent('PUSH_RESULTS', 'SUCCESS', `Successfully backed up ${unsynced.length} test results to server.`);
      return true;
    } else {
      logSyncEvent('PUSH_RESULTS', 'FAILED', `Server rejected result records: ${resultData.message}`);
      return false;
    }
  } catch (err) {
    logSyncEvent('PUSH_RESULTS', 'FAILED', `Cloud sync service unreachable: ${err.message}`);
    return false;
  }
}

async function triggerSync() {
  console.log('[Sync Service] Running manual sync cycle...');
  const resultsSuccess = await uploadResults();
  const questionsSuccess = await downloadQuestions();
  return resultsSuccess && questionsSuccess;
}

function registerStatusCallback(callback) {
  changeCallback = callback;
}

function setOnlineStatus(isOnline) {
  const previous = simulateOnline;
  simulateOnline = isOnline;
  console.log(`[Sync Service] Network Simulated Online: ${isOnline}`);

  if (changeCallback) {
    changeCallback();
  }

  if (isOnline && !previous) {
    logSyncEvent('NETWORK_STATUS', 'SUCCESS', 'Connection restored. Running immediate central sync...');
    triggerSync();
  } else if (!isOnline && previous) {
    logSyncEvent('NETWORK_STATUS', 'FAILED', 'Connection lost. Offline-first local engine operational.');
  }
}

function startBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  syncTimer = setInterval(() => {
    console.log('[Sync Service] Triggering periodic sync...');
    if (checkInternet()) {
      triggerSync();
    }
  }, 45000);
}

function stopBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

module.exports = {
  checkInternet,
  downloadQuestions,
  uploadResults,
  triggerSync,
  setOnlineStatus,
  registerStatusCallback,
  startBackgroundSync,
  stopBackgroundSync,
  logSyncEvent
};
