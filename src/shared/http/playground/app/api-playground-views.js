(function initPlaygroundViews(global) {
  function t(key, vars) {
    return global.PlaygroundI18n?.t(key, vars) ?? key;
  }

  function createPlaygroundViews(deps) {
    const {
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
    } = deps;

    function populateCategorySelects() {
      const slugOptions = ['<option value="">Todas</option>'].concat(
        state.categories.map((category) => `<option value="${category.slug}">${category.name}</option>`),
      );

      const idOptions = state.categories.map(
        (category) => `<option value="${category.id}">${category.name} (${category.type})</option>`,
      );

      elements.questionCategoryFilter.innerHTML = slugOptions.join("");
      elements.createQuestionCategories.innerHTML = idOptions.join("");
      elements.aiCategoryIds.innerHTML = idOptions.join("");
      if (elements.aiQuizCategoryIds) elements.aiQuizCategoryIds.innerHTML = idOptions.join("");
      if (elements.practiceCategorySelect) elements.practiceCategorySelect.innerHTML = slugOptions.join("");
    }

    function renderCurrentUser() {
      const chip = document.getElementById("sessionChip");
      const chipName = chip?.querySelector(".session-name");
      const chipAvatar = chip?.querySelector(".session-avatar");

      if (!state.currentUser) {
        if (chipName) chipName.textContent = t("app.session.notAuthenticated");
        if (chipAvatar) chipAvatar.textContent = "—";
        return;
      }

      if (chipName) chipName.textContent = state.currentUser.username;
      if (chipAvatar) chipAvatar.textContent = (state.currentUser.username || "?")[0].toUpperCase();
    }

    function renderSelectedQuestions() {
      const selectedQuestions = state.questions.filter((question) => state.selectedQuestionIds.has(question.id));
      const count = selectedQuestions.length;

      elements.dashboardSelectionCount.textContent = String(count);
      elements.createQuizSelectionSummary.innerHTML =
        count > 0
          ? `${t("app.views.selectForQuiz")}: <strong>${count}</strong>`
          : t("app.modal.createQuiz.selectionHint");

      if (elements.selectionBar) {
        elements.selectionBar.hidden = count === 0;
      }

      const barText = elements.selectedQuestionsSummary;
      if (barText) {
        barText.textContent = count === 0 ? "" : t("app.selection.summary", { count });
      }
    }

    function renderDashboard() {
      elements.dashboardCategoryCount.textContent = String(state.categories.length);
      elements.dashboardQuestionCount.textContent = String(state.questions.length);
      elements.dashboardQuizCount.textContent = String(state.quizzes.length);

      const currentUserLabel = state.currentUser ? summarizeUser(state.currentUser) : t("app.dashboard.stateNoSession");
      const activeQuizLabel = state.activeQuiz ? state.activeQuiz.quiz.title : t("app.dashboard.stateNone");
      const activeMeta = tabMeta[state.activeTab] || tabMeta.dashboard;
      const activeFlowLabel = activeMeta.labelKey
        ? (global.PlaygroundI18n?.t(activeMeta.labelKey) ?? activeMeta.label)
        : activeMeta.label;

      elements.dashboardState.innerHTML =
        `<p><strong>${t("app.dashboard.labelUser")}:</strong> ` +
        currentUserLabel +
        `</p><p><strong>${t("app.dashboard.labelActiveFlow")}:</strong> ` +
        activeFlowLabel +
        `</p><p><strong>${t("app.dashboard.labelActiveQuiz")}:</strong> ` +
        activeQuizLabel +
        `</p><p><strong>${t("app.dashboard.labelBaseUrl")}:</strong> <span class="inline-code">` +
        normalizeBaseUrl() +
        `</span></p><p><strong>${t("app.dashboard.labelHistory")}:</strong> ` +
        state.history.length +
        "</p>";
    }

    function renderLatestResult() {
      if (!state.latestResult) {
        elements.latestResultSummary.innerHTML = `<div class="empty">${t("app.inspector.lastResultEmpty")}</div>`;
        return;
      }

      if (typeof state.latestResult === "string") {
        elements.latestResultSummary.innerHTML = `<div class="hint">${state.latestResult}</div>`;
        return;
      }

      elements.latestResultSummary.innerHTML =
        '<div class="stack"><strong>' +
        state.latestResult.title +
        '</strong><div class="hint">' +
        state.latestResult.body +
        "</div></div>";
    }

    function renderHistory() {
      if (state.history.length === 0) {
        elements.historyList.innerHTML = `<div class="empty">${t("app.inspector.historyEmpty")}</div>`;
        return;
      }

      elements.historyList.innerHTML = state.history
        .map(
          (item) =>
            '<div class="history-item">' +
            "<strong>" +
            item.method +
            " " +
            item.path +
            "</strong>" +
            '<span class="hint">HTTP ' +
            item.status +
            " - " +
            item.requestId +
            "</span>" +
            "</div>",
        )
        .join("");
    }

    function renderQuestionList() {
      if (state.questions.length === 0) {
        elements.questionList.innerHTML = `<div class="empty">${t("app.questions.listEmpty")}</div>`;
        return;
      }

      elements.questionList.innerHTML = state.questions
        .map((question) => {
          const checked = state.selectedQuestionIds.has(question.id) ? " checked" : "";
          const categoryText =
            (question.categories || []).map((category) => category.name).join(", ") || t("app.views.noCategories");
          return (
            '<article class="resource-card">' +
            '<div class="toolbar">' +
            '<label class="checklist-item" style="padding: 8px 10px; margin: 0;">' +
            '<input type="checkbox" data-question-toggle="' +
            question.id +
            '"' +
            checked +
            " />" +
            `<span>${t("app.views.selectForQuiz")}</span>` +
            "</label>" +
            `<button type="button" class="secondary" data-open-question="${question.id}">${t("app.views.openDetail")}</button>` +
            "</div>" +
            "<h4>" +
            formatInlineText(question.title) +
            "</h4>" +
            `<div class="resource-meta">${t("app.views.difficulty")}: ` +
            escapeHtml(question.difficulty) +
            ` | ${t("app.views.estimatedTime")}: ` +
            escapeHtml(question.estimatedTimeSeconds) +
            `s | ${t("app.views.rating")}: ` +
            escapeHtml(question.avgRating) +
            ` | ${t("app.questions.btnLoadCategories")}: ` +
            escapeHtml(categoryText) +
            "</div>" +
            '<div class="hint" style="margin-top: 10px;">' +
            formatText(question.bodyPreview || t("app.views.noPreview")) +
            "</div>" +
            '<div class="tags">' +
            `<span class="tag">${escapeHtml(question.id)}</span>` +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function renderQuestionDetail(question) {
      if (!question) {
        elements.questionDetail.innerHTML = `<div class="empty">${t("app.modal.questionDetail.empty")}</div>`;
        return;
      }

      const optionsHtml = (question.options || [])
        .map((option, index) => {
          const codeBlock = option.code ? renderCodeSnippet(option.code) : "";
          return (
            '<div class="option"><strong>' +
            (index + 1) +
            ".</strong><div><div>" +
            formatText(option.text) +
            "</div>" +
            codeBlock +
            "</div></div>"
          );
        })
        .join("");

      elements.questionDetail.innerHTML =
        '<article class="detail-card">' +
        "<h3>" +
        formatInlineText(question.title) +
        "</h3>" +
        `<div class="resource-meta">${t("app.views.difficulty")}: ` +
        escapeHtml(question.difficulty) +
        ` | ${t("app.views.estimatedTime")}: ` +
        escapeHtml(question.estimatedTimeSeconds) +
        "s</div>" +
        '<div class="hint">' +
        formatText(question.body) +
        "</div>" +
        '<div class="tags" style="margin-top: 12px;">' +
        (question.categories || [])
          .map((category) => `<span class="tag">${escapeHtml(category.name)}</span>`)
          .join("") +
        "</div>" +
        '<div class="option-list">' +
        optionsHtml +
        "</div>" +
        "</article>";
    }

    function renderQuizList() {
      if (state.quizzes.length === 0) {
        elements.quizList.innerHTML = `<div class="empty">${t("app.quizzes.listEmpty")}</div>`;
        return;
      }

      elements.quizList.innerHTML = state.quizzes
        .map(
          (quiz) =>
            '<article class="resource-card">' +
            "<h4>" +
            formatInlineText(quiz.title) +
            "</h4>" +
            `<div class="resource-meta">${t("app.views.creator")}: ` +
            escapeHtml(quiz.creator ? quiz.creator.username : t("app.views.unknown")) +
            ` | ${t("app.views.questionCount")}: ` +
            escapeHtml(quiz.questionCount) +
            ` | ${t("app.views.estimatedDuration")}: ` +
            escapeHtml(quiz.estimatedDurationSeconds) +
            `s | ${t("app.views.public")}: ` +
            escapeHtml(quiz.isPublic) +
            "</div>" +
            '<div class="hint" style="margin-top: 10px;">' +
            formatText(quiz.description || t("app.views.noDescription")) +
            "</div>" +
            '<div class="hint" style="margin-top: 10px;">Mix: ' +
            escapeHtml(formatDifficultyBreakdown(quiz.difficultyBreakdown)) +
            "</div>" +
            '<div class="actions" style="margin-top: 12px;">' +
            `<button type="button" data-open-quiz="${quiz.id}">${t("app.views.openQuiz")}</button>` +
            `<button type="button" class="secondary" data-quiz-leaderboard="${quiz.id}">Leaderboard</button>` +
            "</div>" +
            "</article>",
        )
        .join("");
    }

    function renderQuizRunner() {
      if (!state.activeQuiz) {
        elements.quizRunner.innerHTML = `<div class="empty">${t("app.modal.quizRunner.empty")}</div>`;
        return;
      }

      const quiz = state.activeQuiz.quiz;
      const answers = state.activeQuiz.answers;
      const questionCards = (quiz.questions || [])
        .map((question, questionIndex) => {
          const options = (question.options || [])
            .map((option, optionIndex) => {
              const checked = answers[question.id] === optionIndex ? " checked" : "";
              const codeBlock = option.code ? renderCodeSnippet(option.code) : "";
              return (
                '<label class="runner-option">' +
                `<input type="radio" name="question-${question.id}" data-runner-question="${question.id}" value="${optionIndex}"` +
                checked +
                " />" +
                `<div><strong>${t("app.views.option")} ${optionIndex + 1}:</strong><div>` +
                formatText(option.text) +
                "</div>" +
                codeBlock +
                "</div></label>"
              );
            })
            .join("");

          return (
            '<article class="runner-card">' +
            "<h4>" +
            (questionIndex + 1) +
            ". " +
            formatInlineText(question.title) +
            "</h4>" +
            '<div class="hint">' +
            formatText(question.body) +
            "</div>" +
            '<div class="runner-list" style="margin-top: 12px;">' +
            options +
            "</div></article>"
          );
        })
        .join("");

      const resultCard = state.activeQuiz.result
        ? `<article class="card" style="margin-top: 16px;"><h2>${t("app.views.result")}</h2><pre>` +
          JSON.stringify(state.activeQuiz.result, null, 2) +
          "</pre></article>"
        : "";

      elements.quizRunner.innerHTML =
        '<div class="stack">' +
        '<article class="card">' +
        '<div class="toolbar" style="justify-content: space-between;">' +
        "<h2>" +
        formatInlineText(quiz.title) +
        "</h2>" +
        `<button type="button" id="closeActiveQuizBtn" class="secondary">${t("app.views.backToList")}</button>` +
        "</div>" +
        '<div class="hint">' +
        formatText(quiz.description || t("app.views.noDescription")) +
        "</div>" +
        '<div class="tags" style="margin-top: 12px;">' +
        `<span class="tag">${t("app.views.questionCount")} ` +
        escapeHtml(quiz.questions.length) +
        `</span><span class="tag">${t("app.views.public")} ` +
        escapeHtml(quiz.isPublic) +
        "</span>" +
        "</div>" +
        "</article>" +
        questionCards +
        `<div class="actions"><button type="button" id="submitQuizAttemptBtn">${t("app.views.submitAttempt")}</button></div>` +
        resultCard +
        "</div>";
    }

    function renderPendingQuestions() {
      const container = document.getElementById("pendingQuestionsList");
      if (!container) return;

      if (!state.pendingQuestions || state.pendingQuestions.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.admin.review.pendingQuestionsEmpty")}</div>`;
        return;
      }

      container.innerHTML = state.pendingQuestions
        .map((question) => {
          return (
            '<article class="resource-card">' +
            "<h4>" +
            formatInlineText(question.title) +
            "</h4>" +
            `<div class="resource-meta">${t("app.views.id")}: ` +
            escapeHtml(question.id) +
            ` | ${t("app.views.difficulty")}: ` +
            escapeHtml(question.difficulty) +
            "</div>" +
            '<div class="actions" style="margin-top: 12px;">' +
            `<button type="button" class="success compact-button" data-approve-question="${question.id}">${t("app.views.approve")}</button>` +
            '<div style="display: flex; gap: 8px;">' +
            `<input type="text" placeholder="${t("app.views.rejectReasonPlaceholder")}" id="reject-reason-${question.id}" style="padding: 4px; font-size: 0.8rem; width: 150px;">` +
            `<button type="button" class="error compact-button" data-reject-question="${question.id}">${t("app.views.reject")}</button>` +
            "</div>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function renderPendingQuizzes() {
      const container = document.getElementById("pendingQuizzesList");
      if (!container) return;

      if (!state.pendingQuizzes || state.pendingQuizzes.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.admin.review.pendingQuizzesEmpty")}</div>`;
        return;
      }

      container.innerHTML = state.pendingQuizzes
        .map((quiz) => {
          return (
            '<article class="resource-card">' +
            "<h4>" +
            formatInlineText(quiz.title) +
            "</h4>" +
            `<div class="resource-meta">${t("app.views.id")}: ` +
            escapeHtml(quiz.id) +
            ` | ${t("app.views.questionCount")}: ` +
            escapeHtml(quiz.questionCount) +
            "</div>" +
            '<div class="actions" style="margin-top: 12px;">' +
            `<button type="button" class="secondary compact-button" data-view-pending-quiz="${quiz.id}">${t("app.views.viewDetails")}</button>` +
            `<button type="button" class="success compact-button" data-approve-quiz="${quiz.id}">${t("app.views.approve")}</button>` +
            '<div style="display: flex; gap: 8px;">' +
            `<input type="text" placeholder="${t("app.views.rejectReasonPlaceholder")}" id="reject-quiz-reason-${quiz.id}" style="padding: 4px; font-size: 0.8rem; width: 150px;">` +
            `<button type="button" class="error compact-button" data-reject-quiz="${quiz.id}">${t("app.views.reject")}</button>` +
            "</div>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function renderPendingQuizDetail(quiz) {
      const container = document.getElementById("pendingQuizDetail");
      if (!container) return;

      if (!quiz) {
        container.innerHTML = `<div class="empty">${t("app.modal.pendingQuizDetail.empty")}</div>`;
        return;
      }

      const questionsList = (quiz.questions || [])
        .map((q, idx) => {
          return `<li><strong>${idx + 1}.</strong> ${escapeHtml(q.title)} <span class="hint">(${escapeHtml(q.status)})</span></li>`;
        })
        .join("");

      container.innerHTML =
        '<article class="detail-card">' +
        "<h3>" +
        formatInlineText(quiz.title) +
        "</h3>" +
        `<div class="resource-meta">${t("app.views.id")}: ` +
        escapeHtml(quiz.id) +
        "</div>" +
        '<div class="hint">' +
        formatText(quiz.description || t("app.views.noDescription")) +
        "</div>" +
        `<div style="margin-top: 16px;"><strong>${t("app.views.linkedQuestions")}</strong></div>` +
        '<ul style="margin-top: 8px; padding-left: 20px;">' +
        questionsList +
        "</ul>" +
        '<label style="margin-top: 16px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">' +
        `<input type="checkbox" id="approve-quiz-questions-${quiz.id}" checked>` +
        t("app.views.approveLinkedQuestions", { count: quiz.questions.length }) +
        "</label>" +
        "</article>";
    }

    function renderReviewResult(message) {
      const resultContainer = document.getElementById("reviewResult");
      if (resultContainer) {
        resultContainer.innerHTML = `<div class="hint">${escapeHtml(message)}</div>`;
      }
    }

    function renderPracticeQuestions() {
      const container = document.getElementById("practiceQuestionsList");
      if (!container) return;

      if (!state.practiceQuestions || state.practiceQuestions.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.practice.answerEmpty")}</div>`;
        return;
      }

      container.innerHTML = state.practiceQuestions
        .map((question, qIdx) => {
          const optionsHtml = (question.options || [])
            .map((opt, optIdx) => {
              const codeBlock = opt.code ? renderCodeSnippet(opt.code) : "";
              return (
                '<label class="runner-option" style="cursor: pointer;">' +
                `<input type="radio" name="practice-question-${question.id}" value="${optIdx}"> ` +
                `<strong>${t("app.views.option")} ${optIdx + 1}:</strong> ` +
                formatText(opt.text) +
                codeBlock +
                "</label>"
              );
            })
            .join("");

          return (
            '<article class="runner-card" style="margin-bottom: 24px;">' +
            `<h4>${qIdx + 1}. ` +
            formatInlineText(question.title) +
            "</h4>" +
            `<div class="resource-meta" style="margin-bottom: 8px;">${t("app.views.id")}: ` +
            escapeHtml(question.id) +
            ` | ${t("app.views.difficulty")}: ` +
            escapeHtml(question.difficulty) +
            "</div>" +
            '<div class="hint" style="margin-bottom: 12px;">' +
            formatText(question.body) +
            "</div>" +
            '<div class="runner-list">' +
            optionsHtml +
            "</div>" +
            '<div class="actions" style="margin-top: 16px;">' +
            `<button type="button" class="compact-button" data-answer-practice="${question.id}">${t("app.views.answer")}</button>` +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function renderCategoryAdminList() {
      const container = document.getElementById("categoryAdminList");
      if (!container) return;

      if (!state.categories || state.categories.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.admin.categories.listEmpty")}</div>`;
        return;
      }

      container.innerHTML = state.categories
        .map((cat) => {
          return (
            '<article class="resource-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
            "<h4>" +
            escapeHtml(cat.name) +
            "</h4>" +
            '<span class="mini-chip">' +
            escapeHtml(cat.type) +
            "</span>" +
            "</div>" +
            '<div class="resource-meta">' +
            '<span class="inline-code-chip">' +
            escapeHtml(cat.slug) +
            "</span>" +
            (cat.icon ? ` <span class="tag">${escapeHtml(cat.icon)}</span>` : "") +
            "</div>" +
            (cat.description ? `<div class="hint" style="margin-top:6px;">${escapeHtml(cat.description)}</div>` : "") +
            '<div class="actions" style="margin-top:10px;">' +
            '<button type="button" class="secondary compact-button"' +
            ' data-edit-category="' +
            cat.id +
            '"' +
            ' data-cat-name="' +
            escapeHtml(cat.name) +
            '"' +
            ' data-cat-slug="' +
            escapeHtml(cat.slug) +
            '"' +
            ' data-cat-type="' +
            escapeHtml(cat.type) +
            '"' +
            ' data-cat-desc="' +
            escapeHtml(cat.description || "") +
            '"' +
            ' data-cat-icon="' +
            escapeHtml(cat.icon || "") +
            `">${t("app.views.edit")}</button>` +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function renderCategoryAdminResult(type, message) {
      const container = document.getElementById("categoryAdminResult");
      if (!container) return;
      const cls = type === "error" ? "status error" : "hint";
      const div = document.createElement("div");
      div.className = cls;
      div.textContent = message;
      container.replaceChildren(div);
    }

    function renderPracticeResult() {
      const resultContainer = document.getElementById("practiceResult");
      if (!resultContainer) return;

      if (!state.practiceResult) {
        resultContainer.innerHTML = `<div class="empty">${t("app.practice.resultEmpty")}</div>`;
        return;
      }

      const r = state.practiceResult;

      let html = '<div class="stack">';
      if (r.alreadyAnswered) {
        html += `<div class="status" style="margin-bottom: 8px;">${t("app.practice.alreadyAnswered")}</div>`;
      }

      if (r.isCorrect) {
        html += `<h3 style="color: var(--success); margin: 0;">${t("app.practice.correct")} (+ ${r.xpGained} XP)</h3>`;
      } else {
        html += `<h3 style="color: var(--error); margin: 0;">${t("app.practice.incorrect")} (0 XP)</h3>`;
      }

      html +=
        `<div style="margin-top: 12px;"><strong>${t("app.practice.correctOptionLabel")}</strong> ` +
        r.correctOptionIndex +
        "</div>";

      if (r.explanation) {
        html +=
          `<div class="hint" style="margin-top: 12px;"><strong>${t("app.practice.explanationLabel")}</strong><br>` +
          formatText(r.explanation) +
          "</div>";
      }

      html += "</div>";
      resultContainer.innerHTML = html;
    }

    function renderQuizLeaderboard(data) {
      const container = document.getElementById("quizLeaderboardContent");
      if (!container) return;
      if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.modal.quizLeaderboard.loading")}</div>`;
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        data
          .map(
            (entry) =>
              '<article class="resource-card">' +
              '<div style="display:flex;align-items:center;gap:12px;">' +
              '<span style="font-size:18px;font-weight:700;min-width:28px;color:var(--accent)">#' +
              escapeHtml(entry.rank) +
              "</span>" +
              '<div style="flex:1">' +
              "<strong>" +
              escapeHtml(entry.user.username) +
              "</strong>" +
              '<div class="resource-meta">' +
              `${t("app.views.score")}: ` +
              escapeHtml(entry.score) +
              "/" +
              escapeHtml(entry.totalQuestions) +
              " (" +
              escapeHtml(Math.round((entry.score / entry.totalQuestions) * 100)) +
              "%)" +
              (entry.timeSpentSeconds ? ` · ${escapeHtml(entry.timeSpentSeconds)}s` : "") +
              " · " +
              escapeHtml(new Date(entry.completedAt).toLocaleDateString("pt-BR")) +
              "</div>" +
              "</div>" +
              "</div>" +
              "</article>",
          )
          .join("") +
        "</div>";
    }

    function renderLeaderboard(data) {
      const container = document.getElementById("leaderboardList");
      if (!container) return;
      if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.dashboard.leaderboardEmpty")}</div>`;
        return;
      }
      container.innerHTML = data
        .map(
          (entry) =>
            '<article class="resource-card">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
            '<span style="font-size:18px;font-weight:700;min-width:28px;color:var(--accent)">#' +
            escapeHtml(entry.rank) +
            "</span>" +
            "<div>" +
            "<strong>" +
            escapeHtml(entry.username) +
            "</strong>" +
            `<div class="resource-meta">${t("app.views.xp")}: ` +
            escapeHtml(entry.xp) +
            ` | ${t("app.views.level")}: ` +
            escapeHtml(entry.level) +
            "</div>" +
            "</div>" +
            "</div>" +
            "</article>",
        )
        .join("");
    }

    function renderUploadResult(data) {
      const container = document.getElementById("uploadResult");
      if (!container) return;
      if (!data) {
        container.innerHTML = `<div class="empty">${t("app.dashboard.uploadEmpty")}</div>`;
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        '<div><strong>Key:</strong> <code style="font-family:monospace;font-size:11px;word-break:break-all;">' +
        escapeHtml(data.key) +
        "</code></div>" +
        (data.url
          ? `<div style="margin-top:8px;"><a href="${escapeHtml(data.url)}" target="_blank" style="font-size:12px;">${t("app.views.openSignedUrl")}</a></div>` +
            `<img src="${escapeHtml(data.url)}" style="max-width:100%;max-height:160px;margin-top:8px;border-radius:4px;object-fit:cover;" alt="preview" />`
          : "") +
        "</div>";
    }

    function renderSignedUrlResult(url) {
      const container = document.getElementById("signedUrlResult");
      if (!container) return;
      if (!url) {
        container.innerHTML = `<div class="empty">${t("app.dashboard.signedUrlEmpty")}</div>`;
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        `<a href="${escapeHtml(url)}" target="_blank" style="word-break:break-all;font-size:12px;">${t("app.views.openSignedUrl")}</a>` +
        `<img src="${escapeHtml(url)}" style="max-width:100%;max-height:160px;margin-top:8px;border-radius:4px;object-fit:cover;" alt="preview" />` +
        "</div>";
    }

    function renderUserProfile(data) {
      const container = document.getElementById("userProfileResult");
      if (!container) return;
      if (!data) {
        container.innerHTML = `<div class="empty">${t("app.dashboard.userProfileEmpty")}</div>`;
        return;
      }
      const p = data;
      const accuracy = p.stats?.accuracy != null ? `${(p.stats.accuracy * 100).toFixed(1)}%` : "—";
      const since = p.createdAt ? new Date(p.createdAt).toLocaleDateString("pt-BR") : "—";
      container.innerHTML =
        '<article class="detail-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        "<div>" +
        '<h3 style="margin:0;">' +
        escapeHtml(p.username) +
        "</h3>" +
        '<div class="resource-meta" style="margin-top:4px;">' +
        escapeHtml(p.role) +
        ` · ${t("app.views.since")} ` +
        escapeHtml(since) +
        "</div>" +
        "</div>" +
        (p.avatarUrl
          ? `<img src="${escapeHtml(p.avatarUrl)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" alt="avatar" />`
          : "") +
        "</div>" +
        '<div class="grid two" style="margin-top:14px;">' +
        `<div><span class="section-title">${t("app.views.xp")}</span><div class="value">` +
        escapeHtml(p.xp) +
        "</div></div>" +
        `<div><span class="section-title">${t("app.views.level")}</span><div class="value">` +
        escapeHtml(p.level) +
        "</div></div>" +
        `<div><span class="section-title">${t("app.views.questionCount")}</span><div class="value">` +
        escapeHtml(p.stats?.quizzesAttempted ?? 0) +
        "</div></div>" +
        `<div><span class="section-title">${t("app.views.accuracy")}</span><div class="value">` +
        accuracy +
        "</div></div>" +
        "</div>" +
        `<div class="hint" style="margin-top:12px;font-size:11px;word-break:break-all;">${t("app.views.id")}: ` +
        escapeHtml(p.id) +
        "</div>" +
        "</article>";
    }

    function renderUserHistory(data) {
      const container = document.getElementById("userProfileResult");
      if (!container) return;
      if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty">${t("app.dashboard.historyEmpty")}</div>`;
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        `<strong style="font-size:13px;">${t("app.views.latestAttempts")}</strong>` +
        data
          .slice(0, 10)
          .map(
            (item) =>
              '<article class="resource-card" style="margin-top:8px;">' +
              '<h4 style="margin:0 0 4px;">' +
              escapeHtml(item.quiz?.title ?? t("app.views.quizRemoved")) +
              "</h4>" +
              '<div class="resource-meta">' +
              `${t("app.views.score")}: ` +
              escapeHtml(item.score) +
              "/" +
              escapeHtml(item.totalQuestions) +
              " (" +
              escapeHtml(item.percentage.toFixed(0)) +
              "%)" +
              (item.timeSpentSeconds ? ` · ${escapeHtml(item.timeSpentSeconds)}s` : "") +
              " · " +
              escapeHtml(new Date(item.completedAt).toLocaleDateString("pt-BR")) +
              "</div>" +
              "</article>",
          )
          .join("") +
        "</div>";
    }

    function renderAdminUserList(data) {
      const container = document.getElementById("adminUserList");
      if (!container) return;
      const items = Array.isArray(data) ? data : (data.items ?? []);
      if (!items.length) {
        container.innerHTML = `<div class="empty">${t("app.admin.users.listEmpty")}</div>`;
        return;
      }
      const roleBadge = (role) =>
        role === "admin"
          ? `<span style="color:var(--warning);font-weight:600;">${t("common.admin")}</span>`
          : '<span style="opacity:.7;">user</span>';
      container.innerHTML = items
        .map(
          (u) =>
            '<article class="resource-card" style="margin-bottom:6px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
            "<div>" +
            '<div style="font-weight:600;font-size:13px;">' +
            escapeHtml(u.username) +
            " " +
            roleBadge(u.role) +
            "</div>" +
            '<div class="hint" style="font-size:11px;margin-top:2px;">' +
            escapeHtml(u.email) +
            "</div>" +
            `<div class="hint" style="font-size:11px;">${t("app.views.xp")} ` +
            escapeHtml(u.xp) +
            ` · ${t("app.views.level")} ` +
            escapeHtml(u.level) +
            " · " +
            escapeHtml(new Date(u.createdAt).toLocaleDateString("pt-BR")) +
            "</div>" +
            "</div>" +
            `<button type="button" class="secondary compact-button" data-use-user-id="${escapeHtml(u.id)}" style="flex-shrink:0;white-space:nowrap;">${t("app.views.useUuid")}</button>` +
            "</div>" +
            "</article>",
        )
        .join("");
    }

    return {
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
    };
  }

  global.PlaygroundViews = {
    createPlaygroundViews,
  };
})(window);
