import { OOPS, SCRIPT_API, defaultBranch, parseFragment, projectRepo } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { isSame, transformEmptyRow, confirmUnsavedChanges } from '../../scripts/utils.js';
import { readQueryParams, removeQueryParams, writeQueryParams } from '../../libs/queryParams/queryParams.js';
import { showToast, showErrorToast } from '../../scripts/toast.js';
import { createDialog } from '../../scripts/dialogs.js';

const protectedPaths = ['/query-index', '/search-index'];

// MARK: render
export default async function renderSiteSpreadsheets({ container, renderOptions }) {
  container.innerHTML = renderSkeleton('sheets');

  const { siteSlug, projectDetails } = renderOptions;
  const { customLiveUrl, customPreviewUrl } = projectDetails;

  const token = await window.auth0Client.getTokenSilently();

  const sheetIndexData = await fetch(`${SCRIPT_API}/sheetsIndex/${siteSlug}`)
    .then((res) => res.json())
    .then((data) => {
      if (data?.data) {
        // Add locked property to each item
        data.data = data.data.map((item) => ({
          ...item,
          protected: protectedPaths.some((path) => item.path === path),
        }));

        // Sort after modifying the data
        data.data.sort((a, b) => a.name.localeCompare(b.name));
      }
      return data.data ?? undefined;
    })
    .catch(() => null);

  if (!sheetIndexData.length) {
    container.innerHTML = `<p>${OOPS}</p>`;
    return;
  }

  // TODO: on selected instead
  await Promise.all(
    sheetIndexData.map(async (sheetIndex) => {
      const sheetTitles = await fetch(`${SCRIPT_API}/sheetTitles/${siteSlug}/${sheetIndex.id}`, { headers: { authorization: `bearer ${token}` } })
        .then((res) => res.json())
        .catch(() => null);
      sheetIndex.ranges = sheetTitles || [];
    }),
  );

  const tabsAside = container.closest('.tabs-content').querySelector('aside.tabs-aside');
  const queryParams = readQueryParams();
  let selectedSheet = sheetIndexData.find((s) => s.path === queryParams.path);
  if (!selectedSheet) {
    removeQueryParams(['path']);
    [selectedSheet] = sheetIndexData;
  }
  let sheetID = selectedSheet.id;
  let sheetName = selectedSheet.name;
  if (!selectedSheet.ranges?.includes(queryParams.sheet)) removeQueryParams(['sheet']);
  let selectedRange = selectedSheet.ranges?.includes(queryParams.sheet) ? queryParams.sheet : selectedSheet.ranges?.[0];
  let isProtected = selectedSheet.protected;
  let isLocked = true;
  let contentChanged = () => false;

  const fetchAndRenderSheet = async (selected) => {
    container.inert = true;
    selectedSheet = selected;
    sheetID = selectedSheet.id;
    sheetName = selectedSheet.name;
    const sheetButtonsWrapper = container.querySelector('#sheet-buttons');
    sheetButtonsWrapper.innerHTML = '';
    selectedSheet.ranges.forEach((range) => {
      const button = document.createElement('button');
      button.classList.add('button', 'action', selectedRange === range ? 'active' : 'secondary');
      button.dataset.range = range;
      button.innerText = range;
      sheetButtonsWrapper.append(button);
    });
    const auth = { authorization: `bearer ${token}` };
    const sheet = await fetch(`${SCRIPT_API}/sheetData/${siteSlug}/${sheetID}?range=${encodeURIComponent(selectedRange)}`, {
      headers: { ...auth, 'content-type': 'application/json' },
    })
      .then((res) => res.json())
      .catch(() => null);

    if (!sheet) {
      container.innerHTML = `<p>${OOPS}</p>`;
      return;
    }

    const sheetTable = container.querySelector('.sheet');

    const headers = sheet[0] || [];
    let sheetData = transformEmptyRow(sheet.slice(1), headers);
    let originalSheetData = structuredClone(sheetData);
    contentChanged = () => !isSame(sheetData, originalSheetData);
    const discardButton = container.querySelector('#discard-changes');

    const setButtonText = () => {
      const table = container.querySelector('.sheet');
      const currentMode = table.getAttribute('data-editMode');
      const editButton = container.querySelector('#edit-sheet');
      // makes sure, that the existing event listeners are removed before adding a new one
      const previewButton = container.querySelector('#preview-sheet');
      const publishButton = container.querySelector('#publish-sheet');
      previewButton.replaceWith(previewButton.cloneNode(true));
      publishButton.replaceWith(publishButton.cloneNode(true));
      const newPreviewButton = container.querySelector('#preview-sheet');
      newPreviewButton.innerText = 'Preview';
      const newPublishButton = container.querySelector('#publish-sheet');
      newPublishButton.innerText = 'Publish';
      const previewAndPublishButtons = async () => {
        const site = siteSlug;
        const { path } = selectedSheet;
        const publishPreviewURL = `https://admin.hlx.page/preview/${projectRepo}/${site}/${defaultBranch}${path}.json`;
        const post = async (previewOrPublish = 'Preview', url = publishPreviewURL) => {
          const showButtonLoading = (bool = true) => {
            if (previewOrPublish === 'Preview') {
              newPreviewButton.classList.toggle('loading', bool);
              newPreviewButton.disabled = bool;
            } else if (previewOrPublish === 'Publish' || previewOrPublish === 'PreviewAndPublish') {
              newPublishButton.classList.toggle('loading', bool);
              newPreviewButton.disabled = bool;
              newPublishButton.disabled = bool;
            }
          };
          showButtonLoading(true);
          try {
            const response = await fetch(url, { method: 'POST' });
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            showButtonLoading(false);
            if (previewOrPublish === 'Preview' || previewOrPublish === 'PreviewAndPublish') {
              showToast(`Preview successfully updated: <a href="${customPreviewUrl + path}.json" target="_blank">See the changes on your Preview site</a>`);
            }
            if (previewOrPublish === 'Publish') {
              showToast(`Publish successfully updated: <a href="${customPreviewUrl + path}.json" target="_blank">See the changes on your Live site</a>`);
            }
            return response;
          } catch (error) {
            const siteName = previewOrPublish === 'PreviewAndPublish' ? 'site' : `${previewOrPublish} site`;
            showErrorToast(`Something went wrong while updating the ${siteName}. Try again in a moment. ${error}`);
            showButtonLoading(false);
          }
        };

        newPreviewButton.addEventListener('click', async () => {
          window.zaraz?.track('Sheets-tab preview click');
          await post('Preview');
        });

        newPublishButton.addEventListener('click', async () => {
          window.zaraz?.track('Sheets-tab publish click');
          const publishUrl = `https://admin.hlx.page/live/${projectRepo}/${site}/${defaultBranch}${path}.json`;
          const previewResponse = await post('PreviewAndPublish');
          if (previewResponse?.ok) {
            await post('Publish', publishUrl);
          }
        });
      };

      if (isLocked && isProtected) {
        editButton.textContent = 'Edit';
        editButton.disabled = true;
        discardButton.hidden = true;
        newPublishButton.disabled = true;
        newPreviewButton.disabled = true;
      } else if (currentMode === 'false') {
        editButton.textContent = 'Edit';
        newPublishButton.disabled = false;
        newPreviewButton.disabled = false;
      } else if (contentChanged()) {
        editButton.textContent = 'Save';
        discardButton.hidden = false;
        newPublishButton.disabled = true;
        newPreviewButton.disabled = true;
        tabsAside.dataset.unsavedChanges = 'true';
      } else {
        editButton.textContent = 'Back';
        discardButton.hidden = true;
        newPublishButton.disabled = false;
        newPreviewButton.disabled = false;
        tabsAside.dataset.unsavedChanges = 'false';
      }
      previewAndPublishButtons();
    };

    const generateEmptyRow = (tableData) => {
      const newRowIndex = tableData.length;
      tableData.push(headers.map(() => ''));
      const tr = document.createElement('tr');
      headers.forEach((column, colIndex) => {
        const td = document.createElement('td');
        const wrapperDiv = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = column;
        input.dataset.row = newRowIndex;
        input.dataset.col = colIndex;
        wrapperDiv.append(input);
        td.append(wrapperDiv);
        tr.append(td);
      });
      tr.insertAdjacentHTML('beforeend', '<td class="delete-row"><button class="button action secondary destructive">Remove</button></td>');
      return tr;
    };

    const sheetEditMode = () => sheetTable.getAttribute('data-editMode') === 'true';

    const generateSheetTable = (tableData = sheetData) => {
      const spreadsheetTitle = container.querySelector('.spreadsheet-title');
      spreadsheetTitle.inert = false; // reset
      const removeRow = (event) => {
        const button = event.target;
        if (button.tagName === 'BUTTON' && button.textContent === 'Remove') {
          const row = parseInt(button.dataset.row, 10);
          if (!Number.isNaN(row)) {
            tableData.splice(row, 1);
            generateSheetTable(tableData);
          }
        }
      };
      sheetTable.innerHTML = '';

      // populating without innerHTML to avoid XSS
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      sheetTable.append(thead, tbody);

      const headerRow = document.createElement('tr');
      thead.append(headerRow);
      if (tableData.length < 1) {
        headerRow.innerHTML = '<td>No data</td>';
        spreadsheetTitle.inert = true; // disable controls if no data
        return;
      }

      for (const item of headers) {
        const th = document.createElement('th');
        th.textContent = item;
        headerRow.append(th);
      }
      // extra column for the remove button
      if (sheetEditMode()) {
        headerRow.append(document.createElement('th'));
      }

      for (let rowIndex = 0; rowIndex < tableData.length; rowIndex += 1) {
        const tr = document.createElement('tr');
        const row = tableData[rowIndex];

        for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
          const item = row[colIndex];
          const td = document.createElement('td');

          if (sheetEditMode()) {
            const inputWrapper = document.createElement('div');
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = headers[colIndex];
            input.value = item;
            input.dataset.row = rowIndex;
            input.dataset.col = colIndex;
            inputWrapper.append(input);
            td.append(inputWrapper);
          } else {
            const span = document.createElement('span');
            span.textContent = item;
            td.append(span);
          }

          tr.append(td);
        }
        if (sheetEditMode()) {
          tr.insertAdjacentHTML('beforeend', `<td class="delete-row"><button data-row="${rowIndex}" class="button action secondary destructive">Remove</button></td>`);
        }
        tbody.append(tr);
      }

      if (sheetEditMode()) {
        // Add New Row button
        const addRowContainer = container.querySelector('#add-row-container');
        if (addRowContainer) addRowContainer.remove(); // Clean up the previous button
        sheetTable.insertAdjacentHTML('afterend', '<div id="add-row-container"><button id="add-row" class="button action">New Row</button></div>');

        container.querySelector('#add-row').addEventListener('click', () => {
          sheetTable.append(generateEmptyRow(tableData));
          generateSheetTable(tableData);
        });

        // Event delegation for input changes
        sheetTable.addEventListener('input', (event) => {
          const input = event.target;
          if (input.tagName === 'INPUT') {
            const row = parseInt(input.dataset.row, 10);
            const col = parseInt(input.dataset.col, 10);

            if (!Number.isNaN(row) && !Number.isNaN(col)) {
              while (tableData.length <= row) tableData.push([]);
              tableData[row][col] = input.value;
              setButtonText();
            }
          }
        });
        sheetTable.querySelectorAll('button').forEach((button) => {
          button.removeEventListener('click', removeRow);
          button.addEventListener('click', removeRow);
        });
      } else {
        const addRowButton = container.querySelector('#add-row-container');
        if (addRowButton) addRowButton.remove();
      }
      setButtonText();
    };

    discardButton.addEventListener('click', () => {
      window.zaraz?.track('Sheets-tab discord click');
      sheetData = structuredClone(originalSheetData);
      generateSheetTable();
    });

    const sheetButtons = container.querySelector('#sheet-buttons');

    // Removes the existing event listeners before adding a new one
    const editButton = container.querySelector('#edit-sheet');
    editButton.replaceWith(editButton.cloneNode(true));
    const newEditButton = container.querySelector('#edit-sheet');
    newEditButton.addEventListener('click', async () => {
      const table = container.querySelector('.sheet');
      const currentMode = table.getAttribute('data-editMode');
      const disableInputs = (bool = true) => {
        table.querySelectorAll('input').forEach((input) => {
          input.disabled = bool;
          container.querySelector('#sheet-select').disabled = bool;
          discardButton.disabled = bool;
          sheetButtons.querySelectorAll('button').forEach((button) => {
            button.disabled = bool;
          });
        });
      };
      if (newEditButton.textContent === 'Save') {
        window.zaraz?.track('Sheets-tab save click');
        disableInputs();
        newEditButton.classList.add('loading');
        const res = await fetch(`${SCRIPT_API}/sheetData/${siteSlug}/${sheetID}?range=${encodeURIComponent(selectedRange)}`, {
          method: 'PUT',
          headers: {
            ...auth,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([headers, ...sheetData]),
        }).catch(() => null);
        if (!res.ok) {
          showErrorToast('We couldn’t save your changes. Please try again.');
        } else {
          originalSheetData = structuredClone(sheetData);
          showToast('Sheet saved.');
        }
        newEditButton.classList.remove('loading');
        disableInputs(false);
      } else if (currentMode === 'false') {
        window.zaraz?.track('Sheets-tab edit click');
        table.setAttribute('data-editMode', 'true');
      } else {
        window.zaraz?.track('Sheets-tab discard (back) click');
        table.setAttribute('data-editMode', 'false');
        sheetData = structuredClone(originalSheetData);
      }
      generateSheetTable();
    });

    sheetButtons.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', async (event) => {
        window.zaraz?.track('Sheets-tab change sheet (range)');
        if (!confirmUnsavedChanges(tabsAside)) {
          return;
        }
        selectedRange = event.target.dataset.range;
        container.querySelector('.sheet').innerHTML = renderSkeleton('sheetsTable');
        fetchAndRenderSheet(selectedSheet);
        writeQueryParams({ sheet: selectedRange });
      });
    });

    const lockButton = container.querySelector('#lock-button');
    lockButton.replaceWith(lockButton.cloneNode(true));
    const newLockButton = container.querySelector('#lock-button');
    newLockButton.addEventListener('click', () => {
      if (!isProtected || !confirmUnsavedChanges(tabsAside)) {
        return;
      }
      const handleLock = () => {
        sheetData = structuredClone(originalSheetData);
        isLocked = !isLocked;
        container.querySelector('#sheet-table').setAttribute('data-editMode', 'false');
        container.querySelector('#lock-svg').src = `/icons/${isLocked ? 'locked' : 'unlocked'}.svg`;
        container.querySelector('#edit-sheet').disabled = isLocked;
        container.querySelector('#preview-sheet').disabled = isLocked;
        container.querySelector('#publish-sheet').disabled = isLocked;
        generateSheetTable();
      };

      if (isLocked) {
        const unlockButton = parseFragment('<button class="button action destructive" id="lock-unlock">Unlock (not recommended)</button>');
        const cancelUnlockButton = parseFragment('<button class="button action primary" id="lock-discard">Discard</button>');

        const lockDialog = createDialog(
          `<div id="protected-sheet-info">
          <p>You are in the process of removing the protection, which allows you to edit the spreadsheet.</p>
          <strong>We recommend that you do not do this, as this is not usually necessary.</strong>
          <p>Please only proceed if you know what you are doing.</p></div>`,
          [unlockButton, cancelUnlockButton],
          { open: false },
        );

        unlockButton.onclick = () => {
          handleLock();
          lockDialog.close();
          window.zaraz?.track('Sheets-tab unlocking sheet unlock click');
        };

        cancelUnlockButton.onclick = () => {
          lockDialog.close();
          window.zaraz?.track('Sheets-tab unlocking sheet cancel click');
        };

        lockDialog.showModal();
      } else {
        handleLock();
      }
    });

    generateSheetTable();
    container.inert = false;
  };

  // Initial render
  container.innerHTML = `
  <div id="spreadsheets-overview">
  <div id="spreadsheets-selector">
  <label for="sheet-select">Choose a Spreadsheet to edit:</label>
  <select name="sheets" id="sheet-select">
  </select>
  <div id="sheet-buttons"></div>
  </div>
  <div class="spreadsheet-title">
    <div style="display: flex;">
      <h2></h2>
      <button id="lock-button" class="button transparent" ${!isProtected && 'disabled'}><img src="/icons/${
        isProtected && isLocked ? 'locked' : 'unlocked'
      }.svg" alt="lock icon" id="lock-svg" /></button>
    </div>
    <button id="edit-sheet" class="button action primary" ${isProtected && 'disabled'}>Edit</button>
    <button id="discard-changes" class="button action" hidden>Discard</button>
    <a class="button action secondary" href="https://docs.google.com/spreadsheets/d/${sheetID}" id="open-sheet" target="_blank">Open</a>
    <button id="preview-sheet" class="button action secondary" ${isProtected && 'disabled'}>Preview</button>
    <button id="publish-sheet" class="button action secondary" ${isProtected && 'disabled'}>Publish</button>
    <button id="preview-publish-info-button" class="button transparent"><img src="/icons/help-dark.svg" alt="hint icon" /></button></div>
  <div class="spreadsheet-table-container"><table id="sheet-table" class="sheet" data-editMode="false"></table></div>
  </div>`;
  const previewPublishInfoButton = container.querySelector('#preview-publish-info-button');
  previewPublishInfoButton.addEventListener('click', () => {
    window.zaraz?.track('Sheets-tab preview/publish info-dialog click');
    createDialog(
      `<div id="preview-publish-info">
      <p>The "Preview" will update the sheet for the Preview site and "Publish" will update it for the Preview and Live site.</p></div>`,
      [
        parseFragment(`<a href="${customPreviewUrl}" target="_blank" class="button action secondary">Open your Preview site</a>`),
        parseFragment(`<a href="${customLiveUrl}" target="_blank" class="button action secondary">Open your Live site</a>`),
      ],
    );
  });

  const sheetTitle = container.querySelector('.spreadsheet-title h2');
  sheetTitle.textContent = sheetName;

  const sheetSelect = container.querySelector('#sheet-select');
  // no innerHTML to prevent XSS
  sheetIndexData.forEach((sheet) => {
    const option = document.createElement('option');
    option.value = sheet.id;
    option.textContent = sheet.name;
    sheetSelect.append(option);
  });

  const sheetButtons = container.querySelector('#sheet-buttons');
  // no innerHTML to prevent XSS
  selectedSheet.ranges.forEach((range) => {
    const button = document.createElement('button');
    button.classList.add('button', 'action');
    button.textContent = range;
    button.dataset.range = range;
    sheetButtons.append(button);
  });

  sheetSelect.value = sheetID;
  sheetSelect.addEventListener('change', async (event) => {
    window.zaraz?.track('Sheets-tab selected sheet change');
    if (!confirmUnsavedChanges(tabsAside)) {
      sheetSelect.value = sheetID;
      return;
    }
    sheetID = event.target.value;
    [selectedSheet] = sheetIndexData.filter((s) => s.id === sheetID);
    [selectedRange] = selectedSheet.ranges;
    isProtected = selectedSheet.protected;
    isLocked = isProtected;
    container.querySelector('#edit-sheet').disabled = isLocked;
    const lockButton = container.querySelector('#lock-button');
    if (isProtected && lockButton) {
      container.querySelector('.sheet').setAttribute('data-editMode', 'false');
      container.querySelector('#lock-svg').src = '/icons/locked.svg';
      lockButton.removeAttribute('disabled');
    } else {
      lockButton?.setAttribute('disabled', '');
    }
    writeQueryParams({ path: selectedSheet.path, sheet: selectedRange });
    container.querySelector('.spreadsheet-title h2').textContent = selectedSheet.name;
    container.querySelector('.sheet').innerHTML = renderSkeleton('sheetsTable');
    container.querySelector('#open-sheet').href = `https://docs.google.com/spreadsheets/d/${sheetID}`;
    await fetchAndRenderSheet(selectedSheet);
  });

  // Initial fetch and render
  await fetchAndRenderSheet(selectedSheet);

  // "Ctrl + S" to trigger the Edit/Save/Back button
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      container.querySelector('#edit-sheet').click();
    }
  });
}
