export const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const transformEmptyRow = (data, headers) => {
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

export const confirmUnsavedChanges = (element) => {
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

const fetchCache = {};
export async function cacheFetch(url, options) {
  if (fetchCache[url] instanceof Promise) {
    const result = await fetchCache[url];
    return result;
  }
  if (fetchCache[url] !== undefined) {
    return fetchCache[url];
  }

  fetchCache[url] = await fetch(url, options).then(async (res) => {
    const output = {
      ok: res.ok,
      status: res.status,
    };
    output.dataText = res.ok ? await res.text() : null;
    return output;
  }).catch(() => null);
  return fetchCache[url];
}
