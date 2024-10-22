import {
  dateToRelativeString, OOPS, SCRIPT_API, waitForAuthenticated,
} from '../../scripts/scripts.js';
import renderAnalytics from '../../scripts/analytics.js';
import { toClassName } from '../../scripts/aem.js';

const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
function parseAcceptLanguage(str) {
  if (!str) return null;
  // const mainLanguage =
  return langNames.of(str.split(',')[0]);
}

// header: sec-ch-ua
function parseBrowser(str) {
  if (!str) return null;

  const browserParts = str.split(',');
  try {
    let output = '';
    for (const browserStr of browserParts) {
      const browserName = browserStr.split(';')[0].trim().replaceAll('"', '');

      if (/not\?a_brand/i.test(browserName)) continue;
      if (/chromium/i.test(browserName)) {
        output = browserName;
        continue;
      }

      if (browserName) {
        output = browserName;
        break;
      }
    }

    return output;
  } catch (error) {
    return null;
  }
}

function createTable({
  headers, rows, tableClass = '', columns = [],
}) {
  if (!columns || !columns.length) {
    // eslint-disable-next-line no-param-reassign
    columns = headers.map(toClassName);
  }
  const table = document.createElement('table');
  table.className = tableClass;

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  table.append(thead, tbody);

  const headRow = document.createElement('tr');
  thead.append(headRow);

  for (let i = 0; i < headers.length; i += 1) {
    const th = document.createElement('th');
    th.textContent = headers[i];
    th.dataset.column = columns[i];
    headRow.append(th);
  }

  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const column of columns) {
      const td = document.createElement('td');
      const rowColumnItem = row[column];
      td.dataset.column = column;
      // add empty if undefined
      if (!rowColumnItem) {
        tr.append(td);
        continue;
      }
      // write html if defined
      if (rowColumnItem.html) {
        td.innerHTML = rowColumnItem.html;
        tr.append(td);
        continue;
      }
      // directly add string or number
      if (['string', 'number'].includes(typeof rowColumnItem)) {
        td.textContent = rowColumnItem || '';
      } else {
        // add object
        const { link, value, title } = rowColumnItem;
        let textContainer = td;
        // add link
        if (link) {
          const anchor = document.createElement('a');
          anchor.href = link;
          anchor.target = '_blank';
          td.append(anchor);
          textContainer = anchor;
        }
        // add title
        if (title) td.title = title;
        textContainer.textContent = value || '';
      }
      tr.append(td);
    }
    tbody.append(tr);
  }

  return { table, thead, tbody };
}

// MARK: render
export default async function renderAdmin({ container, nav }) {
  nav.insertAdjacentHTML('beforeend', `
    <a class="button secondary action" href="/site/kestrelone-emails/campaign-analytics">Campaign&nbsp;analytics</a>
  `);

  container.innerHTML = `
    <h2>Web analytics</h2>
    <div class="analytics">
        <p>
            <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
        </p>
    </div>
    
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

  // Load web analytics
  const loadWebAnalytics = async (interval) => {
    try {
      const req = await fetch(`${SCRIPT_API}/monitoring/admin?period=${interval}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!req?.ok) {
        throw new Error();
      }
      return [await req.json()];
    } catch (e) {
      window.alertDialog(OOPS);
    }

    return false;
  };

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
      .sort((timestampA, timestampB) => new Date(Number(timestampB)) - new Date(Number(timestampA)))
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
      console.log('users:', users);

      let pages = '';
      for (let i = 0; i < Math.ceil(total / limit); i += 1) {
        pages += `<button class="page button action ${i === page ? 'primary' : 'secondary'}">${i + 1}</button>`;
      }

      const usersTable = createTable({
        headers: ['Email', 'Name', 'Created at', 'Last login', 'Logins count', ''],
        columns: ['email', 'name', 'created_at', 'last_login', 'logins_count', 'buttons'],
        rows: users.map((u) => {
          const createdAt = new Date(u.created_at);
          const lastLogin = new Date(u.last_login);
          return {
            ...u,
            created_at: {
              title: createdAt.toLocaleString(),
              value: dateToRelativeString(createdAt),
            },
            last_login: {
              title: lastLogin.toLocaleString(),
              value: dateToRelativeString(lastLogin),
            },
            buttons: {
              html: `<button data-user="${u.email}" class="button action secondary">Show activity</button>`,
            },
          };
        }),
      });

      usersContainer.innerHTML = '<input type="text" placeholder="Filter by user email" class="filter-users filter">';
      usersContainer.appendChild(usersTable.table);

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

      const deletedUsersTable = createTable({
        tableClass: 'deleted-users',
        headers: ['Email', 'Name', 'Created at', 'Deleted at', 'Last login', 'Logins count', ''],
        columns: ['email', 'name', 'created_at', 'deleted_at', 'last_login', 'logins_count', 'buttons'],
        rows: Object.keys(deletedUsers.data)
          .sort((uA, uB) => new Date(deletedUsers.data[uB].deleted_at) - new Date(deletedUsers.data[uA].deleted_at))
          .map((u) => {
            const user = deletedUsers.data[u];
            const createdAt = new Date(user.created_at);
            const deletedAt = new Date(user.deleted_at);
            const lastLogin = new Date(user.last_login);

            return {
              ...user,
              created_at: {
                title: createdAt.toLocaleString(),
                value: dateToRelativeString(createdAt),
              },
              deleted_at: {
                title: deletedAt.toLocaleString(),
                value: dateToRelativeString(deletedAt),
              },
              last_login: {
                title: lastLogin.toLocaleString(),
                value: dateToRelativeString(lastLogin),
              },
              buttons: {
                html: `<button data-user="${user.email}" class="button action secondary">Show activity</button>`,
              },
            };
          }),
      });

      deletedUsersContainer.innerHTML = '<input type="text" placeholder="Filter by user email" class="filter-deleted-users filter">';

      deletedUsersContainer.append(deletedUsersTable.table);

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
      console.log('anonymous:', anonymous);
      const ips = Object.keys(anonymous);
      const timestamps = {};
      ips.forEach((ip) => {
        Object.keys(anonymous[ip]).forEach((timestamp) => {
          timestamps[timestamp] = anonymous[ip][timestamp];
        });
      });

      const anonymousTable = createTable({
        tableClass: 'anonymous',
        headers: ['IP', 'Event', 'Date', 'URL', 'Location', 'Referrer', 'Browser', 'Device'],
        rows: Object.keys(timestamps)
          .sort((timestampA, timestampB) => new Date(Number(timestampB)) - new Date(Number(timestampA)))
          .map((timestamp) => {
            const serverEvent = ['server api request', 'server page request', 'server redirect request'].includes(timestamps[timestamp].event);
            const timestampDate = new Date(Number(timestamp));

            return {
              ip: timestamps[timestamp].ip,
              event: timestamps[timestamp].event + (!serverEvent && timestamps[timestamp].isSPA ? ' SPA' : ''),
              date: {
                value: dateToRelativeString(timestampDate),
                title: timestampDate.toLocaleString(),
              },
              url: {
                value: timestamps[timestamp].url.replace(SCRIPT_API, ''),
                title: timestamps[timestamp].url,
              },
              location: [timestamps[timestamp].city, timestamps[timestamp].country].filter(Boolean).join(', '),
              referrer: {
                value: timestamps[timestamp].referrer,
                link: timestamps[timestamp].referrer,
              },
              browser: !serverEvent ? {
                value: `${timestamps[timestamp].userAgent.browser.name} ${
                  timestamps[timestamp].userAgent.browser.version
                } ${timestamps[timestamp].language}`,
              } : {
                title: [
                  timestamps[timestamp].browser ? `Full sec-ch-ua header: ${timestamps[timestamp].browser.replaceAll('"', '&quot;')}` : null,
                  timestamps[timestamp].language ? `Full accept-language header: ${timestamps[timestamp].language.replaceAll('"', '&quot;')}` : null,
                ].filter(Boolean).join('\n'),
                value: [
                  parseBrowser(timestamps[timestamp].browser),
                  parseAcceptLanguage(timestamps[timestamp].language),
                ].filter(Boolean).join(', '),
              },
              device: !serverEvent ? `${
                timestamps[timestamp].userAgent.device?.vendor} ${
                timestamps[timestamp].userAgent.os.name} ${
                timestamps[timestamp].userAgent.os.version
              }` : timestamps[timestamp]?.device?.replaceAll('"', ''),
            };
          }),
      });

      anonymousContainer.innerHTML = '<input type="text" placeholder="Filter by IP" class="filter-anonymous filter">';
      anonymousContainer.append(anonymousTable.table);

      const filterAnonymous = anonymousContainer.querySelector('.filter-anonymous');
      filterAnonymous.oninput = () => {
        onFilterInput(filterAnonymous, anonymousContainer);
      };
    } else {
      anonymousContainer.querySelector('p').textContent = OOPS;
    }
  };

  loadWebAnalytics('1d').then((analytics) => {
    renderAnalytics({
      analytics,
      container: container.querySelector('.analytics'),
      nav,
      loadWebAnalytics,
    });
  });

  renderUsers(0);
  renderDeletedUsers();
  renderAnonymous();
}
