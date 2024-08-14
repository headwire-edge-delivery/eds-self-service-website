/* eslint-disable max-len */

import {
  SCRIPT_API, onAuthenticated, OOPS, EMAIL_WORKER_API,
  daProjectRepo,
  projectRepo,
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
  extraHtml = '', uploadEndpoint = `${SCRIPT_API}/icons/${id}`,
  defaultSrc,
}) {
  window?.zaraz?.track(`click site ${titleText === 'Favicon' ? 'favicon' : 'icon'} add`, { url: window.location.href });

  const dialogContent = document.createElement('div');

  const title = document.createElement('h3');
  title.innerText = titleText;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = fileAccept;
  const faviconDescription = document.createElement('p');
  faviconDescription.innerHTML = 'Don\'t have an .ico file yet? You can convert your image to a .ico file <a href="https://www.icoconverter.com/" target="_blank">here</a>.';
  const preview = document.createElement('div');
  preview.classList.add('preview');
  if (defaultSrc) {
    preview.innerHTML = `<img alt="favicon" src="${defaultSrc}" loading="lazy" />`;
  }

  if (titleText === 'Favicon') {
    dialogContent.append(title, faviconDescription, input, preview);
  } else {
    dialogContent.append(title, input, preview);
  }

  if (extraHtml) {
    dialogContent.insertAdjacentHTML('beforeend', extraHtml);
  }

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

  const addButton = document.createElement('button');
  addButton.innerText = 'Save';
  addButton.title = 'Save Icon';
  const dialog = window.createDialog(dialogContent, [addButton]);
  addButton.onclick = async () => {
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

  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = `
    <h3>${name} ${isIcon ? 'Icon' : 'Block'}</h3>
    <p>${deleteWarning || ''}</p>
    ${iconBase64 ? `<div class="preview"><img class="icon-display" src="${iconBase64}" alt="icon display" /></div>` : ''}
  `;

  if (showBlockScreenshots) {
    const blockPreview = document.createElement('div');
    blockPreview.classList.add('block-preview');

    fetch(`${SCRIPT_API}/blockScreenshots/${project.projectSlug}/${name}`)
      .then((response) => response.json())
      .then((data) => {
        data.forEach((screenshot) => {
          const img = document.createElement('img');
          img.src = `http://main--${project.templateSlug}--headwire-self-service-templates.hlx.live/${screenshot.substring(2)}`;
          blockPreview.append(img);
        });
        dialogContent.append(blockPreview);
      });
  }

  const buttonList = [];

  // MARK: replace icon button
  if (isIcon) {
    const replaceButton = document.createElement('button');
    replaceButton.innerText = 'Replace';
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
  const deleteButton = document.createElement('button');
  deleteButton.innerText = 'Delete';
  buttonList.push(deleteButton);
  if (protectedBlocks[name]) {
    deleteButton.disabled = true;
  }
  deleteButton.onclick = async (event) => {
    window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} delete submit`, { url: window.location.href });

    const dialogParent = event.target.closest('dialog');
    deleteButton.disabled = true;
    dialogParent.classList.add('loading');
    dialogParent.dataset.loadingText = 'Deleting...';
    const delResponse = await fetch(`${SCRIPT_API}/${isIcon ? 'icons' : 'blocks'}/${project.projectSlug}/${name}`, {
      method: 'DELETE',
      headers,
    });
    if (delResponse.ok) {
      dialogContent.innerHTML = `
      <h3 class="centered-info" >${name} deleted</h3>
      `;
      deleteButton.remove();
      document
        .querySelectorAll(`li[data-block-name="${name}"], li[data-icon-name="${name}"]`)
        .forEach((item) => item.remove());
    } else {
      await window.alertDialog(OOPS);
    }
    deleteButton.disabled = null;
    dialogParent.classList.remove('loading');
  };

  window.createDialog(dialogContent, buttonList);
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

    const content = document.createElement('div');
    content.innerHTML = '<h3>Add block</h3>';

    const select = document.createElement('select');
    select.className = 'button secondary action';
    select.innerHTML = data
      .map(
        (blockOption) => `<option data-block-create-info="${blockOption.createInfo || ''}" value="${blockOption.name}">${
          blockOption.name
        }</option>`,
      )
      .join('');

    const blockInfo = document.createElement('p');
    blockInfo.style.width = '100%';
    const blockPreview = document.createElement('div');
    blockPreview.classList.add('block-preview');

    select.onchange = () => {
      blockInfo.innerText = select.querySelector(`option[value="${select.value}"]`).dataset.blockCreateInfo;

      fetch(`${SCRIPT_API}/blockScreenshots/${project.projectSlug}/${select.value}`)
        .then((response) => response.json())
        .then((screenshotData) => {
          blockPreview.innerHTML = '';
          screenshotData.forEach((screenshot) => {
            const img = document.createElement('img');
            img.src = `http://main--${project.templateSlug}--headwire-self-service-templates.hlx.live/${screenshot.substring(2)}`;
            blockPreview.append(img);
          });
        });
    };
    select.onchange();

    content.append(select, blockInfo, blockPreview);

    const addButton = document.createElement('button');
    addButton.innerText = 'Add';

    addButton.onclick = async () => {
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
          const calendarLink = document.createElement('a');
          calendarLink.classList.add('button');
          calendarLink.href = `https://calendar.google.com/calendar/render?cid=${addRequestData.calendarId}`;
          calendarLink.target = '_blank';
          calendarLink.innerText = 'Google Calendar';
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
    dialog.renderDialog(content, [addButton]);
  });
}

// MARK: add page dialog
function addPageDialogSetup({
  project, headers, darkAlleyVariation,
}) {
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('flex-row');
  const form = document.createElement('form');
  form.id = 'add-page-form';
  const info = document.createElement('p');
  info.innerHTML = '<strong>The newly created document will appear in the drafts folder. Make sure to move it to your desired path before attempting to publish! Draft files cannot be published.</strong>';
  const nameLabel = document.createElement('label');
  nameLabel.innerHTML = '<span>Page Name</span>';
  const pageNameInput = document.createElement('input');
  pageNameInput.name = 'pageName';
  pageNameInput.required = true;
  nameLabel.append(pageNameInput);

  const dropdown = document.createElement('select');
  dropdown.name = 'templatePath';
  dropdown.disabled = true;
  dropdown.innerHTML = '<option>Loading...</option>';

  const previewIframe = document.createElement('iframe');
  previewIframe.classList.add('template-preview', 'hidden');
  previewIframe.width = '100%';
  previewIframe.height = '400';

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
    previewIframe.classList.remove('hidden');
    previewIframe.src = `${templateUrl}${dropdown.value}`;
    // eslint-disable-next-line no-console
  }).catch((err) => console.error(err));

  dropdown.onchange = () => {
    // eslint-disable-next-line no-console
    console.log('\x1b[34m ~ TEST:');
    previewIframe.src = `${templateUrl}${dropdown.value}`;
  };

  const submit = document.createElement('button');
  submit.classList.add('button', 'primary', 'action');
  submit.type = 'submit';
  submit.setAttribute('form', 'add-page-form');
  submit.innerText = 'Create Page';

  form.append(info, nameLabel, dropdown);
  dialogContent.append(form, previewIframe);

  const dialog = window.createDialog(dialogContent, [submit], { fullscreen: true });

  // submit.onclick = () => form.dispatchEvent(new Event('submit', { cancelable: true }));
  form.onsubmit = async (event) => {
    event.preventDefault();
    // if (!form.checkValidity()) {
    //   form.reportValidity();
    //   return;
    // }
    window.zaraz?.track('click site page add', { url: window.location.href });

    dialog.setLoading(true, 'Copying and setting up page...');
    const addPageRequest = await fetch(`${SCRIPT_API}/${darkAlleyVariation ? 'daAddPage' : 'addPage'}/${project.projectSlug}`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ pageName: pageNameInput.value, templatePath: dropdown.value }),

    });
    if (addPageRequest.ok) {
      const responseData = await addPageRequest.json().catch(() => ({}));

      const buttons = [];

      if (responseData?.draftsFolderId) {
        const draftsLink = document.createElement('a');
        draftsLink.classList.add('button', 'secondary', 'action');
        draftsLink.href = `https://drive.google.com/drive/folders/${responseData.draftsFolderId}`;
        draftsLink.target = '_blank';
        draftsLink.innerText = 'Drafts Folder';

        buttons.push(draftsLink);
      }

      if (responseData.daDraftsPath) {
        const draftsLink = document.createElement('a');
        draftsLink.classList.add('button', 'secondary', 'action');
        draftsLink.href = `https://da.live/#${responseData.daDraftsPath}`;
        draftsLink.target = '_blank';
        draftsLink.innerText = 'Drafts Folder';
        buttons.push(draftsLink);

        if (responseData.daNewPageSlug) {
          const editLink = document.createElement('a');
          editLink.classList.add('button', 'primary', 'action');
          editLink.href = `https://da.live/edit#${responseData.daDraftsPath}/${responseData.daNewPageSlug}`;
          editLink.target = '_blank';
          editLink.innerText = `Edit ${pageNameInput.value}`;
          buttons.push(editLink);
        }
      }

      if (responseData?.newPageId) {
        const editLink = document.createElement('a');
        editLink.classList.add('button', 'primary', 'action');
        editLink.href = `https://docs.google.com/document/d/${responseData.newPageId}/edit`;
        editLink.target = '_blank';
        editLink.innerText = `Edit ${pageNameInput.value}`;

        buttons.push(editLink);
      }

      dialog.renderDialog(`<h3 class="centered-info" >${pageNameInput.value} page added to drafts</h3>`, buttons);
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

    const updateButton = document.createElement('button');
    updateButton.classList.add('button', 'action', 'primary', 'update-button');
    updateButton.innerText = 'Update';
    updateButton.onclick = async () => {
      const dialogContent = document.createElement('div');
      dialogContent.innerHTML = `
        <h3>Update Project</h3>
        <p>Are you sure you want to update this project? This will take a short while.</p>
        ${versionInfo.updateLevel === 'major' ? '<p class="warning"><strong>This is a major update! It is possible some blocks will need to be updated by authors.</strong></p>' : ''}
        <p>This action can be undone, but changes to icons, blocks, and site theme made after an update, will also be reverted when undone.</p>
      `;
      const confirmUpdateButton = document.createElement('button');
      confirmUpdateButton.classList.add('button', 'action', 'secondary', 'update-button');
      confirmUpdateButton.innerText = 'Update';

      const cancelButton = document.createElement('button');
      cancelButton.classList.add('button', 'action', 'primary', 'update-button');
      cancelButton.innerText = 'Cancel';

      const projectUpdateDialog = window.createDialog(dialogContent, [confirmUpdateButton, cancelButton]);

      confirmUpdateButton.onclick = async () => {
        window?.zaraz?.track('did site update', { url: window.location.href });

        projectUpdateDialog.dataset.loadingText = 'Updating...';
        projectUpdateDialog.setLoading(true);

        const updateResponse = await fetch(`${endpoint}update/${project.projectSlug}`, { headers });
        if (updateResponse.ok) {
          projectUpdateDialog.renderDialog('<h3 class="centered-info">Project updated successfully!</h3>');
          // replace update button
          div.innerHTML = '<h3>Your project is up to date!</h3>';
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
    div.innerHTML += '<h3>No updates available.</h3>';
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
    const dialogContent = document.createElement('div');
    dialogContent.innerHTML = '<h3>Revert Project</h3><h4 class="centered-info">Loading previous updates...</h4>';
    const revertUpdateDialog = window.createDialog(dialogContent, []);

    const updateList = await fetch(`${endpoint}appliedUpdates/${project.projectSlug}`, { headers }).then((res) => res.json()).catch(() => null);
    if (updateList.length > 0) {
      dialogContent.innerHTML = `
        <h3>Revert Updates to Project</h3>
        <p class="warning">Keep in mind, any changes made on the options and theme pages after an update will <strong>also</strong> be reverted! <strong>This action cannot be undone!</strong></p>
        `;
      const revertForm = document.createElement('form');
      revertForm.id = 'revert-form';
      revertForm.innerHTML = `
        <form id="revert-form">
          <ul class="applied-update-list">
            ${updateList.map((update) => `<li><label><input required type="radio" name="update" data-version="${update.version}" value="${update.sha}"><span>Version: <strong>${update.version}</strong></span><span>Updated on: <strong>${new Date(update.date).toLocaleString(undefined, {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  })}</strong></span></label></li>`).join('')}
          </ul>
        </form>
      `;
      dialogContent.append(revertForm);

      const revertButton = document.createElement('button');
      revertButton.classList.add('button', 'action', 'secondary', 'update-button');
      revertButton.setAttribute('form', 'revert-form');
      revertButton.type = 'submit';
      revertButton.innerText = 'Undo Update';
      revertButton.disabled = true;
      revertUpdateDialog.renderDialog(dialogContent, [revertButton]);

      let currentSelectedUpdate = null;
      revertForm.onchange = (event) => {
        currentSelectedUpdate = event.target.dataset.version;
        if (currentSelectedUpdate) {
          revertButton.disabled = null;
        }
      };

      revertForm.onsubmit = async (event) => {
        event.preventDefault();
        window?.zaraz?.track('did site update revert', { url: window.location.href });

        if (await window.confirmDialog(`<div><p class="warning">Are you sure you want to revert ${`the ${currentSelectedUpdate}` || 'to before a previous'} update?</p><p><strong>any changes made on the options and theme pages after an update will also be reverted!</strong></p><p class="warning"><strong>This action cannot be undone!</strong></p></div>`)) {
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
      dialogContent.innerHTML = '<h3>Revert Project</h3><h4 class="centered-info">No updates to revert to.</h4>';
    } else {
      dialogContent.innerHTML = '<h3>Revert Project</h3><h4 class="centered-info">Could not get update information.</h4>';
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
            <a href="/site/${project.projectSlug}" aria-current="page">
              <h1>${project.projectName}</h1>
            </a>
          </div>
          
          <div class="actions">
            <div class="overview-actions button-container ${selected === 'overview' ? 'is-selected' : ''}">
                <button id="delete-site-button" title="Delete your Project" class="button secondary delete action">Delete</button>
                <button id="update-desc-button" title="Edit the Project Description" class="button secondary update-description action">Update Description</button>
            </div>
            <div class="pages-actions button-container ${selected === 'pages' ? 'is-selected' : ''}">
                <button id="add-page-button" title="Add a new Page" class="button primary add-page action">Add Page</button>
            </div>
            <div class="emails-actions button-container ${selected === 'emails' ? 'is-selected' : ''}"></div>
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
                    <li class="title">Campaign</li>
                    <li>
                        <a href="emails" class="button action secondary ${selected === 'emails' ? 'is-selected' : ''}">
                          <span class="icon icon-email">
                            <img alt src="/icons/email.svg" loading="lazy">  
                          </span>
                          Emails
                        </a>
                    </li>
                    <li>
                        <a href="analytics" class="button action secondary ${selected === 'analytics' ? 'is-selected' : ''}">
                          <span class="icon icon-analytics">
                            <img alt src="/icons/analytics.svg" loading="lazy">  
                          </span>
                          Email analytics
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
                        <table class="emails">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Last update</th>
                                <th></th>
                              </tr>  
                            </thead>
                            <tbody></tbody>
                        </table>
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

      // TODO: remove when we move to dark alley
      if (project.darkAlleyProject) {
        block.querySelectorAll('.breadcrumbs a').forEach((link) => {
          if (link.href.includes('/site/')) {
            link.href = link.href.replace('/site/', '/da-site/');
          }
        });
      }

      const actions = block.querySelector('.actions');
      actions.querySelector('.overview-actions').insertAdjacentHTML(
        'beforeend',
        `
        <a href="${project.sidekickSetupUrl}" id="install-sidekick-button" title="Install the Chrome Plugin Sidekick" class="button action secondary sidekick" target="_blank">Install sidekick</a>
        ${
  project.authoringGuideUrl
    ? `<a href="${project.authoringGuideUrl}" id="guides-button" title="Open the Guide for the Template" class="button action secondary guides" target="_blank">Guides</a>`
    : ''
}
        <a href="${project.driveUrl}${!darkAlleyVariation ? `?authuser=${user.email}` : ''}" id="edit-button" title="Edit your Content" class="button action secondary edit" target="_blank">Edit</a>
        <a href="${project.customLiveUrl}" id="open-button" title="Open your Website" class="button primary action open" target="_blank">Open</a>
      `,
      );

      // MARK: Share authors
      const authorsList = block.querySelector('.authors-list');
      const addAuthorListItem = (author) => {
        if (!author.email) return;
        const listItem = document.createElement('li');
        listItem.classList.add('author');
        const authorEmail = author.email;
        const isOwner = author.owner;
        listItem.dataset.authorEmail = authorEmail;
        const span = document.createElement('span');
        span.innerText = authorEmail;
        const revoke = document.createElement('button');
        revoke.classList.add('revoke-button', 'button', 'action', 'secondary');
        revoke.textContent = 'Revoke';
        if (isOwner) revoke.disabled = true;
        revoke.onclick = async () => {
          window?.zaraz?.track('click site share delete', { url: window.location.href });

          if (isOwner) return;
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

        listItem.append(span, revoke);
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

        if (!link.classList.contains('is-selected')) {
          const identifier = link.getAttribute('href');

          window.history.pushState({}, '', `${window.location.pathname.split('/').slice(0, -1).join('/')}/${identifier}`);

          aside.querySelector('.is-selected').classList.remove('is-selected');
          block.querySelector('.details > .is-selected').classList.remove('is-selected');
          block.querySelector('.actions > .is-selected').classList.remove('is-selected');

          block.querySelector(`.details .${identifier}-panel`).classList.add('is-selected');
          block.querySelector(`.actions .${identifier}-actions`).classList.add('is-selected');
          link.classList.add('is-selected');
        }
      });

      window.onpopstate = () => {
        const identifier = window.location.pathname.split('/').pop();
        const link = aside.querySelector(`[href="${identifier}"]`).click();
        if (link) {
          link.click();
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

        const title = document.createElement('h3');
        title.innerText = 'Update Site Description';
        const textArea = document.createElement('textarea');
        textArea.value = project.projectDescription;
        textArea.placeholder = 'Enter description here';
        const submit = document.createElement('button');
        submit.innerText = 'Submit';
        submit.classList.add('button');
        submit.type = 'submit';

        const form = document.createElement('form');
        form.append(title, textArea, submit);

        const dialog = window.createDialog(form);
        dialog.classList.add('update-description-dialog');

        form.onsubmit = async (event) => {
          event.preventDefault();
          dialog.setLoading(true, 'Updating description...');
          const response = await fetch(`${SCRIPT_API}/description/${project.projectSlug}`, {
            headers: { ...headers, 'content-type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({ projectDescription: textArea.value }),
          });
          if (response.ok) {
            dialog.renderDialog('<h3 class="centered-info">Description successfully updated</h3>');
            project.projectDescription = textArea.value;
            const descriptionSpan = block.querySelector('.project-description.card .project-description.span');
            if (descriptionSpan) descriptionSpan.textContent = textArea.value;
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

          const renderTable = (tableBody, tableData, type) => {
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
                      <td>${titleEl.textContent}</td>
                      <td>${description}</td>          
                      <td>${toDate(item.lastModified).toLocaleString()}</td>
                      <td>
                        <div id="email-open-edit" class="button-container">
                          <a class="button action secondary" href="/email/${id}${item.path}" target="_blank">Edit</a>
                          <a class="button action secondary" href="${EMAIL_WORKER_API}?url=${project.customLiveUrl}${item.path}" target="_blank">Open</a>
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
          };

          renderTable(block.querySelector('.pages tbody'), pages);
          renderTable(block.querySelector('.navs tbody'), navs);
          renderTable(block.querySelector('.footers tbody'), footers);
          renderTable(block.querySelector('.emails tbody'), emails, 'emails');
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.log(error);
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

      // Load email analytics
      fetch(`${SCRIPT_API}/email/${project.projectSlug}`, { headers })
        .then((req) => {
          if (req.ok) {
            return req.json();
          }

          return false;
        })
        .then((res) => {
          let sentCount = 0;
          let deliveredCount = 0;
          let bouncedCount = 0;
          let openedCount = 0;
          let clickedCount = 0;
          let complainedCount = 0;

          block.querySelector('.analytics-panel .container').innerHTML = `
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
                    <th>Subject</th>
                    <th>To</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Bounced</th>
                    <th>Complained</th>
                    <th>Opened</th>
                    <th>Clicked</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                    ${res ? Object.keys(res).map((emailId) => {
    const reverse = res[emailId].reverse();

    const sent = res[emailId].find(({ type }) => type === 'email.sent');
    const delivered = reverse.find(({ type }) => type === 'email.delivered');
    const complained = res[emailId].find(({ type }) => type === 'email.complained');
    const bounced = res[emailId].find(({ type }) => type === 'email.bounced');
    const opened = reverse.find(({ type }) => type === 'email.opened');
    const clicks = res[emailId].filter(({ type }) => type === 'email.clicked');

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

    return `
                      <tr>
                        <td>${res[emailId][0].data.subject}</td>
                        <td>${res[emailId][0].data.to.join(',')}</td>
                        <td>${sent ? new Date(sent.created_at).toLocaleString() : ''}</td>
                        <td>${delivered ? new Date(delivered.created_at).toLocaleString() : ''}</td>
                        <td>${bounced ? new Date(bounced.created_at).toLocaleString() : ''}</td>
                        <td>${complained ? new Date(complained.created_at).toLocaleString() : ''}</td>
                        <td>${opened ? new Date(opened.created_at).toLocaleString() : ''}</td>
                        <td>${clicks.map((clicked) => `<p>Clicked <a href="${clicked.data.click.link}" target="_blank">link</a> at ${new Date(clicked.data.click.timestamp).toLocaleString()}</p>`).join('')}</td>
                      </tr>
                    `;
  }).join('') : `
    <tr><td class="empty" colspan="8">Not enough data</td></tr>
  `}
                </tbody>
            </table>
            </div>
          `;

          if (res) {
            block.querySelector('.delivered-count').textContent = deliveredCount === 0 ? '0%' : `${(deliveredCount / sentCount) * 100}%`;
            block.querySelector('.bounced-count').textContent = bouncedCount === 0 ? '0%' : `${(bouncedCount / sentCount) * 100}%`;
            block.querySelector('.opened-count').textContent = openedCount === 0 ? '0%' : `${(openedCount / deliveredCount) * 100}%`;
            block.querySelector('.clicked-count').textContent = clickedCount === 0 ? '0%' : `${(clickedCount / openedCount) * 100}%`;
            block.querySelector('.complained-count').textContent = complainedCount === 0 ? '0%' : `${(complainedCount / deliveredCount) * 100}%`;
          } else {
            block.querySelectorAll('.analytics-panel .metrics span').forEach((el) => el.remove());
          }
        });
    } else if (reqDetails.status === 404) {
      block.querySelector('.content p').innerHTML = `<p>Project "${id}" not found. Create it <a href="/">here!</a></p>`;
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
