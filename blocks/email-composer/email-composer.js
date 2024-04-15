import { SCRIPT_API, onAuthenticated, WORKER_API } from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const { searchParams } = new URL(window.location.href);
    const id = searchParams.get('id');
    const url = searchParams.get('url');
    if (!id) {
      window.location.href = '/dashboard';
      return;
    }

    if (!url) {
      window.location.href = `/site/${id}`;
      return;
    }

    const token = await window.auth0Client.getTokenSilently();
    const user = await window.auth0Client.getUser();
    let editor;

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              ${user.given_name}'s Sites
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}">
              ${id}
            </a>
          </div>
        </div>
        
        <div class="content">
            <p>
                <img class="loading" src="/icons/loading.svg" alt="loading" loading="lazy"/>
            </p>
        </div>
      </div>`;

    const reqEmail = await fetch(`${WORKER_API}/meta?content=${url}`);
    if (reqEmail.ok) {
      const { meta, variables } = await reqEmail.json();

      block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              ${user.given_name}'s Sites
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}">
              ${id}
            </a>
            <span>&rsaquo;</span>
            <a href="/email-composer?url=${url}" aria-current="page">
              <h1>${meta.title}</h1>
            </a>
          </div>
          
          <div class="actions"></div>
        </div>
        
        <div class="content">
            <div class="preview">
                <iframe src="${WORKER_API}?content=${url}"></iframe>
            </div>
            <aside>
                <h2>Recipients</h2>
                
                <div>
                    <input readonly value="${meta.recipients}">
                    <ul class="recipients"></ul>
                    <div class="button-container">
                        <button class="button is-disabled send">Send</button>
                    </div>
                </div>
                
                <h2>Variables</h2>
                ${variables.map((variable) => `
                  <div class="kv">
                      <input placeholder="Key" value="${variable}" readonly>
                      <input placeholder="Value">
                  </div>
                `).join('')}
                
                <button class="button secondary save-variables">Save variable${variables.length > 1 ? 's' : ''}</button>
                
                <h2>Styles (Developer)</h2>
                <div>
                    <label>Source</label>
                    <input readonly value="${meta.styles}" />
                </div>
                <div>
                    <label>Code</label>
                    <textarea class="styles"></textarea>
                    <button class="button secondary save-styles">Save custom styles</button>
                </div>
            </aside>
        </div>
      `;

      block.querySelector('.save-styles').onclick = async () => {
        const req = await fetch(`${WORKER_API}/save`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            styles: editor.getValue(),
          }),
        });

        if (req.ok) {
          const iframe = block.querySelector('.preview iframe');
          const source = new URL(iframe.src);
          source.searchParams.set('styles', await req.text());
          iframe.src = source.toString();
        }
      };

      block.querySelector('.save-variables').onclick = () => {
        const customVariables = {};
        block.querySelectorAll('.kv input:first-child').forEach((input) => {
          const key = input.value;
          const { value } = input.nextElementSibling;
          if (value) {
            customVariables[key] = value;
          }
        });

        const keys = Object.keys(customVariables);
        if (keys.length) {
          const iframe = block.querySelector('.preview iframe');
          const source = new URL(iframe.src);
          keys.forEach((key) => {
            source.searchParams.set(key, customVariables[key]);
          });
          iframe.src = source.toString();
        }
      };

      fetch(`${SCRIPT_API}/list/${id}?email=${user.email}`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      }).then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error(res.status);
      })
        .then(({ project }) => {
          const rootId = project.driveUrl.split('/').pop();
          block.querySelector('.actions').innerHTML = `<a href="https://drive.google.com/drive/search?q=${meta.title}%20type:document%20parent:${rootId}" target="_blank" className="button secondary className>Edit email</a>`;
        })
        .catch((error) => {
          console.log(error);
        });


      fetch(`${WORKER_API}/proxy?url=${meta.recipients}`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          return { data: [] };
        })
        .then(({ data }) => {
          const recipients = block.querySelector('.recipients');
          recipients.innerHTML = data.map(({ email }) => {
            if (email) {
              return `<li>${email}</li>`;
            }

            return '';
          }).join('');

          if (recipients.childElementCount) {
            block.querySelector('.send').classList.remove('is-disabled');
          }
        });

      loadCSS('/libs/codemirror/codemirror.css');
      await import('../../libs/codemirror/codemirror.js');
      await import('../../libs/codemirror/css.js');

      fetch(`${WORKER_API}/proxy?url=${meta.styles}`)
        .then((res) => {
          if (res.ok) {
            return res.text();
          }
          return '';
        })
        .then((css) => {
          const styles = block.querySelector('.styles');
          styles.value = css;
          editor = window.CodeMirror.fromTextArea(styles);
        });
    }
  });
}
