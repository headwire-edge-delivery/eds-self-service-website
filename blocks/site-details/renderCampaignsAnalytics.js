import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import { clamp, dateToRelativeSpan, parseFragment, safeText, SCRIPT_API, syntheticClickEvent } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { createDialog } from '../../scripts/dialogs.js';
import { createRedirectUrl } from '../../scripts/utils.js';

const createAnalyticsTableContent = (container, campaignAnalyticsData, search) => {
  if (!campaignAnalyticsData) {
    return '<tr><td class="empty" colspan="8">Not enough data</td></tr>';
  }

  container.querySelector('.email-details').innerHTML = `
  <div id="scrollArea" class="clusterize-scroll">
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>To</th>
          <th>Sent</th>
          <th>Delivered</th>
          <th>Bounced</th>
          <th>Complained</th>
          <th>Opened</th>
          <th>Clicked</th>
        </tr>
      </thead>
      <tbody id="contentArea" class="clusterize-content">
        <tr class="clusterize-no-data">
          <td>No Data found</td>
        </tr>
      </tbody>
    </table>
  </div>`;

  const list = Object.keys(campaignAnalyticsData)
    .sort((emailIdA, emailIdB) => {
      const sentA = campaignAnalyticsData[emailIdA].find(({ type }) => type === 'email.sent');
      const sentB = campaignAnalyticsData[emailIdB].find(({ type }) => type === 'email.sent');
      if (sentA && sentB) {
        return new Date(sentB.created_at) - new Date(sentA.created_at);
      }
      return 0;
    })
    .map((emailId) => {
      const { subject } = campaignAnalyticsData[emailId][0].data;
      if (!subject.toLowerCase().includes(search.toLowerCase())) {
        return null;
      }
      const reverse = campaignAnalyticsData[emailId].reverse();
      const sent = campaignAnalyticsData[emailId].find(({ type }) => type === 'email.sent');
      const delivered = reverse.find(({ type }) => type === 'email.delivered');
      const complained = campaignAnalyticsData[emailId].find(({ type }) => type === 'email.complained');
      const bounced = campaignAnalyticsData[emailId].find(({ type }) => type === 'email.bounced');
      const opened = reverse.find(({ type }) => type === 'email.opened');
      const clicks = campaignAnalyticsData[emailId].filter(({ type }) => type === 'email.clicked');
      const emailURL = campaignAnalyticsData[emailId][0].data.headers.find(({ name }) => name === 'X-Email-Url')?.value;

      let campaign;
      try {
        const emailPreviewUrl = new URL(new URLSearchParams(new URL(emailURL).search).get('contentUrl'));
        campaign = emailPreviewUrl.pathname.split('/')[2];
      } catch {
        campaign = '';
      }

      return `
        <tr data-email="${emailId}" data-campaign="${campaign}">
          <td>${emailURL ? `<a href="${createRedirectUrl(emailURL)}" target="_blank">${subject}</a>` : subject}</td>
          <td>${campaignAnalyticsData[emailId][0].data.to.join(',')}</td>
          <td>${sent ? dateToRelativeSpan(sent.created_at).outerHTML : ''}</td>
          <td>${delivered ? dateToRelativeSpan(delivered.created_at).outerHTML : ''}</td>
          <td>${bounced ? dateToRelativeSpan(bounced.created_at).outerHTML : ''}</td>
          <td>${complained ? dateToRelativeSpan(complained.created_at).outerHTML : ''}</td>
          <td>${opened ? dateToRelativeSpan(opened.created_at).outerHTML : ''}</td>
          <td>${
            clicks.length
              ? `<button class="click-details button action secondary">${clicks.length}&nbsp;click(s)</button>
                <div hidden><ul class="clicked-links">${clicks
                  .map(
                    (clicked) =>
                      `<li>Clicked <a href="${clicked.data.click.link}" target="_blank">${
                        clicked.data.click.link
                      }</a> ${dateToRelativeSpan(clicked.data.click.timestamp).outerHTML}</li>`,
                  )
                  .join('')}</ul></div>`
              : ''
          }</td>
        </tr>
      `;
    });

  const rows = list.filter((row) => row !== null);

  const clusterizeTable = container.querySelector('#contentArea');

  const clusterize = new Clusterize({
    rows: rows.length ? rows : ['<tr><td class="empty" colspan="8">No data found</td></tr>'],
    scrollId: 'scrollArea',
    contentElem: clusterizeTable,
    callbacks: {
      clusterChanged: () => {
        clusterizeTable.querySelectorAll('.click-details').forEach((el) => {
          el.onclick = () => {
            const clone = el.nextElementSibling.cloneNode(true);
            clone.hidden = false;
            const content = parseFragment(`
            <div>
                <h3>${el.textContent}</h3>
                ${clone.outerHTML}    
            </div>
          `);
            createDialog(content);
          };
        });
      },
    },
  });
  return clusterize;
};

export default async function renderCampaignsAnalytics({ container, renderOptions, pushHistory, onHistoryPopArray, replaceHistory }) {
  const { token, siteSlug, pathname } = renderOptions;

  container.innerHTML = renderSkeleton('campaign-analytics');

  const [campaignAnalyticsData, campaignsData] = await Promise.all([
    fetch(`${SCRIPT_API}/email/${siteSlug}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .catch(() => ({})),
    fetch(`${SCRIPT_API}/campaigns/${siteSlug}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .catch(() => ({})),
  ]);

  let search = readQueryParams().search || '';

  container.innerHTML = `
        <ul class="campaign-list" data-type="analytics">
          <li><a class="button selector action secondary ${
            window.location.pathname.startsWith(`${pathname}/campaign-analytics/`) ? '' : 'is-selected'
          }" href="${pathname}/campaign-analytics">All emails</a></li>
          ${Object.keys(campaignsData)
            .map(
              (campaignSlug) =>
                `<li data-campaign="${campaignSlug}"><a class="button selector action secondary ${
                  window.location.pathname === `${pathname}/campaign-analytics/${campaignSlug}` ? 'is-selected' : ''
                }" href="${pathname}/campaign-analytics/${campaignSlug}">${campaignsData[campaignSlug].name}</li></a>`,
            )
            .join('')}</a>
        </ul>
          
        <div id="email-metrics" class="cards metrics">
          <div id="email-metrics-delivery-rate" class="box">
              <strong>Delivery rate</strong>
              <span class="delivered-count"></span>
          </div>
          <div id="email-metrics-bounce-rate" class="box">
              <strong>Bounce rate</strong>
              <span class="bounced-count"></span>
          </div>
          <div id="email-metrics-open-rate" class="box">
              <strong>Open rate</strong>
              <span class="opened-count"></span>
          </div>
          <div id="email-metrics-cto-rate" class="box">
              <strong>Click-to-open rate</strong>
              <span class="clicked-count"></span>
          </div>
          <div id="email-metrics-sc-rate" class="box">
              <strong>Spam complaints rate</strong>
              <span class="complained-count"></span>
          </div>
        </div>
        
        <h2 id="email-details">Email details</h2>
        <input value="${safeText(search)}" type="search" placeholder="Filter" class="filter-email-details filter">
        <div class="email-details clusterize">
          ${renderSkeleton('campaign-tracking')}
        </div>
      `;

  const emailFilter = container.querySelector('.filter-email-details');

  // eslint-disable-next-line func-names
  emailFilter.oninput = (function () {
    let debounceTimer;
    // eslint-disable-next-line func-names
    return function (event) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (event.target.value) {
          search = event.target.value;
          writeQueryParams({ search });
        } else {
          search = '';
          removeQueryParams(['search']);
        }
        createAnalyticsTableContent(container, campaignAnalyticsData, search);
      }, 300);
    };
  })();

  createAnalyticsTableContent(container, campaignAnalyticsData, search);

  const calculateCampaignStats = (hasCampaign) => {
    let sentCount = 0;
    let deliveredCount = 0;
    let bouncedCount = 0;
    let openedCount = 0;
    let clickedCount = 0;
    let complainedCount = 0;

    const selector = hasCampaign ? 'tr[data-campaign]:not([hidden])' : 'tbody tr';
    container.querySelectorAll(selector).forEach((tr) => {
      const emailId = tr.dataset.email;
      if (emailId) {
        const reverse = campaignAnalyticsData[emailId].reverse();

        const sent = campaignAnalyticsData[emailId].find(({ type }) => type === 'email.sent');
        const delivered = reverse.find(({ type }) => type === 'email.delivered');
        const complained = campaignAnalyticsData[emailId].find(({ type }) => type === 'email.complained');
        const bounced = campaignAnalyticsData[emailId].find(({ type }) => type === 'email.bounced');
        const opened = reverse.find(({ type }) => type === 'email.opened');
        const clicks = campaignAnalyticsData[emailId].filter(({ type }) => type === 'email.clicked');

        if (sent) {
          sentCount += 1;
        }
        if (delivered) {
          deliveredCount += 1;
        }
        if (complained) {
          complainedCount += 1;
        }
        if (bounced) {
          bouncedCount += 1;
        }
        if (opened) {
          openedCount += 1;
        }
        if (clicks.length) {
          clickedCount += 1;
        }
      }
    });

    const deliveredPercent = clamp(((deliveredCount / sentCount) * 100).toFixed(2));
    const bouncedPercent = clamp(((bouncedCount / sentCount) * 100).toFixed(2));
    const openedPercent = clamp(((openedCount / deliveredCount) * 100).toFixed(2));
    const clickedPercent = clamp(((clickedCount / openedCount) * 100).toFixed(2));
    const complainedPercent = clamp(((complainedCount / deliveredCount) * 100).toFixed(2));
    container.querySelector('.delivered-count').textContent = `${deliveredPercent}%`;
    container.querySelector('.bounced-count').textContent = `${bouncedPercent}%`;
    container.querySelector('.opened-count').textContent = `${openedPercent}%`;
    container.querySelector('.clicked-count').textContent = `${clickedPercent}%`;
    container.querySelector('.complained-count').textContent = `${complainedPercent}%`;
  };

  const campaignList = container.querySelector('.campaign-list');
  campaignList.onclick = (event) => {
    if (event.target.matches('a')) {
      event.preventDefault();

      const link = event.target;
      const selectedCampaign = campaignList.querySelector('.is-selected');
      if (selectedCampaign) {
        selectedCampaign.classList.remove('is-selected');
      }
      link.classList.add('is-selected');

      const li = link.parentElement;
      const hasCampaign = li.matches('[data-campaign]');
      container.querySelectorAll('tr[data-campaign]').forEach((tr) => {
        tr.hidden = hasCampaign ? tr.dataset.campaign !== li.dataset.campaign : false;
      });

      calculateCampaignStats(hasCampaign);

      if (!event?.detail?.synthetic) {
        pushHistory(link.getAttribute('href'));
      }
    }
  };

  onHistoryPopArray.push((currentItem) => {
    campaignList.querySelector(`[href="${currentItem}"]`).dispatchEvent(syntheticClickEvent);
  });

  calculateCampaignStats(window.location.pathname.startsWith(`${pathname}/campaign-analytics/`));

  if (!container.querySelector('.campaign-list .is-selected')) {
    container.querySelector('.campaign-list[data-type="analytics"] a').dispatchEvent(syntheticClickEvent);
    replaceHistory(`${pathname}/campaign-analytics`);
  }

  if (window.location.pathname === `${pathname}/campaign-analytics` && campaignList.childElementCount === 1) {
    container.insertAdjacentHTML(
      'afterbegin',
      `
      <div class="well">
        <img src="/icons/illustrations/pc.svg" alt="" loading="lazy"/>
        <div class="text">
          <h2>Create your first campaign</h2>
          <p>It’s never been easier to start a campaign. Create a campaign email, edit your content and send it out to your audience.</p>
          <button class="button primary">Start now</button>
        </div>
      </div>
    `,
    );

    container.querySelector('.well button').onclick = () => {
      const tabsParent = container.closest('.tabs-content');
      const link = tabsParent.querySelector(`.tabs-aside a[href$="/${siteSlug}/emails"]`);
      link.classList.add('add-campaign');
      link.dispatchEvent(syntheticClickEvent);
    };
  }
}
