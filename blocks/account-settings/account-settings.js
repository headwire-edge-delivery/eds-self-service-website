import { SCRIPT_API } from '../../scripts/scripts.js';
import { confirmDialog, createDialog } from '../../scripts/dialogs.js';

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
        <span>The following projects will <strong>not</strong> be deleted, but you will lose access:</span>
        <ul>
          ${projectsList.shared.map((projectSlug) => `<li>${projectSlug}</li>`).join('')}
        </ul>
      </p>
      `;
  return exclusiveHtml + sharedHtml;
}

function afterDeleteAccount() {
  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith('@@auth0')) {
      window.localStorage.removeItem(key);
    }
    if (key === 'sessionExpiration') {
      window.localStorage.removeItem(key);
    }
  });

  window.location.pathname = '/account-deleted';
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
    noProjectsDialog: '<h4 class="centered-info">You have no projects.</h4>',
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

// MARK: dialog setup
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

  let deleteAccountContent = `
    ${textLookup[lookupStr].dialog}
    <p>All projects that exclusively belong to this account will be deleted.</p>
    <p class="headwire-only">Dark Alley projects will not be deleted. They currently do not have any permissions/ownership.</p>
    ${generateProjectListHtml(projectsList)}
  `;

  const confirmButton = document.createElement('button');
  confirmButton.classList.add('action', 'button', 'destructive');
  confirmButton.textContent = textLookup[lookupStr].button;
  if (lookupStr === 'projects' && projectsList?.exclusive?.length === 0 && projectsList?.shared?.length === 0) {
    confirmButton.disabled = true;
    confirmButton.classList.add('is-disabled');
    deleteAccountContent = textLookup[lookupStr].noProjectsDialog;
  }

  const cancelButton = document.createElement('button');
  cancelButton.classList.add('action', 'button');
  cancelButton.textContent = 'Cancel';

  // used after request
  const closeButton = document.createElement('button');
  closeButton.classList.add('action', 'button', 'secondary');
  closeButton.textContent = 'Close';

  const deleteDialog = createDialog(deleteAccountContent, [cancelButton, confirmButton]);

  closeButton.addEventListener('click', () => {
    deleteDialog.close();
  });

  confirmButton.addEventListener('click', async () => {
    if (
      !(await confirmDialog(textLookup[lookupStr].confirmDialog))
    ) {
      deleteDialog.close();
      return;
    }

    if (deleteAccount) {
      window?.zaraz?.track('delete account confirmed');
    } else {
      window?.zaraz?.track('delete all sites confirmed');
    }
    // delete account
    deleteDialog.setLoading(true, textLookup[lookupStr].loading);

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

    if (deleteResponse.ok) {
      deleteDialog.renderDialog(textLookup[lookupStr].success, [closeButton]);
      if (deleteAccount) {
        // delete session
        // route to account deleted page
        deleteDialog.addEventListener('close', afterDeleteAccount);
        setTimeout(afterDeleteAccount, 5000);
      }
    } else {
      const errorText = await deleteResponse.text();
      deleteDialog.renderDialog(`<div class="centered-info">${errorText}</div>`, [closeButton]);
    }
    deleteDialog.setLoading(false);
  });

  cancelButton.addEventListener('click', () => {
    deleteDialog.close();
  });

  deleteAccountButton.classList.remove('loading');
}

// MARK: decorate
export default async function decorate(block) {
  block.innerHTML = /* html */ `
    <div class="section danger-zone">
      <h2>Danger Zone</h2>

      <ul class="action-list">
        <li><button id="delete-account-button" class="action button destructive">Delete Account</button></li>
        <li><button id="delete-all-projects-button" class="action button destructive">Delete All Projects</button></li>
      </ul>
    </div>
  `;

  const deleteAccountButton = block.querySelector('#delete-account-button');
  deleteAccountButton.addEventListener('click', async (event) => {
    window?.zaraz?.track('open delete account dialog');
    createDeleteDialog(event, true);
  });

  const deleteAllProjectsButton = block.querySelector('#delete-all-projects-button');
  deleteAllProjectsButton.addEventListener('click', async (event) => {
    window?.zaraz?.track('open delete all sites dialog');
    createDeleteDialog(event, false);
  });
}
