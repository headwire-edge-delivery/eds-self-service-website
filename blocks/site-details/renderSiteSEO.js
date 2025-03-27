import { daProjectRepo, OOPS, parseFragment, projectRepo, safeText, defaultBranch, SCRIPT_API } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, createDialog } from '../../scripts/dialogs.js';
import paginator from '../../libs/pagination/pagination.js';
import { readQueryParams } from '../../libs/queryParams/queryParams.js';
import { cacheFetch } from '../../scripts/utils.js';

const filters = [/\/nav$/i, /\/footer$/i, /\/search$/i, /\/unsubscribe$/i, /^\/drafts\//i, /^\/tools\//i, /^\/emails\//i, /^\/\.helix\//i];

function filterSortIndexData(indexList) {
  const filtered = indexList.filter(({ path }) => {
    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];
      if (filter.test(path)) {
        return false;
      }
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => {
    const aSplit = a.path.split('/');
    const bSplit = b.path.split('/');
    const aLength = aSplit.length;
    const bLength = bSplit.length;
    if (aLength !== bLength) {
      return aLength - bLength;
    }
    return aSplit[aSplit.length - 1].localeCompare(bSplit[bSplit.length - 1]);
  });

  return sorted;
}

function keywordStrToBadges(str) {
  return str.split(',').map((item) => {
    const trimmed = item.trim();
    const badge = document.createElement('div');
    badge.classList.add('badge', 'small');
    badge.textContent = trimmed;
    return badge;
  });
}

const noImageSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const missingBadge = '<div class="badge orange">Missing</div>';

function decorateCell(metaProperty, content) {
  const span = document.createElement('span');

  if (metaProperty === 'og:image') {
    const image = parseFragment(`<img alt="thumbnail" loading="lazy" onerror="this.src = '${noImageSrc}'"/>`);
    image.src = content || noImageSrc;
    span.append(image);
  } else if (!content) {
    span.innerHTML = missingBadge;
    return span;
  } else if (metaProperty === 'keywords') {
    span.append(...keywordStrToBadges(content));
  } else {
    span.textContent = content;
  }
  return span;
}

// MARK: render
export default async function renderSiteSEO({ container, nav, renderOptions }) {
  const { projectDetails, siteSlug } = renderOptions;
  container.innerHTML = renderSkeleton('seo');

  nav.insertAdjacentHTML(
    'beforeend',
    `
    <button id="open-sitemap" class="button secondary action sitemap">Open sitemap</button>
    <button id="edit-robots" class="button secondary action robots">Edit robots</button>
    ${projectDetails.darkAlleyProject ? `<a id="edit-bulk-metadata" href="/redirect?url=https://da.live/edit#/${daProjectRepo}/${siteSlug}/metadata" target="_blank" class="button secondary action">Edit Bulk Metadata</a>` : '<button id="edit-bulk-metadata" class="button secondary action bulk-metadata">Edit Bulk Metadata</button>'}
  `,
  );

  // TODO: Allow editing robots.txt for non kestrelone.com domains
  // TODO: Support reading complex multi-sitemaps
  ['sitemap.xml', 'robots.txt'].forEach((file) => {
    const type = file.split('.')[0];
    nav.querySelector(`.${type}`).onclick = async () => {
      const req = await fetch(`${projectDetails.customLiveUrl}/${file}`).catch(() => null);
      if (!req?.ok) {
        await alertDialog(`Oops ${file} not found !`);
      }

      const text = await req.text();
      const content = parseFragment(`
        <div>
            <h3>${file}</h3>
            ${type === 'robots' ? '<p>Ready to go live with your own domain ? Contact us at <a href="mailto:contact@kestrelone.com">contact@kestrelone.com</a> once you\'re ready.</p>' : ''}
            <pre><code></code></pre>
        </div>
    `);
      content.querySelector('code').textContent = text;
      await createDialog(content);
    };
  });

  if (!projectDetails.darkAlleyProject) {
    nav.querySelector('button.bulk-metadata').onclick = async (event) => {
      const button = event.target;
      button.classList.add('loading');
      const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${siteSlug}/${defaultBranch}/metadata.json?editUrl=auto`)
        .then((res) => res.json())
        .catch(() => null);
      if (statusData?.edit?.url) {
        window.open(statusData.edit.url, '_blank');
      } else {
        window.open(projectDetails.driveUrl, '_blank');
      }
      button.classList.remove('loading');
    };
  }

  const indexData = await fetch(`${SCRIPT_API}/index/${siteSlug}`)
    .then((res) => res.json())
    .catch(() => null);
  if (typeof indexData?.data?.length !== 'number') {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  let filteredIndex = [];
  try {
    filteredIndex = filterSortIndexData(indexData?.data);
  } catch {
    container.innerHTML = '<p>Error parsing data.</p>';
    return;
  }

  container.innerHTML = `
  <div id="seo-overview">
    <h2>SEO Audit</h2>
    <div class="button-container">
      <button id="show-preview-data" data-environment="previewed" class="button selector action secondary">Show Preview Data</button>
      <button id="show-published-data" data-environment="published" class="button selector action secondary">Show Published Data</button>
    </div>
    <table class="seo-audit"></table>
  </div>`;

  const showPreviewData = container.querySelector('#show-preview-data');
  const showPublishedData = container.querySelector('#show-published-data');

  // MARK: switch env
  // show preview/published data (rows) based on button click
  const switchEnvClick = (event) => {
    showPreviewData.classList.remove('is-selected');
    showPublishedData.classList.remove('is-selected');
    container.dataset.showEnvironment = event.target.dataset.environment;
    event.target.classList.add('is-selected');
    // trigger fetch of displayed cells
    container.querySelectorAll('table.seo-audit tbody tr').forEach((tr) => {
      if (typeof tr.populate === 'function') tr.populate();
    });
  };

  showPreviewData.onclick = switchEnvClick;
  showPublishedData.onclick = switchEnvClick;
  showPublishedData.click();

  const table = container.querySelector('.seo-audit');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Image</th>
        <th>Path</th>
        <th>Title</th>
        <th>Description</th>
        <th>Keywords</th>
        <th></th>
      </tr>  
    </thead>
    <tbody></tbody>
  `;

  // MARK: create rows
  const createTableRows = (data, startIndex, endIndex) => {
    let dataToParse;
    if (typeof startIndex === 'number' && typeof endIndex === 'number') {
      dataToParse = data.slice(startIndex, endIndex);
    } else {
      dataToParse = data;
    }
    const rows = dataToParse.reduce((output, item) => {
      const previewRow = document.createElement('tr');
      previewRow.dataset.path = item.path;
      previewRow.dataset.fetchUrl = `${projectDetails.customPreviewUrl}${item.path}`;
      previewRow.dataset.environment = 'previewed';
      const publishRow = document.createElement('tr');
      publishRow.dataset.path = item.path;
      publishRow.dataset.fetchUrl = `${projectDetails.customLiveUrl}${item.path}`;
      publishRow.dataset.environment = 'published';

      const initRow = (row) => {
        // MARK: populate row
        // assign a populate function to each row
        row.populate = async () => {
          // Prevent populating rows that are not displayed
          if (row.dataset.environment !== container.dataset.showEnvironment) return;
          // Rows are only removed if you change pages, so check if populated.
          if (row.dataset.isPopulated === 'true') return;
          row.dataset.isPopulated = 'true';

          row.innerHTML = `
            <td data-meta-property="og:image"><div class="skeleton" style="width: 64px; height: 64px;"></div></td>
            <td class="path"><strong>${safeText(item.path)}</strong></td>  
            <td data-meta-property="og:title"><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
            <td data-meta-property="og:description"><div class="skeleton" style="width: 200px; height: 48px;"></div></td>
            <td data-meta-property="keywords"><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
            <td class="buttons">
              <div class="button-container">
                <a class="button action secondary edit" target="_blank" >Edit</a>
              </div>
            </td>
          `;

          const editButton = row.querySelector('.edit');
          if (projectDetails.darkAlleyProject) {
            editButton.href = `https://da.live/edit#/${daProjectRepo}/${siteSlug}/metadata${item.path.endsWith('/') ? `${item.path}/index` : item.path}`;
          } else {
            editButton.href = `https://docs.google.com/document/d/${item.id}/edit`;
          }
          // Cached fetch in case user comes back to this page through pagination.
          const response = await cacheFetch(row.dataset.fetchUrl);
          ['og:image', 'og:title', 'og:description', 'keywords'].forEach((metaProperty) => {
            const type = metaProperty.startsWith('og:') ? 'property' : 'name';

            const regex = new RegExp(`<meta ${type}="${metaProperty}" content="([^"]*)"`, 'i');
            const match = response?.dataText?.match(regex);
            const content = match?.[1] || null;

            const contentSpan = decorateCell(metaProperty, content);

            const cell = row.querySelector(`[data-meta-property="${metaProperty}"]`);
            cell.innerHTML = '';
            cell.append(contentSpan);
          });
        };
      };

      initRow(previewRow);
      initRow(publishRow);
      output.push(previewRow, publishRow);
      return output;
    }, []);
    return rows;
  };

  const tableBody = table.tBodies[0];

  const params = readQueryParams();

  const limit = Math.max(1, parseInt(params.seoLimit, 10) || 5);
  const startPage = Math.max(1, parseInt(params.seoPage, 10) || 1);

  // add pagination after table
  table.after(
    paginator(filteredIndex.length, limit, startPage, { page: 'seoPage' }, ({ rangeStart, rangeEnd }) => {
      // populate table
      tableBody.innerHTML = '';
      const rowsToDisplay = createTableRows(filteredIndex, rangeStart, rangeEnd);
      tableBody.append(...rowsToDisplay);
      // trigger fetching of displayed cells
      for (let i = 0; i < rowsToDisplay.length; i += 1) {
        if (typeof rowsToDisplay[i]?.populate === 'function') rowsToDisplay[i].populate();
      }
    }),
  );
  if (tableBody.matches(':empty')) {
    const cols = table.querySelectorAll('th').length;
    tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty">Not enough data</td></tr>`;
  }
}
