import { SCRIPT_API, onAuthenticated, OOPS } from '../../scripts/scripts.js';

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
          <a href="/" class="button primary new">Create new site</a>
          <a href="https://myaccount.google.com/" class="button edit primary">Edit account</a>
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
                  <div>
                      <strong>Plan</strong>
                      <span>Free</span>
                  </div>
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

    block.querySelector('.new').onclick = () => {
      window?.zaraz?.track('click dashboard new site', { url: window.location.href });
    };

    block.querySelector('.edit').onclick = () => {
      window?.zaraz?.track('click dashboard edit account', { url: window.location.href });
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

      if (!projects.length && !darkAlleyProjects.length) {
        sites.innerHTML = '<p>No Sites found</p>';
        return;
      }

      sites.innerHTML = '<input type="text" placeholder="Filter sites" class="filter">';

      // MARK: dark alley projects
      if (darkAlleyProjects.length) {
        const darkAlleySection = document.createElement('section');
        darkAlleySection.classList.add('dark-alley-section');

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
        sitesSection.innerHTML = `
          <h3>Google Drive Sites</h3>
          <ul>
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
