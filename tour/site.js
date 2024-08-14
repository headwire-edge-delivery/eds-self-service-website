function siteOverviewTour({ showAutoTour }) {
  const isDarkAlley = window.location.pathname.includes('da-site/');
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        window.location.href = window.location.href.replace('/overview', '/pages');
      }
    },
    steps: [
      {
        title: 'Overview',
        description: 'Overview serves as your centralized control hub, offering quick access to essential information and actions about your site to help you to stay organized and productive with ease.',
      },
      {
        title: 'Site ID',
        description: 'A unique identifier for your site that can\'t be changed.',
        element: '#site-id',
      },
      {
        title: 'Site Description',
        description: 'A brief description of your site.',
        element: '#site-description',
      },
      {
        title: 'Last Updated',
        description: 'The date and time when your site was last updated.',
        element: '#last-updated',
      },
      {
        title: 'Site Template',
        description: 'Base template used to create your site.',
        element: '#site-template',
      },
      {
        title: 'Want to Delete your Site?',
        description: 'If you want to delete your site, click here. <br /> It will take you to the delete site dialog.',
        element: '#delete-site-button',
        side: 'left',
      },
      {
        title: 'Update Site Description',
        description: 'You can easily update your site description here.',
        element: '#update-desc-button',
        skip: isDarkAlley,
        elementEvent: () => {},
        side: 'left',
      },
      {
        title: 'Install Sidekick',
        description: 'Please install the Sidekick Extension. It is mandatory to use the Sidekick Extension. <a href="https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/resources/sidekick/sidekick" target="_blank">Click here to learn more about Sidekick.</a>',
        element: '#install-sidekick-button',
        skip: isDarkAlley,
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Guides',
        description: 'We have created some guides to help you get started with your site. <br /> We highly recommend you to go through the "Authoring Guide".',
        element: '#guides-button',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Edit your Site',
        description: `This will take you directly to your Files inside ${isDarkAlley ? 'Dark Alley' : 'Google Drive'}.`,
        element: '#edit-button',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'See your Site in Action',
        description: 'Open your amazing site in a new tab.',
        element: '#open-button',
        destroyOnClicked: false,
        side: 'left',
      },
    ],
  };

  return tourData;
}

function sitePagesTour({ showAutoTour }) {
  const isDarkAlley = window.location.pathname.includes('da-site/');
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        window.location.href = window.location.href.replace('/pages', '/monitoring');
      }
    },
    steps: [
      {
        title: 'Pages',
        description: 'Pages lists all published pages to serve as a comprehensive directory of your website\'s content. It provides a convenient overview of all accessible pages, enabling easy navigation and exploration of your site.',
      },
      {
        title: 'Add a new Page',
        description: 'If you want to create a new page, click here. <br /> It will open a dialog where you can define a Page name and choose between the Templates. <br /> It\'s the easiest way to create a new page.',
        element: '#add-page-button',
        elementEvent: () => {},
        side: 'left',
      },
      {
        title: 'Pages',
        description: 'A list of all pages in your site. <br /> Only published pages are shown here.',
        destroyOnClicked: false,
        element: '#pages-overview',
      },
      {
        title: 'Edit or Open your Page',
        description: `You can Edit your Page (which will take you to ${isDarkAlley ? 'Dark Alley' : 'Google Drive'}) or Open your Page in a new tab.`,
        element: '.table-actions',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Navigation',
        description: 'Your Navigation. It is used for the main navigation of your site.',
        element: '#nav-overview',
        destroyOnClicked: false,
        side: 'top',
      },
      {
        title: 'Footer',
        description: 'Your Footer. A Footer is a section at the bottom of your site that typically contains information about the site and the site owner.',
        element: '#footer-overview',
        destroyOnClicked: false,
        side: 'top',
      },
    ],
  };

  return tourData;
}

function siteMonitoringTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        window.location.href = window.location.href.replace('/monitoring', '/emails');
      }
    },
    steps: [
      {
        title: 'Monitoring',
        description: '<p>Here, you\'ll find key insights into your web performance all in one place.</p><p><strong>Website key metrics:</strong></p><ul><li><strong>Visits</strong>: when someone navigates to your website, either directly or from an external referer. One visit can consist of multiple page views.</li><li><strong>Page views</strong>: when a page of your website is loaded by the browser.</li><li><strong>Page load time</strong>: total amount of time it took to load the page (P50 median).</li><li><strong>Core Web Vitals</strong>: an initiative by Google to provide unified guidance for quality signals that are essential to delivering a great user experience on the web.</li></ul>',
      },
      {
        title: 'Period Selector',
        description: 'Choose if you want to see your Web Analytics for 1 Day, 7 Days, or 30 Days.',
        element: '.period-selector',
        destroyOnClicked: false,
        side: 'left',
      },
      {
        title: 'Total Visits',
        description: 'How many visitors were on your website during the selected period.',
        element: '#total-visits',
      },
      {
        title: 'Total Page Views',
        description: 'How many pages were viewed during the selected period.',
        element: '#total-page-views',
      },
      {
        title: 'Median Page Load',
        description: 'The median page load time during the selected period.',
        element: '#median-page-load',
      },
      {
        title: 'Graphical Overview',
        description: 'Here you can see when your visitors were on the website.',
        element: '.chart-container',
      },
      {
        title: 'Details',
        description: 'A more detailed view of your Web Analytics. <br /> It is divided into 3 different sections.',
        element: '#monitoring-details',
        align: 'center',
      },
      {
        title: 'Visits Details',
        description: 'The First Section is the Visits Details.',
        element: '#visits-details',
        align: 'center',
      },
      {
        title: 'Page Views Details',
        description: 'The Second Section is the Page Views Details.',
        element: '#page-views-details',
        align: 'center',
      },
      {
        title: 'Pageload Details',
        description: 'The Third Section is the Pageload Details. <br /> All 3 Sections are sorted in 6 categories.',
        element: '#pageload-details',
        align: 'center',
      },
      {
        title: 'Sorted by Country',
        description: 'Sorted according to the country of origin of your visitors.',
        element: '#pageload-details-country',
      },
      {
        title: 'Sorted by Referer',
        description: 'Sorted according to the referer of your visitors.',
        element: '#pageload-details-referers',
      },
      {
        title: 'Sorted by Paths',
        description: 'Sorted according to the paths your visitors took on your website.<br /> This will give you a good overview of the most visited pages.',
        element: '#pageload-details-paths',
      },
      {
        title: 'Sorted by Browser',
        description: 'Sorted according to the browser your visitors used.',
        element: '#pageload-details-browsers',
      },
      {
        title: 'Sorted by Operating System',
        description: 'Sorted according to the operating system your visitors used.',
        element: '#pageload-details-os',
      },
      {
        title: 'Sorted by Device Type',
        description: 'Sorted according to the device type your visitors used. <br /> Are they using a Desktop, Tablet, or Mobile more? You will find the answer here.',
        element: '#pageload-details-devices',
      },
      {
        title: 'Core Web Vitals',
        description: 'Core Web Vitals are a set of real-world, user-centered metrics that quantify key aspects of the user experience. They measure dimensions of web usability such as load time, interactivity, and the stability of content as it loads. <br/> <a href="https://web.dev/articles/vitals" target="_blank">Learn more about Core Web Vitals.</a>',
        element: '#core-web-vitals',
      },
      {
        title: 'Core Web Vitals Sorted by Path and Browsers',
        description: 'We also provide you with the Core Web Vitals sorted by Path and Browsers.',
        element: '#core-web-vitals-path-browsers',
      },
    ],
  };

  return tourData;
}

export {
  siteOverviewTour,
  sitePagesTour,
  siteMonitoringTour,
};
