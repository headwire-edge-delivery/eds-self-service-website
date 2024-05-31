/* eslint-disable max-len */

import {
  SCRIPT_API, onAuthenticated, OOPS, toKestrel1URL, EMAIL_WORKER_API,
} from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';

const protectedBlocks = {
  header: true,
  footer: true,
};

const iconBase64Prefix = 'data:image/svg+xml;base64,';

function addGoogleCalendarLink(calendarId, actionsList) {
  // resetting in case
  actionsList.querySelectorAll('.google-calendar-link').forEach((link) => link.remove());
  actionsList.insertAdjacentHTML(
    'afterbegin',
    `<a class="button action secondary google-calendar-link" target="_blank" href="https://calendar.google.com/calendar/render?cid=${calendarId}">Google Calendar</a>`,
  );
}

function dialogSetup({
  name, deleteWarning, project, headers, isIcon = false, iconBase64,
}) {
  window?.zaraz?.track(`click site ${isIcon ? 'icon' : 'block'} settings`, { url: window.location.href });

  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = `
    <h3>${name} ${isIcon ? 'Icon' : 'Block'}</h3>
    <p>${deleteWarning || ''}</p>
    ${iconBase64 ? `<div class="preview"><img class="icon-display" src="${iconBase64}" alt="icon display" /></div>` : ''}
  `;

  const deleteButton = document.createElement('button');
  deleteButton.innerText = 'Delete';
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

  window.createDialog(dialogContent, [deleteButton]);
}

function addBlockDialogSetup({ id, headers, itemList }) {
  window?.zaraz?.track('click site block add', { url: window.location.href });

  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = '<h3 class="centered-info" >Loading available blocks...</h3>';
  const dialog = window.createDialog(dialogContent);

  Promise.all([
    fetch(`${SCRIPT_API}/compatibleBlocks/${id}`, { headers }).then((res) => res.json()),
    fetch(`${SCRIPT_API}/blocks/${id}`, { headers }).then((res) => res.json()),
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
    blockInfo.innerText = select.querySelector(`option[value="${select.value}"]`).dataset.blockCreateInfo;

    select.onchange = () => {
      blockInfo.innerText = select.querySelector(`option[value="${select.value}"]`).dataset.blockCreateInfo;
    };

    content.append(select, blockInfo);

    const addButton = document.createElement('button');
    addButton.innerText = 'Add';

    addButton.onclick = async () => {
      window?.zaraz?.track('click site block add submit', { url: window.location.href });

      if (!select.value) {
        await window.alertDialog('Please select a block');
        return;
      }
      dialog.setLoading(true, 'Adding Block...');
      const addRequest = await fetch(`${SCRIPT_API}/blocks/${id}/${select.value}`, {
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

function renderBlocksList(block, { project, headers, id }) {
  const blocksList = block.querySelector('.blocks');
  block.querySelector('.add-block').onclick = () => addBlockDialogSetup({ id, headers, itemList: blocksList });

  blocksList.innerHTML = '';
  blocksList.addItem = ({ name, deleteWarning, createInfo }) => {
    const li = document.createElement('li');
    li.className = 'button action';
    li.innerText = name;
    li.dataset.blockName = name;
    li.dataset.createInfo = createInfo || '';
    li.dataset.deleteWarning = deleteWarning || '';
    li.tabIndex = 0;
    li.onclick = () => dialogSetup({
      name,
      deleteWarning,
      project,
      headers,
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
      console.log(error);
    });
}

// MARK: Icon dialog
function addIconDialogSetup({
  headers, id, itemList, fileAccept = 'image/svg+xml', titleText = 'Add icon',
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
  const preview = document.createElement('div');
  preview.classList.add('preview');
  if (defaultSrc) {
    preview.innerHTML = `<img alt="favicon" src="${defaultSrc}" loading="lazy" />`;
  }

  dialogContent.append(title, input, preview);
  if (extraHtml) {
    dialogContent.insertAdjacentHTML('beforeend', extraHtml);
  }

  let file = null;
  let fileAsBase64 = null;
  input.onchange = (event) => {
    [file] = event.target.files;
    if (file) {
      if (file.type !== fileAccept) {
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
  addButton.innerText = 'Add';
  const dialog = window.createDialog(dialogContent, [addButton]);
  addButton.onclick = async () => {
    window?.zaraz?.track(`click site ${titleText === 'Favicon' ? 'favicon' : 'icon'} add submit`, { url: window.location.href });

    if (!file) {
      await window.alertDialog('Please select a file');
      return;
    }
    if (file.type !== fileAccept) {
      await window.alertDialog('Please select a valid file!');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    dialog.setLoading(true, 'Adding Icon...');
    const addRequest = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (addRequest.ok) {
      dialog.renderDialog('<h3 class="centered-info">Icon added!</h3>');
      itemList?.addItem({ name: file.name, base64: fileAsBase64 });
    } else {
      await window.alertDialog(OOPS);
    }
    dialog.setLoading(false);
  };
}

// MARK: Icon list
function renderIconsList(block, { project, headers, id }) {
  const iconsList = block.querySelector('.icons');
  block.querySelector('.settings-actions').insertAdjacentHTML('beforeend', '<button class="button secondary action change-favicon">Change Favicon</button>');
  block.querySelector('.add-icon').onclick = () => addIconDialogSetup({ id, headers, itemList: iconsList });
  block.querySelector('.change-favicon').onclick = () => addIconDialogSetup({
    id,
    headers,
    titleText: 'Favicon',
    fileAccept: 'image/x-icon',
    extraHtml: '<p>The favicon is the icon that appears in the browser tab.</p><p>You can change it here, but it must be a .ico file.</p>',
    uploadEndpoint: `${SCRIPT_API}/favicon/${id}`,
    defaultSrc: `https://main--${id}--headwire-self-service.hlx.page/favicon.ico`,
  });

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
    settingsButton.innerText = 'Settings';

    const copyButton = document.createElement('button');
    copyButton.classList.add('button', 'secondary', 'copy-button', 'action');
    copyButton.innerText = 'Copy';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
    buttonsContainer.append(settingsButton, copyButton);
    li.append(buttonsContainer);

    settingsButton.onclick = () => dialogSetup({
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
      console.log(error);
    });
}

const createDocsEl = (html) => `
  <div class="docs">
    <h2>
      <span class="icon icon-info">
        <img alt src="/icons/info.svg" loading="lazy">  
      </span>
      Information
    </h2>
    ${html}
  </div>
`;

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

    if (window.location.pathname.startsWith('/site/') && split.length === 3) {
      window.history.replaceState({}, '', `${window.location.pathname}/overview`);
    }

    const selected = window.location.pathname.split('/')[3];

    let editor = {
      refresh: () => {},
    };

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

    const reqDetails = await fetch(`${SCRIPT_API}/list/${id}`, {
      headers,
    });

    if (reqDetails.ok) {
      const { project } = await reqDetails.json();

      block.innerHTML = `
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
                <button class="button secondary delete action">Delete</button>
            </div>
            <div class="pages-actions button-container ${selected === 'pages' ? 'is-selected' : ''}"></div>
            <div class="emails-actions button-container ${selected === 'emails' ? 'is-selected' : ''}"></div>
            <div class="monitoring-actions button-container ${selected === 'monitoring' ? 'is-selected' : ''}">
                <select class="button action secondary period-selector">
                    <option value="1d" selected>Period: 1 day</option>
                    <option value="7d">Period: 7 days</option>
                    <option value="30d">Period: 30 days</option>
                </select>
            </div>
            <div class="settings-actions button-container ${selected === 'settings' ? 'is-selected' : ''}">
                <button class="button action secondary share">Project Authors</button>
            </div>
          </div>
        </div>
        
        <div class="content">
            <dialog class="display-dialog"></dialog>
            <aside>
                <ul>
                    <li>
                        <a href="overview" class="button secondary ${selected === 'overview' ? 'is-selected' : ''}" target="_blank">
                          <span class="icon icon-template">
                            <img alt src="/icons/template.svg" loading="lazy">  
                          </span>
                          Overview
                        </a>
                    </li>
                    <li>
                        <a href="pages" class="button secondary ${selected === 'pages' ? 'is-selected' : ''}" target="_blank">
                          <span class="icon icon-web">
                            <img alt src="/icons/web.svg" loading="lazy">  
                          </span>
                          Website
                        </a>
                    </li>
                    <li>
                        <a href="emails" class="button secondary ${selected === 'emails' ? 'is-selected' : ''}" target="_blank">
                          <span class="icon icon-email">
                            <img alt src="/icons/email.svg" loading="lazy">  
                          </span>
                          Campaign
                        </a>
                    </li>
                    <li>
                        <a href="monitoring" class="button secondary ${selected === 'monitoring' ? 'is-selected' : ''}" target="_blank">
                          <span class="icon icon-monitoring">
                            <img alt src="/icons/monitoring.svg" loading="lazy">  
                          </span>
                          Analytics
                        </a>
                    </li>
                    <li>
                        <a href="settings" class="button secondary ${selected === 'settings' ? 'is-selected' : ''}" target="_blank">
                          <span class="icon icon-settings">
                            <img alt src="/icons/settings.svg" loading="lazy">  
                          </span>
                          Settings
                        </a>
                    </li>
                </ul>
            </aside>

            <div class="details">
                <div class="overview-panel ${selected === 'overview' ? 'is-selected' : ''}">
                    ${createDocsEl(`
                      <p>Overview serves as your centralized control hub, offering quick access to essential information and actions about your site to help you to stay organized and productive with ease.</p>
                    `)}
                    
                    <div class="container">
                        <div class="cards">
                            <div>
                              <strong>Site id</strong>
                              <span>${project.projectSlug}</span>
                          </div>
                          <div>
                              <strong>Site description</strong>
                              <span>${project.projectDescription ?? ''}</span>
                          </div>
                          <div>
                              <strong>Last update</strong>
                              <span class="last-update"></span>
                          </div>
                          <div>
                              <strong>Site template</strong>
                              <span>${project.templateName}</span>
                          </div>
                        </div>
                    </div>
                </div>
                
                <div class="pages-panel ${selected === 'pages' ? 'is-selected' : ''}">
                    ${createDocsEl(`
                      <p>Pages lists all published pages to serve as a comprehensive directory of your website's content. It provides a convenient overview of all accessible pages, enabling easy navigation and exploration of your site.</p>
                    `)}
                    
                    <div class="container">
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
                </div>
                
                <div class="emails-panel ${selected === 'emails' ? 'is-selected' : ''}">
                    ${createDocsEl(`
                      <p>Emails serves as your toolkit for crafting impactful communication in your online endeavors tailored for various purposes, from newsletters to promotional campaigns streamlining your email creation process.</p>
                    `)}
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
                    ${createDocsEl(`
                      <p>Here, you'll find key insights into your online performance. Track website traffic, audience demographics, email campaign success, and subscriber engagement—all in one place.</p>
                      <p><strong>Website key metrics:</strong></p>
                      <ul>
                        <li><strong>Visits</strong>: when someone navigates to your website, either directly or from an external referer. One visit can consist of multiple page views.</li>
                        <li><strong>Page views</strong>: when a page of your website is loaded by the browser.</li>
                        <li><strong>Page load time</strong>: total amount of time it took to load the page.</li>
                        <li><strong>Core Web Vitals</strong>: an initiative by Google to provide unified guidance for quality signals that are essential to delivering a great user experience on the web.</li>
                      </ul>
                    `)}
                    <div class="container">
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </div>
                </div>
                
                <div class="settings-panel ${selected === 'settings' ? 'is-selected' : ''}">
                    ${createDocsEl(`
                      <p><strong>Blocks</strong> acts as a repository of building blocks for your website. Here, you can explore and select from a variety of available blocks to enhance your web pages.</p>
                      <p><strong>Icons</strong> is your go-to resource for web assets that add visual flair and functionality to your website. Here, you'll find a curated collection of icons suitable for various purposes, from navigation to social media integration.</p>
                      <p><strong>Theme</strong> is your gateway to tailor your website's visual identity to align perfectly with your brand. Here, you have the power to customize colors, ensuring consistency and harmony throughout your site.</p>
                    `)}
                    
                    <div class="container">
                        <h2>Blocks</h2>
                        <button class="button secondary action add-block">Add block</button>
                        <ul class="blocks list"></ul>
                        
                        <h2>Icons</h2>
                        <button class="button action secondary add-icon">Add icon</button>
                        <ul class="icons list"></ul>
                        
                        <h2>Theme</h2>
                        <div class="button-container">
                            <select class="button action secondary publish-theme-selector"></select>
                            <button class="button action secondary publish-theme">Publish</button>
                        </div>
                        
                        <div class="theme-container">
                          <textarea class="vars"></textarea>
                          <iframe src="${toKestrel1URL(project.liveUrl)}" class="vars-preview" loading="lazy"></iframe>
                        </div>
                    </div> 
                </div>
            </div>
        </div>
    `;

      const actions = block.querySelector('.actions');
      actions.querySelector('.overview-actions').insertAdjacentHTML(
        'beforeend',
        `
        <a href="${project.sidekickSetupUrl}" class="button action secondary sidekick" target="_blank">Install sidekick</a>
        ${
  project.authoringGuideUrl
    ? `<a href="${project.authoringGuideUrl}" class="button action secondary guides" target="_blank">Guides</a>`
    : ''
}
        <a href="${project.driveUrl}" class="button action secondary edit" target="_blank">Edit</a>
        <a href="${toKestrel1URL(project.liveUrl)}" class="button primary action open" target="_blank">Open</a>
      `,
      );

      // MARK: Share dialog
      const shareButton = actions.querySelector('button.share');
      shareButton.onclick = async () => {
        window?.zaraz?.track('click site share', { url: window.location.href });

        const dialog = window.createDialog('<div><h3>Getting Authors...</h3></div>');
        const authors = await fetch(`${SCRIPT_API}/authors/${id}`, { headers })
          .then((r) => r.json())
          .catch(() => []);
        const populatedContent = document.createElement('div');
        const title = document.createElement('h3');
        title.innerText = 'Project authors';
        const authorList = document.createElement('ul');
        authorList.classList.add('author-list');

        // author list
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
          revoke.classList.add('revoke-button', 'button');
          if (isOwner) revoke.disabled = true;
          revoke.onclick = async () => {
            window?.zaraz?.track('click site share delete', { url: window.location.href });

            if (isOwner) return;
            if (await window.confirmDialog('Are you sure ?')) {
              window?.zaraz?.track('click site share delete submit', { url: window.location.href });

              dialog.setLoading(true, `Removing ${authorEmail}...`);
              const revokeResponse = await fetch(`${SCRIPT_API}/authors/${id}/${authorEmail}`, {
                method: 'DELETE',
                headers,
              });
              if (revokeResponse.ok) {
                dialog.querySelector(`li[data-author-email="${authorEmail}"]`).remove();
              } else {
                await window.alertDialog(OOPS);
              }
              dialog.setLoading(false);
            }
          };

          listItem.append(revoke, span);
          authorList.append(listItem);
        };
        authors.forEach(addAuthorListItem);

        // add new authors
        const addAuthorSection = document.createElement('div');
        addAuthorSection.classList.add('add-author-section');
        addAuthorSection.innerHTML = `
          <h4>Add an Author:</h4>
          <form>
            <input name="email" type="email" placeholder="person@example.com" />
            <button class="button secondary action" type="submit">Add</button>
          </form>
        `;
        const addAuthorForm = addAuthorSection.querySelector('form');
        addAuthorForm.onsubmit = async (event) => {
          window?.zaraz?.track('click site share add submit', { url: window.location.href });

          event.preventDefault();
          dialog.setLoading(true, 'Adding Author...');
          const email = event.target.email.value;
          const isValid = /^(?!@).*@.*(?<!@)$/.test(email);
          if (!isValid) {
            await window.alertDialog('Please enter a valid email.');
            dialog.setLoading(false);
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
          dialog.setLoading(false);
        };

        populatedContent.append(title, authorList, addAuthorSection);
        dialog.renderDialog(populatedContent);
      };

      // MARK: Contact Email dialog
      const changeContactButton = document.createElement('button');
      actions.querySelector('.settings-actions.button-container').prepend(changeContactButton);
      changeContactButton.classList.add('button', 'secondary', 'action');
      changeContactButton.innerText = 'Change contact email';
      changeContactButton.onclick = () => {
        window?.zaraz?.track('click site contact', { url: window.location.href });

        const title = document.createElement('h3');
        title.innerText = 'Change contact email';

        const input = document.createElement('input');
        input.value = project.contactEmail || project.ownerEmail || '';
        input.type = 'email';
        input.placeholder = 'contact@email.com';

        const paragraph = document.createElement('p');
        paragraph.innerText = 'This defines which email the contact form submits to.';

        const dialogContent = document.createElement('div');
        dialogContent.append(title, input, paragraph);

        const submitButton = document.createElement('button');

        const dialog = window.createDialog(dialogContent, [submitButton]);

        submitButton.classList.add('button');
        submitButton.innerText = 'Submit';
        submitButton.onclick = async () => {
          window?.zaraz?.track('click site contact submit', { url: window.location.href });

          if (!input.value) return;
          dialog.setLoading(true, 'Updating Contact Email...');
          const response = await fetch(`${SCRIPT_API}/updateContact/${project.projectSlug}`, {
            headers: { ...headers, 'content-type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({ contactEmail: input.value }),
          });
          if (response.ok) {
            dialog.renderDialog('<h3 class="centered-info" >Email Updated</h3>');
            project.contactEmail = input.value;
          } else {
            await window.alertDialog(OOPS);
          }
          dialog.setLoading(false);
        };
      };

      const aside = block.querySelector('aside');
      aside.addEventListener('click', (event) => {
        event.preventDefault();

        const link = event.target.closest('a');
        if (link && !link.classList.contains('is-selected')) {
          const identifier = link.getAttribute('href');

          window.history.pushState({}, '', `${window.location.pathname.split('/').slice(0, -1).join('/')}/${identifier}`);

          aside.querySelector('.is-selected').classList.remove('is-selected');
          block.querySelector('.details > .is-selected').classList.remove('is-selected');
          block.querySelector('.actions > .is-selected').classList.remove('is-selected');

          block.querySelector(`.details .${identifier}-panel`).classList.add('is-selected');
          block.querySelector(`.actions .${identifier}-actions`).classList.add('is-selected');
          link.classList.add('is-selected');

          if (identifier === 'settings') {
            editor.refresh();
          }
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

      // Delete site and redirect to dashboard
      block.querySelector('.delete').onclick = async () => {
        window?.zaraz?.track('click site delete', { url: window.location.href });

        block.classList.add('is-deleting');
        if (await window.confirmDialog('Are you sure ?')) {
          window?.zaraz?.track('click site delete submit', { url: window.location.href });

          const reqDelete = await fetch(`${SCRIPT_API}/delete/${project.projectSlug}`, {
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

      // Load index to list pages
      fetch(`${toKestrel1URL(project.liveUrl)}/query-index.json?sheet=all`)
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

          // Emails only
          block.querySelector('.emails tbody').innerHTML = data
            .filter(({ template }) => template.includes('email'))
            .map((item) => {
              const title = document.createElement('div');
              title.innerHTML = item.title;

              const description = document.createElement('div');
              description.innerHTML = item.description;

              return `
              <tr>
                  <td>${title.textContent}</td>
                  <td>${
  description.textContent.length ? `${description.textContent.substring(0, 100)}…` : ''
}</td>          
                  <td>${toDate(item.lastModified).toLocaleString()}</td>
                  <td>
                    <div class="button-container">
                      <a class="button action secondary" href="${EMAIL_WORKER_API}?url=${toKestrel1URL(project.liveUrl)}${item.path}" target="_blank">Open</a>
                      <a class="button action secondary" href="/email/${id}${item.path}" target="_blank">Edit</a>
                    </div>
                  </td>
              </tr>
            `;
            })
            .join('');

          // Rest of the pages
          const pages = data.filter(
            ({ template, robots }) => !template.includes('email') && !robots.includes('noindex'),
          );

          block.querySelector('.pages tbody').innerHTML = pages
            .map((item) => {
              const title = document.createElement('div');
              title.innerHTML = item.title;

              const description = document.createElement('div');
              description.innerHTML = item.description;

              return `
              <tr>
                  <td>${title.textContent}</td>
                  <td>${description.textContent.length ? `${description.textContent.substring(0, 100)}…` : ''}</td>
                  <td>${item.path}</td>          
                  <td>${new Date(Number(item.lastModified) * 1000).toLocaleString()}</td>
                  <td><a class="button action secondary" href="${toKestrel1URL(project.liveUrl)}${item.path}" target="_blank">Open</a></td>
              </tr>
            `;
            })
            .join('');

          // Theme pages
          block.querySelector('.publish-theme-selector').innerHTML = `${pages.map(({ path }) => `<option value="${path}">Theme: ${path}</option>`).join('')}`;

          const select = block.querySelector('.publish-theme-selector');
          select.onchange = () => {
            window?.zaraz?.track('click site theme', { url: window.location.href });

            const varsPreview = block.querySelector('.vars-preview');
            if (new URL(varsPreview.src).pathname !== select.value) {
              varsPreview.src = `${toKestrel1URL(project.liveUrl)}${select.value}`;
              varsPreview.addEventListener(
                'load',
                () => {
                  varsPreview.contentWindow.postMessage({ type: 'css-vars', cssVars: encodeURIComponent(editor.getValue()) }, '*');
                },
                { once: true },
              );
            }
          };
        })
        .catch((error) => {
          console.log(error);
        });

      // Load site blocks
      renderBlocksList(block, { project, headers, id });

      // Load site icons
      renderIconsList(block, { project, headers, id });

      // calendar link
      if (project.calendarId) {
        addGoogleCalendarLink(project.calendarId, block.querySelector('.settings-actions'));
      }

      // Load site theme
      fetch(`${toKestrel1URL(project.liveUrl)}/styles/vars.css`)
        .then((res) => {
          if (res.ok) {
            return res.text();
          }
          throw new Error(res.status);
        })
        .then(async (css) => {
          // Load codemirror to edit styles
          loadCSS('/libs/codemirror/codemirror.min.css');
          await import('../../libs/codemirror/codemirror.min.js');
          await import('../../libs/codemirror/css.min.js');

          const vars = block.querySelector('.vars');
          const varsPreview = block.querySelector('.vars-preview');

          vars.value = css;
          editor = window.CodeMirror.fromTextArea(vars);

          editor.on('change', () => {
            varsPreview.contentWindow.postMessage({ type: 'css-vars', cssVars: encodeURIComponent(editor.getValue()) }, '*');
          });

          block.querySelector('.publish-theme').onclick = async () => {
            window?.zaraz?.track('click site theme submit', { url: window.location.href });

            editor.display.wrapper.classList.add('sending');
            editor.setOption('readOnly', true);
            const response = await fetch(`${SCRIPT_API}/cssVariables/${id}`, {
              method: 'POST',
              headers: { ...headers, 'content-type': 'application/json' },
              body: JSON.stringify({ css: btoa(editor.getValue()) }),
            });
            await window.alertDialog(response.ok ? 'Variables successfully updated!' : OOPS);
            editor.display.wrapper.classList.remove('sending');
            editor.setOption('readOnly', false);
          };
        })
        .catch((error) => {
          console.log(error);
        });

      // Load analytics
      fetch(`${SCRIPT_API}/monitoring/${project.projectSlug}?period=1d`, { headers })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error(res.status);
        })
        .then(async (res) => {
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
              timeSeries.push(timePoint);
            }

            return timeSeries;
          };

          const container = block.querySelector('.monitoring-panel .container');
          const period = block.querySelector('.period-selector');

          const render = (metrics) => {
            const totalVisits = metrics[0].data.viewer.accounts[0]?.total[0]?.sum?.visits ?? 0;
            const totalPageViews = metrics[0].data.viewer.accounts[0]?.total[0]?.count ?? 0;
            const averagePageLoadTime = metrics[2].data.viewer.accounts[0]?.totalPerformance[0]?.aggregation?.pageLoadTime ?? 0;

            const visitsDelta = metrics[2].data.viewer.accounts[0].visitsDelta[0] ? ((totalVisits * 100) / metrics[2].data.viewer.accounts[0].visitsDelta[0].sum.visits) - 100 : 0;
            const pageViewsDelta = metrics[2].data.viewer.accounts[0].pageviewsDelta[0] ? ((totalPageViews * 100) / metrics[2].data.viewer.accounts[0].pageviewsDelta[0].count) - 100 : 0;
            const performanceDelta = metrics[2].data.viewer.accounts[0].performanceDelta[0] ? ((averagePageLoadTime * 100) / metrics[2].data.viewer.accounts[0].performanceDelta[0].aggregation.pageLoadTime) - 100 : 0;

            container.innerHTML = `
              <div class="cards">
                <div>
                    <strong>Total visits</strong>
                    <span>${totalVisits}</span>
                    ${visitsDelta !== 0 ? `<span class="${visitsDelta < 0 ? 'red' : 'green'}">${visitsDelta > 0 ? '+' : ''}${visitsDelta}%</span>` : ''} 
                </div>
                <div>
                    <strong>Total page views</strong>
                    <span>${totalPageViews}</span>
                    ${pageViewsDelta !== 0 ? `<span class="${pageViewsDelta < 0 ? 'red' : 'green'}">${pageViewsDelta > 0 ? '+' : ''}${pageViewsDelta}%</span>` : ''}
                </div>
                <div>
                    <strong>Average page load time</strong>
                    <span>${averagePageLoadTime / 1000}ms</span>
                    ${performanceDelta !== 0 ? `<span class="${performanceDelta < 0 ? 'red' : 'green'}">${performanceDelta > 0 ? '+' : ''}${performanceDelta}%</span>` : ''}
                </div>
              </div>
              
              <h2>Core Web Vitals</h2>
              
              <div class="cards">
                  ${['lcp', 'inp', 'fid', 'cls'].map((metric) => `
                    <div>
                      <strong>${metric.toUpperCase()}</strong>
                      <span>Good (${metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}Good`] ?? '0'})</span>
                      <span>Needs improvement (${metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}NeedsImprovement`] ?? '0'})</span>
                      <span>Poor (${metrics[2].data.viewer.accounts[0]?.[metric][0]?.sum[`${metric}Poor`] ?? '0'})</span>
                    </div>
                    `).join('')}
              </div>
             
              <div class="chart-container">
                  <canvas id="chart" width="600" height="400"></canvas>
              </div>
  
              <h2>Visits details</h2>
              
              <div class="cards metrics">
                  <div>
                      <strong>By country</strong>
                      ${metrics[0].data.viewer.accounts[0].countries.map((country) => `
                        <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${country.sum.visits}</span></span>
                      `).join('')}
                  </div>
                  <div>
                      <strong>By referers</strong>
                      ${metrics[0].data.viewer.accounts[0].topReferers.map((referer) => `
                        <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${referer.sum.visits}</span></span>
                      `).join('')}
                  </div>
                  <div>
                      <strong>By paths</strong>
                      ${metrics[0].data.viewer.accounts[0].topPaths.map((paths) => `
                        <span>${paths.dimensions.metric}: <span>${paths.sum.visits}</span></span>
                      `).join('')}
                  </div>
                  <div>
                      <strong>By browsers</strong>
                      ${metrics[0].data.viewer.accounts[0].topBrowsers.map((browsers) => `
                        <span>${browsers.dimensions.metric}: <span>${browsers.sum.visits}</span></span>
                      `).join('')}
                  </div>
                  <div>
                      <strong>By operating systems</strong>
                      ${metrics[0].data.viewer.accounts[0].topOSs.map((OSs) => `
                        <span>${OSs.dimensions.metric}: <span>${OSs.sum.visits}</span></span>
                      `).join('')}
                  </div>
                  <div>
                      <strong>By device type</strong>
                      ${metrics[0].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `
                        <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.sum.visits}</span></span>
                      `).join('')}
                  </div>
              </div>
              
              <h2>Page views details</h2>
              <div class="cards metrics">
                <div>
                    <strong>By country</strong>
                    ${metrics[0].data.viewer.accounts[0].countries.map((country) => `
                      <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${country.count}</span></span>
                    `).join('')}
                </div>
                <div>
                    <strong>By referers</strong>
                    ${metrics[0].data.viewer.accounts[0].topReferers.map((referer) => `
                      <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${referer.count}</span></span>
                    `).join('')}
                </div>
                <div>
                    <strong>By paths</strong>
                    ${metrics[0].data.viewer.accounts[0].topPaths.map((paths) => `
                      <span>${paths.dimensions.metric}: <span>${paths.count}</span></span>
                    `).join('')}
                </div>
                <div>
                    <strong>By browsers</strong>
                    ${metrics[0].data.viewer.accounts[0].topBrowsers.map((browsers) => `
                      <span>${browsers.dimensions.metric}: <span>${browsers.count}</span></span>
                    `).join('')}
                </div>
                <div>
                    <strong>By operating systems</strong>
                    ${metrics[0].data.viewer.accounts[0].topOSs.map((OSs) => `
                      <span>${OSs.dimensions.metric}: <span>${OSs.count}</span></span>
                    `).join('')}
                </div>
                <div>
                    <strong>By device type</strong>
                    ${metrics[0].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `
                      <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.count}</span></span>
                    `).join('')}
                </div>
              </div>
            `;

            const series = generateTimeSeries(period.value);

            const labels = series.map((d) => d.toTimeString().slice(0, 5));

            const visitsData = [];
            const pageViewsData = [];

            series.forEach((d) => {
              const found = metrics[1].data.viewer.accounts[0].series.find((serie) => d.getTime() === new Date(serie.dimensions.ts).getTime());

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
            container.innerHTML = '<img src="/icons/loading.svg" alt="loading" loading="lazy"/>';
            const req = await fetch(`${SCRIPT_API}/monitoring/${project.projectSlug}?period=${period.value}`, { headers });
            if (!req.ok) {
              await window.alertDialog(OOPS);
              return;
            }

            render(await req.json());
          };

          render(res);
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
