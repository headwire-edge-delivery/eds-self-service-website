/* eslint-disable max-len */
import { colorInput, KESTREL_ONE } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';

export default function createBaseBlockHtml(projectSlug) {
  return /* html */ `
  <div class="nav">
    <div class="breadcrumbs">
      <a href="/dashboard/sites">
        Dashboard
      </a>
      <span>&rsaquo;</span>
      <a href="/site/${projectSlug}">
        ${projectSlug}
      </a>
      <span>&rsaquo;</span>
      <a href="${window.location.href}" aria-current="page">
        <h1>Theme Editor</h1>
      </a>
    </div>

    <div class="actions">
      <div class="warning" hidden>
        <span class="icon icon-info">
          <img alt src="/icons/info.svg" loading="lazy">
        </span>
        <span id="unsaved-text">You have unsaved changes</span>
        <button type="button" aria-label="close">&#x2715;</button>
      </div>
      <div class="button-container">
        <div class="viewers" id="viewers" role="radiogroup">
            <button aria-checked="false" title="Mobile" aria-label="mobile" data-width="375px" class="button secondary action">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3c4043"><path d="M280-40q-33 0-56.5-23.5T200-120v-720q0-33 23.5-56.5T280-920h400q33 0 56.5 23.5T760-840v720q0 33-23.5 56.5T680-40H280Zm0-120v40h400v-40H280Zm0-80h400v-480H280v480Zm0-560h400v-40H280v40Zm0 0v-40 40Zm0 640v40-40Z"/></svg>
            </button>
            <button aria-checked="false" title="Tablet" aria-label="tablet" data-width="810px" class="button secondary action">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3c4043"><path d="M120-160q-33 0-56.5-23.5T40-240v-480q0-33 23.5-56.5T120-800h720q33 0 56.5 23.5T920-720v480q0 33-23.5 56.5T840-160H120Zm40-560h-40v480h40v-480Zm80 480h480v-480H240v480Zm560-480v480h40v-480h-40Zm0 0h40-40Zm-640 0h-40 40Z"/></svg>
            </button>
            <button aria-checked="false" title="Laptop" aria-label="laptop" data-width="1280px" class="button secondary action">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3c4043"><path d="M40-120v-80h880v80H40Zm120-120q-33 0-56.5-23.5T80-320v-440q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v440q0 33-23.5 56.5T800-240H160Zm0-80h640v-440H160v440Zm0 0v-440 440Z"/></svg>
            </button>
            <button aria-checked="false" title="Desktop" aria-label="desktop" data-width="1440px" class="button secondary action">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3c4043"><path d="M320-120v-80h80v-80H160q-33 0-56.5-23.5T80-360v-400q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v400q0 33-23.5 56.5T800-280H560v80h80v80H320ZM160-360h640v-400H160v400Zm0 0v-400 400Z"/></svg>
            </button>
        </div>
        <select id="publish-theme-selector" title="Select the previewed page" class="button action secondary publish-theme-selector"></select>
        <button id="save-button" title="Save your changes" disabled class="button action primary publish-theme">Save</button>
      </div>
    </div>
  </div>

  <div class="content">
      <div class="preview">
        <div class="preview-container">
          <iframe src="https://preview--${projectSlug}.${KESTREL_ONE}?ispreview=true" class="iframe is-loading"></iframe>
          ${renderSkeleton('theme-editor-preview')}
        </div>
      </div>
      <div class="ghost-aside"></div>
      <aside class="aside settings is-open">
        <button class="toggle-aside" aria-checked="true" title="Toggle Theme Settings">
          <span class="icon"><img src="/icons/chevron-down.svg" alt="chevron-down"></span>
        </button>

        <div class="aside-content">
          <h2>Typography</h2>

          <h3>Heading</h3>
          <label>
              <span>Font family</span>
              <select class="font-picker" data-var="heading-font-family"></select>
              <button class="button secondary action more-fonts">More fonts</button>
          </label>
          <label>
              <span>Font weight</span>
              <select class="weight-picker" data-var="heading-font-weight"></select>
          </label>
          <h3>Body</h3>
          <label>
              <span>Font family</span>
              <select class="font-picker" data-var="body-font-family"></select>
              <button class="button secondary action more-fonts">More fonts</button>
          </label>

          <h2>Colors</h2>

          <h3>Presets</h3>
          <label>
            <span>Color preset</span>
            <select class="presets-picker">
                <option class="custom" hidden>Custom</option>
            </select>
          </label>

          <h3>Base</h3>
          <label>
            <span>Light</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-light')}
            </div>
          </label>
          <label>
            <span>Dark</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-dark')}
            </div>
          </label>
          <label>
            <span>Lightest</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-lightest')}
            </div>
          </label>
          <label>
            <span>Darkest</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-darkest')}
            </div>
          </label>
          <label>
            <span>Brand primary</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-brand-primary')}
            </div>
          </label>
          <label>
            <span>Brand secondary</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-brand-secondary')}
            </div>
          </label>
          <label>
            <span>Brand tertiary</span>
            <div title="Open the color picker" class="color-picker base">
                <span></span>
                ${colorInput('color-brand-tertiary')}
            </div>
          </label>

          <h3>Elements</h3>
          <label>
              <span>Background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Header background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('header-background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Heading text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('heading-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Body text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('text-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Links text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('link-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Links text color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('link-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <h2>Buttons</h2>

          <h3>Default</h3>

          <label>
              <span>Text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-text-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Border color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-border-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Text color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-text-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Background color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-background-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Border color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-border-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <h3>Primary</h3>

          <label>
              <span>Text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-primary-text-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-primary-background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Border color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-primary-border-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Text color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-primary-text-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Background color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-primary-background-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Border color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-primary-border-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <h3>Secondary</h3>

          <label>
              <span>Text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-secondary-text-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-secondary-background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Border color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-secondary-border-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Text color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-secondary-text-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Background color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-secondary-background-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Border color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('button-secondary-border-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <h2>Input Fields</h2>

          <label>
              <span>Input text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('input-text-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Input background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('input-background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>
          <label>
              <span>Input border color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('input-border-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <h2>Footer</h2>

          <label>
              <span>Footer background color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('footer-background-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Footer text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('footer-text-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Footer Links text color</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('footer-link-color', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <label>
              <span>Footer Links text color on hover</span>
              <div title="Open the color picker" class="color-picker elements">
                <select></select>
                ${colorInput('footer-link-color-hover', true)}
              </div>
              <span class="contrast-issues"></span>
          </label>

          <!--<h2>Styles (Developer)</h2>-->
          <!--<button class="button secondary action enable-styles">Edit styles (developer mode)</button>-->
          <textarea class="vars"></textarea>
        </div>
      </aside>
    </div>
  </div>
</div>
`;
}
