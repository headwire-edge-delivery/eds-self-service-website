export default async function renderSiteOverview({ container, nav, renderOptions }) {
  const { projectDetails } = renderOptions;
  console.log('projectDetails:', projectDetails);
  container.innerHTML = '<img src="/icons/loading.svg" alt="loading"/>';
}
