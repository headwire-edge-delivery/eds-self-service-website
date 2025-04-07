import { SCRIPT_API, onAuthenticated, OOPS, KESTREL_ONE, completeChecklistItem } from '../../scripts/scripts.js';
import renderSkeleton from '../../scripts/skeletons.js';
import { loadCSS } from '../../scripts/aem.js';
import { confirmDialog } from '../../scripts/dialogs.js';
import createBaseBlockHtml from './baseBlockHtml.js';
import initFontPicker from './fontPicker.js';
import { showErrorToast, showToast } from '../../scripts/toast.js';

let timer;
const debounce = (fn) => {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  timer = setTimeout(() => fn(), 500);
};

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
    const projectSlug = split[2];
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
            <a href="/site/${projectSlug}">
              ${projectSlug}
            </a>
          </div>
        </div>
        
        <div class="content with-skeleton">
          ${renderSkeleton('theme-editor')}
        </div>
      </div>`;

    // Load site theme
    const cssVarsData = await fetch(`https://preview--${projectSlug}.${KESTREL_ONE}/styles/vars.css`)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        throw new Error(res.status);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.log('error loading site theme:', error);
        return null;
      });

    if (!cssVarsData) {
      block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
      return;
    }

    block.innerHTML = createBaseBlockHtml(projectSlug);

    // Get CSS vars
    const varsObj = {
      cssVars: getCSSVars(cssVarsData),
      cssFonts: '',
    };
    // let cssVars = getCSSVars(cssVarsData);
    // const fontCss = '';

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
        previewFrame.contentWindow.postMessage(
          {
            type: 'getHeightInterval',
          },
          '*',
        );
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

    // eslint-disable-next-line no-restricted-syntax
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

    const findSelectedPreset = () => presets.find((preset) => preset.vars.every((cssVar) => varsObj.cssVars.includes(cssVar)));

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

      block.querySelector('.publish-theme').classList.remove('is-disabled');
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

    // MARK: Init font-weight picker
    const fontWeights = ['300', '400', '700'];
    const fontWeightLabels = {
      300: 'Light',
      400: 'Regular',
      700: 'Bold',
    };
    block.querySelectorAll('.weight-picker').forEach((el) => {
      let selectedFontWeight = findCSSVar(varsObj.cssVars, el.dataset.var);
      el.innerHTML = `${fontWeights
        .map((weight) => `<option ${weight === selectedFontWeight.value ? 'selected' : ''} value="${weight}">${fontWeightLabels[weight]}</option>`)
        .join('')}`;
      el.onchange = () => {
        const newValue = el.value;
        editor.setValue(editor.getValue().replace(`--${selectedFontWeight.name}:${selectedFontWeight.fullValue}`, `--${selectedFontWeight.name}: ${newValue}`));

        varsObj.cssVars = getCSSVars(editor.getValue());
        selectedFontWeight = findCSSVar(varsObj.cssVars, el.dataset.var);

        warning.hidden = false;
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
      let selectedColor = findCSSVar(varsObj.cssVars, input.dataset.var);

      if (el.classList.contains('base')) {
        input.value = selectedColor.value;
        const span = el.querySelector('span');
        if (span) {
          span.textContent = selectedColor.value.toUpperCase();
        }

        input.oninput = () => {
          const newValue = input.value.toUpperCase();
          selectedColor = findCSSVar(varsObj.cssVars, input.dataset.var);
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

          debounce(updatePreset);
        };
      } else if (el.classList.contains('elements')) {
        // Find base color
        const varValue = regExpVars.exec(selectedColor.value)?.[1].slice(2);
        select.innerHTML = `${defaultColors.map(({ label, value }) => `<option ${varValue === value ? 'selected' : ''} value="${value}">${label}</option>`).join()}`;

        input.value = findCSSVar(varsObj.cssVars, varValue).value?.toUpperCase();

        select.onchange = () => {
          const newValue = select.value;
          selectedColor = findCSSVar(varsObj.cssVars, input.dataset.var);
          const base = block.querySelector(`.base input[data-var="${newValue}"]`);
          input.value = base.value;

          // Update editor
          editor.setValue(editor.getValue().replace(`--${selectedColor.name}:${selectedColor.fullValue}`, `--${selectedColor.name}: var(--${newValue})`));

          // Update vars
          previewFrame.contentWindow.postMessage(
            {
              type: 'update:styles',
              styles: editor.getValue(),
              file: 'vars',
            },
            '*',
          );

          varsObj.cssVars = getCSSVars(editor.getValue());

          warning.hidden = false;

          debounce(updatePreset);
        };
      }
    });

    const publishThemeSelector = block.querySelector('.publish-theme-selector');

    // Load index to list pages
    fetch(`${SCRIPT_API}/index/${projectSlug}`)
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

        const pages = data.filter(({ path }) => !path.startsWith('/drafts/') && !path.startsWith('/emails/') && path !== '/footer' && path !== '/nav');

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
        anchorAside(); // this sometimes shifts content, reset aside
      });

    publishThemeSelector.onchange = () => {
      window?.zaraz?.track('click change theme preview');

      if (new URL(previewFrame.src).pathname !== publishThemeSelector.value) {
        previewFrame.classList.add('is-loading');
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
        // Loading timeout
        setTimeout(() => {
          previewFrame.classList.remove('is-loading');
        }, 2000);
      }
    };

    // MARK: save button
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

      if (failed) {
        showErrorToast();
      } else {
        showToast('Theme updated! Please note theme updates can take up to 1 minute to propagate to all site pages.');
      }

      completeChecklistItem(projectSlug, 'themeUpdated');

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
