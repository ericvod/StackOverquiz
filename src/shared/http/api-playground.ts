import { readFileSync } from "node:fs";

const playgroundHtml = readFileSync(new URL("./playground/app/api-playground.html", import.meta.url), "utf8");
const playgroundCss = readFileSync(new URL("./playground/app/api-playground.css", import.meta.url), "utf8");
const playgroundCoreJs = readFileSync(new URL("./playground/app/api-playground-core.js", import.meta.url), "utf8");
const playgroundStateJs = readFileSync(new URL("./playground/app/api-playground-state.js", import.meta.url), "utf8");
const playgroundApiClientJs = readFileSync(
  new URL("./playground/app/api-playground-api-client.js", import.meta.url),
  "utf8",
);
const playgroundViewsJs = readFileSync(new URL("./playground/app/api-playground-views.js", import.meta.url), "utf8");
const playgroundShellJs = readFileSync(new URL("./playground/app/api-playground-shell.js", import.meta.url), "utf8");
const playgroundNavigationJs = readFileSync(
  new URL("./playground/app/api-playground-navigation.js", import.meta.url),
  "utf8",
);
const playgroundActionsJs = readFileSync(
  new URL("./playground/app/api-playground-actions.js", import.meta.url),
  "utf8",
);
const playgroundEventsJs = readFileSync(new URL("./playground/app/api-playground-events.js", import.meta.url), "utf8");
const playgroundModalJs = readFileSync(new URL("./playground/app/api-playground-modal.js", import.meta.url), "utf8");
const playgroundJs = readFileSync(new URL("./playground/app/api-playground.js", import.meta.url), "utf8");
const playgroundI18nJs = readFileSync(new URL("./playground/shared/api-playground-i18n.js", import.meta.url), "utf8");
const playgroundLoginHtml = readFileSync(
  new URL("./playground/gateway/api-playground-login.html", import.meta.url),
  "utf8",
);
const playgroundLoginCss = readFileSync(
  new URL("./playground/gateway/api-playground-login.css", import.meta.url),
  "utf8",
);
const playgroundLoginJs = readFileSync(
  new URL("./playground/gateway/api-playground-login.js", import.meta.url),
  "utf8",
);
const playgroundForbiddenHtml = readFileSync(
  new URL("./playground/gateway/api-playground-forbidden.html", import.meta.url),
  "utf8",
);

/**
 * Renders the browser-based API playground used for QA and manual product flows.
 */
export function renderApiPlaygroundHtml() {
  return playgroundHtml;
}

/**
 * Renders the stylesheet used by the browser-based API playground.
 */
export function renderApiPlaygroundCss() {
  return playgroundCss;
}

/**
 * Renders shared utility functions used by the browser-based API playground app.
 */
export function renderApiPlaygroundCoreJs() {
  return playgroundCoreJs;
}

/**
 * Renders shared state and metadata bootstrap for the browser-based playground app.
 */
export function renderApiPlaygroundStateJs() {
  return playgroundStateJs;
}

/**
 * Renders the API client adapter used by the browser-based playground app.
 */
export function renderApiPlaygroundApiClientJs() {
  return playgroundApiClientJs;
}

/**
 * Renders view composition helpers used by the browser-based playground app.
 */
export function renderApiPlaygroundViewsJs() {
  return playgroundViewsJs;
}

/**
 * Renders app shell helpers (theme, tabs and console state) used by the browser-based playground app.
 */
export function renderApiPlaygroundShellJs() {
  return playgroundShellJs;
}

/**
 * Renders app navigation helpers (tabs and console panels) used by the browser-based playground app.
 */
export function renderApiPlaygroundNavigationJs() {
  return playgroundNavigationJs;
}

/**
 * Renders business action handlers used by the browser-based playground app.
 */
export function renderApiPlaygroundActionsJs() {
  return playgroundActionsJs;
}

/**
 * Renders UI event wiring helpers used by the browser-based playground app.
 */
export function renderApiPlaygroundEventsJs() {
  return playgroundEventsJs;
}

/**
 * Renders the modal/dialog system used by the browser-based playground app.
 */
export function renderApiPlaygroundModalJs() {
  return playgroundModalJs;
}

/**
 * Renders the client-side script that powers the browser-based API playground.
 */
export function renderApiPlaygroundJs() {
  return playgroundJs;
}

/**
 * Renders the shared i18n module used by all playground pages.
 */
export function renderApiPlaygroundI18nJs() {
  return playgroundI18nJs;
}

/**
 * Renders the login page that gates access to the admin playground workspace.
 */
export function renderApiPlaygroundLoginHtml() {
  return playgroundLoginHtml;
}

/**
 * Renders login page styles for the admin playground gateway.
 */
export function renderApiPlaygroundLoginCss() {
  return playgroundLoginCss;
}

/**
 * Renders login page script for admin-only access bootstrap.
 */
export function renderApiPlaygroundLoginJs() {
  return playgroundLoginJs;
}

/**
 * Renders the forbidden access page for authenticated non-admin users.
 */
export function renderApiPlaygroundForbiddenHtml() {
  return playgroundForbiddenHtml;
}
