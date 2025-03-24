import { readQueryParams, removeQueryParams } from "../libs/queryParams/queryParams.js";
import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  fetchPlaceholders,
} from "./aem.js";
import { confirmUnsavedChanges } from "./utils.js";

const LCP_BLOCKS = []; // add your LCP blocks to the list
const range = document.createRange();

export const SCRIPT_API = window.location.hostname === "localhost" ? "http://localhost:4000" : "https://api.kestrelone.com";
export const EMAIL_WORKER_API = `${SCRIPT_API}/emailPreview`;
export const OOPS = "Oops ! Something went wrong …";

export const defaultBranch = "main";
export const projectRepo = "headwire-self-service";
export const daProjectRepo = "da-self-service";

if (window.location.hostname === "localhost") {
  document.addEventListener("mousedown", (event) => {
    if (event.target.matches('a[href^="/redirect?url="]')) {
      event.target.setAttribute("href", event.target.getAttribute("href").replace("/redirect?url=", ""));
    }
  });

  const oldOpen = window.open;
  window.open = (...args) => {
    if (typeof args[0] === "string" && args[0].startsWith("/redirect?url=")) {
      args[0] = args[0].replace("/redirect?url=", "");
    }
    return oldOpen(...args);
  };
}

export function clamp(num, min = 0, max = 100, setNan = "min") {
  let result = Math.min(Math.max(num, max), min);
  if (setNan === "min" && Number.isNaN(result)) {
    result = min;
  }
  if (setNan === "max" && Number.isNaN(result)) {
    result = max;
  }
  return result;
}

export async function completeChecklistItem(projectSlug, itemName, projectDetails = null, allowUpdateEl = true) {
  if (projectDetails?.checklistData?.[itemName]) return true; // already complete
  const checklistDataResponse = await fetch(`${SCRIPT_API}/checklist/${projectSlug}/${itemName}`, {
    method: "POST",
    headers: { authorization: `bearer ${await window.auth0Client.getTokenSilently()}` },
  }).catch(() => null);
  if (checklistDataResponse?.ok && allowUpdateEl) {
    document.querySelectorAll(`[data-checklist-property="${itemName}"]`).forEach((el) => {
      el.dataset.completed = true;
    });
  }
  return checklistDataResponse?.ok || false;
}

export async function highlightElement() {
  const params = readQueryParams();
  const highlightSelector = decodeURIComponent(params.highlight || "");
  const tooltip = decodeURIComponent(params.tooltip || "");
  removeQueryParams(["highlight", "tooltip"]);
  if (highlightSelector) {
    const getElement = () => document.querySelector(highlightSelector);
    let found = getElement();
    if (!found) {
      // retry find interval
      await new Promise((resolve) => {
        let count = 100;
        const findInterval = setInterval(() => {
          found = getElement();
          if (found || count < 0) {
            clearInterval(findInterval);
            resolve(found);
            return;
          }
          count -= 1;
        }, 200);
      });
    }
    if (found) {
      // highlight with tour
      const description = document.createElement("p");
      description.innerText = tooltip; // doing this to prevent XSS exploits
      const tourHighlight = window.expedition.js.tour({
        destroyOnClicked: true,
        steps: [
          {
            element: found,
            popover: {
              popoverClass: !tooltip ? "highlight-popover-hidden" : "",
              title: "",
              // Do not directly input the description queryparam text below! XSS
              description: description.innerHTML,
              showButtons: [],
            },
            destroyOnClicked: true,
          },
        ],
      });

      tourHighlight.start();
    } else {
      // eslint-disable-next-line no-console
      console.warn("element to highlight was not found within max attempts");
    }
  }
}

export function maybeStringify(obj) {
  if (!obj) return "";
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

export function maybeParse(str) {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// extra four, for separators
export const slugMaxLength = 63 - defaultBranch.length - projectRepo.length - 4;

const daClassRegex = /\b(is-headwire|is-adobe|is-test-user)\b/i;
export function hasDarkAlleyAccess() {
  return daClassRegex.test(document.body.className);
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function dateToRelativeString(date) {
  if (!(date instanceof Date)) {
    date = new Date(date); // eslint-disable-line no-param-reassign
  }
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  const intervals = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count !== 0) {
      return rtf.format(-count, interval.unit);
    }
  }

  return rtf.format(0, "second"); // Default to "now"
}
export function dateToRelativeSpan(
  date,
  className,
  lang = [],
  format = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
) {
  if (!(date instanceof Date)) {
    date = new Date(date); // eslint-disable-line no-param-reassign
  }
  const span = document.createElement("span");
  span.innerText = dateToRelativeString(date);
  if (className) span.className = className;
  span.title = date.toLocaleTimeString(lang, format);
  return span;
}

export function validateEmail(value) {
  const input = document.createElement("input");

  input.type = "email";
  input.required = true;
  input.value = value;

  return input.checkValidity();
}

export function onAuthenticated(cb) {
  if (document.body.classList.contains("is-authenticated")) {
    cb();
  } else {
    document.addEventListener("auth0:authenticated", () => {
      cb();
    });
  }
}

export async function waitForAuthenticated() {
  await new Promise((resolve) => {
    onAuthenticated(resolve);
  });
}

let cachedUserSettings = null;
export async function getUserSettings() {
  if (cachedUserSettings) {
    return cachedUserSettings;
  }
  await waitForAuthenticated();

  const token = await window.auth0Client.getTokenSilently();
  const headers = { authorization: `bearer ${token}` };

  const data = await fetch(`${SCRIPT_API}/userSettings`, {
    headers,
  })
    .then((response) => response.json())
    .catch(() => null);

  if (data) {
    cachedUserSettings = data;
  }
  return data;
}

export async function updateUserSettings(newSettingsData) {
  await waitForAuthenticated();

  const token = await window.auth0Client.getTokenSilently();
  const headers = { authorization: `bearer ${token}`, "content-type": "application/json" };

  const response = await fetch(`${SCRIPT_API}/userSettings`, {
    headers,
    method: "POST",
    body: JSON.stringify({ userSettings: newSettingsData }),
  });
  if (response.ok) {
    cachedUserSettings = newSettingsData;
    return true;
  }
  return false;
}

export const KESTREL_ONE = "kestrelone.com";

export function getExpirationTime(expirationDays) {
  const date = new Date();
  date.setDate(date.getDate() + expirationDays);

  return date.getTime();
}

export function colorInput(colorVar, disabled = false, returnEl = false) {
  const input = document.createElement("input");
  input.type = "color";
  if (colorVar) input.dataset.var = colorVar;
  if (disabled) input.disabled = true;

  const colorWrapper = document.createElement("div");
  colorWrapper.classList.add("color-input-circle-wrapper");
  colorWrapper.append(input);
  return returnEl ? colorWrapper : colorWrapper.outerHTML;
}

/**
 * Parse HTML fragment
 * @param {String} fragmentString
 * @returns {HTMLElement|NodeList}
 */
export function parseFragment(fragmentString) {
  const doc = range.createContextualFragment(fragmentString);
  if (doc.firstElementChild === doc.lastElementChild) {
    return doc.firstElementChild;
  }

  return doc.childNodes;
}

/**
 * Get placeholders for current language.
 * Using this function will only ever fetch once.
 * @param {String} return value for this key, if 'falsy' will return whole object.
 */
export const getPlaceholder = async (str) => {
  const placeholderLanguage = document.documentElement.lang === "en" ? "default" : `/${document.documentElement.lang}`;
  if (!window.placeholders) {
    await fetchPlaceholders(placeholderLanguage);
  }
  // property is created in fetchPlaceholders
  const placeholderObj = await window.placeholders[placeholderLanguage];
  return str ? placeholderObj[str] : placeholderObj;
};

// slugify removes dots, allows trailing dashes
export function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([^\w]+|\s+)/g, "-")
    .replace(/--+/g, "-")
    .toLowerCase();
}

// slugify allows dots, trims dashes
export function slugifyFilename(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([^\w.]+|\s+)/g, "-")
    .replace(/--+/g, "-")
    .replace(/(^-+|-+$|(?<=\.)-+|-+(?=\.))/g, "")
    .toLowerCase();
}

export function safeText(text) {
  return text.replace(/&/g, "&amp;").replace(/\n/g, "&#10;").replace(/\//g, "&#47;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const sanitizedNameRegex = /[`\\~!@#$%*+=[\]{};:'",<.>/?]/g;
export const sanitizeName = (name) => name.replace(sanitizedNameRegex, "");

export function getThumbnail(el) {
  fetch(el.dataset.src)
    .then((res) => {
      if (res.ok) {
        return res.text();
      }

      return false;
    })
    .then((res) => {
      if (res) {
        let src = res.split("\n").find((line) => line.trim().startsWith('<meta property="og:image" content="'));
        if (src) {
          src = src.replace('<meta property="og:image" content="', "").replace('">', "").trim();
          el.innerHTML = `<img src="${src}" alt="thumbnail" loading="lazy"/>`;
        }
      }
    })
    .catch(() => null);
}

function createTabsNavBreadcrumbs(breadcrumbs) {
  if (!breadcrumbs?.length) {
    return '<div class="breadcrumbs"></div>';
  }

  return `
    <div class="breadcrumbs">
      ${breadcrumbs
    .map(({ name, href }, index) => {
      const lastItem = index === breadcrumbs.length - 1;
      return lastItem ? `<h1>${name}</h1>` : `<a href="${href}">${name}</a>`;
    })
    .join("<span>›</span>")}
    </div>
  `;
}

export function createTabs({ block, breadcrumbs, tabs, renderOptions, defaultTab = 0 }) {
  document.body.dataset.tabsStatus = "loading";
  const blockContent = block.cloneNode(true);
  block.innerHTML = `
    <div class="tabs-wrapper">
      <div class="tabs-nav nav">
        ${createTabsNavBreadcrumbs(breadcrumbs)}
        <div class="tabs-nav-items"></div>
        <div class="tabs-default-nav-items">
        </div>
      </div>

      <div class="tabs-content">

        <aside class="tabs-aside">
          <ul>
          </ul>
        </aside>

        <div class="tabs-content-container details"></div>
      </div>
    </div>
  `;

  const defaultNavItems = block.querySelector(".tabs-default-nav-items");
  if (renderOptions?.projectDetails?.customLiveUrl) {
    const openLink = parseFragment(`<a id="open-button" class="button action primary" href="/redirect?url=${renderOptions.projectDetails.customLiveUrl}" target="_blank">Open</a>`);
    openLink.onclick = () => window?.zaraz?.track("click site open");
    defaultNavItems.append(openLink);
  }

  const historyArray = [];
  const onHistoryPopArray = [];
  function pushHistory(path) {
    historyArray.push(path);
    const url = new URL(path, window.location.origin);
    const searchParams = new URLSearchParams(window.location.search);
    const newSearchParams = new URLSearchParams();
    if (searchParams.has("highlight")) {
      newSearchParams.set("highlight", searchParams.get("highlight"));
    }
    url.search = newSearchParams.toString();
    window.history.pushState({}, "", url.toString());
  }

  function replaceHistory(path) {
    historyArray.pop();
    historyArray.push(path);
    const url = new URL(path, window.location);
    url.search = window.location.search;
    window.history.replaceState({}, "", url);
  }
  const navItems = block.querySelector(".tabs-nav-items");
  const asideItems = block.querySelector(".tabs-aside ul");
  const details = block.querySelector(".details");

  const functionalTabs = tabs.filter((tab) => tab && !tab?.section && !tab?.isLink);
  const tabToSelect = functionalTabs.find(({ href }) => window.location.pathname.startsWith(href)) || functionalTabs[defaultTab];

  let previousSection = "";

  for (const tab of tabs) {
    if (tab.hidden) continue;
    if (tab?.section) {
      const asideItem = document.createElement("li");
      asideItem.classList.add("title");
      asideItem.textContent = tab.name;
      asideItems.append(asideItem);
      previousSection = tab.name.toLowerCase();
      continue;
    }
    if (!tab || !tab.href) continue;
    const asideItem = document.createElement("li");
    const tabSlug = slugify(tab.name);
    asideItem.innerHTML = `
      <a href="${tab.href}" ${tab.target ? `target="${tab.target}"` : ""} class="button action secondary">
        <span class="icon">
          <img alt="icon" src="${tab.iconSrc}" loading="lazy"></span>
          ${tab.name}
        </span>
      </a>
    `;
    asideItems.append(asideItem);

    if (tab.isLink) {
      continue;
    }

    const tabNavContent = document.createElement("div");
    tabNavContent.classList.add("tab-nav-content", tabSlug);
    if (previousSection) tabNavContent.classList.add(`${previousSection}-section`);
    navItems.append(tabNavContent);

    const tabContent = document.createElement("div");
    tabContent.classList.add("tab-content", tabSlug);
    if (previousSection) tabContent.classList.add(`${previousSection}-section`);
    details.append(tabContent);

    const asideItemLink = asideItem.querySelector("a");
    tab.clickHandler = async (event, historyState = "push") => {
      event.preventDefault();

      // if there are unsaved changes, you can't change the page unless you confirm
      const tabsAside = block.querySelector("aside.tabs-aside");
      if (!confirmUnsavedChanges(tabsAside)) {
        return;
      }
      document.body.dataset.tabsStatus = "loading";

      [...asideItems.children]?.forEach((child) => {
        // remove is-selected from all links
        child?.firstElementChild?.classList.remove("is-selected");
      });
      asideItemLink.classList.add("is-selected");

      // empty old content
      [...details.children, ...navItems.children]?.forEach((child) => {
        child.classList.remove("is-selected");
        [...child.children]?.forEach((grandChild) => {
          if (grandChild?.dataset?.noUnload === "true") {
            return;
          }
          grandChild.remove();
        });
      });

      tabContent.classList.add("is-selected");
      tabNavContent.classList.add("is-selected");

      if (historyState === "replace") {
        // window.history.replaceState({}, '', tab.href);
        let link = tab.href;
        if (window.location.pathname.startsWith(tab.href)) {
          link = window.location.pathname;
        }
        // keep the query params
        if (window.location.search) {
          link += window.location.search;
        }
        replaceHistory(link);
      }
      if (historyState === "push") {
        pushHistory(tab.href);
      }
      // reset callbacks
      onHistoryPopArray.length = 0;
      // keep renderTab at the end. So tab behavior still works if there is an error in renderTab
      await tab.renderTab({
        nav: tabNavContent,
        container: tabContent,
        renderOptions,
        pushHistory,
        historyArray,
        replaceHistory,
        onHistoryPopArray,
      });
      document.body.dataset.tabsStatus = "loaded";
    };
    asideItemLink.addEventListener("click", tab.clickHandler);

    tab.asideLink = asideItemLink;
  }

  // select tab from path / first tab
  tabToSelect.clickHandler({ preventDefault: () => {} }, "replace");

  // back handling
  window.addEventListener("popstate", () => {
    const tour = document.getElementById("expedition-popover-content");
    if (tour) {
      tour.querySelector(".expedition-popover-close-btn").click();
    }

    historyArray.pop();
    const navigateToPath = historyArray.at(-1) || window.location.pathname;

    const tabToNavigateTo = functionalTabs.find((tab) => navigateToPath.startsWith(tab.href));

    if (tabToNavigateTo && !tabToNavigateTo.asideLink.classList.contains("is-selected")) {
      tabToNavigateTo.clickHandler({ preventDefault: () => {} }, null);
    }

    onHistoryPopArray.forEach((callback) => {
      callback(navigateToPath);
    });
  });

  return { originalBlock: blockContent };
}

// Custom click event that we can tell was called by code.
// Use this instead of checking for isTrusted when button is used in cypress tests.
// Cypress cannot trigger a click event with isTrusted = true
export const syntheticClickEvent = new CustomEvent("click", {
  bubbles: true,
  detail: { synthetic: true },
});

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = "en";
  decorateTemplateAndTheme();
  const main = doc.querySelector("main");
  if (main) {
    decorateMain(main);
    document.body.classList.add("appear");
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector("main");
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector("header"));
  loadFooter(doc.querySelector("footer"));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => import("./delayed.js"), 3000);
  // load anything that can be postponed to the latest here
}

let timer;
const debounce = (fn) => {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  timer = setTimeout(() => fn(), 500);
};

const isPageReady = () =>
  [...document.body.querySelectorAll("[data-section-status]")].every((element) => element.dataset.sectionStatus === "loaded") &&
  (!document.body.dataset.tabsStatus || document.body.dataset.tabsStatus === "loaded") &&
  [...document.body.querySelectorAll("[data-block-status]")].every((element) => element.dataset.blockStatus === "loaded") &&
  document.body.querySelectorAll('[aria-label="loading"], .skeletons').length === 0 &&
  document.body.querySelector("header:empty") === null &&
  document.body.querySelector("footer:empty") === null &&
  (document.body.classList.contains("is-authenticated") || document.body.classList.contains("is-anonymous"));

const setPageLoaded = () => {
  document.body.classList.remove("page-loading");
  document.body.classList.add("page-loaded");
  document.dispatchEvent(new CustomEvent("page:loaded"));
};

function onPageLoaded() {
  document.body.classList.remove("page-loaded");
  document.body.classList.add("page-loading");

  debounce(() => {
    if (isPageReady()) {
      setPageLoaded();
    } else {
      onPageLoaded();
    }
  });
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  if (readQueryParams().highlight) highlightElement();
  loadDelayed();
  onPageLoaded();
}

const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

// eslint-disable-next-line func-names
window.history.pushState = function (...args) {
  onPageLoaded();
  return originalPushState.apply(this, args);
};

// eslint-disable-next-line func-names
window.history.replaceState = function (...args) {
  onPageLoaded();
  return originalReplaceState.apply(this, args);
};

export function toValidPropertyName(email) {
  return email.replaceAll("@", "(AT)").replaceAll(".", "(DOT)");
}

// prevents a reload when an unsaved change is detected
window.addEventListener("beforeunload", (event) => {
  if (!confirmUnsavedChanges(document.querySelector("aside.tabs-aside"))) {
    event.preventDefault();
  }
});

loadPage();
