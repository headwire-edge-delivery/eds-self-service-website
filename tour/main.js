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
  campaignEmailsAudienceTour,
  campaignEmailAnalyticsTour,
  emailTour,
  settingsGeneralTour,
  settingsThemeTour,
} from './index.js';
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

// const toggleAutoTour = (SCRIPT_API, setTo = !showAutoTour) => new Promise((resolve, reject) => {
//   onAuthenticated(async () => {
//     const token = await window.auth0Client.getTokenSilently();
//     const headers = { authorization: `bearer ${token}` };

//     await fetch(`${SCRIPT_API}/userSettings`, {
//       headers: { ...headers, 'content-type': 'application/json' },
//       method: 'POST',
//       body: JSON.stringify({ userSettings: { showAutoTour: setTo } }),
//       // eslint-disable-next-line no-console
//     })
//       .then((response) => {
//         if (response.ok) {
//           resolve(response);
//         } else {
//           reject(response);
//         }
//       })
//       .catch((error) => {
//         // eslint-disable-next-line no-console
//         console.error(error);
//         reject();
//       });
//   });
// });

const { tour } = window.expedition.js;

function getTour(siteTour) {
  return setTimeout(() => {
    // eslint-disable-next-line max-len
    generateTour(tour, showAutoTour, siteTour(userData)).start();
  }, 100);
}

// const fetchUserSettings = async (SCRIPT_API) => {
//   if (cachedUserSettings) {
//     return cachedUserSettings;
//   }
//   const token = await window.auth0Client.getTokenSilently();
//   const headers = { authorization: `bearer ${token}`, 'content-type': 'application/json' };

//   const response = await fetch(`${SCRIPT_API}/userSettings`, {
//     headers,
//     method: 'GET',
//   });
//   const data = await response.json();
//   cachedUserSettings = data;
//   return data;
// };

// export function updateCachedUserData(newUserData) {
//   cachedUserSettings = { ...cachedUserSettings, ...newUserData };
// }

// eslint-disable-next-line import/prefer-default-export
export const startTour = (isAutoTour = false, showDisableTour = false) => {
  window.scrollTo(0, 0);
  if (isAutoTour) {
    onAuthenticated(async () => {
      const data = await getUserSettings();
      showAutoTour = data.showAutoTour;
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
      case switchCase('/site/', '/monitoring'):
        getTour(siteMonitoringTour);
        break;
      case switchCase('/da-site/', '/monitoring'):
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
      case switchCase('/site/', '/analytics'):
        getTour(campaignEmailAnalyticsTour);
        break;
      case switchCase('/da-site/', '/analytics'):
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
