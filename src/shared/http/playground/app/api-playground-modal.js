(function initPlaygroundModal(global) {
  function createPlaygroundModal({ elements }) {
    const overlay = elements.playgroundModalOverlay;
    const body = elements.playgroundModalBody;
    const titleEl = elements.playgroundModalTitle;
    const closeBtn = elements.playgroundModalCloseBtn;
    const templates = document.getElementById("modalTemplates");

    let currentContentId = null;
    let onCloseCallback = null;
    let previouslyFocused = null;

    function _returnContent() {
      if (!currentContentId || !templates) return;
      const content = document.getElementById(currentContentId);
      if (content) templates.appendChild(content);
      currentContentId = null;
    }

    function openModal(contentId, title, onClose) {
      if (currentContentId) _returnContent();

      const content = document.getElementById(contentId);
      if (!content) return;

      onCloseCallback = onClose || null;
      currentContentId = contentId;
      previouslyFocused = document.activeElement;

      if (titleEl) titleEl.textContent = title || "";
      body.appendChild(content);

      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      requestAnimationFrame(() => {
        const focusable = body.querySelector(
          "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
        );
        if (focusable) focusable.focus();
      });
    }

    function closeModal() {
      if (overlay.hidden) return;

      _returnContent();
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";

      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
        previouslyFocused = null;
      }

      if (typeof onCloseCallback === "function") {
        const cb = onCloseCallback;
        onCloseCallback = null;
        cb();
      }
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !overlay.hidden) {
        closeModal();
      }
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.classList.contains("modal-backdrop")) {
        closeModal();
      }
    });

    closeBtn.addEventListener("click", closeModal);

    return { openModal, closeModal };
  }

  global.PlaygroundModal = { createPlaygroundModal };
})(window);
