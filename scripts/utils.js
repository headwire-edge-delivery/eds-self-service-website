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
      window.zaraz?.track('Discarding unsave changes');
      return true;
    }
    return false;
  }
  return true;
};

const fetchCache = {};
/**
 * Fetches data from the given URL with caching and returns the parsed result.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {Object} fetchOptions - Options to use for the fetch request.
 * @param {string} [parseMethod='text'] - The method to parse the response (e.g., 'text', 'json').
 * @returns {Promise<Object|null>} The response object with dataText or null if an error occurs.
 */
export async function cacheFetch(url, fetchOptions, parseMethod = 'text', forceRefetch = false) {
  if (!forceRefetch) {
    if (fetchCache[url] instanceof Promise) {
      const result = await fetchCache[url];
      return result;
    }
    if (fetchCache[url] !== undefined) {
      return fetchCache[url];
    }
  }

  fetchCache[url] = await fetch(url, fetchOptions)
    .then(async (res) => {
      const output = {
        ok: res.ok,
        status: res.status,
      };
      try {
        output.dataText = res.ok ? await res[parseMethod]() : null;
      } catch {
        output.dataText = null;
      }
      return output;
    })
    .catch(() => null);

  return fetchCache[url];
}

const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
export function parseAcceptLanguage(str) {
  try {
    if (!str || str === '*' || str === '*/*') return null;
    return langNames.of(str.split(',')[0].split(';')[0]);
  } catch {
    return null;
  }
}

// header: sec-ch-ua
export function parseBrowser(str) {
  if (!str) return null;

  const browserParts = str.split(',');
  try {
    let output = '';
    for (const browserStr of browserParts) {
      // matches semicolon that is not within quotes
      const browserName = browserStr
        .match(/(?:[^";]|"(?:\\.|[^"\\])*")+/g)[0]
        .trim()
        .replaceAll('"', '');

      if (/not[\s\S]*a[\s\S]*brand/i.test(browserName)) continue;
      if (/chromium/i.test(browserName)) {
        output = browserName;
        continue;
      }

      if (browserName) {
        output = browserName;
        break;
      }
    }

    return output;
  } catch {
    return null;
  }
}

export const generateThumbnails = (sitesList) => {
  sitesList.querySelectorAll('.project-thumbnail').forEach((thumbnail) => {
    fetch(thumbnail.dataset.src)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        return false;
      })
      .then((res) => {
        if (res) {
          let src = res.split('\n').find((line) => line.trim().startsWith('<meta property="og:image" content="'));
          if (src) {
            src = src.replace('<meta property="og:image" content="', '').replace('">', '');
            thumbnail.innerHTML = `<img src="${src}" alt="thumbnail" loading="lazy"/>`;
          }
        }
      })
      .catch(() => null);
  });
};
