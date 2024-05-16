import {
  SCRIPT_API, onAuthenticated, OOPS, WORKER_API,
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
      alert(OOPS);
    }
    deleteButton.disabled = null;
    dialogParent.classList.remove('loading');
  };

  window.createDialog(dialogContent, [deleteButton]);
}

function addBlockDialogSetup({ id, headers, itemList }) {
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
      if (!select.value) {
        alert('Please select a block');
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
        alert(OOPS);
      }
      dialog.setLoading(false);
    };
    dialog.renderDialog(content, [addButton]);
  });
}

function renderBlocksList(blocksList, actions, { project, headers, id }) {
  const blockActions = actions.querySelector('.settings-actions');
  blockActions.insertAdjacentHTML('beforeend', '<button class="button secondary action add-block">Add Block</button>');
  actions.querySelector('.add-block').onclick = () => addBlockDialogSetup({ id, headers, itemList: blocksList });

  blocksList.innerHTML = '';
  blocksList.addItem = ({ name, deleteWarning, createInfo }) => {
    const li = document.createElement('li');
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
}) {
  const dialogContent = document.createElement('div');

  const title = document.createElement('h3');
  title.innerText = titleText;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = fileAccept;
  const preview = document.createElement('div');
  preview.classList.add('preview');

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
    if (!file) {
      alert('Please select a file');
      return;
    }
    if (file.type !== fileAccept) {
      alert('Please select a valid file!');
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
      alert(OOPS);
    }
    dialog.setLoading(false);
  };
}

// MARK: Icon list
function renderIconsList(iconsList, actions, { project, headers, id }) {
  actions.querySelector('.settings-actions').insertAdjacentHTML('beforeend', '<button class="button secondary action change-favicon">Change Favicon</button><button class="button action secondary add-icon">Add Icon</button>');
  actions.querySelector('.add-icon').onclick = () => addIconDialogSetup({ id, headers, itemList: iconsList });
  actions.querySelector('.change-favicon').onclick = () => addIconDialogSetup({
    id,
    headers,
    titleText: 'Favicon',
    fileAccept: 'image/x-icon',
    extraHtml: '<p>The favicon is the icon that appears in the browser tab.</p><p>You can change it here, but it must be a .ico file.</p>',
    uploadEndpoint: `${SCRIPT_API}/favicon/${id}`,
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

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const id = window.location.pathname.split('/').pop();
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

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
            <div class="overview-actions button-container is-selected">
                <button class="button secondary delete action">Delete</button>
            </div>
            <div class="pages-actions button-container"></div>
            <div class="emails-actions button-container"></div>
            <div class="settings-actions button-container"></div>
          </div>
        </div>
        
        <div class="content">
            <dialog class="display-dialog"></dialog>
            <aside>
                <ul>
                    <li>
                        <a href="#overview" class="button secondary is-selected" target="_blank">
                          <span class="icon icon-template">
                            <img alt src="/icons/template.svg" loading="lazy">  
                          </span>
                          Overview
                        </a>
                    </li>
                    <li>
                        <a href="#pages" class="button secondary" target="_blank">
                          <span class="icon icon-web">
                            <img alt src="/icons/web.svg" loading="lazy">  
                          </span>
                          Website
                        </a>
                    </li>
                    <li>
                        <a href="#emails" class="button secondary" target="_blank">
                          <span class="icon icon-email">
                            <img alt src="/icons/email.svg" loading="lazy">  
                          </span>
                          Campaign
                        </a>
                    </li>
                    <li>
                        <a href="#settings" class="button secondary" target="_blank">
                          <span class="icon icon-settings">
                            <img alt src="/icons/settings.svg" loading="lazy">  
                          </span>
                          Settings
                        </a>
                    </li>
                </ul>
            </aside>

            <div class="details">
                <div class="overview-panel is-selected">
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>
                      Overview serves as your centralized control hub, offering quick access to essential information and actions about your site to help you to stay organized and productive with ease.  
                      </p>
                    </div>
                    
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
                
                <div class="pages-panel">
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>
                      Pages lists all published pages to serve as a comprehensive directory of your website's content. It provides a convenient overview of all accessible pages, enabling easy navigation and exploration of your site.    
                      </p>
                    </div>
                    
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
                
                <div class="emails-panel">
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>Emails serves as your toolkit for crafting impactful communication in your online endeavors tailored for various purposes, from newsletters to promotional campaigns streamlining your email creation process.</p>
                    </div>
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
                
                <div class="settings-panel">
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p><strong>Blocks</strong> acts as a repository of building blocks for your website. Here, you can explore and select from a variety of available blocks to enhance your web pages.</p>
                      <p><strong>Icons</strong> is your go-to resource for web assets that add visual flair and functionality to your website. Here, you'll find a curated collection of icons suitable for various purposes, from navigation to social media integration.</p>
                      <p><strong>Theme</strong> is your gateway to tailor your website's visual identity to align perfectly with your brand. Here, you have the power to customize colors, ensuring consistency and harmony throughout your site.</p>
                    </div>
                    
                    <div class="container">
                        <h2>Blocks</h2>
                        <ul class="blocks list"></ul>
                        
                        <h2>Icons</h2>
                        <ul class="icons list"></ul>
                        
                        <h2>Theme</h2>
                        <div class="theme-container">
                          <textarea class="vars"></textarea>
                          <iframe src="${project.liveUrl}" class="vars-preview" loading="lazy"></iframe>
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
        <a href="${project.sidekickSetupUrl}" class="button action secondary" target="_blank">Install
        Sidekick</a>
        ${
  project.authoringGuideUrl
    ? `<a href="${project.authoringGuideUrl}" class="button action secondary" target="_blank">Docs</a>`
    : ''
}
        <a href="${project.driveUrl}" class="button action secondary" target="_blank">Edit</a>
        <button class="button action secondary share">Project Authors</button>
        <a href="${project.liveUrl}" class="button primary action" target="_blank">Open</a>
      `,
      );

      // MARK: Share dialog
      const shareButton = actions.querySelector('button.share');
      shareButton.onclick = async () => {
        const dialog = window.createDialog('<div><h3>Getting Authors...</h3></div>');
        const authors = await fetch(`${SCRIPT_API}/authors/${id}`, { headers })
          .then((r) => r.json())
          .catch(() => []);
        const populatedContent = document.createElement('div');
        const title = document.createElement('h3');
        title.innerText = 'Project Authors';
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
            if (isOwner) return;
            if (window.confirm('Are you sure ?')) {
              dialog.setLoading(true, `Removing ${authorEmail}...`);
              const revokeResponse = await fetch(`${SCRIPT_API}/authors/${id}/${authorEmail}`, {
                method: 'DELETE',
                headers,
              });
              if (revokeResponse.ok) {
                dialog.querySelector(`li[data-author-email="${authorEmail}"]`).remove();
              } else {
                alert(OOPS);
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
            <button class="button" type="submit">Add</button>
          </form>
        `;
        const addAuthorForm = addAuthorSection.querySelector('form');
        addAuthorForm.onsubmit = async (event) => {
          event.preventDefault();
          dialog.setLoading(true, 'Adding Author...');
          const email = event.target.email.value;
          const isValid = /^(?!@).*@.*(?<!@)$/.test(email);
          if (!isValid) {
            alert('Please enter a valid email.');
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
            alert(OOPS);
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
            alert(OOPS);
          }
          dialog.setLoading(false);
        };
      };

      const aside = block.querySelector('aside');
      aside.addEventListener('click', (event) => {
        event.preventDefault();

        const link = event.target.closest('a');
        if (link && !link.classList.contains('is-selected')) {
          const identifier = link.getAttribute('href').slice(1);

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

      // Delete site and redirect to dashboard
      block.querySelector('.delete').onclick = async () => {
        block.classList.add('is-deleting');
        if (window.confirm('Are you sure ?')) {
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
            alert(OOPS);
            block.classList.remove('is-deleting');
          }
        } else {
          block.classList.remove('is-deleting');
        }
      };

      // Load index to list pages
      fetch(`${WORKER_API}/proxy?url=${project.liveUrl}/query-index.json?sheet=all`)
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
                    <a class="button action secondary" href="${project.liveUrl}${item.path}" target="_blank">Open</a>
                    <a class="button action secondary" href="/email-composer?id=${project.projectSlug}&url=${project.liveUrl}${
  item.path
}" target="_blank">Edit</a>
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
                  <td><a class="button action secondary" href="${project.liveUrl}${item.path}" target="_blank">Open</a></td>
              </tr>
            `;
            })
            .join('');

          // Theme pages
          block.querySelector('.settings-actions').insertAdjacentHTML(
            'beforeend',
            `
            <select class="button action secondary publish-theme-selector">
                ${pages.map(({ path }) => `<option value="${path}">Theme: ${path}</option>`).join('')}
            </select>
          `,
          );

          const select = block.querySelector('.settings-actions select');
          select.onchange = () => {
            const varsPreview = block.querySelector('.vars-preview');
            if (new URL(varsPreview.src).pathname !== select.value) {
              varsPreview.src = `${project.liveUrl}${select.value}`;
              varsPreview.addEventListener(
                'load',
                () => {
                  varsPreview.contentWindow.postMessage(encodeURIComponent(editor.getValue()), '*');
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
      renderBlocksList(block.querySelector('.blocks'), actions, { project, headers, id });

      // Load site icons
      renderIconsList(block.querySelector('.icons'), actions, { project, headers, id });

      // calendar link
      if (project.calendarId) {
        addGoogleCalendarLink(project.calendarId, block.querySelector('.settings-actions'));
      }

      // Load site theme
      fetch(`${WORKER_API}/proxy?url=${project.liveUrl}/styles/vars.css`)
        .then((res) => {
          if (res.ok) {
            return res.text();
          }
          throw new Error(res.status);
        })
        .then(async (css) => {
          // Load codemirror to edit styles
          loadCSS('/libs/codemirror/codemirror.css');
          await import('../../libs/codemirror/codemirror.js');
          await import('../../libs/codemirror/css.js');

          const vars = block.querySelector('.vars');
          const varsPreview = block.querySelector('.vars-preview');

          vars.value = css;
          editor = window.CodeMirror.fromTextArea(vars);

          editor.on('change', () => {
            varsPreview.contentWindow.postMessage(encodeURIComponent(editor.getValue()), '*');
          });

          actions.querySelector('.settings-actions').insertAdjacentHTML(
            'beforeend',
            `
            <button class="button action secondary publish-theme">Publish</button>
          `,
          );

          actions.querySelector('.publish-theme').onclick = async () => {
            editor.display.wrapper.classList.add('sending');
            editor.setOption('readOnly', true);
            const response = await fetch(`${SCRIPT_API}/cssVariables/${id}`, {
              method: 'POST',
              headers: { ...headers, 'content-type': 'application/json' },
              body: JSON.stringify({ css: btoa(editor.getValue()) }),
            });
            window.alert(response.ok ? 'Variables successfully updated!' : OOPS);
            editor.display.wrapper.classList.remove('sending');
            editor.setOption('readOnly', false);
          };
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
