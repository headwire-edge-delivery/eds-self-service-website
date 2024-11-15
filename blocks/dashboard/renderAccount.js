import {
  getUserSettings, OOPS, parseFragment,
  SCRIPT_API,
  updateUserSettings, waitForAuthenticated,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';

export default async function renderAccount({ container, nav }) {
  container.insertAdjacentHTML('afterbegin', renderSkeleton('account'));

  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  const [userSettings, user] = await Promise.all([
    getUserSettings(SCRIPT_API),
    window.auth0Client.getUser(),
  ]);

  fetch(`${SCRIPT_API}/account-usage`, {
    headers: {
      authorization: `bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then(([pageViews, sentEmails]) => {
      const maxPageViews = 5000;
      const maxSentEmails = 500;

      const pageViewsPercentage = (pageViews * 100) / maxPageViews;
      const sentEmailsPercentage = (sentEmails * 100) / maxSentEmails;

      container.querySelector('.account-usage-skeleton').replaceWith(...parseFragment(`
        <h2 style="margin-top: 32px">Monthly consumption</h2>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${pageViewsPercentage}%"></div>
            <div class="progress-bar-text">
              <span>${pageViews} / ${maxPageViews} Page Views</span>
            </div>
        </div>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${sentEmailsPercentage}%"></div>
            <div class="progress-bar-text">
              <span>${sentEmails} / ${maxSentEmails} Sent Emails</span>
            </div>
        </div>
      `));
    }).catch(() => {
      container.querySelector('.account-usage-skeleton').replaceWith(...parseFragment(`
          <h2 style="margin-top: 32px">Monthly consumption</h2>
          <p>${OOPS}</p>
        `));
    });

  nav.innerHTML = `<a href="/redirect?url=https://myaccount.google.com/?authuser=${user.email}" target="_blank" id="edit-account-button" class="button edit action primary">Edit account</a>`;

  container.querySelector('.account-details-skeleton').replaceWith(...parseFragment(`
    <div class="cards">
      <div class="box">
          <strong>Name</strong>
          <span title="${user.name}">${user.name}</span>
      </div>
      <div class="box">
          <strong>Email</strong>
          <span title="${user.email}">${user.email}</span>
      </div>
      <div class="box" id="current-plan-wrapper">
          <strong>Active Plan</strong>
          <span id="current-plan">Free Plan</span>
      </div>
    </div>
    <div id="toggle-auto-tour">
      <button id="toggle-auto-tour-button" class="button secondary action">Enable Auto Tour</button>
    </div>
  `));

  const toggleAutoTourButton = container.querySelector('#toggle-auto-tour-button');

  if (userSettings?.showAutoTour) {
    toggleAutoTourButton.textContent = 'Disable Auto Tour';
  }
  toggleAutoTourButton.setAttribute('data-loaded', 'true');

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
}
