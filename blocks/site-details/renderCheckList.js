import renderSkeleton from '../../scripts/skeletons.js';
import {
  SCRIPT_API, OOPS,
  parseFragment,
  completeChecklistItem,
  highlightElement,
} from '../../scripts/scripts.js';
import { writeQueryParams } from '../../libs/queryParams/queryParams.js';

// eslint-disable-next-line consistent-return
function openButtonOnclick(event) {
  const path = event?.currentTarget?.dataset?.path;
  if (!path) return console.warn('No Path');

  const encodedHighlightSelector = event?.currentTarget?.dataset?.highlightSelector;
  if (encodedHighlightSelector) writeQueryParams({ highlight: encodedHighlightSelector }, true);

  const linkForPath = document.querySelector(`[href="${path}"`);
  if (linkForPath) {
    linkForPath.click();
    highlightElement();
    return;
  }

  window.location.pathname = path;
}

async function populateChecklist(
  checklistUl,
  subTabContainer,
  slug,
  checklistConfig,
  checklistData,
) {
  checklistUl.innerHTML = '';
  checklistConfig.forEach((item) => {
    // make section selector
    if (item.section) {
      subTabContainer.insertAdjacentHTML('beforeend', `<button class="button primary action" data-selected="${subTabContainer.children.length === 0 ? 'true' : 'false'}">${item.section}</button>`);
      return;
    }

    const encodedHighlightSelector = encodeURIComponent(item.highlight);
    const checklistItem = parseFragment(`
      <li class="checklist-item" data-checklist-property="${item.property}" data-path="${item.path}" data-highlight-selector="${encodedHighlightSelector}">
        <span class="checklist-item-title">${item.content}</span>
        <div class="checklist-button-container">
          <button data-path="${item.path}" data-highlight-selector="${encodedHighlightSelector}" class="button checklist-button open-button" aria-label="Open">
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
        await completeChecklistItem(slug, item.property);
        manuelCheckButton.classList.remove('loading');
      };
      openButton.before(manuelCheckButton);
    }

    checklistUl.append(checklistItem);
  });
}

export default async function renderCheckList({
  container, nav, renderOptions, pushHistory, replaceHistory, onHistoryPopArray,
}) {
  console.log('renderOptions:', renderOptions);
  // container.innerHTML = `
  //   <div class="checklist">
  //     ${renderSkeleton('checklist')}
  //   </div>
  // `;
  container.innerHTML = `
    <div class="checklist">
      <h2>Checklist</h2>

      <div class="button-container"></div>

      <div class="progress-wrapper">
        <div class="progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
        <div class="progress-fraction">
          <span class="current">0</span> / <span class="total">0</span>
        </div>
      </div>

      <ul class="checklist-list"></ul>
    </div>
  `;
  const checklistUl = container.querySelector('.checklist-list');
  const progressBar = container.querySelector('.progress-bar');
  const subTabContainer = container.querySelector('.button-container');

  const checklistData = renderOptions?.projectDetails?.checklistData || {};

  const checklistConfig = [
    {
      section: 'Getting Started',
    },
    {
      content: 'Install the sidekick extension',
      allowManualCheck: true,
      path: `${renderOptions.pathname}/overview`,
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
      highlight: '.icons-list [data-icon-name="logo.svg"] .icon-settings',
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
      path: `${renderOptions.siteSlug}/theme`,
      completeOnClick: true,
      property: 'themeUpdated',
    },
  ];

  populateChecklist(checklistUl, subTabContainer, renderOptions.siteSlug, checklistConfig, checklistData);
}
