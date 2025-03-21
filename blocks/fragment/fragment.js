/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

import { decorateMain } from "../../scripts/scripts.js";

import { loadBlocks, updateSectionsStatus } from "../../scripts/aem.js";
import { createDialog } from "../../scripts/dialogs.js";

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path, createInDialog) {
  if (path && path.startsWith("/")) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement("main");
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase("img", "src");
      resetAttributeBase("source", "srcset");

      if (createInDialog) {
        createDialog(main, [], { open: false, surviveClose: true });
      }
      decorateMain(main);
      await loadBlocks(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const isDialogVariation = block.classList.contains("dialog");
  const link = block.querySelector("a");
  const path = link ? link.getAttribute("href") : block.textContent.trim();
  const fragment = await loadFragment(path, isDialogVariation);
  if (isDialogVariation) {
    // content in dialog, remove block with link
    updateSectionsStatus(block.closest("main"));
    block.remove();
    return;
  }
  if (fragment) {
    const fragmentSection = fragment.querySelector(":scope .section");
    if (fragmentSection) {
      block.closest(".section").classList.add(...fragmentSection.classList);
      block.closest(".fragment").replaceWith(...fragment.childNodes);
    }
  }
}
