import { OOPS, parseFragment, SCRIPT_API, KESTREL_ONE, getThumbnail, dateToRelativeSpan, safeText } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, createDialog } from '../../scripts/dialogs.js';
import renderCheckList from './renderCheckList.js';
import { showToast } from '../../scripts/toast.js';

export default async function renderSiteOverview({ container, nav, renderOptions, historyArray }) {
  const { projectDetails, user, token } = renderOptions;

  container.innerHTML = renderSkeleton('site-overview');

  // MARK: Extension tests
  const oldSidekickIds = ['ccfggkjabjahcjoljmgmklhpaccedipo', 'olciodlegapfmemadcjicljalmfmlehb', 'ahahnfffoakmmahloojpkmlkjjffnial'];
  const newSidekickId = 'igkmdomcgoebiipaifhmpfjhbjccggml';
  const newSidekickLink = '/redirect?url=https://chromewebstore.google.com/detail/aem-sidekick/igkmdomcgoebiipaifhmpfjhbjccggml';
  async function checkExtension(id) {
    return fetch(`chrome-extension://${id}/lib/polyfills.min.js`)
      .then(() => true)
      .catch(() => false);
  }

  const checkPromises = oldSidekickIds.map((id) => checkExtension(id));
  const [oldSidekickInstalled, newSidekickInstalled] = await Promise.all([
    await Promise.allSettled(checkPromises).then((results) => results.some((result) => result.status === 'fulfilled' && result.value === true)),
    checkExtension(newSidekickId),
  ]);

  /* eslint-disable */
  nav.innerHTML = `
    <a href="${newSidekickLink}" id="install-sidekick-button" title="Install the Chrome Plugin Sidekick" class="button action secondary sidekick" target="_blank" data-sidekick-installed="${newSidekickInstalled}">Install Sidekick</a>
    <a href="/redirect?url=${projectDetails.authoringGuideUrl}" id="guides-button" title="Open the Guide for the Template" class="button action secondary guides" target="_blank">Guides</a>
    <a href="/redirect?url=${projectDetails.driveUrl}${!projectDetails.darkAlleyProject ? `?authuser=${user.email}` : ''}" id="edit-button" title="Edit your Content" class="button action secondary edit" target="_blank">Edit</a>
  `;

  // Warn user they are using deprecated sidekick version
  if (oldSidekickInstalled && !newSidekickInstalled) {
    const dialogContent = parseFragment(
      `<div class="centered-info"><p>You have an old version of sidekick installed, which is no longer supported.</p><p>Please install the new version <a href="${newSidekickLink}" target="_blank">here.</a></p><p>We suggest you uninstall the outdated version as well.</p></div>`,
    );
    createDialog(dialogContent);
  }

  /* eslint-enable */

  if (!projectDetails.darkAlleyProject) {
    nav.querySelector('#install-sidekick-button').onclick = () => {
      window?.zaraz?.track('click site sidekick');
    };
  }

  nav.querySelector('#edit-button').onclick = () => {
    window?.zaraz?.track('click site edit');
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
        <img class="logo" src="${projectDetails.customPreviewUrl}/icons/logo.svg" alt="logo" loading="lazy" onerror="this.remove()">
        <strong>Site id</strong>
        <span title="${projectDetails.projectSlug}">${projectDetails.projectSlug}</span>
      </div>
      <div id="site-description" class="project-description card box">
        <strong>Site description</strong>
        <span class="project-description description span">${safeText(projectDetails.projectDescription || '')}</span>
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

  <div class="checklist-container">
  </div>
  `;

  const checklistContainer = container.querySelector('.checklist-container');
  const descriptionSpan = container.querySelector('.project-description.card .project-description.span');

  getThumbnail(container.querySelector('.project-thumbnail'));

  await renderCheckList({
    container: checklistContainer,
    nav,
    renderOptions,
    historyArray,
  });

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
        dialog.close();
        showToast('Description updated.');
        projectDetails.projectDescription = body.projectDescription;
        if (descriptionSpan) descriptionSpan.textContent = body.projectDescription;
      } else {
        dialog.setLoading(false);
        await alertDialog(OOPS);
      }
    };
  };
}
