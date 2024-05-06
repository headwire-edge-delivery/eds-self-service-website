import {
  SCRIPT_API, onAuthenticated, OOPS, WORKER_API,
} from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';

const protectedBlocks = {
  header: true,
  footer: true,
};

const iconBase64Prefix = 'data:image/svg+xml;base64,';

function dialogSetup({
  name, deleteWarning, project, headers, isIcon = false, iconBase64,
}) {
  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = `
    <h3>${name} ${isIcon ? 'Icon' : 'Block'}</h3>
    <p>${deleteWarning || ''}</p>
    ${iconBase64 ? `<img class="icon-display" src="${iconBase64}" alt="icon display" />` : ''}
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
      <h3>${name} deleted</h3>
      `;
      deleteButton.remove();
      document.querySelectorAll(`li[data-block-name="${name}"], li[data-icon-name="${name}"]`).forEach((item) => item.remove());
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
  dialogContent.innerHTML = '<h3>Loading available blocks...</h3>';
  const dialog = window.createDialog(dialogContent);

  Promise.all([
    fetch(`${SCRIPT_API}/compatibleBlocks/${id}`, { headers }).then((res) => res.json()),
    fetch(`${SCRIPT_API}/blocks/${id}`, { headers }).then((res) => res.json()),
  ]).then(([compatibleBlocks, currentBlocks]) => {
    const data = compatibleBlocks.filter(
      (item) => !currentBlocks.some((currentBlocksItem) => currentBlocksItem.name === item.name),
    );

    if (data.length === 0) {
      dialog.renderDialog('<h3>No new blocks available</h3>');
      return;
    }

    const content = document.createElement('div');
    content.innerHTML = `
        <h3>Add block</h3>
        <select>
          ${data.map((blockOption) => `<option value="${blockOption.name}">${blockOption.name}</option>`).join('')}
        </select>`;

    const addButton = document.createElement('button');
    addButton.innerText = 'Add';

    addButton.onclick = async () => {
      const select = content.querySelector('select');
      if (!select.value) {
        alert('Please select a block');
        return;
      }
      dialog.classList.add('loading');
      dialog.dataset.loadingText = 'Adding Block...';
      const addRequest = await fetch(`${SCRIPT_API}/blocks/${id}/${select.value}`, {
        method: 'POST',
        headers,
      });
      if (addRequest.ok) {
        dialog.renderDialog(`<h3>${select.value} block added</h3>`);
        itemList.addItem({ name: select.value });
      } else {
        alert(OOPS);
      }
      dialog.classList.remove('loading');
    };
    dialog.renderDialog(content, [addButton]);
  });
}

function renderBlocksList(blocksList, actions, { project, headers, id }) {
  actions.querySelector('.blocks-actions').innerHTML = '<button class="button add-block">Add Block</button>';
  actions.querySelector('.add-block').onclick = () => addBlockDialogSetup({ id, headers, itemList: blocksList });

  blocksList.innerHTML = '';
  blocksList.addItem = ({ name, deleteWarning, createInfo }) => {
    const li = document.createElement('li');
    li.innerText = name;
    li.dataset.blockName = name;
    li.dataset.createInfo = createInfo || '';
    li.dataset.deleteWarning = deleteWarning || '';
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

function addIconDialogSetup({ headers, id, itemList }) {
  const dialogContent = document.createElement('div');
  dialogContent.innerHTML = `
    <h3>Add icon</h3>
    <input type="file" accept="image/svg+xml" />
    <div class="preview"></div>`;

  const preview = document.createElement('div');
  preview.classList.add('preview');
  dialogContent.append(preview);

  let file = null;
  let fileAsBase64 = null;
  dialogContent.querySelector('input[type="file"]').onchange = (event) => {
    [file] = event.target.files;
    if (file && file.type === 'image/svg+xml') {
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
      preview.innerHTML = 'Please select an SVG file';
    }
  };

  const addButton = document.createElement('button');
  addButton.innerText = 'Add';
  const dialog = window.createDialog(dialogContent, [addButton]);
  addButton.onclick = async () => {
    if (!file) {
      alert('Please select an SVG file');
      return;
    }
    const formData = new FormData();
    formData.append('icon', file);
    dialog.classList.add('loading');
    dialog.dataset.loadingText = 'Adding Icon...';
    const addRequest = await fetch(`${SCRIPT_API}/icons/${id}`, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (addRequest.ok) {
      dialog.renderDialog('<h3>Icon added</h3>');
      itemList.addItem({ name: file.name, base64: fileAsBase64 });
    } else {
      alert(OOPS);
    }
    dialog.classList.remove('loading');
  };
}

function renderIconsList(iconsList, actions, { project, headers, id }) {
  actions.querySelector('.icons-actions').innerHTML = '<button class="button add-icon">Add Icon</button>';
  actions.querySelector('.add-icon').onclick = () => addIconDialogSetup({ id, headers, itemList: iconsList });

  iconsList.innerHTML = '';
  iconsList.addItem = ({ name, base64 }) => {
    const li = document.createElement('li');
    li.dataset.iconName = name;
    li.innerText = name;
    li.onclick = () => dialogSetup({
      name,
      project,
      headers,
      isIcon: true,
      iconBase64: base64.startsWith(iconBase64Prefix) ? base64 : iconBase64Prefix + base64,
    });
    iconsList.append(li);
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
    const user = await window.auth0Client.getUser();
    const headers = { authorization: `bearer ${token}` };

    let editor = {
      refresh: () => {},
    };

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              ${user.given_name}'s Sites
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
              ${user.given_name}'s Sites
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${project.projectSlug}" aria-current="page">
              <h1>${project.projectName}</h1>
            </a>
          </div>
          
          <div class="actions">
            <div class="overview-actions button-container is-selected">
                <button class="button secondary delete">Delete</button>
            </div>
            <div class="pages-actions button-container"></div>
            <div class="blocks-actions button-container"></div>
            <div class="icons-actions button-container"></div>
            <div class="emails-actions button-container"></div>
            <div class="theme-actions button-container"></div>
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
                          Pages
                        </a>
                    </li>
                    <li>
                        <a href="#blocks" class="button secondary" target="_blank">
                          <span class="icon icon-blocks">
                            <img alt src="/icons/blocks.svg" loading="lazy">  
                          </span>
                          Blocks
                        </a>
                    </li>
                    <li>
                        <a href="#icons" class="button secondary" target="_blank">
                          <span class="icon icon-icons">
                            <img alt src="/icons/icons.svg" loading="lazy">  
                          </span>
                          Icons
                        </a>
                    </li>
                    <li>
                        <a href="#emails" class="button secondary" target="_blank">
                          <span class="icon icon-email">
                            <img alt src="/icons/email.svg" loading="lazy">  
                          </span>
                          Emails
                        </a>
                    </li>
                    <li>
                        <a href="#theme" class="button secondary" target="_blank">
                          <span class="icon icon-palette">
                            <img alt src="/icons/palette.svg" loading="lazy">  
                          </span>
                          Theme
                        </a>
                    </li>
                </ul>
            </aside>

            <div class="details">
                <div class="overview-panel is-selected">
                    <div class="container">
                        <div class="cards">
                            <div>
                              <strong>Site id</strong>
                              <span>${project.projectSlug}</span>
                          </div>
                          <div>
                              <strong>Site description</strong>
                              <span>${project.projectDescription}</span>
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
                </div>
                
                <div class="pages-panel">
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
                </div>
                
                <div class="blocks-panel">
                    <ul class="blocks list"></ul>
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>Blocks acts as a repository of building blocks for your website. Here, you can explore and select from a variety of available blocks to enhance your web pages.</p>
                    </div>
                </div>
                
                <div class="icons-panel">
                    <ul class="icons list"></ul>
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>Icons is your go-to resource for web assets that add visual flair and functionality to your website. Here, you'll find a curated collection of icons suitable for various purposes, from navigation to social media integration.</p>
                    </div>
                </div>
                
                <div class="emails-panel">
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
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>Emails serves as your toolkit for crafting impactful communication in your online endeavors tailored for various purposes, from newsletters to promotional campaigns streamlining your email creation process.</p>
                    </div>
                </div>
                
                <div class="theme-panel">
                    <div class="container">
                        <textarea class="vars"></textarea>
                    </div>
                    <div class="docs">
                      <h2>
                        <span class="icon icon-info">
                          <img alt src="/icons/info.svg" loading="lazy">  
                        </span>
                        Information
                      </h2>
                      <p>Theme is your gateway to tailor your website's visual identity to align perfectly with your brand. Here, you have the power to customize colors, ensuring consistency and harmony throughout your site.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

      const actions = block.querySelector('.actions');
      actions.querySelector('.overview-actions').insertAdjacentHTML('beforeend', `
        <a href="${project.sidekickSetupUrl}" class="button secondary" target="_blank">Install
        Sidekick</a>
        ${project.authoringGuideUrl ? `<a href="${project.authoringGuideUrl}" class="button secondary" target="_blank">Docs</a>` : ''}
        <a href="${project.driveUrl}" class="button secondary" target="_blank">Edit</a>
        <a href="${project.liveUrl}" class="button" target="_blank">Open</a>
      `);

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

          if (identifier === 'theme') {
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
          const lastUpdate = Math.max(
            ...data.map(({ lastModified }) => toDate(lastModified)),
          );
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
                    <a class="button secondary" href="${project.liveUrl}${item.path}" target="_blank">Open</a>
                    <a class="button secondary" href="/email-composer?id=${project.projectSlug}&url=${project.liveUrl}${
  item.path
}" target="_blank">Send</a>
                  </td>
              </tr>
            `;
            })
            .join('');

          // Rest of the pages
          block.querySelector('.pages tbody').innerHTML = data
            .filter(({ template, robots }) => !template.includes('email') && !robots.includes('noindex'))
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
                  <td><a class="button secondary" href="${project.liveUrl}${item.path}" target="_blank">Open</a></td>
              </tr>
            `;
            })
            .join('');
        })
        .catch((error) => {
          console.log(error);
        });

      // Load site blocks
      renderBlocksList(block.querySelector('.blocks'), actions, { project, headers, id });

      // Load site icons
      renderIconsList(block.querySelector('.icons'), actions, { project, headers, id });

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
          vars.value = css;

          editor = window.CodeMirror.fromTextArea(vars);
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
