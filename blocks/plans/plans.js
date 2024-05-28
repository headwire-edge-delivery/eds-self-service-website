/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const dialog = document.createElement('dialog');
  dialog.className = 'plans-dialog';
  const dialogWrapper = document.createElement('div');
  dialogWrapper.className = 'plans-dialog-wrapper';
  dialog.append(dialogWrapper);

  dialogWrapper.append(...block.children);
  document.body.append(dialog);

  const close = document.createElement('button');
  close.className = 'button close';
  close.innerHTML = '&#x2715;';
  close.ariaLabel = 'close';
  dialogWrapper.append(close);

  close.onclick = () => {
    dialog.close();
  };

  dialog.querySelector('a[href="#signin"]').onclick = (e) => {
    window?.zaraz?.track('click login plans', { url: window.location.href });

    e.preventDefault();
    window.auth0Client.loginWithRedirect();
  };

  document.dispatchEvent(new CustomEvent('block-plans:ready'));
}
