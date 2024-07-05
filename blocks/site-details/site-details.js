/* eslint-disable max-len */

import {
  SCRIPT_API, onAuthenticated, OOPS, EMAIL_WORKER_API,
} from '../../scripts/scripts.js';

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

// MARK: dialog setup
function dialogSetup({
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

  // MARK: delete block button
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

// MARK: add dialog
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

// MARK: block list
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
 * MARK: Decorate
 * @param {Element} block
 */
export default async function decorate(block) {
  const darkAlleyVariation = block.classList.contains('dark-alley');

  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const token = await window.auth0Client.getTokenSilently();
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
                <button class="button secondary delete action">Delete</button>
                <button class="button secondary update-description action">Update Description</button>
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
            <div class="analytics-actions button-container ${selected === 'analytics' ? 'is-selected' : ''}"></div>
            <div class="settings-actions button-container ${selected === 'settings' ? 'is-selected' : ''}">
                <button class="button action secondary share">Project Authors</button>
            </div>
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
                    ${createDocsEl(`
                      <p>Overview serves as your centralized control hub, offering quick access to essential information and actions about your site to help you to stay organized and productive with ease.</p>
                    `)}
                    
                    <div class="container">
                        <div class="cards">
                            <div>
                              <strong>Site id</strong>
                              <span>${project.projectSlug}</span>
                          </div>
                          <div class="project-description card">
                              <strong>Site description</strong>
                              <span class="project-description span">${project.projectDescription ?? ''}</span>
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
                      <p>Here, you'll find key insights into your web performance all in one place.</p>
                      <p><strong>Website key metrics:</strong></p>
                      <ul>
                        <li><strong>Visits</strong>: when someone navigates to your website, either directly or from an external referer. One visit can consist of multiple page views.</li>
                        <li><strong>Page views</strong>: when a page of your website is loaded by the browser.</li>
                        <li><strong>Page load time</strong>: total amount of time it took to load the page (P50 median).</li>
                        <li><strong>Core Web Vitals</strong>: an initiative by Google to provide unified guidance for quality signals that are essential to delivering a great user experience on the web.</li>
                      </ul>
                    `)}
                    <div class="container">
                        <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                    </div>
                </div>
                
                <div class="analytics-panel ${selected === 'analytics' ? 'is-selected' : ''}">
                    ${createDocsEl(`
                      <p>Here, you'll find key insights into your campaign performance all in one place.</p>
                      <p><strong>Campaign key metrics:</strong></p>
                      <ul>
                        <li><strong>Delivery rate</strong>: percentage of successfully delivered emails.</li>
                        <li><strong>Bounce rate</strong>: percentage of emails sent that couldn't be delivered to the recipient's inbox.</li>
                        <li><strong>Open rate</strong>: percentage of recipients who opened the email.</li>
                        <li><strong>Click-to-open rate</strong>: percentage of recipients who clicked on a link inside the email after opening.</li>
                        <li><strong>Spam complaints rate</strong>: percentage of recipients reporting the email as spam.</li>
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
                    `)}
                    
                    <div class="container">
                        <h2>Blocks</h2>
                        <button class="button secondary action add-block">Add block</button>
                        <ul class="blocks list"></ul>
                        
                        <h2>Icons</h2>
                        <button class="button action secondary add-icon">Add icon</button>
                        <ul class="icons list"></ul>
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
        <a href="${project.customLiveUrl}" class="button primary action open" target="_blank">Open</a>
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
      actions.querySelector('.settings-actions.button-container').append(changeContactButton);
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
        if (await window.confirmDialog('Are you sure ?')) {
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
            dialog.renderDialog('<h3 class="centered-info" >Description Updated</h3>');
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
            ({ template, robots }) => !template.includes('email') && !robots.includes('noindex'),
          );
          const navs = data.filter(({ path }) => path.endsWith('/nav'));
          const footers = data.filter(({ path }) => path.endsWith('/footer'));
          const emails = data.filter(({ template }) => template.includes('email'));

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
                        <div class="button-container">
                          <a class="button action secondary" href="${EMAIL_WORKER_API}?url=${project.customLiveUrl}${item.path}" target="_blank">Open</a>
                          <a class="button action secondary" href="/email/${id}${item.path}" target="_blank">Edit</a>
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
              editButton.classList.add('button', 'action', 'secondary', 'edit-page');
              editButton.target = '_blank';
              editButton.innerText = 'Edit';
              tableRow.lastElementChild.prepend(editButton);

              editButton.onclick = () => {
                editButton.classList.add('loading');
                fetch(`https://admin.hlx.page/status/headwire-self-service/${project.projectSlug}/main/`).then((res) => res.json()).then((statusData) => {
                  const [locationService, servicePageId] = statusData?.live?.sourceLocation?.split(':') || statusData?.preview?.sourceLocation?.split(':') || [null, null];
                  if (locationService === 'gdrive' && servicePageId) {
                    window.open(`https://docs.google.com/document/d/${servicePageId}/edit`, '_blank');
                  }
                }).catch(/* do nothing */)
                  .finally(() => {
                    editButton.classList.remove('loading');
                  });
              };

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
                <strong>Median page load time</strong>
                <span>${medianPageLoadTime / 1000}ms</span>
                ${performanceDelta !== 0 ? `<span class="${performanceDelta < 0 ? 'red' : 'green'}">${performanceDelta > 0 ? '+' : ''}${performanceDelta}%</span>` : ''}
            </div>
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

          <h2>Page load time details</h2>
          <div class="cards metrics">
            <div>
                <strong>By country</strong>
                ${metrics[3].data.viewer.accounts[0].countries.map((country) => `
                  <span>${countries.find(({ value }) => value === country.dimensions.metric)?.label}: <span>${country.count}</span></span>
                `).join('')}
            </div>
            <div>
                <strong>By referers</strong>
                ${metrics[3].data.viewer.accounts[0].topReferers.map((referer) => `
                  <span>${referer.dimensions.metric ? referer.dimensions.metric : 'None (direct)'}: <span>${referer.count}</span></span>
                `).join('')}
            </div>
            <div>
                <strong>By paths</strong>
                ${metrics[3].data.viewer.accounts[0].topPaths.map((paths) => `
                  <span>${paths.dimensions.metric}: <span>${paths.count}</span></span>
                `).join('')}
            </div>
            <div>
                <strong>By browsers</strong>
                ${metrics[3].data.viewer.accounts[0].topBrowsers.map((browsers) => `
                  <span>${browsers.dimensions.metric}: <span>${browsers.count}</span></span>
                `).join('')}
            </div>
            <div>
                <strong>By operating systems</strong>
                ${metrics[3].data.viewer.accounts[0].topOSs.map((OSs) => `
                  <span>${OSs.dimensions.metric}: <span>${OSs.count}</span></span>
                `).join('')}
            </div>
            <div>
                <strong>By device type</strong>
                ${metrics[3].data.viewer.accounts[0].topDeviceTypes.map((deviceTypes) => `
                  <span>${deviceTypes.dimensions.metric}: <span>${deviceTypes.count}</span></span>
                `).join('')}
            </div>
          </div>
          
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
            <div class="cards metrics">
              <div>
                  <strong>Delivery rate</strong>
                  <span class="delivered-count"></span>
              </div>
              <div>
                  <strong>Bounce rate</strong>
                  <span class="bounced-count"></span>
              </div>
              <div>
                  <strong>Open rate</strong>
                  <span class="opened-count"></span>
              </div>
              <div>
                  <strong>Click-to-open rate</strong>
                  <span class="clicked-count"></span>
              </div>
              <div>
                  <strong>Spam complaints rate</strong>
                  <span class="complained-count"></span>
              </div>
            </div>
            
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
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
