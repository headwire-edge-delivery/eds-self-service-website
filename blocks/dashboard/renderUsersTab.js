import {
  OOPS,
  SCRIPT_API,
  waitForAuthenticated,
  dateToRelativeString,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import paginator from '../../libs/pagination/pagination.js';
import { toClassName } from '../../scripts/aem.js';

const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
function parseAcceptLanguage(str) {
  if (!str) return null;
  return langNames.of(str.split(',')[0]);
}

// header: sec-ch-ua
function parseBrowser(str) {
  if (!str) return null;

  const browserParts = str.split(',');
  try {
    let output = '';
    for (const browserStr of browserParts) {
      // matches semicolon that is not within quotes
      const browserName = browserStr.match(/(?:[^";]|"(?:\\.|[^"\\])*")+/g)[0].trim().replaceAll('"', '');

      if (/not(\?|\))a(_|;)brand/i.test(browserName)) continue;
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

// MARK: createTable
function createTable({
  tableId,
  headers, rows, tableClass = '', columns = [],
}) {
  if (!columns || !columns.length) {
    // eslint-disable-next-line no-param-reassign
    columns = headers.map(toClassName);
  }
  const tableWrapper = document.createElement('div');
  if (tableId) tableWrapper.id = `scrollArea-${tableId}`;
  tableWrapper.className = 'clusterize-scroll';

  const table = document.createElement('table');
  table.className = tableClass;
  tableWrapper.append(table);

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  if (tableId) tbody.id = `contentArea-${tableId}`;
  tbody.className = 'clusterize-content';

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

  if (!rows.length) {
    tbody.innerHTML = `<tr class="clusterize-no-data"><td class="empty" colspan="${columns.length}">No Data found</td></tr>`;
  }

  return {
    table, thead, tbody, wrapper: tableWrapper,
  };
}

// MARK: paginator listener
const paginatorEventlistener = (container, queryParam, functionName) => {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.paginator');
    if (button) {
      const newPage = Number(button.getAttribute('data-change-to'));
      writeQueryParams({ [queryParam]: newPage });
      container.innerHTML = renderSkeleton('admin-tracking');

      functionName(true);
    }
  });
};

// MARK: render
export default async function renderUserTab({ container }) {
  let filterByIp = readQueryParams().ip || '';
  let filterByMail = readQueryParams().user || '';
  let filterByDeletedMail = readQueryParams().deleteduser || '';
  const userSearchMinLength = 3; // auth0 returns nothing if query is less than 3 characters
  container.innerHTML = `
    <h2 id="user-activity">User activity</h2>
    <input value="${filterByMail}" type="search" minlength="3" placeholder="Filter by user email" class="filter-users filter">
    <p id="user-filter-info" style="display: none">Must be at least ${userSearchMinLength} Characters long</p>
    <div class="known-users clusterize">
      ${renderSkeleton('tracking')}
    </div>
    
    <h2 id="deleted-users">Deleted users</h2>
    <input value="${filterByDeletedMail}" type="search" placeholder="Filter by user email" class="filter-deleted-users filter">
    <div class="deleted-users clusterize">
      ${renderSkeleton('tracking')}
    </div>
        
    <h2 id="anonymous-activity">Anonymous activity</h2>
    <input value="${filterByIp}" type="search" placeholder="Filter by IP" class="filter-anonymous filter">
    <div class="anonymous-users clusterize">
      ${renderSkeleton('tracking')}
    </div>
  `;
  const userActivityTitle = container.querySelector('#user-activity');
  const deletedUsersTitle = container.querySelector('#deleted-users');
  const anonymousActivityTitle = container.querySelector('#anonymous-activity');

  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  const onFilterInput = (value, filterName, functionName, minLength) => {
    const validLength = value.length >= minLength || value.length === 0;
    if (value) {
      writeQueryParams({ [filterName]: value });
    } else {
      removeQueryParams([filterName]);
    }
    functionName(true, validLength);
  };

  const filterEventlistener = (filterClass, filterName, functionName, minLength = 1) => {
    const filterInput = document.querySelector(filterClass);
    filterInput.oninput = (event) => {
      event.preventDefault();
      let debounceTimer;
      // eslint-disable-next-line func-names
      (() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onFilterInput(filterInput.value, filterName, functionName, minLength);
        }, 300);
      })();
    };
  };

  // MARK: activity dialog
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

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'users clusterize';
      contentWrapper.innerHTML = `<h3>${button.dataset.user} recent activity</h3>`;

      const activitiesDialogTable = createTable({
        tableId: 'recent-activity',
        tableClass: 'recent-activity',
        headers: ['Event', 'Date', 'URL', 'Location', 'IP', 'Referrer', 'Browser', 'Device'],
        rows: timestamps.reverse().map((timestamp) => {
          const timestampItem = tracking[timestamp];
          const date = new Date(Number(timestamp));

          return {
            ...timestampItem,
            event: `${timestampItem.event}${timestampItem.isSPA ? ' SPA' : ''}`,
            date: {
              value: dateToRelativeString(date),
              title: date.toLocaleString(),
            },
            url: {
              value: timestampItem.url,
              link: timestampItem.url,
            },
            location: [timestampItem.location?.city, timestampItem.location?.country].filter(Boolean).join(', '),
            referrer: {
              value: timestampItem.referrer,
              link: timestampItem.referrer,
            },
            browser: {
              value: `${timestampItem.userAgent.browser.name}, ${parseAcceptLanguage(timestampItem.language)}`,
              title: `${timestampItem.userAgent.browser.name} ${timestampItem.userAgent.browser.version} ${timestampItem.language}`,
            },
            device: {
              value: `${timestampItem.userAgent.os.name}`,
              title: `${timestampItem.userAgent.device?.vendor}, ${timestampItem.userAgent.os.name}, ${timestampItem.userAgent.os.version}`,
            },
          };
        }),
      });

      contentWrapper.appendChild(activitiesDialogTable.wrapper);
      window.createDialog(contentWrapper);

      // eslint-disable-next-line no-new
      new Clusterize({
        rows: activitiesDialogTable.tbody.children,
        scrollId: 'scrollArea-recent-activity',
        contentId: 'contentArea-recent-activity',
      });
    } else {
      window.alertDialog(OOPS);
    }

    button.classList.remove('loading');
  };

  // MARK: renderUsers
  const usersContainer = container.querySelector('.users .known-users');
  let lastLength = 0;
  const renderUsers = async (scrollTo, rerender = true) => {
    filterByMail = readQueryParams().user || '';
    const userFilterInfo = container.querySelector('#user-filter-info');
    const userFilterLength = container.querySelector('.filter-users').value.length;
    let rerequest = false;
    if (filterByMail.length < userSearchMinLength) {
      filterByMail = '';
      removeQueryParams(['user']);
      if (userFilterInfo.style.display !== 'flex' && userFilterLength > 0) {
        userFilterInfo.style.display = 'flex';
        if (userFilterLength >= userSearchMinLength || lastLength === userSearchMinLength) {
          rerequest = true;
        }
      }
    }
    if (userFilterInfo.style.display === 'flex' && (userFilterLength === 0 || userFilterLength >= userSearchMinLength)) {
      userFilterInfo.style.display = 'none';
      rerequest = true;
    }
    if (!rerender && !rerequest) {
      // no refetch needed
      return;
    }
    lastLength = userFilterLength;
    usersContainer.innerHTML = renderSkeleton('admin');
    const page = readQueryParams().page || 1;
    const limit = readQueryParams().limit || 100;

    usersContainer.innerHTML = renderSkeleton('tracking');

    const reqUsers = await fetch(`${SCRIPT_API}/tracking?mail=${filterByMail}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqUsers.ok) {
      const usersJSON = await reqUsers.json();
      const users = usersJSON.data || [];
      const { pagination } = usersJSON;

      const usersTable = createTable({
        tableId: 'user-activity',
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

      usersContainer.innerHTML = paginator(pagination.totalItems, limit, pagination.currentPage);
      usersContainer.prepend(usersTable.wrapper);

      paginatorEventlistener(usersContainer, 'page', renderUsers);

      // eslint-disable-next-line no-new
      new Clusterize({
        rows: usersTable.tbody.children,
        scrollId: 'scrollArea-user-activity',
        contentId: 'contentArea-user-activity',
      });

      usersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });

      // TODO: I'm pretty sure this scrollTo stuff could be avoided:
      // After filtering is done, something scrolls the page to the top.
      // I don't think this is because of the DOM changing, I think it's forced somewhere because
      // the scroll-behavior CSS rule is respected when this happens.
      // I can't find out why this happens, but I didn't spend too much time looking.
      // So, I'm just going to leave it here.
      if (scrollTo) {
        window.scrollTo({
          top: userActivityTitle.offsetTop,
          behavior: 'smooth',
        });
      }
    } else {
      usersContainer.querySelector('[aria-label="loading"]').textContent = OOPS;
    }
  };
  filterEventlistener('.filter-users', 'user', renderUsers, userSearchMinLength);

  // MARK: renderDeletedUsers
  const deletedUsersContainer = container.querySelector('.users .deleted-users');
  const renderDeletedUsers = async (scrollTo) => {
    deletedUsersContainer.innerHTML = renderSkeleton('admin');
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
      const deletedUsers = deletedUsersJSON.data || [];
      const { pagination } = deletedUsersJSON;

      const deletedUsersTable = createTable({
        tableId: 'deleted-users',
        tableClass: 'deleted-users',
        headers: ['Email', 'Name', 'Created at', 'Deleted at', 'Last login', 'Logins count', ''],
        columns: ['email', 'name', 'created_at', 'deleted_at', 'last_login', 'logins_count', 'buttons'],
        rows: Object.keys(deletedUsers)
          .sort((uA, uB) => new Date(deletedUsers[uB].deleted_at) - new Date(deletedUsers[uA].deleted_at)) // eslint-disable-line max-len
          .map((u) => {
            const user = deletedUsers[u];
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

      deletedUsersContainer.innerHTML = paginator(
        pagination.totalItems,
        limit,
        pagination.currentPage,
      );

      deletedUsersContainer.prepend(deletedUsersTable.wrapper);

      paginatorEventlistener(deletedUsersContainer, 'deletedpage', renderDeletedUsers);

      // eslint-disable-next-line no-new
      new Clusterize({
        rows: deletedUsersTable.tbody.children,
        scrollId: 'scrollArea-deleted-users',
        contentId: 'contentArea-deleted-users',
      });

      deletedUsersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });

      if (scrollTo) {
        window.scrollTo({
          top: deletedUsersTitle.offsetTop,
          behavior: 'smooth',
        });
      }
    } else {
      deletedUsersContainer.querySelector('[aria-label="loading"]').textContent = OOPS;
    }
  };
  filterEventlistener('.filter-deleted-users', 'deleteduser', renderDeletedUsers);

  let anonymousUserResponse = null;
  let anonymousUserData = null;
  // MARK: renderAnonymous
  const anonymousContainer = container.querySelector('.users .anonymous-users');
  const renderAnonymous = async (scrollTo) => {
    anonymousContainer.innerHTML = renderSkeleton('admin');
    filterByIp = readQueryParams().ip || '';

    if (!anonymousUserResponse) {
      const reqAnonymous = await fetch(`${SCRIPT_API}/tracking?user=anonymous`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      }).catch(() => ({ ok: false }));
      anonymousUserResponse = reqAnonymous;
    }

    if (!anonymousUserResponse.ok) {
      anonymousContainer.querySelector('p').textContent = OOPS;
      return;
    }

    if (!anonymousUserData) {
      anonymousUserData = await anonymousUserResponse.json();
    }

    const ips = Object.keys(anonymousUserData);
    const timestamps = {};
    ips.forEach((ip) => {
      Object.keys(anonymousUserData[ip]).forEach((timestamp) => {
        if (!filterByIp || ip.includes(filterByIp.replaceAll('.', '(DOT)'))) {
          timestamps[timestamp] = anonymousUserData[ip][timestamp];
        }
      });
    });

    const anonymousTable = createTable({
      tableId: 'anonymous',
      tableClass: 'anonymous',
      headers: ['IP', 'Event', 'Date', 'URL', 'Location', 'Referrer', 'Browser', 'Device'],
      rows: Object.keys(timestamps)
        .sort((timestampA, timestampB) => new Date(Number(timestampB)) - new Date(Number(timestampA))) // eslint-disable-line max-len
        .map((timestamp) => {
          const timestampItem = timestamps[timestamp];
          const serverEvent = ['server api request', 'server page request', 'server redirect request'].includes(timestampItem.event);
          const timestampDate = new Date(Number(timestamp));

          return {
            ...timestampItem,
            event: timestampItem.event + (!serverEvent && timestampItem.isSPA ? ' SPA' : ''),
            date: {
              value: dateToRelativeString(timestampDate),
              title: timestampDate.toLocaleString(),
            },
            url: {
              value: timestampItem.url.replace(SCRIPT_API, ''),
              title: timestampItem.url,
            },
            location: [timestampItem.city, timestampItem.country].filter(Boolean).join(', '),
            referrer: {
              value: timestampItem.referrer,
              link: timestampItem.referrer,
            },
            browser: !serverEvent ? {
              value: `${timestampItem.userAgent.browser.name}, ${parseAcceptLanguage(timestampItem.language)}`,
              title: `${timestampItem.userAgent.browser.name} ${timestampItem.userAgent.browser.version} ${timestampItem.language}`,
            } : {
              title: [
                timestampItem.browser ? `Full sec-ch-ua header: ${timestampItem.browser}` : null,
                timestampItem.language ? `Full accept-language header: ${timestampItem.language}` : null,
              ].filter(Boolean).join('\n'),
              value: [
                parseBrowser(timestampItem.browser),
                parseAcceptLanguage(timestampItem.language),
              ].filter(Boolean).join(', '),
            },
            device: !serverEvent ? {
              title: `${timestampItem.userAgent.device?.vendor} ${timestampItem.userAgent.os.name} ${timestampItem.userAgent.os.version}`,
              value: timestampItem.userAgent.os.name,
            } : timestampItem?.device?.replaceAll('"', ''),
          };
        }),
    });

    if (scrollTo) {
      window.scrollTo({
        top: anonymousActivityTitle.offsetTop,
        behavior: 'smooth',
      });
    }

    anonymousContainer.innerHTML = '';
    anonymousContainer.append(anonymousTable.wrapper);

    // eslint-disable-next-line no-new
    new Clusterize({
      rows: anonymousTable.tbody.children,
      rows_in_block: 80,
      scrollId: 'scrollArea-anonymous',
      contentId: 'contentArea-anonymous',
    });
  };
  filterEventlistener('.filter-anonymous', 'ip', renderAnonymous);

  renderUsers();
  renderDeletedUsers();
  renderAnonymous();
}
