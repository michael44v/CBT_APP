const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Activation / Auth
  getActivationStatus: () => ipcRenderer.invoke("auth:get-activation"),
  activateApp: (email, passcode) => ipcRenderer.invoke("auth:activate", { email, passcode }),
  logoutApp: () => ipcRenderer.invoke("auth:logout"),
  getSavedLogins: () => ipcRenderer.invoke("auth:get-saved-logins"),
  switchSavedLogin: (passcode) => ipcRenderer.invoke("auth:switch-login", passcode),
  deleteSavedLogin: (passcode) => ipcRenderer.invoke("auth:delete-saved-login", passcode),

  // Subjects / Topics
  getSubjects: (examType) => ipcRenderer.invoke("db:get-subjects", examType),
  getTopics: (subjectId) => ipcRenderer.invoke("db:get-topics", subjectId),

  // Practice / Exam Selection & Logic
  getYearsForSubject: (examType, subjectId) =>
    ipcRenderer.invoke("db:get-years", { examType, subjectId }),

  generatePracticeQuestions: (params) =>
    ipcRenderer.invoke("db:generate-practice-questions", params),

  generateMockQuestions: (params) =>
    ipcRenderer.invoke("db:generate-mock-questions", params),

  // Scoring and Progress
  saveAnswer: (examType, examSessionId, questionId, selectedAnswer) =>
    ipcRenderer.invoke("db:save-answer", { examType, examSessionId, questionId, selectedAnswer }),

  getSavedAnswers: (examSessionId) =>
    ipcRenderer.invoke("db:get-saved-answers", examSessionId),

  submitExamResult: (params) =>
    ipcRenderer.invoke("db:submit-result", params),

  getResults: (userName) =>
    ipcRenderer.invoke("db:get-results", userName),

  getNews: () =>
    ipcRenderer.invoke("db:get-news"),

  markNewsAsRead: (newsId, userName) =>
    ipcRenderer.invoke("db:mark-news-read", { newsId, userName }),

  getReadNewsIds: (userName) =>
    ipcRenderer.invoke("db:get-read-news-ids", userName),

  // Sync API
  getSyncStatus: () => ipcRenderer.invoke("sync:get-status"),
  startSync: () => ipcRenderer.invoke("sync:trigger"),
  setOnlineStatus: (isOnline) => ipcRenderer.invoke("sync:set-online", isOnline),

  onSyncStatusChanged: (callback) => {
    ipcRenderer.removeAllListeners("sync-status-changed");
    ipcRenderer.on("sync-status-changed", () => callback());
  },
  onPasscodeRevoked: (callback) => {
    ipcRenderer.removeAllListeners("auth:revoked");
    ipcRenderer.on("auth:revoked", () => callback());
  },
  setExamActive: (isActive) => ipcRenderer.invoke("exam:set-active", isActive)
});
