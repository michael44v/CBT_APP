const { app, BrowserWindow, ipcMain, net, powerMonitor, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

let downloadedInstallerPath = null;

function downloadInstallerWithProgress(downloadUrl, version) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(downloadUrl);
      const httpModule = parsedUrl.protocol === "https:" ? https : http;
      const installerPath = path.join(app.getPath("userData"), "Fillop_CBT_Guru_Setup.exe");
      downloadedInstallerPath = installerPath;

      console.log(`[AutoUpdater] Direct Stream Download started for URL: ${downloadUrl}`);
      console.log(`[AutoUpdater] Saving installer to: ${installerPath}`);

      const request = httpModule.get(downloadUrl, { headers: { "User-Agent": "FillopCBTGuru-Updater" } }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`[AutoUpdater] Following download redirect to: ${redirectUrl}`);
          return downloadInstallerWithProgress(redirectUrl, version).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          const err = new Error(`Server returned HTTP ${response.statusCode}`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("update:status", { event: "error", message: err.message });
          }
          return reject(err);
        }

        const totalBytes = parseInt(response.headers["content-length"] || "104507754", 10);
        let transferredBytes = 0;
        let lastTransferred = 0;
        let lastTime = Date.now();

        const fileStream = fs.createWriteStream(installerPath);

        response.on("data", (chunk) => {
          transferredBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;

          if (timeDelta >= 0.15 || transferredBytes === totalBytes) {
            const bytesPerSecond = timeDelta > 0 ? Math.round((transferredBytes - lastTransferred) / timeDelta) : 0;
            const percent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0;

            lastTransferred = transferredBytes;
            lastTime = now;

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("update:status", {
                event: "download-progress",
                percent,
                bytesPerSecond,
                transferred: transferredBytes,
                total: totalBytes,
                version
              });
            }
          }
        });

        response.on("end", () => {
          fileStream.end(() => {
            console.log(`[AutoUpdater] Direct Stream Download completed! Transferred: ${transferredBytes} bytes.`);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("update:status", {
                event: "download-progress",
                percent: 100,
                bytesPerSecond: 0,
                transferred: totalBytes,
                total: totalBytes,
                version
              });

              mainWindow.webContents.send("update:status", {
                event: "update-downloaded",
                version,
                installerPath
              });
            }
            resolve({ success: true, installerPath });
          });
        });

        response.on("error", (err) => {
          fs.unlink(installerPath, () => {});
          console.error("[AutoUpdater] Direct Stream Download stream error:", err);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("update:status", { event: "error", message: err.message });
          }
          reject(err);
        });
      });

      request.on("error", (err) => {
        console.error("[AutoUpdater] Direct Stream Request error:", err);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("update:status", { event: "error", message: err.message });
        }
        reject(err);
      });

      request.end();
    } catch (err) {
      console.error("[AutoUpdater] Direct Stream Exception:", err);
      reject(err);
    }
  });
}
const { autoUpdater } = require("electron-updater");
const dbService = require("./services/dbService.cjs");
const syncService = require("./services/syncService.cjs");

let mainWindow = null;
let splashWindow = null;
let updateCheckTimer = null;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function checkForSoftwareUpdates() {
  if (!app.isPackaged) {
    console.log("[AutoUpdater] Software update check skipped: App not packaged.");
    return;
  }

  // Do not run update check if exam is currently active
  if (syncService.examActive) {
    console.log("[AutoUpdater] Software update check skipped: Exam session active.");
    return;
  }

  // Do not run update check if internet is offline
  if (!syncService.checkInternet()) {
    console.log("[AutoUpdater] Software update check skipped: Network offline.");
    return;
  }

  console.log("[AutoUpdater] Checking for software updates...");
  autoUpdater.checkForUpdates().catch((err) => {
    console.warn("[AutoUpdater] Software update check failed:", err);
  });
}

function startPeriodicUpdateChecks() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
  }
  console.log(`[AutoUpdater] Scheduling software update check every 30 minutes.`);
  updateCheckTimer = setInterval(() => {
    checkForSoftwareUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);
}

function stopPeriodicUpdateChecks() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

function setupAutoUpdater() {
  autoUpdater.on("checking-for-update", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:status", { event: "checking-for-update" });
    }
  });

  autoUpdater.on("update-available", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:status", {
        event: "update-available",
        version: info.version
      });
    }
  });

  autoUpdater.on("update-not-available", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:status", { event: "update-not-available" });
    }
  });

  autoUpdater.on("download-progress", (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:status", {
        event: "download-progress",
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0
      });
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:status", {
        event: "update-downloaded",
        version: info.version
      });
    }
  });

  autoUpdater.on("error", (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:status", {
        event: "error",
        message: err ? (err.message || String(err)) : "Unknown update error"
      });
    }
  });
}

setupAutoUpdater();

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
      nodeIntegration: false,
      devTools: isDev
    }
  });

  // Block DevTools & reload shortcuts in production (Ctrl+R / Cmd+R / F5 / Ctrl+Shift+I / F12)
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const isReloadCombo =
      (key === "r" && (input.control || input.meta)) ||
      key === "f5";
    const isDevToolsCombo =
      key === "f12" ||
      ((key === "i" || key === "j") && (input.control || input.meta) && input.shift);

    if (!isDev && (isReloadCombo || isDevToolsCombo)) {
      event.preventDefault();
    }
  });

  if (!isDev) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }


  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

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

function checkAndHandleFreshInstallation() {
  const currentVersion = app.getVersion();
  const versionFilePath = path.join(app.getPath("userData"), "installed_version.json");

  let installedVersion = null;
  if (fs.existsSync(versionFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(versionFilePath, "utf-8"));
      installedVersion = data.version;
    } catch (err) {
      console.warn("[Main] Error reading installed_version.json:", err);
    }
  }

  if (installedVersion !== currentVersion) {
    console.log(`[Main] New installation or app update detected. Previous: ${installedVersion}, Current: ${currentVersion}`);
    updateSplashStatus("Preparing database for new version...");

    dbService.transaction(() => {
      dbService.run("DELETE FROM questions");
      dbService.run("DELETE FROM topics");
      dbService.run("DELETE FROM subjects");
      dbService.run("DELETE FROM news");
      dbService.run("UPDATE sync_state SET last_version = 0 WHERE id = 1");
    });

    try {
      fs.writeFileSync(
        versionFilePath,
        JSON.stringify({ version: currentVersion, installedAt: new Date().toISOString() }),
        "utf-8"
      );
    } catch (err) {
      console.error("[Main] Failed to write installed_version.json:", err);
    }

    syncService.logSyncEvent(
      "FRESH_INSTALL",
      "SUCCESS",
      `New installation/update detected (v${currentVersion}). Cleared offline database content and force reset sync version to 0.`
    );
  }
}

async function initializeApp() {
  try {
    updateSplashStatus("Initializing local SQLite engine...");
    const dbPath = path.join(app.getPath("userData"), "fillop_cbt.db");
    console.log(`[Main] SQLite Database: ${dbPath}`);
    dbService.initDatabase(dbPath);

    await new Promise((resolve) => setTimeout(resolve, 600));

    checkAndHandleFreshInstallation();

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

    if (app.isPackaged) {
      checkForSoftwareUpdates();
    }
    startPeriodicUpdateChecks();

    syncService.startBackgroundSync();

    syncService.registerStatusCallback((eventReason) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (eventReason === 'PASSCODE_REVOKED') {
          mainWindow.webContents.send("auth:revoked");
        }
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch("https://cbt.filloptech.com/api/v1/activate.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passcode, device_uuid, hardware_hash }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
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

      dbService.run(`
        INSERT OR REPLACE INTO saved_logins (email, passcode, user_name, profile_picture, exam_category, allowed_subjects, activated_at, expiry_date, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        email,
        passcode,
        result.user_name || 'Student',
        result.profile_picture || null,
        result.exam_category || 'ALL',
        result.allowed_subjects || '',
        nowIso,
        result.expiry_date,
        nowIso
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

ipcMain.handle("auth:update-profile-picture", async (event, { profilePictureUrl }) => {
  const act = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");
  if (!act) {
    return { success: false, error: "No active session found." };
  }

  dbService.run("UPDATE activation SET profile_picture = ? WHERE email = ?", [profilePictureUrl, act.email]);
  dbService.run("UPDATE saved_logins SET profile_picture = ? WHERE email = ?", [profilePictureUrl, act.email]);

  // If online, sync to central server
  if (syncService.checkInternet()) {
    try {
      const response = await fetch("https://cbt.filloptech.com/api/v1/admin/users.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile_picture",
          email: act.email,
          profile_picture: profilePictureUrl
        })
      });
      const resData = await response.json();
      console.log("[Main] Profile picture synced to cloud:", resData);
    } catch (err) {
      console.warn("[Main] Cloud sync for profile picture failed:", err);
    }
  }

  return { success: true, profile_picture: profilePictureUrl };
});

ipcMain.handle("auth:get-saved-logins", async () => {
  return dbService.all("SELECT * FROM saved_logins ORDER BY last_used_at DESC");
});

ipcMain.handle("auth:switch-login", async (event, passcode) => {
  const saved = dbService.get("SELECT * FROM saved_logins WHERE passcode = ?", [passcode]);
  if (!saved) {
    return { success: false, error: "Saved account record not found." };
  }
  const nowIso = new Date().toISOString();
  dbService.run("DELETE FROM activation");
  dbService.run(`
    INSERT INTO activation (email, passcode, user_name, profile_picture, exam_category, allowed_subjects, activated_at, expiry_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    saved.email,
    saved.passcode,
    saved.user_name,
    saved.profile_picture,
    saved.exam_category,
    saved.allowed_subjects,
    saved.activated_at || nowIso,
    saved.expiry_date
  ]);
  dbService.run("UPDATE saved_logins SET last_used_at = ? WHERE passcode = ?", [nowIso, passcode]);
  return { success: true, account: saved };
});

ipcMain.handle("auth:delete-saved-login", async (event, passcode) => {
  dbService.run("DELETE FROM saved_logins WHERE passcode = ?", [passcode]);
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
        if (sNameLower !== 'mathematics' && sNameLower !== 'english language') {
          is_locked = true;
        }
      } else {
        // Passcode Activated Mode
        const userCatStr = actRow.exam_category || 'ALL';
        const allowedCats = userCatStr.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        const isCatAllowed = allowedCats.includes('ALL') || allowedCats.includes(examType.toUpperCase());

        if (!isCatAllowed) {
          is_locked = true;
        } else {
          const allowedStr = actRow.allowed_subjects || '';
          const allowedList = allowedStr.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);

          if (allowedList.length === 0) {
            // Default: Lock all subjects except Mathematics and English Language
            const sNameLower = s.name.toLowerCase();
            if (sNameLower !== 'mathematics' && sNameLower !== 'english language' && sNameLower !== 'english') {
              is_locked = true;
            }
          } else {
            const sNameLower = s.name.toLowerCase();
            const nameMatch = allowedList.includes(sNameLower) ||
                              (sNameLower.includes('english') && allowedList.some(item => item.includes('english')));
            const idMatch = allowedList.includes(String(s.id));

            if (!nameMatch && !idMatch) {
              is_locked = true;
            }
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

ipcMain.handle("exam:set-active", async (event, isActive) => {
  syncService.setExamActive(isActive);
  return { success: true, examActive: isActive };
});

ipcMain.handle("db:generate-practice-questions", async (event, { examType, subjectId, topicId, topicIds, year, limit }) => {
  const actRow = dbService.get("SELECT * FROM activation WHERE is_active = 1 LIMIT 1");
  const isFree = !actRow;

  let sql = "SELECT q.*, t.name as topic_name, t.description as topic_description, t.content as topic_content FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.exam_type = ? AND q.subject_id = ?";
  const params = [examType, subjectId];

  if (Array.isArray(topicIds) && topicIds.length > 0) {
    const placeholders = topicIds.map(() => "?").join(",");
    sql += ` AND q.topic_id IN (${placeholders})`;
    params.push(...topicIds);
  } else if (topicId) {
    sql += " AND q.topic_id = ?";
    params.push(topicId);
  }

  if (year) {
    sql += " AND q.year = ?";
    params.push(year);
  }

  sql += " ORDER BY RANDOM()";

  let maxLimit = limit || 30;
  if (isFree) {
    maxLimit = Math.min(maxLimit, 30);
  }

  sql += " LIMIT ?";
  params.push(maxLimit);

  let questions = dbService.all(sql, params);

  // Fallback: If topic or year filter was specific and returned 0 questions, query all questions under that subject
  const hasTopicFilter = (Array.isArray(topicIds) && topicIds.length > 0) || Boolean(topicId);
  if ((!questions || questions.length === 0) && (hasTopicFilter || year)) {
    console.log(`[Practice Session] 0 questions found for requested topic/year filters. Falling back to general subject questions.`);
    let fallbackSql = "SELECT q.*, t.name as topic_name, t.description as topic_description, t.content as topic_content FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.exam_type = ? AND q.subject_id = ? ORDER BY RANDOM() LIMIT ?";
    questions = dbService.all(fallbackSql, [examType, subjectId, maxLimit]);
  }

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
      needed = Math.min(needed, 30);
    }

    let subjectQuestions = [];

    if (byYear) {
      subjectQuestions = dbService.all("SELECT q.*, t.name as topic_name, t.description as topic_description, t.content as topic_content FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.exam_type = ? AND q.subject_id = ? AND q.year = ? LIMIT ?", [examType, subjectId, byYear, needed]);

      if (subjectQuestions.length < needed) {
        const pullCount = needed - subjectQuestions.length;
        const padding = dbService.all("SELECT q.*, t.name as topic_name, t.description as topic_description, t.content as topic_content FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.exam_type = ? AND q.subject_id = ? AND q.year != ? ORDER BY RANDOM() LIMIT ?", [examType, subjectId, byYear, pullCount]);

        subjectQuestions = subjectQuestions.concat(padding);
        fallbackNote = `⚠️ Selected past paper (${byYear}) had incomplete data for some subjects and has been padded with questions from other years.`;
      }
    } else {
      const topics = dbService.all("SELECT id FROM topics WHERE subject_id = ?", [subjectId]);
      const topicCount = topics.length;

      if (topicCount === 0) {
        subjectQuestions = dbService.all("SELECT q.*, t.name as topic_name, t.description as topic_description, t.content as topic_content FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.exam_type = ? AND q.subject_id = ? ORDER BY RANDOM() LIMIT ?", [examType, subjectId, needed]);
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
          const tqs = dbService.all("SELECT q.*, t.name as topic_name, t.description as topic_description, t.content as topic_content FROM questions q LEFT JOIN topics t ON q.topic_id = t.id WHERE q.exam_type = ? AND q.subject_id = ? AND q.topic_id = ? ORDER BY RANDOM()", [examType, subjectId, topic.id]);

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

  try {
    dbService.run("DELETE FROM answers_session WHERE session_id = ?", [examSessionId]);
  } catch (err) {
    console.warn("Could not delete answers_session:", err);
  }

  if (syncService.checkInternet()) {
    syncService.uploadResults().catch(err => console.error("Immediate result sync failed:", err));
  }

  const resultId = info.lastID;
  return dbService.get("SELECT * FROM results WHERE id = ?", [resultId]);
});

ipcMain.handle("db:get-results", async (event, userName) => {
  if (userName) {
    return dbService.all("SELECT * FROM results WHERE user_name = ? ORDER BY submitted_at DESC", [userName]);
  }
  return dbService.all("SELECT * FROM results ORDER BY submitted_at DESC");
});

ipcMain.handle("db:get-news", async () => {
  return dbService.all("SELECT * FROM news ORDER BY published_at DESC, created_at DESC");
});

ipcMain.handle("db:mark-news-read", async (event, { newsId, userName }) => {
  const user = userName || 'Candidate (Free)';
  const readAt = new Date().toISOString();
  dbService.run(
    "INSERT OR REPLACE INTO news_read (user_name, news_id, read_at) VALUES (?, ?, ?)",
    [user, newsId, readAt]
  );
  return { success: true };
});

ipcMain.handle("db:get-read-news-ids", async (event, userName) => {
  const user = userName || 'Candidate (Free)';
  const rows = dbService.all("SELECT news_id FROM news_read WHERE user_name = ?", [user]);
  return rows.map(r => r.news_id);
});

// ================= IPC HANDLERS: SYNC SIMULATION =================

ipcMain.handle("sync:get-status", async () => {
  const logs = dbService.all("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 15");
  const isSysOnline = net && typeof net.isOnline === 'function' ? net.isOnline() : true;
  return {
    isOnline: isSysOnline && syncService.checkInternet(),
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

// ================= IPC HANDLERS: UTILITY =================

ipcMain.handle("app:open-external", async (event, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    await shell.openExternal(url);
  }
});

// ================= IPC HANDLERS: AUTO UPDATER =================

ipcMain.handle("update:check", async () => {
  const currentVersion = app.getVersion();
  console.log(`[AutoUpdater] Check initiated. Current installed version: v${currentVersion}`);

  let ymlResult = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch("https://cbt.filloptech.com/downloads/latest.yml", { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res && res.ok) {
      const text = await res.text();
      console.log("[AutoUpdater] Fetched latest.yml from server:\n" + text);
      const verMatch = text.match(/^version:\s*(.+)$/m);
      const latestVersion = verMatch ? verMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

      const sizeMatch = text.match(/size:\s*(\d+)/);
      const bytes = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
      const pathMatch = text.match(/path:\s*(.+)$/m);
      const filePath = pathMatch ? pathMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
      const dateMatch = text.match(/releaseDate:\s*['"]?([^'"\n]+)['"]?/);
      const releaseDate = dateMatch ? dateMatch[1].trim() : "";

      if (latestVersion) {
        const hasUpdate = latestVersion !== currentVersion;
        console.log(`[AutoUpdater] Comparison result: Installed=v${currentVersion}, Latest=v${latestVersion}, HasUpdate=${hasUpdate}`);

        ymlResult = {
          hasUpdate,
          currentVersion,
          latestVersion,
          releaseDate,
          sizeMb: bytes > 0 ? Math.round(bytes / (1000 * 1000)) : 104,
          downloadUrl: filePath.startsWith("http") ? filePath : `https://cbt.filloptech.com/downloads/${filePath || ""}`
        };
      }
    }
  } catch (err) {
    console.warn("[AutoUpdater] Fetching latest.yml failed:", err.message);
  }

  if (app.isPackaged) {
    try {
      const updaterRes = await autoUpdater.checkForUpdates();
      if (updaterRes && updaterRes.updateInfo) {
        const updaterVersion = updaterRes.updateInfo.version;
        const hasUpdate = updaterVersion !== currentVersion;
        return {
          hasUpdate,
          currentVersion,
          latestVersion: updaterVersion,
          info: updaterRes.updateInfo,
          ymlResult
        };
      }
    } catch (err) {
      console.warn("[AutoUpdater] autoUpdater.checkForUpdates failed:", err.message);
    }
  }

  return {
    hasUpdate: ymlResult ? ymlResult.hasUpdate : false,
    currentVersion,
    latestVersion: ymlResult ? ymlResult.latestVersion : currentVersion,
    ymlResult
  };
});

ipcMain.handle("update:download", async (event, params) => {
  console.log("[AutoUpdater] User accepted update download. Params:", params);

  let targetUrl = "https://cbt.filloptech.com/downloads/cbt-app-1.0.3-ia32.exe";
  let version = "1.0.4";

  if (params && params.downloadUrl) {
    targetUrl = params.downloadUrl;
  }
  if (params && params.version) {
    version = params.version;
  }

  return downloadInstallerWithProgress(targetUrl, version);
});

ipcMain.handle("update:install", async () => {
  console.log("[AutoUpdater] Install requested. Executing installer...");
  if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
    console.log(`[AutoUpdater] Launching downloaded installer at: ${downloadedInstallerPath}`);
    shell.openPath(downloadedInstallerPath).catch((err) => {
      console.warn("[AutoUpdater] shell.openPath failed, attempting child_process execFile:", err);
      const { execFile } = require("child_process");
      execFile(downloadedInstallerPath, (execErr) => {
        if (execErr) console.error("[AutoUpdater] execFile failed:", execErr);
      });
    });
    setTimeout(() => {
      app.quit();
    }, 1000);
    return;
  }

  if (app.isPackaged) {
    autoUpdater.quitAndInstall();
  }
});

// Bootstrap application
app.whenReady().then(() => {
  createSplashWindow();
  initializeApp();

  powerMonitor.on("suspend", () => {
    console.log("[Main] System entering suspend/sleep state. Pausing background sync and update checks.");
    syncService.stopBackgroundSync();
    stopPeriodicUpdateChecks();
  });

  powerMonitor.on("resume", () => {
    console.log("[Main] System resumed from sleep state. Resuming background sync and update checks.");
    syncService.startBackgroundSync();
    startPeriodicUpdateChecks();
    if (syncService.checkInternet()) {
      syncService.triggerSync().catch(err => console.error("[Main] Post-resume sync error:", err));
      checkForSoftwareUpdates();
    }
  });
});

app.on("window-all-closed", () => {
  stopPeriodicUpdateChecks();
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
