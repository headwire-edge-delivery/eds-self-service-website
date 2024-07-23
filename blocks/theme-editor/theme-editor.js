import {
  SCRIPT_API, onAuthenticated, OOPS, KESTREL_ONE,
} from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';

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

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const split = window.location.pathname.split('/');
    const id = split[2];
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}">
              ${id}
            </a>
          </div>
        </div>
        
        <div class="content">
            <p>
                <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
            </p>
        </div>
      </div>`;

    // Load site theme
    fetch(`https://preview--${id}.${KESTREL_ONE}/styles/vars.css`)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        throw new Error(res.status);
      })
      .then(async (css) => {
        block.innerHTML = `
          <div class="nav">
            <div class="breadcrumbs">
              <a href="/dashboard">
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
                <button class="button action secondary edit-mode" hidden>Editing mode</button>
                <button class="button action secondary preview-mode">Preview mode</button>
                <select class="button action secondary publish-theme-selector"></select>
                <button class="button action primary publish-theme">Save</button>
              </div>
            </div>
          </div>
        
          <div class="content">
              <div class="preview">
                  <iframe src="https://preview--${id}.${KESTREL_ONE}" class="iframe is-loading"></iframe>
                  <img src="/icons/loading.svg" alt="loading" loading="lazy"/>
              </div>
              <aside>
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
                  
                  <h3>Base</h3>
                  <label>
                    <span>Light</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-light">
                    </div>
                  </label>
                  <label>
                    <span>Dark</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-dark">
                    </div>
                  </label>
                  <label>
                    <span>Lightest</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-lightest">
                    </div>
                  </label>
                  <label>
                    <span>Darkest</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-darkest">
                    </div>
                  </label>
                  <label>
                    <span>Brand primary</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-brand-primary">
                    </div>
                  </label>
                  <label>
                    <span>Brand secondary</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-brand-secondary">
                    </div>
                  </label>
                  <label>
                    <span>Brand tertiary</span>
                    <div class="color-picker base">
                        <span></span>
                        <input type="color" data-var="color-brand-tertiary">
                    </div>
                  </label>
                  
                  <h3>Elements</h3>
                  <label>
                      <span>Background color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="background-color">
                      </div>
                  </label>
                  
                  <label>
                      <span>Header background color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="header-background-color">
                      </div>
                  </label>
                  
                  <label>
                      <span>Footer background color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="footer-background-color">
                      </div>
                  </label>
                 
                  <label>
                      <span>Heading text color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="heading-color">
                      </div>
                  </label>
                  
                  <label>
                      <span>Body text color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="text-color">
                      </div>
                  </label>
                  
                  <label>
                      <span>Links text color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="link-color">
                      </div>
                  </label>
                  <label>
                      <span>Links text color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="link-color-hover">
                      </div>
                  </label>
                  
                  <h2>Buttons</h2>
                  
                  <h3>Default</h3>
                  
                  <label>
                      <span>Text color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-text-color">
                      </div>
                  </label>
                  <label>
                      <span>Background color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-background-color">
                      </div>
                  </label>
                  <label>
                      <span>Border color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-border-color">
                      </div>
                  </label>
                  <label>
                      <span>Text color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-text-color-hover">
                      </div>
                  </label>
                  <label>
                      <span>Background color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-background-color-hover">
                      </div>
                  </label>
                  <label>
                      <span>Border color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-border-color-hover">
                      </div>
                  </label>
                  
                  <h3>Primary</h3>
                  
                  <label>
                      <span>Text color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-primary-text-color">
                      </div>
                  </label>
                  <label>
                      <span>Background color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-primary-background-color">
                      </div>
                  </label>
                  <label>
                      <span>Border color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-primary-border-color">
                      </div>
                  </label>
                  <label>
                      <span>Text color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-primary-text-color-hover">
                      </div>
                  </label>
                  <label>
                      <span>Background color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-primary-background-color-hover">
                      </div>
                  </label>
                  <label>
                      <span>Border color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-primary-border-color-hover">
                      </div>
                  </label>
                  
                  <h3>Secondary</h3>
                  
                  <label>
                      <span>Text color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-secondary-text-color">
                      </div>
                  </label>
                  <label>
                      <span>Background color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-secondary-background-color">
                      </div>
                  </label>
                  <label>
                      <span>Border color</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-secondary-border-color">
                      </div>
                  </label>
                  <label>
                      <span>Text color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-secondary-text-color-hover">
                      </div>
                  </label>
                  <label>
                      <span>Background color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-secondary-background-color-hover">
                      </div>
                  </label>
                  <label>
                      <span>Border color on hover</span>
                      <div class="color-picker elements">
                        <select></select>
                        <input type="color" disabled data-var="button-secondary-border-color-hover">
                      </div>
                  </label>
               
                  <!--<h2>Styles (Developer)</h2>-->
                  <!--<button class="button secondary action enable-styles">Edit styles (developer mode)</button>-->
                  <textarea class="vars"></textarea>
              </aside>
            </div>
          </div>
        </div>`;

        // TODO: remove when we move to dark alley
        fetch(`${SCRIPT_API}/darkAlleyList/${id}`, {
          headers: {
            authorization: `bearer ${token}`,
          },
        }).then((res) => res.json())
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

        // Get CSS vars
        let cssVars = getCSSVars(css);
        let fonts = '';

        // Render codemirror
        const vars = block.querySelector('.vars');
        const previewFrame = block.querySelector('.iframe');
        previewFrame.addEventListener('load', () => {
          // Add loading buffer
          setTimeout(() => {
            previewFrame.classList.remove('is-loading');
          }, 1000);
        });
        vars.value = css;

        // Load codemirror to edit styles
        loadCSS('/libs/codemirror/codemirror.min.css');
        await import('../../libs/codemirror/codemirror.min.js');
        await import('../../libs/codemirror/css.min.js');

        const editor = window.CodeMirror.fromTextArea(vars);
        editor.on('change', () => {
          previewFrame.contentWindow.postMessage({
            type: 'update:styles',
            styles: fonts,
            file: 'fonts',
          }, '*');

          previewFrame.contentWindow.postMessage({
            type: 'update:styles',
            styles: editor.getValue(),
            file: 'vars',
          }, '*');

          cssVars = getCSSVars(editor.getValue());
        });

        // Init Modes
        const previewMode = block.querySelector('.preview-mode');
        const editMode = block.querySelector('.edit-mode');
        previewMode.onclick = () => {
          previewFrame.classList.add('preview-mode');
          previewMode.hidden = true;
          editMode.hidden = false;
        };
        editMode.onclick = () => {
          previewFrame.classList.remove('preview-mode');
          editMode.hidden = true;
          previewMode.hidden = false;
        };

        // Init font-weight picker
        const fontWeights = ['300', '400', '700'];
        const fontWeightLabels = {
          300: 'Light',
          400: 'Regular',
          700: 'Bold',
        };
        block.querySelectorAll('.weight-picker').forEach((el) => {
          let selectedFontWeight = findCSSVar(cssVars, el.dataset.var);
          el.innerHTML = `${fontWeights.map((weight) => `<option ${weight === selectedFontWeight.value ? 'selected' : ''} value="${weight}">${fontWeightLabels[weight]}</option>`).join('')}`;
          el.onchange = () => {
            const newValue = el.value;
            editor.setValue(editor.getValue().replace(`--${selectedFontWeight.name}:${selectedFontWeight.fullValue}`, `--${selectedFontWeight.name}: ${newValue}`));

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
            let customFonts = items.filter(({ subsets, variants }) => subsets.includes('latin') && fontWeights.every((weight) => variants.includes(weight === '400' ? 'regular' : weight)));

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

            customFonts = [
              ...customFonts,
              ...defaultFonts
                .map((font) => ({ family: font }))].sort((a, b) => {
              if (a.family < b.family) {
                return -1;
              }
              if (a.family > b.family) {
                return 1;
              }
              return 0;
            });

            const updateFonts = async (selectedFont, newFont) => {
              const selectedFonts = [...block.querySelectorAll('.font-picker')]
                .map((el) => el.value);
              const selectedCustomFonts = selectedFonts
                .filter((font) => !defaultFonts.includes(font));

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

                const req = await fetch(`https://fonts.googleapis.com/css2?${searchParams.toString()}`);
                if (req.ok) {
                  // Update fonts
                  fonts = await req.text();

                  // Update editor
                  editor.setValue(editor.getValue().replace(`--${selectedFont.name}:${selectedFont.fullValue}`, `--${selectedFont.name}: '${newFont}', '${newFont} Fallback', sans-serif`));

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
                  newValue += `${res.filter(({ status }) => status === 'fulfilled').map(({ value }) => value).join('\n')}`;

                  // Update editor
                  editor.setValue(newValue);

                  cssVars = getCSSVars(editor.getValue());
                });
              }
            };

            block.querySelectorAll('.font-picker').forEach((el) => {
              let selectedFont = findCSSVar(cssVars, el.dataset.var, true);
              el.innerHTML = `${customFonts.map(({ family }) => `<option ${family === selectedFont?.value ? 'selected' : ''} value="${family}">${family}</option>`).join('')}`;

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
              editor.setValue(editor.getValue().replace(`--${selectedColor.name}:${selectedColor.fullValue}`, `--${selectedColor.name}: ${newValue}`));

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
            };
          } else if (el.classList.contains('elements')) {
            // Find base color
            const varValue = regExpVars.exec(selectedColor.value)[1].slice(2);
            select.innerHTML = `${defaultColors.map(({ label, value }) => `<option ${varValue === value ? 'selected' : ''} value="${value}">${label}</option>`).join()}`;

            input.value = findCSSVar(cssVars, varValue).value.toUpperCase();

            select.onchange = () => {
              const newValue = select.value;
              selectedColor = findCSSVar(cssVars, input.dataset.var);
              const base = block.querySelector(`.base input[data-var="${newValue}"]`);
              input.value = base.value;

              // Update editor
              editor.setValue(editor.getValue().replace(`--${selectedColor.name}:${selectedColor.fullValue}`, `--${selectedColor.name}: var(--${newValue})`));

              // Update vars
              previewFrame.contentWindow.postMessage({
                type: 'update:styles',
                styles: editor.getValue(),
                file: 'vars',
              }, '*');

              cssVars = getCSSVars(editor.getValue());

              warning.hidden = false;
            };
          }
        });

        const publishThemeSelector = block.querySelector('.publish-theme-selector');

        // Load index to list pages
        fetch(`https://preview--${id}.${KESTREL_ONE}/query-index.json?sheet=all`)
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

            const pages = data.filter(
              ({ template, robots, path }) => !template.includes('email') && !robots.includes('noindex') && path !== '/footer' && path !== '/nav',
            );

            // Theme pages
            publishThemeSelector.innerHTML = `${pages.map(({ path }) => `<option value="${path}">Preview: ${path}</option>`).join('')}`;
          });

        publishThemeSelector.onchange = () => {
          window?.zaraz?.track('click change theme preview', { url: window.location.href });

          if (new URL(previewFrame.src).pathname !== publishThemeSelector.value) {
            previewFrame.classList.add('is-loading');
            previewFrame.src = `https://preview--${id}.${KESTREL_ONE}${publishThemeSelector.value}`;
            previewFrame.addEventListener(
              'load',
              () => {
                previewFrame.contentWindow.postMessage({
                  type: 'update:styles',
                  styles: fonts,
                  file: 'fonts',
                }, '*');

                previewFrame.contentWindow.postMessage({
                  type: 'update:styles',
                  styles: editor.getValue(),
                  file: 'vars',
                }, '*');
              },
              { once: true },
            );
          }
        };

        block.querySelector('.publish-theme').onclick = async () => {
          window?.zaraz?.track('click site theme submit', { url: window.location.href });

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

          await window.alertDialog(failed ? OOPS : 'Theme successfully updated! Please note theme updates can take up to 1 minute to propagate to all site pages.');

          editor.setOption('readOnly', false);

          block.classList.remove('is-saving');

          warning.hidden = true;
        };

        // block.querySelector('.enable-styles').onclick = (event) => {
        //   window?.zaraz?.track('click theme styles enable', { url: window.location.href });
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
      })
      .catch((error) => {
        console.log(error);
        block.querySelector('.content p').textContent = OOPS;
      });
  });
}
