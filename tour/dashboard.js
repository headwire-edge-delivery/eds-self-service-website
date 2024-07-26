function dashboardSitesTour() {
  const projects = document.querySelectorAll('#my-sites-overview li').length;

  const tour = {
    steps: [
      {
        title: 'My Sites Overview',
        description: `Here you can see all your sites (Currently ${projects} Sites). <br /> Click on a site to see more details.`,
        element: '#my-sites-overview',
        skip: !projects,
      },
      {
        title: 'Filter My Sites Overview',
        description: 'Here you can filter the sites by name. <br /> Just type the name of the site you want to filter.',
        element: '.filter',
        skip: !projects,
      },
      {
        title: 'Create a new Site',
        description: 'If you want to create a new site, click here. <br /> It will take you to the template selection where you can choose a template.',
        element: '#create-new-button',
      },
    ],
  };

  return tour;
}

function dashboardAccountTour() {
  // get the text inside the span of #current-plan
  const currentPlan = document.querySelector('#current-plan').textContent;
  const tour = {
    steps: [
      {
        title: 'Account Details',
        description: 'Here you can see your account details.',
        element: '.account-details',
      },
      {
        title: 'Disable the Help Button',
        description: 'If you want to get rid of the help button, uncheck this box.',
        element: '#tour-checkbox',
      },
      {
        title: 'Upgrade your Plan',
        description: 'If you want to upgrade your free plan, please Contact us.',
        element: '.plans-dialog-wrapper',
        skip: currentPlan !== 'Free',
      },
      {
        title: 'Edit your Account',
        description: 'If you want to edit your account, click here. <br /> It will take you directly to google account settings.',
        element: '#edit-account-button',
      },
    ],
  };

  return tour;
}

export { dashboardSitesTour, dashboardAccountTour };
