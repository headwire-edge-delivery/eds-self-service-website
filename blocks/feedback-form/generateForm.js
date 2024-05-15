import { toCamelCase, toClassName } from '../../scripts/aem.js';
import { getPlaceholder } from '../../scripts/scripts.js';

const ids = [];
function generateFieldId(fieldData, suffix = '') {
  const slug = toClassName(`form-${fieldData.name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : '';
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(field, fieldData, placeholders) {
  const label = document.createElement('label');
  label.id = generateFieldId(fieldData, '-label');
  const labelContent = placeholders?.[toCamelCase(fieldData['label-placeholder'])] || fieldData['label-placeholder'] || fieldData.name;
  label.innerHTML = `<span class="label-text">${labelContent}</span>`;
  label.dataset.requiredField = fieldData?.required?.toLowerCase() === 'true';
  if (fieldData.labelFor) {
    label.setAttribute('for', fieldData.labelFor);
  }
  label.append(field);
  return label;
}

function setCommonAttributes(field, fieldData, placeholders, index) {
  field.id = fieldData.id;
  field.name = fieldData.name;
  field.required = fieldData.required.toLowerCase() === 'true';
  field.placeholder = placeholders?.[toCamelCase(fieldData['example-placeholder'])]
    || fieldData['example-placeholder']
    || fieldData.name
    || '';
  field.value = fieldData['default-value'] || '';
  field.dataset.index = index;
}

const createSelect = async (fieldData) => {
  const select = document.createElement('select');

  const options = fieldData.options.split(',').map((option) => option.trim());

  options.forEach((option, index) => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.innerText = option;
    optionElement.dataset.index = index;
    select.append(optionElement);
  });

  const defaultOption = fieldData['default-value'] || '';
  select.value = defaultOption;

  return select;
};

const createTextArea = (fieldData) => {
  const field = document.createElement('textarea');
  field.value = fieldData['default-value'] || '';

  return field;
};

const createInput = (fieldData) => {
  const field = document.createElement('input');
  field.type = fieldData.type.toLowerCase();
  field.value = fieldData['default-value'] || '';

  return field;
};

const createToggle = (fieldData) => {
  const field = createInput(fieldData);
  field.type = 'checkbox';
  if (!field.value) field.value = 'on';
  field.classList.add('toggle');

  const toggleSwitch = document.createElement('div');
  toggleSwitch.classList.add('switch');
  toggleSwitch.append(field);

  const slider = document.createElement('span');
  slider.classList.add('slider');
  toggleSwitch.append(slider);
  slider.addEventListener('click', () => {
    field.checked = !field.checked;
  });

  return toggleSwitch;
};

const createCheckbox = (fieldData, placeholders) => {
  const field = createInput(fieldData);
  if (fieldData['default-value']) field.checked = true;
  field.value = placeholders[toCamelCase(fieldData['label-placeholder'])] || fieldData['label-placeholder'] || fieldData.name;

  return field;
};

const createRadio = (fieldData, placeholders, index) => {
  const fieldSet = document.createElement('fieldset');
  const radioNames = generateFieldId(fieldData, '-radio');
  const radioChoiceRequired = fieldData.required.toLowerCase() === 'true';
  fieldData.options.split(',').forEach((option) => {
    // eslint-disable-next-line no-param-reassign
    option = option.trim();
    const field = createInput(fieldData, index);
    field.value = option;
    field.id = option;
    field.name = radioNames;
    field.required = radioChoiceRequired;
    if (option === fieldData['default-value']) {
      field.checked = true;
    }
    const label = createLabel(field, { name: option, id: '' });
    fieldSet.append(label);
  });

  return fieldSet;
};

const onTelInput = (event) => {
  event.target.value = event.target.value.replace(/[^0-9+]/g, '');
};

const createPhoneNumber = (fieldData) => {
  const field = createInput(fieldData);
  field.type = 'tel';

  field.oninput = onTelInput;

  return field;
};

const onNumInput = (event) => {
  event.target.value = event.target.value.replace(/[^0-9]/g, '');
};

const createNumber = (fieldData) => {
  const field = createInput(fieldData);
  field.type = 'number';

  field.oninput = onNumInput;
  return field;
};

const FIELD_CREATOR_FUNCTIONS = {
  number: createNumber,
  'phone number': createPhoneNumber,
  dropdown: createSelect,
  'text area': createTextArea,
  toggle: createToggle,
  checkbox: createCheckbox,
  radio: createRadio,
};

async function createField(fieldData, form, placeholders, index) {
  fieldData.id = fieldData.id
    || placeholders[toCamelCase(fieldData['label-placeholder'])]
    || fieldData['label-placeholder']
    || index;
  const type = fieldData.type?.toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  if (type === 'fieldset' || type === 'radio') {
    fieldData.labelFor = 'null';
  }
  const field = await createFieldFunc(fieldData, placeholders, index);
  setCommonAttributes(field, fieldData, placeholders, index);
  const label = createLabel(field, fieldData, placeholders);

  return label;
}

// function toggleFields(form, disable = true) {
//   form.querySelectorAll('input, textarea, select, button').forEach((field) => {
//     field.disabled = disable;
//   });
// }

// async function formSubmit(event, block, placeholders) {
//   event.preventDefault();

//   const formOverlay = document.createElement("div");
//   formOverlay.classList.add("form-overlay", "show");
//   formOverlay.innerHTML = `<div class="content">
//      <span>${placeholders.formSubmitting}</span>
//    </div>`;

//   block.append(formOverlay);
//   block.classList.add("overlay-open");

//   const server = window.location.href.startsWith("http://localhost")
//     ? "http://localhost:4000/"
//     : "https://eds-self-service-scripts.onrender.com/";

//   const data = new FormData(event.target);
//   const formObj = {};
//   // eslint-disable-next-line no-restricted-syntax
//   for (const pair of data.entries()) {
//     // eslint-disable-next-line prefer-destructuring
//     formObj[pair[0]] = pair[1];
//   }
//   // disable fields after reading, to prevent double submits
//   toggleFields(event.target, true);

//   const response = await fetch(`${server}form/${window.projectSlug}`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(formObj),
//   });

//   if (response.ok) {
//     formOverlay.innerHTML = `<div class="content"><span>${
//       response.status === 208 ? await response.text() : placeholders.formSuccess
//     }</span></div>`;
//   } else {
//     formOverlay.innerHTML = `<div class="content"><span>${placeholders.formFail}</span>
//         <button class="button submit">${
//       placeholders.formButtonRetry || "Retry"
//     }</button></div>`;
//     formOverlay.onclick = (e) => {
//       e.currentTarget.remove();
//       block.classList.remove("overlay-open");
//       toggleFields(event.target, false);
//     };
//   }
// }

export default async function createForm(formConfigPath, block, onSubmit) {
  const [resp, placeholders] = await Promise.all([fetch(formConfigPath), getPlaceholder(null)]);
  const json = await resp.json();

  const form = document.createElement('form');

  const fields = await Promise.all(
    json.data.map((fieldData, index) => createField(fieldData, form, placeholders, index)),
  );
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  form.insertAdjacentHTML(
    'beforeend',
    `<button class="button" type="submit">${placeholders.formButtonSubmit || 'Send'}</button>`,
  );

  if (onSubmit) {
    form.onsubmit = onSubmit;
  } else {
    // form.onsubmit = (event) => formSubmit(event, block, placeholders);
  }

  return form;
}
