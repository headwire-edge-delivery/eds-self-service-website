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
  siteOverviewTour, sitePagesTour, siteSheetsTour, siteMonitoringTour,
} from './site.js';
import {
  campaignEmailsTour,
  campaignEmailsAudienceTour,
  campaignEmailAnalyticsTour,
  emailTour,
} from './email.js';
import { settingsGeneralTour, settingsThemeTour } from './settings.js';
import adminTour from './admin.js';
import SEOTour from './seo.js';
import generateTour from './generateTour.js';
import { getUserSettings } from '../scripts/scripts.js';

const { tour } = window.expedition.js;

const button = document.createElement('button');
button.id = 'help-btn';
button.innerHTML = '<img src="/icons/help.svg" loading="lazy" alt="help" class="icon" />';
button.classList.add('button');
button.title = 'Help';

let showAutoTour = false;
let userData = {};

document.addEventListener('user:autotour', ({ detail }) => {
  userData.showAutoTour = detail.showAutoTour;
  showAutoTour = userData.showAutoTour;
});

const render = async () => {
  if (button.parentElement) {
    return;
  }

  document.querySelector('header .help-button-section .button-container').append(button);
  userData = await getUserSettings();
  showAutoTour = userData?.showAutoTour;
};

const waitForDialogToClose = (callback) => {
  const initialUrl = window.location.href;
  let isCancelled = false;
  const { history } = window;
  let observer;
  let handleUrlChange;
  let escPressed = false;
  let checkState;

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const trackEscPress = (event) => {
    if (event.key === 'Escape') {
      escPressed = true;
    }
  };

  const trackEscRelease = (event) => {
    if (event.key === 'Escape') {
      escPressed = false;
      checkState();
    }
  };

  const cleanup = () => {
    observer.disconnect();
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', handleUrlChange);
    window.removeEventListener('keydown', trackEscPress);
    window.removeEventListener('keyup', trackEscRelease);
  };

  handleUrlChange = () => {
    isCancelled = true;
    cleanup();
  };

  checkState = () => {
    if (isCancelled) return;

    const urlChanged = window.location.href !== initialUrl;
    const dialogClosed = document.getElementsByClassName('display-dialog').length === 0;

    if (urlChanged) {
      cleanup();
    } else if (dialogClosed) {
      if (!escPressed) {
        cleanup();
        callback();
      }
    }
  };

  observer = new MutationObserver(checkState);
  observer.observe(document.body, { childList: true, subtree: true });

  history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };

  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };

  window.addEventListener('popstate', handleUrlChange);
  window.addEventListener('keydown', trackEscPress);
  window.addEventListener('keyup', trackEscRelease);

  checkState();
};

const getTour = (siteTour) => setTimeout(() => {
  if (document.getElementsByClassName('display-dialog').length > 0) {
    waitForDialogToClose(() => {
      generateTour(tour, showAutoTour, siteTour(userData)).start();
    });
  } else {
    generateTour(tour, showAutoTour, siteTour(userData)).start();
  }
}, 100);

const startTour = (isAutoTour, showDisableTour = false) => setTimeout(() => {
  // Tour is already running
  if (document.getElementById('expedition-popover-content')) {
    return;
  }

  if (isAutoTour) {
    if (!document.body.classList.contains('is-anonymous') && showAutoTour) {
      startTour(false, true);
    }
  } else {
    window.scrollTo(0, 0);

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
      case switchCase('/site/', '/sheets'):
        getTour(siteSheetsTour);
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
}, 100);

button.onclick = () => {
  startTour(false);
};

document.addEventListener('page:loaded', async () => {
  await render();
  startTour(true, true);
});
