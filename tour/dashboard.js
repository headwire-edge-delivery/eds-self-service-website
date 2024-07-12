import { disableTourButton, disableTour } from './shared.js';

const { driver } = window.driver.js;

const enableTour = localStorage.getItem('enableTour') === 'true';

const driverObj = driver({
  showProgress: true,
  onDestroyed: () => {
    driverObj.highlight(disableTour);
  },
  onPopoverRender: (popover) => disableTourButton(popover),
  steps: [
    {
      popover: {
        title: 'Animated Tour Example',
        description: 'Here is the code example showing animated tour. Lets walk you through it.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#edit-account-button',
      popover: {
        title: 'Edit your Account',
        description: 'If you want to edit your account, click here.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'code .line:nth-child(2)',
      popover: {
        title: 'Importing CSS',
        description: 'Import the CSS which gives you the default styling for popover and overlay.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: 'code .line:nth-child(4) span:nth-child(7)',
      popover: {
        title: 'Create Driver',
        description: 'Simply call the driver function to create a driver.js instance',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: 'code .line:nth-child(18)',
      popover: {
        title: 'Start Tour',
        description: 'Call the drive method to start the tour and your tour will be started.',
        side: 'top',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Happy Coding',
        description: 'And that is all, go ahead and start adding tours to your applications.',
      },
    },
  ],
});

if (enableTour) {
  driverObj.drive();
}
