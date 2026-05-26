const stateModule = window.PlaygroundState;

if (!stateModule?.createPlaygroundState) {
  throw new Error("PlaygroundState helper is required before api-playground.js");
}

const { storageKeys, state, tabMeta } = stateModule.createPlaygroundState();

const elements = {
  baseUrl: document.getElementById("baseUrl"),
  accessToken: document.getElementById("accessToken"),
  refreshToken: document.getElementById("refreshToken"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  inspectorToggleBtn: document.getElementById("inspectorToggleBtn"),
  inspectorDrawer: document.getElementById("inspectorDrawer"),
  selectionBar: document.getElementById("selectionBar"),
  globalStatus: document.getElementById("globalStatus"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  requestStatus: document.getElementById("requestStatus"),
  currentUserSummary: document.getElementById("currentUserSummary"),
  selectedQuestionsSummary: document.getElementById("selectedQuestionsSummary"),
  latestResultSummary: document.getElementById("latestResultSummary"),
  requestPreview: document.getElementById("requestPreview"),
  headersPreview: document.getElementById("headersPreview"),
  responsePreview: document.getElementById("responsePreview"),
  historyList: document.getElementById("historyList"),
  activeTabLabel: document.getElementById("activeTabLabel"),
  activeTabSummary: document.getElementById("activeTabSummary"),
  dashboardCategoryCount: document.getElementById("dashboardCategoryCount"),
  dashboardQuestionCount: document.getElementById("dashboardQuestionCount"),
  dashboardQuizCount: document.getElementById("dashboardQuizCount"),
  dashboardSelectionCount: document.getElementById("dashboardSelectionCount"),
  dashboardState: document.getElementById("dashboardState"),
  questionCategoryFilter: document.getElementById("questionCategoryFilter"),
  createQuestionCategories: document.getElementById("createQuestionCategories"),
  aiCategoryIds: document.getElementById("aiCategoryIds"),
  questionList: document.getElementById("questionList"),
  questionDetail: document.getElementById("questionDetail"),
  quizList: document.getElementById("quizList"),
  quizRunner: document.getElementById("quizRunner"),
  adminResult: document.getElementById("adminResult"),
  createQuizSelectionSummary: document.getElementById("createQuizSelectionSummary"),
  aiQuizCategoryIds: document.getElementById("aiQuizCategoryIds"),
  practiceCategorySelect: document.getElementById("practiceCategorySelect"),
  createCategoryName: document.getElementById("createCategoryName"),
  createCategorySlug: document.getElementById("createCategorySlug"),
  createCategoryDescription: document.getElementById("createCategoryDescription"),
  createCategoryIcon: document.getElementById("createCategoryIcon"),
  createCategoryType: document.getElementById("createCategoryType"),
  editCategoryId: document.getElementById("editCategoryId"),
  editCategoryName: document.getElementById("editCategoryName"),
  editCategorySlug: document.getElementById("editCategorySlug"),
  editCategoryDescription: document.getElementById("editCategoryDescription"),
  editCategoryIcon: document.getElementById("editCategoryIcon"),
  editCategoryType: document.getElementById("editCategoryType"),
  updateCategoryBtn: document.getElementById("updateCategoryBtn"),
  deleteCategoryBtn: document.getElementById("deleteCategoryBtn"),
  playgroundModalOverlay: document.getElementById("playgroundModalOverlay"),
  playgroundModalTitle: document.getElementById("playgroundModalTitle"),
  playgroundModalCloseBtn: document.getElementById("playgroundModalCloseBtn"),
  playgroundModalBody: document.getElementById("playgroundModalBody"),
};

const core = window.PlaygroundCore;

if (!core) {
  throw new Error("PlaygroundCore helper is required before api-playground.js");
}

const {
  renderJson,
  safeParseJson,
  escapeHtml,
  formatInlineText,
  formatText,
  renderCodeSnippet,
  formatDifficultyBreakdown,
  summarizeUser,
  getSelectedOptionValues,
} = core;

const apiClientModule = window.PlaygroundApiClient;

if (!apiClientModule?.createPlaygroundApiClient) {
  throw new Error("PlaygroundApiClient helper is required before api-playground.js");
}

const shellModule = window.PlaygroundShell;

if (!shellModule?.createPlaygroundShell) {
  throw new Error("PlaygroundShell helper is required before api-playground.js");
}

const navigationModule = window.PlaygroundNavigation;

if (!navigationModule?.createPlaygroundNavigation) {
  throw new Error("PlaygroundNavigation helper is required before api-playground.js");
}

const actionsModule = window.PlaygroundActions;

if (!actionsModule?.createPlaygroundActions) {
  throw new Error("PlaygroundActions helper is required before api-playground.js");
}

const eventsModule = window.PlaygroundEvents;

if (!eventsModule?.createPlaygroundEvents) {
  throw new Error("PlaygroundEvents helper is required before api-playground.js");
}

const modalModule = window.PlaygroundModal;

if (!modalModule?.createPlaygroundModal) {
  throw new Error("PlaygroundModal helper is required before api-playground.js");
}

const { loadPersistedState, resolveInitialTheme, applyTheme, toggleTheme, toggleSidebar } =
  shellModule.createPlaygroundShell({
    storageKeys,
    elements,
  });

const { renderActiveTab, switchConsoleTab, switchTab, switchAdminSubTab, toggleInspector } =
  navigationModule.createPlaygroundNavigation({
    state,
    elements,
    tabMeta,
  });

const { openModal, closeModal } = modalModule.createPlaygroundModal({ elements });

function persistAuthState() {
  localStorage.setItem(storageKeys.baseUrl, elements.baseUrl?.value.trim() ?? "");
  const accessToken = elements.accessToken?.value.trim() ?? "";
  const refreshToken = elements.refreshToken?.value.trim() ?? "";
  if (accessToken) localStorage.setItem(storageKeys.accessToken, accessToken);
  if (refreshToken) localStorage.setItem(storageKeys.refreshToken, refreshToken);
}

function clearAuthState() {
  if (elements.accessToken) elements.accessToken.value = "";
  if (elements.refreshToken) elements.refreshToken.value = "";
  localStorage.removeItem(storageKeys.accessToken);
  localStorage.removeItem(storageKeys.refreshToken);
  state.currentUser = null;
  renderCurrentUser();
  renderDashboard();
  setGlobalStatus(window.PlaygroundI18n?.t("app.main.sessionCleared") ?? "Sessão local limpa.", false);
}

async function clearPlaygroundSessionCookie() {
  try {
    await fetch("/playground/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch (_error) {
    // Best-effort cleanup: local auth state is still cleared even if network fails.
  }
}

async function onSessionExpired() {
  localStorage.removeItem(storageKeys.accessToken);
  localStorage.removeItem(storageKeys.refreshToken);
  await clearPlaygroundSessionCookie();
  window.location.href = "/playground";
}

function normalizeBaseUrl() {
  const raw = elements.baseUrl?.value.trim() || localStorage.getItem(storageKeys.baseUrl) || "/v1";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }

  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  return window.location.origin + normalizedPath.replace(/\/$/, "");
}

function setGlobalStatus(message, isError) {
  elements.globalStatus.textContent = message;
  elements.globalStatus.className = isError ? "status error" : "status";
}

function setRequestStatus(message, level) {
  elements.requestStatus.textContent = message;
  elements.requestStatus.className =
    level === "error" ? "status error" : level === "success" ? "status success" : "status";
}

const viewsModule = window.PlaygroundViews;

if (!viewsModule?.createPlaygroundViews) {
  throw new Error("PlaygroundViews helper is required before api-playground.js");
}

const {
  populateCategorySelects,
  renderCurrentUser,
  renderSelectedQuestions,
  renderDashboard,
  renderLatestResult,
  renderHistory,
  renderQuestionList,
  renderQuestionDetail,
  renderQuizList,
  renderQuizRunner,
  renderPendingQuestions,
  renderPendingQuizzes,
  renderPendingQuizDetail,
  renderReviewResult,
  renderPracticeQuestions,
  renderPracticeResult,
  renderCategoryAdminList,
  renderCategoryAdminResult,
  renderQuizLeaderboard,
  renderLeaderboard,
  renderUploadResult,
  renderSignedUrlResult,
  renderUserProfile,
  renderUserHistory,
  renderAdminUserList,
} = viewsModule.createPlaygroundViews({
  state,
  elements,
  tabMeta,
  normalizeBaseUrl,
  formatInlineText,
  formatText,
  renderCodeSnippet,
  escapeHtml,
  formatDifficultyBreakdown,
  summarizeUser,
});

function addHistoryEntry(method, path, status, requestId) {
  state.history.unshift({ method, path, status, requestId: requestId || "sem-request-id" });
  state.history = state.history.slice(0, 12);
  renderHistory();
}

function updateLatestResult(title, body) {
  state.latestResult = { title, body };
  renderLatestResult();
}

const apiClient = apiClientModule.createPlaygroundApiClient({
  persistAuthState,
  normalizeBaseUrl,
  getAccessToken: () => elements.accessToken?.value.trim() ?? localStorage.getItem(storageKeys.accessToken) ?? "",
  setAccessToken: (value) => {
    if (elements.accessToken) elements.accessToken.value = value;
    localStorage.setItem(storageKeys.accessToken, value);
  },
  setRefreshToken: (value) => {
    if (elements.refreshToken) elements.refreshToken.value = value;
    localStorage.setItem(storageKeys.refreshToken, value);
  },
  renderJson,
  safeParseJson,
  setRequestStatus,
  addHistoryEntry,
  onUserResolved: (user) => {
    state.currentUser = user;
    renderCurrentUser();
  },
  onSessionExpired,
  requestPreview: elements.requestPreview,
  headersPreview: elements.headersPreview,
  responsePreview: elements.responsePreview,
});

async function callApi(path, options = {}) {
  return await apiClient.callApi(path, options);
}

const {
  loadCategories,
  loadQuestions,
  openQuestion,
  createQuestion,
  loadQuizzes,
  openQuiz,
  submitQuizAttempt,
  createQuiz,
  generateAiQuestions,
  generateAiQuiz,
  fetchMe,
  refreshSession,
  logoutUser,
  exitPlayground,
  loadHealth,
  bootstrapData,
  loadPendingQuestions,
  approveQuestion,
  rejectQuestion,
  loadPendingQuizzes,
  viewPendingQuizDetail,
  approveQuiz,
  rejectQuiz,
  loadPracticeQuestions,
  answerPracticeQuestion,
  createCategory,
  updateCategory,
  deleteCategory,
  openConfigModal,
  saveConfig,
  clearGeminiKey,
  openSessionModal,
  changePassword,
  updateProfile,
  loadAdminUsers,
  adminResetPassword,
  loadQuizLeaderboard,
  loadLeaderboard,
  uploadImage,
  getSignedUrl,
  lookupUserProfile,
  lookupUserHistory,
} = actionsModule.createPlaygroundActions({
  state,
  elements,
  storageKeys,
  callApi,
  getSelectedOptionValues,
  setGlobalStatus,
  updateLatestResult,
  renderQuestionDetail,
  renderQuestionList,
  renderSelectedQuestions,
  renderDashboard,
  renderQuizList,
  renderQuizRunner,
  renderCurrentUser,
  populateCategorySelects,
  clearAuthState,
  clearPlaygroundSessionCookie,
  renderJson,
  escapeHtml,
  renderPendingQuestions,
  renderPendingQuizzes,
  renderPendingQuizDetail,
  renderReviewResult,
  renderPracticeQuestions,
  renderPracticeResult,
  renderCategoryAdminList,
  renderCategoryAdminResult,
  renderQuizLeaderboard,
  renderLeaderboard,
  renderUploadResult,
  renderSignedUrlResult,
  renderUserProfile,
  renderUserHistory,
  renderAdminUserList,
  openModal,
  closeModal,
});

const { bindEvents } = eventsModule.createPlaygroundEvents({
  state,
  elements,
  switchTab,
  switchConsoleTab,
  switchAdminSubTab,
  toggleInspector,
  setGlobalStatus,
  toggleTheme,
  toggleSidebar,
  clearAuthState,
  loadHealth,
  fetchMe,
  bootstrapData,
  loadCategories,
  loadQuestions,
  createQuestion,
  renderQuestionList,
  renderSelectedQuestions,
  renderDashboard,
  loadQuizzes,
  renderQuizRunner,
  createQuiz,
  generateAiQuestions,
  generateAiQuiz,
  refreshSession,
  logoutUser,
  exitPlayground,
  openQuestion,
  openQuiz,
  submitQuizAttempt,
  loadPendingQuestions,
  approveQuestion,
  rejectQuestion,
  loadPendingQuizzes,
  viewPendingQuizDetail,
  approveQuiz,
  rejectQuiz,
  loadPracticeQuestions,
  answerPracticeQuestion,
  createCategory,
  updateCategory,
  deleteCategory,
  openConfigModal,
  saveConfig,
  clearGeminiKey,
  openSessionModal,
  changePassword,
  updateProfile,
  loadAdminUsers,
  adminResetPassword,
  loadQuizLeaderboard,
  loadLeaderboard,
  uploadImage,
  getSignedUrl,
  lookupUserProfile,
  lookupUserHistory,
  openModal,
  closeModal,
});

async function autoFetchTokens() {
  const hasTokens = localStorage.getItem(storageKeys.accessToken);
  if (hasTokens) return;

  try {
    const response = await fetch("/playground/session-tokens", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = await response.json();
    const tokens = payload?.data?.tokens;
    if (tokens?.accessToken) {
      if (elements.accessToken) elements.accessToken.value = tokens.accessToken;
      localStorage.setItem(storageKeys.accessToken, tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      if (elements.refreshToken) elements.refreshToken.value = tokens.refreshToken;
      localStorage.setItem(storageKeys.refreshToken, tokens.refreshToken);
    }
  } catch (_error) {
    // Non-fatal: user can authenticate manually if this fails.
  }
}

async function bootstrap() {
  applyTheme(resolveInitialTheme());
  loadPersistedState();

  if (elements.baseUrl && localStorage.getItem(storageKeys.baseUrl)) {
    elements.baseUrl.value = localStorage.getItem(storageKeys.baseUrl);
  }
  if (elements.accessToken && localStorage.getItem(storageKeys.accessToken)) {
    elements.accessToken.value = localStorage.getItem(storageKeys.accessToken);
  }
  if (elements.refreshToken && localStorage.getItem(storageKeys.refreshToken)) {
    elements.refreshToken.value = localStorage.getItem(storageKeys.refreshToken);
  }

  bindEvents();
  renderActiveTab();
  switchConsoleTab(state.activeConsoleTab);
  renderCurrentUser();
  renderSelectedQuestions();
  renderLatestResult();
  renderDashboard();
  renderQuizRunner();
  renderQuestionDetail(null);
  renderHistory();
  switchTab(state.activeTab);
  switchAdminSubTab(state.activeAdminSubTab);
  window.PlaygroundI18n?.applyTranslations(document);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      toggleInspector();
    }
  });

  await autoFetchTokens();
  await bootstrapData();
}

bootstrap();
