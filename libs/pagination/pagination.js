import { parseFragment } from "../../scripts/scripts.js";
import { writeQueryParams } from "../queryParams/queryParams.js";

const loadCssFile = (path) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = path;
  // checks if the file is already loaded
  if (document.querySelector(`link[href="${path}"]`)) {
    return;
  }
  document.head.appendChild(link);
};
/**
 * Create paginator numbered/next/prev buttons.
 * If contentRendererFn callback function is provided, button clicks will be handled by paginator and then callback will be called.
 * 
 * @param {number} quantity - The total number of items to paginate.
 * @param {number} limit - The number of items per page.
 * @param {number} page - The current page number.
 * @param {Object} queryNames - An object defining the query parameter names to update with button presses.
 * @param {Function} contentRerenderFn - A callback function to rerender content for the new page, it will receive { quantity, limit, page, pages, rangeStart, rangeEnd } as its argument.
 * @returns {HTMLElement} - The pagination element or a hidden div if only one page is available.
 */

const paginator = (quantity, limit, page, queryNames, contentRerenderFn) => {
  loadCssFile('/libs/pagination/pagination.css');
  const pages = Math.ceil(quantity / limit);
  if (pages <= 1) {
    const noEl = document.createElement('div')
    noEl.style.display = 'none'
    return noEl;
  }

  let currentPage = page;
  let startPage;
  let endPage;
  let showFirstEllipsis;
  let showSecondEllipsis;
  let pageFilter;

  const calculate = () => {
    startPage = Math.max(currentPage - 2, 1);
    endPage = Math.min(currentPage + 3, pages);
    showFirstEllipsis = startPage > 3 && currentPage > 5;
    showSecondEllipsis = endPage < pages - 2;
    pageFilter = (p) => (p >= startPage && p <= endPage)
        || (currentPage <= 5 && p <= currentPage);
  };
  calculate();

  if (currentPage > pages) {
    currentPage = 1;
    calculate();
  }
  
  const paginationContainer = document.createElement('div')
  paginationContainer.classList.add('pagination-container')

  const renderPaginator = (pageNr) => {
    currentPage = pageNr
    calculate()
    paginationContainer.dataset.currentPage = pageNr;

    paginationContainer.innerHTML = `
      <div class="pagination-container" data-current-page="${pageNr}">
        ${pageNr > 1 ? `<button data-change-to="${pageNr - 1}" class="paginator prev">prev</button>` : ''}
        ${startPage >= 1 ? `<button data-change-to="1" ${pageNr === 1 ? ' disabled' : ''} class="paginator${pageNr === 1 ? ' active' : ''}">1</button>${showFirstEllipsis ? '<span class="paginator ellipsis">...</span>' : ''}` : ''}
        ${Array.from({ length: pages }, (_, i) => i + 2).filter((p) => pageFilter(p)).map((p) => `<button data-change-to="${p}" ${p === pageNr ? 'disabled' : ''} class="paginator${p === pageNr ? ' active' : ''}">${p}</button>`).join('')}
        ${(() => {
      if (showSecondEllipsis) {
        return '<span class="paginator ellipsis">...</span>';
      } if (endPage < pages - 1) {
        return `<button data-change-to="${pages - 1}" class="paginator">${pages - 1}</button>`;
      }
      return '';
    })()}
        ${endPage < pages ? `<button data-change-to="${pages}" class="paginator">${pages}</button>` : ''}
        ${pageNr !== pages ? `<button data-change-to="${pageNr + 1}" class="paginator next">next</button>` : ''}
      </div>
    `
  }
  renderPaginator(currentPage)

  // auto handle re-rendering of paginator
  if (typeof contentRerenderFn === 'function') {
    const paginatorClickHandler = (event) => {
      const closest = event.target.closest('button.paginator')
      if (closest && closest?.dataset?.changeTo) {
        const changeToNr = Number(closest.dataset.changeTo)
        if (Number.isNaN(changeToNr)) return;
        const rangeStart = (changeToNr - 1) * limit;
        const rangeEnd = rangeStart + limit;
        
        renderPaginator(changeToNr)
        writeQueryParams({ [queryNames.page]: changeToNr });
        // re-render content
        contentRerenderFn({ quantity, limit, page, pages, rangeStart, rangeEnd });
      }
    }
    paginationContainer.addEventListener('click', paginatorClickHandler)
    paginatorClickHandler({ target: paginationContainer.querySelector('.paginator.active') });
  }
  return paginationContainer
};

export default paginator;
