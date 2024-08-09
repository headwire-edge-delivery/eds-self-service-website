/* eslint-disable no-restricted-globals */

function hexToRgb(hexValue) {
  if (!hexValue) return;

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hexValue = hexValue.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexValue);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(lum1, lum2) {
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

function calculateContrast(hex1, hex2) {
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
    AA: ratio >= 4.5,
    AAA: ratio >= 7,
  };
}

const importantCSSVars = [
  'background-color-main',
  'background-color-header',
  'background-color-footer',
  'text-color-header',
  'text-color-main',
  'text-color-links',
  'text-color-links-hover',
  'button-color-text',
  'button-color-background',
  'button-color-text-hover',
  'button-color-background-hover',
  'button-primary-color-text',
  'button-primary-color-background',
  'button-primary-color-text-hover',
  'button-primary-color-background-hover',
  'button-secondary-color-text',
  'button-secondary-color-background',
  'button-secondary-color-text-hover',
  'button-secondary-color-background-hover',
];

self.addEventListener('message', (event) => {
  if (event.data.type !== 'contrastCheck') {
    return;
  }

  console.log('contrastCheck:', event.data);
  // console.log(window);

  self.postMessage({
    type: 'contrastCheck',
    something: 'color',
  });
});
