export default function homepageTour() {
  const userIsAuthenticated = document.body.classList.contains('is-authenticated');
  let isMobile = window.innerWidth < 768;
  window.addEventListener('resize', () => {
    isMobile = window.innerWidth < 768;
  });

  const tourData = {
    onFinished: () => {},
    steps: [
      {
        title: 'Welcome to Fast Sites',
        description: 'The easiest way to create and manage your website.<br /> We will guide you through the process.',
      },
      {
        title: 'You are logged in',
        description: 'You are already logged in. Go to Sites to manage existing your websites.',
        element: '#dashboard-button',
        skip: !userIsAuthenticated,
        side: isMobile ? 'bottom' : 'right',
        align: isMobile ? 'center' : 'start',
      },
      {
        title: 'Sign in',
        description: 'Currently you are not logged in. To create or edit a Site, you need to sign in.',
        element: 'a[href="#signin"]',
        side: 'left',
        skip: userIsAuthenticated,
      },
      {
        title: 'Choose a Template',
        description: 'You can choose between different templates to start your website.<br />If you want to see a preview, click on the template.',
        element: '.template-wrapper',
        align: 'center',
      },
      {
        title: 'WKND Template',
        description: 'Perfect Starter for a Blog or Magazine Website.',
        element: '#wknd-template',
      },
      {
        title: 'Sports Template',
        description: 'Ideal Starter for a Service or Product Website.',
        element: '#sports-template',
      },
      {
        title: 'Club Template',
        description: 'Your Best Choice for a Club Website.',
        element: '#club-template',
      },
    ],
  };

  return tourData;
}
