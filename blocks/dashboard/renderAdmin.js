import { OOPS, SCRIPT_API, waitForAuthenticated } from '../../scripts/scripts.js';
import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import paginator from '../../libs/pagination/pagination.js';

const paginatorEventlistener = (container, queryParam, functionName) => {
  container.addEventListener('click', (event) => {
    const scrollTop = window.scrollY;
    const button = event.target.closest('.paginator');
    if (button) {
      const newPage = Number(button.getAttribute('data-change-to'));
      writeQueryParams({ [queryParam]: newPage });
      container.innerHTML = '<p style="display: flex; justify-content: center;"><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p>';

      functionName(scrollTop);
    }
  });
};

export default async function renderAdmin({ container }) {
  let filterByIp = readQueryParams().ip || '';
  let filterByMail = readQueryParams().user || '';
  let filterByDeletedMail = readQueryParams().deleteduser || '';
  container.innerHTML = `
    <h2>User activity</h2>
    <input value="${filterByMail}" type="search" placeholder="Filter by user email" class="filter-users filter">
    <div class="known-users">
        <p>
            <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
        </p>
    </div>
    
    <h2>Deleted users</h2>
    <input value="${filterByDeletedMail}" type="search" placeholder="Filter by user email" class="filter-deleted-users filter">
    <div class="deleted-users">
        <p>
            <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
        </p>
    </div>
    
    <h2>Anonymous activity</h2>
    <input value="${filterByIp}" type="search" placeholder="Filter by IP" class="filter-anonymous filter">
    <div class="anonymous-users">
        <p>
            <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
        </p>
    </div>
  `;
  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();
  const anonymousContainer = container.querySelector('.admin .anonymous-users');

  const onFilterInput = (value, filterName, functionName) => {
    // saves the current scroll position
    const scrollTop = window.scrollY;

    if (value) {
      writeQueryParams({ [filterName]: value });
    } else {
      removeQueryParams([filterName]);
    }
    functionName();

    // restores the scroll position
    window.scrollTo(0, scrollTop);
  };

  const filterEventlistener = (filterClass, filterName, functionName) => {
    // eslint-disable-next-line func-names
    document.querySelector(filterClass).oninput = (function () {
      let debounceTimer;
      // eslint-disable-next-line func-names
      return function (event) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onFilterInput(event.target.value, filterName, functionName);
        }, 300);
      };
    }());
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

  const renderUsers = async (scrollTop) => {
    filterEventlistener('.filter-users', 'user', renderUsers);
    const usersContainer = container.querySelector('.admin .known-users');
    filterByMail = readQueryParams().user || '';
    const page = readQueryParams().page || 1;
    const limit = readQueryParams().limit || 10;

    usersContainer.innerHTML = '<p><img src="/icons/loading.svg" alt="loading" loading="lazy"/></p>';

    const reqUsers = await fetch(`${SCRIPT_API}/tracking?mail=${filterByMail}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqUsers.ok) {
      const usersJSON = await reqUsers.json();
      const users = usersJSON.data;
      const { pagination } = usersJSON;

      usersContainer.innerHTML = `
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
                ${users?.map(
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
        ${paginator(pagination.totalItems, limit, pagination.currentPage)}
      `;

      usersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });

      const newUsersContainer = usersContainer.cloneNode(true);
      // This clears the old event listeners
      usersContainer.replaceWith(newUsersContainer);

      paginatorEventlistener(newUsersContainer, 'page', renderUsers);

      if (scrollTop) {
        // restores the scroll position
        window.scrollTo(0, scrollTop);
      }
    } else {
      usersContainer.querySelector('p').textContent = OOPS;
    }
  };

  const renderDeletedUsers = async (scrollTop) => {
    filterEventlistener('.filter-deleted-users', 'deleteduser', renderDeletedUsers);
    const deletedUsersContainer = container.querySelector('.admin .deleted-users');
    filterByDeletedMail = readQueryParams().deleteduser || '';
    const page = readQueryParams().deletedpage || 1;
    const limit = readQueryParams().deletedlimit || 10;

    const reqDeletedUsers = await fetch(`${SCRIPT_API}/tracking/deletedUsers?user=${filterByDeletedMail}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqDeletedUsers.ok) {
      const deletedUsersJSON = await reqDeletedUsers.json();
      const deletedUsers = deletedUsersJSON.data;
      const { pagination } = deletedUsersJSON;

      deletedUsersContainer.innerHTML = `
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
            ${paginator(pagination.totalItems, limit, pagination.currentPage)}
          `;

      deletedUsersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });

      const newDeletedUsersContainer = deletedUsersContainer.cloneNode(true);
      // This clears the old event listeners
      deletedUsersContainer.replaceWith(newDeletedUsersContainer);

      paginatorEventlistener(newDeletedUsersContainer, 'deletedpage', renderDeletedUsers);

      if (scrollTop) {
        // restores the scroll position
        window.scrollTo(0, scrollTop);
      }
    } else {
      deletedUsersContainer.querySelector('p').textContent = OOPS;
    }
  };

  const renderAnonymous = async (scrollTop) => {
    filterEventlistener('.filter-anonymous', 'ip', renderAnonymous);
    filterByIp = readQueryParams().ip || '';
    const page = readQueryParams().ippage || 1;
    const limit = readQueryParams().iplimit || 10;

    const reqAnonymous = await fetch(`${SCRIPT_API}/tracking?user=anonymous&ip=${filterByIp}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqAnonymous.ok) {
      const anonymousJSON = await reqAnonymous.json();
      const anonymous = anonymousJSON.data;
      const { pagination } = anonymousJSON;
      const ips = Object.keys(anonymous);

      container.querySelector('.admin .anonymous-users').innerHTML = `
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
        ${paginator(pagination.totalItems, limit, pagination.currentPage)}
      `;

      const newAnonymousContainer = anonymousContainer.cloneNode(true);
      // This clears the old event listeners
      anonymousContainer.replaceWith(newAnonymousContainer);

      paginatorEventlistener(newAnonymousContainer, 'ippage', renderAnonymous);

      if (scrollTop) {
        // restores the scroll position
        window.scrollTo(0, scrollTop);
      }
    } else {
      anonymousContainer.querySelector('p').textContent = OOPS;
    }
  };

  renderUsers();
  renderDeletedUsers();
  renderAnonymous();
}
