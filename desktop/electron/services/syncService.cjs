const {
  getDb,
  run,
  get,
  all,
  exec
} = require('./dbService.cjs');

let simulateOnline = true;
let syncTimer = null;
let changeCallback = null;

async function logSyncEvent(eventType, status, message) {
  try {
    await run(
      `INSERT INTO sync_logs (event_type, status, message, timestamp)
       VALUES (?, ?, ?, ?)`,
      [eventType, status, message, new Date().toISOString()]
    );

    console.log(`[Sync Log] [${eventType}] [${status}] - ${message}`);

    if (changeCallback) {
      changeCallback();
    }
  } catch (err) {
    console.error('[Sync Service] Failed to log sync event:', err);
  }
}

function checkInternet() {
  return simulateOnline;
}

/**
 * Downloads subjects, topics, and questions from the cloud PHP backend
 * and integrates them into the local SQLite database.
 */
async function downloadQuestions() {
  if (!checkInternet()) {
    await logSyncEvent(
      'PULL_QUESTIONS',
      'FAILED',
      'Sync offline: Simulation set to offline.'
    );
    return false;
  }

  await logSyncEvent(
    'PULL_QUESTIONS',
    'PENDING',
    'Connecting to Fillop central sync API...'
  );

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const response = await fetch(
      'http://localhost:80/fillop/api/v1/sync/pull.php'
    );

    if (!response.ok) {
      throw new Error(
        `Sync API returned HTTP ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      await logSyncEvent(
        'PULL_QUESTIONS',
        'FAILED',
        `Server returned failure: ${data.message || 'Unknown server error'}`
      );
      return false;
    }

    const subjects = Array.isArray(data.subjects) ? data.subjects : [];
    const topics = Array.isArray(data.topics) ? data.topics : [];
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const news = Array.isArray(data.news) ? data.news : [];

    /*
     * Use a real SQLite transaction.
     * sqlite3 does not support better-sqlite3's db.transaction().
     */
    await exec('BEGIN TRANSACTION');

    try {
      // Clear old metadata.
      // Delete questions first because they reference topics/subjects.
      await run('DELETE FROM questions');
      await run('DELETE FROM topics');
      await run('DELETE FROM subjects');
      await run('DELETE FROM news');

      // Insert subjects.
      for (const sub of subjects) {
        await run(
          `INSERT INTO subjects (id, name, exam_type)
           VALUES (?, ?, ?)`,
          [sub.id, sub.name, sub.exam_type]
        );
      }

      // Insert topics.
      for (const top of topics) {
        await run(
          `INSERT INTO topics (id, subject_id, name)
           VALUES (?, ?, ?)`,
          [top.id, top.subject_id, top.name]
        );
      }

      // Insert news.
      for (const item of news) {
        await run(
          `INSERT INTO news (id, title, content, icon_name, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [item.id, item.title, item.content, item.icon_name, item.created_at]
        );
      }

      // Insert questions.
      for (const q of questions) {
        await run(
          `INSERT INTO questions (
            id,
            exam_type,
            subject_id,
            year,
            topic_id,
            difficulty,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            topic_explanation,
            correct_explanation,
            wrong_explanations
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            q.id,
            q.exam_type,
            q.subject_id,
            q.year,
            q.topic_id,
            q.difficulty,
            q.question_text,
            q.option_a,
            q.option_b,
            q.option_c,
            q.option_d,
            q.correct_answer,
            q.topic_explanation,
            q.correct_explanation,
            q.wrong_explanations
          ]
        );
      }

      await exec('COMMIT');
    } catch (transactionError) {
      try {
        await exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('[Sync Service] Rollback failed:', rollbackError);
      }

      throw transactionError;
    }

    await logSyncEvent(
      'PULL_QUESTIONS',
      'SUCCESS',
      `Synchronized ${questions.length} questions, ${subjects.length} subjects, and ${topics.length} topics.`
    );

    return true;
  } catch (err) {
    await logSyncEvent(
      'PULL_QUESTIONS',
      'FAILED',
      `Cloud sync service unreachable: ${err.message}`
    );

    return false;
  }
}

/**
 * Pushes local results to the PHP backend.
 */
async function uploadResults() {
  if (!checkInternet()) {
    await logSyncEvent(
      'PUSH_RESULTS',
      'FAILED',
      'Sync offline: Simulation set to offline.'
    );
    return false;
  }

  try {
    // sqlite3 is asynchronous, so use the async helper from dbService.
    const unsynced = await all(
      'SELECT * FROM results WHERE synced = 0'
    );

    const pendingCount = unsynced.length;

    if (pendingCount === 0) {
      console.log('[Sync Service] No pending candidate result records.');
      return true;
    }

    await logSyncEvent(
      'PUSH_RESULTS',
      'PENDING',
      `Syncing ${pendingCount} pending candidate result records...`
    );

    // Fetch local user email from activation.
    const actRow = await get(
      'SELECT email FROM activation LIMIT 1'
    );

    const email = actRow?.email || 'candidate@filloptech.com';

    // Transform results for server payload.
    const resultsPayload = unsynced.map((r) => ({
      email,
      exam_type: r.exam_type,
      score: r.score,
      total_questions: r.total_questions,
      percentage: r.percentage,
      details: r.details,
      submitted_at: r.submitted_at
    }));

    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const response = await fetch(
      'http://localhost:80/fillop/api/v1/sync/push.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          results: resultsPayload
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        `Sync API returned HTTP ${response.status} ${response.statusText}`
      );
    }

    const resultData = await response.json();

    if (!resultData.success) {
      await logSyncEvent(
        'PUSH_RESULTS',
        'FAILED',
        `Server rejected result records: ${
          resultData.message || 'Unknown server error'
        }`
      );

      return false;
    }

    // Mark uploaded records as synchronized.
    await exec('BEGIN TRANSACTION');

    try {
      for (const res of unsynced) {
        await run(
          'UPDATE results SET synced = 1 WHERE id = ?',
          [res.id]
        );
      }

      await exec('COMMIT');
    } catch (transactionError) {
      try {
        await exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('[Sync Service] Rollback failed:', rollbackError);
      }

      throw transactionError;
    }

    await logSyncEvent(
      'PUSH_RESULTS',
      'SUCCESS',
      `Successfully backed up ${pendingCount} test results to server.`
    );

    return true;
  } catch (err) {
    await logSyncEvent(
      'PUSH_RESULTS',
      'FAILED',
      `Cloud sync service unreachable: ${err.message}`
    );

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
    logSyncEvent(
      'NETWORK_STATUS',
      'SUCCESS',
      'Connection restored. Running immediate central sync...'
    ).then(() => triggerSync());
  } else if (!isOnline && previous) {
    logSyncEvent(
      'NETWORK_STATUS',
      'FAILED',
      'Connection lost. Offline-first local engine operational.'
    );
  }
}

function startBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  syncTimer = setInterval(async () => {
    console.log('[Sync Service] Triggering periodic sync...');

    if (checkInternet()) {
      try {
        await triggerSync();
      } catch (err) {
        console.error('[Sync Service] Periodic sync failed:', err);
      }
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
