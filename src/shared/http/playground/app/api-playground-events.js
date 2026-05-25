(function initPlaygroundEvents(global) {
  function createPlaygroundEvents(deps) {
    const {
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
      refreshSession,
      logoutUser,
      exitPlayground,
      openQuestion,
      openQuiz,
      submitQuizAttempt,
      openConfigModal,
      saveConfig,
      clearGeminiKey,
      openSessionModal,
      changePassword,
      updateProfile,
      loadAdminUsers,
      adminResetPassword,
      loadLeaderboard,
      uploadImage,
      getSignedUrl,
      lookupUserProfile,
      lookupUserHistory,
    } = deps;

    function bindEvents() {
      document.querySelectorAll("[data-tab]").forEach((button) => {
        button.addEventListener("click", () => switchTab(button.dataset.tab));
      });

      document.querySelectorAll("[data-console-tab]").forEach((button) => {
        button.addEventListener("click", () => switchConsoleTab(button.dataset.consoleTab));
      });

      document.querySelectorAll("[data-admin-tab]").forEach((button) => {
        button.addEventListener("click", () => switchAdminSubTab(button.dataset.adminTab));
      });

      document.getElementById("exitPlaygroundBtn").addEventListener("click", exitPlayground);
      elements.themeToggleBtn.addEventListener("click", toggleTheme);
      elements.sidebarToggleBtn?.addEventListener("click", toggleSidebar);
      elements.inspectorToggleBtn?.addEventListener("click", toggleInspector);
      document.getElementById("healthBtn").addEventListener("click", loadHealth);
      document.getElementById("meBtn").addEventListener("click", fetchMe);
      document.getElementById("bootstrapBtn").addEventListener("click", bootstrapData);
      document.getElementById("configBtn")?.addEventListener("click", openConfigModal);
      document.getElementById("sessionDetailsBtn")?.addEventListener("click", openSessionModal);

      document.getElementById("dashboardLoadCategoriesBtn").addEventListener("click", async () => {
        switchTab("questions");
        await loadCategories();
      });
      document.getElementById("dashboardLoadQuestionsBtn").addEventListener("click", async () => {
        switchTab("questions");
        await loadQuestions();
      });
      document.getElementById("dashboardLoadQuizzesBtn").addEventListener("click", async () => {
        switchTab("quizzes");
        await loadQuizzes();
      });
      document.getElementById("dashboardOpenRunnerBtn").addEventListener("click", () => switchTab("quizzes"));

      document.getElementById("loadCategoriesBtn").addEventListener("click", loadCategories);
      document.getElementById("loadQuestionsBtn").addEventListener("click", loadQuestions);
      document.getElementById("openCreateQuestionModalBtn")?.addEventListener("click", () => {
        deps.openModal("createQuestionTemplate", "Nova Pergunta");
      });
      document.getElementById("createQuestionBtn").addEventListener("click", createQuestion);
      document.getElementById("clearSelectionBtn").addEventListener("click", () => {
        state.selectedQuestionIds.clear();
        renderQuestionList();
        renderSelectedQuestions();
        renderDashboard();
      });

      document.getElementById("loadQuizzesBtn").addEventListener("click", loadQuizzes);
      document.getElementById("openCreateQuizModalBtn")?.addEventListener("click", () => {
        deps.openModal("createQuizTemplate", "Criar Quiz");
      });
      document.getElementById("openCreateQuizModalBtn2")?.addEventListener("click", () => {
        deps.openModal("createQuizTemplate", "Criar Quiz");
      });
      document.getElementById("createQuizBtn").addEventListener("click", createQuiz);
      document.getElementById("generateAiBtn").addEventListener("click", generateAiQuestions);
      document.getElementById("generateAiQuizBtn")?.addEventListener("click", deps.generateAiQuiz);

      const loadPendingQuestionsBtn = document.getElementById("loadPendingQuestionsBtn");
      if (loadPendingQuestionsBtn) loadPendingQuestionsBtn.addEventListener("click", deps.loadPendingQuestions);

      const loadPendingQuizzesBtn = document.getElementById("loadPendingQuizzesBtn");
      if (loadPendingQuizzesBtn) loadPendingQuizzesBtn.addEventListener("click", deps.loadPendingQuizzes);

      const pendingQuestionsList = document.getElementById("pendingQuestionsList");
      if (pendingQuestionsList) {
        pendingQuestionsList.addEventListener("click", async (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          if (target.dataset.approveQuestion) {
            await deps.approveQuestion(target.dataset.approveQuestion);
          } else if (target.dataset.rejectQuestion) {
            const reasonEl = document.getElementById(`reject-reason-${target.dataset.rejectQuestion}`);
            await deps.rejectQuestion(
              target.dataset.rejectQuestion,
              reasonEl?.value || "Rejeitado via admin playground",
            );
          }
        });
      }

      const pendingQuizzesList = document.getElementById("pendingQuizzesList");
      if (pendingQuizzesList) {
        pendingQuizzesList.addEventListener("click", async (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          if (target.dataset.viewPendingQuiz) {
            await deps.viewPendingQuizDetail(target.dataset.viewPendingQuiz);
          } else if (target.dataset.approveQuiz) {
            const id = target.dataset.approveQuiz;
            const approveChecked = document.getElementById(`approve-quiz-questions-${id}`)?.checked ?? true;
            await deps.approveQuiz(id, approveChecked);
          } else if (target.dataset.rejectQuiz) {
            const id = target.dataset.rejectQuiz;
            const reasonEl = document.getElementById(`reject-quiz-reason-${id}`);
            await deps.rejectQuiz(id, reasonEl?.value || "Rejeitado via admin playground");
          }
        });
      }

      const loadPracticeBtn = document.getElementById("loadPracticeQuestionsBtn");
      if (loadPracticeBtn) loadPracticeBtn.addEventListener("click", deps.loadPracticeQuestions);

      const practiceQuestionsList = document.getElementById("practiceQuestionsList");
      if (practiceQuestionsList) {
        practiceQuestionsList.addEventListener("click", async (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          if (target.dataset.answerPractice) {
            const id = target.dataset.answerPractice;
            const inputEl = document.querySelector(`input[name="practice-question-${id}"]:checked`);
            if (!inputEl) {
              setGlobalStatus("Selecione uma opção antes de responder.", true);
              return;
            }
            await deps.answerPracticeQuestion(id, Number(inputEl.value));
          }
        });
      }

      elements.questionList.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const openQuestionId = target.dataset.openQuestion;
        if (openQuestionId) {
          await openQuestion(openQuestionId);
        }
      });

      elements.questionList.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        const toggleId = target.dataset.questionToggle;
        if (!toggleId) return;

        if (target.checked) {
          state.selectedQuestionIds.add(toggleId);
        } else {
          state.selectedQuestionIds.delete(toggleId);
        }

        renderSelectedQuestions();
        renderDashboard();
      });

      elements.quizList.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.openQuiz) {
          await openQuiz(target.dataset.openQuiz);
        } else if (target.dataset.quizLeaderboard) {
          await deps.loadQuizLeaderboard(target.dataset.quizLeaderboard);
        }
      });

      elements.quizRunner.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        const questionId = target.dataset.runnerQuestion;
        if (!questionId || !state.activeQuiz) return;

        state.activeQuiz.answers[questionId] = Number(target.value);
      });

      elements.quizRunner.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.id === "closeActiveQuizBtn") {
          state.activeQuiz = null;
          renderQuizRunner();
          renderDashboard();
          deps.closeModal?.();
          return;
        }

        if (target.id === "submitQuizAttemptBtn") {
          await submitQuizAttempt();
        }
      });

      document.getElementById("loadAdminCategoriesBtn")?.addEventListener("click", loadCategories);
      document.getElementById("openCreateCategoryModalBtn")?.addEventListener("click", () => {
        deps.openModal("createCategoryTemplate", "Nova Categoria");
      });
      document.getElementById("adminCreateCategoryBtn")?.addEventListener("click", deps.createCategory);
      document.getElementById("updateCategoryBtn")?.addEventListener("click", deps.updateCategory);
      document.getElementById("deleteCategoryBtn")?.addEventListener("click", deps.deleteCategory);

      const categoryAdminList = document.getElementById("categoryAdminList");
      if (categoryAdminList) {
        categoryAdminList.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          const catId = target.dataset.editCategory;
          if (!catId) return;

          const editId = document.getElementById("editCategoryId");
          const editName = document.getElementById("editCategoryName");
          const editSlug = document.getElementById("editCategorySlug");
          const editType = document.getElementById("editCategoryType");
          const editDesc = document.getElementById("editCategoryDescription");
          const editIcon = document.getElementById("editCategoryIcon");

          if (editId) editId.value = catId;
          if (editName) editName.value = target.dataset.catName || "";
          if (editSlug) editSlug.value = target.dataset.catSlug || "";
          if (editType) editType.value = target.dataset.catType || "language";
          if (editDesc) editDesc.value = target.dataset.catDesc || "";
          if (editIcon) editIcon.value = target.dataset.catIcon || "";

          deps.openModal("editCategoryTemplate", "Editar Categoria");
        });
      }

      document.getElementById("changePasswordBtn")?.addEventListener("click", changePassword);
      document.getElementById("updateProfileBtn")?.addEventListener("click", updateProfile);
      document.getElementById("loadAdminUsersBtn")?.addEventListener("click", loadAdminUsers);

      document.getElementById("adminUserList")?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const userId = target.dataset.useUserId;
        if (userId) {
          const field = document.getElementById("adminResetUserId");
          if (field) field.value = userId;
        }
      });

      document.getElementById("adminResetPasswordBtn")?.addEventListener("click", adminResetPassword);
      document.getElementById("loadLeaderboardBtn")?.addEventListener("click", loadLeaderboard);
      document.getElementById("uploadImageBtn")?.addEventListener("click", uploadImage);
      document.getElementById("getSignedUrlBtn")?.addEventListener("click", getSignedUrl);
      document.getElementById("lookupUserProfileBtn")?.addEventListener("click", lookupUserProfile);
      document.getElementById("lookupUserHistoryBtn")?.addEventListener("click", lookupUserHistory);

      document.getElementById("saveConfigBtn")?.addEventListener("click", saveConfig);
      document.getElementById("clearGeminiKeyBtn")?.addEventListener("click", clearGeminiKey);

      document.getElementById("refreshSessionBtn")?.addEventListener("click", refreshSession);
      document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        await logoutUser();
        deps.closeModal?.();
        clearAuthState();
      });

      document.getElementById("toggleTokensBtn")?.addEventListener("click", () => {
        const tokenFields = document.getElementById("tokenFields");
        const btn = document.getElementById("toggleTokensBtn");
        if (!tokenFields || !btn) return;
        tokenFields.hidden = !tokenFields.hidden;
        btn.textContent = tokenFields.hidden ? "Mostrar" : "Ocultar";
      });
    }

    return {
      bindEvents,
    };
  }

  global.PlaygroundEvents = {
    createPlaygroundEvents,
  };
})(window);
