function dashboardSitesTour({ projects, showAutoTour }) {
  const hasDarkAlley = document.body.classList.contains('is-headwire') || document.body.classList.contains('is-adobe');
  const tourData = {
    showDisableTour: true,
    onFinished: () => {
      if (projects?.google?.length && showAutoTour) {
        window.location.href = document.querySelector('#my-sites-overview li a').href;
      } else if (!projects?.google?.length && showAutoTour) {
        window.location.href = '/dashboard/account';
      }
    },
    steps: [
      {
        title: 'Create a new Site',
        description: 'If you want to create a new site, click here. <br /> It will take you to the template selection where you can choose a template.',
        element: '#create-new-button',
      },
      {
        title: 'My Sites Overview (Dark Alley)',
        description: `Here you can see all your Dark Alley sites (Currently ${projects?.darkAlley?.length} Sites). <br /> Click on a site to see more details.`,
        element: '#dark-alley-section',
        skip: !projects?.darkAlley?.length || !hasDarkAlley,
      },
      {
        title: 'My Sites Overview',
        description: `Here you can see all your sites (Currently ${projects?.google?.length} Sites). <br /> Click on a site to see more details.`,
        element: '#google-drive-section',
        skip: !projects?.google?.length,
      },
      {
        title: 'Filter My Sites Overview',
        description: 'Here you can filter the sites by name. <br /> Just type the name of the site you want to filter.',
        element: '.filter',
        skip: !projects?.google?.length,
      },
    ],
  };

  return tourData;
}

function dashboardAccountTour({ projects, showAutoTour }) {
  const currentPlan = document.querySelector('#current-plan').textContent;
  const hasProjects = !!projects?.google?.length;
  const tourData = {
    onFinished: () => {
      if (!projects?.google?.length && showAutoTour) {
        window.location.href = '/';
      } else if (showAutoTour) {
        document.querySelector('#toggle-auto-tour-button').click();
      }
    },
    steps: [
      {
        title: 'Edit your Account',
        description: 'If you want to edit your account, click here. <br /> It will take you directly to google account settings.',
        element: '#edit-account-button',
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
        title: 'Need Help?',
        description: 'If you ever need help, click here. <br /> This will give you a quick guided tour of the current page.',
        element: '#help-btn',
        skip: !showAutoTour,
      },
      {
        title: 'You\'re ready to go!',
        description: 'You now have all the information you need to get started.',
        skip: !showAutoTour || (!hasProjects && showAutoTour),
      },
      {
        title: 'Let\'s create a Website!',
        description: 'You don\'t have any sites yet. Let\'s create one! <br /> Click here to create a new site.',
        skip: hasProjects || !showAutoTour,
      },
    ],
  };

  return tourData;
}

export { dashboardSitesTour, dashboardAccountTour };
