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

function hexToRgb(hexValue) {
  if (!hexValue) return null;

  // Expand shorthand
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHexValue = hexValue.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHexValue);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

function luminance(r, g, b) {
  const a = [r, g, b].map((value) => {
    const rsValue = value / 255;
    return rsValue <= 0.03928 ? rsValue / 12.92 : ((rsValue + 0.055) / 1.055) ** 2.4;
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(lum1, lum2) {
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

function calculateContrast(hex1, hex2, aaThreshold = 4.5, aaaThreshold = 7) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) {
    return { error: 'Invalid color input' };
  }

  const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const ratio = contrastRatio(lum1, lum2);

  return {
    ratio: ratio.toFixed(2),
    AA: ratio >= aaThreshold,
    AAA: ratio >= aaaThreshold,
  };
}

// large text like headings aren't as strict with contrast ratio.
// https://www.w3.org/TR/WCAG21/#contrast-minimum
// https://www.w3.org/TR/WCAG22/#contrast-enhanced
const contrastThresholdMap = {
  'heading-color': {
    AA: 3,
    AAA: 4.5,
  },
  default: {
    AA: 4.5,
    AAA: 7,
  },
};

function getRequiredContrastThreshold(name1, name2) {
  const name1Thresholds = contrastThresholdMap[name1] || contrastThresholdMap.default;
  const name2Thresholds = contrastThresholdMap[name2] || contrastThresholdMap.default;

  return {
    AA: Math.min(name1Thresholds.AA, name2Thresholds.AA),
    AAA: Math.min(name1Thresholds.AAA, name2Thresholds.AAA),
  };
}

// Commented out variables are checked by through evaluation of counterparts.
// They are still here to help visualize relationships between colors.
const cssVariableMap = {
  // backgrounds
  'background-color': {
    // shouldContrastWith: ['heading-color', 'text-color', 'link-color', 'link-color-hover'],
  },
  'header-background-color': {
    // shouldContrastWith: ['link-color', 'link-color-hover'],
  },
  // text colors
  'heading-color': {
    shouldContrastWith: ['background-color'],
  },
  'text-color': {
    shouldContrastWith: ['background-color'],
  },
  'link-color': {
    shouldContrastWith: ['background-color', 'header-background-color'],
  },
  'link-color-hover': {
    shouldContrastWith: ['background-color', 'header-background-color'],
  },
  // button default
  'button-text-color': {
    shouldContrastWith: ['button-background-color'],
  },
  'button-background-color': {
    // shouldContrastWith: ['button-text-color'],
  },
  'button-text-color-hover': {
    shouldContrastWith: ['button-background-color-hover'],
  },
  'button-background-color-hover': {
    // shouldContrastWith: ['button-text-color-hover'],
  },
  // button primary
  'button-primary-text-color': {
    shouldContrastWith: ['button-primary-background-color'],
  },
  'button-primary-background-color': {
    // shouldContrastWith: ['button-primary-text-color'],
  },
  'button-primary-text-color-hover': {
    shouldContrastWith: ['button-primary-background-color-hover'],
  },
  'button-primary-background-color-hover': {
    // shouldContrastWith: ['button-primary-text-color-hover'],
  },
  // button secondary
  'button-secondary-text-color': {
    shouldContrastWith: ['button-secondary-background-color'],
  },
  'button-secondary-background-color': {
    // shouldContrastWith: ['button-secondary-text-color'],
  },
  'button-secondary-text-color-hover': {
    shouldContrastWith: ['button-secondary-background-color-hover'],
  },
  'button-secondary-background-color-hover': {
    // shouldContrastWith: ['button-secondary-text-color-hover'],
  },
  // inputs
  'input-text-color': {
    shouldContrastWith: ['input-background-color'],
  },
  'input-background-color': {
    // shouldContrastWith: ['input-text-color'],
  },
  // footer
  'footer-background-color': {
    shouldContrastWith: ['footer-link-color', 'footer-link-color-hover', 'footer-text-color'],
  },
  'footer-link-color': {
    shouldContrastWith: ['footer-background-color'],
  },
  'footer-link-color-hover': {
    shouldContrastWith: ['footer-background-color'],
  },
  'footer-text-color': {
    shouldContrastWith: ['footer-background-color'],
  },
};

function evaluateVariable(obj, value) {
  if (value?.startsWith('var(')) {
    const varName = value.replace('var(', '').replace(')', '').trim();
    const newValue = obj[varName].value;

    if (!newValue) {
      return null;
    }
    if (newValue?.startsWith('var(')) {
      return evaluateVariable(obj, newValue);
    }
    return newValue;
  }

  return value;
}

function handler(event) {
  if (event.data.type !== 'contrastCheck') {
    return;
  }
  const cssVars = getCSSVars(event.data.css);
  const eventCssVars = cssVars.reduce((output, cssVar) => {
    let [varName, value] = cssVar.split(':');
    varName = varName.replaceAll('--', '').trim();
    value = value.replaceAll('--', '').trim();

    // only get values of variables we care about
    output[varName] = { value };

    return output;
  }, {});

  const eventVarsKeys = Object.keys(eventCssVars);

  // vars into values
  for (let index = 0; index < eventVarsKeys.length; index += 1) {
    const { value } = eventCssVars[eventVarsKeys[index]];
    const evaluatedValue = evaluateVariable(eventCssVars, value);
    if (evaluatedValue) {
      eventCssVars[eventVarsKeys[index]] = { value: evaluatedValue };
    }
  }

  // filter out vars we don't care about
  const filteredCssVars = Object.keys(eventCssVars).reduce((output, key) => {
    if (cssVariableMap[key]) {
      output[key] = eventCssVars[key];
    }
    return output;
  }, {});

  const mapKeys = Object.keys(cssVariableMap);
  const filteredCssVarsKeys = Object.keys(filteredCssVars);
  if (filteredCssVarsKeys.length !== mapKeys.length) {
    // eslint-disable-next-line no-console
    console.warn('filteredCssVars has missing keys:', mapKeys - filteredCssVarsKeys);
  }

  const contrastIssues = [];

  for (let index = 0; index < filteredCssVarsKeys.length; index += 1) {
    const varKey = filteredCssVarsKeys[index];

    const { shouldContrastWith } = cssVariableMap[varKey];

    if (!shouldContrastWith?.length) continue;
    for (let j = 0; j < shouldContrastWith.length; j += 1) {
      const requiredThresholds = getRequiredContrastThreshold(varKey, shouldContrastWith[j]);
      const { ratio, AA, AAA } = calculateContrast(filteredCssVars[varKey].value, filteredCssVars[shouldContrastWith[j]].value, requiredThresholds.AA, requiredThresholds.AAA);

      if (!AA || !AAA) {
        contrastIssues.push({
          var1: varKey,
          var2: shouldContrastWith[j],
          ratio,
          AA,
          AAA,
        });
      }
    }
  }
  self.postMessage({
    type: 'contrastCheck',
    evaluatedCssVars: filteredCssVars,
    contrastIssues,
  });
}

self.addEventListener('message', handler);
