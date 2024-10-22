import {
  OOPS,
  SCRIPT_API,
  waitForAuthenticated,
  loadingSpinner,
  dateToRelativeString,
} from '../../scripts/scripts.js';
import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import paginator from '../../libs/pagination/pagination.js';
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

const paginatorEventlistener = (container, queryParam, functionName) => {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.paginator');
    if (button) {
      const newPage = Number(button.getAttribute('data-change-to'));
      writeQueryParams({ [queryParam]: newPage });
      container.innerHTML = `<p style="display: flex; justify-content: center;">${loadingSpinner}</p>`;

      functionName(true);
    }
  });
};

const clusterizeTable = (id, tableHeader) => {
  const tableHead = tableHeader.map((header) => `<th>${header}</th>`).join('');
  return `
  <div id="scrollArea-${id}" class="clusterize-scroll">
    <table>
      <thead>
        ${tableHead}
      </thead>
      <tbody id="contentArea-${id}" class="clusterize-content">
        <tr class="clusterize-no-data">
          <td>No Data found</td>
        </tr>
      </tbody>
    </table>
</div>`;
};

// MARK: render
export default async function renderAdmin({ container, nav }) {
  let filterByIp = readQueryParams().ip || '';
  let filterByMail = readQueryParams().user || '';
  let filterByDeletedMail = readQueryParams().deleteduser || '';
  container.innerHTML = `
  <h2 id="web-analytics">Web analytics</h2>
    <div class="analytics">
      ${loadingSpinner}
    </div>

    <h2 id="user-activity">User activity</h2>
    <input value="${filterByMail}" type="search" placeholder="Filter by user email" class="filter-users filter">
    <div class="known-users clusterize">
      ${loadingSpinner}
    </div>
    
    <h2 id="deleted-users">Deleted users</h2>
    <input value="${filterByDeletedMail}" type="search" placeholder="Filter by user email" class="filter-deleted-users filter">
    <div class="deleted-users clusterize">
      ${loadingSpinner}
    </div>
        
    <h2 id="anonymous-activity">Anonymous activity</h2>
    <input value="${filterByIp}" type="search" placeholder="Filter by IP" class="filter-anonymous filter">
    <div class="anonymous-users clusterize">
      ${loadingSpinner}
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

  const onFilterInput = (value, filterName, functionName) => {
    if (value) {
      writeQueryParams({ [filterName]: value });
    } else {
      removeQueryParams([filterName]);
    }
    functionName(true);
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

      const rows = timestamps.length
        ? timestamps
          .reverse()
          .map(
            (timestamp) => `<tr>
              <td>${tracking[timestamp].event}${tracking[timestamp].isSPA ? ' SPA' : ''}</td>
              <td>${new Date(Number(timestamp)).toLocaleString()}</td>
              <td><a href="${tracking[timestamp].url}" target="_blank">${tracking[timestamp].url}</a></td>
              <td>${tracking[timestamp].location?.city} - ${tracking[timestamp].location?.country}</td>
              <td>${tracking[timestamp].ip}</td>
              <td>${tracking[timestamp].referrer ? `<a href="${tracking[timestamp].referrer}" target="_blank">${tracking[timestamp].referrer}` : ''}</td>
              <td>${tracking[timestamp].userAgent?.browser.name} ${tracking[timestamp].userAgent?.browser.version} ${tracking[timestamp].language}</td>
              <td>${tracking[timestamp].userAgent?.device?.vendor ?? ''} ${tracking[timestamp].userAgent?.os.name} ${tracking[timestamp].userAgent?.os.version}</td>
            </tr>`,
          )
        : ['<tr><td colspan="8" class="empty">Not enough data</td></tr>'];

      window.createDialog(`
              <div class="admin clusterize">
                <h3>${button.dataset.user} recent activity</h3>
                ${clusterizeTable('recent-activity', ['Event', 'Date', 'URL', 'Location', 'IP', 'Referrer', 'Browser', 'Device'])}
              </div>
            `);

      const clusterize = new Clusterize({
        rows: rows.length ? rows : ['<tr><td class="empty" colspan="8">No data found</td></tr>'],
        scrollId: 'scrollArea-recent-activity',
        contentId: 'contentArea-recent-activity',
      });
    } else {
      window.alertDialog(OOPS);
    }

    button.classList.remove('loading');
  };

  const renderUsers = async (scrollTo) => {
    filterEventlistener('.filter-users', 'user', renderUsers);
    const usersContainer = container.querySelector('.admin .known-users');
    filterByMail = readQueryParams().user || '';
    const page = readQueryParams().page || 1;
    const limit = readQueryParams().limit || 100;

    usersContainer.innerHTML = loadingSpinner;

    const reqUsers = await fetch(`${SCRIPT_API}/tracking?mail=${filterByMail}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqUsers.ok) {
      // const { users, total, limit } = await reqUsers.json();
      // console.log('users:', users);

      // let pages = '';
      // for (let i = 0; i < Math.ceil(total / limit); i += 1) {
      //   pages += `<button class="page button action ${i === page ? 'primary' : 'secondary'}">${i + 1}</button>`;
      // }

      // const usersTable = createTable({
      //   headers: ['Email', 'Name', 'Created at', 'Last login', 'Logins count', ''],
      //   columns: ['email', 'name', 'created_at', 'last_login', 'logins_count', 'buttons'],
      //   rows: users.map((u) => {
      //     const createdAt = new Date(u.created_at);
      //     const lastLogin = new Date(u.last_login);
      //     return {
      //       ...u,
      //       created_at: {
      //         title: createdAt.toLocaleString(),
      //         value: dateToRelativeString(createdAt),
      //       },
      //       last_login: {
      //         title: lastLogin.toLocaleString(),
      //         value: dateToRelativeString(lastLogin),
      //       },
      //       buttons: {
      //         html: `<button data-user="${u.email}" class="button action secondary">Show activity</button>`,
      //       },
      //     };
      //   }),
      // });

      // usersContainer.innerHTML = '<input type="text" placeholder="Filter by user email" class="filter-users filter">';
      // usersContainer.appendChild(usersTable.table);
      const usersJSON = await reqUsers.json();
      const users = usersJSON.data;
      const { pagination } = usersJSON;

      usersContainer.innerHTML = `
        ${clusterizeTable('user-activity', ['Email', 'Name', 'Created at', 'Last login', 'Logins count', ''])}
        ${paginator(pagination.totalItems, limit, pagination.currentPage)}
      `;

      const rows = users?.map(
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
      );

      paginatorEventlistener(usersContainer, 'page', renderUsers);

      const clusterize = new Clusterize({
        rows: rows.length ? rows : ['<tr><td class="empty" colspan="8">No data found</td></tr>'],
        scrollId: 'scrollArea-user-activity',
        contentId: 'contentArea-user-activity',
      });

      usersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });

      if (scrollTo) {
        window.location.hash = '#user-activity';
      }
    } else {
      usersContainer.querySelector('p').textContent = OOPS;
    }
  };

  const renderDeletedUsers = async (scrollTo) => {
    filterEventlistener('.filter-deleted-users', 'deleteduser', renderDeletedUsers);
    const deletedUsersContainer = container.querySelector('.admin .deleted-users');
    filterByDeletedMail = readQueryParams().deleteduser || '';
    const page = readQueryParams().deletedpage || 1;
    const limit = readQueryParams().deletedlimit || 100;

    const reqDeletedUsers = await fetch(`${SCRIPT_API}/tracking/deletedUsers?user=${filterByDeletedMail}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqDeletedUsers.ok) {
      const deletedUsersJSON = await reqDeletedUsers.json();
      const deletedUsers = deletedUsersJSON.data;
      const { pagination } = deletedUsersJSON;

      // const deletedUsersTable = createTable({
      //   tableClass: 'deleted-users',
      //   headers: ['Email', 'Name', 'Created at', 'Deleted at', 'Last login', 'Logins count', ''],
      //   columns: ['email', 'name', 'created_at', 'deleted_at', 'last_login', 'logins_count', 'buttons'],
      //   rows: Object.keys(deletedUsers.data)
      //     .sort((uA, uB) => new Date(deletedUsers.data[uB].deleted_at) - new Date(deletedUsers.data[uA].deleted_at))
      //     .map((u) => {
      //       const user = deletedUsers.data[u];
      //       const createdAt = new Date(user.created_at);
      //       const deletedAt = new Date(user.deleted_at);
      //       const lastLogin = new Date(user.last_login);

      //       return {
      //         ...user,
      //         created_at: {
      //           title: createdAt.toLocaleString(),
      //           value: dateToRelativeString(createdAt),
      //         },
      //         deleted_at: {
      //           title: deletedAt.toLocaleString(),
      //           value: dateToRelativeString(deletedAt),
      //         },
      //         last_login: {
      //           title: lastLogin.toLocaleString(),
      //           value: dateToRelativeString(lastLogin),
      //         },
      //         buttons: {
      //           html: `<button data-user="${user.email}" class="button action secondary">Show activity</button>`,
      //         },
      //       };
      //     }),
      // });

      // deletedUsersContainer.innerHTML = '<input type="text" placeholder="Filter by user email" class="filter-deleted-users filter">';

      // deletedUsersContainer.append(deletedUsersTable.table);
      deletedUsersContainer.innerHTML = `
      ${clusterizeTable('deleted-users', ['Email', 'Name', 'Created at', 'Deleted at', 'Last login', 'Logins count', ''])}
      ${paginator(pagination.totalItems, limit, pagination.currentPage)}`;

      paginatorEventlistener(deletedUsersContainer, 'deletedpage', renderDeletedUsers);

      const rows = Object.keys(deletedUsers).map((u) => `
        <tr>
          <td>${deletedUsers[u].email}</td>
          <td>${deletedUsers[u].name}</td>
          <td>${new Date(deletedUsers[u].created_at).toLocaleString()}</td>
          <td>${new Date(deletedUsers[u].deleted_at).toLocaleString()}</td>
          <td>${new Date(deletedUsers[u].last_login).toLocaleString()}</td>
          <td>${deletedUsers[u].logins_count}</td>
          <td><button data-user="${deletedUsers[u].email}" class="button action secondary">Show activity</button></td>
        </tr>
      `);

      const clusterize = new Clusterize({
        rows: rows.length ? rows : ['<tr><td class="empty" colspan="8">No data found</td></tr>'],
        scrollId: 'scrollArea-deleted-users',
        contentId: 'contentArea-deleted-users',
      });

      deletedUsersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });

      if (scrollTo) {
        window.location.hash = '#deleted-users';
      }
    } else {
      deletedUsersContainer.querySelector('p').textContent = OOPS;
    }
  };

  const renderAnonymous = async (scrollTo) => {
    const anonymousContainer = container.querySelector('.admin .anonymous-users');
    filterEventlistener('.filter-anonymous', 'ip', renderAnonymous);
    filterByIp = readQueryParams().ip || '';

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
          if (!filterByIp || ip.includes(filterByIp.replaceAll('.', '(DOT)'))) {
            timestamps[timestamp] = anonymous[ip][timestamp];
          }
        });
      });

      // const anonymousTable = createTable({
      //   tableClass: 'anonymous',
      //   headers: ['IP', 'Event', 'Date', 'URL', 'Location', 'Referrer', 'Browser', 'Device'],
      //   rows: Object.keys(timestamps)
      //     .sort((timestampA, timestampB) => new Date(Number(timestampB)) - new Date(Number(timestampA)))
      //     .map((timestamp) => {
      //       const serverEvent = ['server api request', 'server page request', 'server redirect request'].includes(timestamps[timestamp].event);
      //       const timestampDate = new Date(Number(timestamp));

      //       return {
      //         ip: timestamps[timestamp].ip,
      //         event: timestamps[timestamp].event + (!serverEvent && timestamps[timestamp].isSPA ? ' SPA' : ''),
      //         date: {
      //           value: dateToRelativeString(timestampDate),
      //           title: timestampDate.toLocaleString(),
      //         },
      //         url: {
      //           value: timestamps[timestamp].url.replace(SCRIPT_API, ''),
      //           title: timestamps[timestamp].url,
      //         },
      //         location: [timestamps[timestamp].city, timestamps[timestamp].country].filter(Boolean).join(', '),
      //         referrer: {
      //           value: timestamps[timestamp].referrer,
      //           link: timestamps[timestamp].referrer,
      //         },
      //         browser: !serverEvent ? {
      //           value: `${timestamps[timestamp].userAgent.browser.name} ${
      //             timestamps[timestamp].userAgent.browser.version
      //           } ${timestamps[timestamp].language}`,
      //         } : {
      //           title: [
      //             timestamps[timestamp].browser ? `Full sec-ch-ua header: ${timestamps[timestamp].browser.replaceAll('"', '&quot;')}` : null,
      //             timestamps[timestamp].language ? `Full accept-language header: ${timestamps[timestamp].language.replaceAll('"', '&quot;')}` : null,
      //           ].filter(Boolean).join('\n'),
      //           value: [
      //             parseBrowser(timestamps[timestamp].browser),
      //             parseAcceptLanguage(timestamps[timestamp].language),
      //           ].filter(Boolean).join(', '),
      //         },
      //         device: !serverEvent ? `${
      //           timestamps[timestamp].userAgent.device?.vendor} ${
      //           timestamps[timestamp].userAgent.os.name} ${
      //           timestamps[timestamp].userAgent.os.version
      //         }` : timestamps[timestamp]?.device?.replaceAll('"', ''),
      //       };
      //     }),
      // });

      // anonymousContainer.innerHTML = '<input type="text" placeholder="Filter by IP" class="filter-anonymous filter">';
      // anonymousContainer.append(anonymousTable.table);
      const rows = Object.keys(timestamps)
        .sort((timestampA, timestampB) => new Date(Number(timestampB))
         - new Date(Number(timestampA)))
        .map(
          (timestamp) => (['server api request', 'server page request', 'server redirect request'].includes(timestamps[timestamp].event) ? `
          <tr>
            <td>${timestamps[timestamp].ip}</td>
            <td>${timestamps[timestamp].event}</td>
            <td>${new Date(Number(timestamp)).toLocaleString()}</td>
            <td><a href="${timestamps[timestamp].url}" target="_blank">${timestamps[timestamp].url}</a></td>
            <td>${timestamps[timestamp].city ?? ''} ${timestamps[timestamp].country}</td>
            <td>${timestamps[timestamp].referrer ? `<a href="${timestamps[timestamp].referrer}" target="_blank">${timestamps[timestamp].referrer}</a>` : ''}</td>
            <td>${timestamps[timestamp].browser ?? ''} ${timestamps[timestamp].language ?? ''}</td>
            <td>${timestamps[timestamp].platform?.replaceAll('"', '') ?? ''}</td>
          </tr>` : `
          <tr>
            <td>${timestamps[timestamp].ip}</td>
            <td>${timestamps[timestamp].event}${timestamps[timestamp].isSPA ? ' SPA' : ''}</td>
            <td>${new Date(Number(timestamp)).toLocaleString()}</td>
            <td><a href="${timestamps[timestamp].url}" target="_blank">${timestamps[timestamp].url}</a></td>
            <td>${timestamps[timestamp].location.city} - ${timestamps[timestamp].location.country}</td>
            <td>${timestamps[timestamp].referrer ? `<a href="${timestamps[timestamp].referrer}" target="_blank">${timestamps[timestamp].referrer}</a>` : 'None'}</td>
            <td>${timestamps[timestamp].userAgent.browser.name} ${timestamps[timestamp].userAgent.browser.version} ${timestamps[timestamp].language}</td>
            <td>${timestamps[timestamp].userAgent.device?.vendor ?? 'Unknwon'} ${timestamps[timestamp].userAgent.os.name} ${timestamps[timestamp].userAgent.os.version}</td>
          </tr>`).trim(),
        );

      if (scrollTo) {
        window.location.hash = '#anonymous-activity';
      }

      anonymousContainer.innerHTML = clusterizeTable('anonymous', ['IP', 'Event', 'Date', 'URL', 'Location', 'Referrer', 'Browser', 'Device']);

      const clusterize = new Clusterize({
        rows: rows.length ? rows : ['<tr><td class="empty" colspan="8">No data found</td></tr>'],
        rows_in_block: 80,
        scrollId: 'scrollArea-anonymous',
        contentId: 'contentArea-anonymous',
      });
    } else {
      anonymousContainer.textContent = OOPS;
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

  renderUsers();
  renderDeletedUsers();
  renderAnonymous();
}
