function campaignEmailsTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        document.querySelector('main .site-details.block aside a[href$="/audience"]')?.click();
      }
    },
    steps: [
      {
        title: 'Campaigns',
        description:
          'Campaigns serves as your toolkit for crafting impactful communication in your online endeavors tailored for various purposes, from newsletters to promotional campaigns streamlining your email creation process.',
      },
      {
        title: 'Campaigns filter',
        description: 'A list of all campaigns. Click on a campaign to filter your emails.',
        element: '.emails .campaign-list',
      },
      {
        title: 'Emails',
        description: 'A list of all emails.',
        destroyOnClicked: false,
        element: 'table.emails',
        side: 'left',
      },
      {
        title: 'New Campaign',
        description: 'Start a new campaign for emails.',
        element: '#add-campaign',
      },
      {
        title: 'Edit or Open your Email',
        description: 'You can Edit your Email in our Editor or Open a Preview in a new tab.',
        element: '#email-open-edit',
        destroyOnClicked: false,
        side: 'left',
        skip: document.querySelector('table.emails > tbody > tr').textContent.includes('Not enough data'),
      },
    ],
  };

  return tourData;
}

function campaignEmailsAudienceTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        document.querySelector('main .site-details.block aside a[href$="/campaign-analytics"]')?.click();
      }
    },
    steps: [
      {
        title: 'Audience',
        description: 'Manage your audience here. Add, update, retrieve and delete contacts.',
      },
      {
        title: 'Audience members',
        description: 'List of your audience members.',
        element: '.audience table',
      },
      {
        title: 'Add contact',
        description: 'Add a contact to your audience.',
        element: '#add-contact',
        side: 'left',
      },
      {
        title: 'Bulk import',
        description: 'Import multiple contacts at once from a CSV file to create your audience.',
        element: '#bulk-import',
        side: 'left',
      },
    ],
  };

  return tourData;
}

function campaignEmailAnalyticsTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        document.querySelector('main .site-details.block aside a[href$="/settings"]')?.click();
      }
    },
    steps: [
      {
        title: 'Campaign Analytics',
        description:
          "Here, you'll find key insights into your campaign performance all in one place. <br /> <strong>Campaign key metrics:</strong> <br /> <ul><li><strong>Delivery rate</strong>: percentage of successfully delivered emails.</li><li><strong>Bounce rate</strong>: percentage of emails sent that couldn't be delivered to the recipient's inbox.</li><li><strong>Open rate</strong>: percentage of recipients who opened the email.</li><li><strong>Click-to-open rate</strong>: percentage of recipients who clicked on a link inside the email after opening.</li><li><strong>Spam complaints rate</strong>: percentage of recipients reporting the email as spam.</li></ul>",
      },
      {
        title: 'Campaigns filter',
        description: 'A list of all campaigns. Click on a campaign to filter your email analytics.',
        element: '.campaign-analytics .campaign-list',
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
        description: "The percentage of emails sent that couldn't be delivered to the recipient's inbox.",
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
        element: '.email-details',
      },
    ],
  };

  return tourData;
}

function emailTour() {
  const tourData = {
    onFinished: () => {},
    steps: [
      {
        title: 'Email Editor',
        description: 'Welcome to the Email Editor. Here you can edit your Email and send it to your customers.',
      },
      {
        title: 'Unmet Requirements',
        description:
          'In order to send an email, you need to select at least one recipient and make sure all variables are defined. Click on this information to view any missing requirements.',
        element: '#unmet-requirements',
        destroyOnClicked: true,
        side: 'left',
        skip: !document.getElementById('unmet-requirements') || document.getElementById('unmet-requirements').hidden,
      },
      {
        title: 'Guides',
        description: 'Open the Guides to learn how to create a Template',
        element: '.guides',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Preview your Email',
        description: 'Preview your Email in a new Tab',
        element: '.preview-mail',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Edit Email Template',
        description: 'Edit your Email Template in Google Drive.',
        element: '#edit-button',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Send your Email',
        description: 'If you are ready, you can easily send your Email to your customers.',
        element: '#send-button',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Email Subject',
        description: 'Edit your Email Subject. Subject is the first thing your customers will see. Make it catchy!',
        element: '#email-subject',
        destroyOnClicked: false,
      },
      {
        title: 'Recipients',
        description: 'Add your Email Recipients. You can add multiple Email addresses.',
        element: '#email-recipients',
        destroyOnClicked: false,
      },
      {
        title: 'Variables',
        description: 'Add here all Variables you are using in your Email Template. For Example, you can use {headline} in your Template to replace it with a "headline".',
        element: '#email-variables',
        destroyOnClicked: false,
      },
      {
        title: 'Styles',
        description:
          'If you are familiar with CSS, you can add your Email Styles here. It will open a Textarea where you can modify the CSS. <br /> If you\'re not familiar with CSS, you can <a href="https://www.w3schools.com/css/" target="_blank">learn more about CSS here</a>. <br /> Only change the CSS if you know what you are doing.',
        element: '#email-styles',
        destroyOnClicked: false,
        side: 'top',
      },
    ],
  };

  return tourData;
}

export { campaignEmailsTour, campaignEmailsAudienceTour, campaignEmailAnalyticsTour, emailTour };
