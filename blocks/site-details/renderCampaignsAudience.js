import {
  daProjectRepo, parseFragment, renderSkeleton, SCRIPT_API,
} from '../../scripts/scripts.js';

export default async function renderCampaignsAudience({ container, nav, renderOptions }) {
  const {
    projectDetails, token, siteSlug,
  } = renderOptions;
  container.innerHTML = renderSkeleton('audience');

  const audienceSheetData = await fetch(`${SCRIPT_API}/${projectDetails.darkAlleyProject ? 'daSheets' : 'sheets'}/${siteSlug}?sheetPath=recipients`, {
    headers: {
      authorization: `bearer ${token}`,
    },
  }).then((res) => res.json()).catch(() => null);

  if (!audienceSheetData) {
    container.innerHTML = '<p>No recipients spreadsheet found</p>';
    return;
  }

  if (!audienceSheetData?.data?.length) {
    container.innerHTML = '<p>No audience found</p>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
            ${audienceSheetData.headers.map((key) => `<th>${key}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${audienceSheetData.data.map((row) => `<tr>
            ${audienceSheetData.headers.map((key) => `<td>${row[key] ? row[key] : ''}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
  `;

  const editButton = parseFragment(`
    <a href="/redirect?url=${projectDetails.darkAlleyProject ? `https://da.live/sheet#/${daProjectRepo}/${siteSlug}/recipients` : `https://docs.google.com/spreadsheets/d/${audienceSheetData.id}/edit`}" class="button primary action" target="_blank">Edit</a>
  `);
  nav.append(editButton);
}
