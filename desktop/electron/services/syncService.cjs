const {
  getDb,
  run,
  get,
  all,
  exec,
  transaction
} = require('./dbService.cjs');

let simulateOnline = true;
let syncTimer = null;
let changeCallback = null;
let isSyncing = false;
let examActive = false;
let syncIntervalMinutes = 30; // Configurable 30-minute default interval

function setExamActive(active) {
  examActive = !!active;
  console.log(`[Sync Service] Exam active state set to: ${examActive}`);
}

function setSyncIntervalMinutes(minutes) {
  if (typeof minutes === 'number' && minutes > 0) {
    syncIntervalMinutes = minutes;
    startBackgroundSync();
  }
}

function logSyncEvent(eventType, status, message) {
  try {
    run(
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
    logSyncEvent(
      'PULL_QUESTIONS',
      'FAILED',
      'Sync offline: Network unavailable.'
    );
    return false;
  }

  if (examActive) {
    console.log('[Sync Service] Question sync skipped: Exam in progress.');
    return true;
  }

  logSyncEvent(
    'PULL_QUESTIONS',
    'PENDING',
    'Connecting to Fillop central sync API...'
  );

  try {
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    // Fetch local sync_state
    const syncState = get('SELECT last_version FROM sync_state WHERE id = 1');
    const lastVersion = syncState ? (syncState.last_version || 0) : 0;

    // Fetch active local activation info
    const actRow = get('SELECT * FROM activation WHERE is_active = 1 LIMIT 1');
    let url = `https://cbt.filloptech.com/api/v1/sync/pull.php?since=${lastVersion}`;
    if (actRow && actRow.email && actRow.passcode) {
      url += `&email=${encodeURIComponent(actRow.email)}&passcode=${encodeURIComponent(actRow.passcode)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Sync API returned HTTP ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      logSyncEvent(
        'PULL_QUESTIONS',
        'FAILED',
        `Server returned failure: ${data.message || 'Unknown server error'}`
      );
      return false;
    }

    const serverVersion = data.server_version || lastVersion;
    const isFullSync = !!data.is_full_sync;
    const subjects = Array.isArray(data.subjects) ? data.subjects : [];
    const topics = Array.isArray(data.topics) ? data.topics : [];
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const deletedQuestionIds = Array.isArray(data.deleted_question_ids) ? data.deleted_question_ids : [];
    const news = Array.isArray(data.news) ? data.news : [];
    const passcodeInfo = data.passcode_info || null;

    // Handle Passcode Revocation detection
    if (passcodeInfo && passcodeInfo.status && passcodeInfo.status !== 'active') {
      logSyncEvent('AUTH_REVOKED', 'FAILED', `Passcode status is ${passcodeInfo.status}. Revoking local activation session.`);
      run('DELETE FROM activation');
      if (changeCallback) changeCallback('PASSCODE_REVOKED');
      return false;
    }

    /*
     * Use atomic better-sqlite3 transaction for incremental sync
     */
    transaction(() => {
      if (isFullSync) {
        run('DELETE FROM questions');
        run('DELETE FROM topics');
        run('DELETE FROM subjects');
        run('DELETE FROM news');
      }

      // 1. Process Subjects
      for (const sub of subjects) {
        run(
          `INSERT OR REPLACE INTO subjects (id, name, exam_type, sync_version, created_at)
           VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM subjects WHERE id = ?), CURRENT_TIMESTAMP))`,
          [sub.id, sub.name, sub.exam_type, sub.sync_version || serverVersion, sub.id]
        );
      }

      // 2. Process Topics
      for (const top of topics) {
        run(
          `INSERT OR REPLACE INTO topics (id, subject_id, name, sync_version, created_at)
           VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM topics WHERE id = ?), CURRENT_TIMESTAMP))`,
          [top.id, top.subject_id, top.name, top.sync_version || serverVersion, top.id]
        );
      }

      // 3. Process Deleted Questions
      for (const delId of deletedQuestionIds) {
        run('DELETE FROM questions WHERE id = ?', [delId]);
      }

      // 4. Process Questions
      for (const q of questions) {
        run(
          `INSERT OR REPLACE INTO questions (
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
            wrong_explanations,
            sync_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            q.wrong_explanations,
            q.sync_version || serverVersion
          ]
        );
      }

      // 5. Process News
      for (const item of news) {
        run(
          `INSERT OR REPLACE INTO news (id, title, content, icon_name, thumbnail_url, published_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.title, item.content, item.icon_name, item.thumbnail_url || null, item.published_at || item.created_at, item.created_at]
        );
      }

      // 6. Update Passcode permissions
      if (passcodeInfo && actRow) {
        run(
          `UPDATE activation SET exam_category = ?, allowed_subjects = ?, expiry_date = ? WHERE passcode = ?`,
          [passcodeInfo.exam_category, passcodeInfo.allowed_subjects, passcodeInfo.expires_at, actRow.passcode]
        );
      }

      // 7. Update sync_state
      run(
        `INSERT OR REPLACE INTO sync_state (id, last_version, updated_at)
         VALUES (1, ?, CURRENT_TIMESTAMP)`,
        [serverVersion]
      );
    });

    logSyncEvent(
      'PULL_QUESTIONS',
      'SUCCESS',
      `Sync v${serverVersion} complete: ${questions.length} updated, ${deletedQuestionIds.length} deleted, ${subjects.length} subjects, ${topics.length} topics.`
    );

    return true;
  } catch (err) {
    logSyncEvent(
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
    logSyncEvent(
      'PUSH_RESULTS',
      'FAILED',
      'Sync offline: Simulation set to offline.'
    );
    return false;
  }

  try {
    const unsynced = all(
      'SELECT * FROM results WHERE synced = 0'
    );

    const pendingCount = unsynced.length;

    if (pendingCount === 0) {
      console.log('[Sync Service] No pending candidate result records.');
      return true;
    }

    logSyncEvent(
      'PUSH_RESULTS',
      'PENDING',
      `Syncing ${pendingCount} pending candidate result records...`
    );

    // Fetch local user email from activation.
    const actRow = get(
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
      'https://cbt.filloptech.com/api/v1/sync/push.php',
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
      logSyncEvent(
        'PUSH_RESULTS',
        'FAILED',
        `Server rejected result records: ${
          resultData.message || 'Unknown server error'
        }`
      );

      return false;
    }

    // Mark uploaded records as synchronized.
    transaction(() => {
      for (const res of unsynced) {
        run(
          'UPDATE results SET synced = 1 WHERE id = ?',
          [res.id]
        );
      }
    });

    logSyncEvent(
      'PUSH_RESULTS',
      'SUCCESS',
      `Successfully backed up ${pendingCount} test results to server.`
    );

    return true;
  } catch (err) {
    logSyncEvent(
      'PUSH_RESULTS',
      'FAILED',
      `Cloud sync service unreachable: ${err.message}`
    );

    return false;
  }
}

async function triggerSync() {
  if (isSyncing) {
    console.log('[Sync Service] Sync operation already in progress. Skipping duplicate request.');
    return false;
  }

  if (examActive) {
    console.log('[Sync Service] Sync requested while exam active. Skipping.');
    return false;
  }

  isSyncing = true;
  console.log('[Sync Service] Running sync cycle...');

  try {
    const resultsSuccess = await uploadResults();
    const questionsSuccess = await downloadQuestions();
    return resultsSuccess && questionsSuccess;
  } finally {
    isSyncing = false;
  }
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
    );
    triggerSync();
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

  const intervalMs = syncIntervalMinutes * 60 * 1000;
  console.log(`[Sync Service] Background sync scheduled every ${syncIntervalMinutes} minutes (${intervalMs}ms).`);

  syncTimer = setInterval(async () => {
    console.log('[Sync Service] Triggering periodic sync...');

    if (checkInternet() && !examActive) {
      try {
        await triggerSync();
      } catch (err) {
        console.error('[Sync Service] Periodic sync failed:', err);
      }
    }
  }, intervalMs);
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
  setExamActive,
  setSyncIntervalMinutes,
  logSyncEvent
};
