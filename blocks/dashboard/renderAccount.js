import {
  getUserSettings, renderSkeleton,
  SCRIPT_API,
  updateUserSettings,
} from '../../scripts/scripts.js';

export default async function renderAccount({ container, nav }) {
  container.insertAdjacentHTML('afterbegin', renderSkeleton('account'));

  const [userSettings, user] = await Promise.all([
    getUserSettings(SCRIPT_API),
    window.auth0Client.getUser(),
  ]);

  nav.innerHTML = `<a href="/redirect?url=https://myaccount.google.com/?authuser=${user.email}" target="_blank" id="edit-account-button" class="button edit action primary">Edit account</a>`;

  container.insertAdjacentHTML(
    'afterbegin',
    `
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
        <strong>Plan</strong>
        <span id="current-plan">Free</span>
    </div>
    </div>
    <div id="toggle-auto-tour">
    <button id="toggle-auto-tour-button" class="button secondary action">Enable Auto Tour</button>
  </div>
  `,
  );

  container.querySelector('[aria-label="loading"]').remove();

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
