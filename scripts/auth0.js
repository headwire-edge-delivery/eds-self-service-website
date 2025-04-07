import { getExpirationTime, SCRIPT_API } from './scripts.js';

const unauthenticatedAllowedPaths = {
  '/': true,
  '/templates/wknd-template': true,
  '/templates/sports-template': true,
  '/templates/club-template': true,
  '/feedback': true,
  '/account-deleted': true,
  '/contact-sales': true,
  '/privacy-policy': true,
};

const sessionExpirationDays = 3;

document.body.style.display = 'none';

window.auth0
  .createAuth0Client({
    domain: 'dev-ao71660qsmfxenrv.us.auth0.com',
    clientId: 'uu61j8YM6RirVCEyy6M39vdNQUx8hlW9',
    useRefreshTokens: true,
    cacheLocation: 'localstorage',
    authorizationParams: {
      redirect_uri: `${window.location.origin}/dashboard`,
      audience: 'https://dev-ao71660qsmfxenrv.us.auth0.com/api/v2/',
      prompt: 'login',
    },
  })
  .then(async (auth0Client) => {
    window.auth0Client = auth0Client;

    if (window.location.search.includes('state=') && (window.location.search.includes('code=') || window.location.search.includes('error='))) {
      try {
        await auth0Client.handleRedirectCallback();

        const user = await window.auth0Client.getUser();
        window?.zaraz?.track('new auth session');
        window?.zaraz?.set('user', user.email);

        window.localStorage.sessionExpiration = getExpirationTime(sessionExpirationDays);

        const token = await window.auth0Client.getTokenSilently();
        fetch(`${SCRIPT_API}/welcome`, {
          headers: {
            authorization: `bearer ${token}`,
            'content-type': 'application/json',
          },
          body: '',
          method: 'POST',
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        window.location.href = '/';
      }

      if (window.sessionStorage.redirectTo) {
        const { redirectTo } = window.sessionStorage;
        window.sessionStorage.redirectTo = '';
        window.location.href = redirectTo;
      } else {
        window.history.replaceState({}, document.title, '/dashboard');
      }
    }

    let isAuthenticated = false;
    if (await auth0Client.isAuthenticated()) {
      try {
        await auth0Client.getTokenSilently();
        isAuthenticated = true;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
      }
    }

    document.body.classList.add(isAuthenticated ? 'is-authenticated' : 'is-anonymous');

    if (isAuthenticated) {
      window.auth0Client.getUser().then((user) => {
        if (user?.email?.endsWith('@headwire.com')) {
          document.body.classList.add('is-headwire');
        }
        if (user?.email?.endsWith('@adobe.com')) {
          document.body.classList.add('is-adobe');
        }
        if (user?.email?.toLowerCase() === 'self.service.test.user@gmail.com') {
          document.body.classList.add('is-test-user');
        }
        document.dispatchEvent(new CustomEvent('auth0:authenticated'));
      });

      const sessionInterval = window.setInterval(() => {
        const now = new Date().getTime();
        if (now >= Number(window.localStorage.sessionExpiration)) {
          window.clearInterval(sessionInterval);
          document.body.hidden = true;
          window?.zaraz?.track('logout due to session expiration');
          window?.zaraz?.set('user', undefined);
          delete window.localStorage.sessionExpiration;
          window.auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });
        }
      }, 1000);
    } else if (!unauthenticatedAllowedPaths[window.location.pathname]) {
      window.location.href = '/';
    }

    document.body.style.display = '';
  });
