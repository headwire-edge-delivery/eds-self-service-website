import {
  dashboardAccountTour,
  dashboardSitesTour,
  homepageTour,
  noTourAvailable,
  createTemplateTour,
  wkndTemplateTour,
  sportsTemplateTour,
  clubTemplateTour,
  siteOverviewTour,
  sitePagesTour,
  siteMonitoringTour,
  campaignEmailsTour,
  campaignEmailAnalyticsTour,
  emailTour,
  settingsGeneralTour,
  settingsThemeTour,
} from './index.js';
import generateTour from './generateTour.js';

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
  return Array.from(elements).every((el) => el.getAttribute('data-block-status') === 'loaded');
}

function observeBlocks(myFunction) {
  const loadedObserver = new MutationObserver((mutationsList, observer) => {
    if (checkAllLoaded()) {
      myFunction();
      observer.disconnect();
    }
  });

  loadedObserver.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-block-status'],
  });
}

const toggleAutoTour = (SCRIPT_API) => {
  onAuthenticated(async () => {
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

    await fetch(`${SCRIPT_API}/userSettings`, {
      headers: { ...headers, 'content-type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ userSettings: { showAutoTour: !showAutoTour } }),
    // eslint-disable-next-line no-console
    }).catch((error) => console.error(error));
  });
};

const { tour } = window.expedition.js;

function getTour(SCRIPT_API, siteTour) {
  return setTimeout(() => {
    // eslint-disable-next-line max-len
    generateTour(tour, toggleAutoTour, SCRIPT_API, showAutoTour, siteTour(userData)).start();
  }, 100);
}

const fetchUserSettings = async (SCRIPT_API) => {
  const token = await window.auth0Client.getTokenSilently();
  const headers = { authorization: `bearer ${token}`, 'content-type': 'application/json' };

  const response = await fetch(`${SCRIPT_API}/userSettings`, {
    headers,
    method: 'GET',
  });
  const data = await response.json();
  return data;
};

const startTour = (SCRIPT_API, isAutoTour = false, showDisableTour = false) => {
  window.scrollTo(0, 0);
  if (isAutoTour) {
    onAuthenticated(async () => {
      const data = await fetchUserSettings(SCRIPT_API);
      showAutoTour = data.showAutoTour;
      userData = data;
      if (showAutoTour) {
        if (checkAllLoaded()) {
          startTour(SCRIPT_API, false, true);
        } else {
          observeBlocks(() => {
            startTour(SCRIPT_API, false, true);
          });
        }
      }
    });
  } else {
    onAuthenticated(async () => {
      const data = await fetchUserSettings(SCRIPT_API);
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
        getTour(SCRIPT_API, siteOverviewTour);
        break;
      case switchCase('/da-site/', '/overview'):
        getTour(SCRIPT_API, siteOverviewTour);
        break;
      case switchCase('/site/', '/pages'):
        getTour(SCRIPT_API, sitePagesTour);
        break;
      case switchCase('/da-site/', '/pages'):
        getTour(SCRIPT_API, sitePagesTour);
        break;
      case switchCase('/site/', '/monitoring'):
        getTour(SCRIPT_API, siteMonitoringTour);
        break;
      case switchCase('/da-site/', '/monitoring'):
        getTour(SCRIPT_API, siteMonitoringTour);
        break;
      case switchCase('/site/', '/emails'):
        getTour(SCRIPT_API, campaignEmailsTour);
        break;
      case switchCase('/da-site/', '/emails'):
        getTour(SCRIPT_API, campaignEmailsTour);
        break;
      case switchCase('/site/', '/analytics'):
        getTour(SCRIPT_API, campaignEmailAnalyticsTour);
        break;
      case switchCase('/da-site/', '/analytics'):
        getTour(SCRIPT_API, campaignEmailAnalyticsTour);
        break;
      case switchCase('/site/', '/settings'):
        getTour(SCRIPT_API, settingsGeneralTour);
        break;
      case switchCase('/da-site/', '/settings'):
        getTour(SCRIPT_API, settingsGeneralTour);
        break;
      case switchCase('/theme/'):
        getTour(SCRIPT_API, settingsThemeTour);
        break;
      case switchCase('/email/'):
        getTour(SCRIPT_API, emailTour);
        break;
      case switchCase('/dashboard/sites'):
        getTour(SCRIPT_API, dashboardSitesTour);
        break;
      case switchCase('/dashboard/account'):
        getTour(SCRIPT_API, dashboardAccountTour);
        break;
      case switchCase('/templates/', '/create'):
        getTour(SCRIPT_API, createTemplateTour);
        break;
      case switchCase('/templates/', '/create/progress'):
        if (!showAutoTour) {
          getTour(SCRIPT_API, noTourAvailable);
        }
        break;
      case switchCase('/templates/wknd-template'):
        getTour(SCRIPT_API, wkndTemplateTour);
        break;
      case switchCase('/templates/sports-template'):
        getTour(SCRIPT_API, sportsTemplateTour);
        break;
      case switchCase('/templates/club-template'):
        getTour(SCRIPT_API, clubTemplateTour);
        break;
      case pathname === '/' || switchCase('/templates/'):
        getTour(SCRIPT_API, homepageTour);
        break;
      default:
        if (!showAutoTour) {
          getTour(SCRIPT_API, noTourAvailable);
        }
        break;
    }
  }
};

export { startTour, toggleAutoTour };
