import {
  dashboardAccountTour,
  dashboardSitesTour,
  homepageTour,
  noTourAvailable,
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

const { driver } = window.driver.js;

const startTour = () => {
  const { pathname } = window.location;
  const switchCase = (startPath, endPath = undefined) => {
    if (endPath === undefined) {
      return pathname.startsWith(startPath);
    }
    return pathname.startsWith(startPath) && pathname.endsWith(endPath);
  };

  switch (true) {
    case switchCase('/site/', '/overview'):
      generateTour(driver, siteOverviewTour()).drive();
      break;
    case switchCase('/site/', '/pages'):
      generateTour(driver, sitePagesTour()).drive();
      break;
    case switchCase('/site/', '/monitoring'):
      generateTour(driver, siteMonitoringTour()).drive();
      break;
    case switchCase('/site/', '/emails'):
      generateTour(driver, campaignEmailsTour()).drive();
      break;
    case switchCase('/site/', '/analytics'):
      generateTour(driver, campaignEmailAnalyticsTour()).drive();
      break;
    case switchCase('/site/', '/settings'):
      generateTour(driver, settingsGeneralTour()).drive();
      break;
    case switchCase('/theme/'):
      generateTour(driver, settingsThemeTour()).drive();
      break;
    case switchCase('/email/'):
      generateTour(driver, emailTour()).drive();
      break;
    case switchCase('/dashboard/sites'):
      generateTour(driver, dashboardSitesTour()).drive();
      break;
    case switchCase('/dashboard/account'):
      generateTour(driver, dashboardAccountTour()).drive();
      break;
    case switchCase('/templates/wknd-template'):
      generateTour(driver, wkndTemplateTour()).drive();
      break;
    case switchCase('/templates/sports-template'):
      generateTour(driver, sportsTemplateTour()).drive();
      break;
    case switchCase('/templates/club-template'):
      generateTour(driver, clubTemplateTour()).drive();
      break;
    case pathname === '/' || switchCase('/templates/'):
      generateTour(driver, homepageTour()).drive();
      break;
    default:
      generateTour(driver, noTourAvailable()).drive();
      break;
  }
};

export default startTour;
