(function initPlaygroundState(global) {
  function createPlaygroundState() {
    return {
      storageKeys: {
        accessToken: "stackoverquiz.playground.accessToken",
        refreshToken: "stackoverquiz.playground.refreshToken",
        baseUrl: "stackoverquiz.playground.baseUrl",
        theme: "stackoverquiz.playground.theme",
        sidebarCollapsed: "stackoverquiz.playground.sidebarCollapsed",
        geminiApiKey: "stackoverquiz.playground.geminiApiKey",
      },
      state: {
        categories: [],
        questions: [],
        quizzes: [],
        selectedQuestionIds: new Set(),
        currentUser: null,
        activeTab: "dashboard",
        activeAdminSubTab: "ai",
        activeConsoleTab: "history",
        activeQuiz: null,
        latestResult: null,
        history: [],
        practiceQuestions: [],
        practiceResult: null,
        pendingQuestions: [],
        pendingQuizzes: [],
        inspectorOpen: false,
      },
      tabMeta: {
        dashboard: {
          label: "Dashboard",
          summary: "Visão rápida de dados, saúde e atalhos.",
          labelKey: "app.nav.dashboard",
          summaryKey: "app.workspace.dashboardSummary",
        },
        questions: {
          label: "Perguntas",
          summary: "Listar, filtrar, detalhar e criar perguntas.",
          labelKey: "app.nav.questions",
          summaryKey: "app.nav.questionsSub",
        },
        quizzes: {
          label: "Quizzes",
          summary: "Criar quizzes, abrir runner e enviar tentativa.",
          labelKey: "app.nav.quizzes",
          summaryKey: "app.nav.quizzesSub",
        },
        practice: {
          label: "Prática",
          summary: "Modo livre de responder perguntas sem quiz fixo.",
          labelKey: "app.nav.practice",
          summaryKey: "app.nav.practiceSub",
        },
        admin: {
          label: "Admin",
          summary: "Gerar com IA, revisar conteúdo pendente, gerenciar categorias e usuários.",
          labelKey: "app.nav.admin",
          summaryKey: "app.nav.adminSub",
        },
      },
    };
  }

  global.PlaygroundState = {
    createPlaygroundState,
  };
})(window);
