import {
  completeChecklistItem,
  daProjectRepo,
  dateToRelativeSpan,
  dateToRelativeString,
  EMAIL_WORKER_API, OOPS, parseFragment, safeText, sanitizeName, SCRIPT_API, slugify,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { renderTable } from './renderSitePages.js';
import { alertDialog, confirmDialog, createDialog } from '../../scripts/dialogs.js';
import { readQueryParams, removeQueryParams } from '../../libs/queryParams/queryParams.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';

export default async function renderCampaignsOverview({
  container, nav, renderOptions, pushHistory, replaceHistory, onHistoryPopArray,
}) {
  const {
    projectDetails, user, token, siteSlug, pathname,
  } = renderOptions;
  container.innerHTML = renderSkeleton('campaigns');

  // get required data
  const [indexData, campaignsData] = await Promise.all([
    fetch(`${SCRIPT_API}/index/${siteSlug}`).then((res) => res.json()).catch(() => null),
    fetch(`${SCRIPT_API}/campaigns/${siteSlug}`, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json()).catch(() => ({})),
  ]);

  if (!indexData?.data) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  const emailDocuments = indexData.data.filter(({ path }) => path.startsWith('/emails/'));

  nav.innerHTML = `
    <button id="delete-campaign" title="Delete the Campaign" class="button secondary delete-campaign action" >Delete</button>
    <button id="add-email" title="Add Email" class="button secondary add-email action" >Add Email</button>
    <a target="_blank" href="#" id="open-campaign" title="Open Campaign" class="button secondary open-campaign action" >Open</a>
    <button id="add-campaign" title="Start a new Campaign" class="button primary add-campaign action">New Campaign</button>
  `;

  const addCampaignEl = nav.querySelector('#add-campaign');
  const addEmailEl = nav.querySelector('#add-email');
  const allCampaignSlugs = Object.keys(campaignsData);

  container.innerHTML = `
      <div class="well" hidden>
        <img src="/icons/illustrations/pc.svg" alt="" loading="lazy"/>
        <div class="text">
          <h2>Create your first campaign</h2>
          <p>It’s never been easier to start a campaign. Create a campaign email, edit your content and send it out to your audience.</p>
          <button id="add-campaign" class="button primary">Start now</button>
        </div>
      </div>

      <ul class="campaign-list" data-type="emails">
        <li><a class="button selector action secondary" href="${pathname}/emails">All emails</a></li>
        ${allCampaignSlugs.map((campaignSlug) => `<li data-campaign="${campaignSlug}"><a class="button selector action secondary" href="${pathname}/emails/${campaignSlug}">${campaignsData[campaignSlug].name}</li></a>`).join('')}</a>
      </ul>
      <div class="campaign-container"></div>
    `;

  const well = container.querySelector('.well');

  const setCampaignLink = (action, campaign) => {
    if (projectDetails.darkAlleyProject) {
      action.href = `https://da.live/#/${daProjectRepo}/${siteSlug}/emails/${campaign}`;
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
      const hidden = container.querySelector('.campaign:not([hidden])');
      if (hidden) {
        container.querySelector('.campaign:not([hidden])').hidden = true;
      }
      container.querySelector(`.campaign:nth-child(${index + 1})`).hidden = false;

      nav.querySelectorAll('.delete-campaign, .add-email, .open-campaign').forEach((action) => {
        action.hidden = index === 0;

        if (action.classList.contains('open-campaign') && !action.hidden) {
          setCampaignLink(action, newSelectedCampaign.dataset.campaign);
        }
      });

      if (event.isTrusted) {
        pushHistory(link.getAttribute('href'));
      }
    }
  };

  const campaignContainer = container.querySelector('.campaign-container');
  campaignContainer.innerHTML = `
      <div class="campaign" hidden>
        <table class="emails"></table>
      </div>
    `;

  renderTable({
    table: campaignContainer.querySelector('table.emails'), tableData: emailDocuments, type: 'emails', projectDetails, token,
  });

  allCampaignSlugs.forEach((campaignSlug) => {
    const campaign = campaignsData[campaignSlug];
    const campaignEmails = emailDocuments.filter(({ path }) => path.startsWith(`/emails/${campaignSlug}/`));

    const campaignDetails = parseFragment(`
      <div data-campaign="${campaignSlug}" class="campaign campaign-${campaignSlug}" hidden>
        <div class="cards">
          <div class="box">
              <strong>Campaign</strong>
              <span>${safeText(campaign.name)} (${campaignSlug})</span>
          </div>
          <div class="box">
              <strong>Campaign description</strong>
              <span class="description">${safeText(campaign.description)}</span>
              <button title="Edit the Campaign Description" class="button secondary update-campaign-description action">Update</button>
          </div class="box">
          <div class="box">
              <strong>Created</strong>
              ${dateToRelativeSpan(campaign.created).outerHTML}
          </div>
          <div class="box">
              <strong>Last update</strong>
              ${dateToRelativeSpan(campaign.lastUpdated, 'last-updated').outerHTML}
          </div>
        </div>
        
        <h2>${safeText(campaign.name)} emails</h2>
        <table class="emails"></table>
      </div>
      `);

    campaignContainer.append(campaignDetails);

    renderTable({
      table: campaignContainer.querySelector(`.campaign-${campaignSlug} table.emails`), tableData: campaignEmails, type: 'emails', projectDetails, token,
    });
  });

  let campaignToShow = window.location.pathname.split(`${pathname}/emails/`)[1] || null;
  const params = readQueryParams();
  if (params.campaignIndex) {
    campaignToShow = allCampaignSlugs?.[Number(params.campaignIndex)] || null;
    removeQueryParams(['campaignIndex']);
  }
  let buttonToPress = null;
  if (campaignToShow) {
    buttonToPress = container.querySelector(`.campaign-list a[href="${pathname}/emails/${campaignToShow}"]`);
  }
  if (!buttonToPress) {
    buttonToPress = container.querySelector('.campaign-list a');
  }
  // TODO: for some reason requestAnimationFrame is required because some things stay hidden.
  // fully rewrite the logic for showing stuff so it's readable and easier to update
  requestAnimationFrame(() => {
    buttonToPress.click();
  });

  const toggleWell = () => {
    if (campaignList.childElementCount === 1) {
      addCampaignEl.hidden = true;
      addCampaignEl.removeAttribute('id');
      well.hidden = false;
    } else {
      addCampaignEl.hidden = false;
      addCampaignEl.id = 'add-campaign';
      well.hidden = true;
    }
  };

  const addCampaign = async () => {
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

    const dialog = createDialog(content, [submit]);
    const existingCampaigns = [...campaignList.querySelectorAll('li[data-campaign]')].map((el) => el.dataset.campaign);
    const form = content.querySelector('#create-campaign-form');
    const nameInput = form.querySelector('input[name="name"]');
    nameInput.oninput = (event = { target: nameInput }) => {
      event.target.value = sanitizeName(event?.target?.value || '');
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
        await alertDialog(OOPS);
      } else {
        const newCampaign = await req.json();
        completeChecklistItem(siteSlug, 'createdCampaign', projectDetails);

        container.querySelectorAll('.campaign-list').forEach((el) => {
          el.insertAdjacentHTML('beforeend', `
              <li data-campaign="${newCampaign.slug}"><a class="button selector action secondary" href="${pathname}/${el.dataset.type}/${newCampaign.slug}">${newCampaign.name}</li></a>
            `);
        });

        campaignContainer.insertAdjacentHTML('beforeend', `
            <div class="campaign campaign-${newCampaign.slug}" hidden>
              <div class="cards">
                <div class="box">
                    <strong>Campaign</strong>
                    <span class="campaign-name">${safeText(newCampaign.name)} (${newCampaign.slug})</span>
                </div>
                <div class="box">
                    <strong>Campaign description</strong>
                    <span class="description">${safeText(newCampaign.description)}</span>
                    <button title="Edit the Campaign Description" class="button secondary update-campaign-description action">Update</button>
                </div>
                <div class="box">
                    <strong>Created</strong>
                    ${dateToRelativeSpan(newCampaign.created).outerHTML}
                </div>
                <div class="box">
                    <strong>Last update</strong>
                    ${dateToRelativeSpan(newCampaign.lastUpdated).outerHTML}
                </div>
              </div>
              
              <h2>${safeText(newCampaign.name)} emails</h2>
              <table class="emails"></table>
            </div>
          `);

        const newCampaignEmails = emailDocuments.filter(({ path }) => path.startsWith(`/emails/${newCampaign.slug}/`));
        renderTable({
          table: campaignContainer.querySelector(`.campaign-${newCampaign.slug} .emails`), tableData: newCampaignEmails, type: 'emails', projectDetails, token,
        });

        const link = campaignList.querySelector('li:last-child a');
        link.click();
        pushHistory(link.getAttribute('href'));

        dialog.setLoading(false);
        dialog.close();

        toggleWell();

        addEmailEl.click();
      }
    };
  };

  well.querySelector('#add-campaign').onclick = addCampaign;

  if (window.location.pathname.endsWith(`/${siteSlug}/emails`)) {
    toggleWell();
  }

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

      const dialog = createDialog(content, [submit]);
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
          dialog.close();
          showToast('Description updated.');

          description.textContent = update.description;
          const updateDate = new Date(update.lastUpdated);
          const lastUpdatedSpan = campaign.querySelector('.last-updated');
          lastUpdatedSpan.title = new Date(update.lastUpdated).toLocaleString();
          lastUpdatedSpan.textContent = dateToRelativeString(updateDate);
        } else {
          dialog.setLoading(false);
          await alertDialog(OOPS);
        }
      };
    }
  };

  addCampaignEl.onclick = addCampaign;

  addEmailEl.onclick = async () => {
    const campaignSlug = campaignList.querySelector('li a.is-selected').parentElement.dataset.campaign;
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

    const dialog = createDialog(content, [submit], { fullscreen: true });
    const form = document.getElementById('add-email-form');
    const existingEmails = [...container.querySelectorAll(`.campaign-${campaignSlug} .emails tbody tr td:first-child`)].map((el) => el.textContent);

    const nameInput = form.querySelector('input[name="pageName"]');
    nameInput.oninput = (event = { target: nameInput }) => {
      event.target.value = sanitizeName(event?.target?.value || '');
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
        await alertDialog(OOPS);
      } else {
        const { pageSlug, daNewPageSlug } = await req.json();
        completeChecklistItem(siteSlug, 'createdCampaignEmail', projectDetails);

        window.location.href = `/email/${siteSlug}/emails/${campaignSlug}/${pageSlug || daNewPageSlug}`;
      }
    };
  };

  nav.querySelector('.delete-campaign').onclick = async (event) => {
    const campaignSlug = campaignList.querySelector('li a.is-selected').parentElement.dataset.campaign;
    if (campaignSlug) {
      if (await confirmDialog('Are you sure ?')) {
        window?.zaraz?.track('click campaign delete submit');

        event.target.classList.add('loading');
        const deleteReq = await fetch(`${SCRIPT_API}/campaigns/${siteSlug}/${campaignSlug}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (deleteReq?.ok) {
          const emailsToDelete = [...container.querySelectorAll(`.campaign-${campaignSlug} .emails tr[data-path]`)].map((el) => `.campaign .emails tr[data-path="${el.dataset.path}"]`);

          container.querySelector(`.campaign-${campaignSlug}`).remove();
          if (emailsToDelete.length) {
            container.querySelectorAll(emailsToDelete.join(',')).forEach((el) => {
              el.remove();
            });
          }

          container.querySelector(`.campaign-list[data-type="emails"] li[data-campaign="${campaignSlug}"]`).remove();
          container.querySelector('.campaign-list[data-type="emails"] a').click();

          replaceHistory(`${pathname}/emails`);

          toggleWell();
        } else {
          showErrorToast();
        }
        event.target.classList.remove('loading');
      }
    }
  };

  nav.querySelectorAll('.delete-campaign, .add-email, .open-campaign').forEach((action) => {
    action.hidden = !window.location.pathname.startsWith(`${pathname}/emails/`);
    if (action.classList.contains('open-campaign') && !action.hidden) {
      setCampaignLink(action, window.location.pathname.split('/').pop());
    }
  });

  onHistoryPopArray.push((currentItem) => {
    campaignList.querySelector(`[href="${currentItem}"]`).click();
  });

  const addCampaignLink = document.querySelector(`.tabs-aside a[href$="/${siteSlug}/emails"].add-campaign`);
  if (addCampaignLink) {
    addCampaignLink.classList.remove('add-campaign');
    addCampaignEl.click();
  }
}
