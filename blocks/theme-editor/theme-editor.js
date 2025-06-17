import { SCRIPT_API, onAuthenticated, OOPS, KESTREL_ONE, completeChecklistItem } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { loadCSS } from '../../scripts/aem.js';
import { confirmDialog } from '../../scripts/dialogs.js';
import createBaseBlockHtml from './baseBlockHtml.js';
import initFontPicker from './fontPicker.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';

const debounce = (fn, delay = 500) => {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Extract CSS variables from a CSS string
 * @param {string} css - CSS content to parse
 * @returns {string[]} - Array of CSS variables
 */
const getCSSVars = (css) =>
  css
    .split('\n')
    .map((s) => {
      let formatted = s.trim();
      if (formatted.endsWith(';')) {
        formatted = formatted.slice(0, -1);
      }
      return formatted;
    })
    .filter((prop) => prop.startsWith('--'));

/**
 * Find a CSS variable in the variables array
 * @param {string[]} vars - Array of CSS variables
 * @param {string} name - Variable name to find
 * @param {boolean} isFont - Whether this is a font variable
 * @returns {Object|false} - Found variable or false
 */
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
    const projectSlug = split[2];
    const token = await window.auth0Client.getTokenSilently();
    const headers = { authorization: `bearer ${token}` };

    // MARK: Initial setup with loading skeleton
    block.classList.add('show-aside');
    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard/sites">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${projectSlug}">
              ${projectSlug}
            </a>
          </div>
        </div>

        <div class="content with-skeleton">
          ${renderSkeleton('theme-editor')}
        </div>
      </div>`;

    // MARK: Load site theme
    const cssVarsData = await fetch(`https://preview--${projectSlug}.${KESTREL_ONE}/styles/vars.css`)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        throw new Error(res.statusText);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('error loading site theme:', error);
        return null;
      });

    if (!cssVarsData) {
      block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
      return;
    }

    block.innerHTML = createBaseBlockHtml(projectSlug);

    // MARK: Get CSS vars
    const varsObj = {
      cssVars: getCSSVars(cssVarsData),
      cssFonts: '',
    };

    // MARK: Presets
    let presets;
    let selectedPreset;
    const presetsPicker = block.querySelector('.presets-picker');
    const customPreset = presetsPicker.querySelector('.custom');
    const vars = block.querySelector('.vars');

    const previewFrame = block.querySelector('.iframe');
    function adjustPreviewFrameHeight() {
      previewFrame.style.height = window.innerHeight - 64 * 2 + 'px';
    }
    previewFrame.addEventListener('load', () => {
      // MARK: Add loading buffer
      setTimeout(() => {
        adjustPreviewFrameHeight();
      }, 1000);
    });
    // adjust Preview Frame on resize
    window.addEventListener('resize', () => {
      adjustPreviewFrameHeight();
    });

    // MARK: Loading timeout
    setTimeout(() => {
      toggleLoading(false);
    }, 2000);
    vars.value = cssVarsData;

    // MARK: screen sizes
    const viewers = block.querySelector('.viewers');
    const [mobileViewer] = viewers.children;
    const viewerWidths = Array.from(viewers.children).map((viewer) => viewer.dataset.width);
    const availableWidth = document.body.clientWidth - Math.min(document.body.clientWidth * 0.8, 400);
    const biggestFittingViewer = viewerWidths.reduce((acc, curr) => {
      const currWidth = parseInt(curr, 10);
      if (currWidth > parseInt(acc, 10) && currWidth <= availableWidth) {
        return curr;
      }
      return acc;
    }, 0);

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

    Array.from(viewers.children).forEach((viewer) => {
      viewer.onclick = onViewerClick;
    });

    if (biggestFittingViewer === 0) {
      mobileViewer.click();
    } else {
      viewers.querySelector('[data-width="' + biggestFittingViewer + '"]').click();
    }

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

    // eslint-disable-next-line no-restricted-syntax
    const headerHeight = Math.round(document.querySelector('header').clientHeight);

    // MARK: Calculate and set aside position
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

        // eslint-disable-next-line no-restricted-syntax
        const footerHeight = Math.round(document.querySelector('footer').clientHeight);
        if (bottom > footerHeight) {
          aside.style.height = `calc(100vh - ${headerHeight}px)`;
        } else {
          aside.style.height = `calc(100vh - ${headerHeight}px - ${footerHeight - bottom}px)`;
        }
      }
    };
    window.addEventListener('scroll', anchorAside, { passive: true });
    window.addEventListener('resize', anchorAside, { passive: true });
    anchorAside();

    const findSelectedPreset = () => presets?.find((preset) => preset.vars.every((cssVar) => varsObj.cssVars.includes(cssVar)));

    const updatePreset = debounce(() => {
      selectedPreset = findSelectedPreset();

      if (!selectedPreset) {
        customPreset.hidden = false;
        customPreset.selected = true;
      } else {
        customPreset.hidden = true;
        presetsPicker.selectedIndex = presets.indexOf(selectedPreset);
      }
    }, 300);

    // MARK: Init theme presets
    fetch(`https://preview--${projectSlug}.${KESTREL_ONE}/themes.json`)
      .then((res) => res.json())
      .then((res) => {
        presets = res;
        presetsPicker.insertAdjacentHTML('afterbegin', presets.map((preset) => `<option>${preset.name}</option>`).join(''));

        updatePreset();

        presetsPicker.onchange = () => {
          selectedPreset = presets[presetsPicker.selectedIndex];

          const colorBaseInputs = block.querySelectorAll('.color-picker.base');
          const colorElementSelects = block.querySelectorAll('.color-picker.elements');

          colorBaseInputs.forEach((el) => {
            const input = el.querySelector('input');
            const cssVar = findCSSVar(selectedPreset.vars, input.dataset.var);

            if (cssVar && typeof cssVar === 'object') {
              input.value = cssVar.value;
              input.dispatchEvent(new Event('input'));
            }
          });

          colorElementSelects.forEach((el) => {
            const select = el.querySelector('select');
            const input = el.querySelector('input');
            const cssVar = findCSSVar(selectedPreset.vars, input.dataset.var);

            if (cssVar && typeof cssVar === 'object' && cssVar.value) {
              select.value = cssVar.value.slice(6, -1);
              select.dispatchEvent(new Event('change'));
            }
          });
        };
      });

    // TODO: remove when we move to dark alley
    fetch(`${SCRIPT_API}/darkAlleyList/${projectSlug}`, {
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
    const saveButton = block.querySelector('#save-button');

    const toggleSave = (bool = true) => {
      warning.hidden = bool;
      saveButton.disabled = bool;
    };

    const toggleLoading = (bool = true) => {
      if (bool) {
        saveButton.classList.add('loading');
        previewFrame.classList.add('is-loading');
      } else {
        previewFrame.classList.remove('is-loading');
        saveButton.classList.remove('loading');
        saveButton.disabled = true;
      }
    };

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

    // MARK: Load codemirror to edit styles
    loadCSS('/libs/codemirror/codemirror.min.css');
    await import('../../libs/codemirror/codemirror.min.js');
    await import('../../libs/codemirror/css.min.js');

    // MARK: contrast checker
    const contrastCheckerWorker = new Worker('/blocks/theme-editor/contrast-worker.js');

    let contrastIssuesExist = false;

    const contrastIssueSpans = block.querySelectorAll('span.contrast-issues');
    contrastIssueSpans.forEach((span) => {
      span.textContent = '';
      span.title =
        'This variable has a low contrast ratio compared to the listed variables. It fails to meet the WCAG 2.0 AAA or AA standard.\nThis can potentially cause accessibility issues and lower page-ranking on search engines.';
    });

    const displayContrastIssues = (event) => {
      if (event.data.type !== 'contrastCheck') {
        return;
      }
      contrastIssueSpans.forEach((span) => {
        span.textContent = '';
      });

      const contrastIssueArray = event.data.contrastIssues;

      if (!contrastIssueArray?.length) {
        contrastIssuesExist = false;
        return;
      }
      contrastIssuesExist = true;

      for (let index = 0; index < contrastIssueArray.length; index += 1) {
        const offendingElementInput1 = block.querySelector(`[data-var="${contrastIssueArray[index].var1}"]`);
        const offendingElementInput2 = block.querySelector(`[data-var="${contrastIssueArray[index].var2}"]`);
        if (!offendingElementInput1 || !offendingElementInput2) continue;
        const item1Name = offendingElementInput1.parentElement.parentElement.previousElementSibling.textContent;
        const item2Name = offendingElementInput2.parentElement.parentElement.previousElementSibling.textContent;
        const issueSpan1 = offendingElementInput1.parentElement.parentElement.nextElementSibling;
        const issueSpan2 = offendingElementInput2.parentElement.parentElement.nextElementSibling;

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
      varsObj.cssVars = getCSSVars(editorValue);

      saveButton.disabled = false;
      aside.dataset.unsavedChanges = 'true';

      // MARK: Update preview with font styles
      previewFrame.contentWindow.postMessage(
        {
          type: 'update:styles',
          styles: varsObj.cssFonts,
          file: 'fonts',
        },
        '*',
      );

      // MARK: Update preview with CSS variables
      previewFrame.contentWindow.postMessage(
        {
          type: 'update:styles',
          styles: editorValue,
          file: 'vars',
        },
        '*',
      );

      // MARK: Check for contrast issues
      contrastCheckerWorker.postMessage({
        type: 'contrastCheck',
        css: editorValue,
      });
    };

    editor.on('change', editorOnChange);

    // MARK: Init font-weight picker
    const fontWeights = ['300', '400', '700'];
    const fontWeightLabels = {
      300: 'Light',
      400: 'Regular',
      700: 'Bold',
    };

    block.querySelectorAll('.weight-picker').forEach((el) => {
      const selectedFontWeight = findCSSVar(varsObj.cssVars, el.dataset.var);

      if (!selectedFontWeight) return;

      el.innerHTML = `${fontWeights
        .map((weight) => `<option ${weight === selectedFontWeight.value ? 'selected' : ''} value="${weight}">${fontWeightLabels[weight]}</option>`)
        .join('')}`;

      el.onchange = () => {
        const newValue = el.value;
        editor.setValue(editor.getValue().replace(`--${selectedFontWeight.name}:${selectedFontWeight.fullValue}`, `--${selectedFontWeight.name}: ${newValue}`));

        varsObj.cssVars = getCSSVars(editor.getValue());

        toggleSave(false);
      };
    });

    // MARK: Init font-pickers
    initFontPicker({
      varsObj,
      editor,
      block,
      warning,
      getCSSVars,
      findCSSVar,
    });

    // MARK: Init color-pickers
    const regExpVars = /\(([^)]+)\)/;
    block.querySelectorAll('.color-picker').forEach((el) => {
      const input = el.querySelector('input');
      const select = el.querySelector('select');
      const selectedColor = findCSSVar(varsObj.cssVars, input.dataset.var);

      if (!selectedColor) return;

      if (el.classList.contains('base')) {
        input.value = selectedColor.value;
        const span = el.querySelector('span');
        if (span) {
          span.textContent = selectedColor.value.toUpperCase();
        }

        input.oninput = () => {
          const newValue = input.value.toUpperCase();
          const currentColor = findCSSVar(varsObj.cssVars, input.dataset.var);

          if (!currentColor) return;

          const span = el.querySelector('span');
          if (span) {
            span.textContent = newValue;
          }

          // MARK: Update editor
          editor.setValue(editor.getValue().replace(`--${currentColor.name}:${currentColor.fullValue}`, `--${currentColor.name}: ${newValue}`));

          const elements = [...block.querySelectorAll('.elements')].filter((element) => {
            const elSelect = element.querySelector('select');
            return elSelect.value === currentColor.name;
          });

          elements.forEach((element) => {
            const elInput = element.querySelector('input');
            elInput.value = newValue;
          });

          toggleSave(false);

          updatePreset();
        };
      } else if (el.classList.contains('elements')) {
        // MARK: Find base color
        const varValue = regExpVars.exec(selectedColor.value)?.[1].slice(2);
        select.innerHTML = `${defaultColors.map(({ label, value }) => `<option ${varValue === value ? 'selected' : ''} value="${value}">${label}</option>`).join('')}`;

        const baseVar = findCSSVar(varsObj.cssVars, varValue);
        if (baseVar && typeof baseVar === 'object') {
          input.value = baseVar.value?.toUpperCase();
        }

        select.onchange = () => {
          const newValue = select.value;
          const currentColor = findCSSVar(varsObj.cssVars, input.dataset.var);

          if (!currentColor) return;

          const base = block.querySelector(`.base input[data-var="${newValue}"]`);
          if (base) {
            input.value = base.value;
          }

          // MARK: Update editor
          editor.setValue(editor.getValue().replace(`--${currentColor.name}:${currentColor.fullValue}`, `--${currentColor.name}: var(--${newValue})`));
          previewFrame.contentWindow.postMessage(
            {
              type: 'update:styles',
              styles: editor.getValue(),
              file: 'vars',
            },
            '*',
          );

          varsObj.cssVars = getCSSVars(editor.getValue());

          toggleSave(false);

          updatePreset();
        };
      }
    });

    const publishThemeSelector = block.querySelector('.publish-theme-selector');

    // MARK: Load index to list pages
    fetch(`${SCRIPT_API}/index/${projectSlug}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error(res.statusText);
      })
      // Assuming all templates have the all sheet
      .then(({ data }) => {
        if (!data || !data.length) {
          return;
        }

        const pages = data.filter(({ path }) => !path.startsWith('/drafts/') && !path.startsWith('/emails/') && path !== '/footer' && path !== '/nav');

        // MARK: Theme pages
        publishThemeSelector.innerHTML = `${pages
          .map(({ path }) => {
            let shortenedPath = `/${path.split('/').pop()}`;
            if (shortenedPath.length > 40) {
              shortenedPath = `${shortenedPath.slice(0, 37)}...`;
            }
            return `<option ${path === '/' ? 'selected' : ''} value="${path}">Preview: ${shortenedPath}</option>`;
          })
          .join('')}`;
        anchorAside(); // this sometimes shifts content, reset aside
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error loading index:', error);
      });

    publishThemeSelector.onchange = () => {
      window?.zaraz?.track('click change theme preview');

      if (new URL(previewFrame.src).pathname !== publishThemeSelector.value) {
        toggleLoading(true);
        previewFrame.src = `https://preview--${projectSlug}.${KESTREL_ONE}${publishThemeSelector.value}?ispreview=true`;
        previewFrame.style.height = null;
        previewFrame.addEventListener(
          'load',
          () => {
            previewFrame.contentWindow.postMessage(
              {
                type: 'update:styles',
                styles: varsObj.cssFonts,
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
        // MARK: Loading timeout
        setTimeout(() => {
          toggleLoading(false);
        }, 2000);
      }
    };

    // MARK: save button
    const saveTheme = async () => {
      window?.zaraz?.track('click site theme submit');

      if (contrastIssuesExist) {
        if (!(await confirmDialog('Contrast issues exist, do you want to continue?'))) {
          window?.zaraz?.track('cancel site theme submit due to contrast issues');
          return;
        }
        window?.zaraz?.track('confirm site theme submit with contrast issues');
      }

      toggleSave(true);
      toggleLoading(true);
      block.classList.add('is-saving');

      editor.setOption('readOnly', true);
      let failed = false;

      try {
        if (varsObj.cssFonts) {
          let res = await fetch(`${SCRIPT_API}/cssVariables/${projectSlug}`, {
            method: 'POST',
            headers: { ...headers, 'content-type': 'application/json' },
            body: JSON.stringify({ css: btoa(editor.getValue()) }),
          });

          if (!res.ok) {
            failed = true;
          } else {
            res = await fetch(`${SCRIPT_API}/cssFonts/${projectSlug}`, {
              method: 'POST',
              headers: { ...headers, 'content-type': 'application/json' },
              body: JSON.stringify({ css: btoa(varsObj.cssFonts) }),
            });

            failed = !res.ok;
          }
        } else {
          const res = await fetch(`${SCRIPT_API}/cssVariables/${projectSlug}`, {
            method: 'POST',
            headers: { ...headers, 'content-type': 'application/json' },
            body: JSON.stringify({ css: btoa(editor.getValue()) }),
          });

          failed = !res.ok;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error saving theme:', error);
        failed = true;
      }

      if (failed) {
        showErrorToast('Something went wrong! We could not update your theme. Please try again later. If the issue persists, please contact support.');
      } else {
        showToast('Theme updated! Please note theme updates can take up to 1 minute to propagate to all site pages.');
        completeChecklistItem(projectSlug, 'themeUpdated');
      }

      editor.setOption('readOnly', false);
      block.classList.remove('is-saving');
      toggleLoading(false);
      aside.dataset.unsavedChanges = 'false';
    };

    block.querySelector('#save-button').onclick = async () => {
      saveTheme();
    };

    // MARK: Handles keyboard shortcut for saving
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveTheme();
      }
    });
  });
}
