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

const SCRIPT_API = 'https://eds-self-service-scripts.onrender.com';
// const SCRIPT_API = window.location.hostname === 'localhost'
//   ? 'http://localhost:4000' : 'https://eds-self-service-scripts.onrender.com';

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

const toggleAutoTour = () => {
  onAuthenticated(async () => {
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

    await fetch(`${SCRIPT_API}/userSettings`, {
      headers: { ...headers, 'content-type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ userSettings: { showAutoTour: !showAutoTour } }),
    }).catch((error) => console.error(error));
  });
};

const { tour } = window.expedition.js;

const startTour = (isAutoTour = false) => {
  const { pathname } = window.location;
  const switchCase = (startPath, endPath = undefined) => {
    if (endPath === undefined) {
      return pathname.startsWith(startPath);
    }
    return pathname.startsWith(startPath) && pathname.endsWith(endPath);
  };

  function getTour(siteTour, closeOnClick = true, autoTour = showAutoTour) {
    /* if (closeOnClick) {
      document.getElementsByTagName('main')[0].addEventListener('click', () => {
        tour().destroy();
        if (showAutoTour) {
          setTimeout(() => {
            startTour(showAutoTour);
          }, 800);
        }
      });

      document.getElementsByTagName('header')[0].addEventListener('click', () => {
        tour().destroy();
        if (showAutoTour) {
          setTimeout(() => {
            startTour(showAutoTour);
          }, 800);
        }
      });
    } */
    return generateTour(tour, toggleAutoTour, autoTour, siteTour()).start();
  }

  switch (true) {
    case switchCase('/site/', '/overview'):
      getTour(siteOverviewTour);
      break;
    case switchCase('/site/', '/pages'):
      getTour(sitePagesTour);
      break;
    case switchCase('/site/', '/monitoring'):
      getTour(siteMonitoringTour);
      break;
    case switchCase('/site/', '/emails'):
      getTour(campaignEmailsTour);
      break;
    case switchCase('/site/', '/analytics'):
      getTour(campaignEmailAnalyticsTour);
      break;
    case switchCase('/site/', '/settings'):
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
      getTour(createTemplateTour, false);
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
      if (!isAutoTour) {
        getTour(noTourAvailable, false);
      }
      break;
  }
};

onAuthenticated(async () => {
  const token = await window.auth0Client.getTokenSilently();
  const headers = { authorization: `bearer ${token}` };

  await fetch(`${SCRIPT_API}/userSettings`, {
    headers: { ...headers, 'content-type': 'application/json' },
    method: 'GET',
  }).then((res) => res.json()).then((data) => {
    showAutoTour = data.showAutoTour ?? true;
    if (showAutoTour) {
      startTour(showAutoTour);
    }
  });
});

export { startTour, toggleAutoTour };
