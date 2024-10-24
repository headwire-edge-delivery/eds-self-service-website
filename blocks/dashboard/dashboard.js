import { createTabs, waitForAuthenticated } from '../../scripts/scripts.js';
import renderAccount from './renderAccount.js';
import renderAdmin from './renderAdmin.js';
import renderSites from './renderSiteList.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  await waitForAuthenticated();
  const isAdmin = document.body.classList.contains('is-headwire') || document.body.classList.contains('is-test-user');
  const pathname = '/dashboard';

  createTabs({
    block,
    breadcrumbs: [{ name: 'Dashboard', href: `${pathname}/sites` }],
    tabs: [
      {
        name: 'Sites',
        href: `${pathname}/sites`,
        iconSrc: '/icons/web.svg',
        renderTab: renderSites,
      },
      {
        name: 'Account',
        href: `${pathname}/account`,
        iconSrc: '/icons/user.svg',
        renderTab: renderAccount,
      },
      isAdmin
        ? {
          name: 'Admin',
          href: `${pathname}/admin`,
          iconSrc: '/icons/admin.svg',
          renderTab: renderAdmin,
        }
        : null,
    ],
  });

  const accountTabContent = block.querySelector('.tab-content.account');

  // Add plans & account details
  const additionalFragments = document.querySelectorAll(
    'main > .fragment-wrapper, main > .section > .fragment-wrapper',
  );
  additionalFragments.forEach((fragment) => {
    fragment.dataset.noUnload = 'true';
    accountTabContent.append(fragment);
  });
}
