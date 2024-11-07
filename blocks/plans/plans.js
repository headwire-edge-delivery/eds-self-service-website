/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.querySelectorAll('.button').forEach((button) => {
    button.classList.add('action');
  });

  const dialogParent = block.closest('dialog');

  if (dialogParent) {
    dialogParent.classList.add('plans-dialog');
    block.querySelector('a[href="#signin"]').onclick = (e) => {
      window?.zaraz?.track('click login plans');

      e.preventDefault();
      window.auth0Client.loginWithRedirect();
    };
  } else {
    block.querySelector('div').classList.add('is-selected');
  }
}
