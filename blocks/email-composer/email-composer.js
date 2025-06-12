import { SCRIPT_API, onAuthenticated, EMAIL_WORKER_API, OOPS, KESTREL_ONE, projectRepo, daProjectRepo, parseFragment } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { loadCSS, toCamelCase } from '../../scripts/aem.js';
import { confirmDialog } from '../../scripts/dialogs.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';
import { createDialog } from '../../scripts/dialogs.js';
import { confirmUnsavedChanges } from '../../scripts/utils.js';

let timer;
const debounce = (fn, delay = 800) => {
  // eslint-disable-next-line func-names
  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const campaignSlug = split[4];
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
      block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
      return;
    }

    let editor;
    let audience;
    // replace variables
    const regExp = /(?<=\{).+?(?=\})/g;

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard/sites">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}/emails/${campaignSlug}">
              ${id}
            </a>
          </div>
        </div>

        <div class="content">
            ${renderSkeleton('email-composer')}
        </div>
      </div>`;

    const load = async (checkboxStates) => {
      const reqEmail = await fetch(`${EMAIL_WORKER_API}/meta?contentUrl=${url}`);
      if (reqEmail.ok) {
        const { meta, variables } = await reqEmail.json();
        let customVariables = {};
        let initialVariables = {};

        // Default variables
        const defaults = {
          'contact email': project.contactEmail,
          copyright: `${new Date().getFullYear()}`,
        };
        const staticDefaults = {
          unsubscribe: `${SCRIPT_API}/unsubscribe/${project.projectSlug}/{id}`,
          email: '{email}',
          'first name': '{first name}',
          'last name': '{last name}',
          id: '{id}',
        };

        const staticDefaultsDescription = {
          unsubscribe: `Generates this <a href="${SCRIPT_API}/unsubscribe/${project.projectSlug}/{id}" target="_blank">URL</a>
        for the recipient to unsubscribe with the id of the recipient`,
          email: 'E-Mail Address of the recipient',
          'first name': 'First Name of the Recipient',
          'last name': 'Last Name of the Recipient',
          id: 'Unique id of the recipient',
        };

        variables.forEach((key) => {
          if (defaults[key]) {
            customVariables[key] = defaults[key];
          } else if (customVariables[key] === undefined) {
            customVariables[key] = '';
          }
        });

        Object.keys(staticDefaults).forEach((key) => {
          customVariables[key] = staticDefaults[key];
        });

        let localSave;
        if (window.localStorage[window.location.href]) {
          try {
            localSave = JSON.parse(window.localStorage[window.location.href]);
            customVariables = localSave?.variables ?? customVariables;
          } catch {
            // do nothing
          }
        }

        initialVariables = JSON.stringify(customVariables);

        block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard/sites">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}/emails/${campaignSlug}">
              ${id}
            </a>
            <span>&rsaquo;</span>
            <a href="${window.location.href}" aria-current="page">
              <h1 class="subject">${localSave?.subject ?? meta.subject}</h1>
            </a>
          </div>

          <div class="actions"></div>
        </div>

        <div class="content">
            <div class="preview">
                <iframe class="iframe is-loading" name="preview" src="${EMAIL_WORKER_API}/preview?contentUrl=${url}"></iframe>
                <div class="skeleton" style="height: 100%; width: 100%; min-height: calc(100vh - 200px);"></div>
            </div>
            <aside data-unsaved-changes="false">
                <div id="email-subject">
                <h2>Subject</h2>
                <input id="subject-input" class="subject" type="text" value="${localSave?.subject ?? meta.subject}">
                </div>

                <div id="email-recipients">
                <h2>Recipients</h2>

                <div class="recipients-wrapper">
                    <table class="recipients">
                        ${renderSkeleton('recipients')}
                    </table>
                </div>
                </div>

                <div id="email-variables">
                <h2>Variables <button id="variables-info-button" class="button transparent"><img src="/icons/help-dark.svg" alt="hint icon" /></button></h2>
                ${variables
                  .filter((variable) => !(variable in staticDefaults))
                  .map(
                    (variable) => `
                  <div class="kv">
                      <input type="text" placeholder="Key" value="${variable}" readonly>
                      <input type="text" placeholder="Value" value="${customVariables[variable] ?? ''}">
                  </div>
                `,
                  )
                  .join('')}

                <div class="button-container">
                    <button class="button primary action save-variables" disabled>Save variable${variables.length > 1 ? 's' : ''}</button>
                </div>

                <h2>Static Variables</h2>
                    <ul id="static-defaults">
                    ${Object.keys(staticDefaults)
                      .map(
                        (variable) => `
                        <li class="${variables.includes(variable) ? 'used-static-variable' : 'unused-static-variable'}">
                      <span>
                          <strong>${variable}:</strong> ${staticDefaultsDescription[variable]} ${variables.includes(variable) ? '' : '(currently unused in your template)'}
                      </span>
                      </li>`,
                      )
                      .join('')}
                    </ul>

                </div>
                <div id="email-styles">
                <h2>Styles (Developer)</h2>
                <button class="button secondary action enable-styles">Edit styles (developer mode)</button>
                <form class="form" action="${EMAIL_WORKER_API}/preview?contentUrl=${url}" method="POST" target="preview">
                    <textarea name="styles" class="styles"></textarea>
                    <div class="button-container">
                        <button type="button" class="button primary action save-styles" disabled>Save styles</button>
                    </div>
                </form>
            </aside>
        </div>
      `;

        const variablesInfoButton = block.querySelector('#variables-info-button');
        variablesInfoButton.addEventListener('click', () => {
          window.zaraz?.track('Sheets-tab preview/publish info-dialog click');
          createDialog(
            `<div id="variables-info">
            <h2>Variables</h2>
            <p>
              Variables allow you to personalize and customize parts of your template.
              For example, you can use <var>{headline}</var> to dynamically insert a headline, or <var>{first name}</var> to address the recipient directly.
            </p>
            <p>
              Variables are not required, but they are an easy way to reuse the same template multiple times or to address the recipient directly. For example:
              "Hi {first name}" -> this would be personalized for each recipient like "Hi John" or "Hi Jane".
            </p>
            <p>
              Variables and the email subject are saved locally in your browser.
              This means that team members, or you if you're using a different browser or device, won’t have access to your saved variables.
            </p>

            <h3>Default Variables</h3>
            <p>The following variables are automatically set but can be changed:</p>
            <ul>
              <li><var>{contact email}</var>: The contact email address associated with your project.</li>
              <li><var>{copyright}</var>: Automatically adds the current year.</li>
            </ul>

            <h3>Static Variables</h3>
            <p>The following variables are automatically set and cannot be changed:</p>
            <ul>
              ${Object.keys(staticDefaults)
                .map(
                  (variable) => `
                  <li><span><var>{${variable}}</var>: ${staticDefaultsDescription[variable]}</span></li>`,
                )
                .join('')}
            </ul>

            <h3>New Variables</h3>
            <p>
              You can create your own custom variables inside the template, such as <var>{color}</var>.
            </p>
            <p>
            If you want to learn how to use variables in your template, see the guides.
            </p>
          </div>`,
            [
              parseFragment(
                `<a href="/redirect?url=${project.authoringGuideUrl}" id="guides-button" title="Open the Guide for Mails"
              class="button action secondary guides" target="_blank">Guides</a>`,
              ),
            ],
          );
        });

        const subject = block.querySelector('h1.subject');
        const subjectInput = block.querySelector('input.subject');
        const iframe = block.querySelector('.iframe');
        const form = block.querySelector('.form');
        const saveVars = block.querySelector('.save-variables');
        let warning = { hidden: true };
        let savedEditorStyles;

        subjectInput.addEventListener(
          'input',
          () =>
            (window.localStorage[window.location.href] = JSON.stringify({
              subject: subjectInput.value,
              variables: JSON.parse(initialVariables),
            })) && (subject.textContent = subjectInput.value),
        );

        iframe.addEventListener('load', () => {
          // Add loading buffer
          setTimeout(() => {
            iframe.classList.remove('is-loading');
          }, 1000);
        });
        // Loading timeout
        setTimeout(() => {
          iframe.classList.remove('is-loading');
        }, 2000);

        // MARK: Find variable in first selected recipient columns
        const replaceMatches = (value) => {
          let newValue = value;
          const matches = value.match(regExp);
          if (matches) {
            const rendering = block.querySelector('.recipients tbody tr.is-rendering, .recipients tbody tr:has(input:checked)');
            if (!rendering) {
              return newValue;
            }

            const selectedRecipient = audience.find((contact) => contact.id === rendering.dataset.id);

            matches.forEach((match) => {
              const matchingCol = Object.keys(selectedRecipient).find((col) => col === toCamelCase(match));
              newValue = value.replace(`{${match}}`, selectedRecipient[matchingCol] ?? `{${match}}`);
            });
          }

          return newValue;
        };

        const saveStyles = block.querySelector('.save-styles');

        // MARK: Handle input changes
        const debouncedHandler = debounce(() => {
          refreshPreview();
          const stored = window.localStorage[window.location.href] ? (JSON.parse(window.localStorage[window.location.href])?.variables ?? {}) : JSON.parse(initialVariables);
          const variablesChanged = JSON.stringify(customVariables) !== JSON.stringify(stored);
          const stylesChanged = savedEditorStyles !== editor?.getValue();
          saveVars.disabled = !variablesChanged;
          saveStyles.disabled = !stylesChanged;
          warning.hidden = !variablesChanged && !stylesChanged;
          block.querySelector('aside').dataset.unsavedChanges = variablesChanged.toString();
        });

        block.querySelectorAll('.kv input').forEach((input) => {
          input.addEventListener('input', debouncedHandler);
        });

        // MARK: Render codemirror
        block.querySelector('.enable-styles').onclick = (event) => {
          window?.zaraz?.track('click email styles enable');

          event.target.remove();
          editor = window.CodeMirror.fromTextArea(block.querySelector('.styles'));
          editor.on('change', () => {
            debouncedHandler();
          });

          savedEditorStyles = editor.getValue();
        };

        saveStyles.onclick = async () => {
          window?.zaraz?.track('click email save styles');

          saveStyles.disabled = true;

          savedEditorStyles = editor.getValue();

          saveStyles.classList.add('loading');
          const req = await fetch(`${SCRIPT_API}/emailStyles/${id}`, {
            method: 'POST',
            headers: {
              authorization: `bearer ${token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              filePath: meta.styles,
              css: btoa(editor.getValue() || ''),
            }),
          });

          if (req.ok) {
            showToast('Styles updated! Updates can take up to 1 minute to be reflected for all users.');
          } else {
            showErrorToast('Something went wrong! We could not update your styles. Please try again or contact support.');
          }

          saveStyles.classList.remove('loading');

          debouncedHandler();
        };

        // MARK: Render preview with custom variables
        const refreshPreview = () => {
          iframe.classList.add('is-loading');

          block.querySelectorAll('.kv input:first-child').forEach((input) => {
            const key = input.value;
            const { value } = input.nextElementSibling;
            customVariables[key] = value;
          });

          const keys = Object.keys(customVariables);
          const oldSource = new URL(iframe.src);
          const newSource = new URL(`${oldSource.origin}${oldSource.pathname}${oldSource.search}`);
          let newSubject = subjectInput.value;
          keys.forEach((key) => {
            const newValue = replaceMatches(customVariables[key]);
            newSubject = newSubject.replace(`{${key}}`, newValue || `{${key}}`);

            if (newValue) {
              newSource.searchParams.set(key, newValue);
            } else {
              newSource.searchParams.delete(key);
            }
          });

          subject.textContent = newSubject;

          iframe.src = newSource.toString();
          form.action = newSource.toString();
          form.submit();
        };
        // MARK: Re-render with saved variables
        refreshPreview();

        saveVars.onclick = () => {
          window?.zaraz?.track('click email save variables');
          saveVars.disabled = true;

          window.localStorage[window.location.href] = JSON.stringify({
            subject: subjectInput.value,
            variables: customVariables,
          });

          debouncedHandler();
          unmetMessageUpdate();

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
            <div id="unmet-requirements" class="warning">
                    <span class="icon icon-info">
                      <img alt="" src="/icons/info.svg" loading="lazy">
                    </span>
                    <span id="unmet-info" class="info"></span>
                  </div>

            <a href="/redirect?url=${project.authoringGuideUrl}" id="guides-button"
            title="Open the Guide for the Template" class="button action secondary guides" target="_blank">Guides</a>
            <a href="${EMAIL_WORKER_API}/preview?contentUrl=${url}" target="_blank" class="button secondary action preview-mail">Preview</a>
            <button id="edit-button" class="button action secondary edit">Edit</button>
            <button id="send-button" class="button primary action send is-disabled">Send</button>
          `;

        const unmetMessage = block.querySelector('#unmet-requirements');
        const recipients = block.querySelector('.recipients');
        const send = block.querySelector('#send-button');
        const unmetMessageUpdate = () => {
          const allVariablesSet = Object.values(customVariables).every((val) => typeof val === 'string' && val.trim() !== '');
          const recipientsSelected = recipients.querySelector('tbody input[type="checkbox"]:checked') !== null;
          const requirements = [allVariablesSet, recipientsSelected];
          const unmetRequirements = requirements.filter((req) => !req).length;
          block.querySelector('#unmet-info').textContent = `${unmetRequirements} of ${requirements.length} requirements to send unmet`;
          unmetMessage.hidden = unmetRequirements === 0;
          send.classList.toggle('is-disabled', !(allVariablesSet && recipientsSelected));
        };
        unmetMessageUpdate();
        unmetMessage.addEventListener('click', () => {
          window.zaraz?.track('Sheets-tab preview/publish info-dialog click');
          const recipientCount = block.querySelectorAll('.recipients tbody tr[data-email]').length;
          const selectedRecipientCount = block.querySelectorAll('.recipients tbody tr[data-email] td:first-child input[type="checkbox"]:checked').length;
          const variableValues = Object.values(customVariables);
          const variableLength = variableValues.length;
          const emptyVariableLength = Object.values(customVariables).filter((val) => typeof val === 'string' && val.trim() === '').length;

          createDialog(`
        <div id="send-button-info">
           <p>To be able to send an e-mail, the following points must be fulfilled:</p>
           <div class="requirements-list">
              <h3>Unmet Requirements</h3>
              <ul class="unmet">
                 ${!selectedRecipientCount ? '<li>At least 1 Recipient must be selected!</li>' : ''}
                 ${emptyVariableLength ? `<li>All Variables must be set; ${emptyVariableLength} of ${variableLength} are currently not set!</li>` : ''}
              </ul>
           </div>
           <div class="requirements-list">
              <h3>Met Requirements</h3>
              <ul class="met">
                 ${selectedRecipientCount ? `<li>${selectedRecipientCount} from ${recipientCount} ${recipientCount > 1 ? 'Recipients' : 'Recipient'} selected</li>` : ''}
                 ${!emptyVariableLength && variableLength ? `<li>${variableLength > 1 ? `All ${variableLength} Variables are set!` : '1 Variable set!'}</li>` : ''}
              </ul>
           </div>
        </div>
        `);
        });

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
          daEditLink.href = `https://da.live/edit#/${daProjectRepo}/${id}${path}`;
          daEditLink.innerText = 'Edit';
          daEditLink.id = 'edit-button';
          editButton.replaceWith(daEditLink);
        } else {
          // is drive project
          editButton.addEventListener('click', async () => {
            editButton.classList.add('loading');
            const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${project.projectSlug}/main${path}?editUrl=auto`)
              .then((res) => res.json())
              .catch(() => null);
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
          window?.zaraz?.track('click email edit');
        };

        block.querySelector('.preview-mail').onclick = () => {
          window?.zaraz?.track('click email preview');
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
        fetch(`${SCRIPT_API}/audience/${id}`, {
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
            // const recipients = block.querySelector('.recipients');

            if (!data?.length) {
              // eslint-disable-next-line no-param-reassign
              data = [];
            }

            audience = data.filter(({ unsubscribed }) => !unsubscribed);
            recipients.innerHTML = `
              <thead>
                <tr>
                    <th><input type="checkbox"></th>
                    <th>Email</th>
                    <th>First name</th>
                    <th>Last name</th>
                    <th></th>
                </tr>
              </thead>
              <tbody>
                ${
                  audience?.length
                    ? audience
                        .map(
                          (contact) => `<tr data-id="${contact.id}" data-email="${contact.email}">
                    <td><input type="checkbox" class="select"></td>
                    <td>${contact.email}</td>
                    <td>${contact.firstName}</td>
                    <td>${contact.lastName}</td>
                    <td>
                        <div class="button-container">
                          <button class="button secondary action render">Preview</button>
                          <button class="button secondary action remove">Delete</button>
                        </div>
                    </td>
                </tr>`,
                        )
                        .join('')
                    : ''
                }
                <tr>
                    <td></td>
                    <td><input name="email" type="email" placeholder="john.doe@example.com" required></td>
                    <td><input name="firstName" type="text" placeholder="John"></td>
                    <td><input name="lastName" type="text" placeholder="Doe"></td>
                    <td>
                        <button class="button secondary action add is-disabled">Add</button>
                    </td>
                </tr>
              </tbody>
            `;

            // restores the selected recipients during a visibilityChange reload
            if (checkboxStates.length) {
              const checkboxes = block.querySelectorAll('.select');
              checkboxes.forEach((checkbox, i) => {
                checkbox.checked = checkboxStates[i];
              });
              unmetMessageUpdate();
            }

            recipients.querySelector('thead input[type="checkbox"]').onclick = (e) => {
              const check = e.target.checked;
              recipients.querySelectorAll('tbody input[type="checkbox"]').forEach((checkbox) => {
                checkbox.checked = check;
              });

              unmetMessageUpdate();
            };

            recipients.querySelector('tbody').onclick = async (e) => {
              if (e.target.matches('input[type="checkbox"]')) {
                unmetMessageUpdate();
              } else if (e.target.matches('.render')) {
                window?.zaraz?.track('click email preview recipients');

                const isRendering = recipients.querySelector('.is-rendering');
                if (isRendering) {
                  isRendering.classList.remove('is-rendering');
                }

                e.target.closest('tr').classList.add('is-rendering');

                // Re-render preview with newly selected recipient
                refreshPreview();
              } else if (e.target.matches('.remove')) {
                window?.zaraz?.track('click email recipients remove');

                const tr = e.target.closest('tr[data-id]');
                tr.classList.add('loading');

                const req = await fetch(`${SCRIPT_API}/audience/${id}`, {
                  method: 'DELETE',
                  headers: {
                    authorization: `bearer ${token}`,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    id: tr.dataset.id,
                  }),
                });

                if (req.ok) {
                  tr.remove();
                  showToast('Recipient removed.');
                } else {
                  showErrorToast('Something went wrong! We could not remove the recipient. Please try again or contact support.');
                }

                tr.classList.remove('loading');
                unmetMessageUpdate();
              }
            };

            const add = recipients.querySelector('.add');
            recipients.querySelector('input[name="email"]').oninput = (e) => {
              const { value } = e.target;
              const emailList = Array.from(block.querySelectorAll('.recipients tbody tr[data-email]')).map((row) => row.getAttribute('data-email'));
              const emailAlreadyAdded = emailList.includes(value);
              add.classList.toggle('is-disabled', emailAlreadyAdded || !(value.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)));
              if (emailAlreadyAdded) {
                showErrorToast('This email is already in the recipient list!');
              }
            };

            add.onclick = async () => {
              window?.zaraz?.track('click email recipients add');

              add.classList.add('loading');

              const contact = {};
              ['email', 'firstName', 'lastName'].forEach((name) => {
                contact[name] = recipients.querySelector(`input[name="${name}"]`).value;
              });

              const req = await fetch(`${SCRIPT_API}/audience/${id}`, {
                method: 'POST',
                headers: {
                  authorization: `bearer ${token}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify(contact),
              });

              if (req.ok) {
                const res = await req.json();
                contact.id = res.id;
                audience.push(contact);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td><input type="checkbox" class="select"></td>
                <td>${contact.email}</td>
                <td>${contact.firstName}</td>
                <td>${contact.lastName}</td>
                <td>
                    <div class="button-container">
                        <button class="button secondary action render">Preview</button>
                        <button class="button secondary action remove">Delete</button>
                    </div>
                </td>
              `;

                tr.dataset.id = contact.id;
                tr.dataset.email = contact.email;
                add.closest('tr').before(tr);

                // Reset
                recipients.querySelectorAll('input[name]').forEach((input) => {
                  input.value = '';
                });
                showToast('Recipient added.');
              } else {
                showErrorToast(`Something went wrong! We couldn't add ${contact.email} as a recipient. Please try again.`);
              }

              add.classList.remove('loading');
            };

            send.onclick = async () => {
              window?.zaraz?.track('click email send');

              // Preview to update the iframe source
              refreshPreview();

              const selectedRecipients = [...recipients.querySelectorAll('tbody tr:has(input:checked)')];

              if (
                await confirmDialog(
                  `You are about to send an email to ${selectedRecipients.length > 1 ? selectedRecipients.length + ' recipients' : '1 recipient'}.\nDo you want to continue ?`,
                )
              ) {
                window?.zaraz?.track('click email submit');

                block.classList.add('is-sending');

                const req = await fetch(`${SCRIPT_API}/send/${id}`, {
                  headers: {
                    'content-type': 'application/json',
                    authorization: `bearer ${token}`,
                  },
                  body: JSON.stringify({
                    styles: block.querySelector('.styles').value,
                    emailUrl: iframe.src,
                    subject: subjectInput.value,
                    variables: customVariables,
                    to: audience.filter((contact) => selectedRecipients.find((el) => el.dataset.id === contact.id)),
                  }),
                  method: 'POST',
                });

                if (req.ok) {
                  showToast('Email delivered.');
                } else {
                  showErrorToast("Something went wrong! We couldn't send the email. Please try again. If the problem persists, please contact support.");
                }

                block.classList.remove('is-sending');
              }
            };
          });

        // "Ctrl + S" to trigger the Save variables button
        window.addEventListener('keydown', (event) => {
          if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveVars.click();
          }
        });
      } else {
        block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
      }
    };
    load([]);

    document.addEventListener('visibilitychange', () => {
      // saves the selected recipients
      const checkboxStates = [];
      const checkboxes = block.querySelectorAll('.select');
      checkboxes.forEach((checkbox) => {
        checkboxStates.push(checkbox.checked);
      });
      if (!document.hidden) {
        if (confirmUnsavedChanges(block.querySelector('aside'))) {
          // reload
          load(checkboxStates);
        }
      }
    });
  });
}
