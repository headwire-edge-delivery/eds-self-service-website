import { OOPS, SCRIPT_API } from '../../scripts/scripts.js';
import createForm from './generateForm.js';

function disableForm(form, disable = true) {
  form.classList.toggle('loading', disable);
  form.disabled = disable;
  form.tabindex = disable ? -1 : null;
  form.querySelectorAll('input, textarea, select, button').forEach((field) => {
    field.disabled = disable;
    field.tabindex = disable ? -1 : null;
  });
}

async function onFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  data.append('timestamp', Date.now());

  disableForm(form, true);

  const response = await fetch(`${SCRIPT_API}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(data)),
  });
  if (response.ok) {
    form.classList.add('success');
    form.addEventListener('click', () => {
      form.reset();
      form.classList.remove('success');
      disableForm(form, false);
    }, { once: true });
  } else {
    await window.alertDialog(OOPS);
    disableForm(form, false);
  }
  form.classList.remove('loading');
}

async function generateFeedbackForm(block) {
  const form = await createForm(
    '/feedback-form-setup.json',
    block,
    onFormSubmit,
  );
  block.append(form);
}

export default async function decorate(block) {
  block.innerHtml = '';

  generateFeedbackForm(block);
}
