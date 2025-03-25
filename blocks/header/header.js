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

  nav.querySelector('a[href="#back"]').classList.add('button');
  nav.querySelector('a[href="#back"]').id = 'back-button';
  nav.querySelector('a[href="#select-template"]').classList.add('primary');
  nav.querySelector('a[href="#select-template"]').id = 'select-template-button';
  nav.querySelector('a[href="#signout"]').innerHTML = '<img src="/icons/logout.svg" loading="lazy" alt="Sign out" class="icon" />';

  block.innerHTML = '';
  block.append(nav);

  const home = block.querySelector('a[href="/"]');
  if (home) {
    home.title = 'Home';
  }

  if (window.location.pathname !== '/') {
    home.insertAdjacentHTML('beforeend', '<span>Fast Sites</span>');
  }

  block.addEventListener('click', async (event) => {
    const identifier = event.target.closest('a')?.getAttribute('href');
    if (identifier === '#signin') {
      window?.zaraz?.track('click login header');
      event.preventDefault();
      window.auth0Client.loginWithRedirect();
    } else if (identifier === '#signout') {
      window?.zaraz?.track('click logout header');
      window?.zaraz?.set('user', undefined);
      event.preventDefault();
      delete window.localStorage.sessionExpiration;
      window.auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });
    }
  });

  onAuthenticated(async () => {
    const { picture } = await window.auth0Client.getUser();
    nav.querySelector('a[href="#signout"]').insertAdjacentHTML(
      'beforebegin',
      `
      <a class="button" title="Account" href="/dashboard/account"><img class="icon" alt="Avatar" referrerpolicy="no-referrer" src="${picture}" loading="lazy"></a>
    `,
    );

    const dashboard = block.querySelector('header a[href="/dashboard/sites"]');
    if (dashboard) {
      dashboard.id = 'dashboard-button';
      dashboard.title = 'Sites';
      dashboard.innerHTML = `
          <img class="icon" alt="Dashboard - Sites" src="/icons/dashboard.svg" loading="lazy">
          <span>Sites</span>
      `;
    }
  });

  // help button wrapper
  nav.children[0].insertAdjacentHTML(
    'afterend',
    '<div class="section help-button-section" data-section-status="loaded"><div class="default-content-wrapper"><p class="button-container"></p></div></div>',
  );

  document.dispatchEvent(new CustomEvent('header:ready'));
}
