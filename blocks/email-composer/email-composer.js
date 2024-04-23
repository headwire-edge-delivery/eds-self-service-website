import {
  SCRIPT_API, onAuthenticated, WORKER_API, OOPS,
} from '../../scripts/scripts.js';
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
    const recipientsData = [];
    // replace variables
    const regExp = /(?<=\{).+?(?=\})/g;

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
                <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
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
              <h1>${meta.subject}</h1>
            </a>
          </div>
          
          <div class="actions"></div>
        </div>
        
        <div class="content">
            <div class="preview">
                <iframe src="${WORKER_API}?content=${url}"></iframe>
            </div>
            <aside>
                <h2>From</h2>
                <input type="email" value="" placeholder="user@domain.com" class="from">
                
                <h2>Subject</h2>
                <input readonly value="${meta.subject}">
                
                <h2>Recipients</h2>
                
                <div>
                    <ul class="recipients"></ul>
                    <div class="button-container">
                        <button class="button secondary is-disabled select-all">Select all</button>
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
                
                <button class="button secondary enable-styles">Edit styles (developer mode)</button>
                <div>
                    <label>Code</label>
                    <textarea class="styles"></textarea>
                    <button class="button secondary save-styles">Save custom styles</button>
                </div>
            </aside>
        </div>
      `;

      const iframe = block.querySelector('.preview iframe');
      const customVariables = {};

      // Setup preview loading animations
      iframe.onload = () => {
        iframe.classList.remove('is-loading');
      };

      // Find variable in first selected recipient columns
      const replaceMatches = (value) => {
        let newValue = value;
        const matches = value.match(regExp);
        if (matches) {
          const selectedEmail = block.querySelector('.recipients li.is-selected').textContent;
          const selectedRecipient = recipientsData.find(({ email }) => email === selectedEmail);
          matches.forEach((match) => {
            const matchingCol = Object.keys(selectedRecipient).find((col) => col === match);
            newValue = value.replace(`{${match}}`, selectedRecipient[matchingCol] ?? '');
          });
        }

        return newValue;
      };

      // Render codemirror
      block.querySelector('.enable-styles').onclick = (event) => {
        event.target.remove();
        editor = window.CodeMirror.fromTextArea(block.querySelector('.styles'));
      };

      // Render preview with custom styles
      block.querySelector('.save-styles').onclick = async () => {
        const req = await fetch(`${WORKER_API}/save`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `bearer ${token}`,
          },
          body: JSON.stringify({
            styles: editor.getValue(),
          }),
        });

        if (req.ok) {
          const source = new URL(iframe.src);
          source.searchParams.set('styles', await req.text());
          iframe.classList.add('is-loading');
          iframe.src = source.toString();
        }
      };

      // Render preview with custom variables
      block.querySelector('.save-variables').onclick = () => {
        block.querySelectorAll('.kv input:first-child').forEach((input) => {
          const key = input.value;
          const { value } = input.nextElementSibling;
          customVariables[key] = value;
        });

        const keys = Object.keys(customVariables);
        if (keys.length) {
          const source = new URL(iframe.src);
          keys.forEach((key) => {
            const newValue = replaceMatches(customVariables[key]);
            source.searchParams.set(key, newValue);
          });
          iframe.classList.add('is-loading');
          iframe.src = source.toString();
        }
      };

      // Load site to retrieve drive id
      fetch(`${SCRIPT_API}/list/${id}`, {
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
          block.querySelector('.actions').innerHTML = `<a href="https://drive.google.com/drive/search?q=${meta.subject}%20type:document%20parent:${rootId}" target="_blank" className="button secondary className>Edit email</a>`;
        })
        .catch((error) => {
          console.log(error);
        });

      // Load email metadata
      fetch(`${SCRIPT_API}/recipients/${id}`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          return { values: [] };
        })
        .then(({ values }) => {
          if (values.length) {
            for (let i = 1; i < values.length; i += 1) {
              const row = values[i];
              const item = {};
              values[0].forEach((col) => {
                item[col] = row[values[0].indexOf(col)];
              });
              recipientsData.push(item);
            }

            const recipients = block.querySelector('.recipients');
            recipients.innerHTML = recipientsData.map(({ email }, i) => {
              if (email) {
                return `<li class="${i === 0 ? 'is-selected' : ''}">${email}</li>`;
              }

              return '';
            }).join('');

            if (recipients.childElementCount) {
              const send = block.querySelector('.send');
              const selectAll = block.querySelector('.select-all');

              send.classList.remove('is-disabled');
              selectAll.classList.remove('is-disabled');
              const emails = recipients.querySelectorAll('li');

              selectAll.onclick = () => {
                emails.forEach((el) => {
                  el.classList.add('is-selected');
                });
              };

              emails.forEach((el) => {
                el.onclick = () => {
                  // Always keep 1 selected at least
                  if (recipients.querySelectorAll('li.is-selected').length === 1
                    && recipients.querySelector('li.is-selected') === el) {
                    return;
                  }

                  el.classList.toggle('is-selected', !el.classList.contains('is-selected'));

                  if (recipients.querySelectorAll('li.is-selected').length === 1) {
                    // Re-render preview with newly selected recipient
                    block.querySelector('.save-variables').click();
                    block.querySelector('h1').textContent = replaceMatches(meta.subject);
                  }
                };
              });

              send.onclick = async () => {
                const selectedRecipients = [...recipients.querySelectorAll('li.is-selected')];

                if (window.confirm(`You are about to send an email to ${selectedRecipients.length} recipient(s).\nDo you want to continue ?`)) {
                  send.classList.add('is-disabled');

                  const previewSource = new URL(iframe.src);
                  const req = await fetch(`${WORKER_API}/send`, {
                    headers: {
                      'content-type': 'application/json',
                      authorization: `bearer ${token}`,
                    },
                    body: JSON.stringify({
                      styles: previewSource.searchParams.get('styles'),
                      content: previewSource.searchParams.get('content'),
                      from: block.querySelector('.from').value,
                      variables: customVariables,
                      to: recipientsData.filter(({ email }) => selectedRecipients
                        .find((el) => el.textContent === email)),
                    }),
                    method: 'POST',
                  });

                  if (req.ok) {
                    alert('Email delivered successfully!');
                  } else {
                    alert(OOPS);
                  }

                  send.classList.remove('is-disabled');
                }
              };
            }
          }
        });

      // Load codemirror to edit styles
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
        });
    }
  });
}
