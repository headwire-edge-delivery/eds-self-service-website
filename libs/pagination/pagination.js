import { parseFragment } from "../../scripts/scripts.js";

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

const paginator = (quantity, limit, page, contentRerenderFn) => {
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
    paginationContainer.addEventListener('click', (event) => {
      const closest = event.target.closest('button.paginator')
      if (closest && closest?.dataset?.changeTo) {
        const changeToNr = Number(closest.dataset.changeTo)
        if (Number.isNaN(changeToNr)) return;
        console.log(" changeToNr:", changeToNr)
        const rangeStart = (changeToNr - 1) * limit;
        const rangeEnd = rangeStart + limit;
        
        renderPaginator(changeToNr)
        // re-render content
        contentRerenderFn({quantity, limit, page, pages, rangeStart, rangeEnd });
      }
    })
  }
  return paginationContainer
};

export default paginator;
