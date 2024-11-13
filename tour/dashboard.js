import { hasDarkAlleyAccess } from '../scripts/scripts.js';

function dashboardSitesTour({ showAutoTour }) {
  const hasDarkAlley = hasDarkAlleyAccess();
  const driveProjectListQuery = '.sites-list-google-drive > .my-sites-overview';
  const darkAlleyProjectListQuery = '.sites-list-dark-alley > .my-sites-overview';
  const tourData = {
    showDisableTour: true,
    onFinished: () => {
      if (showAutoTour) {
        if (document.querySelector(driveProjectListQuery)?.children?.length) {
          // has projects, show account settings
          document.querySelector('main .dashboard.block aside a[href$="/account"]')?.click();
        } else {
          // user has no projects, and is doing the auto tour. Create a site with them!
          window.location.pathname = '/';
        }
      }
    },
    steps: [
      {
        title: 'Create a new Site',
        description: 'If you want to create a new site, click here. <br /> It will take you to the template selection where you can choose a template.',
        element: '#create-new-button',
        side: 'left',
      },
      {
        title: 'My Sites Overview (Dark Alley)',
        description: `Here you can see all your Dark Alley sites (Currently ${document.querySelector(darkAlleyProjectListQuery)?.getAttribute('data-totalitems')} Sites). <br /> Click on a site to see more details.`,
        element: darkAlleyProjectListQuery,
        skip: !document.querySelector(darkAlleyProjectListQuery)?.children?.length || !hasDarkAlley,
      },
      {
        title: 'My Sites Overview',
        description: `Here you can see all your sites (Currently ${document.querySelector(driveProjectListQuery)?.getAttribute('data-totalitems')} Sites). <br /> Click on a site to see more details.`,
        element: driveProjectListQuery,
        skip: !document.querySelector(driveProjectListQuery)?.children?.length,
      },
      {
        title: 'Filter My Sites Overview',
        description: 'Here you can filter the sites by name. <br /> Just type the name of the site you want to filter.',
        element: '.filter',
        skip: !document.querySelector(driveProjectListQuery)?.children?.length
        && !document.querySelector(darkAlleyProjectListQuery)?.children?.length,
      },
      {
        title: 'Let\'s create a Website!',
        description: 'You don\'t have any sites yet. Let\'s create one! <br /> Click here to create a new site.',
        skip: document.querySelector(driveProjectListQuery)?.children?.length > 0 || !showAutoTour,
      },
    ],
  };

  return tourData;
}

function dashboardAccountTour({ showAutoTour }) {
  const currentPlan = document.querySelector('#current-plan').textContent;
  const driveProjectListQuery = '#google-drive-section > ul';
  const tourData = {
    onFinished: () => {
      // we cannot check for children length anymore, as it is not loaded
      if (showAutoTour) {
        document.querySelector('#toggle-auto-tour-button').click();
      }
    },
    steps: [
      {
        title: 'Edit your Account',
        description: 'If you want to edit your account, click here. <br /> It will take you directly to google account settings.',
        element: '#edit-account-button',
        side: 'right',
        destroyOnClicked: false,
      },
      {
        title: 'Account Details',
        description: 'Here you can see your account details.',
        element: '.account-details',
        destroyOnClicked: false,
      },
      {
        title: 'Disable or Enable the Auto Tour?',
        description: showAutoTour ? 'You can enable or disable the Auto Tour here.' : 'If you enable the Auto Tour, it will guide you through the Website. <br /> It will display the Tour automatically on every Page.',
        element: '#toggle-auto-tour-button',
        destroyOnClicked: false,
      },
      {
        title: 'Upgrade your Plan',
        description: 'If you want to upgrade your free plan, please Contact us.',
        element: '.plans.block',
        skip: currentPlan !== 'Free',
        destroyOnClicked: false,
      },
      {
        title: 'Delete your Account',
        description: 'If you really want to delete your account, click here. <br /> If you delete your account, all your sites that exclusively belong to you will be deleted too. <br /> If you have shared sites, they will be removed from your account, but not deleted. <br /> You can always re-join to Fast Sites again.',
        element: '#delete-account-button',
        destroyOnClicked: true,
        side: 'top',
      },
      {
        title: 'Delete all Projects',
        description: 'If you really want to delete <strong>all</strong> your projects, click here. <br /> This will delete all your projects that are exclusively yours. <br /> If you have shared projects, they will not be deleted.',
        element: '#delete-all-projects-button',
        destroyOnClicked: true,
        side: 'top',
      },
      {
        title: 'Need Help?',
        description: 'If you ever need help, click here. <br /> This will give you a quick guided tour of the current page.',
        element: '#help-btn',
        skip: !showAutoTour,
      },
      {
        title: 'You\'re ready to go!',
        description: 'You now have all the information you need to get started.',
        skip: !showAutoTour
          || (!document.querySelector(driveProjectListQuery)?.children?.length && showAutoTour),
      },
    ],
  };

  return tourData;
}

export { dashboardSitesTour, dashboardAccountTour };
