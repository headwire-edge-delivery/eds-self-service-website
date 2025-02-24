import {
  daProjectRepo,
  OOPS,
  parseFragment,
  projectRepo, safeText,
  defaultBranch,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, createDialog } from '../../scripts/dialogs.js';
import { showErrorToast } from '../../scripts/toast.js';

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
    <button id="reindex" class="button secondary action reindex">Reindex</button>
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

  // We shouldn't have to filter this data.
  // If there are pages in here we shouldn't be showing,
  // it's probably better to update the helix-query.yaml in the template
  const indexData = await fetch(`${projectDetails.customLiveUrl}/query-index.json`).then((res) => res.json()).catch(() => null);

  if (!indexData?.[':type']) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  // if single sheet display data. If multi sheet try "all" then get first sheet.
  // ":names" is not always ordered the same, fallback sheet is potentially random...
  // This isn't a big deal as all query-index's should have "all", otherwise it was broken by user.
  const audit = indexData[':type'] === 'sheet' ? indexData.data : (indexData?.all?.data || indexData[indexData[':names'][0]?.data]);

  if (!audit) {
    container.innerHTML = '<p>Error parsing data.</p>';
  }

  container.innerHTML = `
  <div id="seo-overview">
    <h2>SEO Audit</h2>
    <table class="seo-audit"></table>
  </div>`;

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

  const tableRows = audit.map((item) => {
    const tableRow = document.createElement('tr');
    tableRow.dataset.path = item.path;

    const ogImage = document.createElement('img');
    if (!item.image || item.image.startsWith('/default-meta-image.png')) {
      ogImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    } else {
      ogImage.src = `${projectDetails.liveUrl}${item.image}`;
    }
    ogImage.alt = item.imageAlt || '';

    const keywordsArr = item.keywords?.split(',').filter(Boolean) || [];
    const keywords = keywordsArr.length > 0 ? keywordsArr.map((word) => `<div class="badge small">${safeText(word.trim())}</div>`).join('') : '<div class="badge orange">Missing</div>';

    tableRow.innerHTML = `
      <td class="og-image"></td>
      <td class="path"><strong>${safeText(item.path)}</strong></td>  
      <td class="og-title">${safeText(item.title)}</td>
      <td class="og-description">${safeText(item.description)}</td>
      <td class="keywords">${keywords}</td>
      <td>
        <div class="button-container">
          <button class="button action secondary edit" >Edit</button>
        </div>
      </td>
    `;

    tableRow.querySelector('.og-image').append(ogImage); // not inline to prevent XSS

    const editButton = tableRow.querySelector('.edit');

    editButton.onclick = async () => {
      const pathForEdit = item.path.endsWith('/') ? `${item.path}index` : item.path;
      if (projectDetails.darkAlleyProject) {
        window.open(`/redirect?url=https://da.live/edit#/${daProjectRepo}/${siteSlug}${pathForEdit}`, '_blank');
        return;
      }

      editButton.classList.add('loading');

      const driveUrl = await fetch(`https://admin.hlx.page/status/${projectRepo}/${siteSlug}/${defaultBranch}/${item.path}?editUrl=auto`)
        .then((res) => res.json())
        .then((d) => d.edit.url)
        .catch(() => null);
      editButton.classList.remove('loading');

      if (!driveUrl) {
        showErrorToast('Failed to get drive link');
        return;
      }

      window.open(driveUrl, '_blank');
    };

    return tableRow;
  });

  const tableBody = table.tBodies[0];
  tableBody.append(...tableRows);
  if (tableBody.matches(':empty')) {
    const cols = table.querySelectorAll('th').length;
    tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty">Not enough data</td></tr>`;
  }
}
