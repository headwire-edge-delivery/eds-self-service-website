function adminTour() {
  const tourData = {
    steps: [
      {
        title: 'Admin Panel',
        description: 'Use the Admin Panel to track any user activity on the site',
      },
      {
        title: 'Web Analytics',
        description: 'Displays Web Analytics for kestrelone.com',
        element: '.analytics',
      },
      {
        title: 'Users',
        description: 'Displays all signed in users',
        element: '.known-users',
      },
      {
        title: 'Deleted users',
        description: 'Displays all users that deleted their account on kestrelone.com',
        element: '.deleted-users',
      },
      {
        title: 'User activity',
        description: 'Display user activity in details',
        element: 'button[data-user]',
        side: 'left',
      },
      {
        title: 'Anonymous activity',
        description: 'Recent activity of anonymous users and server activity',
        element: '.anonymous-users',
      },
    ],
  };

  return tourData;
}

export default adminTour;
