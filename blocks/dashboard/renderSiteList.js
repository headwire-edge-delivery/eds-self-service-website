import {
  hasDarkAlleyAccess,
  KESTREL_ONE, OOPS, SCRIPT_API, waitForAuthenticated,
} from '../../scripts/scripts.js';

export default async function renderSites({ container, nav }) {
  container.innerHTML = '<img src="/icons/loading.svg" alt="loading"/>';
  nav.innerHTML = '<a href="/" id="create-new-button" title="Create new site" class="button primary action new">Create new site</a>';

  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  const projectsResponse = await fetch(`${SCRIPT_API}/list`, {
    headers: {
      'content-type': 'application/json',
      authorization: `bearer ${token}`,
    },
  }).catch(() => ({ ok: false }));

  if (!projectsResponse.ok) {
    container.innerHTML = OOPS;
    return;
  }

  const { projects, darkAlleyProjects } = await projectsResponse.json().catch(() => ({}));

  if (!projects?.length && !hasDarkAlleyAccess()) {
    container.innerHTML = '<p>No Sites found</p>';
    return;
  }

  container.innerHTML = '';

  // TODO: consolidate DA & Drive projects if we ever commit to both
  // MARK: List DA
  if (darkAlleyProjects?.length) {
    const darkAlleySection = document.createElement('section');
    darkAlleySection.classList.add('dark-alley-section');
    darkAlleySection.id = 'dark-alley-section';

    darkAlleySection.innerHTML = `
      <h3>Dark Alley Sites (Experimental)</h3>
      <ul>
        ${darkAlleyProjects
    .map(
      ({ projectSlug, projectName, projectDescription }) => `
          <li>
            <a href="/da-site/${projectSlug}">
              <div class="project-thumbnail" data-src="https://${projectSlug}.${KESTREL_ONE}"></div>
              <div class="project-content">
                <h2>${projectName}</h2>
                <p><strong>${projectSlug}</strong></p>
                <p>${projectDescription || ''}</p>
              </div>  
            </a>
          </li>
        `,
    )
    .join('')}
      </ul>
    `;

    container.append(darkAlleySection);
  }

  // MARK: list drive
  if (projects?.length) {
    const sitesSection = document.createElement('section');
    sitesSection.id = 'google-drive-section';
    sitesSection.innerHTML = `
      <h3>Google Drive Sites</h3>
      <ul id="my-sites-overview">
        ${projects
    .map(
      ({ projectSlug, projectName, projectDescription }) => `
          <li>
            <a href="/site/${projectSlug}">
              <div class="project-thumbnail" data-src="https://${projectSlug}.${KESTREL_ONE}"></div>
              <div class="project-content">
                <h2 title="${projectName}">${projectName}</h2>
                <p title="${projectSlug}"><strong>${projectSlug}</strong></p>
                <p class="project-description" title="${projectDescription || ''}">${projectDescription || ''}</p>
              </div>
            </a>
          </li>
        `,
    )
    .join('')}
      </ul>
    `;

    container.append(sitesSection);
  }

  // MARK: filter
  const siteFilter = document.createElement('input');
  siteFilter.type = 'text';
  siteFilter.placeholder = 'Filter sites';
  siteFilter.classList.add('filter-sites', 'filter');
  container.prepend(siteFilter);
  siteFilter.addEventListener('input', (event) => {
    const filter = event?.target?.value?.toLowerCase().trim();
    if (!filter) {
      container.querySelectorAll('li[hidden]').forEach((el) => {
        el.hidden = false;
      });
      return;
    }

    container.querySelectorAll('h2').forEach((el) => {
      el.closest('li').hidden = !el.textContent.toLowerCase().includes(filter);
    });
  });

  // MARK: thumbnails
  container.querySelectorAll('.project-thumbnail').forEach((thumbnail) => {
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
            src = src.replace('<meta property="og:image" content="', '').replace('">', '').trim();
            thumbnail.innerHTML = `<img src="${src}" alt="thumbnail" loading="lazy"/>`;
          }
        }
      })
      .catch(() => null);
  });
}
