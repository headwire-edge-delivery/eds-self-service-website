import { toCamelCase, toClassName } from "../../scripts/aem.js";
import { getPlaceholder } from "../../scripts/scripts.js";

const ids = [];
function generateFieldId(fieldData, suffix = "") {
  const slug = toClassName(`form-${fieldData.name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : "";
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(field, fieldData, placeholders) {
  const label = document.createElement("label");
  label.id = generateFieldId(fieldData, "-label");
  const labelContent = placeholders?.[toCamelCase(fieldData["label-placeholder"])] || fieldData["label-placeholder"] || fieldData.name;
  label.innerHTML = `<span class="label-text">${labelContent}</span>`;
  label.dataset.requiredField = fieldData?.required?.toLowerCase() === "true";
  if (fieldData.labelFor) {
    label.setAttribute("for", fieldData.labelFor);
  }
  label.append(field);
  return label;
}

function setCommonAttributes(field, fieldData, placeholders, index) {
  if (!field.id) field.id = fieldData.id;
  if (!field.name) field.name = fieldData.name;
  if (!field.required) field.required = fieldData.required.toLowerCase() === "true";
  if (!field.placeholder) {
    field.placeholder = placeholders?.[toCamelCase(fieldData["example-placeholder"])] || fieldData["example-placeholder"] || fieldData.name || "";
  }
  if (!field.dataset.index) field.dataset.index = index;
}

const createSelect = async (fieldData) => {
  const select = document.createElement("select");
  select.className = "button secondary action";

  const options = fieldData.options.split(",").map((option) => option.trim());

  options.forEach((option, index) => {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.innerText = option;
    optionElement.dataset.index = index;
    select.append(optionElement);
  });

  const defaultOption = fieldData["default-value"] || "";
  select.value = defaultOption;

  return select;
};

const createTextArea = (fieldData) => {
  const field = document.createElement("textarea");
  field.value = fieldData["default-value"] || "";

  field.oninput = () => {
    if (field.dataset.disableAutoResize) return;
    // + 2 for the border
    field.style.height = `${field.scrollHeight + 2}px`;
  };

  return field;
};

const createInput = (fieldData) => {
  const field = document.createElement("input");
  field.type = fieldData.type.toLowerCase();
  field.value = fieldData["default-value"] || "";

  return field;
};

const createToggle = (fieldData) => {
  const field = createInput(fieldData);
  field.type = "checkbox";
  if (!field.value) field.value = "on";
  field.classList.add("toggle");

  const toggleSwitch = document.createElement("div");
  toggleSwitch.classList.add("switch");
  toggleSwitch.append(field);

  const slider = document.createElement("span");
  slider.classList.add("slider");
  toggleSwitch.append(slider);
  slider.addEventListener("click", () => {
    field.checked = !field.checked;
  });

  return toggleSwitch;
};

const createCheckbox = (fieldData) => {
  const field = createInput(fieldData);
  if (fieldData["default-value"]) field.checked = true;

  // string value sent when checkbox is checked.
  field.value = "yes";

  return field;
};

const createRadio = (fieldData, placeholders, index) => {
  const fieldSet = document.createElement("fieldset");
  const radioNames = generateFieldId(fieldData, "-radio");
  const radioChoiceRequired = fieldData.required.toLowerCase() === "true";
  fieldData.options.split(",").forEach((option) => {
    // eslint-disable-next-line no-param-reassign
    option = option.trim();
    const field = createInput(fieldData, index);
    field.value = option;
    field.id = option;
    field.name = radioNames;
    field.required = radioChoiceRequired;
    if (option === fieldData["default-value"]) {
      field.checked = true;
    }
    const label = createLabel(field, { name: option, id: "" });
    fieldSet.append(label);
  });

  return fieldSet;
};

const onTelInput = (event) => {
  event.target.value = event.target.value.replace(/[^0-9+]/g, "");
};

const createPhoneNumber = (fieldData) => {
  const field = createInput(fieldData);
  field.type = "tel";

  field.oninput = onTelInput;

  return field;
};

const onNumInput = (event) => {
  event.target.value = event.target.value.replace(/[^0-9]/g, "");
};

const createNumber = (fieldData) => {
  const field = createInput(fieldData);
  field.type = "number";

  field.oninput = onNumInput;
  return field;
};

const createGroup = (fieldData) => {
  const group = document.createElement("div");
  group.classList.add("group");
  if (fieldData.name) group.classList.add(fieldData.name);
  return group;
};

const FIELD_CREATOR_FUNCTIONS = {
  number: createNumber,
  "phone number": createPhoneNumber,
  dropdown: createSelect,
  "text area": createTextArea,
  toggle: createToggle,
  checkbox: createCheckbox,
  radio: createRadio,
  group: createGroup,
};

async function createField(fieldData, form, placeholders, index) {
  fieldData.id = fieldData.id || placeholders[toCamelCase(fieldData["label-placeholder"])] || fieldData["label-placeholder"] || index;
  const type = fieldData.type?.toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  if (type === "fieldset" || type === "radio") {
    fieldData.labelFor = "null";
  }
  const field = await createFieldFunc(fieldData, placeholders, index);
  setCommonAttributes(field, fieldData, placeholders, index);
  if (type !== "group") {
    const label = createLabel(field, fieldData, placeholders);
    return label;
  }
  return field;
}

export default async function createForm(formConfigPath) {
  const [resp, placeholders] = await Promise.all([fetch(formConfigPath), getPlaceholder(null)]);
  const json = await resp.json();

  const form = document.createElement("form");

  const fields = await Promise.all(json.data.map((fieldData, index) => createField(fieldData, form, placeholders, index)));

  fields.forEach((field, index) => {
    if (form.contains(field)) {
      // already in group
      return;
    }
    // when we find a group, place items below it, inside it.
    // Stop when finding another group or end of list
    if (field.classList.contains("group")) {
      for (let i = index + 1; i < fields.length; i += 1) {
        const nextItem = fields[i];
        if (nextItem.classList.contains("group")) {
          break;
        }
        field.append(nextItem);
      }
    }
    form.append(field);
  });

  form.insertAdjacentHTML("beforeend", `<button class="button" type="submit">${placeholders.formButtonSubmit || "Send"}</button>`);

  return form;
}
