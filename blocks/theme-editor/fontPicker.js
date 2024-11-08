import { createDialog } from '../../scripts/dialogs.js';
import { parseFragment, SCRIPT_API } from '../../scripts/scripts.js';

const fontWeights = ['300', '400', '700'];
const fontsKey = 'AIzaSyDJEbwD5gSSwekxhVJKKCQdzWegzhDGPps';
const fontWeightLabels = {
  300: 'Light',
  400: 'Regular',
  700: 'Bold',
};

export default async function initFontPicker({
  varsObj,
  editor,
  block,
  warning,
  getCSSVars,
  findCSSVar,
}) {
  const googleFonts = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${fontsKey}&capability=WOFF2&sort=popularity`)
    .then((req) => req.json())
    .catch(() => null);

  if (!googleFonts) {
    throw new Error('Failed to load Google Fonts.'); // shouldn't cause block to fail b/c we're in async
  }

  const validFonts = googleFonts.items.filter(
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

  const dropdownFonts = [
    ...validFonts.slice(0, 10),
    ...defaultFonts.map((font) => ({ family: font })),
  ];
  console.log('dropdownFonts:', dropdownFonts);

  // customFonts = [
  //   ...customFonts,
  //   ...defaultFonts.map((font) => ({ family: font }))
  // ].sort((a, b) => {
  //   if (a.family < b.family) {
  //     return -1;
  //   }
  //   if (a.family > b.family) {
  //     return 1;
  //   }
  //   return 0;
  // });

  const updateFonts = async (selectedFont, newFont) => {
    const selectedFonts = [...block.querySelectorAll('.font-picker')].map((el) => el.value);
    const selectedCustomFonts = selectedFonts.filter((font) => !defaultFonts.includes(font));

    if (selectedCustomFonts.length) {
      const searchParams = new URLSearchParams();
      searchParams.set('display', 'swap');

      const fallbackFonts = [];
      selectedCustomFonts.forEach((customFont) => {
        const { files } = dropdownFonts.find(({ family }) => customFont === family);

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
        varsObj.cssFonts = await req.text();

        // Update editor
        editor.setValue(
          editor
            .getValue()
            .replace(
              `--${selectedFont.name}:${selectedFont.fullValue}`,
              `--${selectedFont.name}: '${newFont}', '${newFont} Fallback', sans-serif`,
            ),
        );

        varsObj.cssVars = getCSSVars(editor.getValue());
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

        varsObj.cssVars = getCSSVars(editor.getValue());
      });
    }
  };

  const dropdownFontStyles = document.createElement('style');
  dropdownFontStyles.className = 'dropdown-fonts';
  document.head.append(dropdownFontStyles);
  const appendFontStyles = ({ family, files, variants }) => {
    const urlProperty = files.regular || files['400'] || files['300'] || files[variants[0]];
    dropdownFontStyles.innerHTML += `@font-face {font-family: '${family}'; font-display: swap; font-weight: regular; font-style: normal; src:url(${urlProperty}) format('woff2');}\n`;
  };

  const appendOption = (selectElement, { family, files, variants }) => {
    const option = parseFragment(`<option value="${family}" style="font-family: '${family}', sans-serif;" >${family}</option>`);
    if (files) {
      // google fonts
      appendFontStyles({ family, files, variants });
    }
    selectElement.append(option);
    return option;
  };

  const moreFontsSelectionDialog = (selectElement) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'more-font-selection-wrapper';

    wrapper.innerHTML = /* html */`
      <aside class="font-list">
        <ul></ul>
      </aside>
      <div class="preview">
        <h1 class="heading1">Main Heading</h1>
        <h2 class="heading2">Sub Heading</h2>
        <p class="paragraph">Lorem ipsum dolor sit amet consectetur adipisicing elit. Sapiente enim exercitationem alias delectus, voluptates accusantium voluptas itaque accusamus illo saepe? Nesciunt quod itaque maxime! Deserunt temporibus quia vel autem consectetur nulla aspernatur facilis ratione repellendus odio commodi rerum, sed voluptatem, doloremque officia molestiae recusandae iste consequatur ipsam. Corporis, nostrum minima!</p>
      </div>
    `;

    const fontList = wrapper.querySelector('ul');
    const preview = wrapper.querySelector('.preview');

    const itemViewObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          console.log('\x1b[34m ~ TEST:', entry.target.dataset.value);
          appendFontStyles(validFonts[entry.target.dataset.index]);

          observer.unobserve(entry.target);
        }
      });
    }, { root: fontList });

    const liOnclick = (event) => {
      event.target.classList.add('is-selected');
      fontList.dataset.selectedIndex = event.target.dataset.index;
      preview.style.fontFamily = event.target.style.fontFamily;
    };

    validFonts.forEach((font, index) => {
      const li = document.createElement('li');
      li.classList.add('font-item');
      li.dataset.value = font.family;
      li.innerText = font.family;
      li.dataset.index = index;
      li.style.fontFamily = `font-family: '${font.family}', sans-serif;`;
      fontList.append(li);
      // adding fontfamily when visible
      if (!dropdownFontStyles.innerHTML.includes(font.family)) {
        itemViewObserver.observe(li);
      }
      li.onclick = liOnclick;
    });
    fontList.children[0].click();

    const confirmButton = document.createElement('button');
    confirmButton.className = 'button action primary';
    confirmButton.innerText = 'Confirm';

    const dialog = createDialog(wrapper, [confirmButton], { fullscreen: true });

    confirmButton.onclick = () => {
      appendOption(selectElement, validFonts[fontList.dataset.selectedIndex]); // add selected font
      selectElement.value = validFonts[fontList.dataset.selectedIndex].family;
      selectElement.onchange();
      dialog.close();
    };
  };

  block.querySelectorAll('.font-picker').forEach((el) => {
    let selectedFont = findCSSVar(varsObj.cssVars, el.dataset.var, true);
    // el.innerHTML = `${dropdownFonts
    //   .map(
    //     ({ family }) => `<option ${family === selectedFont?.value ? 'selected' : ''} value="${family}">${family}</option>`,
    //   )
    //   .join('')}`;
    dropdownFonts.forEach((gFont) => {
      appendOption(el, gFont);
      // const option = appendOption(el, gFont);
      // if (gFont.family === selectedFont.value) {
      //   option.selected = true;
      // }
    });

    el.onchange = () => {
      if (el.value === 'MORE...') {
        moreFontsSelectionDialog(el);
        return;
      }
      selectedFont = findCSSVar(varsObj.cssVars, el.dataset.var, true);
      updateFonts(selectedFont, el.value);
      warning.hidden = false;
      el.style.fontFamily = el.querySelector(`option[value="${el.value}"]`).style.fontFamily;
    };

    // set selection to currently used font
    let selectedFontOption = el.querySelector(`option[value="${el.value}"]`);
    if (!selectedFontOption) {
      // add selected font, if it was not in the reduced list
      selectedFontOption = appendOption(el, validFonts.find(
        (gFont) => gFont.family === selectedFont.value,
      ));
    }
    el.value = selectedFontOption.value;
    el.style.fontFamily = selectedFontOption.style.fontFamily;

    const moreOption = document.createElement('option');
    moreOption.value = 'MORE...';
    moreOption.innerText = 'More...';
    el.append(moreOption);
  });
}
