const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Retrieve list of active exams
  getExams: () => ipcRenderer.invoke("db:get-exams"),

  // Retrieve list of questions for a specific exam
  getQuestions: (examId) => ipcRenderer.invoke("db:get-questions", examId),

  // Save an answer selection in real-time
  saveAnswer: (examId, questionId, selectedOption) =>
    ipcRenderer.invoke("db:save-answer", { examId, questionId, selectedOption }),

  // Get current saved answers for a specific exam
  getSavedAnswers: (examId) => ipcRenderer.invoke("db:get-saved-answers", examId),

  // Submit an exam: calculates score, stores result, and cleans up local answers
  submitExam: (examId, userName) =>
    ipcRenderer.invoke("db:submit-exam", { examId, userName }),

  // Retrieve historical exam results
  getResults: () => ipcRenderer.invoke("db:get-results"),

  // Get sync logs and online simulation status
  getSyncStatus: () => ipcRenderer.invoke("sync:get-status"),

  // Manually trigger synchronization
  startSync: () => ipcRenderer.invoke("sync:trigger"),

  // Enable/disable online state simulation
  setOnlineStatus: (isOnline) => ipcRenderer.invoke("sync:set-online", isOnline),

  // Register callbacks for real-time status updates from main process
  onSyncStatusChanged: (callback) => {
    // Clear existing and register
    ipcRenderer.removeAllListeners("sync-status-changed");
    ipcRenderer.on("sync-status-changed", () => callback());
  }
});
