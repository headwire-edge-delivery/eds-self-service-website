/* eslint-disable max-len */

import { writeQueryParams } from '../../libs/queryParams/queryParams.js';
import { createDialog } from '../../scripts/dialogs.js';
import { SCRIPT_API, OOPS, waitForAuthenticated, createTabs, parseFragment, highlightElement, safeText, toValidPropertyName } from '../../scripts/scripts.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';
import renderCampaignsAnalytics from './renderCampaignsAnalytics.js';
import renderCampaignsAudience from './renderCampaignsAudience.js';
import renderCampaignsOverview from './renderCampaignsOverview.js';
import renderSettingsGeneral from './renderSettingsGeneral.js';
import renderSiteAnalytics from './renderSiteAnalytics.js';
import renderSiteOverview from './renderSiteOverview.js';
import renderSitePages from './renderSitePages.js';
import renderSiteSpreadsheets from './renderSiteSpreadsheets.js';
import renderSiteSEO from './renderSiteSEO.js';

/**
 * MARK: Decorate
 * @param {Element} block
 */
export default async function decorate(block) {
  await waitForAuthenticated();
  const [, path, siteSlug] = window.location.pathname.split('/');
  const darkAlleyVariation = block.classList.contains('dark-alley');
  const pathname = `/${path}/${siteSlug}`;
  const token = await window.auth0Client.getTokenSilently();
  const user = await window.auth0Client.getUser();

  const authHeaders = { authorization: `Bearer ${token}` };
  const authHeadersWithBody = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const [siteDetailsReq, versionInfoReq] = await Promise.all([
    await fetch(`${SCRIPT_API}/${darkAlleyVariation ? 'darkAlleyList' : 'list'}/${siteSlug}`, { headers: authHeaders }).catch(() => null),
    await fetch(`${SCRIPT_API}/${darkAlleyVariation ? 'daUpdateProject' : 'updateProject'}/checkUpdates/${siteSlug}`, { headers: authHeaders }).catch(() => null),
  ]);

  if (siteDetailsReq?.status === 404) {
    block.innerHTML = `<div class="centered-message"><p>Project "${siteSlug}" not found. Create it <a href="/">here!</a></p></div>`;
    return;
  }
  if (!siteDetailsReq?.ok) {
    block.innerHTML = `<div class="centered-message"><p>${OOPS}<p></div>`;
    return;
  }

  const [siteDetails, versionInfo] = await Promise.all([siteDetailsReq.json().catch(() => null), versionInfoReq?.json().catch(() => null)]);

  if (!siteDetails) {
    block.innerHTML = `<div class="centered-message"><p>${OOPS}<p></div>`;
    return;
  }

  createTabs({
    block,
    defaultTab: 0,
    breadcrumbs: [
      { name: 'Dashboard', href: '/dashboard/sites' },
      { name: siteDetails.project.projectName, href: pathname },
    ],
    renderOptions: {
      projectDetails: siteDetails.project,
      token,
      user,
      siteSlug,
      pathname,
      authHeaders,
      authHeadersWithBody,
      versionInfo,
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
        name: 'Sheets',
        href: `${pathname}/sheets`,
        iconSrc: '/icons/sheets.svg',
        renderTab: renderSiteSpreadsheets,
        hidden: darkAlleyVariation,
      },
      {
        name: 'SEO',
        href: `${pathname}/seo`,
        iconSrc: '/icons/seo.svg',
        renderTab: renderSiteSEO,
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
        name: 'Emails',
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

  const emailAsPropertyName = toValidPropertyName(user.email);
  if (!siteDetails?.project?.hideUpdatePrompts?.[emailAsPropertyName] && versionInfo?.updateAvailable) {
    const levelParagraphMap = {
      patch: 'Patch updates contain smaller features and bugfixes. These are safe to update without any issues.',
      minor: 'Minor updates contain minor features and bugfixes. These are safe to update without any issues.',
      major:
        'Major updates contain large features and bugfixes. These may require you to change how you author your content & blocks. When updating a major version check that everything still looks as intended.',
    };

    const dialogContent = `
      <h3>An update is available for your project</h3>
      <p>A <strong>${versionInfo.updateLevel}</strong> update is available for your project. We recommend you update whenever possible to ensure everything is working as intended.</p>
      <p>${levelParagraphMap[versionInfo.updateLevel]}</p>
      <p>Disabling update prompts will prevent this message from appearing again. This applies to this and all subsequent updates.</p>
    `;
    const showMeButton = parseFragment('<button class="button action primary show">Show me</button>');
    // yes dialog already has a close button, but I think it's good to have one here.
    // Without one it might make users think the only options are update or don't show again.
    const closeButton = parseFragment('<button class="button action secondary close-alt">Close</button>');
    const dontShowAgainButton = parseFragment(
      `<button class="button action secondary dont-show">Disable update prompts for ${safeText(siteDetails?.project?.projectName) || 'this project'}</button>`,
    );

    const updateDialog = createDialog(dialogContent, [showMeButton, closeButton, dontShowAgainButton]);

    showMeButton.onclick = () => {
      const settingsTabLink = block.querySelector('a[href$="/settings"]');
      if (!settingsTabLink) return;
      updateDialog.close();
      if (!settingsTabLink.classList.contains('is-selected')) settingsTabLink.click();
      writeQueryParams({ highlight: '#updates' });
      highlightElement();
    };

    closeButton.onclick = () => updateDialog.close();

    dontShowAgainButton.onclick = async () => {
      updateDialog.close();
      const togglePromptsResponse = await fetch(`${SCRIPT_API}/disableUpdatePrompts/${siteSlug}?forceState=true`, {
        method: 'POST',
        headers: authHeaders,
      }).catch(() => null);
      if (togglePromptsResponse?.ok) {
        showToast(`You will no longer be prompted to update ${safeText(siteDetails?.project?.projectName) || 'this project'} when a new version is available.`);
        siteDetails.project.hideUpdatePrompts[emailAsPropertyName] = true;
      } else {
        showErrorToast('Disabling update prompts failed. Please try again or contact support.');
      }
    };
  }
}
