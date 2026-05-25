(function initPlaygroundActions(global) {
  function createPlaygroundActions(deps) {
    const {
      state,
      elements,
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
    } = deps;

    async function loadCategories() {
      const { response, payload } = await callApi("/categories");
      if (!response.ok || !payload || !payload.data) {
        return;
      }

      state.categories = payload.data;
      populateCategorySelects();
      renderDashboard();
      if (typeof deps.renderCategoryAdminList === "function") {
        deps.renderCategoryAdminList();
      }
      updateLatestResult("Categorias carregadas", `Foram carregadas ${state.categories.length} categorias.`);
    }

    async function loadQuestions() {
      const search = document.getElementById("questionSearch").value.trim();
      const difficulty = document.getElementById("questionDifficulty").value;
      const category = elements.questionCategoryFilter.value;
      const authorMe = document.getElementById("questionAuthorMe")?.checked;
      const query = new URLSearchParams();

      if (search) query.set("search", search);
      if (difficulty) query.set("difficulty", difficulty);
      if (category) query.set("category", category);
      if (authorMe) query.set("author", "me");

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const { response, payload } = await callApi(`/questions${suffix}`);

      if (!response.ok || !payload || !payload.data) {
        return;
      }

      state.questions = payload.data;
      renderQuestionList();
      renderSelectedQuestions();
      renderDashboard();
      updateLatestResult("Perguntas carregadas", `Foram carregadas ${state.questions.length} perguntas publicas.`);
    }

    async function openQuestion(questionId) {
      const { response, payload } = await callApi(`/questions/${questionId}`);
      if (!response.ok || !payload || !payload.data) {
        return;
      }

      deps.openModal?.("questionDetailTemplate", "Detalhe da Pergunta");
      renderQuestionDetail(payload.data);
      updateLatestResult("Detalhe carregado", `Pergunta aberta: ${payload.data.title}`);
    }

    async function createQuestion() {
      const options = [0, 1, 2, 3, 4].map((index) => ({
        text: document.getElementById(`option${index}`).value.trim(),
      }));

      if (options.some((option) => !option.text)) {
        setGlobalStatus("Preencha as cinco opcoes antes de criar a pergunta.", true);
        return;
      }

      const categoryIds = getSelectedOptionValues(elements.createQuestionCategories);
      if (categoryIds.length === 0) {
        setGlobalStatus("Selecione ao menos uma categoria para a pergunta.", true);
        return;
      }

      const body = {
        title: document.getElementById("createQuestionTitle").value.trim(),
        body: document.getElementById("createQuestionBody").value.trim(),
        difficulty: document.getElementById("createQuestionDifficulty").value,
        estimatedTimeSeconds: Number(document.getElementById("createQuestionEstimatedTimeSeconds").value || "60"),
        options,
        correctOptionIndex: Number(document.getElementById("createQuestionCorrectIndex").value),
        explanation: document.getElementById("createQuestionExplanation").value.trim() || undefined,
        categoryIds,
      };

      const { response, payload } = await callApi("/questions", {
        method: "POST",
        body,
        auth: true,
      });

      if (response.ok) {
        deps.closeModal?.();
        updateLatestResult(
          "Pergunta criada",
          "A pergunta foi criada como pendente e nao aparece na listagem publica ate ser aprovada.",
        );
        deps.openModal?.("questionDetailTemplate", "Detalhe da Pergunta");
        renderQuestionDetail(payload.data);
      }
    }

    async function loadQuizzes() {
      const search = document.getElementById("quizSearch").value.trim();
      const authorMe = document.getElementById("quizAuthorMe")?.checked;
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (authorMe) query.set("author", "me");
      const suffix = query.toString() ? `?${query.toString()}` : "";

      const { response, payload } = await callApi(`/quizzes${suffix}`);
      if (!response.ok || !payload || !payload.data) {
        return;
      }

      state.quizzes = payload.data;
      renderQuizList();
      renderDashboard();
      updateLatestResult("Quizzes carregados", `Foram carregados ${state.quizzes.length} quizzes publicos.`);
    }

    async function openQuiz(quizId) {
      const { response, payload } = await callApi(`/quizzes/${quizId}`);
      if (!response.ok || !payload || !payload.data) {
        return;
      }

      state.activeQuiz = {
        quiz: payload.data,
        startedAt: Date.now(),
        answers: {},
        result: null,
      };
      deps.openModal?.("quizRunnerTemplate", payload.data.title);
      renderQuizRunner();
      renderDashboard();
      updateLatestResult("Quiz aberto", `Runner preparado para ${payload.data.title}.`);
    }

    async function submitQuizAttempt() {
      if (!state.activeQuiz) {
        setGlobalStatus("Nenhum quiz aberto no runner.", true);
        return;
      }

      const quiz = state.activeQuiz.quiz;
      const answers = quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOptionIndex: state.activeQuiz.answers[question.id],
      }));

      if (answers.some((answer) => answer.selectedOptionIndex === undefined)) {
        setGlobalStatus("Responda todas as perguntas antes de enviar a tentativa.", true);
        return;
      }

      const timeSpentSeconds = Math.max(0, Math.round((Date.now() - state.activeQuiz.startedAt) / 1000));
      const { response, payload } = await callApi(`/quizzes/${quiz.id}/attempt`, {
        method: "POST",
        body: {
          answers,
          timeSpentSeconds,
        },
        auth: true,
      });

      if (response.ok) {
        state.activeQuiz.result = payload.data;
        renderQuizRunner();
        updateLatestResult(
          "Tentativa enviada",
          `Score ${payload.data.score}/${payload.data.totalQuestions} | XP ${payload.data.xpGained}`,
        );
      }
    }

    async function createQuiz() {
      const questionIds = Array.from(state.selectedQuestionIds);
      if (questionIds.length === 0) {
        setGlobalStatus("Selecione perguntas na aba Questions antes de criar um quiz.", true);
        return;
      }

      const rawTimeLimit = document.getElementById("createQuizTimeLimit").value.trim();
      const body = {
        title: document.getElementById("createQuizTitle").value.trim(),
        description: document.getElementById("createQuizDescription").value.trim() || undefined,
        isPublic: document.getElementById("createQuizIsPublic").value === "true",
        timeLimitSeconds: rawTimeLimit ? Number(rawTimeLimit) : undefined,
        questionIds,
      };

      const { response, payload } = await callApi("/quizzes", {
        method: "POST",
        body,
        auth: true,
      });

      if (response.ok) {
        deps.closeModal?.();
        updateLatestResult("Quiz criado", `Quiz criado como pendente com ${questionIds.length} perguntas.`);
        if (payload?.data?.id) {
          await loadQuizzes();
        }
      }
    }

    async function generateAiQuestions() {
      const categoryIds = getSelectedOptionValues(elements.aiCategoryIds);
      if (categoryIds.length === 0) {
        setGlobalStatus("Selecione ao menos uma categoria para a geracao por IA.", true);
        return;
      }

      const body = {
        category: document.getElementById("aiCategory").value.trim(),
        difficulty: document.getElementById("aiDifficulty").value,
        count: Number(document.getElementById("aiCount").value || "1"),
        language: document.getElementById("aiLanguage").value,
        geminiApiKey:
          localStorage.getItem(deps.storageKeys?.geminiApiKey ?? "stackoverquiz.playground.geminiApiKey") || undefined,
        categoryIds,
      };

      const { response, payload } = await callApi("/ai/generate", {
        method: "POST",
        body,
        auth: true,
      });

      if (response.ok) {
        renderJson(elements.adminResult, payload.data);
        updateLatestResult("Geracao IA concluida", `Foram geradas ${payload.data.generated} perguntas pendentes.`);
        await loadQuestions();
      }
    }

    async function fetchMe() {
      const { response, payload } = await callApi("/auth/me", {
        auth: true,
      });

      if (response.ok && payload?.data) {
        state.currentUser = payload.data;
        renderCurrentUser();
        renderDashboard();
      }
    }

    function _getRefreshToken() {
      return (
        elements.refreshToken?.value.trim() ||
        localStorage.getItem(deps.storageKeys?.refreshToken ?? "stackoverquiz.playground.refreshToken") ||
        ""
      );
    }

    async function refreshSession() {
      const refreshToken = _getRefreshToken();
      if (!refreshToken) {
        setGlobalStatus("Nenhum refresh token disponível.", true);
        return;
      }
      const { response } = await callApi("/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      });

      if (response.ok) {
        updateLatestResult("Refresh concluido", "Tokens atualizados.");
      }
    }

    async function logoutUser() {
      const { response } = await callApi("/auth/logout", {
        method: "POST",
        body: { refreshToken: _getRefreshToken() },
        auth: true,
      });

      if (response.ok) {
        await clearPlaygroundSessionCookie();
        clearAuthState();
        updateLatestResult("Logout concluido", "Sessao revogada com sucesso.");
      }
    }

    async function exitPlayground() {
      await clearPlaygroundSessionCookie();
      clearAuthState();
      window.location.replace("/playground");
    }

    function openConfigModal() {
      const baseUrlEl = document.getElementById("configBaseUrl");
      const geminiEl = document.getElementById("configGeminiKey");
      if (baseUrlEl) baseUrlEl.value = elements.baseUrl?.value ?? "/v1";
      if (geminiEl) geminiEl.value = localStorage.getItem(deps.storageKeys?.geminiApiKey ?? "") ?? "";
      deps.openModal?.("configTemplate", "Configurações");
    }

    function saveConfig() {
      const baseUrlEl = document.getElementById("configBaseUrl");
      const geminiEl = document.getElementById("configGeminiKey");
      if (baseUrlEl && elements.baseUrl) {
        elements.baseUrl.value = baseUrlEl.value.trim() || "/v1";
      }
      if (geminiEl) {
        const key = geminiEl.value.trim();
        const storageKey = deps.storageKeys?.geminiApiKey ?? "stackoverquiz.playground.geminiApiKey";
        if (key) {
          localStorage.setItem(storageKey, key);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
      deps.closeModal?.();
      setGlobalStatus("Configurações salvas.", false);
    }

    function clearGeminiKey() {
      const storageKey = deps.storageKeys?.geminiApiKey ?? "stackoverquiz.playground.geminiApiKey";
      localStorage.removeItem(storageKey);
      const el = document.getElementById("configGeminiKey");
      if (el) el.value = "";
      setGlobalStatus("Chave Gemini removida.", false);
    }

    function openSessionModal() {
      const infoEl = document.getElementById("sessionDetailsUser");
      if (infoEl) {
        if (state.currentUser) {
          const u = state.currentUser;
          const lines = [
            `<strong>${u.username ?? u.email ?? "Admin"}</strong>`,
            u.email ? `<span>${u.email}</span>` : "",
            u.role
              ? `<span style="text-transform:uppercase;font-size:10px;letter-spacing:.1em;color:var(--accent)">${u.role}</span>`
              : "",
            u.id
              ? `<span style="font-family:monospace;font-size:10px;color:var(--text-muted);word-break:break-all;">${u.id}</span>`
              : "",
          ]
            .filter(Boolean)
            .join("<br>");
          infoEl.innerHTML = lines;
        } else {
          infoEl.textContent = "Nenhum usuário autenticado no momento.";
        }
      }

      const usernameEl = document.getElementById("editProfileUsername");
      const avatarEl = document.getElementById("editProfileAvatarUrl");
      if (usernameEl) usernameEl.value = state.currentUser?.username ?? "";
      if (avatarEl) avatarEl.value = state.currentUser?.avatarUrl ?? "";

      const changePwResult = document.getElementById("changePasswordResult");
      const updateProfileResult = document.getElementById("updateProfileResult");
      if (changePwResult) changePwResult.textContent = "";
      if (updateProfileResult) updateProfileResult.textContent = "";

      const currentPwEl = document.getElementById("changePasswordCurrent");
      const newPwEl = document.getElementById("changePasswordNew");
      if (currentPwEl) currentPwEl.value = "";
      if (newPwEl) newPwEl.value = "";

      const tokenFields = document.getElementById("tokenFields");
      const toggleBtn = document.getElementById("toggleTokensBtn");
      if (tokenFields) tokenFields.hidden = true;
      if (toggleBtn) toggleBtn.textContent = "Mostrar";
      deps.openModal?.("sessionDetailsTemplate", "Sessão Ativa");
    }

    async function changePassword() {
      const currentPassword = document.getElementById("changePasswordCurrent")?.value ?? "";
      const newPassword = document.getElementById("changePasswordNew")?.value ?? "";
      const resultEl = document.getElementById("changePasswordResult");

      if (!currentPassword || !newPassword) {
        if (resultEl) resultEl.textContent = "Preencha os dois campos.";
        return;
      }

      const { response, payload } = await callApi("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
        auth: true,
      });

      if (response.ok) {
        if (resultEl) {
          resultEl.style.color = "var(--success)";
          resultEl.textContent = "Senha alterada. Outras sessões foram revogadas.";
        }
        const currentPwEl = document.getElementById("changePasswordCurrent");
        const newPwEl = document.getElementById("changePasswordNew");
        if (currentPwEl) currentPwEl.value = "";
        if (newPwEl) newPwEl.value = "";
        updateLatestResult("Senha alterada", "Senha alterada com sucesso. Outras sessões foram revogadas.");
      } else {
        if (resultEl) {
          resultEl.style.color = "var(--error)";
          resultEl.textContent = payload?.error?.message ?? "Erro ao trocar senha.";
        }
      }
    }

    async function loadQuizLeaderboard(quizId) {
      const { response, payload } = await callApi(`/quizzes/${quizId}/leaderboard`);
      if (!response.ok || !payload?.data) return;

      deps.openModal?.("quizLeaderboardTemplate", "Leaderboard do Quiz");
      if (typeof deps.renderQuizLeaderboard === "function") deps.renderQuizLeaderboard(payload.data);
      updateLatestResult("Leaderboard do quiz", `${payload.data.length} tentativa(s) no ranking.`);
    }

    async function loadLeaderboard() {
      const limit = document.getElementById("leaderboardLimit")?.value || "10";
      const { response, payload } = await callApi(`/leaderboard?limit=${limit}`);
      if (!response.ok || !payload?.data) return;

      if (typeof deps.renderLeaderboard === "function") deps.renderLeaderboard(payload.data);
      updateLatestResult("Leaderboard carregado", `${payload.data.length} usuários no ranking.`);
    }

    async function uploadImage() {
      const fileInput = document.getElementById("uploadImageFile");
      const file = fileInput?.files?.[0];
      if (!file) {
        setGlobalStatus("Selecione um arquivo de imagem antes de enviar.", true);
        return;
      }

      const folder = document.getElementById("uploadImageFolder")?.value || "questions";
      const formData = new FormData();
      formData.append("file", file);

      const { response, payload } = await callApi(`/uploads/image?folder=${encodeURIComponent(folder)}`, {
        method: "POST",
        body: formData,
        auth: true,
      });

      if (response.ok && payload?.data) {
        if (typeof deps.renderUploadResult === "function") deps.renderUploadResult(payload.data);
        const keyInput = document.getElementById("signedUrlKey");
        if (keyInput) keyInput.value = payload.data.key;
        updateLatestResult("Upload concluído", `Chave: ${payload.data.key}`);
      }
    }

    async function getSignedUrl() {
      const key = document.getElementById("signedUrlKey")?.value.trim();
      if (!key) {
        setGlobalStatus("Informe a chave do arquivo.", true);
        return;
      }

      const { response, payload } = await callApi(`/uploads/${key}`);
      if (response.ok && payload?.data?.url) {
        if (typeof deps.renderSignedUrlResult === "function") deps.renderSignedUrlResult(payload.data.url);
        updateLatestResult("URL assinada obtida", `Chave: ${key}`);
      }
    }

    async function lookupUserProfile() {
      const userId = document.getElementById("lookupUserId")?.value.trim();
      if (!userId) {
        setGlobalStatus("Informe o UUID do usuário.", true);
        return;
      }

      const { response, payload } = await callApi(`/users/${userId}/profile`);
      if (response.ok && payload?.data) {
        if (typeof deps.renderUserProfile === "function") deps.renderUserProfile(payload.data);
        updateLatestResult("Perfil carregado", `Usuário: ${payload.data.username}`);
      }
    }

    async function lookupUserHistory() {
      const userId = document.getElementById("lookupUserId")?.value.trim();
      if (!userId) {
        setGlobalStatus("Informe o UUID do usuário.", true);
        return;
      }

      const { response, payload } = await callApi(`/users/${userId}/history`, { auth: true });
      if (response.ok && payload?.data) {
        if (typeof deps.renderUserHistory === "function") deps.renderUserHistory(payload.data);
        updateLatestResult("Histórico carregado", `${payload.data.length} entrada(s) no histórico.`);
      }
    }

    async function loadAdminUsers() {
      const search = document.getElementById("adminUserSearch")?.value.trim();
      const role = document.getElementById("adminUserRoleFilter")?.value || undefined;
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      const qs = params.toString() ? "?" + params.toString() : "";

      const { response, payload } = await callApi(`/admin/users${qs}`, { auth: true });
      if (response.ok && payload?.data) {
        if (typeof deps.renderAdminUserList === "function") deps.renderAdminUserList(payload.data);
        updateLatestResult("Usuários carregados", `${payload.data.total} usuário(s) encontrado(s).`);
      }
    }

    async function adminResetPassword() {
      const userId = document.getElementById("adminResetUserId")?.value.trim();
      const password = document.getElementById("adminResetNewPassword")?.value || undefined;
      const resultEl = document.getElementById("adminUsersResult");

      if (!userId) {
        setGlobalStatus("Informe o UUID do usuário alvo.", true);
        return;
      }

      const { response, payload } = await callApi(`/admin/users/${userId}/reset-password`, {
        method: "POST",
        body: password ? { password } : {},
        auth: true,
      });

      if (response.ok && payload?.data) {
        const d = payload.data;
        const label = d.generated ? "Senha gerada automaticamente (mostrada apenas uma vez):" : "Senha aplicada:";
        if (resultEl) {
          resultEl.innerHTML =
            '<div class="stack">' +
            '<div class="hint">' +
            escapeHtml(label) +
            "</div>" +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;">' +
            '<code style="font-family:monospace;font-size:13px;padding:6px 10px;background:var(--surface-raised);border-radius:4px;flex:1;word-break:break-all;" id="resetPasswordValue">' +
            escapeHtml(d.password) +
            "</code>" +
            '<button type="button" id="copyResetPasswordBtn" class="secondary compact-button">Copiar</button>' +
            "</div>" +
            '<div class="hint" style="margin-top:8px;">Todas as sessões do usuário foram revogadas.</div>' +
            "</div>";

          document.getElementById("copyResetPasswordBtn")?.addEventListener("click", () => {
            const val = document.getElementById("resetPasswordValue")?.textContent ?? d.password;
            navigator.clipboard?.writeText(val);
            setGlobalStatus("Senha copiada.", false);
          });
        }
        const pwEl = document.getElementById("adminResetNewPassword");
        if (pwEl) pwEl.value = "";
        updateLatestResult("Senha resetada", `Senha ${d.generated ? "gerada" : "definida"} para o usuário ${userId}.`);
      } else if (resultEl) {
        resultEl.innerHTML =
          '<div class="status error">' + escapeHtml(payload?.error?.message ?? "Erro ao resetar senha.") + "</div>";
      }
    }

    async function updateProfile() {
      const usernameEl = document.getElementById("editProfileUsername");
      const avatarEl = document.getElementById("editProfileAvatarUrl");
      const resultEl = document.getElementById("updateProfileResult");

      const body = {};
      const username = usernameEl?.value.trim();
      const avatarUrl = avatarEl?.value.trim();
      if (username) body.username = username;
      if (avatarUrl !== undefined) body.avatarUrl = avatarUrl || null;

      if (Object.keys(body).length === 0) {
        if (resultEl) resultEl.textContent = "Nenhum campo preenchido.";
        return;
      }

      const { response, payload } = await callApi("/users/me", {
        method: "PATCH",
        body,
        auth: true,
      });

      if (response.ok) {
        if (resultEl) {
          resultEl.style.color = "var(--success)";
          resultEl.textContent = "Perfil atualizado com sucesso.";
        }
        if (payload?.data) {
          state.currentUser = { ...state.currentUser, ...payload.data };
          renderCurrentUser();
        }
        updateLatestResult("Perfil atualizado", `Username: ${payload?.data?.username ?? ""}`);
      } else {
        if (resultEl) {
          resultEl.style.color = "var(--error)";
          resultEl.textContent = payload?.error?.message ?? "Erro ao atualizar perfil.";
        }
      }
    }

    async function loadHealth() {
      const { response, payload } = await callApi("/health", {
        absolute: true,
      });

      if (response.ok || response.status === 503) {
        updateLatestResult("Health consultado", `Status do backend: ${payload.data.status}`);
      }
    }

    async function bootstrapData() {
      setGlobalStatus("Carregando categorias, perguntas e quizzes...", false);

      try {
        await loadCategories();
        await loadQuestions();
        await loadQuizzes();
        const token =
          elements.accessToken?.value.trim() ||
          localStorage.getItem(deps.storageKeys?.accessToken ?? "stackoverquiz.playground.accessToken") ||
          "";
        if (token) {
          await fetchMe();
        }
        setGlobalStatus("Dados basicos carregados.", false);
      } catch (_error) {
        setGlobalStatus("Falha ao carregar dados iniciais.", true);
      }
    }

    async function generateAiQuiz() {
      const categoryIds = getSelectedOptionValues(document.getElementById("aiQuizCategoryIds"));

      const body = {
        title: document.getElementById("aiQuizTitle").value.trim(),
        description: document.getElementById("aiQuizDescription").value.trim() || undefined,
        category: document.getElementById("aiQuizCategory").value.trim(),
        language: document.getElementById("aiQuizLanguage").value,
        geminiApiKey:
          localStorage.getItem(deps.storageKeys?.geminiApiKey ?? "stackoverquiz.playground.geminiApiKey") || undefined,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        difficultyMix: {
          beginner: Number(document.getElementById("aiQuizMixBeginner").value),
          easy: Number(document.getElementById("aiQuizMixEasy").value),
          medium: Number(document.getElementById("aiQuizMixMedium").value),
          hard: Number(document.getElementById("aiQuizMixHard").value),
          expert: Number(document.getElementById("aiQuizMixExpert").value),
        },
      };

      const { response, payload } = await callApi("/ai/generate-quiz", {
        method: "POST",
        body,
        auth: true,
      });

      if (response.ok) {
        renderJson(elements.adminResult, payload.data);
        updateLatestResult(
          "Geracao de Quiz IA concluida",
          "Quiz draft gerado com sucesso. Ele foi enviado para listagem de pendentes.",
        );
      }
    }

    async function loadPendingQuestions() {
      const { response, payload } = await callApi("/admin/content/questions?status=pending", { auth: true });
      if (!response.ok || !payload?.data) return;

      state.pendingQuestions = payload.data;
      if (typeof deps.renderPendingQuestions === "function") {
        deps.renderPendingQuestions();
      }
      updateLatestResult("Perguntas Pendentes", `Listadas ${state.pendingQuestions.length} perguntas pendentes.`);
    }

    async function approveQuestion(id) {
      const { response } = await callApi(`/admin/content/questions/${id}/approve`, { method: "POST", auth: true });
      if (response.ok) {
        if (typeof deps.renderReviewResult === "function")
          deps.renderReviewResult(`Pergunta ${id} aprovada com sucesso.`);
        await loadPendingQuestions();
      }
    }

    async function rejectQuestion(id, reason) {
      const { response } = await callApi(`/admin/content/questions/${id}/reject`, {
        method: "POST",
        body: { reason },
        auth: true,
      });
      if (response.ok) {
        if (typeof deps.renderReviewResult === "function") deps.renderReviewResult(`Pergunta ${id} rejeitada.`);
        await loadPendingQuestions();
      }
    }

    async function loadPendingQuizzes() {
      const { response, payload } = await callApi("/admin/content/quizzes?status=pending", { auth: true });
      if (!response.ok || !payload?.data) return;

      state.pendingQuizzes = payload.data;
      if (typeof deps.renderPendingQuizzes === "function") {
        deps.renderPendingQuizzes();
      }
      updateLatestResult("Quizzes Pendentes", `Listados ${state.pendingQuizzes.length} quizzes pendentes.`);
    }

    async function viewPendingQuizDetail(id) {
      const { response, payload } = await callApi(`/admin/content/quizzes/${id}`, { auth: true });
      if (!response.ok || !payload?.data) return;

      deps.openModal?.("pendingQuizDetailTemplate", `Revisão: ${payload.data.title}`);
      if (typeof deps.renderPendingQuizDetail === "function") {
        deps.renderPendingQuizDetail(payload.data);
      }
      updateLatestResult("Detalhe do Quiz", `Detalhe do quiz pending ${id} carregado para rever questoes vinculadas.`);
    }

    async function approveQuiz(id, approveQuestions) {
      const { response } = await callApi(`/admin/content/quizzes/${id}/approve`, {
        method: "POST",
        body: { approveQuestions },
        auth: true,
      });
      if (response.ok) {
        if (typeof deps.renderReviewResult === "function")
          deps.renderReviewResult(`Quiz ${id} aprovado com sucesso (questoes cascade: ${approveQuestions}).`);
        await loadPendingQuizzes();
        // clear details
        if (typeof deps.renderPendingQuizDetail === "function") deps.renderPendingQuizDetail(null);
      }
    }

    async function rejectQuiz(id, reason) {
      const { response } = await callApi(`/admin/content/quizzes/${id}/reject`, {
        method: "POST",
        body: { reason },
        auth: true,
      });
      if (response.ok) {
        if (typeof deps.renderReviewResult === "function") deps.renderReviewResult(`Quiz ${id} rejeitado.`);
        await loadPendingQuizzes();
        if (typeof deps.renderPendingQuizDetail === "function") deps.renderPendingQuizDetail(null);
      }
    }

    async function loadPracticeQuestions() {
      const limit = document.getElementById("practiceLimit")?.value;
      const difficulty = document.getElementById("practiceDifficulty")?.value;
      const category = document.getElementById("practiceCategorySelect")?.value;
      const excludeStr = document.getElementById("practiceExcludeAnswered")?.value;
      const includeStr = document.getElementById("practiceIncludeAnswered")?.value;

      const query = new URLSearchParams();
      if (limit) query.set("limit", limit);
      if (difficulty) query.set("difficulties", difficulty);
      if (category) query.set("category", category);
      if (excludeStr === "true") query.set("excludeAnswered", "true");
      if (includeStr === "true") query.set("includeAnswered", "true");

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const { response, payload } = await callApi(`/practice/questions${suffix}`, { auth: true });
      if (!response.ok || !payload?.data) return;

      state.practiceQuestions = payload.data;
      state.practiceResult = null;

      if (typeof deps.renderPracticeQuestions === "function") {
        deps.renderPracticeQuestions();
      }
      if (typeof deps.renderPracticeResult === "function") {
        deps.renderPracticeResult(); // clear old results
      }

      updateLatestResult(
        "Prática: Perguntas carregadas",
        `Recebido um lote de ${payload.data.length} perguntas limpas sem gabarito.`,
      );
    }

    async function createCategory() {
      const name = elements.createCategoryName?.value.trim();
      const slug = elements.createCategorySlug?.value.trim();
      const type = elements.createCategoryType?.value;

      if (!name || !slug) {
        setGlobalStatus("Nome e slug são obrigatórios para criar uma categoria.", true);
        return;
      }

      const body = {
        name,
        slug,
        type: type || "area",
        description: elements.createCategoryDescription?.value.trim() || undefined,
        icon: elements.createCategoryIcon?.value.trim() || undefined,
      };

      const { response, payload } = await callApi("/admin/categories", {
        method: "POST",
        body,
        auth: true,
      });

      if (response.ok) {
        deps.closeModal?.();
        if (typeof deps.renderCategoryAdminResult === "function") {
          deps.renderCategoryAdminResult("success", `Categoria "${payload.data.name}" criada com sucesso.`);
        }
        updateLatestResult("Categoria criada", `Categoria ${body.name} criada (id ${payload.data.id}).`);
        await loadCategories();
      } else if (payload?.error?.message) {
        if (typeof deps.renderCategoryAdminResult === "function") {
          deps.renderCategoryAdminResult("error", payload.error.message);
        }
      }
    }

    async function updateCategory() {
      const id = elements.editCategoryId?.value;
      if (!id) {
        setGlobalStatus("Selecione uma categoria na lista para editar.", true);
        return;
      }

      const body = {};
      const name = elements.editCategoryName?.value.trim();
      const slug = elements.editCategorySlug?.value.trim();
      const type = elements.editCategoryType?.value;
      const description = elements.editCategoryDescription?.value.trim();
      const icon = elements.editCategoryIcon?.value.trim();

      if (name) body.name = name;
      if (slug) body.slug = slug;
      if (type) body.type = type;
      body.description = description || null;
      body.icon = icon || null;

      const { response, payload } = await callApi(`/admin/categories/${id}`, {
        method: "PUT",
        body,
        auth: true,
      });

      if (response.ok) {
        deps.closeModal?.();
        if (typeof deps.renderCategoryAdminResult === "function") {
          deps.renderCategoryAdminResult("success", `Categoria "${payload.data.name}" atualizada.`);
        }
        updateLatestResult("Categoria atualizada", `Categoria ${id} atualizada com sucesso.`);
        await loadCategories();
      } else if (payload?.error?.message) {
        if (typeof deps.renderCategoryAdminResult === "function") {
          deps.renderCategoryAdminResult("error", payload.error.message);
        }
      }
    }

    async function deleteCategory() {
      const id = elements.editCategoryId?.value;
      if (!id) {
        setGlobalStatus("Selecione uma categoria na lista antes de excluir.", true);
        return;
      }

      const { response, payload } = await callApi(`/admin/categories/${id}`, {
        method: "DELETE",
        auth: true,
      });

      if (response.ok) {
        deps.closeModal?.();
        if (typeof deps.renderCategoryAdminResult === "function") {
          deps.renderCategoryAdminResult("success", `Categoria ${id} excluída com sucesso.`);
        }
        if (elements.editCategoryId) elements.editCategoryId.value = "";
        updateLatestResult("Categoria excluída", `Categoria ${id} removida.`);
        await loadCategories();
      } else if (payload?.error?.message) {
        if (typeof deps.renderCategoryAdminResult === "function") {
          deps.renderCategoryAdminResult("error", payload.error.message);
        }
      }
    }

    async function answerPracticeQuestion(questionId, selectedOptionIndex) {
      const { response, payload } = await callApi("/practice/answer", {
        method: "POST",
        body: { questionId, selectedOptionIndex },
        auth: true,
      });

      if (!response.ok || !payload?.data) return;

      state.practiceResult = payload.data;
      if (typeof deps.renderPracticeResult === "function") {
        deps.renderPracticeResult();
      }
      updateLatestResult(
        "Prática: Resposta submetida",
        `Recebeu feedback para pergunta ${questionId}. Correta: ${payload.data.isCorrect}`,
      );
    }

    return {
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
    };
  }

  global.PlaygroundActions = {
    createPlaygroundActions,
  };
})(window);
