import {
  daProjectRepo,
  OOPS,
  parseFragment,
  projectRepo, safeText,
  defaultBranch,
  SCRIPT_API,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, createDialog } from '../../scripts/dialogs.js';
import { showErrorToast } from '../../scripts/toast.js';

const filters = [
  /\/nav$/i,
  /\/footer$/i,
  /\/search$/i,
  /\/unsubscribe$/i,
  /^\/drafts\//i,
  /^\/tools\//i,
  /^\/emails\//i,
  /^\/\.helix\//i,
];

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

const noImageSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// MARK: render
export default async function renderSiteSEO({ container, nav, renderOptions }) {
  const {
    projectDetails, siteSlug,
  } = renderOptions;
  container.innerHTML = renderSkeleton('seo');

  nav.insertAdjacentHTML('beforeend', `
    <button id="open-sitemap" class="button secondary action sitemap">Open sitemap</button>
    <button id="edit-robots" class="button secondary action robots">Edit robots</button>
    ${projectDetails.darkAlleyProject ? `<a id="edit-bulk-metadata" href="/redirect?url=https://da.live/edit#/${daProjectRepo}/${siteSlug}/metadata" target="_blank" class="button secondary action">Edit Bulk Metadata</a>` : '<button id="edit-bulk-metadata" class="button secondary action bulk-metadata">Edit Bulk Metadata</button>'}
  `);

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
      const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${siteSlug}/${defaultBranch}/metadata.json?editUrl=auto`).then((res) => res.json()).catch(() => null);
      if (statusData?.edit?.url) {
        window.open(statusData.edit.url, '_blank');
      } else {
        window.open(projectDetails.driveUrl, '_blank');
      }
      button.classList.remove('loading');
    };
  }

  const indexData = await fetch(`${SCRIPT_API}/index/${siteSlug}`).then((res) => res.json()).catch(() => null);
  console.log(' indexData:', indexData);
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
  console.log(' filteredIndex:', filteredIndex);

  container.innerHTML = `
  <div id="seo-overview">
    <h2>SEO Audit</h2>
    <div class="button-container">
      <button id="show-preview-data" data-environment="preview" class="button selector action secondary">Show Preview Data</button>
      <button id="show-published-data" data-environment="published" class="button selector action secondary">Show Published Data</button>
    </div>
    <table class="seo-audit"></table>
  </div>`;

  const showPreviewData = container.querySelector('#show-preview-data');
  const showPublishedData = container.querySelector('#show-published-data');
  const switchEnvClick = (event) => {
    showPreviewData.classList.remove('is-selected');
    showPublishedData.classList.remove('is-selected');
    container.dataset.showEnvironment = event.target.dataset.environment;
    event.target.classList.add('is-selected');
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

  const tableRows = filteredIndex.map((item) => {
    const tableRow = document.createElement('tr');
    tableRow.dataset.path = item.path;

    tableRow.innerHTML = `
      <td data-meta-property="og:image" class="image"><div class="skeleton" style="width: 64px; height: 64px;"></div></td>
      <td class="path"><strong>${safeText(item.path)}</strong></td>  
      <td data-meta-property="og:title" class="title"><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
      <td data-meta-property="og:description" class="description"><div class="skeleton" style="width: 200px; height: 48px;"></div></td>
      <td data-meta-property="keywords" class="keywords"><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
      <td class="buttons">
        <div class="button-container">
          <a class="button action secondary edit" target="_blank" >Edit</a>
        </div>
      </td>
    `;

    const editButton = tableRow.querySelector('.edit');
    if (projectDetails.darkAlleyProject) {
      editButton.href = `https://da.live/edit#/${daProjectRepo}/${siteSlug}/metadata${item.path.endsWith('/') ? `${item.path}/index` : item.path}`;
    } else {
      editButton.href = `https://docs.google.com/document/d/${item.id}/edit`;
    }

    console.log(' projectDetails:', projectDetails);
    Promise.all([
      // TODO: If these track as visits, change to EDS urls.
      // To use EDS urls however, headers config must be updated.
      // Wait for hlx5 PR
      fetch(`${projectDetails.customPreviewUrl}${item.path}`).then((res) => (res.ok ? res.text() : null)).catch(() => null),
      fetch(`${projectDetails.customLiveUrl}${item.path}`).then((res) => (res.ok ? res.text() : null)).catch(() => null),
    ]).then(([previewHtml, liveHtml]) => {
      ['og:image', 'og:title', 'og:description', 'keywords'].forEach((metaProperty) => {
        const type = metaProperty.startsWith('og:') ? 'property' : 'name';

        const regex = new RegExp(`<meta ${type}="${metaProperty}" content="([^"]*)"`, 'i');
        const previewMatch = previewHtml?.match(regex);
        const liveMatch = liveHtml?.match(regex);
        let previewContent = previewMatch?.[1] || 'N/A';
        previewContent = metaProperty === 'og:image' ? `<img src="${previewContent}" alt="thumbnail" loading="lazy" onerror="this.src = '${noImageSrc}'"/>` : safeText(previewContent);
        let liveContent = liveMatch?.[1] || 'N/A';
        liveContent = metaProperty === 'og:image' ? `<img src="${liveContent}" alt="thumbnail" loading="lazy" onerror="this.src = '${noImageSrc}'"/>` : safeText(liveContent);

        const cell = tableRow.querySelector(`[data-meta-property="${metaProperty}"]`);
        cell.innerHTML = `<span class="preview">${previewContent}</span><span class="published">${liveContent}</span>`;
      });
    });

    return tableRow;
  });

  const tableBody = table.tBodies[0];
  tableBody.append(...tableRows);
  if (tableBody.matches(':empty')) {
    const cols = table.querySelectorAll('th').length;
    tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty">Not enough data</td></tr>`;
  }
}
