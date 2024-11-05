import {
  OOPS, parseFragment, SCRIPT_API, KESTREL_ONE, getThumbnail,
  dateToRelativeSpan,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, confirmDialog, createDialog } from '../../scripts/dialogs.js';

export default async function renderSiteOverview({ container, nav, renderOptions }) {
  // TODO: if projectdetails are not required on most tabs, only request it here
  const { projectDetails, user, token } = renderOptions;

  container.innerHTML = renderSkeleton('site-overview');

  nav.innerHTML = `
    ${!projectDetails.darkAlleyProject ? `<a href="/redirect?url=${projectDetails.sidekickSetupUrl}" id="install-sidekick-button" title="Install the Chrome Plugin Sidekick" class="button action secondary sidekick" target="_blank">Install sidekick</a>` : ''}
    <a href="/redirect?url=${projectDetails.authoringGuideUrl}" id="guides-button" title="Open the Guide for the Template" class="button action secondary guides" target="_blank">Guides</a>
    <a href="/redirect?url=${projectDetails.driveUrl}${!projectDetails.darkAlleyProject ? `?authuser=${user.email}` : ''}" id="edit-button" title="Edit your Content" class="button action secondary edit" target="_blank">Edit</a>
    <a href="/redirect?url=${projectDetails.customLiveUrl}" id="open-button" title="Open your Website" class="button primary action open" target="_blank">Open</a>
  `;

  if (!projectDetails.darkAlleyProject) {
    nav.querySelector('#install-sidekick-button').onclick = () => {
      window?.zaraz?.track('click site sidekick');
    };
  }

  nav.querySelector('#edit-button').onclick = () => {
    window?.zaraz?.track('click site edit');
  };

  nav.querySelector('#open-button').onclick = () => {
    window?.zaraz?.track('click site open');
  };

  nav.querySelector('#guides-button').onclick = () => {
    window?.zaraz?.track('click site guides');
  };

  let lastUpdated = projectDetails.lastUpdated || projectDetails.createdAt;
  if (typeof lastUpdated === 'number') {
    lastUpdated = dateToRelativeSpan(lastUpdated);
  } else {
    lastUpdated = document.createElement('span');
    lastUpdated.textContent = 'N/A';
  }
  lastUpdated.classList.add('last-update');

  container.innerHTML = `
  <div class="project-container">
    <div class="cards">
      <div id="site-id" class="box">
        <strong>Site id</strong>
        <span title="${projectDetails.projectSlug}">${projectDetails.projectSlug}</span>
      </div>
      <div id="site-description" class="project-description card box">
        <strong>Site description</strong>
        <span class="project-description description span"></span>
        <button id="update-desc-button" title="Edit the Project Description" class="button secondary update-description action">Update</button>
      </div>
      <div id="last-updated" class="box">
        <strong>Last update</strong>
        ${lastUpdated.outerHTML}
      </div>
      <div id="site-template" class="box">
        <strong>Site template</strong>
        <span>${projectDetails.templateName}</span>
      </div>
    </div>
    <div class="project-thumbnail" data-src="https://${projectDetails.projectSlug}.${KESTREL_ONE}"></div>
  </div>

  <div class="danger-zone">
    <strong>Danger zone</strong>
    <p>Delete this project. Once you delete a project, there is no going back. Please be certain.</p>
    <button id="delete-site-button" title="Delete your Project" class="button delete action destructive">Delete</button>
  </div>`;

  const descriptionSpan = container.querySelector('.project-description.card .project-description.span');
  descriptionSpan.textContent = projectDetails.projectDescription || '';

  getThumbnail(container.querySelector('.project-thumbnail'));

  // MARK: update description
  container.querySelector('.update-description.action').onclick = async () => {
    window?.zaraz?.track('click update site description');

    const submit = parseFragment('<button form="update-project-form" type="submit" class="button primary action">Submit</button>');
    const content = parseFragment(`
          <div>
            <h3>Update Site Description</h3>
            
            <form id="update-project-form">
              <label>
                  <span>Description *</span>
                  <textarea required name="projectDescription" placeholder="Enter description here">${projectDetails.projectDescription || ''}</textarea>
              </label>
            </form>
          </div>
        `);

    const dialog = createDialog(content, [submit]);

    const form = document.getElementById('update-project-form');

    form.onsubmit = async (event) => {
      window.zaraz?.track('click project update');

      event.preventDefault();

      const body = Object.fromEntries(new FormData(form));
      dialog.setLoading(true, 'Updating description...');
      const response = await fetch(`${SCRIPT_API}/description/${projectDetails.projectSlug}`, {
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(body),
      }).catch(() => null);

      if (response?.ok) {
        dialog.renderDialog('<h3 class="centered-info">Description successfully updated</h3>');
        projectDetails.projectDescription = body.projectDescription;
        if (descriptionSpan) descriptionSpan.textContent = body.projectDescription;
      } else {
        await alertDialog(OOPS);
      }

      dialog.setLoading(false);
    };
  };

  // MARK: delete site
  container.querySelector('.delete').onclick = async () => {
    window?.zaraz?.track('click site delete');
    const block = container.closest('.site-details.block');

    block.classList.add('is-deleting');
    if (await confirmDialog('Are you sure you want to delete your site? (This can\'t be undone)')) {
      window?.zaraz?.track('click site delete submit');

      const reqDelete = await fetch(`${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'da-' : ''}delete/${projectDetails.projectSlug}`, {
        method: 'DELETE',
        headers: { authorization: `bearer ${token}` },
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
