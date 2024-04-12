import { API, onAuthenticated, oops } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const id = window.location.pathname.split('/').pop();
    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();

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
                <img class="loading" src="/icons/loading.svg" alt="loading" loading="lazy"/>
            </p>
        </div>
      </div>`;

    const reqDetails = await fetch(`${API}/list/${id}?email=${user.email}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
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

      block.querySelector('.delete').onclick = async () => {
        block.classList.add('is-deleting');
        if (window.confirm('Are you sure ?')) {
          const reqDelete = await fetch(`${API}/delete/${project.projectSlug}`, {
            method: 'DELETE',
          });
          if (reqDelete.ok) {
            window.location.href = '/dashboard';
          } else {
            alert(oops);
            block.classList.remove('is-deleting');
          }
        } else {
          block.classList.remove('is-deleting');
        }
      };

      fetch(`${API}/sheet?url=${project.liveUrl}/query-index.json`).then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error(res.status);
      })
        .then(({ filtered }) => {
          const toDate = (lastModified) => new Date(Number(lastModified) * 1000);
          const lastUpdate = Math.max(...filtered.data
            .map(({ lastModified }) => toDate(lastModified)));
          block.querySelector('.last-update').textContent = new Date(lastUpdate).toLocaleString();

          block.querySelector('.emails tbody').innerHTML = filtered.data.filter(({ path }) => path.startsWith('/emails/')).map((item) => {
            const title = document.createElement('div');
            title.innerHTML = item.title;

            const description = document.createElement('div');
            description.innerHTML = item.description;

            return `
              <tr>
                  <td>${title.textContent}</td>
                  <td>${description.textContent.length ? `${description.textContent.substring(0, 100)}…` : ''}</td>          
                  <td>${toDate(item.lastModified).toLocaleString()}</td>
                  <td><a class="button secondary" href="/email-composer?url=${project.liveUrl}${item.path}" target="_blank">Edit</a></td>
              </tr>
            `;
          }).join('');

          block.querySelector('.pages tbody').innerHTML = filtered.data.filter(({ path }) => !path.startsWith('/emails/')).map((item) => {
            const title = document.createElement('div');
            title.innerHTML = item.title;

            const description = document.createElement('div');
            description.innerHTML = item.description;

            return `
              <tr>
                  <td>${title.textContent}</td>
                  <td>${description.textContent.length ? `${description.textContent.substring(0, 100)}…` : ''}</td>
                  <td><a target="_blank" href="${project.liveUrl}${item.path}">${item.path}</a></td>          
                  <td>${new Date(Number(item.lastModified) * 1000).toLocaleString()}</td>
              </tr>
            `;
          }).join('');
        })
        .catch((error) => {
          console.log(error);
        });

      fetch(`${API}/blocks/${project.projectSlug}`).then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error(res.status);
      })
        .then((blocks) => {
          block.querySelector('.blocks').innerHTML = blocks.map(({ name }) => `<li>${name}</li>`).join('');
        })
        .catch((error) => {
          console.log(error);
        });

      fetch(`${API}/icons/${project.projectSlug}`).then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error(res.status);
      })
        .then((icons) => {
          block.querySelector('.icons').innerHTML = icons.map(({ name }) => `<li>${name}</li>`).join('');
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      block.querySelector('.content p').textContent = oops;
    }
  });
}
