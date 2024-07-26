function wkndTemplateTour() {
  const tour = {
    disableActiveInteraction: true,
    steps: [
      {
        title: 'Welcome to the WKND Template',
        description: 'The WKND Template is a perfect starter for a Blog or Magazine Website.',
      },
      {
        title: 'Preview of the WKND Template',
        description: 'Here you can see a preview of the WKND Template.',
        element: 'body',
      },
      {
        title: 'Want to start with the WKND Template?',
        description: 'If you want to create a Site with the WKND Template, continue here.',
        element: '#select-template-button',
      },
      {
        title: 'Want to go back?',
        description: 'Click here to go back to the Overview.',
        element: '#back-button',
      },
    ],
  };

  return tour;
}

function sportsTemplateTour() {
  const tour = {
    steps: [
      {
        title: 'Welcome to the Sports Template',
        description: 'Ideal Starter for a Service or Product Website.',
      },
      {
        title: 'Preview of the Sports Template',
        description: 'Here you can see a preview of the Sports Template.',
        element: 'body',
      },
      {
        title: 'Want to start with the Sports Template?',
        description: 'If you want to create a Site with the Sports Template, continue here.',
        element: '#select-template-button',
      },
      {
        title: 'Want to go back?',
        description: 'Click here to go back to the Overview.',
        element: '#back-button',
      },
    ],
  };

  return tour;
}

function clubTemplateTour() {
  const tour = {
    steps: [
      {
        title: 'Welcome to the Club Template',
        description: 'Your Best Choice for a Club Website.',
      },
      {
        title: 'Preview of the Club Template',
        description: 'Here you can see a preview of the Club Template.',
        element: 'body',
      },
      {
        title: 'Want to start with the Club Template?',
        description: 'If you want to create a Site with the Club Template, continue here.',
        element: '#select-template-button',
      },
      {
        title: 'Want to go back?',
        description: 'Click here to go back to the Overview.',
        element: '#back-button',
      },
    ],
  };

  return tour;
}

export { wkndTemplateTour, sportsTemplateTour, clubTemplateTour };
