import { SCRIPT_API, onAuthenticated, OOPS } from '../../scripts/scripts.js';
import { toggleAutoTour, fetchUserSettings } from '../../tour/main.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();

    if (window.location.pathname === '/dashboard') {
      window.history.replaceState({}, '', '/dashboard/sites');
    }

    const selected = window.location.pathname.split('/').pop();

    block.innerHTML = `
        <div class="nav">
          <h1>Dashboard</h1>
          <a href="/" id="create-new-button" title="Create new site" class="button primary new">Create new site</a>
          <a href="https://myaccount.google.com/?authuser=${user.email}" target="_blank" id="edit-account-button" class="button edit primary">Edit account</a>
        </div>
        <div class="content">
            <aside>
                <ul>
                    <li>
                      <a href="sites" class="button action secondary ${selected === 'sites' ? 'is-selected' : ''}">
                          <span class="icon icon-web">
                            <img alt src="/icons/web.svg" loading="lazy">  
                          </span>
                          Sites
                      </a>
                    </li>
                    <li>
                      <a href="account" class="button action secondary ${selected === 'account' ? 'is-selected' : ''}">
                          <span class="icon icon-user">
                            <img alt src="/icons/user.svg" loading="lazy">
                          </span>
                          Account
                      </a>
                    </li>
                </ul>
            </aside>
            <div class="details">
              <div class="account ${selected === 'account' ? 'is-selected' : ''}">
                <div class="account-details">
                  <div>
                      <strong>Name</strong>
                      <span>${user.name}</span>
                  </div>
                  <div>
                      <strong>Email</strong>
                      <span>${user.email}</span>
                  </div>
                  <div>
                      <strong>Last update</strong>
                      <span>${new Date(user.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div id="current-plan-wrapper">
                      <strong>Plan</strong>
                      <span id="current-plan">Free</span>
                  </div>
                  </div>
                  <div id="toggle-auto-tour">
                  <button id="toggle-auto-tour-button" class="button secondary action">Enable Auto Tour</button>
                  </div>
              </div>
              <div class="sites ${selected === 'sites' ? 'is-selected' : ''}">
                <p>
                    <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                </p> 
              </div>
            </div>
        </div>
    `;

    const details = block.querySelector('.details');
    const aside = block.querySelector('aside');
    const account = block.querySelector('.account');
    const sites = block.querySelector('.sites');
    const userSettings = await fetchUserSettings(SCRIPT_API);
    const { showAutoTour } = userSettings;

    if (showAutoTour) {
      block.querySelector('#toggle-auto-tour-button').textContent = 'Disable Auto Tour';
    }

    block.querySelector('.new').onclick = () => {
      window?.zaraz?.track('click dashboard new site', { url: window.location.href });
    };

    block.querySelector('.edit').onclick = () => {
      window?.zaraz?.track('click dashboard edit account', { url: window.location.href });
    };

    block.querySelector('#toggle-auto-tour-button').onclick = () => {
      toggleAutoTour(SCRIPT_API);
      window.location.reload();
    };

    aside.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        event.preventDefault();

        const identifier = event.target.closest('a').getAttribute('href');
        window.history.pushState({}, '', `/dashboard/${identifier}`);

        aside.querySelector('.is-selected').classList.remove('is-selected');
        details.querySelector('.is-selected').classList.remove('is-selected');

        event.target.closest('a').classList.add('is-selected');
        block.querySelector(`.${identifier}`).classList.add('is-selected');
      }
    });

    window.onpopstate = () => {
      const identifier = window.location.pathname.split('/').pop();
      const link = aside.querySelector(`[href="${identifier}"]`).click();
      if (link) {
        link.click();
      }
    };

    // Add plans
    const plans = document.querySelector('.plans-dialog-wrapper');
    if (!plans) {
      document.addEventListener('block-plans:ready', () => {
        account.append(document.querySelector('.plans-dialog-wrapper'));
      });
    } else {
      account.append(plans);
    }

    // List all sites
    const reqList = await fetch(`${SCRIPT_API}/list`, {
      headers: {
        'content-type': 'application/json',
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqList.ok) {
      const { projects, darkAlleyProjects } = await reqList.json();

      const hasDarkAlley = document.body.classList.contains('is-headwire') || document.body.classList.contains('is-adobe');

      if (!projects.length && !hasDarkAlley) {
        sites.innerHTML = '<p>No Sites found</p>';
        return;
      }

      await fetch(`${SCRIPT_API}/userSettings`, {
        headers: {
          'content-type': 'application/json',
          authorization: `bearer ${token}`,
        },
        method: 'POST',
        body: JSON.stringify(
          { userSettings: { projects: { google: projects, darkAlley: darkAlleyProjects } } },
        ),
        // eslint-disable-next-line no-console
      }).catch((error) => console.error(error));

      sites.innerHTML = '<input type="text" placeholder="Filter sites" class="filter">';

      // MARK: dark alley projects
      if (darkAlleyProjects.length) {
        const darkAlleySection = document.createElement('section');
        darkAlleySection.classList.add('dark-alley-section');
        darkAlleySection.id = 'dark-alley-section';

        darkAlleySection.innerHTML = `
          <h3>Dark Alley Sites (Experimental)</h3>
          <ul>
            ${darkAlleyProjects.map(({ projectSlug, projectName, projectDescription }) => `
              <li>
                <a href="/da-site/${projectSlug}">
                  <h2>${projectName}</h2>
                  <p><strong>${projectSlug}</strong></p>
                  <p>${projectDescription || ''}</p>
                </a>
              </li>
            `).join('')}
          </ul>
        `;

        sites.append(darkAlleySection);
      }

      if (projects.length) {
        const sitesSection = document.createElement('section');
        sitesSection.id = 'google-drive-section';
        sitesSection.innerHTML = `
          <h3>Google Drive Sites</h3>
          <ul id="my-sites-overview">
            ${projects.map(({ projectSlug, projectName, projectDescription }) => `
              <li>
                <a href="/site/${projectSlug}">
                  <h2>${projectName}</h2>
                  <p><strong>${projectSlug}</strong></p>
                  <p>${projectDescription || ''}</p>
                </a>
              </li>
            `).join('')}
          </ul>
        `;

        sites.append(sitesSection);
      }

      const filter = sites.querySelector('.filter');
      filter.oninput = () => {
        if (filter.value.length) {
          sites.querySelectorAll('h2')
            .forEach((el) => {
              el.closest('li').hidden = !el.textContent.toLowerCase().includes(filter.value.toLowerCase().trim());
            });
        } else {
          sites.querySelectorAll('li[hidden]').forEach((el) => {
            el.hidden = false;
          });
        }
      };
    } else {
      sites.querySelector('.content p').textContent = OOPS;
    }
  });
}
