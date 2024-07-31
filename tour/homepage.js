export default function homepageTour() {
  const userIsAuthenticated = document.body.classList.contains('is-authenticated');
  const tourData = {
    steps: [
      {
        title: 'Welcome to Fast Sites',
        description: 'The easiest way to create and manage your website.<br /> We will guide you through the process.',
      },
      {
        title: 'You are logged in',
        description: 'As you are already logged in, you can directly go to the dashboard to manage your websites.',
        element: '#dashboard-button',
        skip: !userIsAuthenticated,
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
      {
        title: 'Get Help',
        description: 'If you ever need help, click here. <br /> This will give you a quick guided tour of the current page.',
        element: '#help-btn',
      },
    ],
  };

  return tourData;
}
