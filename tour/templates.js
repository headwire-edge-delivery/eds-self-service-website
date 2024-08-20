function createTemplateTour() {
  const hasDarkAlley = document.body.classList.contains('is-headwire') || document.body.classList.contains('is-adobe');
  const tourData = {
    onFinished: () => { /* prevent "do you want to disable tour?" from showing */ },
    steps: [
      {
        title: 'Create your new Website',
        description: 'Here you can create a new Website with the selected Template.',
        destroyOnClicked: false,
      },
      {
        title: 'Name your Site',
        description: 'Enter a name for your new Site.',
        element: '#site-name',
        destroyOnClicked: false,
      },
      {
        title: 'Define a Slug',
        description: 'It will be automatically generated based on the Site Name. But you can change it here. <br /> A Slug is a part of a URL which identifies a particular page on a website in a form readable by users.',
        element: '#slug-input',
        destroyOnClicked: false,
      },
      {
        title: 'Describe your Site',
        description: 'Give a short description of your Site.',
        element: '#description-input',
        destroyOnClicked: false,
      },
      {
        title: 'Dark Alley',
        description: 'By default, Google Drive is used to manage the pages. We also support Dark Alley on an experimental basis. <br /> <a href="https://da.live/docs" target="_blank">Dark Alley</a> is a powerful and flexible Content Management System from Adobe Experience Manager. <br />',
        element: '.dark-alley-label',
        destroyOnClicked: false,
        skip: !hasDarkAlley,
      },
      {
        title: 'Create your Site',
        description: 'Click here to create your new Site.',
        element: '#create-button',
        destroyOnClicked: false,
      },
    ],
  };

  return tourData;
}

function wkndTemplateTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => { /* prevent "do you want to disable tour?" from showing */ },
    steps: [
      {
        title: 'Welcome to the WKND Template',
        description: 'The WKND Template is a perfect starter for a Blog or Magazine Website.',
      },
      {
        title: 'Preview of the WKND Template',
        description: 'Here you can see a preview of the WKND Template.',
        element: '.preview',
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

  return tourData;
}

function sportsTemplateTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => { /* prevent "do you want to disable tour?" from showing */ },
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

  return tourData;
}

function clubTemplateTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => { /* prevent "do you want to disable tour?" from showing */ },
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

  return tourData;
}

export {
  createTemplateTour,
  wkndTemplateTour,
  sportsTemplateTour,
  clubTemplateTour,
};
