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

// extra four, for separators
export const slugMaxLength = 63
  - defaultBranch.length
  - projectRepo.length
  - 4;

const daClassRegex = /\b(is-headwire|is-adobe|is-test-user)\b/i;
export function hasDarkAlleyAccess() {
  return daClassRegex.test(document.body.className);
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

export async function createTabs({
  block,
  breadcrumbs,
  tabs,
}) {
  const blockContent = block.cloneNode(true);
  block.innerHTML = `
    <div class="tabs-wrapper">
      <div class="nav">
        ${createTabsNavBreadcrumbs(breadcrumbs)}
        <div class="tabs-nav-items"></div>
      </div>

      <div class="content">

        <aside class="tabs-aside">
          <ul>
          </ul>
        </aside>

        <div class="tabs-content details"></div>
      </div>
    </div>
  `;

  const navItems = block.querySelector('.tabs-nav-items');
  const asideItems = block.querySelector('.tabs-aside ul');
  const details = block.querySelector('.details');

  const tabToSelect = tabs.find(({ href }) => window.location.pathname.endsWith(href) || tabs[0]);

  // eslint-disable-next-line no-restricted-syntax
  for (const tab of tabs) {
    if (!tab || !tab.href) continue;
    const asideItem = document.createElement('li');
    const tabSlug = slugify(tab.name);
    asideItem.innerHTML = `
      <a href="${tab.href}" class="button action secondary">
        <span class="icon">
          <img alt="icon" src="${tab.iconSrc}" loading="lazy"></span>
          ${tab.name}
        </span>
      </a>
    `;
    asideItems.append(asideItem);

    const tabContent = document.createElement('div');
    tabContent.classList.add('tab-content', tabSlug);
    details.append(tabContent);

    const asideItemLink = asideItem.querySelector('a');
    tab.clickHandler = (event, replaceState = false) => {
      console.log('replaceState:', replaceState);
      event.preventDefault();

      [...asideItems.children]?.forEach((child) => {
        child.firstElementChild.classList.remove('is-selected');
      });
      asideItemLink.classList.add('is-selected');

      // empty old content
      navItems.replaceChildren();
      [...details.children]?.forEach((child) => {
        child.classList.remove('is-selected');
        child.replaceChildren();
      });

      tabContent.classList.add('is-selected');

      if (replaceState) {
        window.history.replaceState({}, '', tab.href);
      } else {
        window.history.pushState({}, '', tab.href);
      }
      // keep renderTab at the end. So tab behavior still works if there is an error in renderTab
      tab.renderTab({ nav: navItems, container: tabContent });
    };
    asideItemLink.addEventListener('click', tab.clickHandler);

    tab.asideLink = asideItemLink;
  }

  // select tab from path / first tab
  tabToSelect.clickHandler({ preventDefault: () => {} }, true);

  // back handling
  window.addEventListener('popstate', () => {
    console.log('\x1b[34m ~ TEST:');
    let link = asideItems.querySelector(`[href="${window.location.pathname}"]`);
    if (!link) {
      link = asideItems.querySelector(`[href$="${window.location.pathname.split('/').pop()}"]`);
    }
    if (link) {
      link.click();
    }
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
