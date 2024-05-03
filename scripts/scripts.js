import {
  sampleRUM,
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
} from './aem.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list

export const SCRIPT_API = window.location.hostname === 'localhost'
  ? 'http://localhost:4000' : 'https://eds-self-service-scripts.onrender.com';
export const WORKER_API = 'https://emails.headwire.workers.dev';

export const OOPS = 'Oops ! Something went wrong …';

export const defaultBranch = 'main';
export const projectRepo = 'headwire-self-service';

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
  document.head.querySelector('link[rel="icon"]').href = '/icons/headwire.svg';

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
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

// wake up script
if (window.location.pathname === '/') {
  fetch(`${SCRIPT_API}/wakeup`);
}

window.createDialog = (contentDiv, buttons, { open, onCloseFn } = { open: true }) => {
  const dialog = document.createElement('dialog');
  dialog.classList.add('display-dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('dialog-content');
  dialog.append(dialogContent);

  dialog.renderDialog = (contentDiv, buttons) => {
    // reset
    dialogContent.innerHTML = '';
    dialog.dataset.loadingText = 'Loading...';

    if (typeof contentDiv === 'string') {
      dialogContent.innerHTML = contentDiv;
    } else {
      dialogContent.append(contentDiv);
    }

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('dialog-button-container');
    if (Array.isArray(buttons)) {
      buttons.forEach((button) => {
        buttonWrapper.append(button);
        button.classList.add('button');
      });
    }
    const closeButton = document.createElement('button');
    closeButton.classList.add('button', 'close');
    closeButton.innerText = 'Close';
    closeButton.onclick = () => {
      dialog.close();
    };
    buttonWrapper.prepend(closeButton);
    dialogContent.append(buttonWrapper);
  };
  dialog.renderDialog(contentDiv, buttons);

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
