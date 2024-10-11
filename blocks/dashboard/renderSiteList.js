import { waitForAuthenticated, SCRIPT_API, KESTREL_ONE } from '../../scripts/scripts.js';
import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import paginator from '../../libs/pagination/pagination.js';

const generateThumbnails = () => {
  const sitesList = document.querySelector('.sites-list');
  sitesList.querySelectorAll('.project-thumbnail').forEach((thumbnail) => {
    fetch(thumbnail.dataset.src)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        return false;
      })
      .then((res) => {
        if (res) {
          let src = res.split('\n').find((line) => line.trim().startsWith('<meta property="og:image" content="'));
          if (src) {
            src = src.replace('<meta property="og:image" content="', '').replace('">', '');
            thumbnail.innerHTML = `<img src="${src}" alt="thumbnail" loading="lazy"/>`;
          }
        }
      })
      .catch(() => null);
  });
};

async function fetchSites(token, type = 'googleDrive') {
  let currentPage = readQueryParams().page ? Number(readQueryParams().page) : 1;
  let currentDaPage = readQueryParams().dapage ? Number(readQueryParams().dapage) : 1;
  const limit = readQueryParams().limit ? Number(readQueryParams().limit) : 9;
  const daLimit = readQueryParams().dalimit ? Number(readQueryParams().dalimit) : limit;
  const searchTerm = readQueryParams().search || '';
  const isDarkAlley = type === 'darkAlley';
  const sitesList = document.querySelector(isDarkAlley ? '.sites-list-dark-alley' : '.sites-list-google-drive');
  const currentLimit = Math.max(1, parseInt(isDarkAlley ? daLimit : limit, 10));
  const actualPage = isDarkAlley ? currentDaPage : currentPage;
  const url = `${SCRIPT_API}/${isDarkAlley ? 'darkAlleyList' : 'list'}?searchTerm=${encodeURIComponent(searchTerm)}&limit=${currentLimit}&page=${actualPage}`;
  fetch(url, {
    headers: {
      'content-type': 'application/json',
      authorization: `bearer ${token}`,
    },
  }).then((response) => response.json())
    .then(({ projects, pagination }) => {
      if (projects.length === 0) {
        sitesList.innerHTML = '<p>No Sites found</p>';
        return;
      }
      sitesList.innerHTML = `
            <h3>${isDarkAlley ? 'Dark Alley Sites (Experimental)' : 'Google Drive Sites'}</h3>
            <ul id="my-sites-overview">
              ${projects.map(({ projectSlug, projectName, projectDescription }) => `
                <li>
                  <a href="/${isDarkAlley ? 'da-site' : 'site'}/${projectSlug}/overview">
                    <div class="project-thumbnail" data-src="https://${projectSlug}.${KESTREL_ONE}"></div>
                    <div class="project-content">
                      <h2 title="${projectName}">${projectName}</h2>
                      <p title="${projectSlug}"><strong>${projectSlug}</strong></p>
                      <p class="project-description" title="${projectDescription || ''}">${projectDescription || ''}</p>
                    </div>
                  </a>
                </li>
              `).join('')}
            </ul>
            ${paginator(pagination.totalItems, currentLimit, actualPage)}
          `;

      const newSitesList = sitesList.cloneNode(true);
      // This clears the old event listeners
      sitesList.replaceWith(newSitesList);

      newSitesList.addEventListener('click', (event) => {
        const button = event.target.closest('.paginator');
        if (button) {
          const newPage = Number(button.getAttribute('data-change-to'));
          if (isDarkAlley) {
            currentDaPage = newPage;
            writeQueryParams({ dapage: currentDaPage });
          } else {
            currentPage = newPage;
            writeQueryParams({ page: currentPage });
          }
          newSitesList.innerHTML = '<p style="display: flex; justify-content: center;"><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p>';

          fetchSites(token, type);
        }
      });

      generateThumbnails();
    }).catch(() => {
      sitesList.innerHTML = '<p>Error loading sites</p>';
    });
}

export default async function renderSites({ container, nav }) {
  container.innerHTML = '<div class="sites"><p><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p></div>';
  nav.innerHTML = '<a href="/" id="create-new-button" title="Create new site" class="button primary action new">Create new site</a>';

  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  // List all sites (Dark Alley & Google Drive)
  const fetchAllSites = () => {
    fetchSites(token);
    fetchSites(token, 'darkAlley');
  };
  const searchTerm = readQueryParams().search || '';
  const sites = container.querySelector('.sites');
  sites.innerHTML = `<input value="${searchTerm}" type="search" placeholder="Filter sites" class="filter-sites filter"><div class="sites-list"><section class="sites-list-dark-alley"></section><section class="sites-list-google-drive"></section></div>`;

  document.querySelector('.filter-sites').oninput = (event) => {
    if (event.target.value) {
      writeQueryParams({ search: event.target.value });
    } else {
      removeQueryParams(['search']);
    }
    fetchAllSites();
  };

  fetchAllSites();
}
