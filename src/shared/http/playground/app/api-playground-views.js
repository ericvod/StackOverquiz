(function initPlaygroundViews(global) {
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
        if (chipName) chipName.textContent = "Não autenticado";
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
          ? `Perguntas selecionadas: <strong>${count}</strong>`
          : "Selecione perguntas na aba Questions para montar o quiz.";

      if (elements.selectionBar) {
        elements.selectionBar.hidden = count === 0;
      }

      const barText = elements.selectedQuestionsSummary;
      if (barText) {
        barText.textContent =
          count === 0 ? "" : `${count} pergunta${count !== 1 ? "s" : ""} selecionada${count !== 1 ? "s" : ""}`;
      }
    }

    function renderDashboard() {
      elements.dashboardCategoryCount.textContent = String(state.categories.length);
      elements.dashboardQuestionCount.textContent = String(state.questions.length);
      elements.dashboardQuizCount.textContent = String(state.quizzes.length);

      const currentUserLabel = state.currentUser ? summarizeUser(state.currentUser) : "sem sessao";
      const activeQuizLabel = state.activeQuiz ? state.activeQuiz.quiz.title : "nenhum";
      const activeFlowLabel = (tabMeta[state.activeTab] || tabMeta.dashboard).label;

      elements.dashboardState.innerHTML =
        "<p><strong>Usuario:</strong> " +
        currentUserLabel +
        "</p>" +
        "<p><strong>Fluxo aberto:</strong> " +
        activeFlowLabel +
        "</p>" +
        "<p><strong>Quiz aberto:</strong> " +
        activeQuizLabel +
        "</p>" +
        '<p><strong>Base URL:</strong> <span class="inline-code">' +
        normalizeBaseUrl() +
        "</span></p>" +
        "<p><strong>Historico de requests:</strong> " +
        state.history.length +
        "</p>";
    }

    function renderLatestResult() {
      if (!state.latestResult) {
        elements.latestResultSummary.innerHTML = '<div class="empty">Nenhum fluxo executado ainda.</div>';
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
        elements.historyList.innerHTML = '<div class="empty">Nenhuma request ainda.</div>';
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
        elements.questionList.innerHTML = '<div class="empty">Nenhuma pergunta carregada ainda.</div>';
        return;
      }

      elements.questionList.innerHTML = state.questions
        .map((question) => {
          const checked = state.selectedQuestionIds.has(question.id) ? " checked" : "";
          const categoryText =
            (question.categories || []).map((category) => category.name).join(", ") || "sem categorias";
          return (
            '<article class="resource-card">' +
            '<div class="toolbar">' +
            '<label class="checklist-item" style="padding: 8px 10px; margin: 0;">' +
            '<input type="checkbox" data-question-toggle="' +
            question.id +
            '"' +
            checked +
            " />" +
            "<span>Selecionar para quiz</span>" +
            "</label>" +
            '<button type="button" class="secondary" data-open-question="' +
            question.id +
            '">Abrir detalhe</button>' +
            "</div>" +
            "<h4>" +
            formatInlineText(question.title) +
            "</h4>" +
            '<div class="resource-meta">Difficulty: ' +
            escapeHtml(question.difficulty) +
            " | Tempo estimado: " +
            escapeHtml(question.estimatedTimeSeconds) +
            "s" +
            " | Rating: " +
            escapeHtml(question.avgRating) +
            " | Categorias: " +
            escapeHtml(categoryText) +
            "</div>" +
            '<div class="hint" style="margin-top: 10px;">' +
            formatText(question.bodyPreview || "Sem preview") +
            "</div>" +
            '<div class="tags">' +
            '<span class="tag">' +
            escapeHtml(question.id) +
            "</span>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function renderQuestionDetail(question) {
      if (!question) {
        elements.questionDetail.innerHTML =
          '<div class="empty">Clique em "Abrir detalhe" em uma pergunta para inspecionar corpo e opcoes.</div>';
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
        '<div class="resource-meta">Difficulty: ' +
        escapeHtml(question.difficulty) +
        " | Tempo estimado: " +
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
        elements.quizList.innerHTML = '<div class="empty">Nenhum quiz carregado ainda.</div>';
        return;
      }

      elements.quizList.innerHTML = state.quizzes
        .map(
          (quiz) =>
            '<article class="resource-card">' +
            "<h4>" +
            formatInlineText(quiz.title) +
            "</h4>" +
            '<div class="resource-meta">Criador: ' +
            escapeHtml(quiz.creator ? quiz.creator.username : "desconhecido") +
            " | Questoes: " +
            escapeHtml(quiz.questionCount) +
            " | Duracao estimada: " +
            escapeHtml(quiz.estimatedDurationSeconds) +
            "s" +
            " | Publico: " +
            escapeHtml(quiz.isPublic) +
            "</div>" +
            '<div class="hint" style="margin-top: 10px;">' +
            formatText(quiz.description || "Sem descricao") +
            "</div>" +
            '<div class="hint" style="margin-top: 10px;">Mix: ' +
            escapeHtml(formatDifficultyBreakdown(quiz.difficultyBreakdown)) +
            "</div>" +
            '<div class="actions" style="margin-top: 12px;">' +
            '<button type="button" data-open-quiz="' +
            quiz.id +
            '">Abrir quiz</button>' +
            '<button type="button" class="secondary" data-quiz-leaderboard="' +
            quiz.id +
            '">Leaderboard</button>' +
            "</div>" +
            "</article>",
        )
        .join("");
    }

    function renderQuizRunner() {
      if (!state.activeQuiz) {
        elements.quizRunner.innerHTML =
          '<div class="empty">Abra um quiz da lista para responder aqui visualmente.</div>';
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
                '<input type="radio" name="question-' +
                question.id +
                '" data-runner-question="' +
                question.id +
                '" value="' +
                optionIndex +
                '"' +
                checked +
                " />" +
                "<div><strong>Opcao " +
                (optionIndex + 1) +
                ":</strong><div>" +
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
        ? '<article class="card" style="margin-top: 16px;"><h2>Resultado</h2><pre>' +
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
        '<button type="button" id="closeActiveQuizBtn" class="secondary">Voltar para lista</button>' +
        "</div>" +
        '<div class="hint">' +
        formatText(quiz.description || "Sem descricao") +
        "</div>" +
        '<div class="tags" style="margin-top: 12px;">' +
        '<span class="tag">questoes ' +
        escapeHtml(quiz.questions.length) +
        "</span>" +
        '<span class="tag">publico ' +
        escapeHtml(quiz.isPublic) +
        "</span>" +
        "</div>" +
        "</article>" +
        questionCards +
        '<div class="actions"><button type="button" id="submitQuizAttemptBtn">Enviar tentativa</button></div>' +
        resultCard +
        "</div>";
    }

    function renderPendingQuestions() {
      const container = document.getElementById("pendingQuestionsList");
      if (!container) return;

      if (!state.pendingQuestions || state.pendingQuestions.length === 0) {
        container.innerHTML = '<div class="empty">Nenhuma pergunta pendente.</div>';
        return;
      }

      container.innerHTML = state.pendingQuestions
        .map((question) => {
          return (
            '<article class="resource-card">' +
            "<h4>" +
            formatInlineText(question.title) +
            "</h4>" +
            '<div class="resource-meta">ID: ' +
            escapeHtml(question.id) +
            " | Difficulty: " +
            escapeHtml(question.difficulty) +
            "</div>" +
            '<div class="actions" style="margin-top: 12px;">' +
            '<button type="button" class="success compact-button" data-approve-question="' +
            question.id +
            '">Aprovar</button>' +
            '<div style="display: flex; gap: 8px;">' +
            '<input type="text" placeholder="Motivo rejeição" id="reject-reason-' +
            question.id +
            '" style="padding: 4px; font-size: 0.8rem; width: 150px;">' +
            '<button type="button" class="error compact-button" data-reject-question="' +
            question.id +
            '">Rejeitar</button>' +
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
        container.innerHTML = '<div class="empty">Nenhum quiz pendente.</div>';
        return;
      }

      container.innerHTML = state.pendingQuizzes
        .map((quiz) => {
          return (
            '<article class="resource-card">' +
            "<h4>" +
            formatInlineText(quiz.title) +
            "</h4>" +
            '<div class="resource-meta">ID: ' +
            escapeHtml(quiz.id) +
            " | Questions: " +
            escapeHtml(quiz.questionCount) +
            "</div>" +
            '<div class="actions" style="margin-top: 12px;">' +
            '<button type="button" class="secondary compact-button" data-view-pending-quiz="' +
            quiz.id +
            '">Ver detalhes</button>' +
            '<button type="button" class="success compact-button" data-approve-quiz="' +
            quiz.id +
            '">Aprovar</button>' +
            '<div style="display: flex; gap: 8px;">' +
            '<input type="text" placeholder="Motivo rejeição" id="reject-quiz-reason-' +
            quiz.id +
            '" style="padding: 4px; font-size: 0.8rem; width: 150px;">' +
            '<button type="button" class="error compact-button" data-reject-quiz="' +
            quiz.id +
            '">Rejeitar</button>' +
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
        container.innerHTML =
          '<div class="empty">Selecione um quiz na lista para exibir o detalhe (incluindo as perguntas a aprovar).</div>';
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
        '<div class="resource-meta">ID: ' +
        escapeHtml(quiz.id) +
        "</div>" +
        '<div class="hint">' +
        formatText(quiz.description || "Sem descricao") +
        "</div>" +
        '<div style="margin-top: 16px;"><strong>Questões vinculadas:</strong></div>' +
        '<ul style="margin-top: 8px; padding-left: 20px;">' +
        questionsList +
        "</ul>" +
        '<label style="margin-top: 16px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">' +
        '<input type="checkbox" id="approve-quiz-questions-' +
        quiz.id +
        '" checked>' +
        "Aprovar as " +
        quiz.questions.length +
        " questões vinculadas juntas com o quiz" +
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
        container.innerHTML = '<div class="empty">Nenhum lote de prática processado ainda.</div>';
        return;
      }

      container.innerHTML = state.practiceQuestions
        .map((question, qIdx) => {
          const optionsHtml = (question.options || [])
            .map((opt, optIdx) => {
              const codeBlock = opt.code ? renderCodeSnippet(opt.code) : "";
              return (
                '<label class="runner-option" style="cursor: pointer;">' +
                '<input type="radio" name="practice-question-' +
                question.id +
                '" value="' +
                optIdx +
                '"> ' +
                "<strong>Opcao " +
                (optIdx + 1) +
                ":</strong> " +
                formatText(opt.text) +
                codeBlock +
                "</label>"
              );
            })
            .join("");

          return (
            '<article class="runner-card" style="margin-bottom: 24px;">' +
            "<h4>" +
            (qIdx + 1) +
            ". " +
            formatInlineText(question.title) +
            "</h4>" +
            '<div class="resource-meta" style="margin-bottom: 8px;">ID: ' +
            escapeHtml(question.id) +
            " | Difficulty: " +
            escapeHtml(question.difficulty) +
            "</div>" +
            '<div class="hint" style="margin-bottom: 12px;">' +
            formatText(question.body) +
            "</div>" +
            '<div class="runner-list">' +
            optionsHtml +
            "</div>" +
            '<div class="actions" style="margin-top: 16px;">' +
            '<button type="button" class="compact-button" data-answer-practice="' +
            question.id +
            '">Responder</button>' +
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
        container.innerHTML = '<div class="empty">Nenhuma categoria encontrada. Clique em "Carregar lista".</div>';
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
            (cat.icon ? ' <span class="tag">' + escapeHtml(cat.icon) + "</span>" : "") +
            "</div>" +
            (cat.description
              ? '<div class="hint" style="margin-top:6px;">' + escapeHtml(cat.description) + "</div>"
              : "") +
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
            '">Editar</button>' +
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
        resultContainer.innerHTML = '<div class="empty">Resposta não submetida ainda.</div>';
        return;
      }

      const r = state.practiceResult;

      let html = '<div class="stack">';
      if (r.alreadyAnswered) {
        html +=
          '<div class="status" style="margin-bottom: 8px;">Aviso: Você já havia respondido esta pergunta anteriormente.</div>';
      }

      if (r.isCorrect) {
        html += `<h3 style="color: var(--success); margin: 0;">Correto (+ ${r.xpGained} XP)</h3>`;
      } else {
        html += '<h3 style="color: var(--error); margin: 0;">Incorreto (0 XP)</h3>';
      }

      html +=
        '<div style="margin-top: 12px;"><strong>A opção correta era a de índice:</strong> ' +
        r.correctOptionIndex +
        "</div>";

      if (r.explanation) {
        html +=
          '<div class="hint" style="margin-top: 12px;"><strong>Explicação:</strong><br>' +
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
        container.innerHTML = '<div class="empty">Nenhuma tentativa registrada ainda.</div>';
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
              "<div style=\"flex:1\">" +
              "<strong>" +
              escapeHtml(entry.user.username) +
              "</strong>" +
              '<div class="resource-meta">' +
              "Score: " +
              escapeHtml(entry.score) +
              "/" +
              escapeHtml(entry.totalQuestions) +
              " (" +
              escapeHtml(Math.round((entry.score / entry.totalQuestions) * 100)) +
              "%)" +
              (entry.timeSpentSeconds ? " · " + escapeHtml(entry.timeSpentSeconds) + "s" : "") +
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
        container.innerHTML = '<div class="empty">Nenhum usuário no ranking.</div>';
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
            '<div class="resource-meta">XP: ' +
            escapeHtml(entry.xp) +
            " | Nível: " +
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
        container.innerHTML = '<div class="empty">Nenhum upload realizado.</div>';
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        "<div><strong>Key:</strong> <code style=\"font-family:monospace;font-size:11px;word-break:break-all;\">" +
        escapeHtml(data.key) +
        "</code></div>" +
        (data.url
          ? '<div style="margin-top:8px;"><a href="' +
            escapeHtml(data.url) +
            '" target="_blank" style="font-size:12px;">Abrir URL assinada ↗</a></div>' +
            '<img src="' +
            escapeHtml(data.url) +
            '" style="max-width:100%;max-height:160px;margin-top:8px;border-radius:4px;object-fit:cover;" alt="preview" />'
          : "") +
        "</div>";
    }

    function renderSignedUrlResult(url) {
      const container = document.getElementById("signedUrlResult");
      if (!container) return;
      if (!url) {
        container.innerHTML = '<div class="empty">Nenhuma chave consultada.</div>';
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        '<a href="' +
        escapeHtml(url) +
        '" target="_blank" style="word-break:break-all;font-size:12px;">Abrir URL assinada ↗</a>' +
        '<img src="' +
        escapeHtml(url) +
        '" style="max-width:100%;max-height:160px;margin-top:8px;border-radius:4px;object-fit:cover;" alt="preview" />' +
        "</div>";
    }

    function renderUserProfile(data) {
      const container = document.getElementById("userProfileResult");
      if (!container) return;
      if (!data) {
        container.innerHTML = '<div class="empty">Nenhum perfil carregado.</div>';
        return;
      }
      const p = data;
      const accuracy =
        p.stats?.accuracy != null ? (p.stats.accuracy * 100).toFixed(1) + "%" : "—";
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
        " · desde " +
        escapeHtml(since) +
        "</div>" +
        "</div>" +
        (p.avatarUrl
          ? '<img src="' +
            escapeHtml(p.avatarUrl) +
            '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" alt="avatar" />'
          : "") +
        "</div>" +
        '<div class="grid two" style="margin-top:14px;">' +
        '<div><span class="section-title">XP</span><div class="value">' +
        escapeHtml(p.xp) +
        "</div></div>" +
        '<div><span class="section-title">Nível</span><div class="value">' +
        escapeHtml(p.level) +
        "</div></div>" +
        '<div><span class="section-title">Quizzes</span><div class="value">' +
        escapeHtml(p.stats?.quizzesAttempted ?? 0) +
        "</div></div>" +
        '<div><span class="section-title">Precisão</span><div class="value">' +
        accuracy +
        "</div></div>" +
        "</div>" +
        '<div class="hint" style="margin-top:12px;font-size:11px;word-break:break-all;">ID: ' +
        escapeHtml(p.id) +
        "</div>" +
        "</article>";
    }

    function renderUserHistory(data) {
      const container = document.getElementById("userProfileResult");
      if (!container) return;
      if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty">Nenhum histórico encontrado.</div>';
        return;
      }
      container.innerHTML =
        '<div class="stack">' +
        '<strong style="font-size:13px;">Últimas tentativas</strong>' +
        data
          .slice(0, 10)
          .map(
            (item) =>
              '<article class="resource-card" style="margin-top:8px;">' +
              '<h4 style="margin:0 0 4px;">' +
              escapeHtml(item.quiz?.title ?? "Quiz removido") +
              "</h4>" +
              '<div class="resource-meta">' +
              "Score: " +
              escapeHtml(item.score) +
              "/" +
              escapeHtml(item.totalQuestions) +
              " (" +
              escapeHtml(item.percentage.toFixed(0)) +
              "%)" +
              (item.timeSpentSeconds ? " · " + escapeHtml(item.timeSpentSeconds) + "s" : "") +
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
      if (!data || data.items.length === 0) {
        container.innerHTML = '<div class="empty">Nenhum usuário encontrado.</div>';
        return;
      }
      const roleBadge = (role) =>
        role === "admin"
          ? '<span style="color:var(--warning);font-weight:600;">admin</span>'
          : '<span style="opacity:.7;">user</span>';
      container.innerHTML = data.items
        .map(
          (u) =>
            '<article class="resource-card" style="margin-bottom:6px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
            '<div>' +
            '<div style="font-weight:600;font-size:13px;">' +
            escapeHtml(u.username) +
            " " +
            roleBadge(u.role) +
            "</div>" +
            '<div class="hint" style="font-size:11px;margin-top:2px;">' +
            escapeHtml(u.email) +
            "</div>" +
            '<div class="hint" style="font-size:11px;">XP ' +
            escapeHtml(u.xp) +
            " · Nv " +
            escapeHtml(u.level) +
            " · " +
            escapeHtml(new Date(u.createdAt).toLocaleDateString("pt-BR")) +
            "</div>" +
            "</div>" +
            '<button type="button" class="secondary compact-button" data-use-user-id="' +
            escapeHtml(u.id) +
            '" style="flex-shrink:0;white-space:nowrap;">Usar UUID</button>' +
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
