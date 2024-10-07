import {
  getUserSettings,
  SCRIPT_API,
  updateUserSettings,
  waitForAuthenticated,
} from '../../scripts/scripts.js';

export default async function renderAccount({ container, nav }) {
  await waitForAuthenticated();
  const user = await window.auth0Client.getUser();
  nav.innerHTML = `<a href="https://myaccount.google.com/?authuser=${user.email}" target="_blank" id="edit-account-button" class="button edit action primary">Edit account</a>`;

  container.insertAdjacentHTML(
    'afterbegin',
    `
  <div class="account-details">
    <div>
        <strong>Name</strong>
        <span title="${user.name}">${user.name}</span>
    </div>
    <div>
        <strong>Email</strong>
        <span title="${user.email}">${user.email}</span>
    </div>
    <div>
        <strong>Last update</strong>
        <span>${new Date(user.updated_at).toLocaleDateString()}</span>
    </div>
    <div id="current-plan-wrapper">
        <strong>Plan</strong>
        <span id="current-plan">Free</span>
    </div>
    </div>
    <div id="toggle-auto-tour">
    <button id="toggle-auto-tour-button" class="button secondary action">Enable Auto Tour</button>
  </div>
  `,
  );

  const userSettings = await getUserSettings(SCRIPT_API);
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
