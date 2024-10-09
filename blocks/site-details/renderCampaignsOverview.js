import {
  daProjectRepo,
  EMAIL_WORKER_API, OOPS, parseFragment, SCRIPT_API, slugify,
} from '../../scripts/scripts.js';
import { renderTable } from './renderSitePages.js';

export default async function renderCampaignsOverview({ container, nav, renderOptions }) {
  const {
    projectDetails, user, token, siteSlug, pathname,
  } = renderOptions;
  container.innerHTML = '<img src="/icons/loading.svg" alt="loading"/>';

  // get required data
  const [indexData, campaignsData] = await Promise.all([
    fetch(`${SCRIPT_API}/index/${siteSlug}`).then((res) => res.json()).catch(() => null),
    fetch(`${SCRIPT_API}/campaigns/${siteSlug}`, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json()).catch(() => ({})),
  ]);

  if (!indexData?.data) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  const emailDocuments = indexData.data.filter(({ path }) => path.startsWith('/emails/') || path === '/newsletter');

  nav.innerHTML = `
    <button id="delete-campaign" title="Delete the Campaign" class="button secondary delete-campaign action" hidden>Delete</button>
    <button id="add-email" title="Add Email" class="button secondary add-email action" hidden>Add Email</button>
    <a target="_blank" href="#" id="open-campaign" title="Open Campaign" class="button secondary open-campaign action" hidden>Open</a>
    <button id="new-campaign" title="Start a new Campaign" class="button primary add-campaign action">New Campaign</button>
  `;

  const allCampaignSlugs = Object.keys(campaignsData);

  container.innerHTML = `
      <ul class="campaign-list" data-type="emails">
        <li><a class="button action secondary ${window.location.pathname.startsWith(`${pathname}/emails/`) ? '' : 'is-selected'}" href="${pathname}/emails">All emails</a></li>
        ${allCampaignSlugs.map((campaignSlug) => `<li data-campaign="${campaignSlug}"><a class="button action secondary ${window.location.pathname === `${pathname}/emails/${campaignSlug}` ? 'is-selected' : ''}" href="${pathname}/emails/${campaignSlug}">${campaignsData[campaignSlug].name}</li></a>`).join('')}</a>
      </ul>
      <div class="campaign-container"></div>
    `;

  const setCampaignLink = (action, campaign) => {
    if (projectDetails.darkAlleyProject) {
      action.href = `https://da.live/#/${daProjectRepo}/${siteSlug}/${campaign}`;
    } else {
      action.href = `https://drive.google.com/drive/u/1/search?q=title:${campaign}%20parent:${projectDetails.driveId}%20type:folder&authuser=${user.email}`;
    }
  };

  const campaignList = container.querySelector('.campaign-list');
  campaignList.onclick = (event) => {
    if (event.target.matches('a')) {
      event.preventDefault();

      const link = event.target;
      const selectedCampaign = campaignList.querySelector('.is-selected');
      if (selectedCampaign) {
        selectedCampaign.classList.remove('is-selected');
      }
      link.classList.add('is-selected');

      const newSelectedCampaign = link.closest('[data-campaign]');
      const index = [...campaignList.children].indexOf(link.parentElement);
      container.querySelector('.campaign:not([hidden])').hidden = true;
      container.querySelector(`.campaign:nth-child(${index + 1})`).hidden = false;

      nav.querySelectorAll('.delete-campaign, .add-email, .open-campaign').forEach((action) => {
        action.hidden = index === 0;

        if (action.classList.contains('open-campaign') && !action.hidden) {
          setCampaignLink(action, newSelectedCampaign.dataset.campaign);
        }
      });

      window.history.pushState({}, '', link.getAttribute('href'));
    }
  };

  const campaignContainer = container.querySelector('.campaign-container');
  campaignContainer.innerHTML = `
      <div class="campaign" ${window.location.pathname.startsWith(`${pathname}/emails/`) ? 'hidden' : ''}>
        <table class="emails"></table>
      </div>
    `;

  renderTable({
    table: campaignContainer.querySelector('table.emails'), tableData: emailDocuments, type: 'emails', projectDetails,
  });

  allCampaignSlugs.forEach((campaignSlug) => {
    const campaign = campaignsData[campaignSlug];
    const campaignEmails = emailDocuments.filter(({ path }) => path.startsWith(`/emails/${campaignSlug}/`));

    const campaignDetails = parseFragment(`
      <div data-campaign="${campaignSlug}" class="campaign campaign-${campaignSlug}" ${window.location.pathname === `${pathname}/emails/${campaignSlug}` ? '' : 'hidden'}>
        <div class="cards">
          <div>
              <strong>Campaign</strong>
              <span>${campaign.name} (${campaignSlug})</span>
          </div>
          <div>
              <strong>Campaign description</strong>
              <span class="description">${campaign.description}</span>
              <button title="Edit the Campaign Description" class="button secondary update-campaign-description action">Update</button>
          </div>
          <div>
              <strong>Created</strong>
              <span>${new Date(campaign.created).toLocaleString()}</span>
          </div>
          <div>
              <strong>Last update</strong>
              <span class="last-updated">${new Date(campaign.lastUpdated).toLocaleString()}</span>
          </div>
        </div>
        
        <h2>${campaign.name} emails</h2>
        <table class="emails"></table>
      </div>
      `);

    campaignContainer.append(campaignDetails);

    renderTable({
      table: campaignContainer.querySelector(`.campaign-${campaignSlug} table.emails`), tableData: campaignEmails, type: 'emails', projectDetails,
    });
  });

  campaignContainer.onclick = async (event) => {
    if (event.target.matches('.update-campaign-description')) {
      window?.zaraz?.track('click update campaign description');

      const campaign = event.target.closest('.campaign');
      const campaignSlug = campaign.dataset.campaign;
      const description = campaign.querySelector('.description');

      const submit = parseFragment('<button form="update-campaign-form" type="submit" class="button primary action">Update Campaign</button>');
      const content = parseFragment(`
          <div>
            <h3>Update campaign</h3>
            
            <form id="update-campaign-form">
              <label>
                  <span>Description *</span>
                  <textarea required name="description" placeholder="All monthly newsletters for subscribers">${description.textContent}</textarea>
              </label>
            </form>
          </div>
        `);

      const dialog = window.createDialog(content, [submit]);
      const form = document.getElementById('update-campaign-form');

      form.onsubmit = async (e) => {
        window.zaraz?.track('click campaign update');

        e.preventDefault();

        dialog.setLoading(true, 'Updating description...');
        const body = Object.fromEntries(new FormData(form));
        const reqUpdate = await fetch(`${SCRIPT_API}/campaigns/${siteSlug}/${campaignSlug}`, {
          headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          method: 'PATCH',
          body: JSON.stringify(body),
        }).catch(() => null);

        if (reqUpdate?.ok) {
          const update = await reqUpdate.json();
          dialog.renderDialog('<h3 class="centered-info" >Description Updated</h3>');

          description.textContent = update.description;
          campaign.querySelector('.last-updated').textContent = new Date(update.lastUpdated).toLocaleString();
        } else {
          await window.alertDialog(OOPS);
        }

        dialog.setLoading(false);
      };
    }
  };

  nav.querySelector('.add-campaign').onclick = async () => {
    const submit = parseFragment('<button form="create-campaign-form" type="submit" class="button primary action">Create Campaign</button>');
    const content = parseFragment(`
        <div>
          <h3>Create a new campaign</h3>
          
          <form id="create-campaign-form">
            <p>
                Start your email marketing campaign with individual email messages with specific purposes including the following: downloading a PDF, sign up for a newsletter, or make a purchase.
            </p>
            <label>
                <span>Name *</span>
                <input required name="name" type="text" placeholder="Newsletters"/>
            </label>
            <label>
                <span>Description</span>
                <textarea name="description" placeholder="All monthly newsletters for subscribers"></textarea>
            </label>
          </form>
        </div>
      `);

    const dialog = window.createDialog(content, [submit]);
    const existingCampaigns = [...campaignList.querySelectorAll('li[data-campaign]')].map((el) => el.dataset.campaign);
    const form = content.querySelector('#create-campaign-form');
    const nameInput = form.querySelector('input[name="name"]');
    nameInput.oninput = (event = { target: nameInput }) => {
      const value = slugify(event?.target?.value || '');
      if (!value) {
        submit.disabled = true;
        event.target.setCustomValidity('Please enter a name');
        return;
      }

      if (existingCampaigns.includes(value)) {
        event.target.setCustomValidity('Campaign already exists');
        return;
      }
      submit.disabled = false;
      event.target.setCustomValidity('');
    };
    nameInput.oninput();

    form.onsubmit = async (e) => {
      window.zaraz?.track('click create campaign');

      e.preventDefault();

      dialog.setLoading(true, 'Creating Campaign...');

      const req = await fetch(`${SCRIPT_API}/campaigns/${siteSlug}`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      }).catch(() => null);

      if (!req?.ok) {
        dialog.setLoading(false);
        await window.alertDialog(OOPS);
      } else {
        const newCampaign = await req.json();

        container.querySelectorAll('.campaign-list').forEach((el) => {
          el.insertAdjacentHTML('beforeend', `
              <li data-campaign="${newCampaign.slug}"><a class="button action secondary" href="${pathname}/${el.dataset.type}/${newCampaign.slug}">${newCampaign.name}</li></a>
            `);
        });

        campaignContainer.insertAdjacentHTML('beforeend', `
            <div class="campaign campaign-${newCampaign.slug}" hidden>
              <div class="cards">
                <div>
                    <strong>Campaign</strong>
                    <span>${newCampaign.name} (${newCampaign.slug})</span>
                </div>
                <div>
                    <strong>Campaign description</strong>
                    <span class="description">${newCampaign.description}</span>
                    <button title="Edit the Campaign Description" class="button secondary update-campaign-description action">Update</button>
                </div>
                <div>
                    <strong>Created</strong>
                    <span>${new Date(newCampaign.created).toLocaleString()}</span>
                </div>
                <div>
                    <strong>Last update</strong>
                    <span class="last-updated">${new Date(newCampaign.lastUpdated).toLocaleString()}</span>
                </div>
              </div>
              
              <h2>${newCampaign.name} emails</h2>
              <table class="emails"></table>
            </div>
          `);

        const newCampaignEmails = emailDocuments.filter(({ path }) => path.startsWith(`/emails/${newCampaign.slug}/`));
        renderTable({
          table: campaignContainer.querySelector(`.campaign-${newCampaign.slug} .emails`), tableData: newCampaignEmails, type: 'emails', projectDetails,
        });

        campaignList.querySelector('li:last-child a').click();

        dialog.setLoading(false);
        dialog.close();
      }
    };
  };

  const addEmail = nav.querySelector('.add-email');
  addEmail.onclick = async () => {
    const submit = parseFragment('<button form="add-email-form" type="submit" class="button primary action">Add Email</button>');
    const content = parseFragment(`
        <div>
          <h3>Add email to Campaign</h3>
          
          <div class="columns">
            <form id="add-email-form">
              <p>Add a newsletter email to your campaign</p>
              <label>
                  <span>Name *</span>
                  <input required name="pageName" type="text" placeholder="Monthly Newsletter">
                  <p></p>
              </label>
              <input type="hidden" name="templatePath" value="/newsletter">
            </form>
            <iframe src="${EMAIL_WORKER_API}/preview/https://main--${projectDetails.templateSlug}--headwire-self-service-templates.aem.live/newsletter"></iframe>
          </div>
        </div>
      `);

    const dialog = window.createDialog(content, [submit], { fullscreen: true });
    const form = document.getElementById('add-email-form');
    const campaignSlug = window.location.pathname.split('/').pop();
    const existingEmails = [...container.querySelectorAll(`.campaign-${campaignSlug} .emails tbody tr td:first-child`)].map((el) => el.textContent);

    const nameInput = form.querySelector('input[name="pageName"]');
    nameInput.oninput = (event = { target: nameInput }) => {
      const value = slugify(event?.target?.value || '');
      if (!value) {
        submit.disabled = true;
        event.target.setCustomValidity('Please enter a name');
        return;
      }

      if (existingEmails.includes(value)) {
        event.target.setCustomValidity('Email already exists');
        return;
      }
      submit.disabled = false;
      event.target.setCustomValidity('');
    };
    nameInput.oninput();

    form.onsubmit = async (e) => {
      window.zaraz?.track('click add email');

      e.preventDefault();

      dialog.setLoading(true, 'Adding email...');

      const body = Object.fromEntries(new FormData(form));
      const req = await fetch(`${SCRIPT_API}/campaigns/${siteSlug}/${campaignSlug}`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(body),
      }).catch(() => null);

      if (!req?.ok) {
        dialog.setLoading(false);
        await window.alertDialog(OOPS);
      } else {
        dialog.setLoading(false);
        dialog.close();
        const { pageSlug, daNewPageSlug } = await req.json();
        window.location.href = `/email/${siteSlug}/emails/${campaignSlug}/${pageSlug || daNewPageSlug}`;
      }
    };
  };

  nav.querySelector('.delete-campaign').onclick = async (event) => {
    const campaignSlug = window.location.pathname.split('/')[4];
    if (campaignSlug) {
      if (await window.confirmDialog('Are you sure ?')) {
        window?.zaraz?.track('click campaign delete submit');

        event.target.classList.add('is-disabled');
        const deleteReq = await fetch(`${SCRIPT_API}/campaigns/${siteSlug}/${campaignSlug}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (deleteReq?.ok) {
          container.querySelector(`.campaign-list[data-type="emails"] li[data-campaign="${campaignSlug}"]`).remove();
          container.querySelector('.campaign-list[data-type="emails"] a').click();

          const li = container.querySelector(`.campaign-list[data-type="analytics"] li[data-campaign="${campaignSlug}"]`);
          if (li.querySelector('.is-selected')) {
            li.parentElement.firstElementChild.querySelector('a').classList.add('is-selected');
          }
          li.remove();

          window.history.replaceState({}, '', `${pathname}/emails`);
        } else {
          await window.alertDialog(OOPS);
        }
        event.target.classList.remove('is-disabled');
      }
    }
  };

  nav.querySelectorAll('.delete-campaign, .add-email, .open-campaign').forEach((action) => {
    action.hidden = !window.location.pathname.startsWith(`${pathname}/emails/`);
    if (action.classList.contains('open-campaign') && !action.hidden) {
      setCampaignLink(action, window.location.pathname.split('/').pop());
    }
  });
}
