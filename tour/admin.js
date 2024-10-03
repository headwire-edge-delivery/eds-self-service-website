function adminTour() {
  const tourData = {
    steps: [
      {
        title: 'Admin Panel',
        description: 'Use the Admin Panel to track any user activity on the site',
      },
      {
        title: 'Users',
        description: 'Displays all signed in users',
        element: '.users',
      },
      {
        title: 'User activity',
        description: 'Display user activity in details',
        element: 'button[data-user]',
        side: 'left',
      },
      {
        title: 'Anonymous activity',
        description: 'Recent activity of anonymous users',
        element: '.anonymous',
      },
    ],
  };

  return tourData;
}

export default adminTour;
