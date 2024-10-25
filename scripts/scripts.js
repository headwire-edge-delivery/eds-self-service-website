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
} from './aem.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
const range = document.createRange();

export const SCRIPT_API = window.location.hostname === 'localhost'
  ? 'http://localhost:4000' : 'https://api.kestrelone.com';
export const EMAIL_WORKER_API = 'https://emails.headwire.workers.dev';
export const OOPS = 'Oops ! Something went wrong …';

export const defaultBranch = 'main';
export const projectRepo = 'headwire-self-service';
export const daProjectRepo = 'da-self-service';

if (window.location.hostname === 'localhost') {
  document.addEventListener('mousedown', (event) => {
    if (event.target.matches('a[href^="/redirect?url="]')) {
      event.target.setAttribute('href', event.target.getAttribute('href').replace('/redirect?url=', ''));
    }
  });
}

// extra four, for separators
export const slugMaxLength = 63
  - defaultBranch.length
  - projectRepo.length
  - 4;

const daClassRegex = /\b(is-headwire|is-adobe|is-test-user)\b/i;
export function hasDarkAlleyAccess() {
  return daClassRegex.test(document.body.className);
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function dateToRelativeString(date) {
  if (!(date instanceof Date)) {
    date = new Date(date); // eslint-disable-line no-param-reassign
  }
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  const intervals = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count !== 0) {
      return rtf.format(-count, interval.unit);
    }
  }

  return rtf.format(0, 'second'); // Default to "now"
}
export function dateToRelativeSpan(date, className, lang = [], format = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}) {
  if (!(date instanceof Date)) {
    date = new Date(date); // eslint-disable-line no-param-reassign
  }
  const span = document.createElement('span');
  span.innerText = dateToRelativeString(date);
  if (className) span.className = className;
  span.title = date.toLocaleTimeString(lang, format);
  return span;
}

export function onAuthenticated(cb) {
  if (document.body.classList.contains('is-authenticated')) {
    cb();
  } else {
    document.addEventListener('auth0:authenticated', () => {
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
  }).then((response) => response.json()).catch(() => null);

  if (data) {
    cachedUserSettings = data;
  }
  return data;
}

export async function updateUserSettings(newSettingsData) {
  await waitForAuthenticated();

  const token = await window.auth0Client.getTokenSilently();
  const headers = { authorization: `bearer ${token}`, 'content-type': 'application/json' };

  const response = await fetch(`${SCRIPT_API}/userSettings`, {
    headers,
    method: 'POST',
    body: JSON.stringify({ userSettings: newSettingsData }),
  });
  if (response.ok) {
    cachedUserSettings = newSettingsData;
    return true;
  }
  return false;
}

export const KESTREL_ONE = 'kestrelone.com';

export function getExpirationTime(expirationDays) {
  const date = new Date();
  date.setDate(date.getDate() + expirationDays);

  return date.getTime();
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
  const placeholderLanguage = document.documentElement.lang === 'en'
    ? 'default'
    : `/${document.documentElement.lang}`;
  if (!window.placeholders) {
    await fetchPlaceholders(placeholderLanguage);
  }
  // property is created in fetchPlaceholders
  const placeholderObj = await window.placeholders[placeholderLanguage];
  return str ? placeholderObj[str] : placeholderObj;
};

export function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([^\w]+|\s+)/g, '-')
    .replace(/--+/g, '-')
    // .replace(/(^-+|-+$)/g, "")
    .toLowerCase();
}

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
        let src = res.split('\n').find((line) => line.trim().startsWith('<meta property="og:image" content="'));
        if (src) {
          src = src.replace('<meta property="og:image" content="', '').replace('">', '').trim();
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
      ${breadcrumbs.map(({ name, href }, index) => {
    const lastItem = index === breadcrumbs.length - 1;
    return lastItem ? `<h1>${name}</h1>` : `<a href="${href}">${name}</a>`;
  }).join('<span>›</span>')}
    </div>
  `;
}

export function createTabs({
  block,
  breadcrumbs,
  tabs,
  renderOptions,
}) {
  const blockContent = block.cloneNode(true);
  block.innerHTML = `
    <div class="tabs-wrapper">
      <div class="tabs-nav nav">
        ${createTabsNavBreadcrumbs(breadcrumbs)}
        <div class="tabs-nav-items"></div>
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

  const historyArray = [];
  const onHistoryPopArray = [];
  function pushHistory(path) {
    historyArray.push(path);
    window.history.pushState({}, '', path);
  }
  function replaceHistory(path) {
    historyArray.pop();
    historyArray.push(path);
    window.history.replaceState({}, '', path);
  }
  const navItems = block.querySelector('.tabs-nav-items');
  const asideItems = block.querySelector('.tabs-aside ul');
  const details = block.querySelector('.details');

  const functionalTabs = tabs.filter((tab) => tab && !tab?.section && !tab?.isLink);
  const tabToSelect = functionalTabs.find(({ href }) => window
    .location.pathname.startsWith(href)) || functionalTabs[0];

  let previousSection = '';

  for (const tab of tabs) {
    if (tab?.section) {
      const asideItem = document.createElement('li');
      asideItem.classList.add('title');
      asideItem.textContent = tab.name;
      asideItems.append(asideItem);
      previousSection = tab.name.toLowerCase();
      continue;
    }
    if (!tab || !tab.href) continue;
    const asideItem = document.createElement('li');
    const tabSlug = slugify(tab.name);
    asideItem.innerHTML = `
      <a href="${tab.href}" ${tab.target ? `target="${tab.target}"` : ''} class="button action secondary">
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

    const tabContent = document.createElement('div');
    tabContent.classList.add('tab-content', tabSlug);
    if (previousSection) tabContent.classList.add(`${previousSection}-section`);
    details.append(tabContent);

    const asideItemLink = asideItem.querySelector('a');
    tab.clickHandler = (event, historyState = 'push') => {
      event.preventDefault();

      [...asideItems.children]?.forEach((child) => {
        // remove is-selected from all links
        child?.firstElementChild?.classList.remove('is-selected');
      });
      asideItemLink.classList.add('is-selected');

      // empty old content
      navItems.replaceChildren();
      [...details.children]?.forEach((child) => {
        child.classList.remove('is-selected');
        [...child.children]?.forEach((grandChild) => {
          if (grandChild?.dataset?.noUnload === 'true') {
            return;
          }
          grandChild.remove();
        });
      });

      tabContent.classList.add('is-selected');

      if (historyState === 'replace') {
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
      if (historyState === 'push') {
        pushHistory(tab.href);
      }
      // reset callbacks
      onHistoryPopArray.length = 0;
      // keep renderTab at the end. So tab behavior still works if there is an error in renderTab
      tab.renderTab({
        nav: navItems,
        container: tabContent,
        renderOptions,
        pushHistory,
        replaceHistory,
        onHistoryPopArray,
      });
    };
    asideItemLink.addEventListener('click', tab.clickHandler);

    tab.asideLink = asideItemLink;
  }

  // select tab from path / first tab
  tabToSelect.clickHandler({ preventDefault: () => {} }, 'replace');

  // back handling
  window.addEventListener('popstate', () => {
    historyArray.pop();
    const navigateToPath = historyArray.at(-1) || window.location.pathname;

    const tabToNavigateTo = functionalTabs.find((tab) => tab.href === navigateToPath)
      || functionalTabs.find((tab) => tab.href === navigateToPath.split('/').pop()); // supports site-details version

    if (tabToNavigateTo && !tabToNavigateTo.asideLink.classList.contains('is-selected')) {
      tabToNavigateTo.clickHandler({ preventDefault: () => {} }, null);
    }

    onHistoryPopArray.forEach((callback) => {
      callback(navigateToPath);
    });
  });

  return { originalBlock: blockContent };
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
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
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
