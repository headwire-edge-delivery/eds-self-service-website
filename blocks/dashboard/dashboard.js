import {
  SCRIPT_API, onAuthenticated, OOPS, updateUserSettings, getUserSettings,
  hasDarkAlleyAccess, KESTREL_ONE, createTabs,
  waitForAuthenticated,
} from '../../scripts/scripts.js';
import renderSites from './renderSiteList.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.innerHTML = '<div class="is-selected"><img src="/icons/loading.svg" alt="loading" loading="lazy"/></div>';

  await waitForAuthenticated();
  const isAdmin = document.body.classList.contains('is-headwire');

  createTabs({
    block,
    breadcrumbs: [
      { name: 'Dashboard', href: '/dashboard' },
    ],
    tabs: [
      {
        name: 'Sites',
        href: '/dashboard/sites',
        iconSrc: '/icons/web.svg',
        renderTab: renderSites,
      },
      { name: 'Account', href: '/dashboard/account', iconSrc: '/icons/user.svg' },
      isAdmin ? { name: 'Admin', href: '/dashboard/admin', iconSrc: '/icons/admin.svg' } : null,
    ],
  });
  return;
  onAuthenticated(async () => {
    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();
    const isAdmin = document.body.classList.contains('is-headwire');

    if (window.location.pathname === '/dashboard') {
      window.history.replaceState({}, '', '/dashboard/sites');
    }

    const selected = window.location.pathname.split('/').pop();

    block.innerHTML = `
        <div class="nav">
          <h1>Dashboard</h1>
          <div class="actions">
            <div class="sites button-container ${selected === 'sites' ? 'is-selected' : ''}">
                <a href="/" id="create-new-button" title="Create new site" class="button primary action new">Create new site</a>
            </div>
            <div class="account button-container ${selected === 'account' ? 'is-selected' : ''}">
                <a href="https://myaccount.google.com/?authuser=${user.email}" target="_blank" id="edit-account-button" class="button edit action primary">Edit account</a>
            </div>
            <div class="admin button-container ${selected === 'admin' ? 'is-selected' : ''}"></div>
          </div>
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
                    <li class="admin">
                      <a href="admin" class="button action secondary ${selected === 'admin' ? 'is-selected' : ''}">
                          <span class="icon icon-admin">
                            <img alt src="/icons/admin.svg" loading="lazy">
                          </span>
                          Admin
                      </a>
                    </li>
                </ul>
            </aside>
            <div class="details">
              <div class="account ${selected === 'account' ? 'is-selected' : ''}">
                <div class="account-details">
                  <div>
                      <strong>Name</strong>
                      <span title="${user.name}">${user.name}</span>
                  </div>
                  <div>
                      <strong>Email</strong>
                      <span title="${user.email}">${user.email}</span>
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
              <div class="admin ${selected === 'admin' ? 'is-selected' : ''}">
                <h2>User activity</h2>
                <div class="known-users">
                    <p>
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </p>
                </div>
                
                <h2>Anonymous activity</h2>
                <div class="anonymous-users">
                    <p>
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </p>
                </div>
              </div>
            </div>
        </div>
    `;

    const details = block.querySelector('.details');
    const aside = block.querySelector('aside');
    const actions = block.querySelector('.actions');

    const account = details.querySelector('.account');
    const sites = details.querySelector('.sites');

    const userSettings = await getUserSettings(SCRIPT_API);
    const toggleAutoTourButton = block.querySelector('#toggle-auto-tour-button');

    if (userSettings?.showAutoTour) {
      toggleAutoTourButton.textContent = 'Disable Auto Tour';
    }
    toggleAutoTourButton.setAttribute('data-loaded', 'true');

    block.querySelector('.new').onclick = () => {
      window?.zaraz?.track('click dashboard new site');
    };

    block.querySelector('.edit').onclick = () => {
      window?.zaraz?.track('click dashboard edit account');
    };

    toggleAutoTourButton.onclick = async () => {
      toggleAutoTourButton.setAttribute('data-loaded', 'false');
      toggleAutoTourButton.classList.add('loading');
      const success = await updateUserSettings({ showAutoTour: !userSettings.showAutoTour });
      if (success) {
        userSettings.showAutoTour = !userSettings.showAutoTour;
        toggleAutoTourButton.textContent = userSettings.showAutoTour ? 'Disable Auto Tour' : 'Enable Auto Tour';
      }
      toggleAutoTourButton.classList.remove('loading');
      toggleAutoTourButton.setAttribute('data-loaded', 'true');
    };

    aside.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        event.preventDefault();

        const identifier = event.target.closest('a').getAttribute('href');
        window.history.pushState({}, '', `/dashboard/${identifier}`);

        actions.querySelector('.is-selected').classList.remove('is-selected');
        aside.querySelector('.is-selected').classList.remove('is-selected');
        details.querySelector('.is-selected').classList.remove('is-selected');

        event.target.closest('a').classList.add('is-selected');
        details.querySelector(`.${identifier}`).classList.add('is-selected');
        actions.querySelector(`.${identifier}`).classList.add('is-selected');
      }
    });

    window.onpopstate = () => {
      const identifier = window.location.pathname.split('/').pop();
      const link = aside.querySelector(`[href="${identifier}"]`).click();
      if (link) {
        link.click();
      }
    };

    // Add plans & account details
    const additionalFragments = document.querySelectorAll('main > .fragment-wrapper, main > .section > .fragment-wrapper');
    additionalFragments.forEach((fragment) => {
      account.append(fragment);
    });

    // List all sites
    const reqList = await fetch(`${SCRIPT_API}/list`, {
      headers: {
        'content-type': 'application/json',
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqList.ok) {
      const { projects, darkAlleyProjects } = await reqList.json();

      const hasDarkAlley = hasDarkAlleyAccess();

      if (!projects.length && !hasDarkAlley) {
        sites.innerHTML = '<p>No Sites found</p>';
        return;
      }

      sites.innerHTML = '<input type="text" placeholder="Filter sites" class="filter-sites filter">';

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
                  <div class="project-thumbnail" data-src="https://${projectSlug}.${KESTREL_ONE}"></div>
                  <div class="project-content">
                    <h2>${projectName}</h2>
                    <p><strong>${projectSlug}</strong></p>
                    <p>${projectDescription || ''}</p>
                  </div>  
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
        `;

        sites.append(sitesSection);
      }

      const filterSites = sites.querySelector('.filter-sites');
      filterSites.oninput = () => {
        if (filterSites.value.length) {
          sites.querySelectorAll('h2')
            .forEach((el) => {
              el.closest('li').hidden = !el.textContent.toLowerCase().includes(filterSites.value.toLowerCase().trim());
            });
        } else {
          sites.querySelectorAll('li[hidden]').forEach((el) => {
            el.hidden = false;
          });
        }
      };

      sites.querySelectorAll('.project-thumbnail').forEach((thumbnail) => {
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
    } else {
      sites.querySelector('.content p').textContent = OOPS;
    }

    // Admin panel
    if (isAdmin) {
      const renderUsers = async (page) => {
        const usersContainer = details.querySelector('.admin .known-users');

        usersContainer.innerHTML = `
          <p>
              <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
          </p>
        `;

        const reqUsers = await fetch(`${SCRIPT_API}/tracking?page=${page}`, {
          headers: {
            authorization: `bearer ${token}`,
          },
        }).catch(() => ({ ok: false }));

        if (reqUsers.ok) {
          const { users, total, limit } = await reqUsers.json();

          let pages = '';
          for (let i = 0; i < Math.ceil(total / limit); i += 1) {
            pages += `<button class="page button action ${i === page ? 'primary' : 'secondary'}">${i + 1}</button>`;
          }

          usersContainer.innerHTML = `
            <input type="text" placeholder="Filter by user email" class="filter-users filter">
            <table class="users">
                <thead>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Created at</th>
                    <th>Last login</th>
                    <th>Logins count</th>
                    <th></th>
                </thead>
                <tbody>
                    ${users.map((u) => `
                      <tr>
                        <td>${u.email}</td>
                        <td>${u.name}</td>
                        <td>${new Date(u.created_at).toLocaleString()}</td>
                        <td>${new Date(u.last_login).toLocaleString()}</td>
                        <td>${u.logins_count}</td>
                        <td><button data-user="${u.email}" class="button action secondary">Show activity</button></td>
                      </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="button-container">
                ${pages}
            </div>
          `;

          const filterUsers = usersContainer.querySelector('.filter-users');
          filterUsers.oninput = () => {
            if (filterUsers.value.length) {
              usersContainer.querySelectorAll('tbody tr')
                .forEach((el) => {
                  el.hidden = !el.querySelector('td').textContent.toLowerCase().includes(filterUsers.value.toLowerCase().trim());
                });
            } else {
              usersContainer.querySelectorAll('.users tbody tr[hidden]').forEach((el) => {
                el.hidden = false;
              });
            }
          };

          usersContainer.querySelectorAll('.page').forEach((button) => {
            button.onclick = () => {
              renderUsers(Number(button.textContent) - 1);
            };
          });

          usersContainer.querySelectorAll('button[data-user]').forEach((button) => {
            button.onclick = async () => {
              button.classList.add('loading');

              const reqTracking = await fetch(`${SCRIPT_API}/tracking?user=${button.dataset.user}`, {
                headers: {
                  authorization: `bearer ${token}`,
                },
              }).catch(() => ({ ok: false }));

              if (reqTracking.ok) {
                const tracking = await reqTracking.json();
                const timestamps = Object.keys(tracking);

                window.createDialog(`
                  <div class="admin">
                    <h3>${button.dataset.user} recent activity</h3>
                    <table>
                      <thead>
                          <th>Event</th>
                          <th>Date</th>
                          <th>URL</th>
                          <th>Location</th>
                          <th>IP</th>
                          <th>Referrer</th>
                          <th>Browser</th>
                          <th>Device</th>
                      </thead>
                      <tbody>
                          ${timestamps.length ? timestamps.reverse().map((timestamp) => `
                            <tr>
                              <td>${tracking[timestamp].event}${tracking[timestamp].isSPA ? ' SPA' : ''}</td>
                              <td>${new Date(Number(timestamp)).toLocaleString()}</td>
                              <td><a href="${tracking[timestamp].url}" target="_blank">${tracking[timestamp].url}</a></td>
                              <td>${tracking[timestamp].location.city} - ${tracking[timestamp].location.country}</td>
                              <td>${tracking[timestamp].ip}</td>
                              <td>${tracking[timestamp].referrer ? `<a href="${tracking[timestamp].referrer}" target="_blank">${tracking[timestamp].referrer}` : ''}</td>
                              <td>${tracking[timestamp].userAgent.browser.name} ${tracking[timestamp].userAgent.browser.version} ${tracking[timestamp].language}</td>
                              <td>${tracking[timestamp].userAgent.device.vendor} ${tracking[timestamp].userAgent.os.name} ${tracking[timestamp].userAgent.os.version}</td>
                            </tr>
                          `).join('') : '<tr><td colspan="8" class="empty">Not enough data (e.g. user disabled tracking)</td></tr>'}
                      </tbody>
                    </table>
                  </div>
                `);
              } else {
                window.alertDialog(OOPS);
              }

              button.classList.remove('loading');
            };
          });
        } else {
          usersContainer.querySelector('p').textContent = OOPS;
        }
      };

      const renderAnonymous = async () => {
        const anonymousContainer = details.querySelector('.admin .anonymous-users');

        const reqAnonymous = await fetch(`${SCRIPT_API}/tracking?user=anonymous`, {
          headers: {
            authorization: `bearer ${token}`,
          },
        }).catch(() => ({ ok: false }));

        if (reqAnonymous.ok) {
          const anonymous = await reqAnonymous.json();
          const ips = Object.keys(anonymous);

          anonymousContainer.innerHTML = `
            <input type="text" placeholder="Filter by IP" class="filter-anonymous filter">
            <table class="anonymous">
                <thead>
                    <th>IP</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>URL</th>
                    <th>Location</th>
                    <th>Referrer</th>
                    <th>Browser</th>
                    <th>Device</th>
                </thead>
                <tbody>
                    ${ips.reverse().map((ip) => Object.keys(anonymous[ip]).reverse().map((timestamp) => `
                        <tr>
                          <td>${anonymous[ip][timestamp].ip}</td>
                          <td>${anonymous[ip][timestamp].event}${anonymous[ip][timestamp].isSPA ? ' SPA' : ''}</td>
                          <td>${new Date(Number(timestamp)).toLocaleString()}</td>
                          <td><a href="${anonymous[ip][timestamp].url}" target="_blank">${anonymous[ip][timestamp].url}</a></td>
                          <td>${anonymous[ip][timestamp].location.city} - ${anonymous[ip][timestamp].location.country}</td>
                          
                          <td>${anonymous[ip][timestamp].referrer ? `<a href="${anonymous[ip][timestamp].referrer}" target="_blank">${anonymous[ip][timestamp].referrer}</a>` : ''}</td>
                          <td>${anonymous[ip][timestamp].userAgent.browser.name} ${anonymous[ip][timestamp].userAgent.browser.version} ${anonymous[ip][timestamp].language}</td>
                          <td>${anonymous[ip][timestamp].userAgent.device.vendor} ${anonymous[ip][timestamp].userAgent.os.name} ${anonymous[ip][timestamp].userAgent.os.version}</td>
                        </tr>
                      `).join('')).join('')}
                </tbody>
            </table>
          `;

          const filterAnonymous = anonymousContainer.querySelector('.filter-anonymous');
          filterAnonymous.oninput = () => {
            if (filterAnonymous.value.length) {
              anonymousContainer.querySelectorAll('tbody tr')
                .forEach((el) => {
                  el.hidden = !el.querySelector('td').textContent.toLowerCase().includes(filterAnonymous.value.toLowerCase().trim());
                });
            } else {
              anonymousContainer.querySelectorAll('.users tbody tr[hidden]').forEach((el) => {
                el.hidden = false;
              });
            }
          };
        } else {
          anonymousContainer.querySelector('p').textContent = OOPS;
        }
      };

      renderUsers(0);
      renderAnonymous();
    }
  });
}
