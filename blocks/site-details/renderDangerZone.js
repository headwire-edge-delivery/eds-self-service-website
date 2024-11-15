import { alertDialog, confirmDialog } from '../../scripts/dialogs.js';
import { OOPS, SCRIPT_API } from '../../scripts/scripts.js';

export default async function renderDangerZone({ container, renderOptions }) {
  container.innerHTML = `
    <div class="danger-zone">
      <strong>Danger zone</strong>
      <p>Delete this project. Once you delete a project, there is no going back. Please be certain.</p>
      <button id="delete-site-button" title="Delete your Project" class="button delete action destructive">Delete</button>
    </div>
  `;

  container.querySelector('#delete-site-button').onclick = async () => {
    window?.zaraz?.track('click site delete');
    const block = container.closest('.site-details.block');

    block.classList.add('is-deleting');
    if (await confirmDialog('Are you sure you want to delete your site? (This can\'t be undone)')) {
      window?.zaraz?.track('click site delete submit');

      const reqDelete = await fetch(`${SCRIPT_API}/${renderOptions.projectDetails.darkAlleyProject ? 'da-' : ''}delete/${renderOptions.projectDetails.projectSlug}`, {
        method: 'DELETE',
        headers: { authorization: `bearer ${renderOptions.token}` },
      }).catch(() => null);
      if (reqDelete?.ok) {
        window.location.href = '/dashboard/sites';
      } else {
        await alertDialog(OOPS);
        block.classList.remove('is-deleting');
      }
    } else {
      block.classList.remove('is-deleting');
    }
  };
}
