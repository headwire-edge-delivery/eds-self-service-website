import { OOPS, parseFragment, SCRIPT_API } from '../../scripts/scripts.js';

export default async function renderSiteAnalytics({ container, nav, renderOptions }) {
  container.innerHTML = '<img src="/icons/loading.svg" alt="loading"/>';

  const {
    token, siteSlug,
  } = renderOptions;

  // Load web analytics
  const loadWebAnalytics = async (interval) => Promise.all(
    [
      `${SCRIPT_API}/monitoring/${siteSlug}?period=${interval}`,
      `${SCRIPT_API}/cww/${siteSlug}?period=${interval}`,
    ].map(async (url) => {
      const req = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!req?.ok) {
        throw new Error(req?.status || OOPS);
      }
      return req.json();
    }),
  );

  const analytics = await loadWebAnalytics('1d');

  const { countries } = await import('./countries.js');

  // Load chart.js
  await import('../../libs/chart/chart.min.js');
  await import('../../libs/chart/chart-utils.min.js');

  const Utils = window.ChartUtils.init();

  const roundUpToNearestInterval = (date, intervalMinutes) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.ceil(minutes / intervalMinutes) * intervalMinutes;
    date.setMinutes(roundedMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  };

  const generateTimeSeries = (intervalChoice) => {
    let intervalMinutes;
    let daysBack;

    switch (intervalChoice) {
      case '1d':
        intervalMinutes = 15;
        daysBack = 1; // 24 hours
        break;
      case '7d':
        intervalMinutes = 60;
        daysBack = 7; // 7 days
        break;
      case '30d':
        intervalMinutes = 1440; // 24 hours * 60 minutes
        daysBack = 30; // 30 days
        break;
      default:
        throw new Error('Invalid interval choice.');
    }

    const intervalMillis = intervalMinutes * 60 * 1000;
    const totalIntervals = (daysBack * 24 * 60) / intervalMinutes;

    let now = new Date();
    now = roundUpToNearestInterval(now, intervalMinutes);

    const timeSeries = [];

    for (let i = 0; i <= totalIntervals; i += 1) {
      const timePoint = new Date(now.getTime() - i * intervalMillis);
      timeSeries.unshift(timePoint);
    }

    return timeSeries;
  };

  const periodSelector = parseFragment(`<select class="button action secondary period-selector">
    <option value="1d" selected>Period: 1 day</option>
    <option value="7d">Period: 7 days</option>
    <option value="30d">Period: 30 days</option>
  </select>`);
  nav.append(periodSelector);

  const renderWebAnalytics = ([metrics, cww]) => {
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
      ? (medianPageLoadTime * 100) / metrics[2]
        .data.viewer.accounts[0].performanceDelta[0].aggregation.pageLoadTime
        - 100
      : 0;

    container.innerHTML = `
        <div class="title"><h2>Last ${
  periodSelector.value === '1d' ? '24 Hours' : periodSelector.value.replace('d', ' Days')
}</h2>${periodSelector.value === '30d' ? '<i>(Based on a 10% sample of page load events)</i>' : ''}</div>
          <div class="cards">
            <div id="total-visits" class="box">
                <strong>Total visits</strong>
                <span>${totalVisits}</span>
                ${
  visitsDelta !== 0
    ? `<span class="${visitsDelta < 0 ? 'red' : 'green'}">${
      visitsDelta > 0 ? '+' : ''
    }${visitsDelta}%</span>`
    : ''
}
            </div>
            <div id="total-page-views" class="box">
                <strong>Total page views</strong>
                <span>${totalPageViews}</span>
                ${
  pageViewsDelta !== 0
    ? `<span class="${pageViewsDelta < 0 ? 'red' : 'green'}">${
      pageViewsDelta > 0 ? '+' : ''
    }${pageViewsDelta}%</span>`
    : ''
}
            </div>
            <div id="median-page-load" class="box">
                <strong>Median page load time</strong>
                <span>${medianPageLoadTime / 1000}ms</span>
                ${
  performanceDelta !== 0
    ? `<span class="${performanceDelta < 0 ? 'red' : 'green'}">${
      performanceDelta > 0 ? '+' : ''
    }${performanceDelta}%</span>`
    : ''
}
            </div>
          </div>

          <div class="chart-container">
              <canvas id="chart" width="600" height="400"></canvas>
          </div>

          <div id="monitoring-details">
          <div id="visits-details">
            <h2>Visits details</h2>
            <div class="cards metrics">
                <div id="visits-details-country" class="box">
                    <strong>By country</strong>
                    ${metrics[0].data.viewer.accounts[0].countries
    .map(
      (country) => `
                      <p><span title="${countries.find(({ value }) => value === country.dimensions.metric)?.label}">${
  countries.find(({ value }) => value === country.dimensions.metric)?.label
}</span><span>${country.sum.visits}</span></p>
                    `,
    )
    .join('')}
                </div>
                <div id="visits-details-referers" class="box">
                    <strong>By referers</strong>
                    ${metrics[0].data.viewer.accounts[0].topReferers
    .filter((ref) => ref.sum.visits > 1)
    .map(
      (referer) => `
                      <p><span title="${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}">${
  referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'
}</span><span>${referer.sum.visits}</span></p>
                    `,
    )
    .join('')}
                </div>
                <div id="visits-details-paths" class="box">
                    <strong>By paths</strong>
                    ${metrics[0].data.viewer.accounts[0].topPaths
    .map(
      (paths) => `
                      <p><span title="${paths.dimensions.metric}">${paths.dimensions.metric}</span><span>${paths.sum.visits}</span></p>
                    `,
    )
    .join('')}
                </div>
                <div id="visits-details-browsers" class="box">
                    <strong>By browsers</strong>
                    ${metrics[0].data.viewer.accounts[0].topBrowsers
    .map(
      (browsers) => `
                      <p><span title="${browsers.dimensions.metric}">${browsers.dimensions.metric}</span><span>${browsers.sum.visits}</span></p>
                    `,
    )
    .join('')}
                </div>
                <div id="visits-details-os" class="box">
                    <strong>By operating systems</strong>
                    ${metrics[0].data.viewer.accounts[0].topOSs
    .map(
      (OSs) => `
                      <p><span title="${OSs.dimensions.metric}">${OSs.dimensions.metric}</span><span>${OSs.sum.visits}</span></p>
                    `,
    )
    .join('')}
                </div>
                <div id="visits-details-devices" class="box">
                    <strong>By device type</strong>
                    ${metrics[0].data.viewer.accounts[0].topDeviceTypes
    .map(
      (deviceTypes) => `
                      <p><span title="${deviceTypes.dimensions.metric}">${deviceTypes.dimensions.metric}</span><span>${deviceTypes.sum.visits}</span></p>
                    `,
    )
    .join('')}
                </div>
            </div>
          </div>

          <div id="page-views-details">
            <h2>Page views details</h2>
            <div class="cards metrics">
              <div id="page-views-details-country" class="box">
                  <strong>By country</strong>
                  ${metrics[0].data.viewer.accounts[0].countries
    .map(
      (country) => `
                    <p><span title="${countries.find(({ value }) => value === country.dimensions.metric)?.label}">${
  countries.find(({ value }) => value === country.dimensions.metric)?.label
}</span><span>${country.count}</span></p>
                  `,
    )
    .join('')}
              </div>
              <div id="page-views-details-referers" class="box">
                  <strong>By referers</strong>
                  ${metrics[0].data.viewer.accounts[0].topReferers
    .map(
      (referer) => `
                    <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${
  referer.count
}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="page-views-details-paths" class="box">
                  <strong>By paths</strong>
                  ${metrics[0].data.viewer.accounts[0].topPaths
    .map(
      (paths) => `
                    <span>${paths.dimensions.metric}: <span>${paths.count}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="page-views-details-browsers" class="box">
                  <strong>By browsers</strong>
                  ${metrics[0].data.viewer.accounts[0].topBrowsers
    .map(
      (browsers) => `
                    <span>${browsers.dimensions.metric}: <span>${browsers.count}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="page-views-details-os" class="box">
                  <strong>By operating systems</strong>
                  ${metrics[0].data.viewer.accounts[0].topOSs
    .map(
      (OSs) => `
                    <span>${OSs.dimensions.metric}: <span>${OSs.count}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="page-views-details-devices" class="box">
                  <strong>By device type</strong>
                  ${metrics[0].data.viewer.accounts[0].topDeviceTypes
    .map(
      (deviceTypes) => `
                    <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.count}</span></span>
                  `,
    )
    .join('')}
              </div>
            </div>
          </div>

          <div id="pageload-details">
            <h2>Page load time details</h2>
            <div class="cards metrics">
              <div id="pageload-details-country" class="box">
                  <strong>By country</strong>
                  ${metrics[3].data.viewer.accounts[0].countries
    .map(
      (country) => `
                    <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${
  country.count
}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="pageload-details-referers" class="box">
                  <strong>By referers</strong>
                  ${metrics[3].data.viewer.accounts[0].topReferers
    .map(
      (referer) => `
                    <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${
  referer.count
}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="pageload-details-paths" class="box">
                  <strong>By paths</strong>
                  ${metrics[3].data.viewer.accounts[0].topPaths
    .map(
      (paths) => `
                    <span>${paths.dimensions.metric}: <span>${paths.count}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="pageload-details-browsers" class="box">
                  <strong>By browsers</strong>
                  ${metrics[3].data.viewer.accounts[0].topBrowsers
    .map(
      (browsers) => `
                    <span>${browsers.dimensions.metric}: <span>${browsers.count}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="pageload-details-os" class="box">
                  <strong>By operating systems</strong>
                  ${metrics[3].data.viewer.accounts[0].topOSs
    .map(
      (OSs) => `
                    <span>${OSs.dimensions.metric}: <span>${OSs.count}</span></span>
                  `,
    )
    .join('')}
              </div>
              <div id="pageload-details-devices" class="box">
                  <strong>By device type</strong>
                  ${metrics[3].data.viewer.accounts[0].topDeviceTypes
    .map(
      (deviceTypes) => `
                    <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.count}</span></span>
                  `,
    )
    .join('')}
              </div>
            </div>
          </div>
          </div>
          
          <div id="core-web-vitals">
          <h2>Core Web Vitals</h2>

          <div class="cards">
              ${['lcp', 'inp', 'fid', 'cls']
    .map(
      (metric) => `
                <div class="cwp-box">
                  <strong>${metric.toUpperCase()}</strong>
                  <span>Excellent (${
  metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}Good`] ?? '0'
})</span>
                  <span>Good (${
  metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}NeedsImprovement`] ?? '0'
})</span>
                  <span>Needs improvement (${
  metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}Poor`] ?? '0'
})</span>
                </div>
                `,
    )
    .join('')}
          </div>
          </div>
          
          <div id="core-web-vitals-path-browsers">
          <h2>By Path and Browsers</h2>
          
          <div class="cards metrics">
            <div class="cwp-box">
                <strong>LCP</strong>
                ${cww[0].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.largestContentfulPaintPath)
    .map(
      (rum) => `
                    <span>Path: <span>${rum.dimensions.largestContentfulPaintPath}</span></span>
                    <ul>
                      <li>Excellent (${rum?.sum.lcpGood ?? '0'})</li>
                      <li>Good (${rum?.sum.lcpNeedsImprovement ?? '0'})</li>
                      <li>Needs improvement (${rum?.sum.lcpPoor ?? '0'})</li>
                    </ul>
                  `,
    )
    .join('')}
            </div>
            <div class="cwp-box">
                <strong>INP</strong>
                ${cww[1].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.userAgentBrowser)
    .map(
      (rum) => `
                    <span>Browser: <span>${rum.dimensions.userAgentBrowser}</span></span>
                    <ul>
                        <li>Excellent (${rum?.sum.inpGood ?? '0'})</li>
                        <li>Good (${rum?.sum.inpNeedsImprovement ?? '0'})</li>
                        <li>Needs improvement (${rum?.sum.inpPoor ?? '0'})</li>
                    </ul>
                  `,
    )
    .join('')}
            </div>
            <div class="cwp-box">
                <strong>FID</strong>
                ${cww[1].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.firstInputDelayPath)
    .map(
      (rum) => `
                  <span>Path: <span>${rum.dimensions.firstInputDelayPath}</span></span>
                  <ul>
                    <li>Excellent (${rum?.sum.fidGood ?? '0'})</li>
                    <li>Good (${rum?.sum.fidNeedsImprovement ?? '0'})</li>
                    <li>Needs improvement (${rum?.sum.fidPoor ?? '0'})</li>
                  </ul>
                `,
    )
    .join('')}
            </div>
            <div class="cwp-box">
                <strong>CLS</strong>
                ${cww[1].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.cumulativeLayoutShiftPath)
    .map(
      (rum) => `
                  <span>Path: <span>${rum.dimensions.cumulativeLayoutShiftPath}</span></span>
                  <ul>
                    <li>Excellent (${rum?.sum.clsGood ?? '0'})</li>
                    <li>Good (${rum?.sum.clsNeedsImprovement ?? '0'})</li>
                    <li>Needs improvement (${rum?.sum.clsPoor ?? '0'})</li>
                  </ul>
                `,
    )
    .join('')}
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
    window?.zaraz?.track('change analytics period');
    container.innerHTML = '<img src="/icons/loading.svg" alt="loading" loading="lazy"/>';
    renderWebAnalytics(await loadWebAnalytics(periodSelector.value));
  };

  renderWebAnalytics(analytics);
}