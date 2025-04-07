import { daProjectRepo, dateToRelativeSpan, EMAIL_WORKER_API, OOPS, parseFragment, SCRIPT_API, projectRepo, safeText, completeChecklistItem } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { alertDialog, confirmDialog, createDialog } from '../../scripts/dialogs.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';

export function renderTable({ table, tableData, type, projectDetails, token, isDrafts = false }) {
  const isEmail = type === 'emails';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Path</th>
        <th>Last update</th>
        ${!isEmail ? '<th>Status</th>' : ''}
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tableRows = tableData.map((item) => {
    const tableRow = document.createElement('tr');
    tableRow.dataset.path = item.path;
    tableRow.dataset.id = item.id;

    if (isEmail) {
      const split = item.path.split('/');
      const isDeletable = item.path.startsWith('/emails/') && split.length === 4;
      const campaign = split[2];
      const email = split[3];

      tableRow.innerHTML = `
        <td>${safeText(item.name)}</td>
        <td>${item.path}</td>
        <td>${dateToRelativeSpan(item.lastModified).outerHTML}</td>
        <td>
          <div id="email-open-edit" class="button-container">
            <a class="button action secondary edit" href="/email/${projectDetails.projectSlug}${item.path}" target="_blank">Edit</a>
            <a class="button action secondary open" href="/redirect?url=${EMAIL_WORKER_API}/preview?contentUrl=${
              projectDetails.customPreviewUrl
            }${item.path}" target="_blank">Open</a>
            ${isDeletable ? '<button class="button action secondary delete-email destructive">Delete</button>' : ''}
          </div>
        </td>
      `;

      const deleteEmail = tableRow.querySelector('.delete-email');
      if (deleteEmail) {
        deleteEmail.onclick = async () => {
          if (await confirmDialog('Are you sure ?')) {
            window?.zaraz?.track('click email delete');

            deleteEmail.classList.add('loading');
            const deleteReq = await fetch(`${SCRIPT_API}/campaigns/${projectDetails.projectSlug}/${campaign}/${email}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
              body: JSON.stringify({
                id: item.id,
              }),
            }).catch(() => null);

            if (deleteReq?.ok) {
              const emails = table.closest('.campaign-container').querySelectorAll(`.campaign tr[data-path="/emails/${campaign}/${email}"]`);
              emails.forEach((el) => {
                el.remove();
              });
              showToast('Email deleted.');
            } else {
              showErrorToast();
            }
            deleteEmail.classList.remove('loading');
          }
        };
      }

      return tableRow;
    }

    tableRow.innerHTML = `
      <td>${safeText(item.name)}</td>
      <td>${item.path}</td>
      <td>${dateToRelativeSpan(item.lastModified).outerHTML}</td>
      <td class="status"><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
      <td>
        <div class="button-container">
            <a class="button action secondary edit" href="/redirect?url=${projectDetails.darkAlleyProject ? `https://da.live/edit#/${daProjectRepo}/${projectDetails.projectSlug}${item.path.endsWith('/') ? `${item.path}index` : item.path}` : `https://docs.google.com/document/d/${item.id}/edit`}" target="_blank">Edit</a>
            <button class="button action secondary delete-page destructive">Delete</button>
        </div>
      </td>
    `;

    fetch(`https://admin.hlx.page/status/${projectDetails.darkAlleyProject ? daProjectRepo : projectRepo}/${projectDetails.projectSlug}/main${item.path}?editUrl=auto`)
      .then((res) => res.json())
      .then((res) => {
        const renderStatus = (status, variant = '') => {
          tableRow.querySelector('.status').innerHTML = `<div class="badge ${variant}">${status}</div>`;

          const container = tableRow.querySelector('.button-container');
          const previewButton = `<a class="button action secondary preview" href="/redirect?url=${projectDetails.customPreviewUrl}${item.path}" target="_blank">Preview</a>`;
          if (status === 'Published') {
            container.insertAdjacentHTML(
              'afterbegin',
              `
              ${previewButton}
              ${!item.path.startsWith('/drafts/') ? `<a class="button action secondary live" href="/redirect?url=${projectDetails.customLiveUrl}${item.path}" target="_blank">Live</a>` : ''}
            `,
            );
          } else if (status === 'Previewed') {
            container.insertAdjacentHTML('afterbegin', previewButton);
          }
        };

        if (res?.live?.status === 200 && !isDrafts) {
          renderStatus('Published', 'green');
        } else if (res?.preview?.status === 200) {
          renderStatus('Previewed', 'orange');
        } else {
          renderStatus('Not published');
        }
      })
      .catch(() => null);

    return tableRow;
  });

  const tableBody = table.tBodies[0];
  tableBody.append(...tableRows);
  if (tableBody.matches(':empty')) {
    const cols = table.querySelectorAll('th').length;
    tableBody.innerHTML = `<tr><td colspan="${cols}" class="empty">Not enough data</td></tr>`;
  }
  return table;
}

// MARK: add page dialog
function addPageDialogSetup({ projectDetails, token, user }) {
  const submit = parseFragment('<button form="add-page-form" type="submit" class="button primary action">Create Page</button>');
  const content = parseFragment(`
    <div>
      <h3>Add a new Page</h3>

      <div class="columns">
        <form id="add-page-form">
          <p>
            The newly created document will appear in the drafts folder.
            Make sure to move it to your desired path before attempting to publish!
            Draft files cannot be published.
          </p>
          <label>
              <span>Page Name *</span>
              <input required name="pageName" placeholder="Blog Page"/>
          </label>
          <label>
            <span>Template *</span>
            <select required name="templatePath">
                <option>Loading...</option>
            </select>
          </label>
        </form>

        <iframe hidden></iframe>
      </div>

    </div>
  `);

  const dropdown = content.querySelector('select[name="templatePath"]');
  const previewIframe = content.querySelector('iframe');

  const templateUrl = `https://main--${projectDetails.templateSlug}--headwire-self-service-templates.aem.live`;
  const templateRegex = /^template\s*-\s*(?!.*authoring\s+guide\s*-)/i;

  fetch(`${templateUrl}/tools/sidekick/library.json`)
    .then((res) => res.json())
    .then(({ data }) => {
      const templates = data.filter((item) => !!templateRegex.test(item.name));
      // eslint-disable-next-line no-console
      console.log('templates:', templates);

      dropdown.innerHTML = '';
      dropdown.disabled = null;
      templates.forEach((template) => {
        template.templateName = template.name.split('-')[1].trim();
        const option = document.createElement('option');
        option.value = template.path;
        option.innerText = template.templateName;
        dropdown.append(option);
      });
      previewIframe.hidden = false;
      previewIframe.src = `${templateUrl}${dropdown.value}`;
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error(err));

  dropdown.onchange = () => {
    previewIframe.src = `${templateUrl}${dropdown.value}`;
  };

  const dialog = createDialog(content, [submit], { fullscreen: true });

  const form = dialog.querySelector('form');
  // submit.onclick = () => form.dispatchEvent(new Event('submit', { cancelable: true }));
  form.onsubmit = async (event) => {
    event.preventDefault();
    // if (!form.checkValidity()) {
    //   form.reportValidity();
    //   return;
    // }
    window.zaraz?.track('click site page add');

    dialog.setLoading(true, 'Copying and setting up page...');

    const body = Object.fromEntries(new FormData(form));
    const addPageRequest = await fetch(`${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daAddPage' : 'addPage'}/${projectDetails.projectSlug}`, {
      method: 'POST',
      headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (addPageRequest?.ok) {
      completeChecklistItem(projectDetails.projectSlug, 'pageAdded', projectDetails);
      const responseData = await addPageRequest.json().catch(() => ({}));

      const buttons = [];
      let draftsHref;
      let editHref;

      if (projectDetails.darkAlleyProject) {
        draftsHref = `/redirect?url=https://da.live/#${responseData.daPath}`;
        editHref = `/redirect?url=https://da.live/edit#${responseData.daPath}/${responseData.daNewPageSlug}`;
      } else {
        draftsHref = `/redirect?url=https://drive.google.com/drive/folders/${responseData.folderId}?authuser=${user.email}`;
        editHref = `/redirect?url=https://docs.google.com/document/d/${responseData.newPageId}/edit`;
      }

      const draftsLink = parseFragment(`
        <a class="button secondary action" href="${draftsHref}" target="_blank">Drafts Folder</a>
      `);
      buttons.push(draftsLink);

      const editLink = parseFragment(`
        <a class="button primary action edit" target="_blank" href="${editHref}">Edit ${safeText(body.pageName)}</a>
      `);
      buttons.push(editLink);

      dialog.renderDialog(`<h3 class="centered-info" >${safeText(body.pageName)} page added to drafts</h3>`, buttons);

      // Update drafts table
      const tableBody = document.body.querySelector('table.drafts tbody');
      const empty = tableBody.querySelector('tr:has(.empty)');
      if (empty) {
        empty.remove();
      }

      tableBody.insertAdjacentHTML(
        'afterbegin',
        `
        <tr data-id="${responseData.newPageId}" data-path="/drafts/${responseData.pageSlug}">
            <td>${safeText(body.pageName)}</td>
            <td>/drafts/${responseData.pageSlug}</td>
            <td>Just now</td>
            <td class="status"><div class="badge orange">Previewed</div></td>
            <td class="button-container">
                <a class="button action secondary preview" href="/redirect?url=${projectDetails.customPreviewUrl}/drafts/${responseData.pageSlug}" target="_blank">Preview</a>
                <a class="button action secondary edit" href="${editHref}" target="_blank">Edit</a>
                <button class="button action secondary delete-page destructive">Delete</button>
            </td>
        </tr>
      `,
      );
    } else {
      await alertDialog(OOPS);
    }
    dialog.setLoading(false);
  };
}

// MARK: render
export default async function renderSitePages({ container, nav, renderOptions }) {
  const { projectDetails, user, token, siteSlug } = renderOptions;
  container.innerHTML = renderSkeleton('pages');

  /* eslint-disable */
  nav.innerHTML = `
    <a href="/redirect?url=${projectDetails.authoringGuideUrl}" id="guides-button" title="Open the Guide for the Template" class="button action secondary guides" target="_blank">Guides</a>
    <button class="button secondary action add-page" id="add-page-button" title="Add a new Page">Add Page</button>
  `;
  nav.querySelector('#add-page-button').onclick = () => {
    addPageDialogSetup({
      projectDetails,
      token,
      user,
    });
  };

  const indexData = await fetch(`${SCRIPT_API}/index/${siteSlug}`)
    .then((res) => res.json())
    .catch(() => null);

  if (!indexData?.data) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  container.innerHTML = `
  <div id="pages-overview">
    <h2>Pages</h2>
    <table class="pages"></table>
  </div>

  <div id="nav-overview">
    <h2>Navigation</h2>
    <table class="navs"></table>
  </div>

  <div id="footer-overview">
    <h2>Footer</h2>
    <table class="footers"></table>
  </div>

  <div id="drafts-overview">
    <h2>Drafts</h2>
    <table class="drafts"></table>
  </div>`;

  const pages = [];
  const navs = [];
  const footers = [];
  const drafts = [];
  // const emails = [];

  for (const page of indexData.data) {
    if (page.path.startsWith('/drafts/')) {
      drafts.push(page);
    } else if (page.path.startsWith('/emails/')) {
      // emails.push(page);
      continue;
    } else if (page.path.endsWith('/nav')) {
      navs.push(page);
    } else if (page.path.endsWith('/footer')) {
      footers.push(page);
    } else {
      pages.push(page);
    }
  }
  renderTable({
    table: container.querySelector('.pages'),
    tableData: pages,
    projectDetails,
    token,
  });
  const navsTable = renderTable({
    table: container.querySelector('.navs'),
    tableData: navs,
    projectDetails,
    token,
  });
  renderTable({
    table: container.querySelector('.footers'),
    tableData: footers,
    projectDetails,
    token,
  });
  renderTable({
    table: container.querySelector('.drafts'),
    tableData: drafts,
    projectDetails,
    token,
    isDrafts: true,
  });

  container.onclick = async (event) => {
    if (event.target.matches('.delete-page')) {
      if (await confirmDialog('Are you sure ?')) {
        window?.zaraz?.track('click page delete');

        const deletePage = event.target;
        const tableRow = deletePage.closest('tr');

        deletePage.classList.add('loading');

        const body = {
          path: tableRow.dataset.path,
        };

        if (projectDetails.darkAlleyProject) {
          body.extension = 'html';
        } else {
          body.id = tableRow.dataset.id;
        }

        const deleteReq = await fetch(`${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daRemovePage' : 'removePage'}/${projectDetails.projectSlug}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => null);

        if (deleteReq?.ok) {
          tableRow.remove();
          showToast('Page deleted.');
        } else {
          showErrorToast();
        }
        deletePage.classList.remove('loading');
      }
    }
  };

  // checklist
  const navEditClickHandler = (event) => {
    if (event.target.matches('.button.edit')) {
      completeChecklistItem(projectDetails.projectSlug, 'navEdited', projectDetails);
      navsTable.removeEventListener('click', navEditClickHandler);
    }
  };
  navsTable.addEventListener('click', navEditClickHandler);
}
