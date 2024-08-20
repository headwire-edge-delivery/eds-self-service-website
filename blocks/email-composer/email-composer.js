import {
  SCRIPT_API, onAuthenticated, EMAIL_WORKER_API, OOPS, KESTREL_ONE,
  projectRepo,
} from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const path = `/${split.slice(3).join('/')}`;
    const url = `https://preview--${id}.${KESTREL_ONE}${path}`;

    const token = await window.auth0Client.getTokenSilently();

    let project;

    const googleProjectResponse = await fetch(`${SCRIPT_API}/list/${id}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    });
    const googleProjectData = await googleProjectResponse.json();
    project = googleProjectData?.project;

    if (!project) {
      // try dark alley
      const darkAlleyProjectResponse = await fetch(`${SCRIPT_API}/darkAlleyList/${id}`);
      const darkAlleyProjectData = await darkAlleyProjectResponse.json();
      project = darkAlleyProjectData?.project;
    }

    // no project
    if (!project) {
      block.querySelector('.content p').textContent = OOPS;
      return;
    }

    let editor;
    let recipientsData = {
      headers: [],
      data: [],
    };
    // replace variables
    const regExp = /(?<=\{).+?(?=\})/g;

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              Dashboard
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

    const reqEmail = await fetch(`${EMAIL_WORKER_API}/meta/${url}`);
    if (reqEmail.ok) {
      const { meta, variables } = await reqEmail.json();
      let customVariables = {};

      if (window.localStorage[window.location.href]) {
        try {
          customVariables = JSON.parse(window.localStorage[window.location.href]);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(e);
        }
      }

      block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}">
              ${id}
            </a>
            <span>&rsaquo;</span>
            <a href="${window.location.href}" aria-current="page">
              <h1 class="subject">${meta.subject}</h1>
            </a>
          </div>
          
          <div class="actions"></div>
        </div>
        
        <div class="content">
            <div class="preview">
                <iframe name="preview" src="${EMAIL_WORKER_API}/preview/${url}"></iframe>
            </div>
            <aside>
                <div id="email-subject">
                <h2>Subject</h2>
                <input class="subject" type="text" readonly value="${meta.subject}">
                </div>
                
                <div id="email-recipients">
                <h2>Recipients</h2>
                
                <div class="recipients-wrapper">
                    <table class="recipients">
                        <tr>
                          <td>
                              <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
                          </td>
                        </tr>
                    </table>
                </div>
                </div>
                
                <div id="email-variables">
                <h2>Variables</h2>
                ${variables.map((variable) => `
                  <div class="kv">
                      <input type="text" placeholder="Key" value="${variable}" readonly>
                      <input type="text" placeholder="Value" value="${customVariables[variable] ?? ''}">
                  </div>
                `).join('')}
                
                <div class="button-container">
                    <button class="button secondary action preview-variables">Preview</button>
                    <button class="button secondary action save-variables">Save variable${variables.length > 1 ? 's' : ''}</button>
                </div>

                <div id="email-styles">
                <h2>Styles (Developer)</h2>                
                <button class="button secondary action enable-styles">Edit styles (developer mode)</button>
                <form class="form" action="${EMAIL_WORKER_API}/preview/${url}" method="POST" target="preview">
                    <textarea name="styles" class="styles"></textarea>
                    <div class="button-container">
                        <button type="submit" class="button secondary action">Preview</button>
                        <button type="button" class="button secondary action save-styles">Save styles</button>
                    </div>
                </form>
                </div>
            </aside>
        </div>
      `;

      const iframe = block.querySelector('.preview iframe');
      const form = block.querySelector('.form');
      const previewVars = block.querySelector('.preview-variables');
      const saveVars = block.querySelector('.save-variables');
      let warning = { hidden: true };
      let savedEditorStyles;

      const hideWarning = () => {
        const JSONVars = JSON.stringify(customVariables);
        const savedVars = JSONVars === window.localStorage[window.location.href];

        if (!editor) {
          if (savedVars) {
            warning.hidden = true;
          }
          return;
        }

        if (editor.getValue() === savedEditorStyles && savedVars) {
          warning.hidden = true;
        }
      };

      // Find variable in first selected recipient columns
      const replaceMatches = (value) => {
        let newValue = value;
        const matches = value.match(regExp);
        if (matches) {
          const rendering = block.querySelector('.recipients tbody tr.is-rendering, .recipients tbody tr:has(input:checked)');
          if (!rendering) {
            return newValue;
          }

          const selectedEmail = rendering.dataset.email;
          const selectedRecipient = recipientsData.data
            .find(({ email }) => email === selectedEmail);

          matches.forEach((match) => {
            const matchingCol = Object.keys(selectedRecipient).find((col) => col === match);
            newValue = value.replace(`{${match}}`, selectedRecipient[matchingCol] ?? `{${match}}`);
          });
        }

        return newValue;
      };

      // Render codemirror
      block.querySelector('.enable-styles').onclick = (event) => {
        window?.zaraz?.track('click email styles enable', { url: window.location.href });

        event.target.remove();
        editor = window.CodeMirror.fromTextArea(block.querySelector('.styles'));
        editor.on('change', () => {
          warning.hidden = false;
        });

        savedEditorStyles = editor.getValue();
      };

      const saveStyles = block.querySelector('.save-styles');
      saveStyles.onclick = async () => {
        window?.zaraz?.track('click email preview styles', { url: window.location.href });

        savedEditorStyles = editor.getValue();

        saveStyles.classList.add('is-disabled');
        const req = await fetch(`${SCRIPT_API}/emailStyles/${id}`, {
          method: 'POST',
          headers: {
            authorization: `bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            fileName: meta.styles.replace('/styles/email/', '').replace('.css', ''),
            css: btoa(editor.getValue()),
          }),
        });
        await window.alertDialog(req.ok ? 'Styles successfully updated! Updates can take up to 1 minute to be reflected for all users.' : OOPS);
        saveStyles.classList.remove('is-disabled');

        hideWarning();
      };

      // Render preview with custom variables
      previewVars.onclick = () => {
        window?.zaraz?.track('click email preview variables', { url: window.location.href });

        block.querySelectorAll('.kv input:first-child').forEach((input) => {
          const key = input.value;
          const { value } = input.nextElementSibling;
          customVariables[key] = value;
        });

        if (JSON.stringify(customVariables) !== window.localStorage[window.location.href]) {
          warning.hidden = false;
        }

        const keys = Object.keys(customVariables);
        const oldSource = new URL(iframe.src);
        const newSource = new URL(`${oldSource.origin}${oldSource.pathname}`);
        let newSubject = meta.subject;
        keys.forEach((key) => {
          const newValue = replaceMatches(customVariables[key]);
          newSubject = newSubject.replace(`{${key}}`, newValue || `{${key}}`);

          if (newValue) {
            newSource.searchParams.set(key, newValue);
          }
        });

        block.querySelector('h1.subject').textContent = newSubject;
        block.querySelector('input.subject').value = newSubject;

        iframe.src = newSource.toString();
        form.action = newSource.toString();
        form.submit();
      };
      // Re-render with saved variables
      previewVars.click();

      saveVars.onclick = () => {
        window?.zaraz?.track('click email save variables', { url: window.location.href });

        previewVars.click();
        window.localStorage[window.location.href] = JSON.stringify(customVariables);

        hideWarning();

        const text = saveVars.textContent;
        saveVars.textContent = '✓';
        setTimeout(() => {
          saveVars.textContent = text;
        }, 2000);
      };

      block.querySelector('.actions').innerHTML = `
            <div class="warning" hidden>
              <span class="icon icon-info">
                <img alt src="/icons/info.svg" loading="lazy">  
              </span>
              <span>You have unsaved changes</span>
              <button type="button" aria-label="close">&#x2715;</button>
            </div>

            <a href="#" target="_blank" id="copy-button" class="button secondary action copy">Copy</a>
            <button id="edit-button" class="button action secondary edit">Edit</button>
            <button id="send-button" class="button primary action send is-disabled">Send</button>
          `;

      warning = block.querySelector('.warning');
      warning.querySelector('button').onclick = () => {
        warning.hidden = true;
      };

      const editButton = block.querySelector('.actions button.edit');
      if (project?.darkAlleyProject) {
        // DA project
        const daEditLink = document.createElement('a');
        daEditLink.classList.add('button', 'action', 'secondary', 'edit');
        daEditLink.target = '_blank';
        daEditLink.href = `https://da.live/edit#/da-self-service/${id}${path}`;
        daEditLink.innerText = 'Edit';
        daEditLink.id = 'edit-button';
        editButton.replaceWith(daEditLink);
      } else {
        // is drive project
        editButton.addEventListener('click', async () => {
          editButton.classList.add('loading');
          const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${project.projectSlug}/main${path}?editUrl=auto`).then((res) => res.json()).catch(() => null);
          if (statusData?.edit?.url) {
            window.open(statusData.edit.url, '_blank');
          } else {
            window.open(project.driveUrl, '_blank');
          }
          editButton.classList.remove('loading');
        });
      }

      if (project.darkAlleyProject) {
        block.querySelectorAll('.breadcrumbs a').forEach((link) => {
          if (link.href.includes('/site/')) {
            link.href = link.href.replace('/site/', '/da-site/');
          }
        });
      }

      block.querySelector('.edit').onclick = () => {
        window?.zaraz?.track('click email edit', { url: window.location.href });
      };

      block.querySelector('.copy').onclick = (e) => {
        window?.zaraz?.track('click email copy', { url: window.location.href });

        e.preventDefault();

        window.open(iframe.src.replace('/preview/', '/copy/'), '_blank');
      };

      // Load codemirror to edit styles
      loadCSS('/libs/codemirror/codemirror.min.css');
      await import('../../libs/codemirror/codemirror.min.js');
      await import('../../libs/codemirror/css.min.js');

      fetch(`${project.customPreviewUrl}${meta.styles}`)
        .then((resStyles) => {
          if (resStyles.ok) {
            return resStyles.text();
          }
          return '';
        })
        .then((css) => {
          const styles = block.querySelector('.styles');
          styles.value = css;
        });

      // Load email metadata
      fetch(`${SCRIPT_API}/${project.darkAlleyProject ? 'daSheets' : 'sheets'}/${id}?sheetPath=recipients`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          return false;
        })
        .then((data) => {
          const recipients = block.querySelector('.recipients');

          if (!data) {
            recipients.textContent = 'No recipient spreadsheet found.';
            return;
          }

          recipientsData = data;
          recipients.innerHTML = `
              <thead>
                <tr>
                    <th><input type="checkbox"></th>
                    ${recipientsData.headers.map((key) => `<th>${key}</th>`).join('')}
                    <th></th>
                </tr>
              </thead>
              <tbody>
                ${recipientsData.data.map((row) => `<tr data-email="${row.email}">
                    <td><input type="checkbox" class="select"></td>
                    ${recipientsData.headers.map((key) => `<td>${row[key] ? row[key] : ''}</td>`).join('')}
                    <td>
                        <div class="button-container">
                          <button class="button secondary action render">Preview</button>
                          <button class="button secondary action remove">Remove</button>
                        </div>
                    </td>
                </tr>`).join('')}
                <tr>
                    <td></td>
                    ${recipientsData.headers.map(() => '<td><input type="text"></td>').join('')}
                    <td>
                        <button class="button secondary action add is-disabled">Add</button>
                    </td>
                </tr>
              </tbody>
            `;

          const send = block.querySelector('.send');
          const toggleSendDisabled = () => {
            send.classList.toggle('is-disabled', recipients.querySelector('tbody input[type="checkbox"]:checked') === null);
          };

          recipients.querySelector('thead input[type="checkbox"]').onclick = (e) => {
            const check = e.target.checked;
            recipients.querySelectorAll('tbody input[type="checkbox"]').forEach((checkbox) => {
              checkbox.checked = check;
            });

            toggleSendDisabled();
          };

          recipients.querySelector('tbody').onclick = (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
              toggleSendDisabled();
            } else if (e.target.matches('.render')) {
              window?.zaraz?.track('click email preview recipients', { url: window.location.href });

              const isRendering = recipients.querySelector('.is-rendering');
              if (isRendering) {
                isRendering.classList.remove('is-rendering');
              }

              e.target.closest('tr').classList.add('is-rendering');

              // Re-render preview with newly selected recipient
              previewVars.click();
            } else if (e.target.matches('.remove')) {
              window?.zaraz?.track('click email recipients remove', { url: window.location.href });

              const tr = e.target.closest('tr');
              const index = [...tr.parentElement.children].indexOf(tr);
              tr.remove();

              toggleSendDisabled();

              fetch(`${SCRIPT_API}/${project.darkAlleyProject ? 'daSheets' : 'sheets'}/${id}?sheetPath=recipients&row=${index}`, {
                method: 'DELETE',
                headers: {
                  authorization: `bearer ${token}`,
                },
              });
            }
          };

          const add = recipients.querySelector('.add');
          const addInputs = [...recipients.querySelectorAll('tbody tr:last-child input')];
          addInputs.forEach((input) => {
            input.onkeydown = () => {
              const values = addInputs.map((addInput) => addInput.value).join('');
              add.classList.toggle('is-disabled', values.length === 0);
            };
          });

          add.onclick = () => {
            window?.zaraz?.track('click email recipients add', { url: window.location.href });

            const newRecipient = {};
            recipientsData.headers.forEach((key, index) => {
              newRecipient[key] = addInputs[index].value;
            });
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="select"></td>
                ${addInputs.map((input) => `<td>${input.value}</td>`).join('')}   
                <td>
                    <div class="button-container">
                        <button class="button secondary action render">Preview</button>
                        <button class="button secondary action remove">Remove</button>
                    </div>
                </td>
              `;
            recipientsData.data.push(newRecipient);
            tr.dataset.email = newRecipient.email;
            add.closest('tr').before(tr);

            // Reset
            addInputs.forEach((input) => {
              input.value = '';
            });

            fetch(`${SCRIPT_API}/${project.darkAlleyProject ? 'daSheets' : 'sheets'}/${id}?sheetPath=recipients`, {
              method: 'POST',
              headers: {
                authorization: `bearer ${token}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify(newRecipient),
            });
          };

          send.onclick = async () => {
            window?.zaraz?.track('click email send', { url: window.location.href });

            // Preview to update the iframe source
            previewVars.click();

            const selectedRecipients = [...recipients.querySelectorAll('tbody tr:has(input:checked)')];

            if (await window.confirmDialog(`You are about to send an email to ${selectedRecipients.length} recipient(s).\nDo you want to continue ?`)) {
              window?.zaraz?.track('click email copy submit', { url: window.location.href });

              block.classList.add('is-sending');

              const previewSource = new URL(iframe.src);
              const req = await fetch(`${SCRIPT_API}/${project.darkAlleyProject ? 'daSend' : 'send'}/${id}`, {
                headers: {
                  'content-type': 'application/json',
                  authorization: `bearer ${token}`,
                },
                body: JSON.stringify({
                  styles: block.querySelector('.styles').value,
                  url: previewSource.pathname.replace('/preview/', ''),
                  variables: customVariables,
                  to: recipientsData.data.filter(({ email }) => selectedRecipients
                    .find((el) => el.dataset.email === email)),
                }),
                method: 'POST',
              });

              if (req.ok) {
                await window.alertDialog('Email delivered successfully!');
              } else {
                await window.alertDialog(OOPS);
              }

              block.classList.remove('is-sending');
            }
          };
        });
    } else {
      block.querySelector('.content p').textContent = OOPS;
    }
  });
}
