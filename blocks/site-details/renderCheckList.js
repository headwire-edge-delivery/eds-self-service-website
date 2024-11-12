import renderSkeleton from '../../scripts/skeletons.js';
import {
  SCRIPT_API, OOPS,
} from '../../scripts/scripts.js';

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
      <ul class="checklist-list"></ul>
    </div>
  `;

  const checklistData = await fetch(`${SCRIPT_API}/checklist/${renderOptions.siteSlug}`).then((res) => res.json()).catch(() => null);
  if (!checklistData) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  const checklistUl = container.querySelector('.checklist-list');

  const checkListData = [
    {
      content: 'Install the sidekick extension!',
      allowManualCheck: true,
      path: `${renderOptions.pathname}/`,
    },
  ];
}
