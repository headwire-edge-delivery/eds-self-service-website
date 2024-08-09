function campaignEmailsTour() {
  const tourData = {
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

  return tourData;
}

function campaignEmailAnalyticsTour() {
  const tourData = {
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

  return tourData;
}

export {
  campaignEmailsTour,
  campaignEmailAnalyticsTour,
};
