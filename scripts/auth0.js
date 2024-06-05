const unauthenticatedAllowedPaths = {
  '/': true,
  '/feedback': true,
  '/contact-sales': true,
  '/privacy-policy': true,
};

document.body.style.display = 'none';

window.auth0.createAuth0Client({
  domain: 'dev-ao71660qsmfxenrv.us.auth0.com',
  clientId: 'uu61j8YM6RirVCEyy6M39vdNQUx8hlW9',
  useRefreshTokens: true,
  cacheLocation: 'localstorage',
  authorizationParams: {
    redirect_uri: `${window.location.origin}/dashboard`,
    audience: 'https://dev-ao71660qsmfxenrv.us.auth0.com/api/v2/',
    prompt: 'login',
  },
}).then(async (auth0Client) => {
  window.auth0Client = auth0Client;

  if (window.location.search.includes('state=')
    && (window.location.search.includes('code=')
      || window.location.search.includes('error='))) {
    await auth0Client.handleRedirectCallback();

    const user = await window.auth0Client.getUser();
    window?.zaraz?.track('new auth session', { url: window.location.href });
    window?.zaraz?.set('user', user.email);

    if (window.sessionStorage.redirectTo) {
      const { redirectTo } = window.sessionStorage;
      window.sessionStorage.redirectTo = '';
      window.location.href = redirectTo;
    } else {
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }

  const isAuthenticated = await auth0Client.isAuthenticated();
  document.body.classList.add(isAuthenticated ? 'is-authenticated' : 'is-anonymous');

  if (isAuthenticated) {
    document.dispatchEvent(new CustomEvent('auth0:authenticated'));
  } else if (!unauthenticatedAllowedPaths[window.location.pathname]) {
    window.location.href = '/';
  }

  document.body.style.display = '';
});
