import { SCRIPT_API, parseFragment, completeChecklistItem, highlightElement, maybeStringify, maybeParse } from "../../scripts/scripts.js";
import { readQueryParams, writeQueryParams } from "../../libs/queryParams/queryParams.js";
import { toClassName } from "../../scripts/aem.js";
import { showErrorToast } from "../../scripts/toast.js";

function openButtonOnclick(event) {
  const path = event?.currentTarget?.dataset?.path || "";
  const encodedHighlightSelector = event?.currentTarget?.dataset?.highlightSelector || "";
  if (encodedHighlightSelector) writeQueryParams({ highlight: encodedHighlightSelector });
  const encodedTooltip = event?.currentTarget?.dataset?.tooltip || "";
  if (encodedTooltip) writeQueryParams({ tooltip: encodedTooltip });

  const decodedAdditionalQueries = maybeParse(decodeURIComponent(event?.currentTarget?.dataset?.additionalQueries || ""));
  if (decodedAdditionalQueries) writeQueryParams(decodedAdditionalQueries);

  if (!path) {
    highlightElement(); // assumed to be on same tab (overview)
    return;
  }

  // eslint-disable-next-line no-restricted-syntax
  const linkForPath = document.querySelector(`[href="${path}"`);
  if (linkForPath) {
    linkForPath.click();
    highlightElement();
    return;
  }

  const params = new URLSearchParams(window.location.search);

  if (event?.currentTarget?.dataset?.newTab === "true") {
    window.open(`${path}${params.toString()}`, "_blank");
    return;
  }

  window.location.href = `${path}${params.toString()}`;
}

// MARK: renderCheckList
export default async function renderCheckList({ container, renderOptions, historyArray }) {
  container.innerHTML = `
    <div id="checklist" class="checklist">
      <h2 class="checklist-title">Checklist</h2>

      <div class="button-container section-tabs"></div>

      <div class="sections">
    </div>
  `;
  const checklistTitle = container.querySelector(".checklist-title");
  const sectionTabsContainer = container.querySelector(".button-container.section-tabs");
  const checklistSectionsContainer = container.querySelector(".sections");

  const setSelectedSection = (event) => {
    const sectionName = event?.currentTarget?.dataset?.sectionName;
    if (!sectionName) return;
    const sectionElements = container.querySelectorAll(".section-tabs .button, .sections .checklist-section");
    if (!sectionElements) return;
    sectionElements.forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.sectionName === sectionName);
    });
    const currentParams = readQueryParams();
    if (!currentParams.checklistSection && event?.currentTarget?.dataset?.sectionIndex === "0") return;
    writeQueryParams({ ...readQueryParams(), checklistSection: sectionName }, true);
  };

  const isDarkAlleyProject = renderOptions?.projectDetails?.darkAlleyProject || false;

  const checklistConfig = [
    {
      section: "Getting Started",
      sectionItems: [
        {
          content: "Install the sidekick extension",
          allowManualCheck: true,
          // path: `${renderOptions.pathname}/overview`,
          highlight: "#install-sidekick-button",
          property: "sidekickInstalled",
          skip: isDarkAlleyProject,
          completed: document.getElementById("install-sidekick-button")?.dataset.sidekickInstalled === "true",
        },
        {
          content: "Add this project to your Sidekick",
          property: "projectAdded",
          allowManualCheck: true,
          skip: isDarkAlleyProject,
          highlight: "#edit-button",
          hintBody: '<div><video width="1600" height="800" controls autoplay loop muted><source src="/media/tutorial-videos/add-project.webm" type="video/webm" /></video></div>',
        },
        {
          content: "Add a new page",
          path: `${renderOptions.pathname}/pages`,
          highlight: "#add-page-button",
          property: "pageAdded",
        },
        {
          content: "Link to your new page",
          path: `${renderOptions.pathname}/pages`,
          highlight: "table.navs .button.edit",
          property: "navEdited",
          tooltip:
            "Add an additional link to to the list of links in your nav document.\nMake sure you link the published page URL (i.e. https://mysite.kestrelone.com/blog) to the page you want to link to. The link to the drive document will not work.",
        },
        {
          content: "Add your logo",
          path: `${renderOptions.pathname}/settings`,
          highlight: '#icons-list [data-icon-name="logo.svg"] .icon-settings',
          property: "logoAdded",
        },
        {
          content: "Add your favicon",
          path: `${renderOptions.pathname}/settings`,
          highlight: "#favicon",
          property: "faviconAdded",
        },
        {
          content: "Update your site's theme",
          path: `${window.location.origin}/theme/${renderOptions.siteSlug}`,
          newTab: true,
          completeOnClick: true,
          property: "themeUpdated",
        },
      ],
    },
    {
      section: "Campaigns",
      sectionItems: [
        {
          content: "Add a contact",
          path: `${renderOptions.pathname}/audience`,
          highlight: "#add-contact",
          property: "contactAdded",
        },
        {
          content: "Create a new campaign",
          path: `${renderOptions.pathname}/emails`,
          highlight: "#add-campaign",
          property: "createdCampaign",
        },
        {
          content: "Create an email",
          path: `${renderOptions.pathname}/emails`,
          additionalQueries: { campaignIndex: 0 },
          highlight: "#add-email",
          property: "createdCampaignEmail",
        },
      ],
    },
  ];
  let defaultSectionIndex = 0;

  // MARK: render items
  const renderChecklistItems = (checklistData = renderOptions?.projectDetails?.checklistData || {}) => {
    // reset
    sectionTabsContainer.innerHTML = "";
    checklistSectionsContainer.innerHTML = "";

    // section setup, filter skipped & complete completed
    const sections = checklistConfig.map((section, index) => {
      section.sectionItems = section.sectionItems.filter((item) => !item.skip);
      section.sectionItems.forEach((item) => {
        if (item.completed) {
          checklistData[item.property] = true;
          completeChecklistItem(renderOptions.siteSlug, item.property, renderOptions?.projectDetails, false);
        }
      });

      if (readQueryParams().checklistSection === toClassName(section.section)) {
        defaultSectionIndex = index;
      }

      const sectionDiv = parseFragment(`
        <div data-section-index="${index}" data-section-name="${toClassName(section.section)}" class="checklist-section">
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div class="progress-bar-fill"></div>
              <div class="progress-bar-text">
                <span><span class="current">0</span> / <span class="total">0</span> Completed<span>
              </div>
            </div>
          </div>
  
          <ul class="checklist-list"></ul>
        </div>`);
      const checklistUl = sectionDiv.querySelector(".checklist-list");
      const progressBarFill = sectionDiv.querySelector(".progress-bar-fill");

      const progressTotal = section.sectionItems.length;
      let progressCurrent = section.sectionItems.reduce((current, item) => (checklistData[item.property] ? current + 1 : current), 0);

      // render progress
      const totalSpan = sectionDiv.querySelector(".progress-wrapper .total");
      const currentSpan = sectionDiv.querySelector(".progress-wrapper .current");
      const renderProgress = () => {
        totalSpan.textContent = progressTotal;
        currentSpan.textContent = progressCurrent;
        progressBarFill.style.width = `${(progressCurrent / progressTotal) * 100}%`;
      };
      renderProgress();

      // section tab button
      const sectionTabButton = parseFragment(
        `<button class="button secondary selector action" data-section-index="${index}" data-section-name="${toClassName(
          section.section,
        )}" data-selected="false">${section.section}</button>`,
      );
      sectionTabButton.onclick = setSelectedSection;
      sectionTabsContainer.append(sectionTabButton);

      // render section items
      let prevItemWasCompleted = true;
      const checklistItems = section.sectionItems.map((item, itemIndex) => {
        if (!item.path) item.path = "";
        const encodedHighlightSelector = encodeURIComponent(item.highlight || "") || "";
        const encodedTooltip = encodeURIComponent(item.tooltip || "");
        const encodedAdditionalQueries = encodeURIComponent(maybeStringify(item.additionalQueries || ""));
        const checklistItem = parseFragment(`
          <li class="checklist-item" data-index="${itemIndex}" data-checklist-property="${
  item.property
}" data-path="${item.path}" data-highlight-selector="${encodedHighlightSelector}">
            <span class="checklist-item-title">${item.content}</span>
            <div class="checklist-button-container">
              <button
                data-path="${item.path}"
                data-new-tab="${item.newTab || false}"
                data-highlight-selector="${encodedHighlightSelector}"
                data-additional-queries="${encodedAdditionalQueries}"
                data-tooltip="${encodedTooltip}"
                class="button checklist-button open-button"
                aria-label="Open"
              >
                <img src="/icons/chevron-down.svg" alt="Open" />
              </button>
            </div>
          </li>
        `);
        const itemIsCompleted = Boolean(checklistData[item.property]);
        checklistItem.dataset.completed = itemIsCompleted;
        // only latest item should not be deletable
        if (!prevItemWasCompleted) checklistItem.setAttribute("inert", true);
        if (!itemIsCompleted) prevItemWasCompleted = false;

        const openButton = checklistItem.querySelector(".open-button");
        openButton.onclick = openButtonOnclick;

        if (item.allowManualCheck) {
          const manuelCheckButton = parseFragment(
            '<button class="button checklist-button checklist-manual-checkbox" aria-label="Check" ><img src="/icons/check-mark.svg" alt="Checkmark" /></button>',
          );
          manuelCheckButton.onclick = async () => {
            if (checklistItem.dataset.completed === "true") return;
            manuelCheckButton.classList.add("loading");
            const success = await completeChecklistItem(renderOptions.siteSlug, item.property);
            if (success) {
              progressCurrent += 1;
              renderProgress();
              checklistData[item.property] = true;
              checklistItem.nextElementSibling.removeAttribute("inert");
            } else {
              showErrorToast();
            }
            manuelCheckButton.classList.remove("loading");
          };
          openButton.before(manuelCheckButton);
        }

        if (item.hintBody) {
          const title = checklistItem.querySelector(".checklist-item-title");
          const hintButton = parseFragment(
            `<button class="hint-button"><img src="/icons/help-dark.svg" alt="hint icon" /><div hidden class="hint-container">${item.hintBody}</div></button>`,
          );
          const hintContainer = hintButton.querySelector(".hint-container");

          const updateHintPos = () => {
            if (hintContainer.hidden) return;
            hintContainer.style.transform = "translateX(-50%)"; // reset
            const hintContainerBox = hintContainer.getBoundingClientRect();
            const bodyBox = document.body.getBoundingClientRect();
            const margin = 10;

            // make sure it's in viewport.
            // CSS keeps width smaller so we don't need to worry about that.
            // really hope we can use anchor CSS property one of these days...
            if (hintContainerBox.right + margin > bodyBox.right) {
              hintContainer.style.transform = `translateX(calc(-50% + ${bodyBox.right - hintContainerBox.right - margin}px))`;
            } else if (hintContainerBox.left - margin < 0) {
              hintContainer.style.transform = `translateX(calc(-50% - ${hintContainerBox.left - margin}px))`;
            } else {
              hintContainer.style.transform = "translateX(-50%)";
            }
          };

          const closeHandler = (event) => {
            if (hintContainer.contains(event.target)) return;
            hintContainer.hidden = true;
            window.removeEventListener("click", closeHandler);
            window.removeEventListener("resize", updateHintPos);
          };

          hintButton.onclick = () => {
            if (hintContainer.hidden) {
              hintContainer.hidden = null;
              requestAnimationFrame(() => {
                updateHintPos();
                window.addEventListener("click", closeHandler);
                window.addEventListener("resize", updateHintPos);
              });
            }
          };

          title.append(hintButton);
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
    checklistTitle.classList.add("reloading-checklist");
    const fetchedChecklistData = await fetch(`${SCRIPT_API}/checklist/${renderOptions.siteSlug}`, {
      method: "GET",
      headers: { authorization: `bearer ${await window.auth0Client.getTokenSilently()}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    checklistTitle.classList.remove("reloading-checklist");
    if (!fetchedChecklistData) return;

    renderChecklistItems(fetchedChecklistData);
    renderOptions.projectDetails.checklistData = fetchedChecklistData;
  };

  // refetch if loaded after another tab
  if (historyArray.length > 1) {
    reloadChecklist();
  }

  const visibilityHandler = () => {
    if (!document.body.contains(container)) {
      // remove self if container was removed (other tab opened)
      document.removeEventListener("visibilitychange", visibilityHandler);
      return;
    }
    if (document.hidden) return;
    reloadChecklist();
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}
