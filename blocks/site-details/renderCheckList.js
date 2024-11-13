import renderSkeleton from '../../scripts/skeletons.js';
import {
  SCRIPT_API, OOPS,
  parseFragment,
  completeChecklistItem,
  highlightElement,
} from '../../scripts/scripts.js';
import { writeQueryParams } from '../../libs/queryParams/queryParams.js';
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

      <div class="button-container section-tabs"></div>

      <div class="sections">
    </div>
  `;
  // const checklistUl = container.querySelector('.checklist-list');
  // const progressBar = container.querySelector('.progress-bar');
  const sectionTabsContainer = container.querySelector('.button-container.section-tabs');

  const setSelectedSection = (event) => {
    const sectionName = event?.currentTarget?.dataset?.sectionName;
    if (!sectionName) return;
    const sectionElements = container.querySelectorAll('.section-tabs .button, .sections .checklist-section');
    if (!sectionElements) return;
    sectionElements.forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.sectionName === sectionName);
    });
    if (event.isTrusted) {
      pushHistory(`${renderOptions.pathname}/${sectionName}`);
    }
  };


  const checklistData = renderOptions?.projectDetails?.checklistData || {};

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

  const sections = checklistConfig.map((section, index) => {
    if (window.location.pathname === `${renderOptions.pathname}/${toClassName(section.section)}`) defaultSectionIndex = index;
    const sectionDiv = parseFragment(`
      <div data-section-index="${index}" data-section-name="${toClassName(section.section)}" class="checklist-section">
        <div class="progress-wrapper">
          <div class="progress-bar">
            <div class="progress-bar-fill"></div>
          </div>
          <div class="progress-fraction">
            <span class="current">0</span> / <span class="total">0</span>
          </div>
        </div>

        <ul class="checklist-list"></ul>
      </div>`);
    const checklistUl = sectionDiv.querySelector('.checklist-list');

    // section tab button
    const sectionTabButton = parseFragment(`<button class="button secondary selector action" data-section-index="${index}" data-section-name="${toClassName(section.section)}" data-selected="false">${section.section}</button>`);
    sectionTabButton.onclick = setSelectedSection;
    sectionTabsContainer.append(sectionTabButton);

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
          await completeChecklistItem(slug, item.property);
          manuelCheckButton.classList.remove('loading');
        };
        openButton.before(manuelCheckButton);
      }

      return checklistItem;
    });

    checklistUl.append(...checklistItems);
    return sectionDiv;
  });

  container.querySelector('.sections').append(...sections);

  sectionTabsContainer.children[defaultSectionIndex].click();

  onHistoryPopArray.push(() => {
    const checklistTabToFind = window.location.pathname.replace(`${renderOptions.pathname}/`, '');
    if (!checklistTabToFind) {
      sectionTabsContainer.children[0].click();
      return;
    }

    const checklistTab = sectionTabsContainer.querySelector(`.section-tabs .button[data-section-name="${checklistTabToFind}"]`);
    if (!checklistTab) {
      sectionTabsContainer.children[0].click();
      return;
    }

    checklistTab.click();
  });


  // TODO: refresh list on window focus and maybe on interval
  window.addEventListener('focus', () => {
    console.log('\x1b[34m ~ WINDOW FOCUS:');
  });

  // TODO: checklist triggers

}
