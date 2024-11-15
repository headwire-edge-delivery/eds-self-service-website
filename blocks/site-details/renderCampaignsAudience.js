import {
  completeChecklistItem,
  dateToRelativeSpan,
  OOPS,
  parseFragment, safeText, SCRIPT_API,
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
  const { token, siteSlug, siteDetails } = renderOptions;
  container.innerHTML = renderSkeleton('audience');

  const addContactEl = parseFragment(`
    <button class="button primary action" id="add-contact">Add Contact</button>
  `);

  const toggleWell = () => {
    const well = container.querySelector('.well');
    if (container.querySelector('table tr[data-id]')) {
      well.hidden = true;
      addContactEl.hidden = false;
      addContactEl.id = 'add-contact';
    } else {
      well.hidden = false;
      addContactEl.hidden = true;
      addContactEl.removeAttribute('id');
    }
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
        completeChecklistItem(siteSlug, 'contactAdded', siteDetails);
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

  addContactEl.onclick = addContact;
  nav.append(addContactEl);

  const audienceData = await fetch(`${SCRIPT_API}/audience/${siteSlug}`, {
    headers: {
      authorization: `bearer ${token}`,
    },
  }).then((res) => res.json()).catch(() => null);

  container.innerHTML = `
    <div class="well" hidden>
      <img src="/icons/illustrations/pc.svg" alt="" loading="lazy"/>
      <div class="text">
        <h2>Add contacts to your audience</h2>
        <p>Add your first contact before sending out emails.</p>
        <button id="add-contact" class="button primary">Start now</button>
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

  container.querySelector('#add-contact').onclick = addContact;

  toggleWell();

  const table = container.querySelector('table');
  table.addEventListener('click', async (event) => {
    if (event.target.matches('.update-contact')) {
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
    } else if (event.target.matches('.delete-contact')) {
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

          if (!table.tBodies[0].rows.length) {
            table.tBodies[0].innerHTML = '<tr><td colspan="6" class="empty">Not enough data</td></tr>';
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
