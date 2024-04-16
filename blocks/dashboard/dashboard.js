import { SCRIPT_API, onAuthenticated, OOPS } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();

    block.innerHTML = `
        <div class="nav">
          <h1>${user.given_name}'s Sites</h1>
          <a href="/" class="button">Create new site</a>
        </div>
        <div class="content">
            <p>
                <img class="loading" src="/icons/loading.svg" alt="loading" loading="lazy"/>
            </p>
        </div>
    `;

    const content = block.querySelector('.content');

    // List all sites
    const reqList = await fetch(`${SCRIPT_API}/list`, {
      headers: {
        'content-type': 'application/json',
        authorization: `bearer ${token}`,
      },
    });

    if (reqList.ok) {
      const { projects } = await reqList.json();
      if (!projects.length) {
        content.innerHTML = '<p>No Sites found</p>';
      } else {
        content.innerHTML = `
          <input type="text" placeholder="Filter sites" class="filter">
          
          <ul>
            ${projects.map(({ projectSlug, projectName, projectDescription }) => `
              <li>
                <a href="/site/${projectSlug}">
                  <h2>${projectName}</h2>
                  <p><strong>${projectSlug}</strong></p>
                  <p>${projectDescription}</p>
                </a>
              </li>
            `).join('')}
          </ul>
      `;

        const filter = content.querySelector('.filter');
        filter.oninput = () => {
          if (filter.value.length) {
            content.querySelectorAll('h2')
              .forEach((el) => {
                el.closest('li').hidden = !el.textContent.toLowerCase().includes(filter.value.toLowerCase().trim());
              });
          } else {
            content.querySelectorAll('li[hidden]').forEach((el) => {
              el.hidden = false;
            });
          }
        };
      }
    } else {
      content.querySelector('.content p').textContent = OOPS;
    }
  });
}