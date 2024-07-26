export default function noTourAvailable() {
  const tour = {
    steps: [
      {
        title: 'No Tour Available for this page',
        description: 'We are sorry, but there is currently no tour available for this page.',
        showProgress: false,
      },
    ],
  };

  return tour;
}
