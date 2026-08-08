const { getDb } = require('./dbService.cjs');

// Simulating network status. Defaulting to true (online) so first sync works.
// Can be toggled live via React UI for offline-first testing.
let simulateOnline = true;
let syncTimer = null;
let changeCallback = null;

/**
 * Log sync events to SQLite
 */
function logSyncEvent(eventType, status, message) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO sync_logs (event_type, status, message, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(eventType, status, message, new Date().toISOString());
    console.log(`[Sync Log] [${eventType}] [${status}] - ${message}`);

    // Notify React renderer if callback is registered
    if (changeCallback) {
      changeCallback();
    }
  } catch (err) {
    console.error('Failed to log sync event:', err);
  }
}

/**
 * Returns whether the app is currently simulated to be online
 */
function checkInternet() {
  return simulateOnline;
}

/**
 * Simulates downloading questions from an API server
 * Checks versions and saves/updates SQLite.
 */
async function downloadQuestions() {
  if (!checkInternet()) {
    logSyncEvent('PULL_QUESTIONS', 'FAILED', 'Cannot download questions: No internet connection (simulated offline).');
    return false;
  }

  logSyncEvent('PULL_QUESTIONS', 'PENDING', 'Connecting to question sync API...');

  // Simulate 1 second network latency
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const db = getDb();

    // In a real application, we would call an external API:
    // const response = await axios.get('https://api.fillop-cbt.com/questions');
    // For MVP, we simulate a robust server-side response:
    const mockServerQuestions = [
      // Suppose the server returned some updated English questions or additional questions
      { exam_id: 1, subject: 'English', text: 'Choose the correct synonym of Happy (Updated)', options: '["Sad","Joyful","Angry","Tired"]', correct_option: 'Joyful', version: 2 },
      { exam_id: 1, subject: 'Mathematics', text: '2 + 2 = ? (Server Verified)', options: '["3","4","5","6"]', correct_option: '4', version: 2 }
    ];

    // Read current questions version
    const existing = db.prepare('SELECT id, subject, text, version FROM questions WHERE exam_id = 1').all();

    let updatedCount = 0;
    const updateStmt = db.prepare(`
      UPDATE questions
      SET text = ?, options = ?, correct_option = ?, version = ?
      WHERE exam_id = ? AND subject = ? AND text LIKE ?
    `);

    db.transaction(() => {
      for (const sq of mockServerQuestions) {
        // Find if we have a match
        const localMatch = existing.find(l => l.subject === sq.subject && l.text.split(' ')[0] === sq.text.split(' ')[0]);
        if (localMatch && sq.version > localMatch.version) {
          // Perform upgrade
          updateStmt.run(sq.text, sq.options, sq.correct_option, sq.version, sq.exam_id, sq.subject, `${localMatch.text.split(' ')[0]}%`);
          updatedCount++;
        }
      }
    })();

    logSyncEvent('PULL_QUESTIONS', 'SUCCESS', `Questions sync complete. Merged ${updatedCount} updates.`);
    return true;
  } catch (err) {
    logSyncEvent('PULL_QUESTIONS', 'FAILED', `Failed to sync questions: ${err.message}`);
    return false;
  }
}

/**
 * Simulates uploading locally saved unsynced results to the cloud database
 */
async function uploadResults() {
  if (!checkInternet()) {
    logSyncEvent('PUSH_RESULTS', 'FAILED', 'Cannot upload results: No internet connection (simulated offline).');
    return false;
  }

  try {
    const db = getDb();
    const unsynced = db.prepare('SELECT * FROM results WHERE synced = 0').all();

    if (unsynced.length === 0) {
      return true;
    }

    logSyncEvent('PUSH_RESULTS', 'PENDING', `Uploading ${unsynced.length} unsynced results to cloud server...`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // For each unsynced result, simulate successful REST API request:
    // await axios.post('https://api.fillop-cbt.com/results', result);

    const updateStmt = db.prepare('UPDATE results SET synced = 1 WHERE id = ?');
    db.transaction(() => {
      for (const res of unsynced) {
        updateStmt.run(res.id);
      }
    })();

    logSyncEvent('PUSH_RESULTS', 'SUCCESS', `Successfully uploaded ${unsynced.length} exam results to cloud.`);
    return true;
  } catch (err) {
    logSyncEvent('PUSH_RESULTS', 'FAILED', `Failed to upload exam results: ${err.message}`);
    return false;
  }
}

/**
 * Orchestrates a complete synchronization cycle (upload results, download questions)
 */
async function triggerSync() {
  console.log('[Sync Service] Triggering sync cycle...');
  const resultsSuccess = await uploadResults();
  const questionsSuccess = await downloadQuestions();
  return resultsSuccess && questionsSuccess;
}

/**
 * Configure live callback for when logs/sync status updates, to push updates to React UI
 */
function registerStatusCallback(callback) {
  changeCallback = callback;
}

/**
 * Manages simulation of online state.
 * If toggled online, immediately triggers a sync execution
 */
function setOnlineStatus(isOnline) {
  const previous = simulateOnline;
  simulateOnline = isOnline;
  console.log(`[Sync Service] Simulated Online Status set to: ${isOnline}`);

  if (changeCallback) {
    changeCallback();
  }

  if (isOnline && !previous) {
    logSyncEvent('NETWORK_STATUS', 'SUCCESS', 'Network connection restored. Initiating immediate sync...');
    triggerSync();
  } else if (!isOnline && previous) {
    logSyncEvent('NETWORK_STATUS', 'FAILED', 'Network connection lost. App operates in offline-first mode.');
  }
}

/**
 * Starts the periodic background sync (runs every 60 seconds)
 */
function startBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  syncTimer = setInterval(() => {
    console.log('[Sync Service] Running periodic background sync...');
    if (checkInternet()) {
      triggerSync();
    } else {
      console.log('[Sync Service] Periodic sync skipped (simulated offline).');
    }
  }, 60000);
}

/**
 * Stops periodic sync
 */
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
