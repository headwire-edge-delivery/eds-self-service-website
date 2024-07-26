function campaignEmailsTour() {
  const tour = {
    steps: [
      {
        title: 'Emails',
        description: 'Emails serves as your toolkit for crafting impactful communication in your online endeavors tailored for various purposes, from newsletters to promotional campaigns streamlining your email creation process.',
      },
      {
        title: 'Emails',
        description: 'A list of all available emails.',
        element: '.emails',
      },
      {
        title: 'Edit or Open your Email',
        description: 'You can Edit your Email in our Editor or Open a Preview in a new tab.',
        element: '#email-open-edit',
        side: 'left',
      },
    ],
  };

  return tour;
}

function campaignEmailAnalyticsTour() {
  const tour = {
    steps: [
      {
        title: 'Email Analytics',
        description: 'Here, you\'ll find key insights into your campaign performance all in one place. <br /> <strong>Campaign key metrics:</strong> <br /> <ul><li><strong>Delivery rate</strong>: percentage of successfully delivered emails.</li><li><strong>Bounce rate</strong>: percentage of emails sent that couldn\'t be delivered to the recipient\'s inbox.</li><li><strong>Open rate</strong>: percentage of recipients who opened the email.</li><li><strong>Click-to-open rate</strong>: percentage of recipients who clicked on a link inside the email after opening.</li><li><strong>Spam complaints rate</strong>: percentage of recipients reporting the email as spam.</li></ul>',
      },
      {
        title: 'Email Metrics',
        description: 'A list of all available Email Metrics.',
        element: '#email-metrics',
      },
      {
        title: 'Delivery Rate',
        description: 'The percentage of successfully delivered emails.',
        element: '#email-metrics-delivery-rate',
      },
      {
        title: 'Bounce Rate',
        description: 'The percentage of emails sent that couldn\'t be delivered to the recipient\'s inbox.',
        element: '#email-metrics-bounce-rate',
      },
      {
        title: 'Open Rate',
        description: 'The percentage of recipients who opened the email.',
        element: '#email-metrics-open-rate',
      },
      {
        title: 'Click-to-open Rate',
        description: 'The percentage of recipients who clicked on a link inside the email after opening.',
        element: '#email-metrics-cto-rate',
      },
      {
        title: 'Spam complaints Rate',
        description: 'The percentage of recipients reporting the email as spam.',
        element: '#email-metrics-sc-rate',
      },
      {
        title: 'Email Details',
        description: 'A detailed view of your Email Metrics for every single Email.',
        element: '#email-details',
      },
    ],
  };

  return tour;
}

function emailTour() {
  const tour = {
    steps: [
      {
        title: 'Email Editor',
        description: 'Welcome to the Email Editor. Here you can edit your Email and send it to your customers.',
      },
      {
        title: 'Copy your Email Template',
        description: 'Copy your Email Template to create a new Template.',
        element: '#copy-button',
        side: 'left',
      },
      {
        title: 'Edit Email Template',
        description: 'Edit your Email Template in Google Drive.',
        element: '#edit-button',
        side: 'left',
      },
      {
        title: 'Email Subject',
        description: 'Edit your Email Subject. Subject is the first thing your customers will see. Make it catchy!',
        element: '#email-subject',
      },
      {
        title: 'Recipients',
        description: 'Add your Email Recipients. You can add multiple Email addresses.',
        element: '#email-recipients',
      },
      {
        title: 'Variables',
        description: 'Add here all Variables you are using in your Email Template. For Example, you can use {headline} in your Template to replace it with a "headline".',
        element: '#email-variables',
      },
      {
        title: 'Styles',
        description: 'If you are familiar with CSS, you can add your Email Styles here. It will open a Textarea where you can modify the CSS. <br /> If you\'re not familiar with CSS, you can <a href="https://www.w3schools.com/css/" target="_blank">learn more about CSS here</a>. <br /> Only change the CSS if you know what you are doing.',
        element: '#email-styles',
      },
      {
        title: 'Send your Email',
        description: 'If you are ready, you can easily send your Email to your customers.',
        element: '#send-button',
        side: 'left',
      },
    ],
  };

  return tour;
}

export { campaignEmailsTour, campaignEmailAnalyticsTour, emailTour };
