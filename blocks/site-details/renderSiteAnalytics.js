import { OOPS, SCRIPT_API } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import renderAnalytics from '../../scripts/analytics.js';

export default async function renderSiteAnalytics({ container, nav, renderOptions }) {
  container.innerHTML = renderSkeleton('site-analytics');

  const {
    token, siteSlug,
  } = renderOptions;

  // Load web analytics
  const loadWebAnalytics = async (interval) => Promise.all(
    [
      `${SCRIPT_API}/monitoring/${siteSlug}?period=${interval}`,
      `${SCRIPT_API}/cww/${siteSlug}?period=${interval}`,
    ].map(async (url) => {
      const req = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!req?.ok) {
        throw new Error(req?.status || OOPS);
      }
      return req.json();
    }),
  );

  const analytics = await loadWebAnalytics('1d');
  await renderAnalytics({
    analytics,
    container,
    nav,
    loadWebAnalytics,
  });
}
