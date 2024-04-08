window.auth0.createAuth0Client({
  domain: 'dev-ao71660qsmfxenrv.us.auth0.com',
  clientId: 'uu61j8YM6RirVCEyy6M39vdNQUx8hlW9',
  authorizationParams: {
    redirect_uri: window.location.origin,
  },
}).then(async (auth0Client) => {
  window.auth0Client = auth0Client;

  if (window.location.search.includes('state=')
    && (window.location.search.includes('code=')
      || window.location.search.includes('error='))) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');
  }

  const isAuthenticated = await auth0Client.isAuthenticated();
  document.body.classList.add(isAuthenticated ? 'is-authenticated' : 'is-anonymous');

  if (isAuthenticated) {
    const dashboard = document.querySelector('header a[href="/dashboard"]');
    if (dashboard) {
      const { picture } = await window.auth0Client.getUser();
      dashboard.insertAdjacentHTML('afterbegin', `
          <img alt="Avatar" referrerpolicy="no-referrer" src="${picture}">
      `);

      if (window.location.pathname === '/dashboard') {
        dashboard.classList.add('is-selected');
      }
    }
  }
});
