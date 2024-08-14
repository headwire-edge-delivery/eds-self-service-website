import { SCRIPT_API } from '../../scripts/scripts.js';

// MARK: helpers
function generateProjectListHtml(projectsList) {
  const exclusiveHtml = !projectsList?.exclusive?.length
    ? ''
    : `
  <p>
    <span><strong>The following projects will be deleted:</strong></span>
    <ul>
      ${projectsList.exclusive.map((projectSlug) => `<li>${projectSlug}</li>`).join('')}
    </ul>
  </p>
  `;
  const sharedHtml = !projectsList?.shared?.length
    ? ''
    : `
      <p>
        <span><strong>The following projects will <strong>not</strong> be deleted:</strong></span>
        <ul>
          ${projectsList.shared.map((projectSlug) => `<li>${projectSlug}</li>`).join('')}
        </ul>
      </p>
      `;
  return exclusiveHtml + sharedHtml;
}

// MARK: text lookup
const textLookup = {
  account: {
    dialog:
      '<h2>Delete Account?</h2><p class="warning">Are you want to delete your account and your projects? This action cannot be undone!</p>',
    button: 'Delete My Account',
    confirmDialog:
      '<h2>Last Chance!</h2><p class="warning">Are you <strong>ABSOLUTELY</strong> sure you want to delete your account?</p>',
    loading: 'Deleting Account and Projects...',
    endpoint: '/deleteAccount',
    success: '<div class="centered-info">Account Deleted</div>',
    error: '<div class="centered-info">Something went wrong. Please try again later. Contact support if the issue persists.</div>',
  },
  projects: {
    dialog:
    '<h2>Delete All Projects?</h2><p class="warning">Are you want to delete all of your projects? This action cannot be undone!</p>',
    button: 'Delete All Projects',
    confirmDialog:
    '<p class="warning">Are you <strong>ABSOLUTELY</strong> sure you want to delete all of your projects?</p>',
    loading: 'Deleting All Projects...',
    endpoint: '/deleteAllProjects',
    success: '<div class="centered-info">All Projects Deleted</div>',
    error: '<div class="centered-info">Something went wrong. Please try again later.</div>',
  },
};

// MARK: dialog
async function createDeleteDialog(event, deleteAccount = false) {
  const lookupStr = deleteAccount ? 'account' : 'projects';
  const deleteAccountButton = event.target;
  const authorization = `bearer ${await window.auth0Client.getTokenSilently()}`;

  deleteAccountButton.classList.add('loading');

  // get list of projects that will be deleted with the account
  const projectsList = await fetch(`${SCRIPT_API}/userControls/listProjectOwnership`, {
    headers: {
      authorization,
    },
  })
    .then((res) => res.json())
    .catch(() => null);
  console.log('projectsList:', projectsList);

  const deleteAccountContent = `
    ${textLookup[lookupStr].dialog}
    <p>All projects that exclusively belong to this account will be deleted.</p>
    <p class="headwire-only">Dark Alley projects will not be deleted. They currently do not have any permissions/ownership.</p>
    ${generateProjectListHtml(projectsList)}
  `;

  const confirmButton = document.createElement('button');
  confirmButton.classList.add('action', 'button', 'destructive');
  confirmButton.textContent = textLookup[lookupStr].button;

  const cancelButton = document.createElement('button');
  cancelButton.classList.add('action', 'button');
  cancelButton.textContent = 'Cancel';

  // used after request
  const closeButton = document.createElement('button');
  closeButton.classList.add('action', 'button', 'secondary');
  closeButton.textContent = 'Close';

  const deleteAccountDialog = window.createDialog(deleteAccountContent, [cancelButton, confirmButton]);

  closeButton.addEventListener('click', () => {
    deleteAccountDialog.close();
  });

  confirmButton.addEventListener('click', async () => {
    if (
      !(await window.confirmDialog(textLookup[lookupStr].confirmDialog))
    ) {
      deleteAccountDialog.close();
      return;
    }
    // delete account
    deleteAccountDialog.setLoading(true, textLookup[lookupStr].loading);
    // TODO: delete account request

    const deleteResponse = await fetch(`${SCRIPT_API}/userControls/${textLookup[lookupStr].endpoint}`, {
      body: JSON.stringify({
        projectsToDelete: projectsList?.exclusive,
      }),
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        authorization,
      },
    });

    deleteAccountDialog.setLoading(false);
    if (deleteResponse.ok) {
      deleteAccountDialog.renderDialog(textLookup[lookupStr].success, [closeButton]);
    } else {
      deleteAccountDialog.renderDialog(textLookup[lookupStr].error, [closeButton]);
    }
  });

  cancelButton.addEventListener('click', () => {
    deleteAccountDialog.close();
  });

  deleteAccountButton.classList.remove('loading');
}

// MARK: decorate
export default async function decorate(block) {
  const authorization = `bearer ${await window.auth0Client.getTokenSilently()}`;
  block.innerHTML = /* html */ `
    <div class="section">
      <h2>Danger Zone</h2>

      <ul class="action-list">
        <li><button id="delete-account-button" class="action primary button destructive">Delete Account</button></li>
        <li><button id="delete-all-projects-button" class="action primary button destructive">Delete All Projects</button></li>
      </ul>
    </div>
  `;

  const deleteAccountButton = block.querySelector('#delete-account-button');
  deleteAccountButton.addEventListener('click', async (event) => createDeleteDialog(event, true));

  const deleteAllProjectsButton = block.querySelector('#delete-all-projects-button');
  deleteAllProjectsButton.addEventListener('click', async (event) => createDeleteDialog(event, false));
}
