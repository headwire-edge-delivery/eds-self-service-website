import { createTabs, waitForAuthenticated } from '../../scripts/scripts.js';
import renderAccount from './renderAccount.js';
import renderUserTab from './renderUsersTab.js';
import renderSites from './renderSiteList.js';
import renderAnalyticsTab from './renderAnalyticsTab.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  document.body.dataset.tabsStatus = 'loading';
  await waitForAuthenticated();
  const isAdmin = document.body.classList.contains('is-headwire') || document.body.classList.contains('is-test-user');
  const pathname = '/dashboard';

  const tabsToRender = [
    {
      section: true,
      name: 'Dashboard',
    },
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
  ];

  if (isAdmin) {
    tabsToRender.push({
      section: true,
      name: 'Admin',
    });
    tabsToRender.push({
      name: 'Analytics',
      href: `${pathname}/analytics`,
      iconSrc: '/icons/analytics.svg',
      renderTab: renderAnalyticsTab,
    });
    tabsToRender.push({
      name: 'Users',
      href: `${pathname}/users`,
      iconSrc: '/icons/admin.svg',
      renderTab: renderUserTab,
    });
  }

  createTabs({
    block,
    breadcrumbs: [{ name: 'Dashboard', href: `${pathname}/sites` }],
    tabs: tabsToRender,
  });

  const accountTabContent = block.querySelector('.tab-content.account');

  // Add plans & account details
  // eslint-disable-next-line no-restricted-syntax
  const additionalFragments = document.querySelectorAll('main > .fragment-wrapper, main > .section > .fragment-wrapper');
  additionalFragments.forEach((fragment) => {
    fragment.dataset.noUnload = 'true';
    accountTabContent.append(fragment);
  });
}
