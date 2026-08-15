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
    dbService.initDatabase(dbPath);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const actRow = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");

    updateSplashStatus("Verifying license signature...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const online = syncService.checkInternet();
    if (online) {
      updateSplashStatus("Online! Syncing updates from cloud...");
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
  const row = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");
  return row || null;
});

ipcMain.handle("auth:activate", async (event, { email, passcode }) => {
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

  let device_uuid = "";
  const uuidPath = path.join(app.getPath("userData"), "deviceId.uuid");
  if (fs.existsSync(uuidPath)) {
    device_uuid = fs.readFileSync(uuidPath, "utf-8").trim();
  } else {
    device_uuid = require("crypto").randomUUID();
    fs.writeFileSync(uuidPath, device_uuid, "utf-8");
  }

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
    const cached = dbService.get("SELECT * FROM activation WHERE email = ? AND passcode = ?", [email, passcode]);
    if (cached) {
      if (cached.expiry_date && new Date(cached.expiry_date).getTime() < Date.now()) {
        return { success: false, error: "Your local subscription passcode has expired." };
      }
      return {
        success: true,
        expiry_date: cached.expiry_date,
        user_name: cached.user_name,
        profile_picture: cached.profile_picture,
        exam_category: cached.exam_category,
        allowed_subjects: cached.allowed_subjects
      };
    }
    return { success: false, error: "Network offline. Activation requires an active internet connection on first login." };
  }

  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch("http://localhost:80/fillop/api/v1/activate.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passcode, device_uuid, hardware_hash })
    });
    const result = await response.json();

    if (result.success) {
      const nowIso = new Date().toISOString();
      dbService.run("DELETE FROM activation");
      dbService.run(`
        INSERT INTO activation (email, passcode, user_name, profile_picture, exam_category, allowed_subjects, activated_at, expiry_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        email,
        passcode,
        result.user_name || 'Student',
        result.profile_picture || null,
        result.exam_category || 'ALL',
        result.allowed_subjects || '',
        nowIso,
        result.expiry_date
      ]);

      await syncService.triggerSync();

      return {
        success: true,
        expiry_date: result.expiry_date,
        activated_at: nowIso,
        user_name: result.user_name,
        profile_picture: result.profile_picture,
        exam_category: result.exam_category,
        allowed_subjects: result.allowed_subjects
      };
    } else {
      return { success: false, error: result.message };
    }
  } catch (err) {
    return { success: false, error: `Cloud activation service unreachable: ${err.message}` };
  }
});

ipcMain.handle("auth:logout", async () => {
  dbService.run("DELETE FROM activation");
  return { success: true };
});

// ================= IPC HANDLERS: SYLLABUS & METADATA =================

ipcMain.handle("db:get-subjects", async (event, examType) => {
  try {
    const subjects = dbService.all("SELECT * FROM subjects WHERE exam_type = ?", [examType]);
    const actRow = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");

    return subjects.map(s => {
      let is_locked = false;

      if (!actRow) {
        // Free version: Only Mathematics and English are accessible
        const sNameLower = s.name.toLowerCase();
        if (sNameLower !== 'mathematics' && sNameLower !== 'english') {
          is_locked = true;
        }
      } else {
        // Passcode Activated Mode
        const userCat = (actRow.exam_category || 'ALL').toUpperCase();
        const allowedStr = actRow.allowed_subjects || '';

        // 1. Check category restriction
        if (userCat !== 'ALL' && userCat !== examType.toUpperCase()) {
          is_locked = true;
        }

        // 2. Check subject restriction if allowedStr specified
        if (!is_locked && allowedStr.trim() !== '') {
          const allowedList = allowedStr.split(',').map(item => item.trim().toLowerCase());
          const nameMatch = allowedList.includes(s.name.toLowerCase());
          const idMatch = allowedList.includes(String(s.id));

          if (!nameMatch && !idMatch) {
            is_locked = true;
          }
        }
      }

      return {
        ...s,
        is_locked
      };
    });
  } catch (error) {
    console.error("[IPC] get-subjects error:", error);
    throw error;
  }
});

ipcMain.handle("db:get-topics", async (event, subjectId) => {
  return dbService.all("SELECT * FROM topics WHERE subject_id = ?", [subjectId]);
});

ipcMain.handle("db:get-years", async (event, { examType, subjectId }) => {
  const rows = dbService.all("SELECT DISTINCT year FROM questions WHERE exam_type = ? AND subject_id = ? ORDER BY year DESC", [examType, subjectId]);
  return rows.map(r => r.year);
});

// ================= IPC HANDLERS: SELECTION ENGINE =================

ipcMain.handle("db:generate-practice-questions", async (event, { examType, subjectId, topicId, year, limit }) => {
  const actRow = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");
  const isFree = !actRow;

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

  // In Free Mode, max 10 questions per practice session
  let maxLimit = limit || 30;
  if (isFree) {
    maxLimit = Math.min(maxLimit, 10);
  }

  sql += " LIMIT ?";
  params.push(maxLimit);

  const questions = dbService.all(sql, params);
  return questions;
});

ipcMain.handle("db:generate-mock-questions", async (event, { examType, subjectIds, byYear }) => {
  const actRow = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");
  const isFree = !actRow;

  const allQuestions = [];
  let fallbackNote = "";

  for (const subjectId of subjectIds) {
    let needed = 50; // default for WAEC / NECO
    if (examType === 'JAMB') {
      const subRow = dbService.get("SELECT name FROM subjects WHERE id = ?", [subjectId]);
      if (subRow && subRow.name.toLowerCase() === 'english') {
        needed = 60;
      } else {
        needed = 40;
      }
    }

    if (isFree) {
      needed = Math.min(needed, 10);
    }

    let subjectQuestions = [];

    if (byYear) {
      subjectQuestions = dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? AND year = ? LIMIT ?", [examType, subjectId, byYear, needed]);

      if (subjectQuestions.length < needed) {
        const pullCount = needed - subjectQuestions.length;
        const padding = dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? AND year != ? ORDER BY RANDOM() LIMIT ?", [examType, subjectId, byYear, pullCount]);

        subjectQuestions = subjectQuestions.concat(padding);
        fallbackNote = `⚠️ Selected past paper (${byYear}) had incomplete data for some subjects and has been padded with questions from other years.`;
      }
    } else {
      const topics = dbService.all("SELECT id FROM topics WHERE subject_id = ?", [subjectId]);
      const topicCount = topics.length;

      if (topicCount === 0) {
        subjectQuestions = dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? ORDER BY RANDOM() LIMIT ?", [examType, subjectId, needed]);
      } else {
        const base = Math.floor(needed / topicCount);
        const remainder = needed % topicCount;

        const targets = {};
        for (let i = 0; i < topicCount; i++) {
          targets[topics[i].id] = base + (i < remainder ? 1 : 0);
        }

        const pool = {};
        let surplusPool = [];

        for (const topic of topics) {
          const tqs = dbService.all("SELECT * FROM questions WHERE exam_type = ? AND subject_id = ? AND topic_id = ? ORDER BY RANDOM()", [examType, subjectId, topic.id]);

          pool[topic.id] = tqs;
          const target = targets[topic.id];
          const drawn = tqs.slice(0, target);
          subjectQuestions = subjectQuestions.concat(drawn);

          if (tqs.length > target) {
            surplusPool = surplusPool.concat(tqs.slice(target));
          }
        }

        if (subjectQuestions.length < needed) {
          const gap = needed - subjectQuestions.length;
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
  dbService.exec(`
    CREATE TABLE IF NOT EXISTS answers_session (
      session_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT NOT NULL,
      PRIMARY KEY (session_id, question_id)
    )
  `);
  dbService.run("INSERT OR REPLACE INTO answers_session (session_id, question_id, selected_answer) VALUES (?, ?, ?)", [examSessionId, questionId, selectedAnswer]);
});

ipcMain.handle("db:get-saved-answers", async (event, examSessionId) => {
  dbService.exec(`
    CREATE TABLE IF NOT EXISTS answers_session (
      session_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT NOT NULL,
      PRIMARY KEY (session_id, question_id)
    )
  `);
  const rows = dbService.all("SELECT question_id, selected_answer FROM answers_session WHERE session_id = ?", [examSessionId]);
  const ansMap = {};
  for (const r of rows) {
    ansMap[r.question_id] = r.selected_answer;
  }
  return ansMap;
});

ipcMain.handle("db:submit-result", async (event, { examType, examSessionId, userName, score, totalQuestions, percentage, details }) => {
  const submittedAt = new Date().toISOString();

  const info = dbService.run(`
    INSERT INTO results (exam_type, user_name, score, total_questions, percentage, details, submitted_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `, [examType, userName, score, totalQuestions, percentage, details, submittedAt]);

  dbService.run("DELETE FROM answers_session WHERE session_id = ?", [examSessionId]);

  if (syncService.checkInternet()) {
    syncService.uploadResults().catch(err => console.error("Immediate result sync failed:", err));
  }

  const resultId = info.lastID;
  return dbService.get("SELECT * FROM results WHERE id = ?", [resultId]);
});

ipcMain.handle("db:get-results", async () => {
  return dbService.all("SELECT * FROM results ORDER BY submitted_at DESC");
});

ipcMain.handle("db:get-news", async () => {
  return dbService.all("SELECT * FROM news ORDER BY created_at DESC");
});

// ================= IPC HANDLERS: SYNC SIMULATION =================

ipcMain.handle("sync:get-status", async () => {
  const logs = dbService.all("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 15");
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
