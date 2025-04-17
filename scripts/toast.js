import { loadCSS } from './aem.js';
import { OOPS, parseFragment } from './scripts.js';
import { escapeHTML } from './utils.js';

loadCSS(`${window.hlx.codeBasePath}/styles/toast.css`);

const delay = 5000;

function hideToast(toast) {
  return new Promise((res) => {
    if (!toast.parentElement) {
      res();
    } else {
      toast.ontransitionend = () => {
        toast.remove();
        res();
      };
      toast.classList.remove('is-visible');
    }
  });
}

export function showToast(text = 'Done.', type = 'success') {
  const toastContainer = document.querySelector('.toast-container') || parseFragment('<ul class="toast-container"></ul>');

  toastContainer.addEventListener('click', async (event) => {
    if (event.target.matches('.close')) {
      await hideToast(event.target.closest('li'));
    }
  });

  const toast = parseFragment(`
    <li>
        <div aria-atomic="true" role="alert" class="toast ${type}" tabindex="0">
        <span>${escapeHTML(text)}</span>
          <button class="button secondary close" aria-label="close">✕</button>
        </div>
    </li>
  `);

  toastContainer.append(toast);

  if (!toastContainer.parentElement) {
    document.body.append(toastContainer);
  }

  setTimeout(() => {
    toast.classList.add('is-visible');
  }, 1);

  let hideTimeout;

  const startHideTimer = () => {
    hideTimeout = setTimeout(() => {
      hideToast(toast);
    }, delay);
  };

  const clearHideTimer = () => {
    clearTimeout(hideTimeout);
  };

  const toastElement = toast.querySelector('.toast');
  toastElement.addEventListener('mouseenter', clearHideTimer);
  toastElement.addEventListener('mouseleave', startHideTimer);

  startHideTimer();
}

export function showErrorToast(content = OOPS) {
  const message = content.length ? content : OOPS;
  showToast(message, 'error');
}
