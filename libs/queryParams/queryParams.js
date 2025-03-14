const readQueryParams = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const params = {};
  Array.from(queryParams.entries()).reduce((acc, [key, value]) => {
    acc[key] = decodeURIComponent(value);
    return acc;
  }, params);
  return params;
};

const writeQueryParams = (params, overwrite = false) => {
  const queryParams = overwrite
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);

  Object.entries(params).forEach(([key, value]) => {
    queryParams.set(key, encodeURIComponent(value));
  });

  const newUrl = `${window.location.origin}${window.location.pathname}?${queryParams.toString()}`;

  window.history.replaceState({}, '', newUrl);
};

const removeQueryParams = (params) => {
  const queryParams = new URLSearchParams(window.location.search);
  let newUrl;

  if (params) {
    params.forEach((key) => {
      queryParams.delete(key);
    });
  }

  if (queryParams.toString()) {
    newUrl = `${window.location.origin}${window.location.pathname}?${queryParams.toString()}`;
  } else {
    newUrl = `${window.location.origin}${window.location.pathname}`;
  }

  window.history.replaceState({}, '', newUrl);
};

export { readQueryParams, writeQueryParams, removeQueryParams };
