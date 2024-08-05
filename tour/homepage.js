export default function homepageTour() {
  const userIsAuthenticated = document.body.classList.contains('is-authenticated');
  const tourData = {
    onFinished: () => {
      if (userIsAuthenticated) {
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
        skip: !userIsAuthenticated,
        destroyOnClicked: true,
      },
      {
        title: 'Choose a Template',
        description: 'You can choose between different templates to start your website.<br />If you want to see a preview, click on the template.',
        element: '.template-wrapper',
        align: 'center',
        destroyOnClicked: true,
      },
      {
        title: 'WKND Template',
        description: 'Perfect Starter for a Blog or Magazine Website.',
        element: '#wknd-template',
        destroyOnClicked: true,
      },
      {
        title: 'Sports Template',
        description: 'Ideal Starter for a Service or Product Website.',
        element: '#sports-template',
        destroyOnClicked: true,
      },
      {
        title: 'Club Template',
        description: 'Your Best Choice for a Club Website.',
        element: '#club-template',
        destroyOnClicked: true,
      },
    ],
  };

  return tourData;
}
