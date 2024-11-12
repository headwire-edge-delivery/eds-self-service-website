import {
  waitForAuthenticated, SCRIPT_API, KESTREL_ONE, getUserSettings, updateUserSettings,
  OOPS,
  safeText,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
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

export default async function renderSites({ container, nav }) {
  const userSettings = await getUserSettings(SCRIPT_API);
  const token = await window.auth0Client.getTokenSilently();

  const fetchProjects = async (type = 'googleDrive', scrollTo = false) => {
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

    const title = isDarkAlley ? '<h2 id="da-sites">Dark Alley Sites (Experimental)</h2>' : '<h2 id="sites">Google Drive Sites</h2>';
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
    <ul class="my-sites-overview" data-totalitems=${pagination.totalItems}></ul>
    ${paginator(pagination.totalItems, currentLimit, actualPage)}
    `;

      const ul = sitesList.querySelector('.my-sites-overview');

      if (!isDarkAlley && !projects.length) {
        container.querySelector('.well').hidden = false;
        nav.querySelector('#create-new-button').remove();
      }

      projects.forEach(({ projectSlug, projectName, projectDescription }) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
        <a>
          <div class="project-thumbnail" ></div>
          <div class="project-content">
            <h2></h2>
            <p><strong></strong></p>
            <p class="project-description"></p>
          </div>
        </a>
      `;

        listItem.querySelector('a').href = `/${isDarkAlley ? 'da-site' : 'site'}/${projectSlug}/overview`;
        listItem.querySelector('.project-thumbnail').dataset.src = `https://${projectSlug}.${KESTREL_ONE}`;
        const h2 = listItem.querySelector('h2');
        h2.textContent = projectName;
        h2.title = projectName;
        const [slugP, descP] = listItem.querySelectorAll('p');
        slugP.title = projectSlug;
        slugP.children[0].textContent = projectSlug; // in strong
        descP.title = projectDescription || '';
        descP.innerText = projectDescription || '';

        ul.append(listItem);
      });

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
          newSitesList.innerHTML = renderSkeleton('sites');

          fetchProjects(type, scrollY);
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
  };

  // List all sites (Dark Alley & Google Drive)
  const fetchAllSites = (scrollTo = false) => {
    container.querySelector('.sites-list-dark-alley').innerHTML = `<div class="sites">${renderSkeleton('sites')}</div>`;
    container.querySelector('.sites-list-google-drive').innerHTML = `<div class="sites">${renderSkeleton('sites')}</div>`;
    fetchProjects('darkAlley', scrollTo);
    fetchProjects('googleDrive', scrollTo);
  };

  container.innerHTML = `
    <div class="well" hidden>
        <img src="/icons/illustrations/pc.svg" alt="" loading="lazy"/>
        <div class="text">
          <h2>Create your first website</h2>
          <p>It’s never been easier to create a website. Pick a template, edit your content and publish to the Web.</p>
          <a id="create-new-button" href="/" class="button primary">Start now</a>
        </div>
    </div>
    <div class="sites"></div>
  `;
  nav.innerHTML = '<a href="/" id="create-new-button" title="Create new site" class="button primary action new">Create new site</a>';

  await waitForAuthenticated();

  const search = readQueryParams().search || '';

  const owner = readQueryParams().owner || userSettings?.filterByOwner || 'all';
  const sites = container.querySelector('.sites');
  const filter = `<ul class="owner-selector">
          <li data-owner="all"><button class="button selector action secondary ${owner === 'all' ? 'is-selected' : ''}">Owner: Anyone</button></li>
          <li data-owner="me"><button class="button selector action secondary ${owner === 'me' ? 'is-selected' : ''}">Owner: Me</button></li>
        </ul>`;
  sites.innerHTML = `${filter}<input value="${safeText(search)}" type="search" placeholder="Filter sites" class="filter-sites filter"><div class="sites-list"><section class="sites-list-dark-alley"></section><section class="sites-list-google-drive"></section></div>`;
  const filterSitesInput = sites.querySelector('.filter-sites');

  const ownerSelectorContainer = sites.querySelector('.owner-selector');
  ownerSelectorContainer.addEventListener('click', async (event) => {
    const ownerSelector = event.target.closest('li');
    if (ownerSelector) {
      if (ownerSelector.querySelector('button').classList.contains('is-selected')) {
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
  filterSitesInput.oninput = (function () {
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
