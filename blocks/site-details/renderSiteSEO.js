import {
  daProjectRepo,
  OOPS,
  parseFragment,
  SCRIPT_API,
  projectRepo, safeText,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, createDialog } from '../../scripts/dialogs.js';

// MARK: render
export default async function renderSiteSEO({ container, nav, renderOptions }) {
  const {
    projectDetails, siteSlug,
  } = renderOptions;
  container.innerHTML = renderSkeleton('seo');

  nav.insertAdjacentHTML('beforeend', `
    <button id="open-sitemap" class="button secondary action sitemap">Open sitemap</button>
    <button id="edit-robots" class="button secondary action robots">Edit robots</button>
    ${projectDetails.darkAlleyProject ? `<a id="edit-bulk-metadata" href="/redirect?url=https://da.live/edit#/${daProjectRepo}/${projectDetails.projectSlug}/metadata" target="_blank" class="button secondary action">Edit Bulk Metadata</a>` : '<button id="edit-bulk-metadata" class="button secondary action bulk-metadata">Edit Bulk Metadata</button>'}
  `);

  // TODO Allow editing robots.txt for non kestrelone.com domains
  // TODO Support reading complex multi-sitemaps
  ['sitemap.xml', 'robots.txt'].forEach((file) => {
    const type = file.split('.')[0];
    nav.querySelector(`.${type}`).onclick = async () => {
      const req = await fetch(`${projectDetails.customLiveUrl}/${file}`);
      if (!req.ok) {
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
      const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${projectDetails.projectSlug}/main/metadata.json?editUrl=auto`).then((res) => res.json()).catch(() => null);
      if (statusData?.edit?.url) {
        window.open(statusData.edit.url, '_blank');
      } else {
        window.open(projectDetails.driveUrl, '_blank');
      }
      button.classList.remove('loading');
    };
  }

  const indexData = await fetch(`${SCRIPT_API}/index/${siteSlug}`).then((res) => res.json()).catch(() => null);

  if (!indexData?.data) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  container.innerHTML = `
  <div id="seo-overview">
    <h2>SEO Audit</h2>
    <table class="seo-audit"></table>
  </div>`;

  const audit = [];

  for (const page of indexData.data) {
    if (!(page.path.startsWith('/drafts/') || page.path.startsWith('/emails/') || page.path.startsWith('/nav') || page.path.startsWith('/footer'))) {
      audit.push(page);
    }
  }

  const table = container.querySelector('.seo-audit');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Image</th>
        <th>Name</th>
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

    tableRow.innerHTML = `
      <td class="og-image"><div class="skeleton" style="width: 64px; height: 64px;"></div></td>
      <td class="doc-name"><strong>${safeText(item.name)}</strong></td>  
      <td class="og-title"><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
      <td class="og-description"><div class="skeleton" style="width: 200px; height: 48px;"></div></td>
      <td class="keywords"><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
      <td>
        <div class="button-container">
          <a class="button action secondary edit" href="/redirect?url=${projectDetails.darkAlleyProject ? `https://da.live/edit#/${daProjectRepo}/${projectDetails.projectSlug}${item.path.endsWith('/') ? `${item.path}index` : item.path}` : `https://docs.google.com/document/d/${item.id}/edit`}" target="_blank">Edit</a>
        </div>
      </td>
    `;

    fetch(`${projectDetails.customLiveUrl}${item.path}`)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        return false;
      })
      .then((res) => {
        if (res) {
          const split = res.split('\n');
          ['og:image', 'og:title', 'og:description', 'keywords', 'robots'].forEach((property) => {
            const type = property.startsWith('og:') ? 'property' : 'name';
            let content = split.find((line) => line.trim().startsWith(`<meta ${type}="${property}" content="`));
            const el = tableRow.querySelector(`.${property.replace(':', '-')}`);

            if (content) {
              content = content.replace(`<meta ${type}="${property}" content="`, '').replace('">', '');
              if (property === 'og:image') {
                const noImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                el.innerHTML = `<img src="${content}" alt="" loading="lazy" onerror="this.src = '${noImage}'"/>`;
              } else if (property === 'keywords') {
                el.innerHTML = content.split(',').map((s) => `<div class="badge small">${s.trim()}</div>`).join('');
              } else if (property === 'robots') {
                // eg exclude fragments
                if (content.toLowerCase().includes('noindex')) {
                  tableRow.remove();
                }
              } else {
                el.innerHTML = content;
              }
            } else {
              el.innerHTML = '<div class="badge orange">Missing</div>';
            }
          });
        }
      })
      .catch(() => null);

    return tableRow;
  });

  const tableBody = table.tBodies[0];
  tableBody.append(...tableRows);
  if (tableBody.matches(':empty')) {
    const cols = table.querySelectorAll('th').length;
    tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty">Not enough data</td></tr>`;
  }
}
