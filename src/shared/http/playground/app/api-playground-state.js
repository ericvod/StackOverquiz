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
        },
        questions: {
          label: "Perguntas",
          summary: "Listar, filtrar, detalhar e criar perguntas.",
        },
        quizzes: {
          label: "Quizzes",
          summary: "Criar quizzes, abrir runner e enviar tentativa.",
        },
        practice: {
          label: "Prática",
          summary: "Modo livre de responder perguntas sem quiz fixo.",
        },
        admin: {
          label: "Admin",
          summary: "Gerar com IA, revisar conteúdo pendente, gerenciar categorias e usuários.",
        },
      },
    };
  }

  global.PlaygroundState = {
    createPlaygroundState,
  };
})(window);
