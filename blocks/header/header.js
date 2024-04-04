import { loadFragment } from '../fragment/fragment.js';

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await loadFragment('/nav');

  // decorate nav DOM
  const nav = document.createElement('nav');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  block.innerHTML = '';
  block.append(nav);
}
