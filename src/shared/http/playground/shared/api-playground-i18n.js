(function initPlaygroundI18n(global) {
  const STORAGE_KEY = "stackoverquiz.playground.language";
  const SUPPORTED_LANGUAGES = ["pt-BR", "en"];

  const dictionaries = {
    "pt-BR": {
      // ─── Common ─────────────────────────────────────────────────────────────
      "common.languageLabel": "Idioma",
      "common.languagePt": "Portugues (BR)",
      "common.languageEn": "English",
      "common.viewApiDocs": "Ver documentacao da API",
      "common.openApiDocs": "Abrir documentacao da API",
      "common.admin": "admin",
      "common.all": "Todas",
      "common.allFem": "Todas",
      "common.optional": "Opcional",
      "common.result": "Resultado",
      "common.loading": "Carregando...",
      "common.save": "Salvar",
      "common.cancel": "Cancelar",
      "common.delete": "Excluir",

      // ─── Login ───────────────────────────────────────────────────────────────
      "login.pageTitle": "StackOverquiz Playground Admin",
      "login.heading": "Acesso administrativo",
      "login.emailLabel": "Email",
      "login.emailPlaceholder": "admin_local@example.com",
      "login.passwordLabel": "Senha",
      "login.passwordPlaceholder": "Digite sua senha",
      "login.submitIdle": "Entrar no playground admin",
      "login.submitBusy": "Autenticando...",
      "login.footerDocsLink": "Ver documentacao da API",
      "login.feedbackEmailPasswordRequired": "Email e senha sao obrigatorios.",
      "login.feedbackAuthenticating": "Autenticando conta admin...",
      "login.feedbackInvalidAuthPayload": "Payload de autenticacao invalido retornado por /v1/auth/login",
      "login.feedbackNotAdmin": "Conta autenticada, mas sem papel admin.",
      "login.feedbackSessionReady": "Sessao admin pronta. Carregando workspace...",
      "login.feedbackUnableToSignIn": "Nao foi possivel entrar. Tente novamente.",

      // ─── Forbidden ───────────────────────────────────────────────────────────
      "forbidden.pageTitle": "Playground - Acesso negado",
      "forbidden.heading": "Acesso negado",
      "forbidden.message1":
        "Sua conta foi autenticada, mas nao possui o papel admin necessario para acessar o playground operacional.",
      "forbidden.message2":
        "Solicite a um administrador do projeto a concessao do papel admin antes de tentar novamente.",
      "forbidden.backToLogin": "Voltar para login",

      // ─── App Header ──────────────────────────────────────────────────────────
      "app.header.eyebrow": "Admin Workbench",
      "app.header.title": "API Playground",
      "app.header.statusReady": "Pronto.",
      "app.header.health": "Health",
      "app.header.me": "Me",
      "app.header.refresh": "Atualizar",
      "app.header.swagger": "Swagger ↗",
      "app.header.configAriaLabel": "Configuracoes",
      "app.header.inspectorAriaLabel": "Alternar inspector",
      "app.header.theme": "Tema",
      "app.header.exit": "Sair",
      "app.header.langPt": "PT",
      "app.header.langEn": "EN",
      "app.header.langAriaLabel": "Idioma",
      "app.header.themeLight": "Tema claro",
      "app.header.themeDark": "Tema escuro",
      "app.header.themeToggleToLight": "Alternar para tema claro",
      "app.header.themeToggleToDark": "Alternar para tema escuro",
      "app.header.sidebarExpand": "Expandir",
      "app.header.sidebarCollapse": "Recolher",

      // ─── Nav ─────────────────────────────────────────────────────────────────
      "app.nav.ariaLabel": "Navegacao principal",
      "app.nav.sidebarCollapseAriaLabel": "Recolher sidebar",
      "app.nav.dashboard": "Dashboard",
      "app.nav.dashboardSub": "Visao geral",
      "app.nav.questions": "Perguntas",
      "app.nav.questionsSub": "Filtro e criacao",
      "app.nav.quizzes": "Quizzes",
      "app.nav.quizzesSub": "Runner e tentativa",
      "app.nav.practice": "Pratica",
      "app.nav.practiceSub": "Modo livre",
      "app.nav.admin": "Admin",
      "app.nav.adminSub": "IA · Revisao · Categorias",

      // ─── Workspace ───────────────────────────────────────────────────────────
      "app.workspace.activeFlowEyebrow": "Fluxo ativo",
      "app.workspace.dashboardTitle": "Dashboard",
      "app.workspace.dashboardSummary": "Visao rapida de dados, saude e atalhos.",

      // ─── Session Chip ────────────────────────────────────────────────────────
      "app.session.notAuthenticated": "Nao autenticado",
      "app.session.detailsAriaLabel": "Detalhes da sessao",

      // ─── Dashboard ───────────────────────────────────────────────────────────
      "app.dashboard.statCategories": "Categorias",
      "app.dashboard.statQuestions": "Perguntas publicas",
      "app.dashboard.statQuizzes": "Quizzes publicos",
      "app.dashboard.statSelection": "Selecao para quiz",
      "app.dashboard.quickTest": "Teste rapido",
      "app.dashboard.btnCategories": "Categorias",
      "app.dashboard.btnQuestions": "Perguntas",
      "app.dashboard.btnQuizzes": "Quizzes",
      "app.dashboard.btnOpenRunner": "Abrir runner",
      "app.dashboard.currentState": "Estado atual",
      "app.dashboard.currentStateEmpty": "Nenhuma informacao carregada ainda.",
      "app.dashboard.leaderboardGlobal": "Leaderboard Global",
      "app.dashboard.btnLoadLeaderboard": "Carregar ranking",
      "app.dashboard.ranking": "Ranking",
      "app.dashboard.leaderboardEmpty": 'Clique em "Carregar ranking".',
      "app.dashboard.uploadImage": "Upload de imagem",
      "app.dashboard.uploadFileLabel": "Arquivo (JPEG · PNG · WebP · GIF — max 5 MB)",
      "app.dashboard.uploadFolder": "Folder",
      "app.dashboard.btnUpload": "Enviar imagem",
      "app.dashboard.uploadEmpty": "Nenhum upload realizado.",
      "app.dashboard.signedUrlLabel": "Buscar URL assinada por chave",
      "app.dashboard.signedUrlPlaceholder": "uuid/filename.jpg",
      "app.dashboard.btnGetSignedUrl": "Buscar URL",
      "app.dashboard.signedUrlEmpty": "Nenhuma chave consultada.",
      "app.dashboard.historyEmpty": "Nenhum historico encontrado.",
      "app.dashboard.userProfile": "Perfil de Usuario",
      "app.dashboard.userIdPlaceholder": "UUID do usuario",
      "app.dashboard.btnLoadProfile": "Carregar perfil",
      "app.dashboard.btnLoadHistory": "Historico",
      "app.dashboard.userProfileEmpty": "Nenhum perfil carregado.",
      "app.dashboard.stateNoSession": "sem sessao",
      "app.dashboard.stateNone": "nenhum",
      "app.dashboard.labelUser": "Usuario",
      "app.dashboard.labelActiveFlow": "Fluxo aberto",
      "app.dashboard.labelActiveQuiz": "Quiz aberto",
      "app.dashboard.labelBaseUrl": "Base URL",
      "app.dashboard.labelHistory": "Historico de requests",

      // ─── Questions ───────────────────────────────────────────────────────────
      "app.questions.explore": "Explorar perguntas",
      "app.questions.searchPlaceholder": "javascript, arrays, async...",
      "app.questions.difficultyAll": "Todas",
      "app.questions.categoryAll": "Todas",
      "app.questions.onlyMine": "Apenas as minhas (?author=me)",
      "app.questions.btnLoadCategories": "Categorias",
      "app.questions.btnList": "Listar perguntas",
      "app.questions.btnCreate": "Nova pergunta ↗",
      "app.questions.listTitle": "Perguntas publicas",
      "app.questions.listEmpty": "Nenhuma pergunta carregada ainda.",

      // ─── Quizzes ─────────────────────────────────────────────────────────────
      "app.quizzes.explore": "Explorar quizzes",
      "app.quizzes.searchPlaceholder": "Procure por titulo...",
      "app.quizzes.onlyMine": "Apenas os meus (?author=me)",
      "app.quizzes.btnList": "Listar quizzes",
      "app.quizzes.btnCreate": "Criar quiz ↗",
      "app.quizzes.listTitle": "Quizzes publicos",
      "app.quizzes.listEmpty": "Nenhum quiz carregado ainda.",

      // ─── Practice ────────────────────────────────────────────────────────────
      "app.practice.batchTitle": "Modo Livre (Lote Aleatorio)",
      "app.practice.difficultyAny": "Qualquer",
      "app.practice.categoryAll": "Todas",
      "app.practice.btnProcess": "Processar Lote Livre",
      "app.practice.resultTitle": "Resultado da Resposta",
      "app.practice.resultEmpty": "Resposta nao submetida ainda.",
      "app.practice.answerTitle": "Lote (Responder)",
      "app.practice.answerEmpty": "Nenhum lote processado ainda.",
      "app.practice.alreadyAnswered": "Aviso: Voce ja havia respondido esta pergunta anteriormente.",
      "app.practice.correct": "Correto",
      "app.practice.incorrect": "Incorreto",
      "app.practice.correctOptionLabel": "A opcao correta era a de indice:",
      "app.practice.explanationLabel": "Explicacao:",

      // ─── Admin ───────────────────────────────────────────────────────────────
      "app.admin.tabAi": "IA",
      "app.admin.tabReview": "Revisao",
      "app.admin.tabCategories": "Categorias",
      "app.admin.tabUsers": "Usuarios",

      "app.admin.ai.generateTitle": "Gerar com IA",
      "app.admin.ai.themeLabel": "Tema",
      "app.admin.ai.themePlaceholder": "React, SQL, TypeScript...",
      "app.admin.ai.btnGenerate": "Gerar questoes",
      "app.admin.ai.quizTitle": "Gerar Quiz Completo (IA)",
      "app.admin.ai.quizTitleLabel": "Titulo",
      "app.admin.ai.quizTitlePlaceholder": "Quiz de Inovacao...",
      "app.admin.ai.quizDescLabel": "Descricao",
      "app.admin.ai.quizDescPlaceholder": "Opcional",
      "app.admin.ai.quizThemePlaceholder": "Agile, DevOps...",
      "app.admin.ai.difficultyMix": "Difficulty Mix",
      "app.admin.ai.btnGenerateQuiz": "Gerar quiz draft",
      "app.admin.ai.resultTitle": "Resultado",
      "app.admin.ai.resultEmpty": "Nenhuma acao admin executada ainda.",

      "app.admin.review.pendingQuestionsTitle": "Perguntas Pendentes",
      "app.admin.review.btnLoadQuestions": "Carregar perguntas",
      "app.admin.review.pendingQuestionsEmpty": "Nenhuma pergunta pendente carregada.",
      "app.admin.review.pendingQuizzesTitle": "Quizzes Pendentes",
      "app.admin.review.btnLoadQuizzes": "Carregar quizzes",
      "app.admin.review.pendingQuizzesEmpty": "Nenhum quiz pendente carregado.",
      "app.admin.review.resultTitle": "Resultado da Revisao",
      "app.admin.review.resultEmpty": "Nenhuma acao de revisao executada.",

      "app.admin.categories.listTitle": "Lista de categorias",
      "app.admin.categories.btnLoad": "Carregar lista",
      "app.admin.categories.btnCreate": "Nova categoria ↗",
      "app.admin.categories.listEmpty": 'Clique em "Carregar lista" para ver as categorias existentes.',
      "app.admin.categories.resultEmpty": "Nenhuma acao de categorias executada ainda.",

      "app.admin.users.listTitle": "Listar usuarios",
      "app.admin.users.searchLabel": "Busca (username ou email)",
      "app.admin.users.searchPlaceholder": "ana, @example.com...",
      "app.admin.users.roleAll": "Todos",
      "app.admin.users.btnSearch": "Buscar usuarios",
      "app.admin.users.listEmpty": 'Clique em "Buscar usuarios" para listar.',
      "app.admin.users.resetTitle": "Reset de senha",
      "app.admin.users.resetHint":
        'Redefine a senha de qualquer conta. Todas as sessoes do alvo sao revogadas. Clique em "Usar UUID" na lista para preencher automaticamente.',
      "app.admin.users.userIdPlaceholder": "UUID do usuario alvo",
      "app.admin.users.newPasswordPlaceholder": "Vazio = gerar automaticamente",
      "app.admin.users.btnReset": "Resetar senha",
      "app.admin.users.resultEmpty": "Nenhuma acao de usuarios executada ainda.",

      // ─── Inspector ───────────────────────────────────────────────────────────
      "app.inspector.eyebrow": "Inspector",
      "app.inspector.title": "Resultado e rede",
      "app.inspector.lastResultTitle": "Ultimo resultado",
      "app.inspector.lastResultChip": "fluxo",
      "app.inspector.lastResultEmpty": "Nenhum fluxo executado ainda.",
      "app.inspector.networkPill": "Rede",
      "app.inspector.networkStatus": "Aguardando request.",
      "app.inspector.tabHistory": "Historico",
      "app.inspector.tabRequest": "Request",
      "app.inspector.tabHeaders": "Headers",
      "app.inspector.tabResponse": "Response",
      "app.inspector.historyEmpty": "Nenhuma request ainda.",
      "app.inspector.requestEmpty": "Nenhuma request enviada ainda.",
      "app.inspector.headersEmpty": "Nenhum header recebido ainda.",
      "app.inspector.responseEmpty": "Nenhuma response recebida ainda.",

      // ─── Selection Bar ───────────────────────────────────────────────────────
      "app.selection.summary": "{{count}} perguntas selecionadas",
      "app.selection.btnClear": "Limpar",
      "app.selection.btnCreateQuiz": "Criar quiz ↗",

      // ─── Modals ──────────────────────────────────────────────────────────────
      "app.modal.questionDetail.empty": 'Clique em "Abrir detalhe" em uma pergunta para inspecionar corpo e opcoes.',
      "app.modal.quizRunner.empty": "Abra um quiz da lista para responder aqui visualmente.",
      "app.modal.pendingQuizDetail.empty": "Selecione um quiz na lista para exibir o detalhe.",
      "app.modal.quizLeaderboard.loading": "Carregando leaderboard...",

      "app.modal.createQuestion.titleLabel": "Title",
      "app.modal.createQuestion.titlePlaceholder": "Qual e a saida deste codigo?",
      "app.modal.createQuestion.estimatedTimeLabel": "Tempo estimado (s)",
      "app.modal.createQuestion.bodyLabel": "Body",
      "app.modal.createQuestion.bodyPlaceholder": "Explique o enunciado da questao.",
      "app.modal.createQuestion.explanationLabel": "Explanation",
      "app.modal.createQuestion.explanationPlaceholder": "Explicacao da resposta correta.",
      "app.modal.createQuestion.categoryLabel": "Category IDs",
      "app.modal.createQuestion.correctOptionLabel": "Correct option",
      "app.modal.createQuestion.btnCreate": "Criar pergunta",

      "app.modal.createQuiz.titleLabel": "Title",
      "app.modal.createQuiz.titlePlaceholder": "Quiz de JavaScript assincrono",
      "app.modal.createQuiz.publicLabel": "Publico",
      "app.modal.createQuiz.timeLimitLabel": "Time limit (s)",
      "app.modal.createQuiz.timeLimitPlaceholder": "Sem limite",
      "app.modal.createQuiz.descLabel": "Description",
      "app.modal.createQuiz.descPlaceholder": "Descricao opcional do quiz.",
      "app.modal.createQuiz.selectionHint": "Selecione perguntas na aba Questions para montar o quiz.",
      "app.modal.createQuiz.btnCreate": "Criar quiz",

      "app.modal.createCategory.nameLabel": "Nome",
      "app.modal.createCategory.slugLabel": "Slug",
      "app.modal.createCategory.iconLabel": "Icone (emoji ou texto)",
      "app.modal.createCategory.descLabel": "Descricao",
      "app.modal.createCategory.descPlaceholder": "Descricao opcional da categoria.",
      "app.modal.createCategory.btnCreate": "Criar categoria",

      "app.modal.editCategory.nameLabel": "Nome",
      "app.modal.editCategory.slugLabel": "Slug",
      "app.modal.editCategory.iconLabel": "Icone",
      "app.modal.editCategory.descLabel": "Descricao",
      "app.modal.editCategory.btnSave": "Salvar edicao",
      "app.modal.editCategory.btnDelete": "Excluir categoria",

      "app.modal.config.baseUrlLabel": "Base URL da API",
      "app.modal.config.geminiKeyLabel": "Gemini API Key",
      "app.modal.config.geminiKeyPlaceholder": "Salva localmente neste navegador",
      "app.modal.config.btnSave": "Salvar",
      "app.modal.config.btnClearGemini": "Limpar chave Gemini",

      "app.modal.sessionDetails.loading": "Carregando...",
      "app.modal.sessionDetails.editProfileTitle": "Editar perfil",
      "app.modal.sessionDetails.usernameLabel": "Username",
      "app.modal.sessionDetails.avatarUrlLabel": "Avatar URL",
      "app.modal.sessionDetails.btnSaveProfile": "Salvar perfil",
      "app.modal.sessionDetails.changePasswordTitle": "Trocar senha",
      "app.modal.sessionDetails.currentPasswordLabel": "Senha atual",
      "app.modal.sessionDetails.newPasswordLabel": "Nova senha",
      "app.modal.sessionDetails.btnChangePassword": "Trocar senha",
      "app.modal.sessionDetails.tokensTitle": "Tokens",
      "app.modal.sessionDetails.btnShowTokens": "Mostrar",
      "app.modal.sessionDetails.accessTokenLabel": "Access Token",
      "app.modal.sessionDetails.accessTokenPlaceholder": "Preenchido automaticamente.",
      "app.modal.sessionDetails.refreshTokenLabel": "Refresh Token",
      "app.modal.sessionDetails.refreshTokenPlaceholder": "Preenchido automaticamente.",
      "app.modal.sessionDetails.btnRefresh": "Renovar sessao",
      "app.modal.sessionDetails.btnLogout": "Encerrar sessao",

      // ─── Dynamic Views ───────────────────────────────────────────────────────
      "app.views.selectForQuiz": "Selecionar para quiz",
      "app.views.openDetail": "Abrir detalhe",
      "app.views.noPreview": "Sem preview",
      "app.views.noDescription": "Sem descricao",
      "app.views.noCategories": "sem categorias",
      "app.views.unknown": "desconhecido",
      "app.views.openQuiz": "Abrir quiz",
      "app.views.backToList": "Voltar para lista",
      "app.views.submitAttempt": "Enviar tentativa",
      "app.views.option": "Opcao",
      "app.views.approve": "Aprovar",
      "app.views.reject": "Rejeitar",
      "app.views.rejectReasonPlaceholder": "Motivo rejeicao",
      "app.views.viewDetails": "Ver detalhes",
      "app.views.answer": "Responder",
      "app.views.edit": "Editar",
      "app.views.useUuid": "Usar UUID",
      "app.views.difficulty": "Difficulty",
      "app.views.estimatedTime": "Tempo estimado",
      "app.views.rating": "Rating",
      "app.views.creator": "Criador",
      "app.views.questionCount": "Questoes",
      "app.views.estimatedDuration": "Duracao estimada",
      "app.views.public": "Publico",
      "app.views.result": "Resultado",
      "app.views.id": "ID",
      "app.views.since": "desde",
      "app.views.latestAttempts": "Ultimas tentativas",
      "app.views.quizRemoved": "Quiz removido",
      "app.views.score": "Score",
      "app.views.accuracy": "Precisao",
      "app.views.xp": "XP",
      "app.views.level": "Nivel",
      "app.views.linkedQuestions": "Questoes vinculadas:",
      "app.views.approveLinkedQuestions": "Aprovar as {{count}} questoes vinculadas juntas com o quiz",
      "app.views.openSignedUrl": "Abrir URL assinada ↗",

      // ─── Main ────────────────────────────────────────────────────────────────
      "app.main.sessionCleared": "Sessao local limpa.",
    },

    en: {
      // ─── Common ─────────────────────────────────────────────────────────────
      "common.languageLabel": "Language",
      "common.languagePt": "Portuguese (BR)",
      "common.languageEn": "English",
      "common.viewApiDocs": "View API docs",
      "common.openApiDocs": "Open API docs",
      "common.admin": "admin",
      "common.all": "All",
      "common.allFem": "All",
      "common.optional": "Optional",
      "common.result": "Result",
      "common.loading": "Loading...",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.delete": "Delete",

      // ─── Login ───────────────────────────────────────────────────────────────
      "login.pageTitle": "StackOverquiz Playground Admin",
      "login.heading": "Admin access",
      "login.emailLabel": "Email",
      "login.emailPlaceholder": "admin_local@example.com",
      "login.passwordLabel": "Password",
      "login.passwordPlaceholder": "Enter your password",
      "login.submitIdle": "Sign in to admin playground",
      "login.submitBusy": "Authenticating...",
      "login.footerDocsLink": "View API docs",
      "login.feedbackEmailPasswordRequired": "Email and password are required.",
      "login.feedbackAuthenticating": "Authenticating admin account...",
      "login.feedbackInvalidAuthPayload": "Invalid auth payload returned by /v1/auth/login",
      "login.feedbackNotAdmin": "Account authenticated but no admin role was found.",
      "login.feedbackSessionReady": "Admin session ready. Loading workspace...",
      "login.feedbackUnableToSignIn": "Unable to sign in. Please try again.",

      // ─── Forbidden ───────────────────────────────────────────────────────────
      "forbidden.pageTitle": "Playground - Access denied",
      "forbidden.heading": "Access denied",
      "forbidden.message1":
        "Your account was authenticated, but it does not have the admin role required to access the operational playground.",
      "forbidden.message2": "Ask a project administrator to grant admin role before retrying this flow.",
      "forbidden.backToLogin": "Back to login",

      // ─── App Header ──────────────────────────────────────────────────────────
      "app.header.eyebrow": "Admin Workbench",
      "app.header.title": "API Playground",
      "app.header.statusReady": "Ready.",
      "app.header.health": "Health",
      "app.header.me": "Me",
      "app.header.refresh": "Refresh",
      "app.header.swagger": "Swagger ↗",
      "app.header.configAriaLabel": "Settings",
      "app.header.inspectorAriaLabel": "Toggle inspector",
      "app.header.theme": "Theme",
      "app.header.exit": "Sign out",
      "app.header.langPt": "PT",
      "app.header.langEn": "EN",
      "app.header.langAriaLabel": "Language",
      "app.header.themeLight": "Light theme",
      "app.header.themeDark": "Dark theme",
      "app.header.themeToggleToLight": "Switch to light theme",
      "app.header.themeToggleToDark": "Switch to dark theme",
      "app.header.sidebarExpand": "Expand",
      "app.header.sidebarCollapse": "Collapse",

      // ─── Nav ─────────────────────────────────────────────────────────────────
      "app.nav.ariaLabel": "Main navigation",
      "app.nav.sidebarCollapseAriaLabel": "Collapse sidebar",
      "app.nav.dashboard": "Dashboard",
      "app.nav.dashboardSub": "Overview",
      "app.nav.questions": "Questions",
      "app.nav.questionsSub": "Filter & create",
      "app.nav.quizzes": "Quizzes",
      "app.nav.quizzesSub": "Runner & attempt",
      "app.nav.practice": "Practice",
      "app.nav.practiceSub": "Free mode",
      "app.nav.admin": "Admin",
      "app.nav.adminSub": "AI · Review · Categories",

      // ─── Workspace ───────────────────────────────────────────────────────────
      "app.workspace.activeFlowEyebrow": "Active flow",
      "app.workspace.dashboardTitle": "Dashboard",
      "app.workspace.dashboardSummary": "Quick overview of data, health and shortcuts.",

      // ─── Session Chip ────────────────────────────────────────────────────────
      "app.session.notAuthenticated": "Not authenticated",
      "app.session.detailsAriaLabel": "Session details",

      // ─── Dashboard ───────────────────────────────────────────────────────────
      "app.dashboard.statCategories": "Categories",
      "app.dashboard.statQuestions": "Public questions",
      "app.dashboard.statQuizzes": "Public quizzes",
      "app.dashboard.statSelection": "Quiz selection",
      "app.dashboard.quickTest": "Quick test",
      "app.dashboard.btnCategories": "Categories",
      "app.dashboard.btnQuestions": "Questions",
      "app.dashboard.btnQuizzes": "Quizzes",
      "app.dashboard.btnOpenRunner": "Open runner",
      "app.dashboard.currentState": "Current state",
      "app.dashboard.currentStateEmpty": "No data loaded yet.",
      "app.dashboard.leaderboardGlobal": "Global Leaderboard",
      "app.dashboard.btnLoadLeaderboard": "Load ranking",
      "app.dashboard.ranking": "Ranking",
      "app.dashboard.leaderboardEmpty": 'Click "Load ranking".',
      "app.dashboard.uploadImage": "Image upload",
      "app.dashboard.uploadFileLabel": "File (JPEG · PNG · WebP · GIF — max 5 MB)",
      "app.dashboard.uploadFolder": "Folder",
      "app.dashboard.btnUpload": "Upload image",
      "app.dashboard.uploadEmpty": "No upload performed.",
      "app.dashboard.signedUrlLabel": "Fetch signed URL by key",
      "app.dashboard.signedUrlPlaceholder": "uuid/filename.jpg",
      "app.dashboard.btnGetSignedUrl": "Fetch URL",
      "app.dashboard.signedUrlEmpty": "No key queried.",
      "app.dashboard.historyEmpty": "No history found.",
      "app.dashboard.userProfile": "User Profile",
      "app.dashboard.userIdPlaceholder": "User UUID",
      "app.dashboard.btnLoadProfile": "Load profile",
      "app.dashboard.btnLoadHistory": "History",
      "app.dashboard.userProfileEmpty": "No profile loaded.",
      "app.dashboard.stateNoSession": "no session",
      "app.dashboard.stateNone": "none",
      "app.dashboard.labelUser": "User",
      "app.dashboard.labelActiveFlow": "Active flow",
      "app.dashboard.labelActiveQuiz": "Active quiz",
      "app.dashboard.labelBaseUrl": "Base URL",
      "app.dashboard.labelHistory": "Request history",

      // ─── Questions ───────────────────────────────────────────────────────────
      "app.questions.explore": "Explore questions",
      "app.questions.searchPlaceholder": "javascript, arrays, async...",
      "app.questions.difficultyAll": "All",
      "app.questions.categoryAll": "All",
      "app.questions.onlyMine": "Only mine (?author=me)",
      "app.questions.btnLoadCategories": "Categories",
      "app.questions.btnList": "List questions",
      "app.questions.btnCreate": "New question ↗",
      "app.questions.listTitle": "Public questions",
      "app.questions.listEmpty": "No questions loaded yet.",

      // ─── Quizzes ─────────────────────────────────────────────────────────────
      "app.quizzes.explore": "Explore quizzes",
      "app.quizzes.searchPlaceholder": "Search by title...",
      "app.quizzes.onlyMine": "Only mine (?author=me)",
      "app.quizzes.btnList": "List quizzes",
      "app.quizzes.btnCreate": "Create quiz ↗",
      "app.quizzes.listTitle": "Public quizzes",
      "app.quizzes.listEmpty": "No quizzes loaded yet.",

      // ─── Practice ────────────────────────────────────────────────────────────
      "app.practice.batchTitle": "Free Mode (Random Batch)",
      "app.practice.difficultyAny": "Any",
      "app.practice.categoryAll": "All",
      "app.practice.btnProcess": "Process Free Batch",
      "app.practice.resultTitle": "Answer Result",
      "app.practice.resultEmpty": "No answer submitted yet.",
      "app.practice.answerTitle": "Batch (Answer)",
      "app.practice.answerEmpty": "No batch processed yet.",
      "app.practice.alreadyAnswered": "Warning: You have already answered this question before.",
      "app.practice.correct": "Correct",
      "app.practice.incorrect": "Incorrect",
      "app.practice.correctOptionLabel": "The correct option was at index:",
      "app.practice.explanationLabel": "Explanation:",

      // ─── Admin ───────────────────────────────────────────────────────────────
      "app.admin.tabAi": "AI",
      "app.admin.tabReview": "Review",
      "app.admin.tabCategories": "Categories",
      "app.admin.tabUsers": "Users",

      "app.admin.ai.generateTitle": "Generate with AI",
      "app.admin.ai.themeLabel": "Theme",
      "app.admin.ai.themePlaceholder": "React, SQL, TypeScript...",
      "app.admin.ai.btnGenerate": "Generate questions",
      "app.admin.ai.quizTitle": "Generate Full Quiz (AI)",
      "app.admin.ai.quizTitleLabel": "Title",
      "app.admin.ai.quizTitlePlaceholder": "Innovation Quiz...",
      "app.admin.ai.quizDescLabel": "Description",
      "app.admin.ai.quizDescPlaceholder": "Optional",
      "app.admin.ai.quizThemePlaceholder": "Agile, DevOps...",
      "app.admin.ai.difficultyMix": "Difficulty Mix",
      "app.admin.ai.btnGenerateQuiz": "Generate quiz draft",
      "app.admin.ai.resultTitle": "Result",
      "app.admin.ai.resultEmpty": "No admin action executed yet.",

      "app.admin.review.pendingQuestionsTitle": "Pending Questions",
      "app.admin.review.btnLoadQuestions": "Load questions",
      "app.admin.review.pendingQuestionsEmpty": "No pending questions loaded.",
      "app.admin.review.pendingQuizzesTitle": "Pending Quizzes",
      "app.admin.review.btnLoadQuizzes": "Load quizzes",
      "app.admin.review.pendingQuizzesEmpty": "No pending quizzes loaded.",
      "app.admin.review.resultTitle": "Review Result",
      "app.admin.review.resultEmpty": "No review action executed.",

      "app.admin.categories.listTitle": "Category list",
      "app.admin.categories.btnLoad": "Load list",
      "app.admin.categories.btnCreate": "New category ↗",
      "app.admin.categories.listEmpty": 'Click "Load list" to see existing categories.',
      "app.admin.categories.resultEmpty": "No category action executed yet.",

      "app.admin.users.listTitle": "List users",
      "app.admin.users.searchLabel": "Search (username or email)",
      "app.admin.users.searchPlaceholder": "ana, @example.com...",
      "app.admin.users.roleAll": "All",
      "app.admin.users.btnSearch": "Search users",
      "app.admin.users.listEmpty": 'Click "Search users" to list.',
      "app.admin.users.resetTitle": "Password reset",
      "app.admin.users.resetHint":
        'Resets the password of any account. All active sessions for the target are revoked. Click "Use UUID" in the list to fill automatically.',
      "app.admin.users.userIdPlaceholder": "Target user UUID",
      "app.admin.users.newPasswordPlaceholder": "Empty = auto-generate",
      "app.admin.users.btnReset": "Reset password",
      "app.admin.users.resultEmpty": "No user action executed yet.",

      // ─── Inspector ───────────────────────────────────────────────────────────
      "app.inspector.eyebrow": "Inspector",
      "app.inspector.title": "Result & network",
      "app.inspector.lastResultTitle": "Latest result",
      "app.inspector.lastResultChip": "flow",
      "app.inspector.lastResultEmpty": "No flow executed yet.",
      "app.inspector.networkPill": "Network",
      "app.inspector.networkStatus": "Waiting for request.",
      "app.inspector.tabHistory": "History",
      "app.inspector.tabRequest": "Request",
      "app.inspector.tabHeaders": "Headers",
      "app.inspector.tabResponse": "Response",
      "app.inspector.historyEmpty": "No requests yet.",
      "app.inspector.requestEmpty": "No request sent yet.",
      "app.inspector.headersEmpty": "No headers received yet.",
      "app.inspector.responseEmpty": "No response received yet.",

      // ─── Selection Bar ───────────────────────────────────────────────────────
      "app.selection.summary": "{{count}} questions selected",
      "app.selection.btnClear": "Clear",
      "app.selection.btnCreateQuiz": "Create quiz ↗",

      // ─── Modals ──────────────────────────────────────────────────────────────
      "app.modal.questionDetail.empty": 'Click "Open detail" on a question to inspect body and options.',
      "app.modal.quizRunner.empty": "Open a quiz from the list to answer it visually here.",
      "app.modal.pendingQuizDetail.empty": "Select a quiz from the list to show its detail.",
      "app.modal.quizLeaderboard.loading": "Loading leaderboard...",

      "app.modal.createQuestion.titleLabel": "Title",
      "app.modal.createQuestion.titlePlaceholder": "What is the output of this code?",
      "app.modal.createQuestion.estimatedTimeLabel": "Estimated time (s)",
      "app.modal.createQuestion.bodyLabel": "Body",
      "app.modal.createQuestion.bodyPlaceholder": "Explain the question statement.",
      "app.modal.createQuestion.explanationLabel": "Explanation",
      "app.modal.createQuestion.explanationPlaceholder": "Explanation of the correct answer.",
      "app.modal.createQuestion.categoryLabel": "Category IDs",
      "app.modal.createQuestion.correctOptionLabel": "Correct option",
      "app.modal.createQuestion.btnCreate": "Create question",

      "app.modal.createQuiz.titleLabel": "Title",
      "app.modal.createQuiz.titlePlaceholder": "Async JavaScript Quiz",
      "app.modal.createQuiz.publicLabel": "Public",
      "app.modal.createQuiz.timeLimitLabel": "Time limit (s)",
      "app.modal.createQuiz.timeLimitPlaceholder": "No limit",
      "app.modal.createQuiz.descLabel": "Description",
      "app.modal.createQuiz.descPlaceholder": "Optional quiz description.",
      "app.modal.createQuiz.selectionHint": "Select questions in the Questions tab to build the quiz.",
      "app.modal.createQuiz.btnCreate": "Create quiz",

      "app.modal.createCategory.nameLabel": "Name",
      "app.modal.createCategory.slugLabel": "Slug",
      "app.modal.createCategory.iconLabel": "Icon (emoji or text)",
      "app.modal.createCategory.descLabel": "Description",
      "app.modal.createCategory.descPlaceholder": "Optional category description.",
      "app.modal.createCategory.btnCreate": "Create category",

      "app.modal.editCategory.nameLabel": "Name",
      "app.modal.editCategory.slugLabel": "Slug",
      "app.modal.editCategory.iconLabel": "Icon",
      "app.modal.editCategory.descLabel": "Description",
      "app.modal.editCategory.btnSave": "Save changes",
      "app.modal.editCategory.btnDelete": "Delete category",

      "app.modal.config.baseUrlLabel": "API Base URL",
      "app.modal.config.geminiKeyLabel": "Gemini API Key",
      "app.modal.config.geminiKeyPlaceholder": "Stored locally in this browser",
      "app.modal.config.btnSave": "Save",
      "app.modal.config.btnClearGemini": "Clear Gemini key",

      "app.modal.sessionDetails.loading": "Loading...",
      "app.modal.sessionDetails.editProfileTitle": "Edit profile",
      "app.modal.sessionDetails.usernameLabel": "Username",
      "app.modal.sessionDetails.avatarUrlLabel": "Avatar URL",
      "app.modal.sessionDetails.btnSaveProfile": "Save profile",
      "app.modal.sessionDetails.changePasswordTitle": "Change password",
      "app.modal.sessionDetails.currentPasswordLabel": "Current password",
      "app.modal.sessionDetails.newPasswordLabel": "New password",
      "app.modal.sessionDetails.btnChangePassword": "Change password",
      "app.modal.sessionDetails.tokensTitle": "Tokens",
      "app.modal.sessionDetails.btnShowTokens": "Show",
      "app.modal.sessionDetails.accessTokenLabel": "Access Token",
      "app.modal.sessionDetails.accessTokenPlaceholder": "Filled automatically.",
      "app.modal.sessionDetails.refreshTokenLabel": "Refresh Token",
      "app.modal.sessionDetails.refreshTokenPlaceholder": "Filled automatically.",
      "app.modal.sessionDetails.btnRefresh": "Renew session",
      "app.modal.sessionDetails.btnLogout": "Sign out",

      // ─── Dynamic Views ───────────────────────────────────────────────────────
      "app.views.selectForQuiz": "Select for quiz",
      "app.views.openDetail": "Open detail",
      "app.views.noPreview": "No preview",
      "app.views.noDescription": "No description",
      "app.views.noCategories": "no categories",
      "app.views.unknown": "unknown",
      "app.views.openQuiz": "Open quiz",
      "app.views.backToList": "Back to list",
      "app.views.submitAttempt": "Submit attempt",
      "app.views.option": "Option",
      "app.views.approve": "Approve",
      "app.views.reject": "Reject",
      "app.views.rejectReasonPlaceholder": "Rejection reason",
      "app.views.viewDetails": "View details",
      "app.views.answer": "Answer",
      "app.views.edit": "Edit",
      "app.views.useUuid": "Use UUID",
      "app.views.difficulty": "Difficulty",
      "app.views.estimatedTime": "Estimated time",
      "app.views.rating": "Rating",
      "app.views.creator": "Creator",
      "app.views.questionCount": "Questions",
      "app.views.estimatedDuration": "Est. duration",
      "app.views.public": "Public",
      "app.views.result": "Result",
      "app.views.id": "ID",
      "app.views.since": "since",
      "app.views.latestAttempts": "Latest attempts",
      "app.views.quizRemoved": "Quiz removed",
      "app.views.score": "Score",
      "app.views.accuracy": "Accuracy",
      "app.views.xp": "XP",
      "app.views.level": "Level",
      "app.views.linkedQuestions": "Linked questions:",
      "app.views.approveLinkedQuestions": "Approve the {{count}} linked questions together with the quiz",
      "app.views.openSignedUrl": "Open signed URL ↗",

      // ─── Main ────────────────────────────────────────────────────────────────
      "app.main.sessionCleared": "Local session cleared.",
    },
  };

  function normalizeLanguage(rawLanguage) {
    if (!rawLanguage || typeof rawLanguage !== "string") {
      return "pt-BR";
    }

    if (SUPPORTED_LANGUAGES.includes(rawLanguage)) {
      return rawLanguage;
    }

    if (rawLanguage.toLowerCase().startsWith("pt")) {
      return "pt-BR";
    }

    if (rawLanguage.toLowerCase().startsWith("en")) {
      return "en";
    }

    return "pt-BR";
  }

  function getStoredLanguage() {
    try {
      return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "pt-BR";
    }
  }

  function getLanguage() {
    return getStoredLanguage();
  }

  function setLanguage(language) {
    const normalized = normalizeLanguage(language);

    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // No-op when storage is unavailable.
    }

    global.dispatchEvent(new CustomEvent("playground:language-change", { detail: { language: normalized } }));
    return normalized;
  }

  function formatTemplate(message, vars) {
    if (!vars) {
      return message;
    }

    return message.replace(/\{\{(\w+)\}\}/g, function replaceVar(_full, varName) {
      return String(vars[varName] ?? "");
    });
  }

  function t(key, vars, language) {
    const activeLanguage = normalizeLanguage(language || getLanguage());
    const source = dictionaries[activeLanguage] || dictionaries["pt-BR"];
    const fallback = dictionaries.en;
    const template = source[key] || fallback[key] || key;
    return formatTemplate(template, vars);
  }

  function applyTranslations(root) {
    const targetRoot = root || document;
    const activeLanguage = getLanguage();

    if (targetRoot.documentElement) {
      targetRoot.documentElement.lang = activeLanguage;
    }

    targetRoot.querySelectorAll("[data-i18n]").forEach(function applyText(node) {
      const key = node.getAttribute("data-i18n");
      if (!key) {
        return;
      }

      node.textContent = t(key, undefined, activeLanguage);
    });

    targetRoot.querySelectorAll("[data-i18n-placeholder]").forEach(function applyPlaceholder(node) {
      const key = node.getAttribute("data-i18n-placeholder");
      if (!key) {
        return;
      }

      node.setAttribute("placeholder", t(key, undefined, activeLanguage));
    });

    targetRoot.querySelectorAll("[data-i18n-aria-label]").forEach(function applyAriaLabel(node) {
      const key = node.getAttribute("data-i18n-aria-label");
      if (!key) {
        return;
      }

      node.setAttribute("aria-label", t(key, undefined, activeLanguage));
    });

    targetRoot.querySelectorAll("[data-lang-toggle]").forEach(function syncLangToggle(container) {
      const activeLang = activeLanguage;

      container.querySelectorAll("[data-lang-value]").forEach(function syncBtn(btn) {
        const langValue = btn.getAttribute("data-lang-value");
        btn.classList.toggle("active", langValue === activeLang);

        if (!btn.dataset.langBound) {
          btn.dataset.langBound = "true";
          btn.addEventListener("click", function onLangClick() {
            setLanguage(langValue);
          });
        }
      });
    });
  }

  global.PlaygroundI18n = {
    SUPPORTED_LANGUAGES,
    getLanguage,
    setLanguage,
    t,
    applyTranslations,
  };

  // Backward-compat alias for gateway pages still referencing PlaygroundGatewayI18n.
  global.PlaygroundGatewayI18n = global.PlaygroundI18n;

  document.addEventListener("DOMContentLoaded", function onDomReady() {
    applyTranslations(document);
  });

  global.addEventListener("playground:language-change", function onLanguageChange() {
    applyTranslations(document);
  });
})(window);
