/* eslint-disable max-len */

import {
  SCRIPT_API, OOPS,
  waitForAuthenticated,
  createTabs,
} from '../../scripts/scripts.js';
import renderCampaignsAnalytics from './renderCampaignsAnalytics.js';
import renderCampaignsAudience from './renderCampaignsAudience.js';
import renderCampaignsOverview from './renderCampaignsOverview.js';
import renderSettingsGeneral from './renderSettingsGeneral.js';
import renderSiteAnalytics from './renderSiteAnalytics.js';
import renderSiteOverview from './renderSiteOverview.js';
import renderSitePages from './renderSitePages.js';

/**
 * MARK: Decorate
 * @param {Element} block
 */
export default async function decorate(block) {
  block.innerHTML = '<img src="/icons/loading.svg" alt="loading" loading="lazy"/>';

  await waitForAuthenticated();
  const [, path, siteSlug] = window.location.pathname.split('/');
  const darkAlleyVariation = block.classList.contains('dark-alley');
  const pathname = `/${path}/${siteSlug}`;
  const token = await window.auth0Client.getTokenSilently();
  const user = await window.auth0Client.getUser();

  const authHeaders = { authorization: `Bearer ${token}` };
  const authHeadersWithBody = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const siteDetailsReq = await fetch(`${SCRIPT_API}/${darkAlleyVariation ? 'darkAlleyList' : 'list'}/${siteSlug}`, {
    headers: authHeaders,
  }).catch(() => null);
  if (siteDetailsReq.status === 404) {
    block.innerHTML = `<div class="centered-message"><p>Project "${siteSlug}" not found. Create it <a href="/">here!</a></p></div>`;
    return;
  }
  if (!siteDetailsReq?.ok) {
    block.innerHTML = `<div class="centered-message"><p>${OOPS}<p></div>`;
    return;
  }

  const siteDetails = await siteDetailsReq.json().catch(() => null);
  if (!siteDetails) {
    block.innerHTML = `<div class="centered-message"><p>${OOPS}<p></div>`;
    return;
  }

  createTabs({
    block,
    breadcrumbs: [{ name: 'Dashboard', href: '/dashboard/sites' }, { name: siteDetails.project.projectName, href: pathname }],
    renderOptions: {
      projectDetails: siteDetails.project, token, user, siteSlug, pathname, authHeaders, authHeadersWithBody,
    },
    tabs: [
      {
        section: true,
        name: 'Site',
      },
      {
        name: 'Overview',
        href: `${pathname}/overview`,
        iconSrc: '/icons/template.svg',
        renderTab: renderSiteOverview,
      },
      {
        name: 'Pages',
        href: `${pathname}/pages`,
        iconSrc: '/icons/web.svg',
        renderTab: renderSitePages,
      },
      {
        name: 'Web analytics',
        href: `${pathname}/web-analytics`,
        iconSrc: '/icons/monitoring.svg',
        renderTab: renderSiteAnalytics,
      },
      {
        section: true,
        name: 'Campaigns',
      },
      {
        name: 'Overview',
        href: `${pathname}/emails`,
        iconSrc: '/icons/email.svg',
        renderTab: renderCampaignsOverview,
      },
      {
        name: 'Audience',
        href: `${pathname}/audience`,
        iconSrc: '/icons/audience.svg',
        renderTab: renderCampaignsAudience,
      },
      {
        name: 'Campaign analytics',
        href: `${pathname}/campaign-analytics`,
        iconSrc: '/icons/analytics.svg',
        renderTab: renderCampaignsAnalytics,
      },
      {
        section: true,
        name: 'Settings',
      },
      {
        name: 'General',
        href: `${pathname}/settings`,
        iconSrc: '/icons/settings.svg',
        renderTab: renderSettingsGeneral,
      },
      {
        name: 'Theme',
        href: `/theme/${siteSlug}`,
        iconSrc: '/icons/palette.svg',
        isLink: true,
        target: '_blank',
      },
    ],
  });
}
