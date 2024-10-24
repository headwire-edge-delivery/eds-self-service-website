import { OOPS, parseFragment, SCRIPT_API } from '../../scripts/scripts.js';

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

// MARK: google calendar link
export function manageGoogleCalendarLink(calendarId, nav, onlyRemove = false) {
  // resetting in case
  nav.querySelectorAll('.google-calendar-link').forEach((link) => link.remove());
  if (onlyRemove) return;
  nav.insertAdjacentHTML(
    'afterbegin',
    `<a class="button action secondary google-calendar-link" target="_blank" id="google-calendar" href="/redirect?url=https://calendar.google.com/calendar/render?cid=${calendarId}">Google Calendar</a>`,
  );
}

// MARK: add Icon dialog
function validateFileType(acceptString, fileName) {
  const fileAcceptArray = acceptString.split(',');
  const fileExtension = fileName.split('.').pop();
  return fileAcceptArray.includes(`.${fileExtension}`);
}

export function addIconDialogSetup({
  nameOverride, replaceIconItem,
  authHeaders, siteSlug, itemList, fileAccept = '.svg', titleText = 'Add icon',
  uploadEndpoint = `${SCRIPT_API}/icons/${siteSlug}`,
  defaultSrc,
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
      if (!validateFileType(fileAccept, file.name)) {
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

  const dialog = window.createDialog(content, [submit]);

  const form = document.getElementById(formId);
  form.onsubmit = async (event) => {
    event.preventDefault();

    window?.zaraz?.track(`click site ${isFavicon ? 'favicon' : 'icon'} add submit`);

    if (!file) {
      await window.alertDialog('Please select a file');
      return;
    }

    if (!validateFileType(fileAccept, file.name)) {
      await window.alertDialog('Please select a valid file!');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    dialog.setLoading(true, 'Adding Icon...');
    const addRequest = await fetch(uploadEndpoint + (nameOverride ? `?nameOverride=${nameOverride}` : ''), {
      method: 'POST',
      body: formData,
      headers: authHeaders,
    }).catch(() => null);

    if (addRequest?.ok) {
      dialog.renderDialog('<h3 class="centered-info">Icon added!</h3>');
      if (replaceIconItem) {
        const iconImage = replaceIconItem.tagName === 'IMG' ? replaceIconItem : replaceIconItem.querySelector('img');
        iconImage.src = fileAsBase64;
      } else {
        itemList?.addItem({ name: file.name, base64: fileAsBase64 });
      }
    } else {
      await window.alertDialog('Something went wrong! Make sure this icon doesn\'t already exist.');
    }

    dialog.setLoading(false);
  };
  return dialog;
}

// MARK: block/icon dialog
export function blockIconDialogSetup({
  name,
  deleteWarning,
  projectDetails,
  authHeaders,
  isIcon = false,
  iconBase64,
  showBlockScreenshots,
  siteSlug,
}) {
  window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} settings`);

  const formId = `change-${isIcon ? 'icon' : 'block'}-form`;
  const content = parseFragment(`
    <div>
        <h3>${name} ${isIcon ? 'Icon' : 'Block'}</h3>    
        <form id="${formId}">
          <p>${deleteWarning || ''}</p>
          ${iconBase64 ? `<div class="preview"><img class="icon-display" src="${iconBase64}" alt="icon display" /></div>` : ''}
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
          blockPreview.insertAdjacentHTML('beforeend', `
            <img src="http://main--${projectDetails.templateSlug}--headwire-self-service-templates.aem.live/${screenshot.substring(2)}" alt="screenshot"/>
          `);
        });
      });
  }

  const buttonList = [];

  // MARK: replace icon button
  if (isIcon) {
    const replaceButton = parseFragment(`
      <button class="button action primary">Replace</button>
    `);
    buttonList.push(replaceButton);

    const replaceIconItem = document.querySelector(`[data-icon-name="${name}"`);

    // closes this dialog, then opens add Icon dialog
    // that will replace this item instead of adding new icon.
    replaceButton.onclick = () => {
      replaceButton.closest('dialog').close();
      const addDialogForReplace = addIconDialogSetup({
        nameOverride: name, authHeaders, siteSlug, replaceIconItem,
      });
      addDialogForReplace.showModal();
    };
  }

  // MARK: delete block/icon button
  const submit = parseFragment(`
    <button type="submit" form="${formId}" class="button action ${isIcon ? 'secondary' : 'primary'}">Delete</button>
  `);

  buttonList.push(submit);
  if (protectedBlocks[name]) {
    submit.disabled = true;
  }

  const dialog = window.createDialog(content, buttonList);
  const form = document.getElementById(formId);

  form.onsubmit = async (event) => {
    event.preventDefault();

    window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} delete submit`);

    submit.disabled = true;
    dialog.setLoading(true, 'Deleting...');

    const delResponse = await fetch(`${SCRIPT_API}/${isIcon ? 'icons' : 'blocks'}/${projectDetails.projectSlug}/${name}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).catch(() => null);
    if (delResponse?.ok) {
      dialog.renderDialog(`<h3 class="centered-info" >${name} deleted</h3>`);
      submit.remove();
      document
        .querySelectorAll(`li[data-block-name="${name}"], li[data-icon-name="${name}"]`)
        .forEach((item) => item.remove());
      if (name === 'schedule') {
        manageGoogleCalendarLink(null, document.querySelector('.block .tabs-nav-items'), true);
      }
    } else {
      await window.alertDialog(OOPS);
    }

    submit.disabled = false;
    dialog.setLoading(false);
  };
}

// MARK: block dialog setup
function addBlockDialogSetup({ projectDetails, authHeaders, itemList }) {
  window?.zaraz?.track('click site block add');

  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = '<h3 class="centered-info" >Loading available blocks...</h3>';
  const dialog = window.createDialog(dialogContent);

  Promise.all([
    fetch(`${SCRIPT_API}/compatibleBlocks/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()),
    fetch(`${SCRIPT_API}/blocks/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()),
  ]).then(([compatibleBlocks, currentBlocks]) => {
    const data = compatibleBlocks.filter(
      (item) => !currentBlocks.some((currentBlocksItem) => currentBlocksItem.name === item.name),
    );

    if (data.length === 0) {
      dialog.renderDialog('<h3 class="centered-info" >No new blocks available</h3>');
      return;
    }

    const content = parseFragment(`
      <div>
        <h3>Add block</h3>
        <form id="add-block-form">
          <select class="button secondary action">
          ${data.map(
    (blockOption) => `<option data-block-create-info="${blockOption.createInfo || ''}" value="${blockOption.name}">${
      blockOption.name
    }</option>`,
  ).join('')}
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
            blockPreview.insertAdjacentHTML('beforeend', `
              <img src="http://main--${projectDetails.templateSlug}--headwire-self-service-templates.aem.live/${screenshot.substring(2)}" alt="screenshot"/>
            `);
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
        await window.alertDialog('Please select a block');
        return;
      }

      dialog.setLoading(true, 'Adding Block...');

      const addRequest = await fetch(`${SCRIPT_API}/blocks/${projectDetails.projectSlug}/${select.value}`, {
        method: 'POST',
        headers: authHeaders,
      }).catch(() => null);

      if (addRequest?.ok) {
        const addRequestData = await addRequest.json().catch(() => ({}));
        const buttons = [];
        if (addRequestData.calendarId) {
          const calendarLink = parseFragment(`
            <a class="button action primary" target="_blank" href="/redirect?url=https://calendar.google.com/calendar/render?cid=${addRequestData.calendarId}">Google Calendar</a>
          `);
          buttons.push(calendarLink);
          manageGoogleCalendarLink(addRequestData.calendarId, itemList.closest('.block').querySelector('.tabs-nav-items'));
        }

        dialog.renderDialog(`<h3 class="centered-info" >${select.value} block added</h3>`, buttons);
        itemList.addItem({ name: select.value });
      } else {
        await window.alertDialog(OOPS);
      }

      dialog.setLoading(false);
    };
  });
}

// MARK: block list
export function renderBlocksList(
  container,
  blocksListData,
  { projectDetails, authHeaders, siteSlug },
) {
  const blocksList = container.querySelector('.blocks');
  if (!blocksList) {
    blocksList.innerHTML = '<p class="centered-info">Failed to load blocks</p>';
    return;
  }
  container.querySelector('.add-block').onclick = () => addBlockDialogSetup({ projectDetails, authHeaders, itemList: blocksList });

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

    li.onclick = () => blockIconDialogSetup({
      name,
      deleteWarning,
      projectDetails,
      siteSlug,
      authHeaders,
      showBlockScreenshots: true,
    });
    blocksList.appendChild(li);
  };

  blocksListData.forEach((item) => blocksList.addItem(item));
}

// MARK: icon list
export function renderIconsList(
  container,
  iconsListData,
  { projectDetails, authHeaders, siteSlug },
) {
  const iconsList = container.querySelector('.icons');
  container.querySelector('.add-icon').onclick = () => addIconDialogSetup({ siteSlug, authHeaders, itemList: iconsList });

  iconsList.innerHTML = '';
  iconsList.addItem = ({ name, base64 }) => {
    const li = document.createElement('li');
    li.dataset.iconName = name;
    const iconName = document.createElement('span');
    iconName.innerText = name;
    li.append(iconName);

    if (base64) {
      const iconImage = document.createElement('img');
      iconImage.src = base64.startsWith(iconBase64Prefix) ? base64 : iconBase64Prefix + base64;
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

    settingsButton.onclick = () => blockIconDialogSetup({
      name,
      projectDetails,
      siteSlug,
      authHeaders,
      isIcon: true,
      iconBase64: base64.startsWith(iconBase64Prefix) ? base64 : iconBase64Prefix + base64,
    });
    iconsList.append(li);

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

  iconsListData.forEach((item) => iconsList.addItem(item));
}

// MARK: project updates
export async function renderUpdatesSection(
  div,
  { projectDetails, authHeaders, versionInfoData = null },
) {
  div.innerHTML = '';
  const endpoint = `${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daUpdateProject' : 'updateProject'}/`;
  const versionInfo = versionInfoData || await fetch(`${endpoint}checkUpdates/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()).catch(() => null);

  if (!versionInfo) {
    div.innerHTML = '<h3>Could not get update information.</h3>';
    return;
  }

  if (versionInfo.updateAvailable) {
    div.innerHTML = `
      <h3>A new version is available!</h3>
      ${versionInfo.updateLevel === 'major' ? '<p><strong><span>This version is a major update. It is possible some blocks will need to be updated by authors.</span></strong></p>' : ''}
    `;

    const updateButton = parseFragment(`
      <button class="button action primary update-button">Update</button>
    `);

    updateButton.onclick = async () => {
      const dialogContent = parseFragment(`
        <div>
          <h3>Update Project</h3>
          <p>Are you sure you want to update this project? This will take a short while.</p>
          ${versionInfo.updateLevel === 'major' ? '<p class="warning"><strong>This is a major update! It is possible some blocks will need to be updated by authors.</strong></p>' : ''}
          <p>This action can be undone, but changes to icons, blocks, and site theme made after an update, will also be reverted when undone.</p>
        </div>
      `);

      const confirmUpdateButton = parseFragment(`
        <button class="button action secondary update-button">Update</button>
      `);

      const cancelButton = parseFragment(`
        <button class="button action primary update-button">Cancel</button>
      `);

      const projectUpdateDialog = window.createDialog(dialogContent, [confirmUpdateButton,
        cancelButton]);

      confirmUpdateButton.onclick = async () => {
        window?.zaraz?.track('did site update');

        projectUpdateDialog.dataset.loadingText = 'Updating...';
        projectUpdateDialog.setLoading(true);

        const updateResponse = await fetch(`${endpoint}update/${projectDetails.projectSlug}`, { headers: authHeaders }).catch(() => null);
        if (updateResponse?.ok) {
          projectUpdateDialog.renderDialog('<h3 class="centered-info">Project updated successfully!</h3>');
          // replace update button
          div.innerHTML = '<h3>Your project is up-to-date!</h3>';
        } else {
          projectUpdateDialog.renderDialog(OOPS);
        }
        projectUpdateDialog.setLoading(false);
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
}

// MARK: revert updates
export async function renderPrevUpdatesSection(div, {
  projectDetails, authHeaders, authHeadersWithBody, rerenderUpdatesSection, updateInfoDiv,
}) {
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
    const revertUpdateDialog = window.createDialog(content, []);

    const updateList = await fetch(`${endpoint}appliedUpdates/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()).catch(() => null);
    if (updateList.length > 0) {
      content = parseFragment(`
        <div>
            <h3>Revert Updates to Project</h3>
            
            <form id="revert-form">
              <p class="warning">Keep in mind, any changes made on the options and theme pages after an update will <strong>also</strong> be reverted! <strong>This action cannot be undone!</strong></p>
              <ul class="applied-update-list">
                ${updateList.map((update) => `<li><label><input required type="radio" name="update" data-version="${update.version}" value="${update.sha}"><span>Version: <strong>${update.version}</strong></span><span>Updated on: <strong>${new Date(update.date).toLocaleString(undefined, {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  })}</strong></span></label></li>`).join('')}
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

        if (await window.confirmDialog(`
            <div>
                <h3>Are you sure you want to revert ${`the ${currentSelectedUpdate}` || 'to before a previous'} update?</h3>
                <p class="error"><strong>any changes made on the options and theme pages after an update will also be reverted!</strong></p>
                <p class="error">This action cannot be undone!</p>
            </div>`)) {
          revertUpdateDialog.dataset.loadingText = 'Reverting to previous version...';
          revertUpdateDialog.setLoading(true);

          const formData = new FormData(revertForm);
          const revertUpdateResponse = await fetch(`${endpoint}revert/${projectDetails.projectSlug}`, {
            method: 'POST',
            headers: authHeadersWithBody,
            body: JSON.stringify({ sha: formData.get('update') }),
          }).catch(() => null);

          if (revertUpdateResponse?.ok) {
            revertUpdateDialog.renderDialog('<h3 class="centered-info">Project reverted successfully!</h3>');
            // rerender update section.
            // Should say an update is available as one has just been reverted
            rerenderUpdatesSection(updateInfoDiv, { projectDetails, authHeaders });
          } else {
            revertUpdateDialog.renderDialog(OOPS);
          }

          revertUpdateDialog.setLoading(false);
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
