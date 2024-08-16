function dashboardSitesTour({ projects, showAutoTour }) {
  const hasDarkAlley = document.body.classList.contains('is-headwire') || document.body.classList.contains('is-adobe');
  const tourData = {
    showDisableTour: !!projects?.google?.length,
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

function dashboardAccountTour({ showAutoTour }) {
  const currentPlan = document.querySelector('#current-plan').textContent;
  const tourData = {
    onFinished: () => {
    },
    steps: [
      {
        title: 'Account Details',
        description: 'Here you can see your account details.',
        element: '.account-details',
      },
      {
        title: 'Upgrade your Plan',
        description: 'If you want to upgrade your free plan, please Contact us.',
        element: '.plans.block',
        skip: currentPlan !== 'Free',
      },
      {
        title: 'Edit your Account',
        description: 'If you want to edit your account, click here. <br /> It will take you directly to google account settings.',
        element: '#edit-account-button',
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
        skip: !showAutoTour,
      },
    ],
  };

  return tourData;
}

export { dashboardSitesTour, dashboardAccountTour };
