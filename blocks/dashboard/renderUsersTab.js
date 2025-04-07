import { OOPS, SCRIPT_API, waitForAuthenticated, dateToRelativeString } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import paginator from '../../libs/pagination/pagination.js';
import { toClassName } from '../../scripts/aem.js';
import { createDialog } from '../../scripts/dialogs.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';

const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
function parseAcceptLanguage(str) {
  try {
    if (!str || str === '*' || str === '*/*') return null;
    return langNames.of(str.split(',')[0].split(';')[0]);
  } catch {
    return null;
  }
}

// header: sec-ch-ua
function parseBrowser(str) {
  if (!str) return null;

  const browserParts = str.split(',');
  try {
    let output = '';
    for (const browserStr of browserParts) {
      // matches semicolon that is not within quotes
      const browserName = browserStr
        .match(/(?:[^";]|"(?:\\.|[^"\\])*")+/g)[0]
        .trim()
        .replaceAll('"', '');

      if (/not[\s\S]*a[\s\S]*brand/i.test(browserName)) continue;
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
  } catch {
    return null;
  }
}

let { maxRows = 10000 } = readQueryParams();
maxRows = parseInt(maxRows, 10);
if (!Number.isInteger(maxRows)) {
  maxRows = 10000;
}
maxRows = Math.max(100, maxRows);

// MARK: createTable
function createTable({ tableId, headers, rows, tableClass = '', columns = [] }) {
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

  const dataRows = rows.slice(0, maxRows);

  for (const row of dataRows) {
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

  if (!dataRows.length) {
    tbody.innerHTML = `<tr class="clusterize-no-data"><td class="empty" colspan="${columns.length}">No Data found</td></tr>`;
  }

  return {
    table,
    thead,
    tbody,
    wrapper: tableWrapper,
  };
}

// MARK: paginator listener
const paginatorEventlistener = (container, queryParam, functionName, skeletonChildren = 5) => {
  if (container.paginatorEventListener) {
    container.removeEventListener('click', container.paginatorEventListener);
  }

  const paginatorClickHandler = (event) => {
    const button = event.target.closest('.paginator');
    if (button) {
      const newPage = Number(button.getAttribute('data-change-to'));
      writeQueryParams({ [queryParam]: newPage });
      container.innerHTML = renderSkeleton('tracking', skeletonChildren);
      functionName();
    }
  };

  container.addEventListener('click', paginatorClickHandler);
  container.paginatorEventListener = paginatorClickHandler;
};

// MARK: render
export default async function renderUserTab({ container }) {
  const { ip, user, deleteduser, limit = 100, deletedlimit, page = 1, deletedpage = 1 } = readQueryParams();
  let filterByIp = ip || '';
  let filterByMail = user || '';
  let filterByDeletedMail = deleteduser || '';
  const userSearchMinLength = 3; // auth0 returns nothing if query is less than 3 characters
  container.innerHTML = `
    <h2 id="user-activity">User activity</h2>
    <input type="search" minlength="3" placeholder="Filter by user email" class="filter-users filter">
    <p id="user-filter-info" style="display: none">Must be at least ${userSearchMinLength} Characters long</p>
    <div class="known-users clusterize">
      ${renderSkeleton('tracking', Math.min(limit || 100, 5))}
    </div>

    <h2 id="deleted-users">Deleted users</h2>
    <input type="search" placeholder="Filter by user email" class="filter-deleted-users filter">
    <div class="deleted-users clusterize">
      ${renderSkeleton('tracking', Math.min(deletedlimit || 100, 5))}
    </div>

    <h2 id="anonymous-activity">Anonymous activity</h2>
    <input type="search" placeholder="Filter by IP" class="filter-anonymous filter">
    <div class="anonymous-users clusterize">
      ${renderSkeleton('tracking')}
    </div>
  `;

  const filterUsersInput = container.querySelector('.filter-users.filter');
  filterUsersInput.value = filterByMail;
  const filterDeletedUsersInput = container.querySelector('.filter-deleted-users.filter');
  filterDeletedUsersInput.value = filterByDeletedMail;
  const filterAnonymousUsersInput = container.querySelector('.filter-anonymous.filter');
  filterAnonymousUsersInput.value = filterByIp;

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

  const filterEventlistener = (filterInput, filterName, functionName, minLength = 1, noValueFunction = () => {}) => {
    let debounceTimer;
    function debounce(callback, delay) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(callback, delay);
    }
    filterInput.oninput = (event) => {
      event.preventDefault();
      debounce(() => {
        if (!filterInput.value) noValueFunction();
        onFilterInput(filterInput.value, filterName, functionName, minLength);
      }, 300);
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

      const originalRecentActivityData = timestamps.reverse();
      const recentActivityData = [...originalRecentActivityData];

      const generateTable = () =>
        createTable({
          tableId: 'recent-activity',
          tableClass: 'recent-activity',
          headers: ['Event', 'Date', 'URL', 'Location', 'IP', 'Referrer', 'Browser', 'Device'],
          rows: recentActivityData.map((timestamp) => {
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

      const activitiesDialogTable = generateTable();

      contentWrapper.appendChild(activitiesDialogTable.wrapper);
      createDialog(contentWrapper);

      const raCluster = new Clusterize({
        rows: activitiesDialogTable.tbody.children,
        rows_in_block: 80,
        scrollId: 'scrollArea-recent-activity',
        contentId: 'contentArea-recent-activity',
        callbacks: {
          scrollingProgress: (progress) => {
            if (progress > 70 && raCluster.getRowsAmount() !== originalRecentActivityData.length) {
              recentActivityData.splice(0, maxRows);
              const newRows = [...generateTable().tbody.children].map((row) => row.outerHTML);
              raCluster.append(newRows);
            }
          },
        },
      });
    } else {
      showErrorToast();
    }

    button.classList.remove('loading');
  };

  // MARK: renderUsers
  const usersContainer = container.querySelector('.users .known-users');
  let lastLength = 0;
  const renderUsers = async (rerender = true) => {
    filterByMail = readQueryParams().user || '';
    const userFilterInfo = container.querySelector('#user-filter-info');
    const userFilterLength = filterUsersInput.value.length;
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

    const reqUsers = await fetch(`${SCRIPT_API}/tracking?mail=${filterByMail}&page=${page}&limit=${limit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqUsers.ok) {
      const usersJSON = await reqUsers.json();
      const users = usersJSON.data || [];
      const { pagination } = usersJSON;
      const usersData = users;

      const generateTable = () =>
        createTable({
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

      const usersTable = generateTable();

      usersContainer.innerHTML = '';
      usersContainer.append(paginator(pagination.totalItems, limit, pagination.currentPage));
      usersContainer.prepend(usersTable.wrapper);

      paginatorEventlistener(usersContainer, 'page', renderUsers, Math.min(limit, 5));

      const usersCluster = new Clusterize({
        rows: usersTable.tbody.children,
        rows_in_block: 80,
        scrollId: 'scrollArea-user-activity',
        contentId: 'contentArea-user-activity',
        callbacks: {
          scrollingProgress: (progress) => {
            if (progress > 90 && usersCluster.getRowsAmount() !== users.length) {
              usersData.splice(0, maxRows);
              const newRows = [...generateTable().tbody.children].map((row) => row.outerHTML);
              usersCluster.append(newRows);
              showToast(`Loaded ${usersCluster.getRowsAmount()} rows from ${users.length} User activity records.`, 'info');
            }
          },
        },
      });

      usersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });
    } else {
      usersContainer.querySelector('[aria-label="loading"]').textContent = OOPS;
    }
  };
  filterEventlistener(filterUsersInput, 'user', renderUsers, userSearchMinLength);

  // MARK: renderDeletedUsers
  const deletedUsersContainer = container.querySelector('.users .deleted-users');
  const renderDeletedUsers = async () => {
    filterByDeletedMail = readQueryParams().deleteduser || '';

    const reqDeletedUsers = await fetch(`${SCRIPT_API}/tracking/deletedUsers?user=${filterByDeletedMail}&page=${deletedpage}&limit=${deletedlimit}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    }).catch(() => ({ ok: false }));

    if (reqDeletedUsers.ok) {
      const deletedUsersJSON = await reqDeletedUsers.json();
      const deletedUsers = deletedUsersJSON.data || [];
      const { pagination } = deletedUsersJSON;
      let deletedUsersTable = null;

      const originalDeletedUsersData = Object.keys(deletedUsers).sort((uA, uB) => new Date(deletedUsers[uB].deleted_at) - new Date(deletedUsers[uA].deleted_at));
      const deletedUsersData = [...originalDeletedUsersData];

      const generateTable = () =>
        createTable({
          tableId: 'deleted-users',
          tableClass: 'deleted-users',
          headers: ['Email', 'Name', 'Created at', 'Deleted at', 'Last login', 'Logins count', ''],
          columns: ['email', 'name', 'created_at', 'deleted_at', 'last_login', 'logins_count', 'buttons'],
          rows: deletedUsersData.map((u) => {
            const deletedUser = deletedUsers[u];
            const createdAt = new Date(deletedUser.created_at);
            const deletedAt = new Date(deletedUser.deleted_at);
            const lastLogin = new Date(deletedUser.last_login);

            return {
              ...deletedUser,
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
                html: `<button data-user="${deletedUser.email}" class="button action secondary">Show activity</button>`,
              },
            };
          }),
        });

      deletedUsersTable = generateTable();

      deletedUsersContainer.innerHTML = '';
      deletedUsersContainer.append(paginator(pagination.totalItems, limit, pagination.currentPage));

      deletedUsersContainer.prepend(deletedUsersTable.wrapper);

      paginatorEventlistener(deletedUsersContainer, 'deletedpage', renderDeletedUsers, Math.min(limit, 5));

      const deletedCluster = new Clusterize({
        rows: deletedUsersTable.tbody.children,
        rows_in_block: 80,
        scrollId: 'scrollArea-deleted-users',
        contentId: 'contentArea-deleted-users',
        callbacks: {
          scrollingProgress: (progress) => {
            if (progress > 90 && deletedCluster.getRowsAmount() !== originalDeletedUsersData.length) {
              deletedUsersData.splice(0, maxRows);
              const newRows = [...generateTable().tbody.children].map((row) => row.outerHTML);
              deletedCluster.append(newRows);
              showToast(`Loaded ${deletedCluster.getRowsAmount()} rows from ${originalDeletedUsersData.length} deleted users records.`, 'info');
            }
          },
        },
      });

      deletedUsersContainer.querySelectorAll('button[data-user]').forEach((button) => {
        button.onclick = onActivitiesClick;
      });
    } else {
      deletedUsersContainer.querySelector('[aria-label="loading"]').textContent = OOPS;
    }
  };
  filterEventlistener(filterDeletedUsersInput, 'deleteduser', renderDeletedUsers);

  let anonymousUserResponse = null;
  let anonymousUserData = null;
  const { anonymousEvent, anonymousLocation, anonymousReferrer, anonymousBrowser, anonymousDevice } = readQueryParams();
  const anonymousFilter = {
    event: anonymousEvent || 'all',
    location: anonymousLocation || 'all',
    referrer: anonymousReferrer || 'all',
    browser: anonymousBrowser || 'all',
    device: anonymousDevice || 'all',
  };

  // MARK: renderAnonymous
  const anonymousContainer = container.querySelector('.users .anonymous-users');
  let anonymousTable = null;
  const renderAnonymous = async () => {
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
    ips.forEach((innerIp) => {
      Object.keys(anonymousUserData[innerIp]).forEach((timestamp) => {
        if (!filterByIp || innerIp.includes(filterByIp.replaceAll('.', '(DOT)'))) {
          timestamps[timestamp] = anonymousUserData[innerIp][timestamp];
        }
      });
    });
    const filteredTimestamps = {};

    // get all event names
    const events = ['all'];
    Object.values(timestamps).forEach((timestamp) => {
      if (!events.includes(timestamp.event)) {
        events.push(timestamp.event);
      }
    });

    // get all locations
    const locations = ['all'];
    Object.values(timestamps).forEach((timestamp) => {
      if (timestamp.city) {
        const location = [timestamp.city, timestamp.country].filter(Boolean).join(', ');
        if (!locations.includes(location)) {
          locations.push(location);
        }
      }
    });

    // get all referrers
    const referrers = ['all'];
    Object.values(timestamps).forEach((timestamp) => {
      if (timestamp.referrer && !referrers.includes(timestamp.referrer)) {
        referrers.push(timestamp.referrer);
      }
    });

    // get all browser names
    const browsers = ['all'];

    Object.values(timestamps).forEach((timestamp) => {
      if (timestamp.userAgent && timestamp.userAgent.browser && timestamp.userAgent.browser.name) {
        const browserName = timestamp.userAgent.browser.name;
        const language = parseAcceptLanguage(timestamp.language) || 'unknown';

        const browserEntry = `${browserName} (${language})`;
        if (!browsers.includes(browserEntry)) {
          browsers.push(browserEntry);
        }
      } else if (timestamp.browser) {
        const browserName = parseBrowser(timestamp.browser);
        const language = parseAcceptLanguage(timestamp.language) || 'unknown';

        const browserEntry = `${browserName} (${language})`;
        if (!browsers.includes(browserEntry)) {
          browsers.push(browserEntry);
        }
      }
    });

    // get all devices
    const devices = ['all'];
    Object.values(timestamps).forEach((timestamp) => {
      if (timestamp.userAgent && timestamp.userAgent.os && timestamp.userAgent.os.name) {
        const deviceName = timestamp.userAgent.os.name;
        if (!devices.includes(deviceName)) {
          devices.push(deviceName);
        }
      } else if (timestamp.device) {
        const deviceName = timestamp.device.replaceAll('"', '');
        if (!devices.includes(deviceName)) {
          devices.push(deviceName);
        }
      }
    });

    Object.keys(timestamps).forEach((timestamp) => {
      const timestampItem = timestamps[timestamp];
      const { ip: timestampIp } = timestampItem;

      const matchesIpFilter = !filterByIp || timestampIp.includes(filterByIp);
      const matchesEventFilter = anonymousFilter.event === 'all' || anonymousFilter.event === timestampItem.event;
      const matchesLocationFilter = anonymousFilter.location === 'all' || [timestampItem.city, timestampItem.country].filter(Boolean).join(', ') === anonymousFilter.location;
      const matchesReferrerFilter = anonymousFilter.referrer === 'all' || anonymousFilter.referrer === timestampItem.referrer;
      const matchesBrowserFilter =
        anonymousFilter.browser === 'all' ||
        (timestampItem.userAgent &&
          timestampItem.userAgent.browser &&
          timestampItem.userAgent.browser.name &&
          anonymousFilter.browser === `${timestampItem.userAgent.browser.name} (${parseAcceptLanguage(timestampItem.language) || 'unknown'})`) ||
        (timestampItem.browser && anonymousFilter.browser === `${parseBrowser(timestampItem.browser)} (${parseAcceptLanguage(timestampItem.language) || 'unknown'})`);
      const matchesDeviceFilter =
        anonymousFilter.device === 'all' ||
        (timestampItem.userAgent && timestampItem.userAgent.os && timestampItem.userAgent.os.name && anonymousFilter.device === timestampItem.userAgent.os.name) ||
        (timestampItem.device && anonymousFilter.device === timestampItem.device.replaceAll('"', ''));

      if (matchesIpFilter && matchesEventFilter && matchesLocationFilter && matchesReferrerFilter && matchesBrowserFilter && matchesDeviceFilter) {
        filteredTimestamps[timestamp] = timestampItem;
      }
    });

    const originalAnonymousData = Object.keys(filteredTimestamps).sort((A, B) => new Date(Number(B)) - new Date(Number(A)));
    const anonymousData = [...originalAnonymousData];

    const generateTable = () =>
      createTable({
        tableId: 'anonymous',
        tableClass: 'anonymous',
        headers: ['IP', 'Event', 'Date', 'URL', 'Location', 'Referrer', 'Browser', 'Device'],
        rows: anonymousData.map((timestamp) => {
          const timestampItem = timestamps[timestamp];
          const serverEvent = ['server email request', 'server api request', 'server page request', 'server redirect request'].includes(timestampItem.event);
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
              link: timestampItem.url,
            },
            location: [timestampItem.city, timestampItem.country].filter(Boolean).join(', '),
            referrer: {
              value: timestampItem.referrer,
              link: timestampItem.referrer,
            },
            browser: !serverEvent
              ? {
                  value: `${timestampItem.userAgent.browser.name}, ${parseAcceptLanguage(timestampItem.language)}`,
                  title: `${timestampItem.userAgent.browser.name} ${timestampItem.userAgent.browser.version} ${timestampItem.language}`,
                }
              : {
                  title: [
                    timestampItem.browser ? `Full sec-ch-ua header: ${timestampItem.browser}` : null,
                    timestampItem.language ? `Full accept-language header: ${timestampItem.language}` : null,
                  ]
                    .filter(Boolean)
                    .join('\n'),
                  value: [parseBrowser(timestampItem.browser), parseAcceptLanguage(timestampItem.language)].filter(Boolean).join(', '),
                },
            device: !serverEvent
              ? {
                  title: `${timestampItem.userAgent.device?.vendor} ${timestampItem.userAgent.os.name} ${timestampItem.userAgent.os.version}`,
                  value: timestampItem.userAgent.os.name,
                }
              : timestampItem?.device?.replaceAll('"', ''),
          };
        }),
      });

    anonymousTable = generateTable();

    const generateCombobox = (inputId, comboBoxId, options, name) => {
      const comboContainer = document.createElement('div');
      comboContainer.classList.add('combobox');

      const input = document.createElement('input');
      input.type = 'text';
      input.id = inputId;
      input.autocomplete = 'off';
      const currentValue = anonymousFilter[name.toLowerCase()];
      input.placeholder =
        (typeof options === 'object' && !Array.isArray(options) && options[currentValue]) ||
        (Array.isArray(options) && options.includes(currentValue) && currentValue) ||
        'Select...';
      input.classList.add('button', 'action', 'secondary');

      const comboBox = document.createElement('div');
      comboBox.id = comboBoxId;
      comboBox.classList.add('combobox-content');

      if (Array.isArray(options)) {
        options.forEach((option) => {
          const item = document.createElement('div');
          item.textContent = option;
          item.dataset.value = option;
          comboBox.appendChild(item);

          if (option === currentValue) {
            item.classList.add('selected');
          }
        });
      } else if (typeof options === 'object') {
        for (const key in options) {
          // eslint-disable-next-line no-prototype-builtins
          if (options.hasOwnProperty(key)) {
            const item = document.createElement('div');
            item.textContent = options[key];
            item.dataset.value = key;
            comboBox.appendChild(item);

            if (key === currentValue) {
              item.classList.add('selected');
            }
          }
        }
      }

      comboContainer.appendChild(input);
      comboContainer.appendChild(comboBox);

      input.addEventListener('focus', () => {
        container.querySelectorAll('.combobox-content').forEach((box) => {
          if (box !== comboBoxId) {
            box.classList.remove('combobox-show');
          }
        });
        const triggerRect = input.getBoundingClientRect();
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        // get the height of the client
        const { clientHeight } = document.documentElement;

        // Check if the space below is less than 400px to place the dropdown on top or bottom
        if (spaceBelow < Math.min(400, clientHeight / 2)) {
          comboBox.style.bottom = `${triggerRect.height}px`;
          comboBox.style.top = 'auto';
        } else {
          comboBox.style.top = 'auto';
          comboBox.style.bottom = 'auto';
        }

        comboBox.classList.add('combobox-show');
      });

      container.addEventListener('click', (event) => {
        if (!event.target.closest('.combobox')) {
          container.querySelectorAll('.combobox-content').forEach((box) => {
            box.classList.remove('combobox-show');
          });
        }
      });

      input.addEventListener('input', () => {
        const filter = input.value.toLowerCase();
        const items = comboBox.getElementsByTagName('div');

        for (const element of items) {
          const textValue = element.textContent || element.innerText;
          if (textValue.toLowerCase().includes(filter)) {
            element.style.display = '';
          } else {
            element.style.display = 'none';
          }
        }
      });

      comboBox.addEventListener('click', (event) => {
        if (event.target.tagName === 'DIV') {
          const selectedValue = event.target.dataset.value;
          input.value = event.target.textContent;
          comboBox.classList.remove('combobox-show');
          const filterName = name.toLowerCase();
          anonymousFilter[filterName] = selectedValue;
          if (selectedValue === 'all') {
            anonymousUserResponse = null;
            anonymousUserData = null;
          }
          anonymousContainer.innerHTML = renderSkeleton('tracking');
          onFilterInput(selectedValue === 'all' ? '' : selectedValue, `anonymous${name}`, renderAnonymous, 0);
        }
      });

      return comboContainer;
    };

    const anonymousGridContent = ['ip', 'event', 'date', 'url', 'location', 'referrer', 'browser', 'device'].map((id) => `<div id="anon-${id}"></div>`).join('');
    anonymousContainer.innerHTML = `<div class="anonymous-grid">${anonymousGridContent}</div>`;
    document.getElementById('anon-event').appendChild(generateCombobox('event-input', 'event-content', events, 'Event'));

    document.getElementById('anon-location').appendChild(generateCombobox('location-input', 'location-content', locations, 'Location'));

    document.getElementById('anon-referrer').appendChild(generateCombobox('referrer-input', 'referrer-content', referrers, 'Referrer'));

    document.getElementById('anon-browser').appendChild(generateCombobox('browser-input', 'browser-content', browsers, 'Browser'));

    document.getElementById('anon-device').appendChild(generateCombobox('device-input', 'device-content', devices, 'Device'));

    anonymousContainer.append(anonymousTable.wrapper);

    const anonCluster = new Clusterize({
      rows: anonymousTable.tbody.children,
      rows_in_block: 80,
      scrollId: 'scrollArea-anonymous',
      contentId: 'contentArea-anonymous',
      callbacks: {
        scrollingProgress: (progress) => {
          if (progress > 90 && anonCluster.getRowsAmount() !== originalAnonymousData.length) {
            anonymousData.splice(0, maxRows);
            const newRows = [...generateTable().tbody.children].map((row) => row.outerHTML);
            anonCluster.append(newRows);
            showToast(`Loaded ${anonCluster.getRowsAmount()} rows from ${originalAnonymousData.length} anonymous activity records.`, 'info');
          }
        },
      },
    });

    filterEventlistener(filterAnonymousUsersInput, 'ip', renderAnonymous, 0, () => {
      anonymousContainer.innerHTML = renderSkeleton('tracking');
      anonymousUserResponse = null;
      anonymousUserData = null;
    });
  };

  renderUsers();
  renderDeletedUsers();
  renderAnonymous();
}
