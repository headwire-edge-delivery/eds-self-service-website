import { loadCSS } from './aem.js';

loadCSS(`${window.hlx.codeBasePath}/styles/dialogs.css`);

export const createDialog = (contentDiv, buttons, {
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

  dialog.setLoading = (toggleOn = true, customLoadingText = 'Loading…') => {
    if (toggleOn) {
      dialog.classList.add('loading');
      dialogContent.classList.add('skeleton');
    } else {
      dialog.classList.remove('loading');
      dialogContent.classList.remove('skeleton');
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

export const alertDialog = (text = 'ALERT') => createPromiseDialog(text);

export const confirmDialog = (text = 'Are you sure?') => createPromiseDialog(text, true);
