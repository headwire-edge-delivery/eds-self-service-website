import { completeChecklistItem, OOPS, parseFragment, SCRIPT_API, slugifyFilename } from '../../scripts/scripts.js';
import { alertDialog, confirmDialog, createDialog } from '../../scripts/dialogs.js';
import { showToast } from '../../scripts/toast.js';

const protectedBlocks = {
  header: true,
  footer: true,
};

const BLOCK_ICON_LOOKUP = {
  default: 'table',
  screenshot: 'fullscreen',
  article: 'article',
  aside: 'ad-placement',
  breadcrumbs: 'breadcrumbs',
  header: 'breadcrumbs',
  calendar: 'calendar',
  schedule: 'calendar',
  cards: 'card',
  carousel: 'carousel',
  columns: 'columns',
  download: 'download',
  contact: 'email',
  form: 'form',
  'contact-form': 'form',
  gallery: 'images',
  'grid-gallery': 'images',
  fragment: 'fragment',
  hero: 'homepage',
  destinations: 'location',
  footer: 'section-after',
  blog: 'text',
  embed: 'webpage',
  'article-list': 'list',
  tabs: 'add-to',
  search: 'search',
};

const iconBase64Prefix = 'data:image/svg+xml;base64,';

export function manageGoogleCalendarLink(calendarId, nav, onlyRemove = false) {
  nav.querySelectorAll('.google-calendar-link').forEach((link) => link.remove());
  if (onlyRemove) return;
  nav.insertAdjacentHTML(
    'afterbegin',
    `<a class="button action secondary google-calendar-link" target="_blank" id="google-calendar"
    href="/redirect?url=https://calendar.google.com/calendar/render?cid=${calendarId}">Google Calendar</a>`,
  );
}

function validateFileType(acceptString, fileName) {
  const fileAcceptArray = acceptString.split(',');
  const fileExtension = fileName.split('.').pop();
  return fileAcceptArray.includes(`.${fileExtension}`);
}

export function addIconDialogSetup({
  nameOverride,
  replaceIconItem,
  authHeaders,
  siteSlug,
  itemList,
  fileAccept = '.svg',
  titleText = 'Add icon',
  uploadEndpoint = `${SCRIPT_API}/icons/${siteSlug}`,
  defaultSrc,
  returnElements = false,
}) {
  const isFavicon = titleText === 'Favicon';
  window?.zaraz?.track(`click site ${isFavicon ? 'favicon' : 'icon'} add`);

  const formId = `${nameOverride ? 'update' : 'add'}-${isFavicon ? 'favicon' : 'icon'}-form`;
  const submit = parseFragment(`<button form="${formId}" type="submit" class="button primary action">Save</button>`);
  const content = parseFragment(`
    <div>
      <h3>${titleText}</h3>
      <form id="${formId}">
        <p>${isFavicon ? 'Don\'t have an .ico file yet? You can convert your image to a .ico file <a href="/redirect?url=https://www.icoconverter.com/" target="_blank">here</a>.' : 'Upload a new SVG icon.'}</p>
        <label>
          <span>File *</span>
          <input type="file" accept="${fileAccept}" required/>
        </label>
        <div class="preview">${defaultSrc ? `<img alt="favicon" src="${defaultSrc}" loading="lazy" />` : ''}</div>
      </form>
    </div>
  `);

  const input = content.querySelector('input[type="file"]');
  const preview = content.querySelector('.preview');

  let file = null;
  let fileAsBase64 = null;
  input.onchange = (event) => {
    [file] = event.target.files;
    if (file) {
      if (!validateFileType(fileAccept, file.name.toLowerCase())) {
        preview.innerHTML = 'Please select a valid file!';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        fileAsBase64 = e.target.result;
        img.src = fileAsBase64;
        img.alt = file.name;
        preview.innerHTML = '';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = 'Please select a file';
    }
  };

  if (returnElements) {
    return { content, submit };
  }

  const dialog = createDialog(content, [submit]);
  const form = document.getElementById(formId);

  form.onsubmit = async (event) => {
    event.preventDefault();
    window?.zaraz?.track(`click site ${isFavicon ? 'favicon' : 'icon'} add submit`);

    if (!file) {
      await alertDialog('Please select a file');
      return;
    }

    if (!validateFileType(fileAccept, file.name)) {
      await alertDialog('Please select a valid file!');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    dialog.setLoading(true, nameOverride ? 'Replacing Icon...' : 'Adding Icon...');
    const addRequest = await fetch(`${uploadEndpoint}${nameOverride ? `?nameOverride=${nameOverride}` : ''}`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
    }).catch(() => null);

    if (addRequest?.ok) {
      if (nameOverride === 'logo.svg') completeChecklistItem(siteSlug, 'logoAdded');
      if (isFavicon) completeChecklistItem(siteSlug, 'faviconAdded');
      dialog.close();
      if (replaceIconItem) {
        const iconImage = replaceIconItem.tagName === 'IMG' ? replaceIconItem : replaceIconItem.querySelector('img');
        iconImage.src = fileAsBase64;
        showToast('Icon succesfully updated.');
      } else {
        itemList?.addItem({ name: file.name, base64: fileAsBase64 });
        showToast('Icon added.');
      }
    } else {
      dialog.setLoading(false);
      await alertDialog("Something went wrong! Make sure this icon doesn't already exist.");
    }
  };
  return dialog;
}

function blockIconDialogPreview({ base64, iconUrl }) {
  if (!base64 && !iconUrl) return '';
  const src = base64 ? (base64.startsWith(iconBase64Prefix) ? base64 : iconBase64Prefix + base64) : iconUrl;
  return `<div class="preview"><img class="icon-display" src="${src}" alt="icon display" /></div>`;
}

export function blockIconDialogSetup({ name, deleteWarning, projectDetails, authHeaders, isIcon = false, base64, iconUrl, showBlockScreenshots, siteSlug, container, nav }) {
  window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} settings`);

  const formId = `change-${isIcon ? 'icon' : 'block'}-form`;
  const content = parseFragment(`
    <div>
      <h3>${name} ${isIcon ? 'Icon' : 'Block'}</h3>
      <form id="${formId}">
        <p>${deleteWarning || ''}</p>
        ${blockIconDialogPreview({ base64, iconUrl })}
        <div class="block-preview"></div>
      </form>
    </div>
  `);

  if (showBlockScreenshots) {
    fetch(`${SCRIPT_API}/blockScreenshots/${projectDetails.projectSlug}/${name}`)
      .then((response) => response.json())
      .then((data) => {
        const blockPreview = content.querySelector('.block-preview');
        data.forEach((screenshot) => {
          blockPreview.insertAdjacentHTML(
            'beforeend',
            `<img src="http://main--${projectDetails.templateSlug}--headwire-self-service-templates.aem.live/${screenshot.substring(2)}" alt="screenshot"/>`,
          );
        });
      });
  }

  const buttonList = [];
  if (isIcon) {
    const replaceButton = parseFragment('<button class="button action primary replace">Replace</button>');
    buttonList.push(replaceButton);

    const replaceIconItem = container.querySelector(`[data-icon-name="${name}"]`);

    replaceButton.onclick = () => {
      const dialog = replaceButton.closest('dialog');
      const { content: newContent, submit } = addIconDialogSetup({
        nameOverride: name,
        authHeaders,
        siteSlug,
        replaceIconItem,
        titleText: `Replace ${name}`,
        returnElements: true,
      });

      dialog.renderDialog(newContent, [submit]);

      const form = newContent.querySelector('form');
      form.onsubmit = async (event) => {
        event.preventDefault();
        window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} add submit`);

        const fileInput = newContent.querySelector('input[type="file"]');
        const file = fileInput?.files?.[0];
        if (!file) {
          await alertDialog('Please select a file');
          return;
        }

        dialog.setLoading(true, 'Replacing Icon...');
        const formData = new FormData();
        formData.append('file', file);

        const addRequest = await fetch(`${SCRIPT_API}/icons/${siteSlug}?nameOverride=${name}`, {
          method: 'POST',
          body: formData,
          headers: authHeaders,
        }).catch(() => null);

        if (addRequest?.ok) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const iconImage = replaceIconItem.tagName === 'IMG' ? replaceIconItem : replaceIconItem.querySelector('img');
            iconImage.src = e.target.result;
            showToast('Icon succesfully updated.');
            dialog.close();
          };
          reader.readAsDataURL(file);
        } else {
          dialog.setLoading(false);
          await alertDialog("Something went wrong! Make sure this icon doesn't already exist.");
        }
      };
    };
  }

  const submit = parseFragment(`<button type="submit" form="${formId}" class="button action destructive">Delete</button>`);
  buttonList.push(submit);
  if (protectedBlocks[name]) submit.disabled = true;

  const dialog = createDialog(content, buttonList);
  const form = document.getElementById(formId);

  form.onsubmit = async (event) => {
    event.preventDefault();
    window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} delete submit`);

    submit.disabled = true;
    dialog.setLoading(true, 'Deleting...');

    const delResponse = await fetch(`${SCRIPT_API}/${isIcon ? 'icons' : 'blocks'}/${projectDetails.projectSlug}/${name}`, { method: 'DELETE', headers: authHeaders }).catch(
      () => null,
    );

    if (delResponse?.ok) {
      dialog.close();
      showToast(`${isIcon ? 'Icon' : 'Block'} "${name}" deleted.`);
      container.querySelectorAll(`li[data-block-name="${name}"], li[data-icon-name="${name}"]`).forEach((item) => item.remove());
      if (name === 'schedule') manageGoogleCalendarLink(null, nav, true);
    } else {
      submit.disabled = false;
      dialog.setLoading(false);
      await alertDialog(OOPS);
    }
  };
}

// MARK: block dialog setup
function addBlockDialogSetup({ projectDetails, authHeaders, itemList, nav }) {
  window?.zaraz?.track('click site block add');

  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = '<h3 class="centered-info" >Loading available blocks...</h3>';
  const dialog = createDialog(dialogContent);

  Promise.all([
    fetch(`${SCRIPT_API}/compatibleBlocks/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()),
    fetch(`${SCRIPT_API}/blocks/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()),
  ])
    .then(([compatibleBlocks, currentBlocks]) => {
      const data = compatibleBlocks.filter((item) => !currentBlocks.some((currentBlocksItem) => currentBlocksItem.name === item.name));

      if (data.length === 0) {
        dialog.renderDialog('<h3 class="centered-info" >No new blocks available</h3>');
        return;
      }

      const content = parseFragment(`
      <div>
        <h3>Add block</h3>
        <form id="add-block-form">
          <select class="button secondary action">
          ${data.map((blockOption) => `<option data-block-create-info="${blockOption.createInfo || ''}" value="${blockOption.name}">${blockOption.name}</option>`).join('')}
          </select>
          <p class="block-info"></p>
          <div class="block-preview"></div>
        </form>
      </div>
    `);

      const select = content.querySelector('select');
      const blockInfo = content.querySelector('.block-info');
      const blockPreview = content.querySelector('.block-preview');

      select.onchange = () => {
        blockInfo.innerText = select.querySelector(`option[value="${select.value}"]`).dataset.blockCreateInfo;

        fetch(`${SCRIPT_API}/blockScreenshots/${projectDetails.projectSlug}/${select.value}`)
          .then((response) => response.json())
          .then((screenshotData) => {
            blockPreview.innerHTML = '';
            screenshotData.forEach((screenshot) => {
              blockPreview.insertAdjacentHTML(
                'beforeend',
                `
              <img src="http://main--${projectDetails.templateSlug}--headwire-self-service-templates.aem.live/${screenshot.substring(2)}" alt="screenshot"/>
            `,
              );
            });
          });
      };
      select.onchange();

      const submit = parseFragment(`
      <button type="submit" form="add-block-form" class="button action primary">Add</button>
    `);

      dialog.renderDialog(content, [submit]);

      const form = document.getElementById('add-block-form');

      form.onsubmit = async (event) => {
        event.preventDefault();

        window?.zaraz?.track('click site block add submit');

        if (!select.value) {
          await alertDialog('Please select a block');
          return;
        }

        dialog.setLoading(true, 'Adding Block...');

        const addRequest = await fetch(`${SCRIPT_API}/blocks/${projectDetails.projectSlug}/${select.value}`, {
          method: 'POST',
          headers: authHeaders,
        }).catch(() => null);

        if (addRequest?.ok) {
          const addRequestData = await addRequest.json().catch(() => ({}));
          dialog.setLoading(false);

          const message = `Block "${select.value}" added.`;
          if (addRequestData.calendarId) {
            const calendarLink = parseFragment(`
            <a class="button action primary" target="_blank" href="/redirect?url=https://calendar.google.com/calendar/render?cid=${addRequestData.calendarId}">Google Calendar</a>
          `);

            manageGoogleCalendarLink(addRequestData.calendarId, nav);
            dialog.renderDialog(`<h3 class="centered-info" >${message}</h3>`, [calendarLink]);
          } else {
            dialog.close();
            showToast(message);
          }

          itemList.addItem({ name: select.value });
        } else {
          await alertDialog(OOPS);
        }
      };
    })
    .catch(() => {
      dialogContent.innerHTML = '<h3 class="centered-info" >Failed to load available blocks</h3>';
    });
}

// MARK: block list
export function renderBlocksList({ container, nav, blocksListData, projectDetails, authHeaders, siteSlug }) {
  const blocksList = container.querySelector('.blocks');
  if (!blocksList) {
    blocksList.innerHTML = '<p class="centered-info">Failed to load blocks</p>';
    return;
  }
  container.querySelector('.add-block').onclick = () => addBlockDialogSetup({ projectDetails, authHeaders, itemList: blocksList, nav });

  blocksList.innerHTML = '';
  blocksList.addItem = ({ name, deleteWarning, createInfo }) => {
    const li = document.createElement('li');
    li.dataset.blockName = name;
    li.setAttribute('data-protected-block', protectedBlocks[name] || '');
    li.dataset.createInfo = createInfo || '';
    li.dataset.deleteWarning = deleteWarning || '';
    li.tabIndex = 0;
    li.classList.add('button', 'secondary', 'action');

    const blockIcon = document.createElement('img');
    blockIcon.src = `/icons/block-icons/${BLOCK_ICON_LOOKUP[name] || BLOCK_ICON_LOOKUP.default}.svg`;
    blockIcon.alt = `${name} icon`;
    blockIcon.classList.add('block-icon');
    const blockName = document.createElement('span');
    blockName.innerText = name;
    li.append(blockIcon, blockName);
    blocksList.querySelector('p.no-items')?.remove();

    li.onclick = () =>
      blockIconDialogSetup({
        name,
        deleteWarning,
        projectDetails,
        siteSlug,
        authHeaders,
        showBlockScreenshots: true,
        container,
        nav,
      });
    blocksList.appendChild(li);
  };

  if (blocksListData?.length) {
    blocksListData.forEach((item) => blocksList.addItem(item));
  } else {
    blocksList.innerHTML = '<p class="no-items">No blocks found.</p>';
  }
}

// MARK: icon list
export function renderIconsList({ container, nav, iconsListData, projectDetails, authHeaders, siteSlug }) {
  const iconsList = container.querySelector('.icons');
  container.querySelector('.add-icon').onclick = () => addIconDialogSetup({ siteSlug, authHeaders, itemList: iconsList });

  iconsList.innerHTML = '';
  iconsList.addItem = ({ name, path, base64 }) => {
    // eslint-disable-next-line
    name = slugifyFilename(name); // normally fixed by github upon upload, we do it here to make sure path matches
    const li = document.createElement('li');
    li.dataset.iconName = name;
    const iconName = document.createElement('span');
    iconName.innerText = name;
    li.append(iconName);

    if (path || base64) {
      const iconImage = document.createElement('img');
      if (base64) {
        iconImage.src = base64.startsWith(iconBase64Prefix) ? base64 : iconBase64Prefix + base64;
      } else {
        iconImage.src = `${projectDetails.customPreviewUrl}/${path}`;
      }
      iconImage.classList.add('icon-preview');
      li.prepend(iconImage);
    }

    const settingsButton = document.createElement('button');
    settingsButton.classList.add('button', 'secondary', 'icon-settings', 'action');
    settingsButton.innerText = 'Update';
    settingsButton.title = 'Update Icon';

    const copyButton = document.createElement('button');
    copyButton.classList.add('button', 'secondary', 'copy-button', 'action');
    copyButton.innerHTML = `
      <img loading="lazy" alt="Copied" hidden src="/icons/check-mark.svg">
      <span>Copy</span>
    `;
    copyButton.title = 'Copy Icon';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    buttonsContainer.append(settingsButton, copyButton);
    li.append(buttonsContainer);

    settingsButton.onclick = () =>
      blockIconDialogSetup({
        name,
        projectDetails,
        siteSlug,
        authHeaders,
        isIcon: true,
        base64: base64 || undefined,
        iconUrl: path ? `${projectDetails.customPreviewUrl}/${path}` : undefined,
        container,
        nav,
      });
    iconsList.append(li);
    iconsList.querySelector('p.no-items')?.remove();

    copyButton.onclick = () => {
      window?.zaraz?.track('click site icon copy');

      // copy icon as doc compatible string (without .svg)
      navigator.clipboard.writeText(`:${name.replace(/\.[^/.]+$/, '')}:`);
      const icon = copyButton.querySelector('img');
      const text = copyButton.querySelector('span');

      text.hidden = true;
      icon.hidden = false;
      setTimeout(() => {
        text.hidden = false;
        icon.hidden = true;
      }, 2000);
    };
  };

  if (iconsListData?.length) {
    iconsListData.forEach((item) => iconsList.addItem(item));
  } else {
    iconsList.innerHTML = '<p class="no-items">No icons found.</p>';
  }
}

// MARK: project updates
export async function renderUpdatesSection(div, { projectDetails, authHeaders, versionInfo }) {
  div.innerHTML = '';
  const endpoint = `${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daUpdateProject' : 'updateProject'}/`;
  const versionInfoData =
    versionInfo ||
    (await fetch(`${endpoint}checkUpdates/${projectDetails.projectSlug}`, { headers: authHeaders })
      .then((res) => res.json())
      .catch(() => null));

  if (!versionInfoData) {
    div.innerHTML = '<h3>Could not get update information.</h3>';
    return;
  }

  if (versionInfoData.updateAvailable) {
    div.innerHTML = `
      <h3>A new version is available!</h3>
      ${versionInfoData.updateLevel === 'major' ? '<p><strong><span>This version is a major update. It is possible some blocks will need to be updated by authors.</span></strong></p>' : ''}
    `;

    const updateButton = parseFragment(`
      <button class="button action primary update-button">Update</button>
    `);

    updateButton.onclick = async () => {
      const dialogContent = parseFragment(`
        <div>
          <h3>Update Project</h3>
          <p>Are you sure you want to update this project? This will take a short while.</p>
          ${versionInfoData.updateLevel === 'major' ? '<p class="warning"><strong>This is a major update! It is possible some blocks will need to be updated by authors.</strong></p>' : ''}
          <p>This action can be undone, but changes to icons, blocks, and site theme made after an update, will also be reverted when undone.</p>
        </div>
      `);

      const confirmUpdateButton = parseFragment(`
        <button class="button action secondary update-button">Update</button>
      `);

      const cancelButton = parseFragment(`
        <button class="button action primary update-button">Cancel</button>
      `);

      const projectUpdateDialog = createDialog(dialogContent, [confirmUpdateButton, cancelButton]);

      confirmUpdateButton.onclick = async () => {
        window?.zaraz?.track('did site update');

        projectUpdateDialog.dataset.loadingText = 'Updating...';
        projectUpdateDialog.setLoading(true);

        const updateResponse = await fetch(`${endpoint}update/${projectDetails.projectSlug}`, { headers: authHeaders }).catch(() => null);
        if (updateResponse?.ok) {
          projectUpdateDialog.close();
          showToast('Project updated.');

          // replace update button
          div.innerHTML = '<h3>Your project is up-to-date!</h3>';
        } else {
          projectUpdateDialog.setLoading(false);
          await alertDialog(OOPS);
        }
      };

      cancelButton.onclick = () => {
        const dialog = cancelButton.closest('dialog');
        dialog.close();
      };
    };

    div.append(updateButton);
  } else {
    div.innerHTML += '<h3>No updates available</h3>';
  }

  div.removeAttribute('aria-label');
}

// MARK: revert updates
export async function renderPrevUpdatesSection(div, { projectDetails, authHeaders, authHeadersWithBody, rerenderUpdatesSection, updateInfoDiv }) {
  div.innerHTML = '<h3>Previously applied updates</h3>';
  const endpoint = `${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daUpdateProject' : 'updateProject'}/`;

  const prevUpdatesButton = document.createElement('button');
  prevUpdatesButton.classList.add('button', 'action', 'secondary', 'update-button');
  prevUpdatesButton.innerText = 'Revert to previous version';
  prevUpdatesButton.onclick = async () => {
    let content = parseFragment(`
      <div>
        <h3>Revert Project</h3>
        <h4 class="centered-info">Loading previous updates...</h4>
      </div>
    `);
    const revertUpdateDialog = createDialog(content, []);

    const updateList = await fetch(`${endpoint}appliedUpdates/${projectDetails.projectSlug}`, { headers: authHeaders })
      .then((res) => res.json())
      .catch(() => null);
    if (updateList.length > 0) {
      content = parseFragment(`
        <div>
            <h3>Revert Updates to Project</h3>
            <form id="revert-form">
              <p class="warning">
                Keep in mind, any changes made on the options and theme pages after an update will
                <strong>also</strong>
                be reverted! <strong>This action cannot be undone!</strong>
              </p>
              <ul class="applied-update-list">
                ${updateList
                  .map(
                    (update) =>
                      `<li><label><input required type="radio" name="update" data-version="${update.version}" value="${update.sha}"><span>Version: <strong>${
                        update.version
                      }</strong></span><span>Updated on: <strong>${new Date(update.date).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}</strong></span></label></li>`,
                  )
                  .join('')}
              </ul>
            </form>
        </div>
      `);

      const submit = parseFragment(`
        <button type="submit" form="revert-form" class="button action secondary update-action" disabled>Undo Update</button>
      `);

      revertUpdateDialog.renderDialog(content, [submit]);

      const revertForm = document.getElementById('revert-form');

      let currentSelectedUpdate = null;
      revertForm.onchange = (event) => {
        currentSelectedUpdate = event.target.dataset.version;
        if (currentSelectedUpdate) {
          submit.disabled = null;
        }
      };

      revertForm.onsubmit = async (event) => {
        event.preventDefault();
        window?.zaraz?.track('did site update revert');

        if (
          await confirmDialog(`
            <div>
                <h3>Are you sure you want to revert ${currentSelectedUpdate ? `the ${currentSelectedUpdate}` : 'to before a previous'} update?</h3>
                <p class="error"><strong>any changes made on the options and theme pages after an update will also be reverted!</strong></p>
                <p class="error">This action cannot be undone!</p>
            </div>`)
        ) {
          revertUpdateDialog.dataset.loadingText = 'Reverting to previous version...';
          revertUpdateDialog.setLoading(true);

          const formData = new FormData(revertForm);
          const revertUpdateResponse = await fetch(`${endpoint}revert/${projectDetails.projectSlug}`, {
            method: 'POST',
            headers: authHeadersWithBody,
            body: JSON.stringify({ sha: formData.get('update') }),
          }).catch(() => null);

          if (revertUpdateResponse?.ok) {
            revertUpdateDialog.close();
            showToast('Project reverted.');
            // rerender update section.
            // Should say an update is available as one has just been reverted
            rerenderUpdatesSection(updateInfoDiv, { projectDetails, authHeaders });
          } else {
            revertUpdateDialog.setLoading(false);
            await alertDialog(OOPS);
          }
        }
      };
    } else if (updateList.length === 0) {
      revertUpdateDialog.renderDialog(`
        <h3>Revert Project</h3><h4 class="centered-info">No updates to revert to.</h4>
      `);
    } else {
      revertUpdateDialog.renderDialog(`
        <h3>Revert Project</h3><h4 class="centered-info">Could not get update information.</h4>
      `);
    }
  };
  div.append(prevUpdatesButton);
}

// MARK: Danger Zone
export async function renderDangerZone({ container, renderOptions }) {
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
    if (await confirmDialog("Are you sure you want to delete your site? (This can't be undone)")) {
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
