import {
  SCRIPT_API, waitForAuthenticated,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
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
  const loadWebAnalytics = (interval) => fetch(`${SCRIPT_API}/monitoring/admin?period=${interval}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.json())
    .then((data) => [data])
    .catch(() => [null]);

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
