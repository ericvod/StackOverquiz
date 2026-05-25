(function initPlaygroundApiClient(global) {
  function extractUser(payload) {
    if (!payload || !payload.data) {
      return null;
    }

    if (payload.data.user) {
      return payload.data.user;
    }

    if (payload.data.id && payload.data.email) {
      return payload.data;
    }

    return null;
  }

  function redactSensitiveValue(value) {
    if (Array.isArray(value)) {
      return value.map(redactSensitiveValue);
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => {
        const normalizedKey = key.toLowerCase();
        const isSensitive =
          normalizedKey.includes("apikey") ||
          normalizedKey.includes("api_key") ||
          normalizedKey.includes("authorization") ||
          normalizedKey.includes("password") ||
          normalizedKey.includes("token");

        return [key, isSensitive ? "[redacted]" : redactSensitiveValue(entryValue)];
      }),
    );
  }

  function createPlaygroundApiClient(deps) {
    function syncTokensFromPayload(payload) {
      const tokens = payload?.data ? payload.data.tokens : null;
      if (!tokens) {
        return;
      }

      if (tokens.accessToken) {
        deps.setAccessToken(tokens.accessToken);
      }

      if (tokens.refreshToken) {
        deps.setRefreshToken(tokens.refreshToken);
      }

      deps.persistAuthState();
    }

    async function callApi(path, options) {
      const resolvedOptions = options || {};

      deps.persistAuthState();

      const method = resolvedOptions.method || "GET";
      const baseUrl = resolvedOptions.absolute ? window.location.origin : deps.normalizeBaseUrl();
      const url = resolvedOptions.absolute ? baseUrl + path : baseUrl + path;
      const headers = Object.assign({}, resolvedOptions.headers || {});
      const useAuth = resolvedOptions.auth === true;

      if (useAuth && deps.getAccessToken()) {
        headers.authorization = `Bearer ${deps.getAccessToken()}`;
      }

      let body = resolvedOptions.body;
      if (body !== undefined && !(body instanceof FormData)) {
        headers["content-type"] = headers["content-type"] || "application/json";
        body = JSON.stringify(body);
      }

      deps.renderJson(deps.requestPreview, {
        method,
        url,
        headers: redactSensitiveValue(headers),
        body:
          body && !(body instanceof FormData)
            ? redactSensitiveValue(deps.safeParseJson(body))
            : body
              ? "[FormData]"
              : null,
      });
      deps.setRequestStatus(`Executando ${method} ${path}`, false);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
        });

        const responseText = await response.text();
        const payload = deps.safeParseJson(responseText);
        const headerEntries = {};

        response.headers.forEach((value, key) => {
          headerEntries[key] = value;
        });

        deps.renderJson(deps.headersPreview, headerEntries);
        deps.renderJson(deps.responsePreview, payload || "No content");

        deps.addHistoryEntry(method, path, response.status, response.headers.get("x-request-id"));

        if (useAuth && response.status === 401) {
          deps.setRequestStatus(`HTTP 401 - sessao expirada`, "error");
          deps.onSessionExpired?.();
          return { response, payload };
        }

        syncTokensFromPayload(payload);

        const user = extractUser(payload);
        if (user) {
          deps.onUserResolved(user);
        }

        deps.setRequestStatus(`HTTP ${response.status} - ${path}`, response.ok ? "success" : "error");

        return { response, payload };
      } catch (error) {
        deps.renderJson(deps.headersPreview, "Nenhum header retornado.");
        deps.renderJson(deps.responsePreview, String(error));
        deps.setRequestStatus("Falha ao executar request", "error");
        throw error;
      }
    }

    return {
      callApi,
    };
  }

  global.PlaygroundApiClient = {
    createPlaygroundApiClient,
  };
})(window);
