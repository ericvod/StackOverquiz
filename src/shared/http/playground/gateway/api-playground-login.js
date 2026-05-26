const storageKeys = {
  accessToken: "stackoverquiz.playground.accessToken",
  refreshToken: "stackoverquiz.playground.refreshToken",
  baseUrl: "stackoverquiz.playground.baseUrl",
};

const gatewayI18n = window.PlaygroundI18n;

const loginForm = document.getElementById("gatewayLoginForm");
const submitButton = document.getElementById("gatewaySubmitButton");
const feedbackNode = document.getElementById("gatewayFeedback");

function t(key, vars) {
  if (!gatewayI18n?.t) {
    return key;
  }

  return gatewayI18n.t(key, vars);
}

function setFeedback(message, tone = "neutral") {
  if (!feedbackNode) {
    return;
  }

  feedbackNode.textContent = message;
  feedbackNode.classList.remove("is-error", "is-success");

  if (tone === "error") {
    feedbackNode.classList.add("is-error");
  }

  if (tone === "success") {
    feedbackNode.classList.add("is-success");
  }
}

function persistTokens(tokens) {
  localStorage.setItem(storageKeys.accessToken, tokens.accessToken);
  localStorage.setItem(storageKeys.refreshToken, tokens.refreshToken);

  if (!localStorage.getItem(storageKeys.baseUrl)) {
    localStorage.setItem(storageKeys.baseUrl, "/v1");
  }
}

function clearStoredTokens() {
  localStorage.removeItem(storageKeys.accessToken);
  localStorage.removeItem(storageKeys.refreshToken);
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message ?? "Request failed. Please try again.";
    throw new Error(message);
  }

  return payload.data;
}

async function openPlaygroundSession(accessToken) {
  const response = await fetch("/playground/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await parseApiResponse(response);
}

async function detectExistingSession() {
  const response = await fetch("/playground/session", {
    method: "GET",
    credentials: "same-origin",
  });

  if (response.status === 200) {
    window.location.replace("/playground/app");
    return true;
  }

  if (response.status === 403) {
    window.location.replace("/playground/forbidden");
    return true;
  }

  return false;
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  if (!submitButton) {
    return;
  }

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    setFeedback(t("login.feedbackEmailPasswordRequired"), "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = t("login.submitBusy");
  setFeedback(t("login.feedbackAuthenticating"));

  try {
    const loginResponse = await fetch("/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await parseApiResponse(loginResponse);
    const accessToken = loginData?.tokens?.accessToken;
    const refreshToken = loginData?.tokens?.refreshToken;

    if (!accessToken || !refreshToken) {
      throw new Error(t("login.feedbackInvalidAuthPayload"));
    }

    persistTokens({ accessToken, refreshToken });

    try {
      await openPlaygroundSession(accessToken);
    } catch (error) {
      clearStoredTokens();
      const errorMessage = error instanceof Error ? error.message : "";

      if (errorMessage.toLowerCase().includes("admin access required")) {
        setFeedback(t("login.feedbackNotAdmin"), "error");
        window.setTimeout(() => {
          window.location.replace("/playground/forbidden");
        }, 450);
        return;
      }

      throw error;
    }

    setFeedback(t("login.feedbackSessionReady"), "success");
    window.setTimeout(() => {
      window.location.replace("/playground/app");
    }, 220);
  } catch (error) {
    clearStoredTokens();
    const message = error instanceof Error ? error.message : t("login.feedbackUnableToSignIn");
    setFeedback(message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t("login.submitIdle");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  gatewayI18n?.applyTranslations(document);

  const redirected = await detectExistingSession();

  if (redirected) {
    return;
  }

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", handleLoginSubmit);
});
