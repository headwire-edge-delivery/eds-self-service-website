import { dashboardSitesTour, dashboardAccountTour } from './dashboard.js';
import {
  createTemplateTour,
  wkndTemplateTour,
  sportsTemplateTour,
  clubTemplateTour,
} from './templates.js';
import homepageTour from './homepage.js';
import noTourAvailable from './noTour.js';
import {
  siteOverviewTour,
  sitePagesTour,
  siteMonitoringTour,
} from './site.js';
import {
  campaignEmailsTour, campaignEmailsAudienceTour, campaignEmailAnalyticsTour, emailTour,
} from './email.js';
import { settingsGeneralTour, settingsThemeTour } from './settings.js';
import adminTour from './admin.js';
import SEOTour from './seo.js';
import generateTour from './generateTour.js';
import { getUserSettings } from '../scripts/scripts.js';

function onAuthenticated(cb) {
  if (document.body.classList.contains('is-authenticated')) {
    cb();
  } else {
    document.addEventListener('auth0:authenticated', () => {
      cb();
    });
  }
}

let showAutoTour = false;
let userData = {};

// Function to check if all elements are loaded
function checkAllLoaded() {
  const elements = document.querySelectorAll('[data-block-status]');
  const loading = document.querySelectorAll('.is-selected [aria-label="loading"], .site-details [aria-label="loading"]');
  const helpBtn = document.querySelector('#help-btn');

  if (loading.length > 0) {
    setTimeout(checkAllLoaded, 100);
    if (helpBtn) {
      helpBtn.style.display = 'none';
      helpBtn.setAttribute('data-loaded', 'false');
    }
    return false;
  }

  setTimeout(() => {
    if (helpBtn) {
      helpBtn.style.display = 'flex';
      helpBtn.setAttribute('data-loaded', 'true');
    }
  }, 500);
  return Array.from(elements).every((el) => el.getAttribute('data-block-status') === 'loaded');
}

// Force data-loaded to "true" after 8 seconds, regardless of loading images
setTimeout(() => {
  const helpBtn = document.querySelector('#help-btn');
  helpBtn.style.display = 'flex';
  helpBtn.setAttribute('data-loaded', 'true');
}, 8000);

// Function to observe blocks
function observeBlocks(myFunction) {
  const helpBtn = document.querySelector('#help-btn');
  const loadedObserver = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
      if (mutation.attributeName === 'data-loaded' && mutation.target.id === 'help-btn') {
        if (helpBtn && helpBtn.getAttribute('data-loaded') === 'true') {
          myFunction();
          observer.disconnect();
        }
        return;
      }

      if (checkAllLoaded()) {
        myFunction();
        observer.disconnect();
      }
    });
  });

  // Observe the body for data-block-status changes
  loadedObserver.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-block-status'],
  });

  // Observe helpBtn for data-loaded changes if it exists
  if (helpBtn) {
    loadedObserver.observe(helpBtn, {
      attributes: true,
      attributeFilter: ['data-loaded'],
    });
  }
}

observeBlocks(() => {});

const { tour } = window.expedition.js;

function getTour(siteTour) {
  return setTimeout(() => {
    // eslint-disable-next-line max-len
    generateTour(tour, showAutoTour, siteTour(userData)).start();
  }, 100);
}

const startTour = (isAutoTour, showDisableTour = false) => {
  if (isAutoTour) {
    onAuthenticated(async () => {
      const data = await getUserSettings();
      showAutoTour = data?.showAutoTour;
      userData = data;
      if (showAutoTour) {
        if (checkAllLoaded()) {
          startTour(false, true);
        } else {
          observeBlocks(() => {
            startTour(false, true);
          });
        }
      }
    });
  } else {
    window.scrollTo(0, 0);
    onAuthenticated(async () => {
      const data = await getUserSettings();
      userData = data;
    });

    if (showDisableTour) {
      showAutoTour = true;
    } else {
      showAutoTour = false;
    }

    const { pathname } = window.location;
    const switchCase = (startPath, endPath = undefined) => {
      if (endPath === undefined) {
        return pathname.startsWith(startPath);
      }
      return pathname.startsWith(startPath) && pathname.endsWith(endPath);
    };

    switch (true) {
      case switchCase('/site/', '/overview'):
        getTour(siteOverviewTour);
        break;
      case switchCase('/da-site/', '/overview'):
        getTour(siteOverviewTour);
        break;
      case switchCase('/site/', '/pages'):
        getTour(sitePagesTour);
        break;
      case switchCase('/da-site/', '/pages'):
        getTour(sitePagesTour);
        break;
      case switchCase('/site/', '/web-analytics'):
        getTour(siteMonitoringTour);
        break;
      case switchCase('/da-site/', '/web-analytics'):
        getTour(siteMonitoringTour);
        break;
      case switchCase('/site/', '/emails'):
        getTour(campaignEmailsTour);
        break;
      case switchCase('/da-site/', '/emails'):
        getTour(campaignEmailsTour);
        break;
      case switchCase('/da-site/', '/audience'):
        getTour(campaignEmailsAudienceTour);
        break;
      case switchCase('/site/', '/audience'):
        getTour(campaignEmailsAudienceTour);
        break;
      case switchCase('/site/', '/seo'):
        getTour(SEOTour);
        break;
      case switchCase('/site/', '/campaign-analytics'):
        getTour(campaignEmailAnalyticsTour);
        break;
      case switchCase('/da-site/', '/campaign-analytics'):
        getTour(campaignEmailAnalyticsTour);
        break;
      case switchCase('/site/', '/settings'):
        getTour(settingsGeneralTour);
        break;
      case switchCase('/da-site/', '/settings'):
        getTour(settingsGeneralTour);
        break;
      case switchCase('/theme/'):
        getTour(settingsThemeTour);
        break;
      case switchCase('/email/'):
        getTour(emailTour);
        break;
      case switchCase('/dashboard/sites'):
        getTour(dashboardSitesTour);
        break;
      case switchCase('/dashboard/account'):
        getTour(dashboardAccountTour);
        break;
      case switchCase('/dashboard/admin'):
        getTour(adminTour);
        break;
      case switchCase('/templates/', '/create'):
        getTour(createTemplateTour);
        break;
      case switchCase('/templates/', '/create/progress'):
        if (!showAutoTour) {
          getTour(noTourAvailable);
        }
        break;
      case switchCase('/templates/wknd-template'):
        getTour(wkndTemplateTour);
        break;
      case switchCase('/templates/sports-template'):
        getTour(sportsTemplateTour);
        break;
      case switchCase('/templates/club-template'):
        getTour(clubTemplateTour);
        break;
      case pathname === '/' || switchCase('/templates/'):
        getTour(homepageTour);
        break;
      default:
        if (!showAutoTour) {
          getTour(noTourAvailable);
        }
        break;
    }
  }
};

export default startTour;
