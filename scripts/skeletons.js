import { loadCSS } from './aem.js';

loadCSS(`${window.hlx.codeBasePath}/styles/skeletons.css`);

/**
 * Renders an animated loading skeleton for a given type
 * @param {String} type
 */
export default function renderSkeleton(type) {
  if (type === 'site-overview') {
    return `
      <div aria-label="loading">
        <div style="display: flex;gap: 32px;">
            <div style="display: flex;flex-wrap: wrap;gap: 32px;align-items: stretch;justify-content: center;">
                ${[...new Array(4)].map(() => '<div style="height: 100px;flex:1;min-width: 200px;max-width: 300px;width: 100%;" class="skeleton"></div>').join('')}
            </div>
            <div style="min-width: 40%;max-width: 40%;" class="skeleton"></div>
        </div>
      </div>
    `;
  }
  if (type === 'account') {
    return `
      <div aria-label="loading">
        <div style="margin-bottom: 32px; height: 80px; display: flex;flex-wrap: wrap;gap: 32px;align-items: stretch;justify-content: center;">
            ${[...new Array(3).map(() => '<div class="skeleton" style="width: 300px;"></div>').join('')]}
        </div>
      </div>
    `;
  }
  if (type === 'tracking') {
    const rows = [...Array(5)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 34px;"></div></td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 150px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'sites') {
    const cards = [...Array(6)].map(() => '<div class="skeleton" style="width: 286px; height: 376px;"></div>').join('');

    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 300px; height: 24px;margin-top: 32px;"></div>
        <div style="display: grid;grid-template-columns: repeat(auto-fill, 286px);gap: 48px;margin-top: 24px;">
            ${cards}
        </div>
      </div>
    `;
  }
  if (type === 'pages') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 200px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 120px; height: 30px;"></div></td>
        <td>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
                <div class="skeleton" style="width: 80px; height: 34px;"></div>
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
            </div>
        </td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 100px; height: 24px;margin-bottom: 24px;"></div>
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'site-analytics') {
    const boxes = [...Array(3)].map(() => '<div class="skeleton" style="height: 80px; width: 300px"></div>').join('');

    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 100px; height: 24px;margin-bottom: 24px;"></div>
        <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: center">
            ${boxes}
        </div>
        <div class="skeleton" style="height: 400px; margin-block: 32px;"></div>
      </div>
    `;
  }
  if (type === 'campaigns') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
                <div class="skeleton" style="width: 50px; height: 34px;"></div>
                <div class="skeleton" style="width: 70px; height: 34px;"></div>
            </div>
        </td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <div style="display: flex; gap: 8px; margin-bottom: 24px;">
          <div class="skeleton" style="width: 100px; height: 34px;"></div>
          <div class="skeleton" style="width: 150px; height: 34px;"></div>
        </div>
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'audience') {
    const rows = [...Array(10)].map(() => `
      <tr class="skeleton-row">
        <td><div class="skeleton" style="width: 200px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <div class="skeleton" style="width: 80px; height: 34px;"></div>
                <div class="skeleton" style="width: 100px; height: 34px;"></div>
            </div>
        </td>
      </tr>
    `).join('');

    return `
      <div aria-label="loading">
        <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
      </div>
    `;
  }
  if (type === 'campaign-analytics') {
    const boxes = [...Array(5)].map(() => '<div class="skeleton" style="height: 80px; width: 300px"></div>').join('');

    return `
      <div aria-label="loading">
        <div style="display: flex; gap: 8px; margin-bottom: 24px;">
          <div class="skeleton" style="width: 100px; height: 34px;"></div>
          <div class="skeleton" style="width: 150px; height: 34px;"></div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: center">
            ${boxes}
        </div>
        
        <div class="skeleton" style="width: 150px; height: 24px;margin-top: 40px;margin-bottom: 24px;"></div>
        <div class="skeleton" style="height: 45px;margin-bottom: 16px;"></div>
        
        ${renderSkeleton('campaign-tracking')}
      </div>
    `;
  }
  if (type === 'campaign-tracking') {
    const rows = [...Array(5)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `).join('');

    return `
      <table>
            <thead>
                <tr>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 50px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 80px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 120px;height: 24px;"></div></th>
                    <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
  }
  if (type === 'settings') {
    return `
      <div aria-label="loading">
        <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 24px;"></div>
        <div class="skeleton" style="width: 150px; height: 20px;margin-bottom: 12px;"></div>
        <div style="display: flex; gap: 8px;">
            <div class="skeleton" style="width: 580px; height: 34px;"></div>
            <div class="skeleton" style="width: 50px; height: 34px;"></div>
        </div>
        
        <div class="skeleton" style="width: 200px; height: 24px;margin-bottom: 24px;margin-top: 40px;"></div>
        <div class="skeleton" style="width: 400px; height: 20px;margin-bottom: 12px;"></div>
        <div style="display: flex; gap: 8px;">
            <div class="skeleton" style="width: 530px; height: 34px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
        </div>
        
        <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 24px;margin-top: 40px;"></div>
        <div class="skeleton" style="width: 200px; height: 20px;margin-bottom: 12px;"></div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <div class="skeleton" style="width: 48px; height: 48px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
        </div>
        
        <div class="skeleton" style="width: 100px; height: 24px;margin-bottom: 24px;margin-top: 40px;"></div>
        <div class="skeleton" style="width: 150px; height: 34px;margin-bottom: 12px;"></div>
      </div>  
    `;
  }
  if (type === 'email-composer') {
    return `
      <div style="flex: 1; height: 100%; min-height: calc(100vh - 200px)" class="skeleton" aria-label="loading"></div>
      <div style="max-width: 50%; min-width: 50%;" aria-label="loading">
          <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 16px;"></div>
          <div class="skeleton" style="height: 34px;"></div>
          <div class="skeleton" style="width: 150px; height: 24px;margin-top: 48px;margin-bottom: 16px;"></div>
          <table>
              ${renderSkeleton('recipients')}
          </table>
      </div> 
    `;
  }
  if (type === 'recipients') {
    const rows = [...Array(10)].map(() => `
      <tr>
        <td><div class="skeleton" style="width: 34px; height: 34px;"></div></td>
        <td><div class="skeleton" style="width: 150px; height: 30px;"></div></td>
        <td><div class="skeleton" style="width: 100px; height: 30px;"></div></td>
        <td>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px;"></div>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <thead>
          <tr>
              <th><div class="skeleton" style="width: 34px;height: 34px;"></div></th>
              <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
              <th><div class="skeleton" style="width: 100px;height: 24px;"></div></th>
              <th</th>
          </tr>
      </thead>
      <tbody>
          ${rows}
      </tbody>
    `;
  }
  if (type === 'theme-editor') {
    const pickers = [...Array(5)].map(() => `
        <div class="skeleton" style="width: 120px; height: 20px;margin-bottom: 14px;margin-top: 24px;"></div>
        <div class="skeleton" style="height: 34px;"></div>`).join('');

    return `
      <div style="flex: 1; min-height: calc(100vh - 200px);" class="skeleton" aria-label="loading"></div>
      <div style="max-width: 30%; min-width: 30%; height: calc(100vh - 200px);" aria-label="loading">
          <div class="skeleton" style="width: 150px; height: 24px;margin-bottom: 24px;"></div>
          <div class="skeleton" style="width: 100px; height: 20px;margin-block: 14px;"></div>
          ${pickers}
      </div> 
    `;
  }
  if (type === 'theme-editor-preview') {
    return '<div class="skeleton skeleton-theme-editor-iframe"></div>';
  }

  return '';
}
