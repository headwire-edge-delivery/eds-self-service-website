function SEOTour() {
  const tourData = {
    steps: [
      {
        title: 'SEO',
        description: 'The SEO dashboard can help your optimize the site’s search engine performance. Through the dashboard, you can make adjustments to page titles, meta descriptions, keywords etc.',
      },
      {
        title: 'Open sitemap',
        description: 'You can preview the auto-generated sitemap here.',
        element: '#open-sitemap',
        side: 'left',
      },
      {
        title: 'Edit robot',
        description: 'You can edit your robots.txt file to manage which pages can be crawled and indexed by Search Engine Bots.',
        element: '#edit-robots',
        side: 'left',
      },
      {
        title: 'Edit Bulk Metadata',
        description: 'You can apply common metadata en masse at a single place with the Bulk Metadata sheet. Make sure to preview and publish the metadata sheet to propagate the changes to all pages.',
        element: '#edit-bulk-metadata',
        side: 'left',
      },
    ],
  };

  return tourData;
}

export default SEOTour;
