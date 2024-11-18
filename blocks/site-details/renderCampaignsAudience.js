import {
  dateToRelativeSpan,
  OOPS,
  parseFragment, safeText, SCRIPT_API, validateEmail,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, confirmDialog, createDialog } from '../../scripts/dialogs.js';

function renderContact(contact) {
  const firstName = safeText(contact.firstName) ?? '';
  const lastName = safeText(contact.lastName) ?? '';
  return `
    <tr data-id="${safeText(contact.id)}" data-email="${safeText(contact.email)}">
        <td data-name="email">${safeText(contact.email)}</td>
        <td data-name="firstName">${firstName}</td>
        <td data-name="lastName">${lastName}</td>
        <td data-name="createAt">${contact.createdAt === 'Just now' ? contact.createdAt : dateToRelativeSpan(contact.createdAt).outerHTML}</td>
        <td data-name="unsubscribed"><div class="badge ${contact.unsubscribed ? 'orange' : 'green'}">${contact.unsubscribed ? 'Unsubscribed' : 'Subscribed'}</div></td>
        <td>
            <div class="button-container">
                <button class="button action secondary update-contact">Update</button>
                <button class="button action secondary delete-contact">Delete</button>
            </div>
        </td>
    </tr>
  `;
}

export default async function renderCampaignsAudience({ container, nav, renderOptions }) {
  const { token, siteSlug } = renderOptions;
  container.innerHTML = renderSkeleton('audience');

  const addContactEl = parseFragment(`
    <button class="button primary action" id="add-contact">Add Contact</button>
  `);

  const bulkImportEl = parseFragment(`
    <button class="button secondary action" id="bulk-import">Bulk Import</button>
  `);

  const toggleWell = () => {
    const well = container.querySelector('.well');
    if (container.querySelector('table tr[data-id]')) {
      well.hidden = true;
      addContactEl.hidden = false;
      addContactEl.id = 'add-contact';
      bulkImportEl.hidden = false;
      bulkImportEl.id = 'bulk-import';
    } else {
      well.hidden = false;
      addContactEl.hidden = true;
      addContactEl.removeAttribute('id');
      bulkImportEl.hidden = true;
      bulkImportEl.removeAttribute('id');
    }
  };

  const renderAudience = async (data) => {
    let audienceData = data;
    if (!audienceData) {
      audienceData = await fetch(`${SCRIPT_API}/audience/${siteSlug}`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      }).then((res) => res.json()).catch(() => null);
    }

    container.innerHTML = `
      <div class="well" hidden>
        <img src="/icons/illustrations/pc.svg" alt="" loading="lazy"/>
        <div class="text">
          <h2>Add contacts to your audience</h2>
          <p>Add your first contact before sending out emails.</p>
          <div class="button-container">
              <button id="add-contact" class="button primary">Start now</button>
              <button id="bulk-import" class="button secondary">Bulk Import</button>
          </div>
        </div>
      </div>
        
      <table>
        <thead>
          <tr>
              <th>Email</th>
              <th>First name</th>
              <th>Last name</th>
              <th>Created at</th>
              <th>Status</th>
              <th></th>
          </tr>
        </thead>
        <tbody>
          ${audienceData?.length ? audienceData.map((contact) => renderContact(contact)).join('') : '<tr><td colspan="6" class="empty">Not enough data</td></tr>'}
        </tbody>
      </table>
    `;

    toggleWell();
  };

  const addContact = async () => {
    window?.zaraz?.track('click add contact');

    const submit = parseFragment('<button form="add-contact-form" type="submit" class="button primary action">Submit</button>');
    const content = parseFragment(`
      <div>
        <h3>Add Contact</h3>
        
        <form id="add-contact-form">
          <label>
              <span>Email *</span>
              <input type="email" required name="email" placeholder="john.doe@example.com"/>
          </label>
          <label>
              <span>First name</span>
              <input type="text" name="firstName" placeholder="John"/>
          </label>
          <label>
              <span>Last name</span>
              <input type="text" name="lastName" placeholder="Doe"/>
          </label>
          <label>
              <input type="checkbox" name="unsubscribed"/>
              <span>Unsubscribed</span>
          </label>
        </form>
      </div>
    `);

    const dialog = createDialog(content, [submit]);

    const form = document.getElementById('add-contact-form');

    form.onsubmit = async (event) => {
      window.zaraz?.track('click add contact form');

      event.preventDefault();

      const body = Object.fromEntries(new FormData(form));
      dialog.setLoading(true, 'Adding contact...');
      const response = await fetch(`${SCRIPT_API}/audience/${siteSlug}`, {
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(body),
      }).catch(() => null);

      if (response?.ok) {
        dialog.renderDialog('<h3 class="centered-info">Contact added successfully</h3>');

        const tableBody = container.querySelector('table tbody');
        const empty = tableBody.querySelector('tr:has(.empty)');
        if (empty) {
          empty.remove();
        }

        const { id } = await response.json();
        tableBody.insertAdjacentHTML('afterbegin', renderContact({ id, createdAt: 'Just now', ...body }));

        toggleWell();
      } else {
        await alertDialog(OOPS);
      }

      dialog.setLoading(false);
    };
  };

  const bulkImport = () => {
    window?.zaraz?.track('click bulk import');

    const submit = parseFragment('<button disabled form="bulk-import-form" type="submit" class="button primary action">Submit</button>');
    const content = parseFragment(`
      <div>
        <h3>Bulk Import</h3>

        <form id="bulk-import-form">
          <p>Accepted CSV columns: <code>email, first name, last name, unsubscribed|subscribed</code></p>
          <p>The column <code>email</code> is required.</p>
          <label>
              <span>CSV file</span>
              <input type="file" accept=".csv" required/>
          </label>
          <div class="file-preview"></div>
        </form>
      </div>
    `);

    const dialog = createDialog(content, [submit]);

    const form = document.getElementById('bulk-import-form');

    const input = form.querySelector('input[type="file"]');
    const preview = form.querySelector('.file-preview');

    let formattedData;

    form.querySelector('input').onchange = () => {
      const [file] = input.files;
      if (file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
          preview.innerHTML = 'Please select a valid file!';
          return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const response = await fetch(event.target.result);
            const data = await response.text();
            formattedData = data.split('\n').map((line) => {
              const [email, firstName, lastName, unsubscribed] = line.split(',').map((col) => (col ? col.trim() : ''));

              return {
                email,
                firstName,
                lastName,
                unsubscribed,
              };
            }).filter(({ email }) => validateEmail(email));

            if (!formattedData?.length) {
              submit.disabled = true;
              preview.innerHTML = `
                <table>
                  <thead>
                    <th>Email</th>
                    <th>First name</th>
                    <th>Last name</th>
                    <th>Status</th>
                  </thead>
                  <tbody>
                      <tr><td class="empty" colspan="4">No valid contacts found.</td></tr>
                  </tbody>
                </table>
              `;
            } else {
              submit.disabled = false;
              preview.innerHTML = `
              <table>
                <thead>
                  <th>Email</th>
                  <th>First name</th>
                  <th>Last name</th>
                  <th>Status</th>
                </thead>
                <tbody>
                    ${formattedData.map((contact) => `
                      <tr>
                        <td>${contact.email}</td>
                        <td>${contact.firstName}</td>
                        <td>${contact.lastName}</td>
                        <td>${contact.unsubscribed !== 'subscribed' ? '<div class="badge orange">Unsubscribed</div>' : '<div class="badge green">Subscribed</div>'}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            `;
            }
          } catch (e) {
            submit.disabled = true;
            preview.innerHTML = 'File can\'t be read. Please try another file.';
          }
        };
        reader.readAsDataURL(file);
      } else {
        submit.disabled = true;
        preview.innerHTML = 'Please select a file';
      }
    };

    form.onsubmit = async (event) => {
      window.zaraz?.track('click bulk import form');

      event.preventDefault();

      dialog.setLoading(true, 'Starting bulk import...');
      const response = await fetch(`${SCRIPT_API}/audience/${siteSlug}/bulkImport`, {
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(formattedData),
      }).catch(() => null);

      if (response?.ok) {
        const { contacts, count } = await response.json();
        if (count === 0) {
          dialog.renderDialog('<h3 class="centered-info">No contacts were added/updated.</h3>');
        } else {
          dialog.renderDialog(`<h3 class="centered-info">${count} contact(s) were added/updated.</h3>`);

          await renderAudience(contacts);
        }
      } else {
        await alertDialog(OOPS);
      }

      dialog.setLoading(false);
    };
  };

  bulkImportEl.onclick = bulkImport;
  addContactEl.onclick = addContact;

  nav.append(bulkImportEl);
  nav.append(addContactEl);

  await renderAudience();

  container.addEventListener('click', async (event) => {
    if (event.target.id === 'add-contact') {
      addContact();
    } else if (event.target.id === 'bulk-import') {
      bulkImport();
    } else if (event.target.matches('table tbody tr[data-id] .update-contact')) {
      window?.zaraz?.track('click update contact');

      const tr = event.target.closest('tr[data-id]');
      const contact = {
        id: tr.dataset.id,
      };
      [...tr.querySelectorAll('[data-name]')].forEach((el) => {
        if (el.dataset.name === 'unsubscribed') {
          contact[el.dataset.name] = el.querySelector('.orange') !== null;
        } else {
          contact[el.dataset.name] = el.textContent;
        }
      });

      const submit = parseFragment('<button form="update-contact-form" type="submit" class="button primary action">Submit</button>');
      const content = parseFragment(`
      <div>
        <h3>Update Contact</h3>
        
        <form id="update-contact-form">
          <input type="hidden" name="id" value="${safeText(contact.id)}">
          <label>
              <span>First name</span>
              <input type="text" name="firstName" placeholder="John" value="${safeText(contact.firstName)}"/>
          </label>
          <label>
              <span>Last name</span>
              <input type="text" name="lastName" placeholder="Doe" value="${safeText(contact.lastName)}"/>
          </label>
          <label>
              <input type="checkbox" name="unsubscribed" ${contact.unsubscribed ? 'checked' : ''}/>
              <span>Unsubscribed</span>
          </label>
        </form>
      </div>
    `);

      const dialog = createDialog(content, [submit]);

      const form = document.getElementById('update-contact-form');

      form.onsubmit = async (e) => {
        window.zaraz?.track('click update contact form');

        e.preventDefault();

        const body = Object.fromEntries(new FormData(form));
        dialog.setLoading(true, 'Updating contact...');
        const response = await fetch(`${SCRIPT_API}/audience/${siteSlug}`, {
          headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
          method: 'PATCH',
          body: JSON.stringify(body),
        }).catch(() => null);

        if (response?.ok) {
          dialog.renderDialog('<h3 class="centered-info">Contact updated successfully</h3>');
          tr.querySelector('[data-name="firstName"]').textContent = body.firstName;
          tr.querySelector('[data-name="lastName"]').textContent = body.lastName;
          tr.querySelector('[data-name="unsubscribed"]').innerHTML = `<div class="badge ${body.unsubscribed ? 'orange' : 'green'}">${body.unsubscribed ? 'Unsubscribed' : 'Subscribed'}</div>`;
        } else {
          await alertDialog(OOPS);
        }

        dialog.setLoading(false);
      };
    } else if (event.target.matches('table tbody tr[data-id] .delete-contact')) {
      if (await confirmDialog('Are you sure ?')) {
        window?.zaraz?.track('click contact delete');

        const tr = event.target.closest('tr[data-id]');
        tr.classList.add('loading');

        const deleteReq = await fetch(`${SCRIPT_API}/audience/${siteSlug}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            id: tr.dataset.id,
          }),
        }).catch(() => null);

        if (deleteReq?.ok) {
          tr.remove();

          const tableBody = container.querySelector('table tbody');
          if (!tableBody.rows.length) {
            tableBody.innerHTML = '<tr><td colspan="6" class="empty">Not enough data</td></tr>';
          }

          toggleWell();
        } else {
          await alertDialog(OOPS);
        }

        tr.classList.remove('loading');
      }
    }
  });
}
