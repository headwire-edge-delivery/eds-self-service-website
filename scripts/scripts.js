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
import helpButton from '../tour/helpButton.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list

export const SCRIPT_API = window.location.hostname === 'localhost'
  ? 'http://localhost:4000' : 'https://eds-self-service-scripts.onrender.com';
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

export function onAuthenticated(cb) {
  if (document.body.classList.contains('is-authenticated')) {
    cb();
  } else {
    document.addEventListener('auth0:authenticated', () => {
      cb();
    });
  }
}

export const KESTREL_ONE = 'kestrelone.com';

export function getExpirationTime(expirationDays, bufferTime) {
  const date = new Date();
  date.setDate(date.getDate() + expirationDays);

  return date.getTime() - bufferTime;
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

window.createDialog = (contentDiv, buttons, { open = true, onCloseFn, fullscreen } = {}) => {
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
        button.classList.add('button', 'secondary');
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
  dialog.onclose = () => {
    dialog.remove();
    if (typeof onCloseFn === 'function') {
      onCloseFn();
    }
  };
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
    dialogContent.innerHTML = `<h3 class="centered-info" >${textContent}</h3>`;

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

helpButton(SCRIPT_API);
