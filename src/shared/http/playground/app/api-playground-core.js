(function initPlaygroundCore(global) {
  function renderJson(target, value) {
    const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const highlighted = escaped.replace(
      /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          return /:$/.test(match)
            ? `<span class="json-key">${match}</span>`
            : `<span class="json-string">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="json-boolean">${match}</span>`;
        if (/null/.test(match)) return `<span class="json-null">${match}</span>`;
        return `<span class="json-number">${match}</span>`;
      },
    );
    if (target.tagName === "PRE") {
      target.innerHTML = highlighted;
    } else {
      target.innerHTML = `<pre>${highlighted}</pre>`;
    }
  }

  function safeParseJson(text) {
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return text;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatInlineText(value) {
    return escapeHtml(value).replace(/`([^`\n]+)`/g, '<code class="inline-code-chip">$1</code>');
  }

  function formatText(value) {
    const codeBlocks = [];
    let formatted = escapeHtml(value);

    formatted = formatted.replace(/```([\s\S]*?)```/g, (_match, code) => {
      const placeholder = `__PLAYGROUND_CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`<pre class="content-code-block"><code>${code.trim()}</code></pre>`);
      return placeholder;
    });

    formatted = formatted.replace(/`([^`\n]+)`/g, '<code class="inline-code-chip">$1</code>').replace(/\n/g, "<br>");

    codeBlocks.forEach((block, index) => {
      formatted = formatted.replace(`__PLAYGROUND_CODE_BLOCK_${index}__`, block);
    });

    return formatted;
  }

  function renderCodeSnippet(code) {
    return `<pre class="content-code-block"><code>${escapeHtml(code)}</code></pre>`;
  }

  function formatDifficultyBreakdown(breakdown) {
    if (!breakdown) {
      return "sem mix";
    }

    return Object.entries(breakdown)
      .filter(([, count]) => Number(count) > 0)
      .map(([difficulty, count]) => `${difficulty}: ${count}`)
      .join(", ");
  }

  function summarizeUser(user) {
    if (!user) {
      return "Nenhum usuario autenticado.";
    }

    const role = user.role ? ` (${user.role})` : "";
    return `${user.username + role} - ${user.email}`;
  }

  function getSelectedOptionValues(select) {
    return Array.from(select.selectedOptions)
      .map((option) => option.value)
      .filter(Boolean);
  }

  global.PlaygroundCore = {
    renderJson,
    safeParseJson,
    escapeHtml,
    formatInlineText,
    formatText,
    renderCodeSnippet,
    formatDifficultyBreakdown,
    summarizeUser,
    getSelectedOptionValues,
  };
})(window);
