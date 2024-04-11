import { onAuthenticated } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(() => {
    console.log(block);
  });
}
