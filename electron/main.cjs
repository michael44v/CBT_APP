const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const dbService = require("./services/dbService.cjs");
const syncService = require("./services/syncService.cjs");

let mainWindow = null;
let splashWindow = null;

// Determine if running in development or production
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

/**
 * Creates the frameless splash screen window
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

/**
 * Updates status text on the splash screen
 */
function updateSplashStatus(text) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("splash-status", text);
  }
}

/**
 * Creates the main application window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show immediately
    title: "Fillop CBT Guru",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // Open devtools in development if needed
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Database & Sync Initialization process
 */
async function initializeApp() {
  try {
    updateSplashStatus("Initializing SQLite database...");
    const dbPath = path.join(app.getPath("userData"), "fillop_cbt.db");
    console.log(`[Main] Database path: ${dbPath}`);
    dbService.initDatabase(dbPath);

    // Short artificial delay to let user see status transitions beautifully
    await new Promise((resolve) => setTimeout(resolve, 800));

    updateSplashStatus("Checking internet connectivity...");
    await new Promise((resolve) => setTimeout(resolve, 600));

    const online = syncService.checkInternet();
    if (online) {
      updateSplashStatus("Online! Synchronizing CBT questions...");
      await syncService.downloadQuestions();
      updateSplashStatus("Synchronization complete.");
      await new Promise((resolve) => setTimeout(resolve, 600));
    } else {
      updateSplashStatus("Offline mode active. Loading local database...");
      syncService.logSyncEvent('STARTUP', 'SUCCESS', 'Application started offline. Local SQLite data ready.');
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    updateSplashStatus("Launching application...");
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Load main application
    createMainWindow();

    // Start background sync interval
    syncService.startBackgroundSync();

    // Listen to changes in sync logs and push status updates to React
    syncService.registerStatusCallback(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync-status-changed");
      }
    });

  } catch (err) {
    console.error("Failed to initialize CBT application:", err);
    updateSplashStatus(`Error: ${err.message}`);
  }
}

// IPC Handlers: DB API
ipcMain.handle("db:get-exams", async () => {
  const db = dbService.getDb();
  return db.prepare("SELECT * FROM exams WHERE is_active = 1").all();
});

ipcMain.handle("db:get-questions", async (event, examId) => {
  const db = dbService.getDb();
  const questions = db.prepare("SELECT * FROM questions WHERE exam_id = ?").all(examId);

  // Parse options field from JSON string to JS array
  return questions.map(q => ({
    ...q,
    options: JSON.parse(q.options)
  }));
});

ipcMain.handle("db:save-answer", async (event, { examId, questionId, selectedOption }) => {
  const db = dbService.getDb();
  const savedAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO answers (exam_id, question_id, selected_option, saved_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(examId, questionId, selectedOption, savedAt);
  return { success: true };
});

ipcMain.handle("db:get-saved-answers", async (event, examId) => {
  const db = dbService.getDb();
  const answers = db.prepare("SELECT question_id, selected_option FROM answers WHERE exam_id = ?").all(examId);

  // Transform to a simple key-value map for instant React lookup
  const answerMap = {};
  for (const row of answers) {
    answerMap[row.question_id] = row.selected_option;
  }
  return answerMap;
});

ipcMain.handle("db:submit-exam", async (event, { examId, userName }) => {
  const db = dbService.getDb();

  // 1. Get all questions
  const questions = db.prepare("SELECT id, correct_option FROM questions WHERE exam_id = ?").all(examId);
  const totalQuestions = questions.length;

  // 2. Get saved answers
  const answers = db.prepare("SELECT question_id, selected_option FROM answers WHERE exam_id = ?").all(examId);
  const answerMap = {};
  for (const ans of answers) {
    answerMap[ans.question_id] = ans.selected_option;
  }

  // 3. Compute score
  let score = 0;
  for (const q of questions) {
    const userAns = answerMap[q.id];
    if (userAns && userAns.trim() === q.correct_option.trim()) {
      score++;
    }
  }

  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const submittedAt = new Date().toISOString();

  // 4. Save result
  const insertResult = db.prepare(`
    INSERT INTO results (exam_id, user_name, score, total_questions, percentage, submitted_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);
  const info = insertResult.run(examId, userName, score, totalQuestions, percentage, submittedAt);
  const resultId = info.lastInsertRowid;

  // 5. Clean up answers
  db.prepare("DELETE FROM answers WHERE exam_id = ?").run(examId);

  // Return the saved result row
  const savedResult = db.prepare("SELECT * FROM results WHERE id = ?").get(resultId);

  // 6. Trigger immediate results push in the background (asynchronous) if online
  if (syncService.checkInternet()) {
    syncService.uploadResults().catch(err => console.error("Async results upload failed:", err));
  }

  return savedResult;
});

ipcMain.handle("db:get-results", async () => {
  const db = dbService.getDb();
  return db.prepare(`
    SELECT r.*, e.title as exam_title
    FROM results r
    JOIN exams e ON r.exam_id = e.id
    ORDER BY r.submitted_at DESC
  `).all();
});

// IPC Handlers: Sync API
ipcMain.handle("sync:get-status", async () => {
  const db = dbService.getDb();
  const logs = db.prepare("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 10").all();
  return {
    isOnline: syncService.checkInternet(),
    logs
  };
});

ipcMain.handle("sync:trigger", async () => {
  return await syncService.triggerSync();
});

ipcMain.handle("sync:set-online", async (event, isOnline) => {
  syncService.setOnlineStatus(isOnline);
  return { isOnline: syncService.checkInternet() };
});

// Bootstrap flow
app.whenReady().then(() => {
  createSplashWindow();
  initializeApp();
});

app.on("window-all-closed", () => {
  syncService.stopBackgroundSync();
  dbService.closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    initializeApp();
  }
});
