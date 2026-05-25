(function initPlaygroundGatewayI18n(global) {
  const STORAGE_KEY = "stackoverquiz.playground.language";
  const SUPPORTED_LANGUAGES = ["pt-BR", "en"];

  const dictionaries = {
    "pt-BR": {
      "common.brandEyebrow": "StackOverquiz Console Interno",
      "common.languageLabel": "Idioma",
      "common.languagePt": "Portugues (BR)",
      "common.languageEn": "English",
      "common.viewApiDocs": "Ver documentacao da API",
      "common.openApiDocs": "Abrir documentacao da API",
      "login.pageTitle": "StackOverquiz Playground Admin",
      "login.heading": "Acesso administrativo ao playground",
      "login.intro":
        "Entre com uma conta admin para abrir o playground operacional. O backend valida a sessao e bloqueia acesso direto ao aplicativo sem autorizacao.",
      "login.emailLabel": "Email",
      "login.emailPlaceholder": "admin_local@example.com",
      "login.passwordLabel": "Senha",
      "login.passwordPlaceholder": "Digite sua senha",
      "login.submitIdle": "Entrar no playground admin",
      "login.submitBusy": "Autenticando...",
      "login.footerHint": "Voce precisa de papel admin para continuar.",
      "login.highlightsTitle": "Visibilidade operacional",
      "login.highlightHealth": "Monitoramento de health e metadados da API",
      "login.highlightAuth": "Fluxos de autenticacao, moderacao e report",
      "login.highlightContent": "Operacao de ciclo de vida de perguntas e quizzes",
      "login.highlightSession": "Gate admin real com sessao protegida",
      "login.feedbackEmailPasswordRequired": "Email e senha sao obrigatorios.",
      "login.feedbackAuthenticating": "Autenticando conta admin...",
      "login.feedbackInvalidAuthPayload": "Payload de autenticacao invalido retornado por /v1/auth/login",
      "login.feedbackNotAdmin": "Conta autenticada, mas sem papel admin.",
      "login.feedbackSessionReady": "Sessao admin pronta. Carregando workspace...",
      "login.feedbackUnableToSignIn": "Nao foi possivel entrar. Tente novamente.",
      "forbidden.pageTitle": "Playground - Acesso negado",
      "forbidden.heading": "Acesso negado",
      "forbidden.message1":
        "Sua conta foi autenticada, mas nao possui o papel admin necessario para acessar o playground operacional.",
      "forbidden.message2":
        "Solicite a um administrador do projeto a concessao do papel admin antes de tentar novamente.",
      "forbidden.backToLogin": "Voltar para login",
    },
    en: {
      "common.brandEyebrow": "StackOverquiz Internal Console",
      "common.languageLabel": "Language",
      "common.languagePt": "Portuguese (BR)",
      "common.languageEn": "English",
      "common.viewApiDocs": "View API docs",
      "common.openApiDocs": "Open API docs",
      "login.pageTitle": "StackOverquiz Playground Admin",
      "login.heading": "Playground admin access",
      "login.intro":
        "Sign in with an admin account to open the operational playground. The backend validates the session and blocks direct app access without authorization.",
      "login.emailLabel": "Email",
      "login.emailPlaceholder": "admin_local@example.com",
      "login.passwordLabel": "Password",
      "login.passwordPlaceholder": "Enter your password",
      "login.submitIdle": "Sign in to admin playground",
      "login.submitBusy": "Authenticating...",
      "login.footerHint": "You need admin role to continue.",
      "login.highlightsTitle": "Operational visibility",
      "login.highlightHealth": "Health monitoring and API metadata checks",
      "login.highlightAuth": "Authentication, moderation and report flows",
      "login.highlightContent": "Question and quiz lifecycle operations",
      "login.highlightSession": "Real admin gate with protected session",
      "login.feedbackEmailPasswordRequired": "Email and password are required.",
      "login.feedbackAuthenticating": "Authenticating admin account...",
      "login.feedbackInvalidAuthPayload": "Invalid auth payload returned by /v1/auth/login",
      "login.feedbackNotAdmin": "Account authenticated but no admin role was found.",
      "login.feedbackSessionReady": "Admin session ready. Loading workspace...",
      "login.feedbackUnableToSignIn": "Unable to sign in. Please try again.",
      "forbidden.pageTitle": "Playground - Access denied",
      "forbidden.heading": "Access denied",
      "forbidden.message1":
        "Your account was authenticated, but it does not have the admin role required to access the operational playground.",
      "forbidden.message2": "Ask a project administrator to grant admin role before retrying this flow.",
      "forbidden.backToLogin": "Back to login",
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

    targetRoot.querySelectorAll("[data-language-select]").forEach(function syncSelect(select) {
      select.value = activeLanguage;

      if (select.dataset.languageBound === "true") {
        return;
      }

      select.dataset.languageBound = "true";
      select.addEventListener("change", function onLanguageChange(event) {
        setLanguage(event.target.value);
      });
    });
  }

  global.PlaygroundGatewayI18n = {
    SUPPORTED_LANGUAGES,
    getLanguage,
    setLanguage,
    t,
    applyTranslations,
  };

  document.addEventListener("DOMContentLoaded", function onDomReady() {
    applyTranslations(document);
  });

  global.addEventListener("playground:language-change", function onLanguageChange() {
    applyTranslations(document);
  });
})(window);
