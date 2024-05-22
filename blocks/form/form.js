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

async function onFeedbackFormSubmit(event) {
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

async function onSalesContactFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  data.append('timestamp', Date.now());

  disableForm(form, true);

  const response = await fetch(`${SCRIPT_API}/contactSales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(data)),
  });
  if (response.ok) {
    form.classList.add('success');
  } else {
    await window.alertDialog(OOPS);
    disableForm(form, false);
  }
  form.classList.remove('loading');
}

export default async function decorate(block) {
  const contactSalesVariation = block.classList.contains('contact-sales');
  const formSetupLink = block.querySelector('a[href]')?.href || '/feedback-form-setup.json';
  const form = await createForm(
    formSetupLink,
  );

  form.dataset.loadingMessage = 'Sending...';
  form.dataset.successMessage = contactSalesVariation ? 'Thank you for your inquiry. We will contact you soon!' : 'Thank you for your feedback.';

  form.addEventListener('submit', contactSalesVariation ? onSalesContactFormSubmit : onFeedbackFormSubmit);

  block.innerHTML = '';

  block.append(form);
}
