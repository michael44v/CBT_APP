const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const dbService = require("./services/dbService.cjs");
const syncService = require("./services/syncService.cjs");

let mainWindow = null;
let splashWindow = null;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

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

function updateSplashStatus(text) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("splash-status", text);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: "Fillop CBT Guru",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    //mainWindow.webContents.openDevTools();
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

async function initializeApp() {
  try {
    updateSplashStatus("Initializing local SQLite engine...");
    const dbPath = path.join(app.getPath("userData"), "fillop_cbt.db");
    console.log(`[Main] SQLite Database: ${dbPath}`);
    await dbService.initDatabase(dbPath);

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Read local activation status
    const actRow = await dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");

    updateSplashStatus("Verifying license signature...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const online = syncService.checkInternet();
    if (online) {
      updateSplashStatus("Online! Syncing updates from cloud...");
      // Perform automated background sync on startup if online
      await syncService.triggerSync();
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      updateSplashStatus("Offline-ready mode activated.");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    updateSplashStatus("Loading candidate terminal...");
    await new Promise((resolve) => setTimeout(resolve, 400));

    createMainWindow();

    syncService.startBackgroundSync();

    syncService.registerStatusCallback(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync-status-changed");
      }
    });

  } catch (err) {
    console.error("Initialization failure:", err);
    updateSplashStatus(`Error: ${err.message}`);
  }
}

// ================= IPC HANDLERS: LICENSE & AUTH =================

ipcMain.handle("auth:get-activation", async () => {
  const row = await dbService.get("SELECT * FROM activation LIMIT 1");
  return row || null;
});

ipcMain.handle("auth:activate", async (event, { email, passcode }) => {
  // Generate safe device fingerprint
  const systemInfo = {
    platform: process.platform,
    arch: process.arch,
    hostname: require("os").hostname(),
    username: require("os").userInfo().username
  };
  const hardware_hash = require("crypto")
    .createHash("sha256")
    .update(JSON.stringify(systemInfo))
    .digest("hex");

  // Read/Generate random UUID on first activation
  let device_uuid = "";
  const uuidPath = path.join(app.getPath("userData"), "deviceId.uuid");
  if (fs.existsSync(uuidPath)) {
    device_uuid = fs.readFileSync(uuidPath, "utf-8").trim();
  } else {
    device_uuid = require("crypto").randomUUID();
    fs.writeFileSync(uuidPath, device_uuid, "utf-8");
  }

  // Backup UUID on HKEY_CURRENT_USER\Software\FillopTech\deviceId for Windows
  if (process.platform === "win32") {
    try {
      const { execSync } = require("child_process");
      execSync(`reg add "HKCU\\Software\\FillopTech" /v deviceId /t REG_SZ /d "${device_uuid}" /f`);
    } catch (e) {
      console.warn("Registry binding ignored or failed on non-admin/alternative OS shell");
    }
  }

  const isOnline = syncService.checkInternet();
  if (!isOnline) {
    // If offline, check if this email/passcode is already registered inside SQLite activation cache
    const cached = await dbService.get("SELECT * FROM activation WHERE email = ? AND passcode = ?", [email, passcode]);
    if (cached) {
      if (cached.expiry_date && new Date(cached.expiry_date).getTime() < Date.now()) {
        return { success: false, error: "Your local subscription passcode has expired." };
      }
      return { success: true, expiry_date: cached.expiry_date };
    }
    return { success: false, error: "Network offline. Activation requires an active internet connection on first login." };
  }

  // Call PHP API on cloud server
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch("http://localhost:80/fillop/api/v1/activate.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passcode, device_uuid, hardware_hash })
    });
    const result = await response.json();

    if (result.success) {
      // Store in SQLite
      await dbService.run("DELETE FROM activation"); // Clear existing
      await dbService.run(`
        INSERT INTO activation (email, passcode, activated_at, expiry_date, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [email, passcode, new Date().toISOString(), result.expiry_date]);

      // Trigger sync pull
      await syncService.triggerSync();

      return { success: true, expiry_date: result.expiry_date };
    } else {
      return { success: false, error: result.message };
    }
  } catch (err) {
    return { success: false, error: `Cloud activation service unreachable: ${err.message}` };
  }
});

ipcMain.handle("auth:logout", async () => {
  await dbService.run("DELETE FROM activation");
  return { success: true };
});

// ================= IPC HANDLERS: SYLLABUS & METADATA =================

ipcMain.handle("db:get-subjects", async (event, examType) => {
  try {
    const subjects = await dbService.all("SELECT * FROM subjects WHERE exam_type = ?", [examType]);

    console.log("[IPC] get-subjects examType:", examType);
    console.log("[IPC] get-subjects result:", subjects);
    console.log("[IPC] isArray:", Array.isArray(subjects));

    return subjects;
  } catch (error) {
    console.error("[IPC] get-subjects error:", error);
    throw error;
  }
});

ipcMain.handle("db:get-topics", async (event, subjectId) => {
  return await dbService.all("SELECT * FROM topics WHERE subject_id = ?", [subjectId]);
});

ipcMain.handle("db:get-years", async (event, { examType, subjectId }) => {
  const rows = await dbService.all("SELECT DISTINCT year FROM questions WHERE exam_type = ? AND subject_id = ? ORDER BY year DESC", [examType, subjectId]);
  return rows.map(r => r.year);
});

// ================= IPC HANDLERS: SELECTION ENGINE =================

ipcMain.handle("db:generate-practice-questions", async (event, { examType, subjectId, topicId, year, limit }) => {
  let sql = "SELECT * FROM questions WHERE exam_type = ? AND subject_id = ?";
  const params = [examType, subjectId];

  if (topicId) {
    sql += " AND topic_id = ?";
    params.push(topicId);
  }
  if (year) {
    sql += " AND year = ?";
    params.push(year);
  }

  sql += " ORDER BY RANDOM()";
  if (limit) {
    sql += " LIMIT ?";
    params.push(limit);
  }

  const questions = await dbService.all(sql, params);
  return questions;
});

ipcMain.handle("db:generate-mock-questions", async (event, { examType, subjectIds, byYear }) => {
  const allQuestions = [];
  let fallbackNote = "";

  for (const subjectId of subjectIds) {
    // 1. Determine target count per subject
    let needed = 50; // default for WAEC/NECO
    if (examType === 'JAMB') {
      const subRow = await dbService.get("SELECT name FROM subjects WHERE id = ?", [subjectId]);
      if (subRow && subRow.name.toLowerCase() === 'english') {
        needed = 60;
      } else {
        needed = 40;
      }
    }

    let subjectQuestions = [];

    // 2. Selection Mode: Past paper by year OR Stratified Random
    if (byYear) {
      // Pull year-tagged questions for this subject
      subjectQuestions = await dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? AND year = ?", [examType, subjectId, byYear]);

      if (subjectQuestions.length < needed) {
        // Fallback/Padding Logic: Pad with questions from other years
        const pullCount = needed - subjectQuestions.length;
        const padding = await dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? AND year != ? ORDER BY RANDOM() LIMIT ?", [examType, subjectId, byYear, pullCount]);

        subjectQuestions = subjectQuestions.concat(padding);
        fallbackNote = `⚠️ Selected past paper (${byYear}) had incomplete data for some subjects and has been padded with questions from other years.`;
      }
    } else {
      // Stratified Random Topic Draw Algorithm
      const topics = await dbService.all("SELECT id FROM topics WHERE subject_id = ?", [subjectId]);
      const topicCount = topics.length;

      if (topicCount === 0) {
        // Fallback to purely random if no topics configured
        subjectQuestions = await dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? ORDER BY RANDOM() LIMIT ?", [examType, subjectId, needed]);
      } else {
        // Calculate base and remainder shares
        const base = Math.floor(needed / topicCount);
        const remainder = needed % topicCount;

        // Establish target count per topic
        const targets = {};
        for (let i = 0; i < topicCount; i++) {
          targets[topics[i].id] = base + (i < remainder ? 1 : 0);
        }

        const pool = {};
        let surplusPool = [];

        // First pass: Draw up to target from each topic
        for (const topic of topics) {
          const tqs = await dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? AND topic_id = ? ORDER BY RANDOM()", [examType, subjectId, topic.id]);

          pool[topic.id] = tqs;
          const target = targets[topic.id];
          const drawn = tqs.slice(0, target);
          subjectQuestions = subjectQuestions.concat(drawn);

          // Track surplus questions for second pass
          if (tqs.length > target) {
            surplusPool = surplusPool.concat(tqs.slice(target));
          }
        }

        // Second pass: Recompute and backfill shortfalls from the surplusPool
        if (subjectQuestions.length < needed) {
          const gap = needed - subjectQuestions.length;
          // Shuffling surplusPool randomly to preserve balance
          surplusPool.sort(() => Math.random() - 0.5);
          const padding = surplusPool.slice(0, gap);
          subjectQuestions = subjectQuestions.concat(padding);
        }
      }
    }

    allQuestions.push(...subjectQuestions);
  }

  return { questions: allQuestions, fallbackNote };
});

// ================= IPC HANDLERS: ANSWERS & RESULTS =================

ipcMain.handle("db:save-answer", async (event, { examSessionId, questionId, selectedAnswer }) => {
  // Clear existing answers for this session/question, then insert
  // We can write temporary files/answers or use standard cache.
  // For a unified approach, we save answers in a temporary local sqlite table if we want,
  // or we can just save it inside React state and let React commit on complete!
  // To satisfy real-time safety, let's write to a dedicated answers session store table
  await dbService.exec(`
    CREATE TABLE IF NOT EXISTS answers_session (
      session_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT NOT NULL,
      PRIMARY KEY (session_id, question_id)
    )
  `);
  await dbService.run("INSERT OR REPLACE INTO answers_session (session_id, question_id, selected_answer) VALUES (?, ?, ?)", [examSessionId, questionId, selectedAnswer]);
});

ipcMain.handle("db:get-saved-answers", async (event, examSessionId) => {
  await dbService.exec(`
    CREATE TABLE IF NOT EXISTS answers_session (
      session_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT NOT NULL,
      PRIMARY KEY (session_id, question_id)
    )
  `);
  const rows = await dbService.all("SELECT question_id, selected_answer FROM answers_session WHERE session_id = ?", [examSessionId]);
  const ansMap = {};
  for (const r of rows) {
    ansMap[r.question_id] = r.selected_answer;
  }
  return ansMap;
});

ipcMain.handle("db:submit-result", async (event, { examType, examSessionId, userName, score, totalQuestions, percentage, details }) => {
  const submittedAt = new Date().toISOString();

  // Save Result
  const info = await dbService.run(`
    INSERT INTO results (exam_type, user_name, score, total_questions, percentage, details, submitted_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `, [examType, userName, score, totalQuestions, percentage, details, submittedAt]);

  // Cleanup session answers
  await dbService.run("DELETE FROM answers_session WHERE session_id = ?", [examSessionId]);

  // If online, immediately upload result asynchronously
  if (syncService.checkInternet()) {
    syncService.uploadResults().catch(err => console.error("Immediate result sync failed:", err));
  }

  const resultId = info.lastID;
  return await dbService.get("SELECT * FROM results WHERE id = ?", [resultId]);
});

ipcMain.handle("db:get-results", async () => {
  return await dbService.all("SELECT * FROM results ORDER BY submitted_at DESC");
});

ipcMain.handle("db:get-news", async () => {
  return await dbService.all("SELECT * FROM news ORDER BY created_at DESC");
});

// ================= IPC HANDLERS: SYNC SIMULATION =================

ipcMain.handle("sync:get-status", async () => {
  const logs = await dbService.all("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 15");
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

// Bootstrap application
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
