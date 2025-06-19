import { getUserSettings, OOPS, parseFragment, SCRIPT_API, updateUserSettings, waitForAuthenticated } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { createRedirectUrl } from '../../scripts/utils.js';

export default async function renderAccount({ container, nav }) {
  container.insertAdjacentHTML('afterbegin', renderSkeleton('account'));

  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  const [userSettings, user] = await Promise.all([getUserSettings(SCRIPT_API), window.auth0Client.getUser()]);

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

      container.querySelector('.account-usage-skeleton').replaceWith(
        ...parseFragment(`
        <h2 style="margin-top: 32px">Monthly consumption</h2>
        <div id="pv-usage" class="progress-bar">
            <div class="progress-bar-fill" style="width:${pageViewsPercentage}%"></div>
            <div class="progress-bar-text">
              <span>${pageViews} / ${maxPageViews} Page Views</span>
            </div>
        </div>
        <div id="se-usage" class="progress-bar">
            <div class="progress-bar-fill" style="width:${sentEmailsPercentage}%"></div>
            <div class="progress-bar-text">
              <span>${sentEmails} / ${maxSentEmails} Sent Emails</span>
            </div>
        </div>
      `),
      );
    })
    .catch(() => {
      container.querySelector('.account-usage-skeleton').replaceWith(
        ...parseFragment(`
          <h2 style="margin-top: 32px">Monthly consumption</h2>
          <p>${OOPS}</p>
        `),
      );
    });

  nav.innerHTML = `
    <button id="toggle-auto-tour-button" class="button secondary action">${userSettings?.showAutoTour ? 'Disable Auto Tour' : 'Enable Auto Tour'}</button>
    <a href="${createRedirectUrl('https://myaccount.google.com/?authuser=' + user.email)}" target="_blank" id="edit-account-button" class="button edit action primary">Edit account</a>
  `;

  const toggleAutoTourButton = document.getElementById('toggle-auto-tour-button');

  toggleAutoTourButton.onclick = async () => {
    toggleAutoTourButton.classList.add('loading');
    const showAutoTour = !userSettings.showAutoTour;
    const success = await updateUserSettings({ showAutoTour });
    if (success) {
      userSettings.showAutoTour = showAutoTour;
      toggleAutoTourButton.textContent = userSettings.showAutoTour ? 'Disable Auto Tour' : 'Enable Auto Tour';
      document.dispatchEvent(new CustomEvent('user:autotour', { detail: { showAutoTour } }));
    }
    toggleAutoTourButton.classList.remove('loading');
  };

  document.addEventListener('user:autotour', ({ detail }) => {
    userSettings.showAutoTour = detail.showAutoTour;
    toggleAutoTourButton.textContent = userSettings.showAutoTour ? 'Disable Auto Tour' : 'Enable Auto Tour';
  });

  container.querySelector('.account-details-skeleton').replaceWith(
    parseFragment(`
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
  `),
  );
}
