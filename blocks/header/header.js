import { loadFragment } from '../fragment/fragment.js';
import { onAuthenticated } from '../../scripts/scripts.js';

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await loadFragment('/nav');

  // decorate nav DOM
  const nav = document.createElement('nav');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  block.innerHTML = '';
  block.append(nav);

  const home = block.querySelector('a[href="/"]');
  if (home) {
    home.title = 'Home';
  }

  if (window.location.pathname !== '/') {
    home.insertAdjacentHTML('beforeend', '<span>Self Service</span>');
  }

  block.addEventListener('click', async (event) => {
    const identifier = event.target.getAttribute('href');
    if (identifier === '#signin') {
      event.preventDefault();
      window.auth0Client.loginWithRedirect();
    } else if (identifier === '#signout') {
      event.preventDefault();
      window.auth0Client.logout();
    }
  });

  onAuthenticated(async () => {
    const dashboard = document.querySelector('header a[href="/dashboard"]');
    if (dashboard) {
      const { picture } = await window.auth0Client.getUser();
      dashboard.insertAdjacentHTML('afterbegin', `
          <img alt="Avatar" referrerpolicy="no-referrer" src="${picture}">
      `);
    }
  });
}
