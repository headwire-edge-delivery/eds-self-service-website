export default function noTourAvailable() {
  const tourData = {
    steps: [
      {
        title: 'No Tour Available for this page',
        description: 'We are sorry, but there is currently no Tour available for this page.',
        showProgress: false,
      },
    ],
  };

  return tourData;
}
