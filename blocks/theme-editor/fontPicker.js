import { parseFragment, SCRIPT_API } from "../../scripts/scripts.js";

const fontWeights = ["300", "400", "700"];
const fontsKey = "AIzaSyDJEbwD5gSSwekxhVJKKCQdzWegzhDGPps";

export default async function initFontPicker({ varsObj, editor, block, warning, getCSSVars, findCSSVar }) {
  const googleFonts = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${fontsKey}&capability=WOFF2&sort=popularity`)
    .then((req) => req.json())
    .catch(() => null);

  if (!googleFonts) {
    throw new Error("Failed to load Google Fonts."); // shouldn't cause block to fail b/c we're in async
  }

  const validFonts = googleFonts.items.filter(
    ({ subsets, variants }) => subsets.includes("latin") && fontWeights.every((weight) => variants.includes(weight === "400" ? "regular" : weight)),
  );

  const defaultFonts = ["Arial", "Verdana", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Garamond", "Courier New"];

  const dropdownFonts = [...validFonts.slice(0, 10), ...defaultFonts.map((font) => ({ family: font }))];

  const updateFonts = async (selectedFont, newFont) => {
    const selectedFonts = [...block.querySelectorAll(".font-picker")].map((el) => el.value);
    const selectedCustomFonts = selectedFonts.filter((font) => !defaultFonts.includes(font));

    if (selectedCustomFonts.length) {
      const searchParams = new URLSearchParams();
      searchParams.set("display", "swap");

      const fallbackFonts = [];
      selectedCustomFonts.forEach((customFont) => {
        const { files } = dropdownFonts.find(({ family }) => customFont === family);

        searchParams.append("family", `${customFont}:wght@300;400;700`);

        fontWeights.forEach((weight) => {
          fallbackFonts.push(
            fetch(`${SCRIPT_API}/font-fallback`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                name: customFont,
                url: files[weight === "400" ? "regular" : weight],
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
        editor.setValue(editor.getValue().replace(`--${selectedFont.name}:${selectedFont.fullValue}`, `--${selectedFont.name}: '${newFont}', '${newFont} Fallback', sans-serif`));

        varsObj.cssVars = getCSSVars(editor.getValue());
      }

      Promise.allSettled(fallbackFonts).then((res) => {
        let newValue = editor.getValue();

        // Remove fallback fonts
        const indexOf = newValue.indexOf("@font-face");
        if (indexOf !== -1) {
          newValue = newValue.substr(0, newValue.indexOf("@font-face"));
        }

        // Add new fallback fonts
        newValue += `${res
          .filter(({ status }) => status === "fulfilled")
          .map(({ value }) => value)
          .join("\n")}`;

        // Update editor
        editor.setValue(newValue);

        varsObj.cssVars = getCSSVars(editor.getValue());
      });
    }
  };

  const dropdownFontStyles = document.createElement("style");
  dropdownFontStyles.className = "dropdown-fonts";
  document.head.append(dropdownFontStyles);
  const appendFontStyles = ({ family, files, variants }) => {
    const urlProperty = files.regular || files["400"] || files["300"] || files[variants[0]];
    dropdownFontStyles.innerHTML += `@font-face {font-family: '${
      family
    }'; font-display: swap; font-weight: regular; font-style: normal; src:url(${urlProperty}) format('woff2');}\n`;
  };

  const appendOption = (selectElement, { family, files, variants }) => {
    const existingOption = selectElement.querySelector(`option[value="${family}"]`);
    if (existingOption) {
      return existingOption;
    }

    const option = parseFragment(`<option value="${family}" style="font-family: '${family}', sans-serif;" >${family}</option>`);
    if (files) {
      // google fonts
      appendFontStyles({ family, files, variants });
    }
    selectElement.append(option);
    dropdownFonts.push({ family, files, variants });
    return option;
  };

  const initMoreFontsPicker = (selectElement) => {
    const moreFontsPicker = parseFragment(`
      <div class="more-fonts-picker">
        <div class="wrapper">
          <div class="font-list">
            <div class="filters">
              <input type="search" placeholder="Search fonts" class="font-filter" />
              <select class="sort-select">
                <option selected value="popularity">Popularity</option>
                <option value="alpha">A - Z</option>
                <option value="reverse-alpha">Z - A</option>
                <option value="mod-date">Last Updated</option>
              </select>
              <select class="category-select">
              </select>
            </div>
            <ul></ul>
          </div>
          <div class="button-container">
              <button class="button action secondary close-button">Close</button>
          </div>
        </div>
      </div>
    `);

    const fontList = moreFontsPicker.querySelector("ul");
    const searchInput = moreFontsPicker.querySelector(".font-filter");
    const categorySelect = moreFontsPicker.querySelector(".category-select");
    const closeButton = moreFontsPicker.querySelector(".close-button");

    closeButton.onclick = () => {
      moreFontsPicker.nextElementSibling.hidden = false;
    };

    const categoriesMap = { all: true };
    const currentFilters = {
      category: "all",
      search: searchInput.value,
    };
    const sortSelect = moreFontsPicker.querySelector(".sort-select");
    const fontItems = [];

    // MARK: Observer
    const itemViewObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            appendFontStyles(validFonts[entry.target.dataset.index]);

            observer.unobserve(entry.target);
          }
        });
      },
      { root: fontList },
    );

    const liOnclick = (event) => {
      fontList.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
      event.target.classList.add("is-selected");
      fontList.dataset.selectedIndex = event.target.dataset.index;

      appendOption(selectElement, validFonts[fontList.dataset.selectedIndex]); // add selected font
      selectElement.value = validFonts[fontList.dataset.selectedIndex].family;
      selectElement.onchange();
    };

    validFonts.forEach((font, index) => {
      const li = document.createElement("li");
      li.classList.add("font-item");
      if (selectElement.value === font.family) {
        li.classList.add("is-selected");
      }
      li.dataset.value = font.family;
      li.dataset.category = font.category;
      if (!categoriesMap[font.category]) {
        // add new categories
        categoriesMap[font.category] = true;
      }
      li.dataset.lastModified = Date.parse(font.lastModified);
      li.innerText = font.family;
      li.dataset.index = index;
      li.style.fontFamily = `'${font.family}', sans-serif`;
      fontList.append(li);
      // adding fontfamily when visible
      if (!dropdownFontStyles.innerHTML.includes(font.family)) {
        itemViewObserver.observe(li);
      }
      li.onclick = liOnclick;
      fontItems.push(li);
    });

    const filterFonts = () => {
      for (let i = 0; i < fontItems.length; i += 1) {
        const currItem = fontItems[i];
        currItem.hidden = null;

        // search check
        if (currentFilters?.search?.length && !currItem.dataset.value.toLowerCase().includes(currentFilters.search.toLowerCase())) {
          currItem.hidden = true;
          continue;
        }

        // category check
        if (currentFilters?.category !== "all" && currItem.dataset.category !== currentFilters.category) {
          currItem.hidden = true;
          continue;
        }
      }
    };

    // MARK: filter
    Object.keys(categoriesMap).forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.innerText = category;
      categorySelect.append(option);
    });

    searchInput.oninput = () => {
      currentFilters.search = searchInput.value;
      filterFonts();
    };

    categorySelect.onchange = () => {
      currentFilters.category = categorySelect.value;
      filterFonts();
    };

    // MARK: sort
    const sortFnLookup = {
      popularity: (a, b) => Number(a.dataset.index) - Number(b.dataset.index),
      alpha: (a, b) => a.dataset.value.localeCompare(b.dataset.value),
      "reverse-alpha": (a, b) => b.dataset.value.localeCompare(a.dataset.value),
      "mod-date": (a, b) => Number(a.dataset.lastModified) - Number(b.dataset.lastModified),
    };
    sortSelect.onchange = () => {
      if (!sortFnLookup[sortSelect.value]) return;

      fontItems.sort(sortFnLookup[sortSelect.value]);
      fontList.append(...fontItems);
      filterFonts();
    };

    selectElement.after(moreFontsPicker);
  };

  block.querySelectorAll(".font-picker").forEach((el) => {
    let selectedFont = findCSSVar(varsObj.cssVars, el.dataset.var, true);
    dropdownFonts.forEach((gFont) => {
      appendOption(el, gFont);
    });

    el.onchange = () => {
      selectedFont = findCSSVar(varsObj.cssVars, el.dataset.var, true);
      updateFonts(selectedFont, el.value);
      warning.hidden = false;
      el.style.fontFamily = el.querySelector(`option[value="${el.value}"]`).style.fontFamily;
    };

    // set selection to currently used font
    let selectedFontOption = el.querySelector(`option[value="${selectedFont.value}"]`);
    if (!selectedFontOption) {
      // add selected font, if it was not in the reduced list
      selectedFontOption = appendOption(
        el,
        validFonts.find((gFont) => gFont.family === selectedFont.value),
      );
    }
    el.value = selectedFontOption.value;
    el.style.fontFamily = selectedFontOption.style.fontFamily;

    el.nextElementSibling.onclick = (event) => {
      event.target.hidden = true;
      if (!el.nextElementSibling.classList.contains("more-fonts-picker")) {
        initMoreFontsPicker(el);
      }
    };
  });
}
