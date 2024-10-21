import {
  waitForAuthenticated, SCRIPT_API, KESTREL_ONE, getUserSettings, updateUserSettings, OOPS,
} from '../../scripts/scripts.js';
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

async function fetchProjects(token, type = 'googleDrive', scrollTo = false) {
  const userSettings = await getUserSettings(SCRIPT_API);
  let currentPage = parseInt(readQueryParams().page, 10) || 1;
  let currentDaPage = parseInt(readQueryParams().dapage, 10) || 1;
  const limit = parseInt(readQueryParams().limit, 10) || 9;
  const daLimit = parseInt(readQueryParams().dalimit, 10) || limit;
  const search = readQueryParams().search || '';
  const owner = readQueryParams().owner || userSettings?.filterByOwner || 'all';
  const isDarkAlley = type === 'darkAlley';
  const sitesList = document.querySelector(isDarkAlley ? '.sites-list-dark-alley' : '.sites-list-google-drive');
  const currentLimit = Math.max(1, parseInt(isDarkAlley ? daLimit : limit, 10));
  const actualPage = isDarkAlley ? currentDaPage : currentPage;
  const url = `${SCRIPT_API}/${isDarkAlley ? 'darkAlleyList' : 'list'}?search=${encodeURIComponent(search)}&limit=${currentLimit}&page=${actualPage}&owner=${owner}`;

  const title = isDarkAlley ? '<h3 id="da-sites">Dark Alley Sites (Experimental)</h3>' : '<h3 id="sites">Google Drive Sites</h3>';
  try {
    const response = await fetch(url, {
      headers: {
        'content-type': 'application/json',
        authorization: `bearer ${token}`,
      },
    });
    const { projects, pagination } = await response.json();
    sitesList.innerHTML = `
            ${title}
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
      const { scrollY } = window;
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

        fetchProjects(token, type, scrollY);
      }
    });

    generateThumbnails();

    if (scrollTo) {
      window.location.hash = `#${isDarkAlley ? 'da-sites' : 'sites'}`;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    sitesList.innerHTML = `${title}<p>${OOPS}</p>`;
  }
}

export default async function renderSites({ container, nav }) {
  const userSettings = await getUserSettings(SCRIPT_API);
  const token = await window.auth0Client.getTokenSilently();
  // List all sites (Dark Alley & Google Drive)
  const fetchAllSites = (scrollTo = false) => {
    container.querySelector('.sites-list-dark-alley').innerHTML = '<div class="sites"><p><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p></div>';
    container.querySelector('.sites-list-google-drive').innerHTML = '<div class="sites"><p><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p></div>';
    fetchProjects(token, 'darkAlley', scrollTo);
    fetchProjects(token, 'googleDrive', scrollTo);
  };

  container.innerHTML = '<div class="sites"><p><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p></div>';
  nav.innerHTML = '<a href="/" id="create-new-button" title="Create new site" class="button primary action new">Create new site</a>';

  await waitForAuthenticated();

  const search = readQueryParams().search || '';

  const owner = readQueryParams().owner || userSettings?.filterByOwner || 'all';
  const sites = container.querySelector('.sites');
  const filter = `<ul class="owner-selector">
          <li data-owner="all"><div class="button action secondary ${owner === 'all' ? 'is-selected' : ''}">Owner: Anyone</div></li>
          <li data-owner="me"><div class="button action secondary ${owner === 'me' ? 'is-selected' : ''}">Owner: Me</div></li>
        </ul>`;
  sites.innerHTML = `${filter}<input value="${search}" type="search" placeholder="Filter sites" class="filter-sites filter"><div class="sites-list"><section class="sites-list-dark-alley"></section><section class="sites-list-google-drive"></section></div>`;

  const ownerSelectorContainer = sites.querySelector('.owner-selector');
  ownerSelectorContainer.addEventListener('click', async (event) => {
    const ownerSelector = event.target.closest('li');
    if (ownerSelector) {
      if (ownerSelector.querySelector('div').classList.contains('is-selected')) {
        return;
      }
      const newOwner = ownerSelector.getAttribute('data-owner');
      const success = await updateUserSettings({ filterByOwner: newOwner });
      if (!success) {
        return;
      }
      ownerSelectorContainer.querySelector('.is-selected').classList.remove('is-selected');
      ownerSelector.querySelector('.button').classList.add('is-selected');
      fetchAllSites();
    }
  });

  // eslint-disable-next-line func-names
  document.querySelector('.filter-sites').oninput = (function () {
    let debounceTimer;
    // eslint-disable-next-line func-names
    return function (event) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (event.target.value) {
          writeQueryParams({ search: event.target.value });
        } else {
          removeQueryParams(['search']);
        }
        fetchAllSites();
      }, 300);
    };
  }());

  fetchAllSites();
}
