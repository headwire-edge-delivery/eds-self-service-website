import { API, onAuthenticated } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const token = await window.auth0Client.getTokenSilently();
    const { email } = await window.auth0Client.getUser();

    const reqList = await fetch(`${API}/list?email=${email}`, {
      headers: {
        'content-type': 'application/json',
        authorization: `bearer ${token}`,
      },
    });

    if (reqList.ok) {
      const { projects } = await reqList.json();
      if (!projects.length) {
        block.innerHTML = '<h1>No sites found</h1>';
      } else {
        block.innerHTML = `
        <div class="nav">
          <h1>Ringel's Sites</h1>
          <a href="/" class="button">Create new site</a>
        </div>
        
        <div class="content">
          <input type="text" placeholder="Filter sites" class="filter">
          
          <ul>
            ${projects.map(({ name, description }) => `
              <li>
                <a href="/dashboard/${name}">
                  <h2>${description}</h2>
                  <p><strong>${name}</strong></p>
                  <p class="date">Created on Feb 14, 2024</p>
                </a>
              </li>
            `).join('')}
              
          </ul>
        </div>
      `;

        const filter = block.querySelector('.filter');
        filter.oninput = () => {
          if (filter.value.length) {
            block.querySelectorAll('h2')
              .forEach((el) => {
                el.closest('li').hidden = !el.textContent.toLowerCase().includes(filter.value.toLowerCase().trim());
              });
          } else {
            block.querySelectorAll('li[hidden]').forEach((el) => {
              el.hidden = false;
            });
          }
        };
      }
    } else {
      block.innerHTML = '<h1>Oops ! Something went wrong ... </h1>';
    }
  });

  // Check dashboard slug
  // if slug get details
  // list projects or list project details
  // list: name, url, project details and og:image index
  // project details: configure, paths, open newsletter
}
