import { SCRIPT_API } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import renderAnalytics from '../../scripts/analytics.js';

export default async function renderSiteAnalytics({ container, nav, renderOptions }) {
  container.innerHTML = renderSkeleton('site-analytics');

  const {
    token, siteSlug,
  } = renderOptions;

  // Load web analytics
  const loadWebAnalytics = (interval) => Promise.all(
    [
      `${SCRIPT_API}/monitoring/${siteSlug}?period=${interval}`,
      `${SCRIPT_API}/cww/${siteSlug}?period=${interval}`,
    ].map((url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json()).catch(() => null)),
  );

  const analytics = await loadWebAnalytics('1d');
  await renderAnalytics({
    analytics,
    container,
    nav,
    loadWebAnalytics,
  });
}
