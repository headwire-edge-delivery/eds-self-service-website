function SEOTour({ showAutoTour }) {
  const environment = document.querySelector('#show-preview-data').classList.contains('is-selected') ? 'previewed' : 'published';
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        document.querySelector('main .site-details.block aside a[href$="/web-analytics"]')?.click();
      }
    },
    steps: [
      {
        title: 'SEO',
        description:
          'The SEO dashboard can help your optimize the site’s search engine performance. Through the dashboard, you can make adjustments to page titles, meta descriptions, keywords etc.',
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
        description:
          'You can apply common metadata en masse at a single place with the Bulk Metadata sheet. Make sure to preview and publish the metadata sheet to propagate the changes to all pages.',
        element: '#edit-bulk-metadata',
        side: 'left',
      },
      {
        title: 'Preview/Published state',
        description: 'Here you can switch between viewing the preview/published state of pages. Make sure your pages are optimized before publishing them.',
        element: '#seo-overview > .button-container',
      },
      {
        title: 'Page entry',
        description: 'This displays the most relevant information about the page for search engines.',
        element: `.seo-audit tbody tr[data-environment="${environment}"]:not(:empty)`,
      },
      {
        title: 'Page title',
        description: 'This is the page title that will be displayed in search results and the title in the browser tab.',
        element: `.seo-audit tbody tr[data-environment="${environment}"]:not(:empty) td[data-meta-property="og:title"]`,
      },
      {
        title: 'Page description',
        description: 'This is the page description that will be displayed in search engine results.',
        element: `.seo-audit tbody tr[data-environment="${environment}"]:not(:empty) td[data-meta-property="og:description"]`,
      },
      {
        title: 'Page keywords',
        description: 'These are keywords used to describe the page. They will be used to help your page rank better in search engine results.',
        element: '.seo-audit tbody tr:not(:empty) td[data-meta-property="keywords"]',
      },
      {
        title: 'Edit page',
        description: 'This is a direct link to edit the page. You can adjust your metadata, preview or publish your page and come back to this page.',
        element: '.seo-audit tbody .button.edit',
        side: 'left',
      },
    ],
  };

  return tourData;
}

export default SEOTour;
