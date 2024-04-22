import {
  SCRIPT_API, onAuthenticated, OOPS, WORKER_API,
} from '../../scripts/scripts.js';

const protectedBlocks = {
  search: true,
  header: true,
  footer: true,
  schedule: true,
};

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const id = window.location.pathname.split('/').pop();
    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();
    const headers = { authorization: `bearer ${token}` };

    function openDialogForIcon(listElement) {
      const dialog = block.querySelector('.display-dialog');
      dialog.className = 'display-dialog displaying-icon';
      dialog.innerHTML = `
      <div class="dialog-content">
        <h3>${listElement.innerText}</h3>
        <img src="${listElement.dataset.iconBase64}" alt="icon display" />
        <div class="button-container">
          <button class="button close">Close</button>
          <button class="button delete">Delete</button>
        </div>
      </div>
      `;

      dialog.querySelector('.delete').onclick = async () => {
        if (window.confirm('Are you sure ?')) {
          dialog.classList.add('is-deleting');
          const reqDelete = await fetch(`${SCRIPT_API}/icons/${id}/${listElement.dataset.iconName}`, {
            method: 'DELETE',
            headers,
          });
          if (reqDelete.ok) {
            dialog.innerHTML = `<div class="dialog-content"><h3>${listElement.dataset.iconName} deleted</h3><div class="button-container"><button class="button close">Close</button></div>`;
            block.querySelector(`li[data-icon-name="${listElement.dataset.iconName}"]`).remove();
          } else {
            alert(OOPS);
          }
          dialog.classList.remove('is-deleting');
        }
      };

      dialog.showModal();
    }

    function openDialogAddIcon() {
      const dialog = block.querySelector('.display-dialog');
      dialog.className = 'display-dialog add-icon';
      dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Add icon</h3>
        <input type="file" accept="image/svg+xml" />
        <div class="preview"></div>
        <div class="button-container">
          <button class="button close">Close</button>
          <button class="button add">Add</button>
        </div>
      </div>`;

      dialog.querySelector('input[type="file"]').onchange = (event) => {
        const file = event.target.files[0];
        const preview = dialog.querySelector('.preview');
        if (file && file.type === 'image/svg+xml') {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            preview.innerHTML = '';
            preview.appendChild(img);
          };
          reader.readAsDataURL(file);
        } else {
          preview.innerHTML = 'Please select an SVG file';
        }
      };

      dialog.querySelector('.button.add').onclick = async () => {
        const file = dialog.querySelector('input[type="file"]').files[0];
        if (!file) {
          alert('Please select an SVG file');
          return;
        }
        const formData = new FormData();
        formData.append('icon', file);
        dialog.classList.add('is-adding');
        const addRequest = await fetch(`${SCRIPT_API}/icons/${id}`, {
          method: 'POST',
          body: formData,
          headers,
        });
        if (addRequest.ok) {
          dialog.innerHTML = '<div class="dialog-content"><h3>Icon added</h3><div class="button-container"><button class="button close">Close</button></div>';
        } else {
          alert(OOPS);
        }
        dialog.classList.remove('is-adding');
      };

      dialog.showModal();
    }

    function openDialogForBlock(listElement) {
      const dialog = block.querySelector('.display-dialog');
      dialog.className = 'display-dialog displaying-block';
      dialog.innerHTML = `
      <div class="dialog-content">
        <h3>${listElement.innerText} Block</h3>
        <div class="button-container">
          <button class="button close">Close</button>
          <button class="button delete">Delete</button>
        </div>
      </div>
      `;
      const deleteButton = dialog.querySelector('.delete');

      if (protectedBlocks[listElement.dataset.blockName]) {
        deleteButton.disabled = true;
      } else {
        deleteButton.onclick = async () => {
          if (window.confirm('Are you sure ?')) {
            dialog.classList.add('is-deleting');
            const reqDelete = await fetch(`${SCRIPT_API}/blocks/${id}/${listElement.dataset.blockName}`, {
              method: 'DELETE',
              headers,
            });
            if (reqDelete.ok) {
              dialog.innerHTML = `<div class="dialog-content"><h3>${listElement.dataset.blockName} deleted</h3><div class="button-container"><button class="button close">Close</button></div>`;
              block.querySelector(`li[data-block-name="${listElement.dataset.blockName}"]`).remove();
            } else {
              alert(OOPS);
            }
            dialog.classList.remove('is-deleting');
          }
        };
      }

      dialog.showModal();
    }

    function openDialogAddBlock() {
      const dialog = block.querySelector('.display-dialog');
      dialog.className = 'display-dialog add-block';
      dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Loading available blocks...</h3>
      </div>`;

      Promise.all([
        fetch(`${SCRIPT_API}/compatibleBlocks/${id}`, { headers }).then((res) => res.json()),
        fetch(`${SCRIPT_API}/blocks/${id}`, { headers }).then((res) => res.json()),
      ])
        .then(([compatibleBlocks, currentBlocks]) => {
          const data = compatibleBlocks.filter((item) => !currentBlocks
            .some((currentBlocksItem) => currentBlocksItem.name === item.name));

          if (data.length === 0) {
            dialog.innerHTML = '<div class="dialog-content"><h3>No new blocks available</h3><div class="button-container"><button class="button close">Close</button></div>';
            return;
          }
          dialog.innerHTML = `
        <div class="dialog-content">
          <h3>Add block</h3>
          <select>
            ${data.map((blockOption) => `<option value="${blockOption.name}">${blockOption.name}</option>`).join('')}
          </select>
          <div class="button-container">
            <button class="button close">Close</button>
            <button class="button add">Add Block</button>
          </div>
        </div>`;

          dialog.querySelector('.button.add').onclick = async () => {
            const select = dialog.querySelector('select');
            if (!select.value) {
              alert('Please select a block');
              return;
            }
            dialog.classList.add('is-adding');
            const addRequest = await fetch(`${SCRIPT_API}/blocks/${id}/${select.value}`, {
              method: 'POST',
              headers,
            });
            if (addRequest.ok) {
              dialog.innerHTML = `<div class="dialog-content"><h3>${select.value} block added</h3><div class="button-container"><button class="button close">Close</button></div>`;
            } else {
              alert(OOPS);
            }
            dialog.classList.remove('is-adding');
          };
        })
        .catch(() => {
          dialog.innerHTML = `
        <div class="dialog-content">
          <h3>Could not load available blocks</h3>
          <div class="button-container">
            <button class="button close">Close</button>
          </div>
        </div>`;
        });

      dialog.showModal();
    }

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
            <button class="button secondary delete">Delete site</button>
          </div>
        </div>
        
        <div class="content">
            <dialog class="display-dialog"></dialog>
            <aside>
                <ul>
                    <li>
                        <a href="${project.liveUrl}" class="button" target="_blank">Open site</a>
                    </li>
                    <li>
                        <a href="${project.driveUrl}" class="button secondary" target="_blank">Open Google Drive</a>
                    </li>
                    <li>
                        <a href="${project.sidekickSetupUrl}" class="button secondary" target="_blank">Install Sidekick</a>
                    </li>
                    <li>
                        <a href="${project.liveUrl}/tools/sidekick/library.html?plugin=blocks&path=/tools/sidekick/authoring-guides/authoring-guides&index=0" class="button secondary" target="_blank">Open Docs</a>
                    </li>
                </ul>
            </aside>

            <div class="details">
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
                
                <h2>Configuration</h2>
                <div class="config">
                    <div>
                      <label>Available Blocks</label>
                      <ul class="blocks"></ul>
                    </div>
                    
                    <div>
                      <label>SVG Icons</label>
                      <ul class="icons"></ul>
                    </div>
                </div>   
                
                <h2>Emails</h2>
                <table class="emails">
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
                
                <h2>Pages</h2>
                <table class="pages">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Path</th>
                        <th>Last update</th>
                      </tr>  
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

      block.querySelector('.display-dialog').onclick = (event) => {
        const dialog = event.currentTarget;
        if (event.target.isEqualNode(dialog) || event.target.className === 'button close') {
          dialog.close();
        }
      };

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
      fetch(`${WORKER_API}/proxy?url=${project.liveUrl}/query-index.json`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          throw new Error(res.status);
        })
        .then(({ filtered }) => {
          const toDate = (lastModified) => new Date(Number(lastModified) * 1000);
          const lastUpdate = Math.max(
            ...filtered.data.map(({ lastModified }) => toDate(lastModified)),
          );
          block.querySelector('.last-update').textContent = new Date(lastUpdate).toLocaleString();

          const rootId = project.driveUrl.split('/').pop();

          // Emails only
          block.querySelector('.emails tbody').innerHTML = filtered.data
            .filter(({ path }) => path.startsWith('/emails/'))
            .map((item) => {
              const title = document.createElement('div');
              title.innerHTML = item.title;

              const description = document.createElement('div');
              description.innerHTML = item.description;

              return `
              <tr>
                  <td><a href="https://drive.google.com/drive/search?q=${title}%20type:document%20parent:${rootId}" target="_blank">${
  title.textContent
}</a></td>
                  <td>${
  description.textContent.length ? `${description.textContent.substring(0, 100)}…` : ''
}</td>          
                  <td>${toDate(item.lastModified).toLocaleString()}</td>
                  <td><a class="button secondary" href="/email-composer?id=${project.projectSlug}&url=${
  project.liveUrl
}${item.path}" target="_blank">Edit</a></td>
              </tr>
            `;
            })
            .join('');

          // Rest of the pages
          block.querySelector('.pages tbody').innerHTML = filtered.data
            .filter(({ path }) => !path.startsWith('/emails/'))
            .map((item) => {
              const title = document.createElement('div');
              title.innerHTML = item.title;

              const description = document.createElement('div');
              description.innerHTML = item.description;

              return `
              <tr>
                  <td><a href="https://drive.google.com/drive/search?q=${title}%20type:document%20parent:${rootId}" target="_blank">${
  title.textContent
}</a></td>
                  <td>${description.textContent.length ? `${description.textContent.substring(0, 100)}…` : ''}</td>
                  <td><a target="_blank" href="${project.liveUrl}${item.path}">${item.path}</a></td>          
                  <td>${new Date(Number(item.lastModified) * 1000).toLocaleString()}</td>
              </tr>
            `;
            })
            .join('');
        })
        .catch((error) => {
          console.log(error);
        });

      // Load site blocks
      fetch(`${SCRIPT_API}/blocks/${project.projectSlug}`, { headers })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          throw new Error(res.status);
        })
        .then((blocks) => {
          const blocksList = block.querySelector('.blocks');
          blocks.forEach(({ name }) => {
            const li = document.createElement('li');
            li.innerText = name;
            li.dataset.blockName = name;
            li.onclick = () => openDialogForBlock(li);
            blocksList.appendChild(li);
          });
          const addBlock = document.createElement('li');
          addBlock.innerText = '+';
          addBlock.onclick = openDialogAddBlock;
          blocksList.appendChild(addBlock);
        })
        .catch((error) => {
          console.log(error);
        });

      // Load site icons
      fetch(`${SCRIPT_API}/icons/${project.projectSlug}`, { headers })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          throw new Error(res.status);
        })
        .then((icons) => {
          const iconsList = block.querySelector('.icons');
          icons.forEach(({ name, base64 }) => {
            const li = document.createElement('li');
            li.dataset.iconName = name;
            // li.dataset.iconDownloadUrl = download_url;
            li.dataset.iconBase64 = `data:image/svg+xml;base64,${base64}`;
            li.innerText = name;
            li.onclick = () => openDialogForIcon(li);
            iconsList.appendChild(li);
          });
          const addIcon = document.createElement('li');
          addIcon.innerText = '+';
          addIcon.onclick = openDialogAddIcon;
          iconsList.appendChild(addIcon);
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
