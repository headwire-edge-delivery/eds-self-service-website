function adminTour() {
  const tourData = {
    steps: [
      {
        title: 'Users',
        description: 'Displays all signed in users',
        element: '.known-users',
      },
      {
        title: 'User activity',
        description: 'Display user activity in details',
        element: 'button[data-user]',
        side: 'left',
      },
      {
        title: 'Deleted users',
        description: 'Displays all users that deleted their account on kestrelone.com',
        element: '.deleted-users',
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
