const unauthenticatedAllowedPaths = {
  '/': true,
  '/feedback': true,
  '/contact-sales': true,
};

window.auth0.createAuth0Client({
  domain: 'dev-ao71660qsmfxenrv.us.auth0.com',
  clientId: 'uu61j8YM6RirVCEyy6M39vdNQUx8hlW9',
  useRefreshTokens: true,
  cacheLocation: 'localstorage',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'https://dev-ao71660qsmfxenrv.us.auth0.com/api/v2/',
    prompt: 'login',
  },
}).then(async (auth0Client) => {
  window.auth0Client = auth0Client;

  if (window.location.search.includes('state=')
    && (window.location.search.includes('code=')
      || window.location.search.includes('error='))) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');

    // Restore session hash
    if (window.sessionStorage.hash) {
      window.location.hash = window.sessionStorage.hash;
      window.sessionStorage.hash = '';
    }
  }

  const isAuthenticated = await auth0Client.isAuthenticated();
  document.body.classList.add(isAuthenticated ? 'is-authenticated' : 'is-anonymous');

  if (isAuthenticated) {
    if (window.location.pathname === '/') {
      if (!document.referrer || new URL(document.referrer).origin !== window.location.origin) {
        window.location.replace('/dashboard');
      }
    }
    document.dispatchEvent(new CustomEvent('auth0:authenticated'));
  } else if (!unauthenticatedAllowedPaths[window.location.pathname]) {
    window.location.href = '/';
  }
});
