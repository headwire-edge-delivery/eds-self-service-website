const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const transformEmptyRow = (data, headers) => {
  data.map((row) => {
    if (row.length < headers.length) {
      for (let i = row.length; i < headers.length; i += 1) {
        row.push('');
      }
    }
    return null;
  });
  return data;
};

const confirmUnsavedChanges = (element) => {
  if (element.dataset.unsavedChanges === 'true') {
    // eslint-disable-next-line no-alert
    const confirmLeave = window.confirm('Leave site?\nChanges you made may not be saved.');
    if (confirmLeave) {
      element.dataset.unsavedChanges = 'false';
      return true;
    }
    return false;
  }
  return true;
};

export { isSame, transformEmptyRow, confirmUnsavedChanges };
