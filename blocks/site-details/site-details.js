/* eslint-disable max-len */

import {
  SCRIPT_API, onAuthenticated, OOPS, EMAIL_WORKER_API,
  daProjectRepo,
  projectRepo, parseFragment,
} from '../../scripts/scripts.js';

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

function addGoogleCalendarLink(calendarId, actionsList) {
  // resetting in case
  actionsList.querySelectorAll('.google-calendar-link').forEach((link) => link.remove());
  actionsList.insertAdjacentHTML(
    'afterbegin',
    `<a class="button action secondary google-calendar-link" target="_blank" id="google-calendar" href="https://calendar.google.com/calendar/render?cid=${calendarId}">Google Calendar</a>`,
  );
}

function validateFileType(acceptString, fileName) {
  const fileAcceptArray = acceptString.split(',');
  const fileExtension = fileName.split('.').pop();
  return fileAcceptArray.includes(`.${fileExtension}`);
}
// MARK: add Icon dialog
function addIconDialogSetup({
  nameOverride, replaceIconItem,
  headers, id, itemList, fileAccept = '.svg', titleText = 'Add icon',
  uploadEndpoint = `${SCRIPT_API}/icons/${id}`,
  defaultSrc,
}) {
  window?.zaraz?.track(`click site ${titleText === 'Favicon' ? 'favicon' : 'icon'} add`, { url: window.location.href });

  const submit = parseFragment('<button form="update-icon-form" type="submit" class="button primary action">Save</button>');
  const content = parseFragment(`
    <div>
      <h3>${titleText}</h3>
      
      <form id="update-icon-form">
          <p>${titleText === 'Favicon' ? 'Don\'t have an .ico file yet? You can convert your image to a .ico file <a href="https://www.icoconverter.com/" target="_blank">here</a>.' : 'Upload a new SVG icon.'}</p>
          <label>
              <span>File *</span>
              <input type="file" accept="${fileAccept}" required name="pageName" placeholder="Blog Page"/>
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

  const form = document.getElementById('update-icon-form');
  form.onsubmit = async (event) => {
    event.preventDefault();

    window?.zaraz?.track(`click site ${titleText === 'Favicon' ? 'favicon' : 'icon'} add submit`, { url: window.location.href });

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
      headers,
    });

    if (addRequest.ok) {
      dialog.renderDialog('<h3 class="centered-info">Icon added!</h3>');
      if (replaceIconItem) {
        const iconImage = replaceIconItem.querySelector('img');
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
function blockIconDialogSetup({
  name, deleteWarning, project, headers, isIcon = false, iconBase64, showBlockScreenshots,
}) {
  window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} settings`, { url: window.location.href });

  const formId = `update-${isIcon ? 'icon' : 'block'}-form`;
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
    fetch(`${SCRIPT_API}/blockScreenshots/${project.projectSlug}/${name}`)
      .then((response) => response.json())
      .then((data) => {
        const blockPreview = content.querySelector('.block-preview');

        data.forEach((screenshot) => {
          blockPreview.insertAdjacentHTML('beforeend', `
            <img src="http://main--${project.templateSlug}--headwire-self-service-templates.hlx.live/${screenshot.substring(2)}" alt="screenshot"/>
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

    // closes this dialog, opens add Icon dialog that will replace this item instead of adding new icon.
    replaceButton.onclick = () => {
      replaceButton.closest('dialog').close();
      const addDialogForReplace = addIconDialogSetup({
        nameOverride: name, headers, id: project.projectSlug, replaceIconItem,
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

    window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} delete submit`, { url: window.location.href });

    submit.disabled = true;
    dialog.setLoading(true, 'Deleting...');

    const delResponse = await fetch(`${SCRIPT_API}/${isIcon ? 'icons' : 'blocks'}/${project.projectSlug}/${name}`, {
      method: 'DELETE',
      headers,
    });
    if (delResponse.ok) {
      dialog.renderDialog(`<h3 class="centered-info" >${name} deleted</h3>`);
      submit.remove();
      document
        .querySelectorAll(`li[data-block-name="${name}"], li[data-icon-name="${name}"]`)
        .forEach((item) => item.remove());
    } else {
      await window.alertDialog(OOPS);
    }

    submit.disabled = false;
    dialog.setLoading(false);
  };
}

// MARK: add block dialog
function addBlockDialogSetup({ project, headers, itemList }) {
  window?.zaraz?.track('click site block add', { url: window.location.href });

  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = '<h3 class="centered-info" >Loading available blocks...</h3>';
  const dialog = window.createDialog(dialogContent);

  Promise.all([
    fetch(`${SCRIPT_API}/compatibleBlocks/${project.projectSlug}`, { headers }).then((res) => res.json()),
    fetch(`${SCRIPT_API}/blocks/${project.projectSlug}`, { headers }).then((res) => res.json()),
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

      fetch(`${SCRIPT_API}/blockScreenshots/${project.projectSlug}/${select.value}`)
        .then((response) => response.json())
        .then((screenshotData) => {
          blockPreview.innerHTML = '';
          screenshotData.forEach((screenshot) => {
            blockPreview.insertAdjacentHTML('beforeend', `
              <img src="http://main--${project.templateSlug}--headwire-self-service-templates.hlx.live/${screenshot.substring(2)}" alt="screenshot"/>
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

      window?.zaraz?.track('click site block add submit', { url: window.location.href });

      if (!select.value) {
        await window.alertDialog('Please select a block');
        return;
      }

      dialog.setLoading(true, 'Adding Block...');

      const addRequest = await fetch(`${SCRIPT_API}/blocks/${project.projectSlug}/${select.value}`, {
        method: 'POST',
        headers,
      });

      if (addRequest.ok) {
        const addRequestData = await addRequest.json().catch(() => ({}));
        const buttons = [];
        if (addRequestData.calendarId) {
          const calendarLink = parseFragment(`
            <a class="button action primary" target="_blank" href="https://calendar.google.com/calendar/render?cid=${addRequestData.calendarId}">Google Calendar</a>
          `);
          buttons.push(calendarLink);
          addGoogleCalendarLink(addRequestData.calendarId, itemList.closest('.block').querySelector('.settings-actions'));
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

// MARK: add page dialog
function addPageDialogSetup({
  project, headers, darkAlleyVariation,
}) {
  const submit = parseFragment('<button form="add-page-form" type="submit" class="button primary action">Create Page</button>');
  const content = parseFragment(`
    <div>
      <h3>Add a new Page</h3>
      
      <div class="columns">
        <form id="add-page-form">
          <p>The newly created document will appear in the drafts folder. Make sure to move it to your desired path before attempting to publish! Draft files cannot be published.</p>
          <label>
              <span>Page Name *</span>
              <input required name="pageName" placeholder="Blog Page"/>
          </label>
          <label>
            <span>Template *</span>
            <select required name="templatePath">
                <option>Loading...</option>
            </select>
          </label>
        </form>
        
        <iframe hidden></iframe>
      </div>
      
    </div>
  `);

  const dropdown = content.querySelector('select[name="templatePath"]');
  const previewIframe = content.querySelector('iframe');

  const templateUrl = `https://main--${project.templateSlug}--headwire-self-service-templates.hlx.live`;
  const templateRegex = /^template\s*-\s*(?!.*authoring\s+guide\s*-)/i;

  fetch(`${templateUrl}/tools/sidekick/library.json`).then((res) => res.json()).then(({ data }) => {
    const templates = data.filter((item) => !!(templateRegex.test(item.name)));
    // eslint-disable-next-line no-console
    console.log('templates:', templates);

    dropdown.innerHTML = '';
    dropdown.disabled = null;
    templates.forEach((template) => {
      template.templateName = template.name.split('-')[1].trim();
      const option = document.createElement('option');
      option.value = template.path;
      option.innerText = template.templateName;
      dropdown.append(option);
    });
    previewIframe.hidden = false;
    previewIframe.src = `${templateUrl}${dropdown.value}`;
    // eslint-disable-next-line no-console
  }).catch((err) => console.error(err));

  dropdown.onchange = () => {
    // eslint-disable-next-line no-console
    console.log('\x1b[34m ~ TEST:');
    previewIframe.src = `${templateUrl}${dropdown.value}`;
  };

  const dialog = window.createDialog(content, [submit], { fullscreen: true });

  const form = dialog.querySelector('form');
  // submit.onclick = () => form.dispatchEvent(new Event('submit', { cancelable: true }));
  form.onsubmit = async (event) => {
    event.preventDefault();
    // if (!form.checkValidity()) {
    //   form.reportValidity();
    //   return;
    // }
    window.zaraz?.track('click site page add', { url: window.location.href });

    dialog.setLoading(true, 'Copying and setting up page...');

    const body = Object.fromEntries(new FormData(form));
    const addPageRequest = await fetch(`${SCRIPT_API}/${darkAlleyVariation ? 'daAddPage' : 'addPage'}/${project.projectSlug}`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(body),

    });
    if (addPageRequest.ok) {
      const responseData = await addPageRequest.json().catch(() => ({}));

      const buttons = [];
      let draftsHref;
      let editHref;

      if (project.darkAlleyProject) {
        draftsHref = `https://da.live/#${responseData.daPath}`;
        editHref = `https://da.live/edit#${responseData.daPath}/${responseData.daNewPageSlug}`;
      } else {
        draftsHref = `https://drive.google.com/drive/folders/${responseData.folderId}`;
        editHref = `https://docs.google.com/document/d/${responseData.newPageId}/edit`;
      }

      const draftsLink = parseFragment(`
        <a class="button secondary action" href="${draftsHref}" target="_blank">Drafts Folder</a>
      `);
      buttons.push(draftsLink);

      const editLink = parseFragment(`
        <a class="button primary action" target="_blank" href="${editHref}">Edit ${body.pageName}</a>
      `);
      buttons.push(editLink);

      dialog.renderDialog(`<h3 class="centered-info" >${body.pageName} page added to drafts</h3>`, buttons);
    } else {
      await window.alertDialog(OOPS);
    }
    dialog.setLoading(false);
  };
}

// MARK: block list
function renderBlocksList(block, { project, headers }) {
  const blocksList = block.querySelector('.blocks');
  block.querySelector('.add-block').onclick = () => addBlockDialogSetup({ project, headers, itemList: blocksList });

  blocksList.innerHTML = '';
  blocksList.addItem = ({ name, deleteWarning, createInfo }) => {
    const li = document.createElement('li');
    li.dataset.blockName = name;
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
      project,
      headers,
      showBlockScreenshots: true,
    });
    blocksList.appendChild(li);
  };

  fetch(`${SCRIPT_API}/blocks/${project.projectSlug}`, { headers })
    .then((res) => {
      if (res.ok) {
        return res.json();
      }

      throw new Error(res.status);
    })
    .then((blocks) => {
      blocks.forEach((item) => blocksList.addItem(item));
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.log(error);
    });
}

// MARK: Icon list
function renderIconsList(block, { project, headers, id }) {
  const iconsList = block.querySelector('.icons');
  block.querySelector('.add-icon').onclick = () => addIconDialogSetup({ id, headers, itemList: iconsList });

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
      project,
      headers,
      isIcon: true,
      iconBase64: base64.startsWith(iconBase64Prefix) ? base64 : iconBase64Prefix + base64,
    });
    iconsList.append(li);

    copyButton.onclick = () => {
      window?.zaraz?.track('click site icon copy', { url: window.location.href });

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

  fetch(`${SCRIPT_API}/icons/${project.projectSlug}`, { headers })
    .then((res) => {
      if (res.ok) {
        return res.json();
      }

      throw new Error(res.status);
    })
    .then((icons) => {
      icons.forEach((item) => iconsList.addItem(item));
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.log(error);
    });
}

// MARK: project updates
async function renderUpdatesSection(div, { project, headers }) {
  div.innerHTML = '';
  const endpoint = `${SCRIPT_API}/${project.darkAlleyProject ? 'daUpdateProject' : 'updateProject'}/`;
  const versionInfo = await fetch(`${endpoint}checkUpdates/${project.projectSlug}`, { headers }).then((res) => res.json()).catch(() => null);

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

      const projectUpdateDialog = window.createDialog(dialogContent, [confirmUpdateButton, cancelButton]);

      confirmUpdateButton.onclick = async () => {
        window?.zaraz?.track('did site update', { url: window.location.href });

        projectUpdateDialog.dataset.loadingText = 'Updating...';
        projectUpdateDialog.setLoading(true);

        const updateResponse = await fetch(`${endpoint}update/${project.projectSlug}`, { headers });
        if (updateResponse.ok) {
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
async function renderPrevUpdatesSection(div, {
  project, headers, rerenderUpdatesSection, updateInfoDiv,
}) {
  div.innerHTML = '<h3>Previously applied updates</h3>';
  const endpoint = `${SCRIPT_API}/${project.darkAlleyProject ? 'daUpdateProject' : 'updateProject'}/`;

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

    const updateList = await fetch(`${endpoint}appliedUpdates/${project.projectSlug}`, { headers }).then((res) => res.json()).catch(() => null);
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
        window?.zaraz?.track('did site update revert', { url: window.location.href });

        if (await window.confirmDialog(`
            <div>
                <h3>Are you sure you want to revert ${`the ${currentSelectedUpdate}` || 'to before a previous'} update?</h3>
                <p class="error"><strong>any changes made on the options and theme pages after an update will also be reverted!</strong></p>
                <p class="error">This action cannot be undone!</p>
            </div>`)) {
          revertUpdateDialog.dataset.loadingText = 'Reverting to previous version...';
          revertUpdateDialog.setLoading(true);

          const formData = new FormData(revertForm);
          const revertUpdateResponse = await fetch(`${endpoint}revert/${project.projectSlug}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha: formData.get('update') }),
          });

          if (revertUpdateResponse.ok) {
            revertUpdateDialog.renderDialog('<h3 class="centered-info">Project reverted successfully!</h3>');
            // rerender update section. Should say an update is available as one has just been reverted
            rerenderUpdatesSection(updateInfoDiv, { project, headers });
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

/**
 * MARK: Decorate
 * @param {Element} block
 */
export default async function decorate(block) {
  const darkAlleyVariation = block.classList.contains('dark-alley');

  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();
    const headers = { authorization: `bearer ${token}` };

    if (/(^\/site\/|^\/da-site\/)/g.test(window.location.pathname) && split.length === 3) {
      window.history.replaceState({}, '', `${window.location.pathname}/overview`);
    }

    const siteType = window.location.pathname.split('/')[1];
    const selected = window.location.pathname.split('/')[3];

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              Dashboard
            </a>
          </div>
        </div>
        
        <div class="content">
            <p>
                <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
            </p>
        </div>
      </div>`;

    const reqDetails = await fetch(
      darkAlleyVariation ? `${SCRIPT_API}/darkAlleyList/${id}`
        : `${SCRIPT_API}/list/${id}`,
      {
        headers,
      },
    );

    if (reqDetails.ok) {
      const { project } = await reqDetails.json();

      block.innerHTML = /* html */`
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/${siteType}/${project.projectSlug}" aria-current="page">
              <h1>${project.projectName}</h1>
            </a>
          </div>
          
          <div class="actions">
            <div class="overview-actions button-container ${selected === 'overview' ? 'is-selected' : ''}"></div>
            <div class="pages-actions button-container ${selected === 'pages' ? 'is-selected' : ''}">
                <button id="add-page-button" title="Add a new Page" class="button primary add-page action">Add Page</button>
            </div>
            <div class="emails-actions button-container ${selected === 'emails' ? 'is-selected' : ''}">
                <button id="delete-campaign" title="Delete the Campaign" class="button secondary delete-campaign action" hidden>Delete</button>
                <button id="add-email" title="Add Email" class="button secondary add-email action" hidden>Add Email</button>
                <a target="_blank" href="#" id="open-campaign" title="Open Campaign" class="button secondary open-campaign action" hidden>Open</a>
                <button id="new-campaign" title="Start a new Campaign" class="button primary add-campaign action">New Campaign</button>
            </div>
            <div class="audience-actions button-container ${selected === 'audience' ? 'is-selected' : ''}"></div>
            <div class="monitoring-actions button-container ${selected === 'monitoring' ? 'is-selected' : ''}">
                <select class="button action secondary period-selector">
                    <option value="1d" selected>Period: 1 day</option>
                    <option value="7d">Period: 7 days</option>
                    <option value="30d">Period: 30 days</option>
                </select>
            </div>
            <div class="analytics-actions button-container ${selected === 'analytics' ? 'is-selected' : ''}"></div>
            <div class="settings-actions button-container ${selected === 'settings' ? 'is-selected' : ''}"></div>
          </div>
        </div>
        
        <div class="content">
            <dialog class="display-dialog"></dialog>
            <aside>
                <ul>
                    <li class="title">Site</li>
                    <li>
                        <a href="overview" class="button action secondary ${selected === 'overview' ? 'is-selected' : ''}">
                          <span class="icon icon-template">
                            <img alt src="/icons/template.svg" loading="lazy">  
                          </span>
                          Overview
                        </a>
                    </li>
                    <li>
                        <a href="pages" class="button action secondary ${selected === 'pages' ? 'is-selected' : ''}">
                          <span class="icon icon-web">
                            <img alt src="/icons/web.svg" loading="lazy">  
                          </span>
                          Pages
                        </a>
                    </li>
                    <li>
                        <a href="monitoring" class="button action secondary ${selected === 'monitoring' ? 'is-selected' : ''}">
                          <span class="icon icon-monitoring">
                            <img alt src="/icons/monitoring.svg" loading="lazy">  
                          </span>
                          Web analytics
                        </a>
                    </li>
                    <li class="title">Campaigns</li>
                    <li>
                        <a href="emails" class="button action secondary ${selected === 'emails' ? 'is-selected' : ''}">
                          <span class="icon icon-email">
                            <img alt src="/icons/email.svg" loading="lazy">  
                          </span>
                          Overview
                        </a>
                    </li>
                    <li>
                        <a href="audience" class="button action secondary ${selected === 'audience' ? 'is-selected' : ''}">
                          <span class="icon icon-audience">
                            <img alt src="/icons/audience.svg" loading="lazy">  
                          </span>
                          Audience
                        </a>
                    </li>
                    <li>
                        <a href="analytics" class="button action secondary ${selected === 'analytics' ? 'is-selected' : ''}">
                          <span class="icon icon-analytics">
                            <img alt src="/icons/analytics.svg" loading="lazy">  
                          </span>
                          Campaign analytics
                        </a>
                    </li>
                    <li class="title">Settings</li>
                    <li>
                        <a href="settings" class="button action secondary ${selected === 'settings' ? 'is-selected' : ''}">
                          <span class="icon icon-settings">
                            <img alt src="/icons/settings.svg" loading="lazy">  
                          </span>
                          General
                        </a>
                    </li>
                    <li>
                      <a href="/theme/${id}" class="button action secondary" target="_blank">
                        <span class="icon icon-palette">
                          <img alt src="/icons/palette.svg" loading="lazy">  
                        </span>
                        Theme
                      </a>
                    </li>
                </ul>
            </aside>

            <div class="details">
                <div class="overview-panel ${selected === 'overview' ? 'is-selected' : ''}">                    
                    <div class="container">
                        <div class="cards">
                            <div id="site-id">
                              <strong>Site id</strong>
                              <span>${project.projectSlug}</span>
                          </div>
                          <div id="site-description" class="project-description card">
                              <strong>Site description</strong>
                              <span class="project-description span">${project.projectDescription ?? ''}</span>
                              <button id="update-desc-button" title="Edit the Project Description" class="button secondary update-description action">Update</button>
                          </div>
                          <div id="last-updated">
                              <strong>Last update</strong>
                              <span class="last-update"></span>
                          </div>
                          <div id="site-template">
                              <strong>Site template</strong>
                              <span>${project.templateName}</span>
                          </div>
                        </div>
                        
                        <div class="danger-zone">
                            <strong>Danger zone</strong>
                            <p>Delete this project. Once you delete a project, there is no going back. Please be certain.</p>
                            <button id="delete-site-button" title="Delete your Project" class="button delete action destructive">Delete</button>
                        </div>
                    </div>
                </div>
                
                <div class="pages-panel ${selected === 'pages' ? 'is-selected' : ''}">                    
                    <div class="container">
                        <div id="pages-overview">
                        <h2>Pages</h2>
                        <table class="pages">
                          <thead>
                              <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Path</th>
                                <th>Last update</th>
                                <th></th>
                              </tr>  
                            </thead>
                            <tbody></tbody>
                          </table>
                        </div>
                        
                        <div id="nav-overview">
                        <h2>Navigation</h2>
                        <table class="navs">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Path</th>
                                <th>Last update</th>
                                <th></th>
                              </tr>  
                            </thead>
                            <tbody></tbody>
                        </table>
                        </div>
                        
                        <div id="footer-overview">
                        <h2>Footer</h2>
                        <table class="footers">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Path</th>
                                <th>Last update</th>
                                <th></th>
                              </tr>  
                            </thead>
                            <tbody></tbody>
                        </table>
                        </div>
                    </div>
                </div>
                
                <div class="emails-panel ${selected === 'emails' ? 'is-selected' : ''}">
                    <div class="container">
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </div>
                </div>
                
                <div class="audience-panel ${selected === 'audience' ? 'is-selected' : ''}">
                    <div class="container">
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </div>
                </div>
                
                <div class="monitoring-panel ${selected === 'monitoring' ? 'is-selected' : ''}">
                    <div class="container">
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </div>
                </div>
                
                <div class="analytics-panel ${selected === 'analytics' ? 'is-selected' : ''}">
                    <div class="container">
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </div>
                </div>
                
                <div class="settings-panel ${selected === 'settings' ? 'is-selected' : ''}">
                    <div class="container">
                      <div id="authors">
                        <h2>Authors</h2>
                        <form class="add-author-form form">
                          <label>
                            <span>New author <span id="new-author-warning" hidden class="warning">Please enter a valid Email (e.g. person@example.com)</span></span>
                            <input name="email" type="email" placeholder="person@example.com" />
                          </label>
                          <button id="add-author-button" title="Add a new Author" class="button is-disabled primary action" type="submit">Add</button>
                        </form>
                        <ul class="authors-list"></ul>
                      </div>
                        
                      <div id="contact-email">
                        <h2>Contact email</h2>
                        <form class="contact-email-form form">
                            <label>
                                <span>Define which email the contact form submits to. <span id="contact-email-warning" hidden class="warning">Please enter a valid Email (e.g. person@example.com)</span></span>
                                <input name="email" type="email" placeholder="person@example.com" />
                            </label>    
                            <button id="contact-email-save" title="Update the Contact Email" class="button primary is-disabled action" type="submit">Update</button>
                        </form>
                      </div>
                        
                      <div id="favicon">
                        <h2>Favicon</h2>
                        <p>Only <code>.ico</code> files are supported.</p>
                        <div class="favicon-section">
                          <img alt="favicon" src="https://main--${id}--${darkAlleyVariation ? 'da-self-service' : 'headwire-self-service'}.hlx.page/favicon.ico" loading="lazy">
                          <button id="change-favicon" title="Change the Favicon. (Only .ico is supported)" class="button action primary change-favicon">Update</button>     
                        </div>
                      </div>
                       
                        <div id="blocks">
                        <h2>Blocks</h2>
                        <button id="add-block-button" title="Add a new block" class="button primary action add-block">Add block</button>
                        <ul id="blocks-list" class="blocks list"></ul>
                        </div>

                        <div id="icons">
                        <h2>Icons</h2>
                        <button id="add-icon-button" title="Upload a new Icon" class="button action primary add-icon">Add icon</button>
                        <ul id="icons-list" class="icons list"></ul>
                        </div>
                        
                        <div id="updates">
                        <h2>Updates</h2>
                        <div class="update-info"></div>
                        <div class="prev-update-info"></div>
                        </div>
                    </div> 
                </div>
            </div>
        </div>
    `;

      const actions = block.querySelector('.actions');
      actions.querySelector('.overview-actions').innerHTML = `
        <a href="${project.sidekickSetupUrl}" id="install-sidekick-button" title="Install the Chrome Plugin Sidekick" class="button action secondary sidekick" target="_blank">Install sidekick</a>
        ${
  project.authoringGuideUrl
    ? `<a href="${project.authoringGuideUrl}" id="guides-button" title="Open the Guide for the Template" class="button action secondary guides" target="_blank">Guides</a>`
    : ''
}
        <a href="${project.driveUrl}${!darkAlleyVariation ? `?authuser=${user.email}` : ''}" id="edit-button" title="Edit your Content" class="button action secondary edit" target="_blank">Edit</a>
        <a href="${project.customLiveUrl}" id="open-button" title="Open your Website" class="button primary action open" target="_blank">Open</a>
      `;

      // MARK: Campaign analytics
      document.addEventListener('campaigns:ready', ({ detail: { campaigns } }) => {
        fetch(`${SCRIPT_API}/email/${project.projectSlug}`, { headers })
          .then((req) => {
            if (req.ok) {
              return req.json();
            }

            return false;
          })
          .then((campaignAnalytics) => {
            const analyticsContainer = block.querySelector('.analytics-panel .container');
            analyticsContainer.innerHTML = `
            <ul class="campaign-list" data-type="analytics">
              <li><a class="button action secondary ${window.location.pathname.startsWith(`/${siteType}/${id}/analytics/`) ? '' : 'is-selected'}" href="/${siteType}/${id}/analytics">All emails</a></li>
              ${Object.keys(campaigns).map((campaignSlug) => `<li data-campaign="${campaignSlug}"><a class="button action secondary ${window.location.pathname === `/${siteType}/${id}/analytics/${campaignSlug}` ? 'is-selected' : ''}" href="/${siteType}/${id}/analytics/${campaignSlug}">${campaigns[campaignSlug].name}</li></a>`).join('')}</a>
            </ul>
              
            <div id="email-metrics" class="cards metrics">
              <div id="email-metrics-delivery-rate">
                  <strong>Delivery rate</strong>
                  <span class="delivered-count"></span>
              </div>
              <div id="email-metrics-bounce-rate">
                  <strong>Bounce rate</strong>
                  <span class="bounced-count"></span>
              </div>
              <div id="email-metrics-open-rate">
                  <strong>Open rate</strong>
                  <span class="opened-count"></span>
              </div>
              <div id="email-metrics-cto-rate">
                  <strong>Click-to-open rate</strong>
                  <span class="clicked-count"></span>
              </div>
              <div id="email-metrics-sc-rate">
                  <strong>Spam complaints rate</strong>
                  <span class="complained-count"></span>
              </div>
            </div>
            
            <div id="email-details">
            <h2>Email details</h2>
            <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>To</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Bounced</th>
                    <th>Complained</th>
                    <th>Opened</th>
                    <th>Clicked</th>
                  </tr>
                </thead>
                <tbody>
                    ${campaignAnalytics ? Object.keys(campaignAnalytics).sort((emailIdA, emailIdB) => {
    const sentA = campaignAnalytics[emailIdA].find(({ type }) => type === 'email.sent');
    const sentB = campaignAnalytics[emailIdB].find(({ type }) => type === 'email.sent');
    if (sentA && sentB) {
      return new Date(sentB.created_at) - new Date(sentA.created_at);
    }
    return 0;
  }).map((emailId) => {
    const reverse = campaignAnalytics[emailId].reverse();

    const sent = campaignAnalytics[emailId].find(({ type }) => type === 'email.sent');
    const delivered = reverse.find(({ type }) => type === 'email.delivered');
    const complained = campaignAnalytics[emailId].find(({ type }) => type === 'email.complained');
    const bounced = campaignAnalytics[emailId].find(({ type }) => type === 'email.bounced');
    const opened = reverse.find(({ type }) => type === 'email.opened');
    const clicks = campaignAnalytics[emailId].filter(({ type }) => type === 'email.clicked');

    const emailURL = campaignAnalytics[emailId][0].data.headers.find(({ name }) => name === 'X-Email-Url')?.value;

    let campaign;
    if (emailURL) {
      // eslint-disable-next-line prefer-destructuring
      campaign = new URL(emailURL).pathname.split('/')[1];
    }

    let campaignSlug;
    if (window.location.pathname.includes('/analytics/')) {
      campaignSlug = window.location.pathname.split('/').pop();
    }

    return `
                      <tr data-email="${emailId}" data-campaign="${campaign}" ${campaignSlug && campaignSlug !== campaign ? 'hidden' : ''}>
                        <td>${emailURL ? `<a href="${EMAIL_WORKER_API}/preview/${emailURL}" target="_blank">${campaignAnalytics[emailId][0].data.subject}</a>` : `${campaignAnalytics[emailId][0].data.subject}`}</td>
                        <td>${campaignAnalytics[emailId][0].data.to.join(',')}</td>
                        <td>${sent ? new Date(sent.created_at).toLocaleString() : ''}</td>
                        <td>${delivered ? new Date(delivered.created_at).toLocaleString() : ''}</td>
                        <td>${bounced ? new Date(bounced.created_at).toLocaleString() : ''}</td>
                        <td>${complained ? new Date(complained.created_at).toLocaleString() : ''}</td>
                        <td>${opened ? new Date(opened.created_at).toLocaleString() : ''}</td>
                        <td>${clicks.length ? `<button class="click-details button action secondary">${clicks.length}&nbsp;click(s)</button><div hidden><ul class="clicked-links">${clicks.map((clicked) => `<li>Clicked <a href="${clicked.data.click.link}" target="_blank">${clicked.data.click.link}</a> at ${new Date(clicked.data.click.timestamp).toLocaleString()}</li>`).join('')}</ul></div>` : ''}</td>
                      </tr>
                    `;
  }).join('') : `
    <tr><td class="empty" colspan="8">Not enough data</td></tr>
  `}
                </tbody>
            </table>
            </div>
          `;

            const calculateCampaignStats = (hasCampaign) => {
              let sentCount = 0;
              let deliveredCount = 0;
              let bouncedCount = 0;
              let openedCount = 0;
              let clickedCount = 0;
              let complainedCount = 0;

              const selector = hasCampaign ? 'tr[data-campaign]:not([hidden])' : 'tbody tr';
              analyticsContainer.querySelectorAll(selector).forEach((tr) => {
                const emailId = tr.dataset.email;
                if (emailId) {
                  const reverse = campaignAnalytics[emailId].reverse();

                  const sent = campaignAnalytics[emailId].find(({ type }) => type === 'email.sent');
                  const delivered = reverse.find(({ type }) => type === 'email.delivered');
                  const complained = campaignAnalytics[emailId].find(({ type }) => type === 'email.complained');
                  const bounced = campaignAnalytics[emailId].find(({ type }) => type === 'email.bounced');
                  const opened = reverse.find(({ type }) => type === 'email.opened');
                  const clicks = campaignAnalytics[emailId].filter(({ type }) => type === 'email.clicked');

                  if (sent) {
                    sentCount += 1;
                  }
                  if (delivered) {
                    deliveredCount += 1;
                  }
                  if (complained) {
                    complainedCount += 1;
                  }
                  if (bounced) {
                    bouncedCount += 1;
                  }
                  if (opened) {
                    openedCount += 1;
                  }
                  if (clicks.length) {
                    clickedCount += 1;
                  }
                }
              });

              block.querySelector('.delivered-count').textContent = deliveredCount === 0 ? '0%' : `${((deliveredCount / sentCount) * 100).toFixed(2)}%`;
              block.querySelector('.bounced-count').textContent = bouncedCount === 0 ? '0%' : `${((bouncedCount / sentCount) * 100).toFixed(2)}%`;
              block.querySelector('.opened-count').textContent = openedCount === 0 ? '0%' : `${((openedCount / deliveredCount) * 100).toFixed(2)}%`;
              block.querySelector('.clicked-count').textContent = clickedCount === 0 ? '0%' : `${((clickedCount / openedCount) * 100).toFixed(2)}%`;
              block.querySelector('.complained-count').textContent = complainedCount === 0 ? '0%' : `${((complainedCount / deliveredCount) * 100).toFixed(2)}%`;
            };

            const campaignList = analyticsContainer.querySelector('.campaign-list');
            campaignList.onclick = (event) => {
              if (event.target.matches('a')) {
                event.preventDefault();

                const link = event.target;
                const selectedCampaign = campaignList.querySelector('.is-selected');
                if (selectedCampaign) {
                  selectedCampaign.classList.remove('is-selected');
                }
                link.classList.add('is-selected');

                const li = link.parentElement;
                const hasCampaign = li.matches('[data-campaign]');
                analyticsContainer.querySelectorAll('tr[data-campaign]').forEach((tr) => {
                  tr.hidden = hasCampaign ? tr.dataset.campaign !== li.dataset.campaign : false;
                });

                calculateCampaignStats(hasCampaign);

                window.history.pushState({}, '', link.getAttribute('href'));
              }
            };

            analyticsContainer.querySelectorAll('.click-details').forEach((el) => {
              el.onclick = () => {
                const clone = el.nextElementSibling.cloneNode(true);
                clone.hidden = false;
                const content = parseFragment(`
                <div>
                    <h3>${el.textContent}</h3>
                    ${clone.outerHTML}    
                </div>
              `);
                window.createDialog(content);
              };
            });

            calculateCampaignStats(window.location.pathname.startsWith(`/${siteType}/${id}/analytics/`));
          });
      });

      // MARK: Share authors
      const authorsList = block.querySelector('.authors-list');
      const addAuthorListItem = (author) => {
        if (!author.email) return;

        const authorEmail = author.email;
        const isOwner = author.owner;

        const listItem = parseFragment(`
          <li class="author ${isOwner ? 'is-owner' : ''}" data-author-email="${authorEmail}">
            <span>${authorEmail}</span>
            <button ${isOwner ? 'disabled' : ''} class="transfer-button button action secondary">Make Owner</button>
            <button ${isOwner ? 'disabled' : ''} class="revoke-button button action secondary">Revoke</button>
          </li>
        `);

        const revoke = listItem.querySelector('.revoke-button');
        revoke.onclick = async () => {
          window?.zaraz?.track('click site share delete', { url: window.location.href });

          if (await window.confirmDialog('Are you sure ?')) {
            window?.zaraz?.track('click site share delete submit', { url: window.location.href });

            authorsList.classList.add('is-disabled');
            const revokeResponse = await fetch(`${SCRIPT_API}/authors/${id}/${authorEmail}`, {
              method: 'DELETE',
              headers,
            });
            if (revokeResponse.ok) {
              authorsList.querySelector(`li[data-author-email="${authorEmail}"]`).remove();
            } else {
              await window.alertDialog(OOPS);
            }
            authorsList.classList.remove('is-disabled');
          }
        };

        const changeOwnerButton = listItem.querySelector('.transfer-button');
        changeOwnerButton.onclick = async () => {
          window?.zaraz?.track('click site share make owner', { url: window.location.href });

          if (await window.confirmDialog('Are you sure ?')) {
            window?.zaraz?.track('click site share make owner submit', { url: window.location.href });

            authorsList.classList.add('is-disabled');
            const changeOwnerResponse = await fetch(`${SCRIPT_API}/updateOwner/${id}/${authorEmail}`, {
              method: 'POST',
              headers,
            });
            if (changeOwnerResponse.ok) {
              const prevOwner = authorsList.querySelector('li.is-owner');
              if (prevOwner) {
                prevOwner.classList.remove('is-owner');
                prevOwner.querySelectorAll('button[disabled]').forEach((button) => { button.disabled = null; });
              }

              revoke.disabled = true;
              changeOwnerButton.disabled = true;
              listItem.classList.add('is-owner');
            } else {
              await window.alertDialog(OOPS);
            }
            authorsList.classList.remove('is-disabled');
          }
        };

        authorsList.append(listItem);
      };

      const addAuthorForm = block.querySelector('.add-author-form');
      // TODO: Update when we have dark alley authorization
      if (darkAlleyVariation) {
        addAuthorForm.classList.add('is-disabled');
      }
      addAuthorForm.onsubmit = async (event) => {
        window?.zaraz?.track('click site share add submit', { url: window.location.href });

        event.preventDefault();

        addAuthorForm.classList.add('is-disabled');
        const email = event.target.email.value;
        const isValid = /^(?!@).*@.*(?<!@)$/.test(email);
        if (!isValid) {
          await window.alertDialog('Please enter a valid email.');
          addAuthorForm.classList.remove('is-disabled');
          return;
        }
        const response = await fetch(`${SCRIPT_API}/authors/${id}/${email}`, {
          method: 'POST',
          headers,
        });
        if (response.ok) {
          addAuthorListItem({ email });
          event.target.email.value = '';
        } else {
          await window.alertDialog(OOPS);
        }
        addAuthorForm.classList.remove('is-disabled');
      };

      // Enables the Add button only if the email is in a valid format
      addAuthorForm.oninput = () => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addAuthorForm.querySelector('input').value)) {
          addAuthorForm.querySelector('#add-author-button').classList.remove('is-disabled');
          document.querySelector('#new-author-warning').hidden = true;
        } else {
          addAuthorForm.querySelector('#add-author-button').classList.add('is-disabled');
          document.querySelector('#new-author-warning').hidden = false;
        }
        if (addAuthorForm.querySelector('input').value === '') {
          document.querySelector('#new-author-warning').hidden = true;
        }
      };

      fetch(`${SCRIPT_API}/authors/${id}`, { headers })
        .then((res) => res.json())
        .then((authors) => {
          authors.forEach(addAuthorListItem);
        })
        .catch(() => {});

      // MARK: Contact Email
      const contactEmailForm = block.querySelector('.contact-email-form');
      const contactEmailFormInput = contactEmailForm.querySelector('input');
      const contactEmail = project.contactEmail || project.ownerEmail || '';
      const contactEmailButton = contactEmailForm.querySelector('#contact-email-save');
      contactEmailFormInput.value = contactEmail;
      // Enables the Update button only if the email is different from the current one and in a valid format
      contactEmailFormInput.oninput = () => {
        if (contactEmailFormInput.value === contactEmail || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmailFormInput.value)) {
          contactEmailButton.classList.remove('is-disabled');
          document.querySelector('#contact-email-warning').hidden = true;
        } else {
          contactEmailButton.classList.add('is-disabled');
          document.querySelector('#contact-email-warning').hidden = false;
        }
      };

      contactEmailForm.onsubmit = async (event) => {
        window?.zaraz?.track('click site contact submit', { url: window.location.href });

        event.preventDefault();

        if (!contactEmailFormInput.value) return;

        contactEmailForm.classList.add('is-disabled');

        const response = await fetch(`${SCRIPT_API}/updateContact/${project.projectSlug}`, {
          headers: { ...headers, 'content-type': 'application/json' },
          method: 'POST',
          body: JSON.stringify({ contactEmail: contactEmailFormInput.value }),
        });
        if (response.ok) {
          await window.alertDialog('Contact email updated!');
          project.contactEmail = contactEmailFormInput.value;
        } else {
          await window.alertDialog(OOPS);
        }

        contactEmailForm.classList.remove('is-disabled');
      };

      const aside = block.querySelector('aside');
      aside.addEventListener('click', (event) => {
        const link = event.target.closest('a');

        if (!link || link.target === '_blank') {
          return;
        }

        event.preventDefault();

        const identifier = link.getAttribute('href');
        // Delegates navigation
        const clickSubNav = () => {
          const allEmailsLink = block.querySelector(`.campaign-list[data-type="${identifier}"] a`);
          if (allEmailsLink) {
            allEmailsLink.click();
          }
        };

        if (!link.classList.contains('is-selected')) {
          if (identifier === 'emails' || identifier === 'analytics') {
            // Delegates navigation
            clickSubNav();
          } else {
            window.history.pushState({}, '', `/${siteType}/${id}/${identifier}`);
          }

          aside.querySelector('.is-selected').classList.remove('is-selected');
          block.querySelector('.details > .is-selected').classList.remove('is-selected');
          block.querySelector('.actions > .is-selected').classList.remove('is-selected');

          block.querySelector(`.details .${identifier}-panel`).classList.add('is-selected');
          block.querySelector(`.actions .${identifier}-actions`).classList.add('is-selected');
          link.classList.add('is-selected');
        } else if (identifier === 'emails' || identifier === 'analytics') {
          clickSubNav();
        }
      });

      window.onpopstate = () => {
        const pathSplit = window.location.pathname.split('/');
        const identifier = pathSplit.pop();
        let link = aside.querySelector(`[href="${identifier}"]`);
        if (link) {
          link.click();
        } else {
          const type = pathSplit.pop();
          link = block.querySelector(`.campaign-list[data-type="${type}"] a[href="${window.location.pathname}"]`);
          if (link) {
            link.click();
          }
        }
      };

      block.querySelector('.sidekick').onclick = () => {
        window?.zaraz?.track('click site sidekick', { url: window.location.href });
      };

      block.querySelector('.edit').onclick = () => {
        window?.zaraz?.track('click site edit', { url: window.location.href });
      };

      block.querySelector('.open').onclick = () => {
        window?.zaraz?.track('click site open', { url: window.location.href });
      };

      block.querySelector('.guides').onclick = () => {
        window?.zaraz?.track('click site guides', { url: window.location.href });
      };

      // MARK: Delete dialog
      // Delete site and redirect to dashboard
      block.querySelector('.delete').onclick = async () => {
        window?.zaraz?.track('click site delete', { url: window.location.href });

        block.classList.add('is-deleting');
        if (await window.confirmDialog('Are you sure you want to delete your site? (This can\'t be undone)')) {
          window?.zaraz?.track('click site delete submit', { url: window.location.href });

          const reqDelete = await fetch(`${SCRIPT_API}/${darkAlleyVariation ? 'da-' : ''}delete/${project.projectSlug}`, {
            method: 'DELETE',
            headers,
          });
          if (reqDelete.ok) {
            // Adding 2s delay to make sure project is deleted from drive
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          } else {
            await window.alertDialog(OOPS);
            block.classList.remove('is-deleting');
          }
        } else {
          block.classList.remove('is-deleting');
        }
      };

      // MARK: update description
      block.querySelector('.update-description.action').onclick = async () => {
        window?.zaraz?.track('click update site description', { url: window.location.href });

        const submit = parseFragment('<button form="update-project-form" type="submit" class="button primary action">Submit</button>');
        const content = parseFragment(`
          <div>
            <h3>Update Site Description</h3>
            
            <form id="update-project-form">
              <label>
                  <span>Description *</span>
                  <textarea required name="projectDescription" placeholder="Enter description here">${project.projectDescription}</textarea>
              </label>
            </form>
          </div>
        `);

        const dialog = window.createDialog(content, [submit]);

        const form = document.getElementById('update-project-form');

        form.onsubmit = async (event) => {
          window.zaraz?.track('click project update', { url: window.location.href });

          event.preventDefault();

          const body = Object.fromEntries(new FormData(form));
          dialog.setLoading(true, 'Updating description...');
          const response = await fetch(`${SCRIPT_API}/description/${project.projectSlug}`, {
            headers: { ...headers, 'content-type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(body),
          });

          if (response.ok) {
            dialog.renderDialog('<h3 class="centered-info">Description successfully updated</h3>');
            project.projectDescription = body.projectDescription;
            const descriptionSpan = block.querySelector('.project-description.card .project-description.span');
            if (descriptionSpan) descriptionSpan.textContent = body.projectDescription;
          } else {
            await window.alertDialog(OOPS);
          }

          dialog.setLoading(false);
        };
      };

      // MARK: page list
      // Load index to list pages
      fetch(`${project.customLiveUrl}/query-index.json?sheet=all`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          throw new Error(res.status);
        })
        // Assuming all templates have the all sheet
        .then(({ data }) => {
          if (!data.length) {
            return;
          }

          const toDate = (lastModified) => new Date(Number(lastModified) * 1000);
          const lastUpdate = Math.max(...data.map(({ lastModified }) => toDate(lastModified)));
          block.querySelector('.last-update').textContent = new Date(lastUpdate).toLocaleString();

          const pages = data.filter(
            ({ template, robots }) => !template?.includes('email') && !robots?.includes('noindex'),
          );
          const navs = data.filter(({ path }) => path?.endsWith('/nav'));
          const footers = data.filter(({ path }) => path?.endsWith('/footer'));
          const emails = data.filter(({ template }) => template?.includes('email'));

          const renderTable = async (tableBody, tableData, type) => {
            const tableRows = tableData.map((item) => {
              const titleEl = document.createElement('div');
              titleEl.innerHTML = item.title;

              const descriptionEl = document.createElement('div');
              descriptionEl.innerHTML = item.description;

              let description = '';
              if (descriptionEl.textContent) {
                if (descriptionEl.textContent.length > 100) {
                  description = `${descriptionEl.textContent.substring(0, 100)}…`;
                } else {
                  description = descriptionEl.textContent;
                }
              }

              const tableRow = document.createElement('tr');

              if (type === 'emails') {
                tableRow.innerHTML = `
                  <tr>
                      <td>${item.path.split('/').pop()}</td>
                      <td>${titleEl.textContent}</td>
                      <td>${description}</td>          
                      <td>${toDate(item.lastModified).toLocaleString()}</td>
                      <td>
                        <div id="email-open-edit" class="button-container">
                          <a class="button action secondary" href="/email/${id}${item.path}" target="_blank">Edit</a>
                          <a class="button action secondary" href="${EMAIL_WORKER_API}/preview/${project.customLiveUrl}${item.path}" target="_blank">Open</a>
                        </div>
                      </td>
                  </tr>
                `;
                return tableRow;
              }

              tableRow.innerHTML = `
                <td>${titleEl.textContent}</td>
                <td>${description}</td>
                <td>${item.path}</td>          
                <td>${new Date(Number(item.lastModified) * 1000).toLocaleString()}</td>
                <td class="table-actions"><a class="button action secondary" href="${project.customLiveUrl}${item.path}" target="_blank">Open</a></td>
                `;

              // add edit button
              const editButton = document.createElement('button');
              editButton.classList.add('button', 'action', 'secondary', 'edit-page', 'edit');
              editButton.target = '_blank';
              editButton.innerText = 'Edit';
              tableRow.lastElementChild.prepend(editButton);

              // TODO: change to link if we drop drive support
              if (!darkAlleyVariation) {
                editButton.onclick = async () => {
                  editButton.classList.add('loading');
                  const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${project.projectSlug}/main${item.path}?editUrl=auto`).then((res) => res.json()).catch(() => null);
                  if (statusData?.edit?.url) {
                    window.open(statusData.edit.url, '_blank');
                  } else {
                    window.open(project.driveUrl, '_blank');
                  }
                  editButton.classList.remove('loading');
                };
              } else {
                editButton.onclick = () => {
                  window.open(`https://da.live/edit#/${daProjectRepo}/${id}${item.path.endsWith('/') ? `${item.path}index` : item.path}`, '_blank');
                };
              }

              return tableRow;
            });
            tableBody.append(...tableRows);
            if (tableBody.matches(':empty')) {
              const cols = tableBody.closest('table').querySelectorAll('th').length;
              tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty">Not enough data</td></tr>`;
            }
          };

          renderTable(block.querySelector('.pages tbody'), pages);
          renderTable(block.querySelector('.navs tbody'), navs);
          renderTable(block.querySelector('.footers tbody'), footers);

          // Fetch campaigns and render emails per campaign
          fetch(`${SCRIPT_API}/campaigns/${id}`, {
            headers,
          }).then((res) => {
            if (res.ok) {
              return res.json();
            }
            return {};
          }).then((campaigns) => {
            document.dispatchEvent(new CustomEvent('campaigns:ready', { detail: { campaigns } }));

            const allCampaignSlugs = Object.keys(campaigns);
            const emailContainer = block.querySelector('.emails-panel .container');

            emailContainer.innerHTML = `
              <ul class="campaign-list" data-type="emails">
                <li><a class="button action secondary ${window.location.pathname.startsWith(`/${siteType}/${id}/emails/`) ? '' : 'is-selected'}" href="/${siteType}/${id}/emails">All emails</a></li>
                ${allCampaignSlugs.map((campaignSlug) => `<li data-campaign="${campaignSlug}"><a class="button action secondary ${window.location.pathname === `/${siteType}/${id}/emails/${campaignSlug}` ? 'is-selected' : ''}" href="/${siteType}/${id}/emails/${campaignSlug}">${campaigns[campaignSlug].name}</li></a>`).join('')}</a>
              </ul>
              <div class="campaign-container"></div>
            `;

            const setCampaignLink = (action, campaign) => {
              if (project.darkAlleyProject) {
                action.href = `https://da.live/#/${daProjectRepo}/${id}/${campaign}`;
              } else {
                action.href = `https://drive.google.com/drive/u/1/search?q=title:${campaign}%20parent:${project.driveId}%20type:folder`;
              }
            };

            const campaignList = emailContainer.querySelector('.campaign-list');
            campaignList.onclick = (event) => {
              if (event.target.matches('a')) {
                event.preventDefault();

                const link = event.target;
                const selectedCampaign = campaignList.querySelector('.is-selected');
                if (selectedCampaign) {
                  selectedCampaign.classList.remove('is-selected');
                }
                link.classList.add('is-selected');

                const newSelectedCampaign = link.closest('[data-campaign]');
                const index = [...campaignList.children].indexOf(link.parentElement);
                emailContainer.querySelector('.campaign:not([hidden])').hidden = true;
                emailContainer.querySelector(`.campaign:nth-child(${index + 1})`).hidden = false;

                block.querySelectorAll('.delete-campaign, .add-email, .open-campaign').forEach((action) => {
                  action.hidden = index === 0;

                  if (action.classList.contains('open-campaign') && !action.hidden) {
                    setCampaignLink(action, newSelectedCampaign.dataset.campaign);
                  }
                });

                window.history.pushState({}, '', link.getAttribute('href'));
              }
            };

            const campaignContainer = block.querySelector('.campaign-container');
            campaignContainer.innerHTML = `
              <div class="campaign" ${window.location.pathname.startsWith(`/${siteType}/${id}/emails/`) ? 'hidden' : ''}>
                <table class="emails">
                   <thead>
                     <tr>
                       <th>Name</th>
                       <th>Title</th>
                       <th>Description</th>
                       <th>Last update</th>
                       <th></th>
                     </tr>
                   </thead>
                   <tbody></tbody>
                 </table>
              </div>
            `;

            renderTable(block.querySelector('.campaign .emails tbody'), emails, 'emails');

            allCampaignSlugs.forEach((campaignSlug) => {
              const campaign = campaigns[campaignSlug];
              const campaignEmails = emails.filter(({ path }) => path.startsWith(`/${campaignSlug}/`));

              campaignContainer.insertAdjacentHTML('beforeend', `
                <div data-campaign="${campaignSlug}" class="campaign campaign-${campaignSlug}" ${window.location.pathname === `/${siteType}/${id}/emails/${campaignSlug}` ? '' : 'hidden'}>
                  <div class="cards">
                    <div>
                        <strong>Campaign</strong>
                        <span>${campaign.name} (${campaignSlug})</span>
                    </div>
                    <div>
                        <strong>Campaign description</strong>
                        <span class="description">${campaign.description}</span>
                        <button title="Edit the Campaign Description" class="button secondary update-campaign-description action">Update</button>
                    </div>
                    <div>
                        <strong>Created</strong>
                        <span>${new Date(campaign.created).toLocaleString()}</span>
                    </div>
                    <div>
                        <strong>Last update</strong>
                        <span class="last-updated">${new Date(campaign.lastUpdated).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <h2>${campaign.name} emails</h2>
                  <table class="emails">
                   <thead>
                     <tr>
                       <th>Name</th>
                       <th>Title</th>
                       <th>Description</th>
                       <th>Last update</th>
                       <th></th>
                     </tr>
                   </thead>
                   <tbody></tbody>
                 </table>
                </div>
              `);

              renderTable(block.querySelector(`.campaign-${campaignSlug} .emails tbody`), campaignEmails, 'emails');
            });

            campaignContainer.onclick = async (event) => {
              if (event.target.matches('.update-campaign-description')) {
                window?.zaraz?.track('click update campaign description', { url: window.location.href });

                const campaign = event.target.closest('.campaign');
                const campaignSlug = campaign.dataset.campaign;
                const description = campaign.querySelector('.description');

                const submit = parseFragment('<button form="update-campaign-form" type="submit" class="button primary action">Update Campaign</button>');
                const content = parseFragment(`
                  <div>
                    <h3>Update campaign</h3>
                    
                    <form id="update-campaign-form">
                      <label>
                          <span>Description *</span>
                          <textarea required name="description" placeholder="All monthly newsletters for subscribers">${description.textContent}</textarea>
                      </label>
                    </form>
                  </div>
                `);

                const dialog = window.createDialog(content, [submit]);
                const form = document.getElementById('update-campaign-form');

                form.onsubmit = async (e) => {
                  window.zaraz?.track('click campaign update', { url: window.location.href });

                  e.preventDefault();

                  dialog.setLoading(true, 'Updating description...');
                  const body = Object.fromEntries(new FormData(form));
                  const reqUpdate = await fetch(`${SCRIPT_API}/campaigns/${id}/${campaignSlug}`, {
                    headers: { ...headers, 'content-type': 'application/json' },
                    method: 'PATCH',
                    body: JSON.stringify(body),
                  });

                  if (reqUpdate.ok) {
                    const update = await reqUpdate.json();
                    dialog.renderDialog('<h3 class="centered-info" >Description Updated</h3>');

                    description.textContent = update.description;
                    campaign.querySelector('.last-updated').textContent = new Date(update.lastUpdated).toLocaleString();
                  } else {
                    await window.alertDialog(OOPS);
                  }

                  dialog.setLoading(false);
                };
              }
            };

            block.querySelector('.add-campaign').onclick = async () => {
              const submit = parseFragment('<button form="create-campaign-form" type="submit" class="button primary action">Create Campaign</button>');
              const content = parseFragment(`
                <div>
                  <h3>Create a new campaign</h3>
                  
                  <form id="create-campaign-form">
                    <p>
                        Start your email marketing campaign with individual email messages with specific purposes including the following: downloading a PDF, sign up for a newsletter, or make a purchase.
                    </p>
                    <label>
                        <span>Name *</span>
                        <input required name="name" type="text" placeholder="Newsletters"/>
                    </label>
                    <label>
                        <span>Description</span>
                        <textarea name="description" placeholder="All monthly newsletters for subscribers"></textarea>
                    </label>
                  </form>
                </div>
              `);

              const dialog = window.createDialog(content, [submit]);
              const form = document.getElementById('create-campaign-form');

              form.onsubmit = async (e) => {
                window.zaraz?.track('click create campaign', { url: window.location.href });

                e.preventDefault();

                dialog.setLoading(true, 'Creating Campaign...');

                const req = await fetch(`${SCRIPT_API}/campaigns/${id}`, {
                  headers: { ...headers, 'content-type': 'application/json' },
                  method: 'POST',
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });

                if (!req.ok) {
                  dialog.setLoading(false);
                  await window.alertDialog(await req.text());
                } else {
                  const newCampaign = await req.json();

                  block.querySelectorAll('.campaign-list').forEach((el) => {
                    el.insertAdjacentHTML('beforeend', `
                      <li data-campaign="${newCampaign.slug}"><a class="button action secondary" href="/${siteType}/${id}/${el.dataset.type}/${newCampaign.slug}">${newCampaign.name}</li></a>
                    `);
                  });

                  campaignContainer.insertAdjacentHTML('beforeend', `
                    <div class="campaign campaign-${newCampaign.slug}" hidden>
                      <div class="cards">
                        <div>
                            <strong>Campaign</strong>
                            <span>${newCampaign.name} (${newCampaign.slug})</span>
                        </div>
                        <div>
                            <strong>Campaign description</strong>
                            <span class="description">${newCampaign.description}</span>
                            <button title="Edit the Campaign Description" class="button secondary update-campaign-description action">Update</button>
                        </div>
                        <div>
                            <strong>Created</strong>
                            <span>${new Date(newCampaign.created).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Last update</strong>
                            <span class="last-updated">${new Date(newCampaign.lastUpdated).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <h2>${newCampaign.name} emails</h2>
                      <table class="emails">
                       <thead>
                         <tr>
                           <th>Name</th>
                           <th>Title</th>
                           <th>Description</th>
                           <th>Last update</th>
                           <th></th>
                         </tr>
                       </thead>
                       <tbody></tbody>
                     </table>
                    </div>
                  `);

                  const newCampaignEmails = emails.filter(({ path }) => path.startsWith(`/${newCampaign.slug}/`));
                  renderTable(campaignContainer.querySelector(`.campaign-${newCampaign.slug} .emails tbody`), newCampaignEmails, 'emails');

                  campaignList.querySelector('li:last-child a').click();

                  dialog.setLoading(false);
                  dialog.close();
                }
              };
            };

            const addEmail = block.querySelector('.add-email');
            addEmail.onclick = async () => {
              const submit = parseFragment('<button form="add-email-form" type="submit" class="button primary action">Add Email</button>');
              const content = parseFragment(`
                <div>
                  <h3>Add email to Campaign</h3>
                  
                  <div class="columns">
                    <form id="add-email-form">
                      <p>Add a newsletter email to your campaign</p>
                      <label>
                          <span>Name *</span>
                          <input required name="pageName" type="text" placeholder="Monthly Newsletter">
                          <p></p>
                      </label>
                      <input type="hidden" name="templatePath" value="/newsletter">
                    </form>
                    <iframe src="${EMAIL_WORKER_API}/preview/https://main--${project.templateSlug}--headwire-self-service-templates.hlx.live/newsletter"></iframe>
                  </div>
                </div>
              `);

              const dialog = window.createDialog(content, [submit], { fullscreen: true });
              const form = document.getElementById('add-email-form');

              form.onsubmit = async (e) => {
                window.zaraz?.track('click add email', { url: window.location.href });

                e.preventDefault();

                dialog.setLoading(true, 'Adding email...');

                const campaignSlug = window.location.pathname.split('/').pop();

                const body = Object.fromEntries(new FormData(form));
                const req = await fetch(`${SCRIPT_API}/campaigns/${id}/${campaignSlug}`, {
                  headers: { ...headers, 'content-type': 'application/json' },
                  method: 'POST',
                  body: JSON.stringify(body),
                });

                if (!req.ok) {
                  dialog.setLoading(false);
                  await window.alertDialog(await req.text());
                } else {
                  dialog.setLoading(false);

                  const buttons = [];
                  let draftHref;
                  let editHref;

                  if (project.darkAlleyProject) {
                    const { daPath, daNewPageSlug } = await req.json();
                    draftHref = `https://da.live/#${daPath}`;
                    editHref = `https://da.live/edit#${daPath}/${daNewPageSlug}`;
                  } else {
                    const { newPageId, folderId } = await req.json();
                    draftHref = `https://drive.google.com/drive/folders/${folderId}`;
                    editHref = `https://docs.google.com/document/d/${newPageId}/edit`;
                  }

                  const draftsLink = parseFragment(`
                    <a class="button secondary action" href="${draftHref}" target="_blank">Campaign ${campaignSlug} Folder</a>
                  `);
                  buttons.push(draftsLink);

                  const editLink = parseFragment(`
                    <a class="button primary action" href="${editHref}" target="_blank">Edit ${body.pageName}</a>
                  `);
                  buttons.push(editLink);

                  dialog.renderDialog(`<h3 class="centered-info" >${body.pageName} email added to Campaign ${campaignSlug}</h3>`, buttons);
                }
              };
            };

            block.querySelector('.delete-campaign').onclick = async (event) => {
              const campaignSlug = window.location.pathname.split('/')[4];
              if (campaignSlug) {
                if (await window.confirmDialog('Are you sure ?')) {
                  window?.zaraz?.track('click campaign delete submit', { url: window.location.href });

                  event.target.classList.add('is-disabled');
                  const deleteReq = await fetch(`${SCRIPT_API}/campaigns/${id}/${campaignSlug}`, {
                    method: 'DELETE',
                    headers,
                  });

                  if (deleteReq.ok) {
                    block.querySelector(`.campaign-list[data-type="emails"] li[data-campaign="${campaignSlug}"]`).remove();
                    block.querySelector('.campaign-list[data-type="emails"] a').click();

                    const li = block.querySelector(`.campaign-list[data-type="analytics"] li[data-campaign="${campaignSlug}"]`);
                    if (li.querySelector('.is-selected')) {
                      li.parentElement.firstElementChild.querySelector('a').classList.add('is-selected');
                    }
                    li.remove();

                    window.history.replaceState({}, '', `/${siteType}/${id}/emails`);
                  } else {
                    await window.alertDialog(OOPS);
                  }
                  event.target.classList.remove('is-disabled');
                }
              }
            };

            block.querySelectorAll('.delete-campaign, .add-email, .open-campaign').forEach((action) => {
              action.hidden = !window.location.pathname.startsWith(`/${siteType}/${id}/emails/`);
              if (action.classList.contains('open-campaign') && !action.hidden) {
                setCampaignLink(action, window.location.pathname.split('/').pop());
              }
            });
          });
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.log(error);
        });

      // MARK: audience
      // Load recipients sheet
      fetch(`${SCRIPT_API}/${project.darkAlleyProject ? 'daSheets' : 'sheets'}/${id}?sheetPath=recipients`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          return false;
        })
        .then((recipients) => {
          const audienceActions = block.querySelector('.audience-actions');
          if (!audienceActions.querySelector('a')) {
            audienceActions.insertAdjacentHTML('beforeend', `
                <a href="${project.darkAlleyProject ? `https://da.live/edit#/da-self-service/${id}/recipients` : `https://docs.google.com/spreadsheets/d/${recipients.id}/edit`}" class="button primary action" target="_blank">Edit</a>
              `);
          }

          const audience = block.querySelector('.audience-panel .container');
          if (!recipients) {
            audience.textContent = 'No recipients spreadsheet found';
            return;
          }

          if (!recipients.data.length) {
            audience.textContent = 'No audience found';
            return;
          }

          audience.innerHTML = `
              <table>
                <thead>
                  <tr>
                      ${recipients.headers.map((key) => `<th>${key}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${recipients.data.map((row) => `<tr>
                      ${recipients.headers.map((key) => `<td>${row[key] ? row[key] : ''}</td>`).join('')}
                  </tr>`).join('')}
                </tbody>
              </table>
            `;
        });

      // MARK: add page button
      block.querySelector('.add-page').onclick = () => {
        addPageDialogSetup({ project, headers, darkAlleyVariation });
      };

      // Load site blocks
      renderBlocksList(block, { project, headers, id });

      // Load site icons
      renderIconsList(block, { project, headers, id });

      // project updates
      const updateInfoDiv = block.querySelector('.update-info');
      const prevUpdateInfoDiv = block.querySelector('.prev-update-info');
      renderUpdatesSection(updateInfoDiv, { project, headers });
      renderPrevUpdatesSection(prevUpdateInfoDiv, {
        project, headers, rerenderUpdatesSection: renderUpdatesSection, updateInfoDiv,
      });

      // MARK: Favicon
      block.querySelector('.change-favicon').onclick = () => addIconDialogSetup({
        id,
        headers,
        titleText: 'Favicon',
        fileAccept: '.ico',
        uploadEndpoint: `${SCRIPT_API}/favicon/${id}`,
        defaultSrc: `https://main--${id}--${darkAlleyVariation ? 'da-self-service' : 'headwire-self-service'}.hlx.page/favicon.ico`,
      });

      // calendar link
      if (project.calendarId) {
        addGoogleCalendarLink(project.calendarId, block.querySelector('.settings-actions'));
      }

      // Load web analytics
      const loadWebAnalytics = async (interval) => Promise.all([
        `${SCRIPT_API}/monitoring/${project.projectSlug}?period=${interval}`,
        `${SCRIPT_API}/cww/${project.projectSlug}?period=${interval}`,
      ].map(async (url) => {
        const req = await fetch(url, { headers });
        if (!req.ok) {
          throw new Error(req.status);
        }
        return req.json();
      }));

      const analytics = await loadWebAnalytics('1d');

      const { countries } = await import('./countries.js');

      // Load chart.js
      await import('../../libs/chart/chart.min.js');
      await import('../../libs/chart/chart-utils.min.js');

      const Utils = window.ChartUtils.init();

      const roundUpToNearestInterval = (date, intervalMinutes) => {
        const minutes = date.getMinutes();
        const roundedMinutes = Math.ceil(minutes / intervalMinutes) * intervalMinutes;
        date.setMinutes(roundedMinutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
      };

      const generateTimeSeries = (intervalChoice) => {
        let intervalMinutes;
        let daysBack;

        switch (intervalChoice) {
          case '1d':
            intervalMinutes = 15;
            daysBack = 1; // 24 hours
            break;
          case '7d':
            intervalMinutes = 60;
            daysBack = 7; // 7 days
            break;
          case '30d':
            intervalMinutes = 1440; // 24 hours * 60 minutes
            daysBack = 30; // 30 days
            break;
          default:
            throw new Error('Invalid interval choice.');
        }

        const intervalMillis = intervalMinutes * 60 * 1000;
        const totalIntervals = (daysBack * 24 * 60) / intervalMinutes;

        let now = new Date();
        now = roundUpToNearestInterval(now, intervalMinutes);

        const timeSeries = [];

        for (let i = 0; i <= totalIntervals; i += 1) {
          const timePoint = new Date(now.getTime() - (i * intervalMillis));
          timeSeries.unshift(timePoint);
        }

        return timeSeries;
      };

      const container = block.querySelector('.monitoring-panel .container');
      const period = block.querySelector('.period-selector');

      const renderWebAnalytics = ([metrics, cww]) => {
        const totalVisits = metrics[0].data.viewer.accounts[0]?.total[0]?.sum?.visits ?? 0;
        const totalPageViews = metrics[0].data.viewer.accounts[0]?.total[0]?.count ?? 0;
        const medianPageLoadTime = metrics[2].data.viewer.accounts[0]?.totalPerformance[0]?.aggregation?.pageLoadTime ?? 0;

        const visitsDelta = metrics[2].data.viewer.accounts[0].visitsDelta[0] ? ((totalVisits * 100) / metrics[2].data.viewer.accounts[0].visitsDelta[0].sum.visits) - 100 : 0;
        const pageViewsDelta = metrics[2].data.viewer.accounts[0].pageviewsDelta[0] ? ((totalPageViews * 100) / metrics[2].data.viewer.accounts[0].pageviewsDelta[0].count) - 100 : 0;
        const performanceDelta = metrics[2].data.viewer.accounts[0].performanceDelta[0] ? ((medianPageLoadTime * 100) / metrics[2].data.viewer.accounts[0].performanceDelta[0].aggregation.pageLoadTime) - 100 : 0;

        container.innerHTML = `
          <div class="cards">
            <div id="total-visits">
                <strong>Total visits</strong>
                <span>${totalVisits}</span>
                ${visitsDelta !== 0 ? `<span class="${visitsDelta < 0 ? 'red' : 'green'}">${visitsDelta > 0 ? '+' : ''}${visitsDelta}%</span>` : ''}
            </div>
            <div id="total-page-views">
                <strong>Total page views</strong>
                <span>${totalPageViews}</span>
                ${pageViewsDelta !== 0 ? `<span class="${pageViewsDelta < 0 ? 'red' : 'green'}">${pageViewsDelta > 0 ? '+' : ''}${pageViewsDelta}%</span>` : ''}
            </div>
            <div id="median-page-load">
                <strong>Median page load time</strong>
                <span>${medianPageLoadTime / 1000}ms</span>
                ${performanceDelta !== 0 ? `<span class="${performanceDelta < 0 ? 'red' : 'green'}">${performanceDelta > 0 ? '+' : ''}${performanceDelta}%</span>` : ''}
            </div>
          </div>

          <div class="chart-container">
              <canvas id="chart" width="600" height="400"></canvas>
          </div>

          <div id="monitoring-details">
          <div id="visits-details">
            <h2>Visits details</h2>
            <div class="cards metrics">
                <div id="visits-details-country">
                    <strong>By country</strong>
                    ${metrics[0].data.viewer.accounts[0].countries.map((country) => `
                      <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${country.sum.visits}</span></span>
                    `).join('')}
                </div>
                <div id="visits-details-referers">
                    <strong>By referers</strong>
                    ${metrics[0].data.viewer.accounts[0].topReferers.map((referer) => `
                      <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${referer.sum.visits}</span></span>
                    `).join('')}
                </div>
                <div id="visits-details-paths">
                    <strong>By paths</strong>
                    ${metrics[0].data.viewer.accounts[0].topPaths.map((paths) => `
                      <span>${paths.dimensions.metric}: <span>${paths.sum.visits}</span></span>
                    `).join('')}
                </div>
                <div id="visits-details-browsers">
                    <strong>By browsers</strong>
                    ${metrics[0].data.viewer.accounts[0].topBrowsers.map((browsers) => `
                      <span>${browsers.dimensions.metric}: <span>${browsers.sum.visits}</span></span>
                    `).join('')}
                </div>
                <div id="visits-details-os">
                    <strong>By operating systems</strong>
                    ${metrics[0].data.viewer.accounts[0].topOSs.map((OSs) => `
                      <span>${OSs.dimensions.metric}: <span>${OSs.sum.visits}</span></span>
                    `).join('')}
                </div>
                <div id="visits-details-devices">
                    <strong>By device type</strong>
                    ${metrics[0].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `
                      <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.sum.visits}</span></span>
                    `).join('')}
                </div>
            </div>
          </div>

          <div id="page-views-details">
            <h2>Page views details</h2>
            <div class="cards metrics">
              <div id="page-views-details-country">
                  <strong>By country</strong>
                  ${metrics[0].data.viewer.accounts[0].countries.map((country) => `
                    <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${country.count}</span></span>
                  `).join('')}
              </div>
              <div id="page-views-details-referers">
                  <strong>By referers</strong>
                  ${metrics[0].data.viewer.accounts[0].topReferers.map((referer) => `
                    <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${referer.count}</span></span>
                  `).join('')}
              </div>
              <div id="page-views-details-paths">
                  <strong>By paths</strong>
                  ${metrics[0].data.viewer.accounts[0].topPaths.map((paths) => `
                    <span>${paths.dimensions.metric}: <span>${paths.count}</span></span>
                  `).join('')}
              </div>
              <div id="page-views-details-browsers">
                  <strong>By browsers</strong>
                  ${metrics[0].data.viewer.accounts[0].topBrowsers.map((browsers) => `
                    <span>${browsers.dimensions.metric}: <span>${browsers.count}</span></span>
                  `).join('')}
              </div>
              <div id="page-views-details-os">
                  <strong>By operating systems</strong>
                  ${metrics[0].data.viewer.accounts[0].topOSs.map((OSs) => `
                    <span>${OSs.dimensions.metric}: <span>${OSs.count}</span></span>
                  `).join('')}
              </div>
              <div id="page-views-details-devices">
                  <strong>By device type</strong>
                  ${metrics[0].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `
                    <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.count}</span></span>
                  `).join('')}
              </div>
            </div>
          </div>

          <div id="pageload-details">
            <h2>Page load time details</h2>
            <div class="cards metrics">
              <div id="pageload-details-country">
                  <strong>By country</strong>
                  ${metrics[3].data.viewer.accounts[0].countries.map((country) => `
                    <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${country.count}</span></span>
                  `).join('')}
              </div>
              <div id="pageload-details-referers">
                  <strong>By referers</strong>
                  ${metrics[3].data.viewer.accounts[0].topReferers.map((referer) => `
                    <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${referer.count}</span></span>
                  `).join('')}
              </div>
              <div id="pageload-details-paths">
                  <strong>By paths</strong>
                  ${metrics[3].data.viewer.accounts[0].topPaths.map((paths) => `
                    <span>${paths.dimensions.metric}: <span>${paths.count}</span></span>
                  `).join('')}
              </div>
              <div id="pageload-details-browsers">
                  <strong>By browsers</strong>
                  ${metrics[3].data.viewer.accounts[0].topBrowsers.map((browsers) => `
                    <span>${browsers.dimensions.metric}: <span>${browsers.count}</span></span>
                  `).join('')}
              </div>
              <div id="pageload-details-os">
                  <strong>By operating systems</strong>
                  ${metrics[3].data.viewer.accounts[0].topOSs.map((OSs) => `
                    <span>${OSs.dimensions.metric}: <span>${OSs.count}</span></span>
                  `).join('')}
              </div>
              <div id="pageload-details-devices">
                  <strong>By device type</strong>
                  ${metrics[3].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `
                    <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.count}</span></span>
                  `).join('')}
              </div>
            </div>
          </div>
          </div>
          
          <div id="core-web-vitals">
          <h2>Core Web Vitals</h2>

          <div class="cards">
              ${['lcp', 'inp', 'fid', 'cls'].map((metric) => `
                <div>
                  <strong>${metric.toUpperCase()}</strong>
                  <span>Excellent (${metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}Good`] ?? '0'})</span>
                  <span>Good (${metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}NeedsImprovement`] ?? '0'})</span>
                  <span>Needs improvement (${metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}Poor`] ?? '0'})</span>
                </div>
                `).join('')}
          </div>
          </div>
          
          <div id="core-web-vitals-path-browsers">
          <h2>By Path and Browsers</h2>
          
          <div class="cards metrics">
            <div>
                <strong>LCP</strong>
                ${cww[0].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.largestContentfulPaintPath)
    .map((rum) => `
                    <span>Path: <span>${rum.dimensions.largestContentfulPaintPath}</span></span>
                    <ul>
                      <li>Excellent (${rum?.sum.lcpGood ?? '0'})</li>
                      <li>Good (${rum?.sum.lcpNeedsImprovement ?? '0'})</li>
                      <li>Needs improvement (${rum?.sum.lcpPoor ?? '0'})</li>
                    </ul>
                  `).join('')}
            </div>
            <div>
                <strong>INP</strong>
                ${cww[1].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.userAgentBrowser)
    .map((rum) => `
                    <span>Browser: <span>${rum.dimensions.userAgentBrowser}</span></span>
                    <ul>
                        <li>Excellent (${rum?.sum.inpGood ?? '0'})</li>
                        <li>Good (${rum?.sum.inpNeedsImprovement ?? '0'})</li>
                        <li>Needs improvement (${rum?.sum.inpPoor ?? '0'})</li>
                    </ul>
                  `).join('')}
            </div>
            <div>
                <strong>FID</strong>
                ${cww[1].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.firstInputDelayPath)
    .map((rum) => `
                  <span>Path: <span>${rum.dimensions.firstInputDelayPath}</span></span>
                  <ul>
                    <li>Excellent (${rum?.sum.fidGood ?? '0'})</li>
                    <li>Good (${rum?.sum.fidNeedsImprovement ?? '0'})</li>
                    <li>Needs improvement (${rum?.sum.fidPoor ?? '0'})</li>
                  </ul>
                `).join('')}
            </div>
            <div>
                <strong>CLS</strong>
                ${cww[1].data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups
    .filter((rum) => rum?.dimensions?.cumulativeLayoutShiftPath)
    .map((rum) => `
                  <span>Path: <span>${rum.dimensions.cumulativeLayoutShiftPath}</span></span>
                  <ul>
                    <li>Excellent (${rum?.sum.clsGood ?? '0'})</li>
                    <li>Good (${rum?.sum.clsNeedsImprovement ?? '0'})</li>
                    <li>Needs improvement (${rum?.sum.clsPoor ?? '0'})</li>
                  </ul>
                `).join('')}
            </div>
          </div>
          </div>
        `;

        const series = generateTimeSeries(period.value);

        const labels = series.map((d) => (period.value === '30d' ? d.toLocaleDateString() : d.toLocaleString()));

        const visitsData = [];
        const pageViewsData = [];

        series.forEach((d) => {
          const found = metrics[1].data.viewer.accounts[0].series.find((serie) => (period.value === '30d' ? d.toLocaleDateString() === new Date(serie.dimensions.ts).toLocaleDateString() : d.getTime() === new Date(serie.dimensions.ts).getTime()));

          if (found) {
            visitsData.push(found.sum.visits);
            pageViewsData.push(found.count);
          } else {
            visitsData.push(0);
            pageViewsData.push(0);
          }
        });

        const config = {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Visits',
                data: visitsData,
                fill: false,
                borderColor: Utils.CHART_COLORS.blue,
              },
              {
                label: 'Page views',
                data: pageViewsData,
                fill: false,
                borderColor: Utils.CHART_COLORS.red,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        };

        // eslint-disable-next-line no-new
        new window.Chart(document.getElementById('chart'), config);
      };

      period.onchange = async () => {
        window?.zaraz?.track('change analytics period', { url: window.location.href });
        container.innerHTML = '<img src="/icons/loading.svg" alt="loading" loading="lazy"/>';
        renderWebAnalytics(await loadWebAnalytics(period.value));
      };

      renderWebAnalytics(analytics);
    } else if (reqDetails.status === 404) {
      block.querySelector('.content p').innerHTML = `<p>Project "${id}" not found. Create it <a href="/">here!</a></p>`;
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
