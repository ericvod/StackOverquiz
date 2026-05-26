(function initPlaygroundShell(global) {
  function t(key) {
    return global.PlaygroundI18n?.t(key) ?? key;
  }

  function createPlaygroundShell(deps) {
    const { storageKeys, elements } = deps;

    function loadPersistedState() {
      if (elements.baseUrl)
        elements.baseUrl.value = localStorage.getItem(storageKeys.baseUrl) || elements.baseUrl.value;
      if (elements.accessToken) elements.accessToken.value = localStorage.getItem(storageKeys.accessToken) || "";
      if (elements.refreshToken) elements.refreshToken.value = localStorage.getItem(storageKeys.refreshToken) || "";
      applySidebarState(localStorage.getItem(storageKeys.sidebarCollapsed) === "true");
    }

    function resolveInitialTheme() {
      const persistedTheme = localStorage.getItem(storageKeys.theme);
      if (persistedTheme === "light" || persistedTheme === "dark") {
        return persistedTheme;
      }

      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }

      return "light";
    }

    function applyTheme(theme) {
      document.body.dataset.theme = theme;
      localStorage.setItem(storageKeys.theme, theme);

      const isDark = theme === "dark";
      elements.themeToggleBtn.textContent = isDark ? t("app.header.themeDark") : t("app.header.themeLight");
      elements.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
      elements.themeToggleBtn.setAttribute(
        "aria-label",
        isDark ? t("app.header.themeToggleToLight") : t("app.header.themeToggleToDark"),
      );
    }

    function toggleTheme() {
      applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
    }

    function applySidebarState(isCollapsed) {
      document.body.classList.toggle("sidebar-collapsed", isCollapsed);
      localStorage.setItem(storageKeys.sidebarCollapsed, String(isCollapsed));

      if (!elements.sidebarToggleBtn) {
        return;
      }

      elements.sidebarToggleBtn.textContent = isCollapsed ? "›" : "‹";
      elements.sidebarToggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
      elements.sidebarToggleBtn.setAttribute(
        "aria-label",
        isCollapsed ? t("app.header.sidebarExpand") : t("app.header.sidebarCollapse"),
      );
    }

    function toggleSidebar() {
      applySidebarState(!document.body.classList.contains("sidebar-collapsed"));
    }

    return {
      loadPersistedState,
      resolveInitialTheme,
      applyTheme,
      toggleTheme,
      toggleSidebar,
    };
  }

  global.PlaygroundShell = {
    createPlaygroundShell,
  };
})(window);
