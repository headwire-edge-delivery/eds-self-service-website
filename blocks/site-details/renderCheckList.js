import renderSkeleton from '../../scripts/skeletons.js';
import {
  SCRIPT_API, OOPS,
  parseFragment,
  completeChecklistItem,
  highlightElement,
} from '../../scripts/scripts.js';
import { readQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import { toClassName } from '../../scripts/aem.js';

// eslint-disable-next-line consistent-return
function openButtonOnclick(event) {
  const path = event?.currentTarget?.dataset?.path;
  const encodedHighlightSelector = event?.currentTarget?.dataset?.highlightSelector;
  if (encodedHighlightSelector) writeQueryParams({ highlight: encodedHighlightSelector }, true);

  if (!path) {
    highlightElement(); // assumed to be on same tab (overview)
    return;
  }

  const linkForPath = document.querySelector(`[href="${path}"`);
  if (linkForPath) {
    linkForPath.click();
    highlightElement();
    return;
  }

  if (event?.currentTarget?.dataset?.newTab === 'true') {
    window.open(`${path}?highlight=${encodedHighlightSelector}`, '_blank');
    return;
  }

  window.location.href = `${path}?highlight=${encodedHighlightSelector}`;
}

// MARK: renderCheckList
export default async function renderCheckList({
  container, nav, renderOptions, onHistoryPopArray,
}) {
  console.log('container:', container);
  console.log('renderOptions:', renderOptions);
  // container.innerHTML = `
  //   <div class="checklist">
  //     ${renderSkeleton('checklist')}
  //   </div>
  // `;
  container.innerHTML = `
    <div class="checklist">
      <h2 class="checklist-title">Checklist</h2>

      <div class="button-container section-tabs"></div>

      <div class="sections">
    </div>
  `;
  const checklistTitle = container.querySelector('.checklist-title');
  // const checklistUl = container.querySelector('.checklist-list');
  // const progressBar = container.querySelector('.progress-bar');
  const sectionTabsContainer = container.querySelector('.button-container.section-tabs');
  const checklistSectionsContainer = container.querySelector('.sections');

  const setSelectedSection = (event) => {
    const sectionName = event?.currentTarget?.dataset?.sectionName;
    if (!sectionName) return;
    const sectionElements = container.querySelectorAll('.section-tabs .button, .sections .checklist-section');
    if (!sectionElements) return;
    sectionElements.forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.sectionName === sectionName);
    });
    if (event.isTrusted) {
      writeQueryParams({ ...readQueryParams(), checklistSection: sectionName }, true);
    }
  };

  const baseChecklistData = renderOptions?.projectDetails?.checklistData || {};

  const checklistConfig = [
    {
      section: 'Getting Started',
      sectionItems: [
        {
          content: 'Install the sidekick extension',
          allowManualCheck: true,
          // path: `${renderOptions.pathname}/overview`,
          highlight: '#install-sidekick-button',
          property: 'sidekickInstalled',
        },
        {
          content: 'Add a new page',
          path: `${renderOptions.pathname}/pages`,
          highlight: '#add-page-button',
          property: 'pageAdded',
        },
        {
          content: 'Link to your new page',
          path: `${renderOptions.pathname}/pages`,
          highlight: 'table.navs .button.edit',
          property: 'navEdited',
        },
        {
          content: 'Add your logo!',
          path: `${renderOptions.pathname}/settings`,
          highlight: '#icons-list [data-icon-name="logo.svg"] .icon-settings',
          property: 'logoAdded',
        },
        {
          content: 'Add your favicon',
          path: `${renderOptions.pathname}/settings`,
          highlight: '#favicon',
          property: 'faviconAdded',
        },
        {
          content: 'Update your site\'s theme',
          path: `${window.location.origin}/theme/${renderOptions.siteSlug}`,
          newTab: true,
          completeOnClick: true,
          property: 'themeUpdated',
        },
      ],
    },
    {
      section: 'Campaigns',
      sectionItems: [
        {
          content: 'Create a new campaign',
          path: `${renderOptions.pathname}/emails`,
          highlight: '#new-campaign',
          property: 'createdCampaign',
        },
      ],
    },
  ];
  let defaultSectionIndex = 0;


  // MARK: render items
  const renderChecklistItems = (checklistData = baseChecklistData) => {
    // reset
    sectionTabsContainer.innerHTML = '';
    checklistSectionsContainer.innerHTML = '';

    // section setup
    const sections = checklistConfig.map((section, index) => {
      if (readQueryParams().checklistSection === toClassName(section.section)) {
        defaultSectionIndex = index;
      }

      const sectionDiv = parseFragment(`
        <div data-section-index="${index}" data-section-name="${toClassName(section.section)}" class="checklist-section">
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div class="progress-bar-fill"></div>
              <div class="progress-bar-fraction">
                <span><span class="current">0</span> / <span class="total">0</span> Completed<span>
              </div>
            </div>
          </div>
  
          <ul class="checklist-list"></ul>
        </div>`);
      const checklistUl = sectionDiv.querySelector('.checklist-list');
      const progressBarFill = sectionDiv.querySelector('.progress-bar-fill');

      const progressTotal = section.sectionItems.length;
      const progressCurrent = section.sectionItems.reduce(
        (current, item) => (checklistData[item.property] ? current + 1 : current),
        0,
      );

      // render progress
      sectionDiv.querySelector('.progress-wrapper .total').textContent = progressTotal;
      sectionDiv.querySelector('.progress-wrapper .current').textContent = progressCurrent;
      progressBarFill.style.width = `${(progressCurrent / progressTotal) * 100}%`;

      // section tab button
      const sectionTabButton = parseFragment(`<button class="button secondary selector action" data-section-index="${index}" data-section-name="${toClassName(section.section)}" data-selected="false">${section.section}</button>`);
      sectionTabButton.onclick = setSelectedSection;
      sectionTabsContainer.append(sectionTabButton);

      // render section items
      const checklistItems = section.sectionItems.map((item) => {
        if (!item.path) item.path = '';
        const encodedHighlightSelector = encodeURIComponent(item.highlight);
        const checklistItem = parseFragment(`
          <li class="checklist-item" data-checklist-property="${item.property}" data-path="${item.path}" data-highlight-selector="${encodedHighlightSelector}">
            <span class="checklist-item-title">${item.content}</span>
            <div class="checklist-button-container">
              <button data-path="${item.path}" data-new-tab="${item.newTab || false}" data-highlight-selector="${encodedHighlightSelector}" class="button checklist-button open-button" aria-label="Open">
                <img src="/icons/chevron-down.svg" alt="Open" />
              </button>
            </div>
          </li>
        `);
        checklistItem.dataset.completed = Boolean(checklistData[item.property]);

        const openButton = checklistItem.querySelector('.open-button');
        openButton.onclick = openButtonOnclick;

        if (item.allowManualCheck) {
          const manuelCheckButton = parseFragment('<button class="button checklist-button checklist-manual-checkbox" aria-label="Check" ><img src="/icons/check-mark.svg" alt="Checkmark" /></button>');
          manuelCheckButton.onclick = async () => {
            if (checklistItem.dataset.completed === 'true') return;
            manuelCheckButton.classList.add('loading');
            await completeChecklistItem(renderOptions.siteSlug, item.property);
            manuelCheckButton.classList.remove('loading');
          };
          openButton.before(manuelCheckButton);
        }

        return checklistItem;
      });

      checklistUl.append(...checklistItems);
      return sectionDiv;
    });

    checklistSectionsContainer.append(...sections);

    sectionTabsContainer.children[defaultSectionIndex].click();
  };

  // MARK: triggers
  renderChecklistItems();

  const reloadChecklist = async () => {
    checklistTitle.classList.add('reloading-checklist');
    const fetchedChecklistData = await fetch(`${SCRIPT_API}/checklist/${renderOptions.siteSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    checklistTitle.classList.remove('reloading-checklist');
    if (!fetchedChecklistData) return;

    renderChecklistItems(fetchedChecklistData);
  };

  // list reloads
  let cooldown = false;

  window.addEventListener('focus', () => {
    if (cooldown) return;
    cooldown = true;
    setTimeout(() => {
      cooldown = false;
    }, 3000);
    reloadChecklist();
  });

  setInterval(() => {
    if (cooldown) return;
    reloadChecklist();
  }, 30000);

  // TODO: checklist triggers
}
