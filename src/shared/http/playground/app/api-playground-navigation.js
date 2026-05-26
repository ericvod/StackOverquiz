(function initPlaygroundNavigation(global) {
  function createPlaygroundNavigation(deps) {
    const { state, elements, tabMeta } = deps;

    function renderActiveTab() {
      const activeMeta = tabMeta[state.activeTab] || tabMeta.dashboard;
      const tFn = (key, fallback) => window.PlaygroundI18n?.t(key) ?? fallback;
      elements.activeTabLabel.textContent = tFn(activeMeta.labelKey, activeMeta.label);
      elements.activeTabSummary.textContent = tFn(activeMeta.summaryKey, activeMeta.summary);
    }

    function switchConsoleTab(tabName) {
      state.activeConsoleTab = tabName;

      document.querySelectorAll("[data-console-tab]").forEach((button) => {
        const isActive = button.dataset.consoleTab === tabName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });

      document.querySelectorAll("[data-console-panel]").forEach((panel) => {
        const isActive = panel.dataset.consolePanel === tabName;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
      });
    }

    function switchTab(tabName) {
      state.activeTab = tabName;

      document.querySelectorAll("[data-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === tabName);
      });

      document.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panel === tabName);
      });

      renderActiveTab();
    }

    function switchAdminSubTab(subTabName) {
      state.activeAdminSubTab = subTabName;

      document.querySelectorAll("[data-admin-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.adminTab === subTabName);
      });

      document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.adminPanel !== subTabName;
        panel.classList.toggle("active", panel.dataset.adminPanel === subTabName);
      });
    }

    function toggleInspector() {
      state.inspectorOpen = !state.inspectorOpen;

      const drawer = elements.inspectorDrawer;
      if (drawer) drawer.hidden = !state.inspectorOpen;

      const layout = document.querySelector(".content-layout");
      if (layout) layout.classList.toggle("inspector-open", state.inspectorOpen);

      const btn = elements.inspectorToggleBtn;
      if (btn) btn.classList.toggle("active", state.inspectorOpen);
    }

    return {
      renderActiveTab,
      switchConsoleTab,
      switchTab,
      switchAdminSubTab,
      toggleInspector,
    };
  }

  global.PlaygroundNavigation = {
    createPlaygroundNavigation,
  };
})(window);
