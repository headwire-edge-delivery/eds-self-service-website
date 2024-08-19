export default function homepageTour({ projects, showAutoTour }) {
  const userIsAuthenticated = document.body.classList.contains('is-authenticated');
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        window.location.href = '/dashboard';
      }
    },
    steps: [
      {
        title: 'Welcome to Fast Sites',
        description: 'The easiest way to create and manage your website.<br /> We will guide you through the process.',
      },
      {
        title: 'You are logged in',
        description: 'As you are already logged in, you can directly go to the dashboard to manage your websites.',
        element: '#dashboard-button',
        skip: !userIsAuthenticated || !projects?.google?.length,
        elementEvent: () => {},
      },
      {
        title: 'Sign in',
        description: 'Currently you are not logged in. To create or edit a Site, you need to sign in.',
        element: 'a[href="#signin"]',
        skip: userIsAuthenticated,
        elementEvent: () => {},
      },
      {
        title: 'Choose a Template',
        description: 'You can choose between different templates to start your website.<br />If you want to see a preview, click on the template.',
        element: '.template-wrapper',
        align: 'center',
        elementEvent: () => {},
      },
      {
        title: 'WKND Template',
        description: 'Perfect Starter for a Blog or Magazine Website.',
        element: '#wknd-template',
        elementEvent: () => {},
      },
      {
        title: 'Sports Template',
        description: 'Ideal Starter for a Service or Product Website.',
        element: '#sports-template',
        elementEvent: () => {},
      },
      {
        title: 'Club Template',
        description: 'Your Best Choice for a Club Website.',
        element: '#club-template',
        elementEvent: () => {},
      },
    ],
  };

  return tourData;
}
