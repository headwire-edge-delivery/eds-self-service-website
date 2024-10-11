import { OOPS, SCRIPT_API, waitForAuthenticated } from '../../scripts/scripts.js';

export default async function renderAdmin({ container }) {
  container.innerHTML = `
    <h2>User activity</h2>
    <div class="known-users">
        <p>
            <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
        </p>
    </div>
    
    <h2>Deleted users</h2>
    <div class="deleted-users">
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
  `;
  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  const onFilterInput = (filterInput, filterContainer) => {
    if (filterInput.value.length) {
      filterContainer.querySelectorAll('tbody tr').forEach((el) => {
        el.hidden = !el
          .querySelector('td')
          .textContent.toLowerCase()
          .includes(filterInput.value.toLowerCase().trim());
      });
    } else {
      filterContainer.querySelectorAll('tbody tr[hidden]').forEach((el) => {
        el.hidden = false;
      });
    }
  };

  const onActivitiesClick = async (event) => {
    const button = event.target;
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
                      ${
  timestamps.length
    ? timestamps
      .reverse()
      .map(
        (timestamp) => `
                        <tr>
                          <td>${tracking[timestamp].event}${tracking[timestamp].isSPA ? ' SPA' : ''}</td>
                          <td>${new Date(Number(timestamp)).toLocaleString()}</td>
                          <td><a href="${tracking[timestamp].url}" target="_blank">${tracking[timestamp].url}</a></td>
                          <td>${tracking[timestamp].location.city} - ${tracking[timestamp].location.country}</td>
                          <td>${tracking[timestamp].ip}</td>
                          <td>${
  tracking[timestamp].referrer
    ? `<a href="${tracking[timestamp].referrer}" target="_blank">${tracking[timestamp].referrer}`
    : ''
}</td>
                          <td>${tracking[timestamp].userAgent.browser.name} ${
  tracking[timestamp].userAgent.browser.version
} ${tracking[timestamp].language}</td>
                          <td>${tracking[timestamp].userAgent.device?.vendor ?? ''} ${tracking[timestamp].userAgent.os.name} ${
  tracking[timestamp].userAgent.os.version
}</td>
                        </tr>
                      `,
      )
      .join('')
    : '<tr><td colspan="8" class="empty">Not enough data</td></tr>'
}
                  </tbody>
                </table>
              </div>
            `);
    } else {
      window.alertDialog(OOPS);
    }

    button.classList.remove('loading');
  };

  const renderUsers = async (page) => {
    const usersContainer = container.querySelector('.admin .known-users');

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
                ${users
    .map(
      (u) => `
                  <tr>
                    <td>${u.email}</td>
                    <td>${u.name}</td>
                    <td>${new Date(u.created_at).toLocaleString()}</td>
                    <td>${new Date(u.last_login).toLocaleString()}</td>
                    <td>${u.logins_count}</td>
                    <td><button data-user="${u.email}" class="button action secondary">Show activity</button></td>
                  </tr>
                `,
    )
    .join('')}
            </tbody>
        </table>
        <div class="button-container">
            ${pages}
        </div>
      `;

      const filterUsers = usersContainer.querySelector('.filter-users');
      filterUsers.oninput = () => {
        onFilterInput(filterUsers, usersContainer);
      };

      usersContainer.querySelectorAll('.page').forEach((button) => {
        button.onclick = () => {
          renderUsers(Number(button.textContent) - 1);
        };
      });

      usersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });
    } else {
      usersContainer.querySelector('p').textContent = OOPS;
    }
  };

  const renderDeletedUsers = async () => {
    const deletedUsersContainer = container.querySelector('.admin .deleted-users');

    const reqDeletedUsers = await fetch(`${SCRIPT_API}/tracking/deletedUsers`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqDeletedUsers.ok) {
      const deletedUsers = await reqDeletedUsers.json();

      deletedUsersContainer.innerHTML = `
            <input type="text" placeholder="Filter by user email" class="filter-deleted-users filter">
            <table class="deleted-users">
                <thead>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Created at</th>
                    <th>Deleted at</th>
                    <th>Last login</th>
                    <th>Logins count</th>
                    <th></th>
                </thead>
                <tbody>
                    ${Object.keys(deletedUsers).map((u) => `
                      <tr>
                        <td>${deletedUsers[u].email}</td>
                        <td>${deletedUsers[u].name}</td>
                        <td>${new Date(deletedUsers[u].created_at).toLocaleString()}</td>
                        <td>${new Date(deletedUsers[u].deleted_at).toLocaleString()}</td>
                        <td>${new Date(deletedUsers[u].last_login).toLocaleString()}</td>
                        <td>${deletedUsers[u].logins_count}</td>
                        <td><button data-user="${deletedUsers[u].email}" class="button action secondary">Show activity</button></td>
                      </tr>
                    `).join('')}
                </tbody>
            </table>
          `;

      const filterDeletedUsers = deletedUsersContainer.querySelector('.filter-deleted-users');
      filterDeletedUsers.oninput = () => {
        onFilterInput(filterDeletedUsers, deletedUsersContainer);
      };

      deletedUsersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });
    } else {
      deletedUsersContainer.querySelector('p').textContent = OOPS;
    }
  };

  const renderAnonymous = async () => {
    const anonymousContainer = container.querySelector('.admin .anonymous-users');

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
                ${ips
    .reverse()
    .map((ip) => Object.keys(anonymous[ip])
      .reverse()
      .map(
        (timestamp) => (['server api request', 'server page request', 'server redirect request'].includes(anonymous[ip][timestamp].event) ? `
                        <tr>
                          <td>${anonymous[ip][timestamp].ip}</td>
                          <td>${anonymous[ip][timestamp].event}</td>
                          <td>${new Date(Number(timestamp)).toLocaleString()}</td>
                          <td><a href="${anonymous[ip][timestamp].url}" target="_blank">${anonymous[ip][timestamp].url}</a></td>
                          <td>${anonymous[ip][timestamp].city} - ${anonymous[ip][timestamp].country}</td>
                          
                          <td>${anonymous[ip][timestamp].referrer ? `<a href="${anonymous[ip][timestamp].referrer}" target="_blank">${anonymous[ip][timestamp].referrer}</a>` : ''}</td>
                          <td>${anonymous[ip][timestamp].browser ?? ''} ${anonymous[ip][timestamp].language ?? ''}</td>
                          <td>${anonymous[ip][timestamp].platform ?? ''}</td>
                        </tr>
                    ` : `
                    <tr>
                      <td>${anonymous[ip][timestamp].ip}</td>
                      <td>${anonymous[ip][timestamp].event}${anonymous[ip][timestamp].isSPA ? ' SPA' : ''}</td>
                      <td>${new Date(Number(timestamp)).toLocaleString()}</td>
                      <td><a href="${anonymous[ip][timestamp].url}" target="_blank">${
            anonymous[ip][timestamp].url
          }</a></td>
                      <td>${anonymous[ip][timestamp].location.city} - ${anonymous[ip][timestamp].location.country}</td>
                      
                      <td>${
          anonymous[ip][timestamp].referrer
            ? `<a href="${anonymous[ip][timestamp].referrer}" target="_blank">${anonymous[ip][timestamp].referrer}</a>`
            : ''
          }</td>
                      <td>${anonymous[ip][timestamp].userAgent.browser.name} ${
            anonymous[ip][timestamp].userAgent.browser.version
          } ${anonymous[ip][timestamp].language}</td>
                      <td>${anonymous[ip][timestamp].userAgent.device?.vendor ?? ''} ${
            anonymous[ip][timestamp].userAgent.os.name
          } ${anonymous[ip][timestamp].userAgent.os.version}</td>
                    </tr>
                  `),
      )
      .join(''))
    .join('')}
            </tbody>
        </table>
      `;

      const filterAnonymous = anonymousContainer.querySelector('.filter-anonymous');
      filterAnonymous.oninput = () => {
        onFilterInput(filterAnonymous, anonymousContainer);
      };
    } else {
      anonymousContainer.querySelector('p').textContent = OOPS;
    }
  };

  renderUsers(0);
  renderDeletedUsers();
  renderAnonymous();
}
