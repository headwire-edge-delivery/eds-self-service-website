import {
  SCRIPT_API,
  onAuthenticated,
  OOPS,
  KESTREL_ONE,
  colorInput,
} from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { loadCSS } from '../../scripts/aem.js';
import { alertDialog, confirmDialog } from '../../scripts/dialogs.js';

let timer;
const debounce = (fn) => {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  timer = setTimeout(() => fn(), 500);
};

const getCSSVars = (css) => css
  .split('\n')
  .map((s) => {
    let formatted = s.trim();
    if (formatted.endsWith(';')) {
      formatted = formatted.slice(0, -1);
    }
    return formatted;
  })
  .filter((prop) => prop.startsWith('--'));

const findCSSVar = (vars, name, isFont) => {
  const found = vars.find((prop) => {
    const key = prop.split(':')[0];
    return key.trim() === `--${name}`;
  });

  if (!found) {
    return false;
  }

  const fullValue = found.split(':')[1];

  let value = fullValue;
  if (isFont) {
    value = value.split(',')[0].trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      value = value.slice(1, -1);
    }
  } else {
    value = value.trim();
  }

  return {
    name,
    value,
    fullValue,
  };
};

const isMobile = window.matchMedia('(width < 768px)');

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

    block.classList.add('show-aside');
    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard/sites">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}">
              ${id}
            </a>
          </div>
        </div>
        
        <div class="content with-skeleton">
          ${renderSkeleton('theme-editor')}
        </div>
      </div>`;

    // Load site theme
    const cssVarsData = await fetch(`https://preview--${id}.${KESTREL_ONE}/styles/vars.css`)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        throw new Error(res.status);
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.log('error loading site theme:', error);
        return null;
      });

    if (!cssVarsData) {
      block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
      return;
    }

    block.innerHTML = `
          <div class="nav">
            <div class="breadcrumbs">
              <a href="/dashboard/sites">
                Dashboard
              </a>
              <span>&rsaquo;</span>
              <a href="/site/${id}">
                ${id}
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
                <span>You have unsaved changes</span>
                <button type="button" aria-label="close">&#x2715;</button>
              </div>
              <div class="button-container">
                <div class="viewers" role="radiogroup">
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
                <button id="save-button" title="Save your changes" class="button action primary is-disabled publish-theme">Save</button>
              </div>
            </div>
          </div>
        
          <div class="content">
              <div class="preview">
                <div class="preview-container">
                  <iframe src="https://preview--${id}.${KESTREL_ONE}?ispreview=true" class="iframe is-loading"></iframe>
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
                  </label>
                  <label>
                      <span>Font weight</span>
                      <select class="weight-picker" data-var="heading-font-weight"></select>
                  </label>
                  <h3>Body</h3>
                  <label>
                      <span>Font family</span>
                      <select class="font-picker" data-var="body-font-family"></select>
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
        </div>`;

    // Get CSS vars
    let cssVars = getCSSVars(cssVarsData);
    let fonts = '';

    // Presets
    let presets;
    let selectedPreset;
    const presetsPicker = block.querySelector('.presets-picker');
    const customPreset = presetsPicker.querySelector('.custom');
    const vars = block.querySelector('.vars');

    const previewFrame = block.querySelector('.iframe');
    previewFrame.addEventListener('load', () => {
      // Add loading buffer
      setTimeout(() => {
        previewFrame.classList.remove('is-loading');
        previewFrame.contentWindow.postMessage({
          type: 'getHeightInterval',
        }, '*');
        window.addEventListener('message', (event) => {
          if (event.data.type !== 'previewHeight') return;
          previewFrame.style.height = event.data.height;
        });
      }, 1000);
    });

    // Loading timeout
    setTimeout(() => {
      previewFrame.classList.remove('is-loading');
    }, 2000);
    vars.value = cssVarsData;

    // MARK: screen sizes
    const viewers = block.querySelector('.viewers');
    const [mobileViewer, tabletViewer, laptopViewer, desktopViewer] = viewers.children;

    const onViewerClick = (event) => {
      if (event.currentTarget.ariaChecked === 'false') {
        const checkedEl = viewers.querySelector('[aria-checked="true"]');
        if (checkedEl) checkedEl.ariaChecked = 'false';
        event.currentTarget.ariaChecked = 'true';
        previewFrame.style.width = event.currentTarget.dataset.width;
        previewFrame.style.height = null; // reset height
        previewFrame.style.overflow = null;
      }
    };

    mobileViewer.onclick = onViewerClick;
    tabletViewer.onclick = onViewerClick;
    laptopViewer.onclick = onViewerClick;
    desktopViewer.onclick = onViewerClick;

    if (isMobile.matches) {
      mobileViewer.click();
    } else {
      tabletViewer.click();
    }

    isMobile.addEventListener('change', (event) => {
      if (event.matches) {
        mobileViewer.click();
      }
    });

    // MARK: aside
    const preview = block.querySelector('.preview');
    const aside = block.querySelector('aside');
    const toggleAsideButton = block.querySelector('.toggle-aside');

    const toggleAside = (setTo) => {
      toggleAsideButton.ariaChecked = setTo;
      block.classList.toggle('show-aside', setTo);
      aside.classList.toggle('is-open', setTo);
    };
    toggleAsideButton.onclick = () => {
      toggleAside(!(toggleAsideButton.ariaChecked === 'true'));
    };
    aside.addEventListener('focusin', () => {
      toggleAside(true);
    });

    const headerHeight = Math.round(document.querySelector('header').clientHeight);
    const anchorAside = () => {
      const previewTop = Math.round(preview.getBoundingClientRect().top);

      if (previewTop > headerHeight) {
        aside.style.top = `${previewTop}px`;
        aside.style.height = `calc(100vh - ${previewTop}px)`;
      } else {
        aside.style.top = `${headerHeight}px`;

        const { scrollingElement } = document;
        const { scrollHeight } = scrollingElement;
        const { scrollTop } = scrollingElement;
        const height = scrollingElement.clientHeight;
        const bottom = Math.round(scrollHeight - scrollTop - height);

        const footerHeight = Math.round(document.querySelector('footer').clientHeight);
        if (bottom > footerHeight) {
          aside.style.height = `calc(100vh - ${headerHeight}px)`;
        } else {
          aside.style.height = `calc(100vh - ${headerHeight}px - ${footerHeight - bottom}px)`;
        }
      }
    };
    window.addEventListener('scroll', anchorAside, { passive: true });
    anchorAside();

    // eslint-disable-next-line max-len
    const findSelectedPreset = () => presets.find((preset) => preset.vars.every((cssVar) => cssVars.includes(cssVar)));

    const updatePreset = () => {
      selectedPreset = findSelectedPreset();

      if (!selectedPreset) {
        customPreset.hidden = false;
        customPreset.selected = true;
      } else {
        customPreset.hidden = true;
        presetsPicker.selectedIndex = presets.indexOf(selectedPreset);
      }
    };

    // Init theme presets
    fetch(`https://preview--${id}.${KESTREL_ONE}/themes.json`)
      .then((res) => res.json())
      .then((res) => {
        presets = res;
        presetsPicker.insertAdjacentHTML(
          'afterbegin',
          presets.map((preset) => `<option>${preset.name}</option>`).join(''),
        );

        updatePreset();

        presetsPicker.onchange = () => {
          selectedPreset = presets[presetsPicker.selectedIndex];

          const colorBaseInputs = block.querySelectorAll('.color-picker.base');
          const colorElementSelects = block.querySelectorAll('.color-picker.elements');

          colorBaseInputs.forEach((el) => {
            const input = el.querySelector('input');
            const { value } = findCSSVar(selectedPreset.vars, input.dataset.var);

            input.value = value;
            input.dispatchEvent(new Event('input'));
          });

          colorElementSelects.forEach((el) => {
            const select = el.querySelector('select');
            const input = el.querySelector('input');
            const { value } = findCSSVar(selectedPreset.vars, input.dataset.var);

            select.value = value.slice(6, -1);
            select.dispatchEvent(new Event('change'));
          });
        };
      });

    // TODO: remove when we move to dark alley
    fetch(`${SCRIPT_API}/darkAlleyList/${id}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(({ project }) => {
        if (project.darkAlleyProject) {
          block.querySelectorAll('.breadcrumbs a').forEach((link) => {
            if (link.href.includes('/site/')) {
              link.href = link.href.replace('/site/', '/da-site/');
            }
          });
        }
      })
      .catch(() => null);

    const warning = block.querySelector('.warning');
    warning.querySelector('button').onclick = () => {
      warning.hidden = true;
    };

    const defaultColors = [
      {
        label: 'Light',
        value: 'color-light',
      },
      {
        label: 'Dark',
        value: 'color-dark',
      },
      {
        label: 'Lightest',
        value: 'color-lightest',
      },
      {
        label: 'Darkest',
        value: 'color-darkest',
      },
      {
        label: 'Brand primary',
        value: 'color-brand-primary',
      },
      {
        label: 'Brand secondary',
        value: 'color-brand-secondary',
      },
      {
        label: 'Brand tertiary',
        value: 'color-brand-tertiary',
      },
    ];

    // Render codemirror

    // Load codemirror to edit styles
    loadCSS('/libs/codemirror/codemirror.min.css');
    await import('../../libs/codemirror/codemirror.min.js');
    await import('../../libs/codemirror/css.min.js');

    // MARK: contrast checker
    const contrastCheckerWorker = new Worker('/blocks/theme-editor/contrast-worker.js');

    let contrastIssuesExist = false;

    const contrastIssueSpans = block.querySelectorAll('span.contrast-issues');
    contrastIssueSpans.forEach((span) => {
      span.textContent = '';
      span.title = 'This variable has a low contrast ratio compared to the listed variables. It fails to meet the WCAG 2.0 AAA or AA standard.\nThis can potentially cause accessibility issues and lower page-ranking on search engines.';
    });

    const displayContrastIssues = (event) => {
      if (event.data.type !== 'contrastCheck') {
        return;
      }
      contrastIssueSpans.forEach((span) => { span.textContent = ''; });

      const contrastIssueArray = event.data.contrastIssues;

      if (!contrastIssueArray?.length) {
        contrastIssuesExist = false;
        return;
      }
      contrastIssuesExist = true;

      for (let index = 0; index < contrastIssueArray.length; index += 1) {
        const offendingElementInput1 = block.querySelector(`[data-var="${contrastIssueArray[index].var1}"]`);
        const offendingElementInput2 = block.querySelector(`[data-var="${contrastIssueArray[index].var2}"]`);
        const item1Name = offendingElementInput1.parentElement.previousElementSibling.textContent;
        const item2Name = offendingElementInput2.parentElement.previousElementSibling.textContent;
        const issueSpan1 = offendingElementInput1.parentElement.nextElementSibling;
        const issueSpan2 = offendingElementInput2.parentElement.nextElementSibling;

        issueSpan1.textContent += issueSpan1.textContent ? `, ${item2Name}` : `Contrast issue with: ${item2Name}`;
        issueSpan2.textContent += issueSpan2.textContent ? `, ${item1Name}` : `Contrast issue with: ${item1Name}`;
      }
    };

    contrastCheckerWorker.addEventListener('message', displayContrastIssues);
    contrastCheckerWorker.postMessage({
      type: 'contrastCheck',
      css: cssVarsData,
    });
    // MARK: onchange
    const editor = window.CodeMirror.fromTextArea(vars);
    const editorOnChange = () => {
      const editorValue = editor.getValue();
      cssVars = getCSSVars(editorValue);

      block.querySelector('.publish-theme').classList.remove('is-disabled');
      previewFrame.contentWindow.postMessage(
        {
          type: 'update:styles',
          styles: fonts,
          file: 'fonts',
        },
        '*',
      );

      previewFrame.contentWindow.postMessage(
        {
          type: 'update:styles',
          styles: editorValue,
          file: 'vars',
        },
        '*',
      );

      contrastCheckerWorker.postMessage({
        type: 'contrastCheck',
        css: editorValue,
      });
    };

    // TODO: change this to debounce if needed, & find out how to get correct value
    // debounce causes weird issues, where editor reverts to value of first change
    editor.on('change', editorOnChange);

    // Init font-weight picker
    const fontWeights = ['300', '400', '700'];
    const fontWeightLabels = {
      300: 'Light',
      400: 'Regular',
      700: 'Bold',
    };
    block.querySelectorAll('.weight-picker').forEach((el) => {
      let selectedFontWeight = findCSSVar(cssVars, el.dataset.var);
      el.innerHTML = `${fontWeights
        .map(
          (weight) => `<option ${
            weight === selectedFontWeight.value ? 'selected' : ''
          } value="${weight}">${fontWeightLabels[weight]}</option>`,
        )
        .join('')}`;
      el.onchange = () => {
        const newValue = el.value;
        editor.setValue(
          editor
            .getValue()
            .replace(
              `--${selectedFontWeight.name}:${selectedFontWeight.fullValue}`,
              `--${selectedFontWeight.name}: ${newValue}`,
            ),
        );

        cssVars = getCSSVars(editor.getValue());
        selectedFontWeight = findCSSVar(cssVars, el.dataset.var);

        warning.hidden = false;
      };
    });

    // Init font-pickers
    const fontsKey = 'AIzaSyDJEbwD5gSSwekxhVJKKCQdzWegzhDGPps';
    fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${fontsKey}&capability=WOFF2`)
      .then((req) => {
        if (req.ok) {
          return req.json();
        }
        return false;
      })
      .then(({ items }) => {
        let customFonts = items.filter(
          ({ subsets, variants }) => subsets.includes('latin')
                && fontWeights.every((weight) => variants.includes(weight === '400' ? 'regular' : weight)),
        );

        const defaultFonts = [
          'Arial',
          'Verdana',
          'Tahoma',
          'Trebuchet MS',
          'Times New Roman',
          'Georgia',
          'Garamond',
          'Courier New',
        ];

        customFonts = [...customFonts, ...defaultFonts.map((font) => ({ family: font }))].sort(
          (a, b) => {
            if (a.family < b.family) {
              return -1;
            }
            if (a.family > b.family) {
              return 1;
            }
            return 0;
          },
        );

        const updateFonts = async (selectedFont, newFont) => {
          const selectedFonts = [...block.querySelectorAll('.font-picker')].map(
            (el) => el.value,
          );
          const selectedCustomFonts = selectedFonts.filter(
            (font) => !defaultFonts.includes(font),
          );

          if (selectedCustomFonts.length) {
            const searchParams = new URLSearchParams();
            searchParams.set('display', 'swap');

            const fallbackFonts = [];
            selectedCustomFonts.forEach((customFont) => {
              const { files } = customFonts.find(({ family }) => customFont === family);

              searchParams.append('family', `${customFont}:wght@300;400;700`);

              fontWeights.forEach((weight) => {
                fallbackFonts.push(
                  fetch(`${SCRIPT_API}/font-fallback`, {
                    method: 'POST',
                    headers: {
                      'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: customFont,
                      url: files[weight === '400' ? 'regular' : weight],
                      weight,
                    }),
                  }).then((res) => res.text()),
                );
              });
            });

            const req = await fetch(
              `https://fonts.googleapis.com/css2?${searchParams.toString()}`,
            );
            if (req.ok) {
              // Update fonts
              fonts = await req.text();

              // Update editor
              editor.setValue(
                editor
                  .getValue()
                  .replace(
                    `--${selectedFont.name}:${selectedFont.fullValue}`,
                    `--${selectedFont.name}: '${newFont}', '${newFont} Fallback', sans-serif`,
                  ),
              );

              cssVars = getCSSVars(editor.getValue());
            }

            Promise.allSettled(fallbackFonts).then((res) => {
              let newValue = editor.getValue();

              // Remove fallback fonts
              const indexOf = newValue.indexOf('@font-face');
              if (indexOf !== -1) {
                newValue = newValue.substr(0, newValue.indexOf('@font-face'));
              }

              // Add new fallback fonts
              newValue += `${res
                .filter(({ status }) => status === 'fulfilled')
                .map(({ value }) => value)
                .join('\n')}`;

              // Update editor
              editor.setValue(newValue);

              cssVars = getCSSVars(editor.getValue());
            });
          }
        };

        block.querySelectorAll('.font-picker').forEach((el) => {
          let selectedFont = findCSSVar(cssVars, el.dataset.var, true);
          el.innerHTML = `${customFonts
            .map(
              ({ family }) => `<option ${
                family === selectedFont?.value ? 'selected' : ''
              } value="${family}">${family}</option>`,
            )
            .join('')}`;

          el.onchange = () => {
            selectedFont = findCSSVar(cssVars, el.dataset.var, true);
            updateFonts(selectedFont, el.value);
            warning.hidden = false;
          };
        });
      });

    // Init color-pickers
    const regExpVars = /\(([^)]+)\)/;
    block.querySelectorAll('.color-picker').forEach((el) => {
      const input = el.querySelector('input');
      const select = el.querySelector('select');
      let selectedColor = findCSSVar(cssVars, input.dataset.var);

      if (el.classList.contains('base')) {
        input.value = selectedColor.value;
        const span = el.querySelector('span');
        if (span) {
          span.textContent = selectedColor.value.toUpperCase();
        }

        input.oninput = () => {
          const newValue = input.value.toUpperCase();
          selectedColor = findCSSVar(cssVars, input.dataset.var);
          el.querySelector('span').textContent = newValue;

          // Update editor
          editor.setValue(
            editor
              .getValue()
              .replace(
                `--${selectedColor.name}:${selectedColor.fullValue}`,
                `--${selectedColor.name}: ${newValue}`,
              ),
          );

          // Update Elements
          const elements = [...block.querySelectorAll('.elements')].filter((element) => {
            const elSelect = element.querySelector('select');
            return elSelect.value === selectedColor.name;
          });

          elements.forEach((element) => {
            const elInput = element.querySelector('input');
            elInput.value = newValue;
          });

          warning.hidden = false;

          debounce(updatePreset);
        };
      } else if (el.classList.contains('elements')) {
        // Find base color
        const varValue = regExpVars.exec(selectedColor.value)?.[1].slice(2);
        select.innerHTML = `${defaultColors
          .map(
            ({ label, value }) => `<option ${
              varValue === value ? 'selected' : ''
            } value="${value}">${label}</option>`,
          )
          .join()}`;

        input.value = findCSSVar(cssVars, varValue).value?.toUpperCase();

        select.onchange = () => {
          const newValue = select.value;
          selectedColor = findCSSVar(cssVars, input.dataset.var);
          const base = block.querySelector(`.base input[data-var="${newValue}"]`);
          input.value = base.value;

          // Update editor
          editor.setValue(
            editor
              .getValue()
              .replace(
                `--${selectedColor.name}:${selectedColor.fullValue}`,
                `--${selectedColor.name}: var(--${newValue})`,
              ),
          );

          // Update vars
          previewFrame.contentWindow.postMessage(
            {
              type: 'update:styles',
              styles: editor.getValue(),
              file: 'vars',
            },
            '*',
          );

          cssVars = getCSSVars(editor.getValue());

          warning.hidden = false;

          debounce(updatePreset);
        };
      }
    });

    const publishThemeSelector = block.querySelector('.publish-theme-selector');

    // Load index to list pages
    fetch(`${SCRIPT_API}/index/${id}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error(res.status);
      })
    // Assuming all templates have the all sheet
      .then(({ data }) => {
        if (!data.length) {
          return;
        }

        const pages = data.filter(({ path }) => !path.startsWith('/drafts/')
          && !path.startsWith('/emails/')
          && path !== '/footer'
          && path !== '/nav');

        // Theme pages
        publishThemeSelector.innerHTML = `${pages
          .map(({ path }) => {
            let shortenedPath = `/${path.split('/').pop()}`;
            if (shortenedPath.length > 40) {
              shortenedPath = `${shortenedPath.slice(0, 37)}...`;
            }
            return `<option ${path === '/' ? 'selected' : ''} value="${path}">Preview: ${shortenedPath}</option>`;
          })
          .join('')}`;
      });

    publishThemeSelector.onchange = () => {
      window?.zaraz?.track('click change theme preview');

      if (new URL(previewFrame.src).pathname !== publishThemeSelector.value) {
        previewFrame.classList.add('is-loading');
        previewFrame.src = `https://preview--${id}.${KESTREL_ONE}${publishThemeSelector.value}`;
        previewFrame.addEventListener(
          'load',
          () => {
            previewFrame.contentWindow.postMessage(
              {
                type: 'update:styles',
                styles: fonts,
                file: 'fonts',
              },
              '*',
            );

            previewFrame.contentWindow.postMessage(
              {
                type: 'update:styles',
                styles: editor.getValue(),
                file: 'vars',
              },
              '*',
            );
          },
          { once: true },
        );
        // Loading timeout
        setTimeout(() => {
          previewFrame.classList.remove('is-loading');
        }, 2000);
      }
    };

    block.querySelector('.publish-theme').onclick = async () => {
      window?.zaraz?.track('click site theme submit');

      if (contrastIssuesExist) {
        if (!(await confirmDialog('Contrast issues exist, do you want to continue?'))) {
          window?.zaraz?.track('cancel site theme submit due to contrast issues');
          return;
        }
        window?.zaraz?.track('confirm site theme submit with contrast issues');
      }

      block.classList.add('is-saving');

      editor.setOption('readOnly', true);
      let failed = false;
      if (fonts) {
        let res = await fetch(`${SCRIPT_API}/cssVariables/${id}`, {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ css: btoa(editor.getValue()) }),
        });

        if (!res.ok) {
          failed = true;
        } else {
          res = await fetch(`${SCRIPT_API}/cssFonts/${id}`, {
            method: 'POST',
            headers: { ...headers, 'content-type': 'application/json' },
            body: JSON.stringify({ css: btoa(fonts) }),
          });

          failed = !res.ok;
        }
      } else {
        const res = await fetch(`${SCRIPT_API}/cssVariables/${id}`, {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ css: btoa(editor.getValue()) }),
        });

        failed = !res.ok;
      }

      await alertDialog(
        failed
          ? OOPS
          : 'Theme successfully updated! Please note theme updates can take up to 1 minute to propagate to all site pages.',
      );

      editor.setOption('readOnly', false);

      block.classList.remove('is-saving');

      warning.hidden = true;
    };

    // block.querySelector('.enable-styles').onclick = (event) => {
    //   window?.zaraz?.track('click theme styles enable');
    //
    //   [...block.querySelectorAll('aside > *')].some((el) => {
    //     if (el === event.target.previousElementSibling) {
    //       return true;
    //     }
    //
    //     el.remove();
    //     return false;
    //   });
    //
    //   event.target.remove();
    //
    //   editor.refresh();
    // };
  });
}
