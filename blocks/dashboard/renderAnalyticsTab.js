import {
  OOPS, renderSkeleton, SCRIPT_API, waitForAuthenticated,
} from '../../scripts/scripts.js';
import renderAnalytics from '../../scripts/analytics.js';

export default async function renderAnalyticsTab({ container, nav }) {
  container.innerHTML = `
    <div class="analytics">
      ${renderSkeleton('site-analytics')}
    </div>
  `;
  await waitForAuthenticated();
  const token = await window.auth0Client.getTokenSilently();

  // Load web analytics
  const loadWebAnalytics = async (interval) => {
    try {
      const req = await fetch(`${SCRIPT_API}/monitoring/admin?period=${interval}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!req?.ok) {
        throw new Error();
      }
      return [await req.json()];
    } catch (e) {
      window.alertDialog(OOPS);
    }

    return false;
  };

  // MARK: analytics
  loadWebAnalytics('1d').then((analytics) => {
    renderAnalytics({
      analytics,
      container: container.querySelector('.analytics'),
      nav,
      loadWebAnalytics,
    });
  });
}
