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
 * Renders an animated loading skeleton for a given type
 * @param {String} type
 */
export function renderSkeleton(type) {
  if (type === 'site-overview') {
    return `
      <div aria-label="loading">
        <div style="display: flex;gap: 32px;">
            <div style="display: flex;flex-wrap: wrap;gap: 32px;align-items: stretch;justify-content: center;">
                ${[...new Array(4)].map(() => '<div style="height: 100px;flex:1;min-width: 200px;max-width: 300px;width: 100%;" class="skeleton"></div>').join('')}
            </div>
            <div style="min-width: 40%;max-width: 40%;" class="skeleton"></div>
        </div>
      </div>
    `;
  }
  if (type === 'account') {
    return `
      <div aria-label="loading">
        <div style="margin-bottom: 32px; height: 80px; display: flex;flex-wrap: wrap;gap: 32px;align-items: stretch;justify-content: center;">
            ${[...new Array(3).map(() => '<div class="skeleton" style="width: 300px;"></div>').join('')]}
        </div>
      </div>
    `;
  }
  if (type === 'tracking') {
    const rows = [...Array(5)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 34px;"></div></td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 150px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'sites') {
    const cards = [...Array(6)].map(() => '<div class="skeleton" style="width: 286px; height: 376px;"></div>').join('');

    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 300px; height: 24px;margin-top: 32px;"></div>
        <div style="display: grid;grid-template-columns: repeat(auto-fill, 286px);gap: 48px;margin-top: 24px;">
            ${cards}
        </div>
      </div>
    `;
  }
  if (type === 'pages') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 200px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
        <td>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
                <div class="skeleton" style="width: 80px; height: 34px;"></div>
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
            </div>
        </td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 100px; height: 24px;margin-bottom: 24px;"></div>
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'site-analytics') {
    const boxes = [...Array(3)].map(() => '<div class="skeleton" style="height: 80px; width: 300px"></div>').join('');

    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 100px; height: 24px;margin-bottom: 24px;"></div>
        <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: center">
            ${boxes}
        </div>
        <div class="skeleton" style="height: 400px; margin-block: 32px;"></div>
      </div>
    `;
  }
  if (type === 'campaigns') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
                <div class="skeleton" style="width: 70px; height: 34px;"></div>
            </div>
        </td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <div style="display: flex; gap: 8px; margin-bottom: 24px;">
          <div class="skeleton" style="width: 100px; height: 34px;"></div>
          <div class="skeleton" style="width: 150px; height: 34px;"></div>
        </div>
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'audience') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 200px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <div class="skeleton" style="width: 80px; height: 34px;"></div>
                <div class="skeleton" style="width: 100px; height: 34px;"></div>
            </div>
        </td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'campaign-analytics') {
    const boxes = [...Array(5)].map(() => '<div class="skeleton" style="height: 80px; width: 300px"></div>').join('');

    return `
      <div aria-label="loading">
        <div style="display: flex; gap: 8px; margin-bottom: 24px;">
          <div class="skeleton" style="width: 100px; height: 34px;"></div>
          <div class="skeleton" style="width: 150px; height: 34px;"></div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: center">
            ${boxes}
        </div>
        
        <div class="skeleton" style="width: 150px; height: 24px;margin-top: 40px;margin-bottom: 24px;"></div>
        <div class="skeleton" style="height: 45px;margin-bottom: 16px;"></div>
        
        ${renderSkeleton('campaign-tracking')}
      </div>
    `;
  }
  if (type === 'campaign-tracking') {
    const rows = [...Array(5)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `).join('');

    return `
      <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 50px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
  }
  if (type === 'settings') {
    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 24px;"></div>
        <div class="skeleton" style="width: 150px; height: 20px;margin-bottom: 12px;"></div>
        <div style="display: flex; gap: 8px;">
            <div class="skeleton" style="width: 580px; height: 34px;"></div>
            <div class="skeleton" style="width: 50px; height: 34px;"></div>
        </div>
        
        <div class="skeleton" style="width: 200px; height: 24px;margin-bottom: 24px;margin-top: 40px;"></div>
        <div class="skeleton" style="width: 400px; height: 20px;margin-bottom: 12px;"></div>
        <div style="display: flex; gap: 8px;">
            <div class="skeleton" style="width: 530px; height: 34px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
        </div>
        
        <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 24px;margin-top: 40px;"></div>
        <div class="skeleton" style="width: 200px; height: 20px;margin-bottom: 12px;"></div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <div class="skeleton" style="width: 48px; height: 48px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
        </div>
        
        <div class="skeleton" style="width: 100px; height: 24px;margin-bottom: 24px;margin-top: 40px;"></div>
        <div class="skeleton" style="width: 150px; height: 34px;margin-bottom: 12px;"></div>
      </div>  
    `;
  }
  if (type === 'email-composer') {
    return `
      <div aria-label="loading" style="width: 100%;">
        <div style="display: flex; gap: 64px; height: 100%;">
            <div style="flex: 1; height: 100%;" class="skeleton"></div>
            <div style="max-width: 50%; min-width: 50%;">
                <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 16px;"></div>
                <div class="skeleton" style="height: 34px;"></div>
                <div class="skeleton" style="width: 150px; height: 24px;margin-top: 48px;margin-bottom: 16px;"></div>
                <table>
                    ${renderSkeleton('recipients')}
                </table>
            </div> 
        </div>
      </div>
    `;
  }
  if (type === 'recipients') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 34px; height: 34px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <thead>
          <tr>
              <th><div class="skeleton" style="width: 34px;height: 34px;"></div></th>
              <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
              <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
              <th</th>
          </tr>
      </thead>
      <tbody>
          ${rows}
      </tbody>
    `;
  }
  if (type === 'theme-editor') {
    const pickers = [...Array(5)].map(() => `
        <div class="skeleton" style="width: 120px; height: 20px;margin-bottom: 14px;margin-top: 24px;"></div>
        <div class="skeleton" style="height: 34px;"></div>`).join('');

    return `
      <div aria-label="loading" style="width: 100%;">
        <div style="display: flex; gap: 64px; height: 100%;">
            <div style="flex: 1; height: 100%;" class="skeleton"></div>
            <div style="max-width: 30%; min-width: 30%; height: calc(100vh - 200px);">
                <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 24px;"></div>
                <div class="skeleton" style="width: 100px; height: 20px;margin-block: 14px;"></div>
                ${pickers}
            </div> 
        </div>
      </div>
    `;
  }

  return '';
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

window.createDialog = (contentDiv, buttons, {
  open = true, onCloseFn, fullscreen, surviveClose = false,
} = {}) => {
  const dialog = document.createElement('dialog');
  dialog.classList.add('display-dialog');
  if (fullscreen) dialog.classList.add('fullscreen');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('dialog-content');
  dialog.append(dialogContent);

  dialog.renderDialog = (content, buttonsArray = []) => {
    // reset
    dialogContent.innerHTML = '';
    dialog.dataset.loadingText = 'Loading...';

    if (typeof content === 'string') {
      dialogContent.innerHTML = content;
    } else {
      dialogContent.append(content);
    }

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('dialog-button-container');
    if (Array.isArray(buttonsArray)) {
      buttonsArray.forEach((button) => {
        buttonWrapper.append(button);
        button.classList.add('button');
        if (!button.classList.contains('primary') && !button.classList.contains('destructive')) {
          button.classList.add('secondary');
        }
      });
    }

    dialogContent.append(buttonWrapper);

    const close = document.createElement('button');
    close.className = 'button close';
    close.innerHTML = '&#x2715;';
    close.ariaLabel = 'close';

    close.onclick = () => {
      dialog.close();
    };
    dialogContent.append(close);
  };
  dialog.renderDialog(contentDiv, buttons);

  dialog.setLoading = (toggleOn = true, customLoadingText = 'Loading...') => {
    if (toggleOn) {
      dialog.classList.add('loading');
    } else {
      dialog.classList.remove('loading');
    }
    dialog.dataset.loadingText = customLoadingText;
  };

  dialog.onclick = (event) => {
    if (dialog.isEqualNode(event.target)) {
      dialog.close();
    }
  };

  if (!surviveClose) {
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (typeof onCloseFn === 'function') {
        onCloseFn();
      }
    }, { once: true });
  }

  document.body.append(dialog);
  if (open) {
    dialog.showModal();
  }
  return dialog;
};

function createPromiseDialog(textContent = 'Are you sure?', withConfirm = false) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.classList.add('alert-dialog');
    const dialogContent = document.createElement('div');
    dialogContent.classList.add('dialog-content');
    dialogContent.innerHTML = `<h3 class="centered-info">${textContent}</h3>`;

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('dialog-button-container');

    function buttonPress(confirm = false) {
      dialog.close();
      dialog.remove();
      resolve(confirm);
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'button action secondary';
    closeButton.innerText = 'Close';
    closeButton.onclick = () => buttonPress(false);
    buttonWrapper.append(closeButton);

    if (withConfirm) {
      const confirmButton = document.createElement('button');
      confirmButton.className = 'button action primary';
      confirmButton.innerText = 'Confirm';
      confirmButton.onclick = () => buttonPress(true);
      buttonWrapper.append(confirmButton);
    }

    dialogContent.append(buttonWrapper);
    dialog.append(dialogContent);
    // disable closing with ESC
    dialog.oncancel = (event) => {
      event.preventDefault();
    };
    document.body.append(dialog);
    dialog.showModal();
  });
}

window.alertDialog = (text = 'ALERT') => createPromiseDialog(text);
window.confirmDialog = (text = 'Are you sure?') => createPromiseDialog(text, true);
