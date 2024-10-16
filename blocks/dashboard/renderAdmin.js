import {
  generateTimeSeries,
  OOPS, parseFragment, SCRIPT_API, waitForAuthenticated,
} from '../../scripts/scripts.js';

export default async function renderAdmin({ container, nav }) {
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
      return await req.json();
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
                    ${Object.keys(deletedUsers)
    .sort((uA, uB) => new Date(deletedUsers[uB].last_login) - new Date(deletedUsers[uA].last_login))
    .map((u) => `
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
      const timestamps = {};
      ips.forEach((ip) => {
        Object.keys(anonymous[ip]).forEach((timestamp) => {
          timestamps[timestamp] = anonymous[ip][timestamp];
        });
      });

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
              ${Object.keys(timestamps)
    .sort((timestampA, timestampB) => new Date(Number(timestampB)) - new Date(Number(timestampA)))
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
                          <td>${timestamps[timestamp].platform ?? ''}</td>
                        </tr>
                    ` : `
                    <tr>
                      <td>${timestamps[timestamp].ip}</td>
                      <td>${timestamps[timestamp].event}${timestamps[timestamp].isSPA ? ' SPA' : ''}</td>
                      <td>${new Date(Number(timestamp)).toLocaleString()}</td>
                      <td><a href="${timestamps[timestamp].url}" target="_blank">${
          timestamps[timestamp].url
        }</a></td>
                                  <td>${timestamps[timestamp].location.city} - ${timestamps[timestamp].location.country}</td>
                                  
                                  <td>${
        timestamps[timestamp].referrer
          ? `<a href="${timestamps[timestamp].referrer}" target="_blank">${timestamps[timestamp].referrer}</a>`
          : ''
        }</td>
                                  <td>${timestamps[timestamp].userAgent.browser.name} ${
          timestamps[timestamp].userAgent.browser.version
        } ${timestamps[timestamp].language}</td>
                                  <td>${timestamps[timestamp].userAgent.device?.vendor ?? ''} ${
          timestamps[timestamp].userAgent.os.name
        } ${timestamps[timestamp].userAgent.os.version}</td>
                                </tr>
                              `),
    )
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

  const analyticsContainer = container.querySelector('.analytics');
  loadWebAnalytics('1d').then(async (analytics) => {
    if (!analytics) {
      analyticsContainer.querySelector('p').textContent = OOPS;
      return;
    }

    const { countries } = await import('../site-details/countries.js');

    // Load chart.js
    await import('../../libs/chart/chart.min.js');
    await import('../../libs/chart/chart-utils.min.js');

    const Utils = window.ChartUtils.init();

    const periodSelector = parseFragment(`<select class="button action secondary period-selector">
      <option value="1d" selected>Analytics period: 1 day</option>
      <option value="7d">Analytics period: 7 days</option>
      <option value="30d">Analytics period: 30 days</option>
    </select>`);
    nav.append(periodSelector);

    const renderWebAnalytics = (metrics) => {
      const totalVisits = metrics[0]?.data?.viewer.accounts[0]?.total[0]?.sum?.visits ?? 0;
      const totalPageViews = metrics[0]?.data?.viewer.accounts[0]?.total[0]?.count ?? 0;
      const medianPageLoadTime = metrics[2]
        ?.data?.viewer.accounts[0]?.totalPerformance[0]?.aggregation?.pageLoadTime ?? 0;

      const visitsDelta = metrics[2]?.data?.viewer.accounts[0].visitsDelta[0]
        ? (totalVisits * 100) / metrics[2].data.viewer.accounts[0].visitsDelta[0].sum.visits - 100
        : 0;
      const pageViewsDelta = metrics[2]?.data?.viewer.accounts[0].pageviewsDelta[0]
        ? (totalPageViews * 100) / metrics[2].data.viewer.accounts[0].pageviewsDelta[0].count - 100
        : 0;
      const performanceDelta = metrics[2]?.data?.viewer.accounts[0].performanceDelta[0]
      && metrics[2].data.viewer.accounts[0].performanceDelta[0].aggregation.pageLoadTime > 0
        ? (medianPageLoadTime * 100) / metrics[2]
          .data.viewer.accounts[0].performanceDelta[0].aggregation.pageLoadTime
        - 100
        : 0;

      analyticsContainer.innerHTML = `
          <div class="title">
              <h3>Last ${periodSelector.value === '1d' ? '24 Hours' : periodSelector.value.replace('d', ' Days')}</h3>
              ${periodSelector.value === '30d' ? '<i>(Based on a 10% sample of page load events)</i>' : ''}
          </div>
          <div class="cards">
            <div id="total-visits" class="box">
                <strong>Total visits</strong>
                <span>${totalVisits}</span>
                ${visitsDelta !== 0 ? `<span class="${visitsDelta < 0 ? 'red' : 'green'}">${visitsDelta > 0 ? '+' : ''}${visitsDelta}%</span>` : ''}
            </div>
            <div id="total-page-views" class="box">
                <strong>Total page views</strong>
                <span>${totalPageViews}</span>
                ${pageViewsDelta !== 0 ? `<span class="${pageViewsDelta < 0 ? 'red' : 'green'}">${pageViewsDelta > 0 ? '+' : ''}${pageViewsDelta}%</span>` : ''}
            </div>
            <div id="median-page-load" class="box">
                <strong>Median page load time</strong>
                <span>${medianPageLoadTime / 1000}ms</span>
                ${performanceDelta !== 0 ? `<span class="${performanceDelta < 0 ? 'red' : 'green'}">${performanceDelta > 0 ? '+' : ''}${performanceDelta}%</span>` : ''}
            </div>
          </div>

          <div class="chart-container">
              <canvas id="chart" width="600" height="400"></canvas>
          </div>

          <div id="monitoring-details">
            <div id="visits-details">
              <h3>Visits details</h3>
              <div class="cards metrics">
                  <div id="visits-details-country" class="box">
                      <strong>By country</strong>
                      ${metrics[0].data.viewer.accounts[0].countries.map((country) => `
                        <p><span title="${countries.find(({ value }) => value === country.dimensions.metric)?.label}">${countries.find(({ value }) => value === country.dimensions.metric)?.label}</span><span>${country.sum.visits}</span></p>`)
    .join('')}
                  </div>
                  <div id="visits-details-referers" class="box">
                      <strong>By referers</strong>
                      ${metrics[0].data.viewer.accounts[0].topReferers
    .filter((ref) => ref.sum.visits > 1)
    .map(
      (referer) => `<p><span title="${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}">${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}</span><span>${referer.sum.visits}</span></p>`,
    )
    .join('')
}
                  </div>
                  <div id="visits-details-paths" class="box">
                      <strong>By paths</strong>
                      ${metrics[0].data.viewer.accounts[0].topPaths.map((paths) => `<p><span title="${paths.dimensions.metric}">${paths.dimensions.metric}</span><span>${paths.sum.visits}</span></p>`)
    .join('')}
                  </div>
                  <div id="visits-details-browsers" class="box">
                      <strong>By browsers</strong>
                      ${metrics[0].data.viewer.accounts[0].topBrowsers.map((browsers) => `<p><span title="${browsers.dimensions.metric}">${browsers.dimensions.metric}</span><span>${browsers.sum.visits}</span></p>`)
    .join('')}
                  </div>
                  <div id="visits-details-os" class="box">
                      <strong>By operating systems</strong>
                      ${metrics[0].data.viewer.accounts[0].topOSs.map((OSs) => `<p><span title="${OSs.dimensions.metric}">${OSs.dimensions.metric}</span><span>${OSs.sum.visits}</span></p>`)
    .join('')}
                  </div>
                  <div id="visits-details-devices" class="box">
                      <strong>By device type</strong>
                      ${metrics[0].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `<p><span title="${deviceTypes.dimensions.metric}">${deviceTypes.dimensions.metric}</span><span>${deviceTypes.sum.visits}</span></p>`)
    .join('')}
                  </div>
              </div>
            </div>
  
            <div id="page-views-details">
              <h3>Page views details</h3>
              <div class="cards metrics">
                <div id="page-views-details-country" class="box">
                    <strong>By country</strong>
                    ${metrics[0].data.viewer.accounts[0].countries.map((country) => `<p><span title="${countries.find(({ value }) => value === country.dimensions.metric)?.label}">${countries.find(({ value }) => value === country.dimensions.metric)?.label}</span><span>${country.count}</span></p>`)
    .join('')}
                </div>
                <div id="page-views-details-referers" class="box">
                    <strong>By referers</strong>
                    ${metrics[0].data.viewer.accounts[0].topReferers.map((referer) => `<p><span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}:</span><span>${referer.count}</span></p>`)
    .join('')}
                </div>
                <div id="page-views-details-paths" class="box">
                    <strong>By paths</strong>
                    ${metrics[0].data.viewer.accounts[0].topPaths.map((paths) => `<p><span>${paths.dimensions.metric}:</span><span>${paths.count}</span></p>`)
    .join('')}
                </div>
                <div id="page-views-details-browsers" class="box">
                    <strong>By browsers</strong>
                    ${metrics[0].data.viewer.accounts[0].topBrowsers.map((browsers) => `<p><span>${browsers.dimensions.metric}:</span><span>${browsers.count}</span></p>`)
    .join('')}
                </div>
                <div id="page-views-details-os" class="box">
                    <strong>By operating systems</strong>
                    ${metrics[0].data.viewer.accounts[0].topOSs.map((OSs) => `<p><span>${OSs.dimensions.metric}:</span><span>${OSs.count}</span></p>`)
    .join('')}
                </div>
                <div id="page-views-details-devices" class="box">
                    <strong>By device type</strong>
                    ${metrics[0].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `<p><span>${deviceTypes.dimensions.metric}:</span><span>${deviceTypes.count}</span></p>`)
    .join('')}
                </div>
              </div>
            </div>
  
            <div id="pageload-details">
              <h3>Page load time details</h3>
              <div class="cards metrics">
                <div id="pageload-details-country" class="box">
                    <strong>By country</strong>
                    ${metrics[3].data.viewer.accounts[0].countries.map((country) => `<p><span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}:</span><span>${country.count}</span></p>`)
    .join('')}
                </div>
                <div id="pageload-details-referers" class="box">
                    <strong>By referers</strong>
                    ${metrics[3].data.viewer.accounts[0].topReferers.map((referer) => `<p><span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}:</span><span>${referer.count}</span></p>`)
    .join('')}
                </div>
                <div id="pageload-details-paths" class="box">
                    <strong>By paths</strong>
                    ${metrics[3].data.viewer.accounts[0].topPaths.map((paths) => `<p><span>${paths.dimensions.metric}:</span><span>${paths.count}</span></p>`)
    .join('')}
                </div>
                <div id="pageload-details-browsers" class="box">
                    <strong>By browsers</strong>
                    ${metrics[3].data.viewer.accounts[0].topBrowsers.map((browsers) => `<p><span>${browsers.dimensions.metric}:</span><span>${browsers.count}</span></p>`)
    .join('')}
                </div>
                <div id="pageload-details-os" class="box">
                    <strong>By operating systems</strong>
                    ${metrics[3].data.viewer.accounts[0].topOSs.map((OSs) => `<p><span>${OSs.dimensions.metric}:</span><span>${OSs.count}</span></p>`)
    .join('')}
                </div>
                <div id="pageload-details-devices" class="box">
                    <strong>By device type</strong>
                    ${metrics[3].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `<p><span>${deviceTypes.dimensions.metric}:</span><span>${deviceTypes.count}</span></p>`)
    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;

      const series = generateTimeSeries(periodSelector.value);

      const labels = series.map((d) => (periodSelector.value === '30d' ? d.toLocaleDateString() : d.toLocaleString()));

      const visitsData = [];
      const pageViewsData = [];

      series.forEach((d) => {
        const found = metrics[1].data.viewer.accounts[0].series.find((serie) => (periodSelector.value === '30d'
          ? d.toLocaleDateString() === new Date(serie.dimensions.ts).toLocaleDateString()
          : d.getTime() === new Date(serie.dimensions.ts).getTime()));

        if (found) {
          visitsData.push(found.sum.visits);
          pageViewsData.push(found.count);
        } else {
          visitsData.push(0);
          pageViewsData.push(0);
        }
      });

      const config = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Visits',
              data: visitsData,
              fill: false,
              borderColor: Utils.CHART_COLORS.blue,
            },
            {
              label: 'Page views',
              data: pageViewsData,
              fill: false,
              borderColor: Utils.CHART_COLORS.red,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      };

      // eslint-disable-next-line no-new
      new window.Chart(document.getElementById('chart'), config);
    };

    periodSelector.onchange = async () => {
      analyticsContainer.innerHTML = '<img src="/icons/loading.svg" alt="loading" loading="lazy"/>';
      const newAnalytics = await loadWebAnalytics(periodSelector.value);
      if (newAnalytics) {
        renderWebAnalytics(newAnalytics);
      }
    };

    renderWebAnalytics(analytics);
  });

  renderUsers(0);
  renderDeletedUsers();
  renderAnonymous();
}
