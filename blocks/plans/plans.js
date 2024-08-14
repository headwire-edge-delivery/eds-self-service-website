/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const dialogParent = block.closest('dialog');

  if (dialogParent) {
    dialogParent.classList.add('plans-dialog');
    block.querySelector('a[href="#signin"]').onclick = (e) => {
      window?.zaraz?.track('click login plans', { url: window.location.href });

      e.preventDefault();
      window.auth0Client.loginWithRedirect();
    };
  }

  // document.dispatchEvent(new CustomEvent('block-plans:ready'));
}
