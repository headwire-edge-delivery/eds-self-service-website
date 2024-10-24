import {
  OOPS, parseFragment, SCRIPT_API,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import {
  addIconDialogSetup, manageGoogleCalendarLink, renderBlocksList, renderIconsList,
  renderPrevUpdatesSection,
  renderUpdatesSection,
} from './renderSettingsUtils.js';

// MARK: render
export default async function renderSettingsGeneral({ container, nav, renderOptions }) {
  const {
    projectDetails, authHeaders, authHeadersWithBody, siteSlug,
  } = renderOptions;

  container.innerHTML = renderSkeleton('settings');

  const [
    authors,
    blocksListData,
    iconsListData,
    versionInfoData,
  ] = await Promise.all([
    fetch(`${SCRIPT_API}/authors/${siteSlug}`, { headers: authHeaders }).then((res) => res.json()).catch(() => null),
    fetch(`${SCRIPT_API}/blocks/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()).catch(() => null),
    fetch(`${SCRIPT_API}/icons/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()).catch(() => null),
    fetch(`${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daUpdateProject' : 'updateProject'}/checkUpdates/${projectDetails.projectSlug}`, { headers: authHeaders }).then((res) => res.json()).catch(() => null),
  ]);

  container.innerHTML = `
  <div id="authors">
    <h2>Authors</h2>
    <form class="add-author-form form">
      <label>
        <span>New author <span id="new-author-warning" hidden class="warning">Please enter a valid Email (e.g. person@example.com)</span></span>
        <input name="email" type="email" placeholder="person@example.com" />
      </label>
      <button id="add-author-button" title="Add a new Author" class="button is-disabled primary action" type="submit">Add</button>
    </form>
    <ul class="authors-list"></ul>
  </div>
    
  <div id="contact-email">
    <h2>Contact email</h2>
    <form class="contact-email-form form">
        <label>
            <span>Define which email the contact form submits to. <span id="contact-email-warning" hidden class="warning">Please enter a valid Email (e.g. person@example.com)</span></span>
            <input name="email" type="email" placeholder="person@example.com" />
        </label>    
        <button id="contact-email-save" title="Update the Contact Email" class="button primary is-disabled action" type="submit">Update</button>
    </form>
  </div>
    
  <div id="favicon">
    <h2>Favicon</h2>
    <p>Only <code>.ico</code> files are supported.</p>
    <div class="favicon-section">
      <img alt="favicon" src="https://${siteSlug}.kestrelone.com/favicon.ico" loading="lazy">
      <button id="change-favicon" title="Change the Favicon. (Only .ico is supported)" class="button action primary change-favicon">Update</button>     
    </div>
  </div>
    
    <div id="blocks">
      <h2>Blocks</h2>
      <button id="add-block-button" title="Add a new block" class="button primary action add-block">Add block</button>
      <ul id="blocks-list" class="blocks list"></ul>
    </div>

    <div id="icons">
      <h2>Icons</h2>
      <button id="add-icon-button" title="Upload a new Icon" class="button action primary add-icon">Add icon</button>
      <ul id="icons-list" class="icons list"></ul>
    </div>
    
    <div id="updates">
      <h2>Updates</h2>
      <div class="update-info"></div>
      <div class="prev-update-info"></div>
    </div>
  `;
  if (projectDetails.calendarId) {
    manageGoogleCalendarLink(projectDetails.calendarId, nav);
  }

  // MARK: Authors
  const authorsList = container.querySelector('.authors-list');
  const addAuthorListItem = (author) => {
    if (!author.email) return;

    const authorEmail = author.email;
    const isOwner = author.owner;

    const listItem = parseFragment(`
          <li class="author ${isOwner ? 'is-owner' : ''}" data-author-email="${authorEmail}">
            <span>${authorEmail}</span>
            <button ${isOwner ? 'disabled' : ''} class="transfer-button button action secondary">Make Owner</button>
            <button ${isOwner ? 'disabled' : ''} class="revoke-button button action secondary">Revoke</button>
          </li>
        `);

    const revoke = listItem.querySelector('.revoke-button');
    revoke.onclick = async () => {
      window?.zaraz?.track('click site share delete');

      if (await window.confirmDialog('Are you sure ?')) {
        window?.zaraz?.track('click site share delete submit');

        authorsList.classList.add('is-disabled');
        const revokeResponse = await fetch(`${SCRIPT_API}/authors/${siteSlug}/${authorEmail}`, {
          method: 'DELETE',
          headers: authHeaders,
        }).catch(() => null);
        if (revokeResponse?.ok) {
          authorsList.querySelector(`li[data-author-email="${authorEmail}"]`).remove();
        } else {
          await window.alertDialog(OOPS);
        }
        authorsList.classList.remove('is-disabled');
      }
    };

    const changeOwnerButton = listItem.querySelector('.transfer-button');
    changeOwnerButton.onclick = async () => {
      window?.zaraz?.track('click site share make owner');

      if (await window.confirmDialog('Are you sure ?')) {
        window?.zaraz?.track('click site share make owner submit');

        authorsList.classList.add('is-disabled');
        const changeOwnerResponse = await fetch(`${SCRIPT_API}/updateOwner/${siteSlug}/${authorEmail}`, {
          method: 'POST',
          headers: authHeaders,
        }).catch(() => null);
        if (changeOwnerResponse?.ok) {
          const prevOwner = authorsList.querySelector('li.is-owner');
          if (prevOwner) {
            prevOwner.classList.remove('is-owner');
            prevOwner.querySelectorAll('button[disabled]').forEach((button) => { button.disabled = null; });
          }

          revoke.disabled = true;
          changeOwnerButton.disabled = true;
          listItem.classList.add('is-owner');
        } else {
          await window.alertDialog(OOPS);
        }
        authorsList.classList.remove('is-disabled');
      }
    };

    authorsList.append(listItem);
  };

  const addAuthorForm = container.querySelector('.add-author-form');
  // TODO: Update when we have dark alley authorization
  if (projectDetails.darkAlleyProject) {
    addAuthorForm.classList.add('is-disabled');
  }
  addAuthorForm.onsubmit = async (event) => {
    window?.zaraz?.track('click site share add submit');

    event.preventDefault();

    const email = event.target.email.value;
    if (authorsList.querySelector(`[data-author-email="${email}"]`)) {
      window.alertDialog('Author already exists');
      return;
    }

    addAuthorForm.classList.add('is-disabled');
    const isValid = /^(?!@).*@.*(?<!@)$/.test(email);
    if (!isValid) {
      await window.alertDialog('Please enter a valid email.');
      addAuthorForm.classList.remove('is-disabled');
      return;
    }
    const response = await fetch(`${SCRIPT_API}/authors/${siteSlug}/${email}`, {
      method: 'POST',
      headers: authHeaders,
    }).catch(() => null);
    if (response?.ok) {
      addAuthorListItem({ email });
      event.target.email.value = '';
    } else {
      await window.alertDialog(OOPS);
    }
    addAuthorForm.classList.remove('is-disabled');
  };

  // Enables the Add button only if the email is in a valid format
  addAuthorForm.oninput = () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addAuthorForm.querySelector('input').value)) {
      addAuthorForm.querySelector('#add-author-button').classList.remove('is-disabled');
      document.querySelector('#new-author-warning').hidden = true;
    } else {
      addAuthorForm.querySelector('#add-author-button').classList.add('is-disabled');
      document.querySelector('#new-author-warning').hidden = false;
    }
    if (addAuthorForm.querySelector('input').value === '') {
      document.querySelector('#new-author-warning').hidden = true;
    }
  };

  if (authors?.length) {
    authors.forEach(addAuthorListItem);
  }

  // MARK: Contact Email
  const contactEmailForm = container.querySelector('.contact-email-form');
  const contactEmailFormInput = contactEmailForm.querySelector('input');
  const contactEmail = projectDetails.contactEmail || projectDetails.ownerEmail || '';
  const contactEmailButton = contactEmailForm.querySelector('#contact-email-save');
  contactEmailFormInput.value = contactEmail;
  // email input validation
  contactEmailFormInput.oninput = () => {
    if (contactEmailFormInput.value === contactEmail || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmailFormInput.value)) {
      contactEmailButton.classList.remove('is-disabled');
      document.querySelector('#contact-email-warning').hidden = true;
    } else {
      contactEmailButton.classList.add('is-disabled');
      document.querySelector('#contact-email-warning').hidden = false;
    }
  };

  contactEmailForm.onsubmit = async (event) => {
    window?.zaraz?.track('click site contact submit');

    event.preventDefault();

    if (!contactEmailFormInput.value) return;

    contactEmailForm.classList.add('is-disabled');

    const response = await fetch(`${SCRIPT_API}/updateContact/${siteSlug}`, {
      headers: authHeadersWithBody,
      method: 'POST',
      body: JSON.stringify({ contactEmail: contactEmailFormInput.value }),
    }).catch(() => null);
    if (response?.ok) {
      await window.alertDialog('Contact email updated!');
      projectDetails.contactEmail = contactEmailFormInput.value;
    } else {
      await window.alertDialog(OOPS);
    }

    contactEmailForm.classList.remove('is-disabled');
  };

  // MARK: Favicon
  container.querySelector('.change-favicon').onclick = () => addIconDialogSetup({
    siteSlug,
    authHeaders,
    authHeadersWithBody,
    titleText: 'Favicon',
    fileAccept: '.ico',
    uploadEndpoint: `${SCRIPT_API}/favicon/${siteSlug}`,
    replaceIconItem: container.querySelector('.favicon-section img[alt="favicon"]'),
    defaultSrc: `https://${siteSlug}.kestrelone.com/favicon.ico`,
  });

  // MARK: blocks & icons
  renderBlocksList(container, blocksListData, { projectDetails, authHeaders, siteSlug });
  renderIconsList(container, iconsListData, { projectDetails, authHeaders, siteSlug });

  // MARK: Updates section
  const updateInfoDiv = container.querySelector('.update-info');
  const prevUpdateInfoDiv = container.querySelector('.prev-update-info');
  renderUpdatesSection(updateInfoDiv, { projectDetails, authHeaders, versionInfoData });
  renderPrevUpdatesSection(prevUpdateInfoDiv, {
    projectDetails,
    authHeaders,
    authHeadersWithBody,
    rerenderUpdatesSection: renderUpdatesSection,
    updateInfoDiv,
  });
}
