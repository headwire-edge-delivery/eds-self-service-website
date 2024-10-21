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

const paginator = (quantity, limit, page) => {
  loadCssFile('/libs/pagination/pagination.css');
  const pages = Math.ceil(quantity / limit);
  if (pages <= 1) {
    return '';
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

  return `
    <div class="pagination-container" data-current-page="${currentPage}">
      ${currentPage > 1 ? `<button data-change-to="${currentPage - 1}" class="paginator prev">prev</button>` : ''}
      ${startPage >= 1 ? `<button data-change-to="1" ${currentPage === 1 ? ' disabled' : ''} class="paginator${currentPage === 1 ? ' active' : ''}">1</button>${showFirstEllipsis ? '<span class="paginator ellipsis">...</span>' : ''}` : ''}
      ${Array.from({ length: pages }, (_, i) => i + 2).filter((p) => pageFilter(p)).map((p) => `<button data-change-to="${p}" ${p === currentPage ? 'disabled' : ''} class="paginator${p === currentPage ? ' active' : ''}">${p}</button>`).join('')}
      ${(() => {
    if (showSecondEllipsis) {
      return '<span class="paginator ellipsis">...</span>';
    } if (endPage < pages - 1) {
      return `<button data-change-to="${pages - 1}" class="paginator">${pages - 1}</button>`;
    }
    return '';
  })()}
      ${endPage < pages ? `<button data-change-to="${pages}" class="paginator">${pages}</button>` : ''}
      ${currentPage !== pages ? `<button data-change-to="${currentPage + 1}" class="paginator next">next</button>` : ''}
    </div>
  `;
};

export default paginator;
