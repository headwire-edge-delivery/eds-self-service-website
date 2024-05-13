import { SCRIPT_API } from '../../scripts/scripts.js';
import createForm from './generateForm.js';

async function onFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  form.classList.add('loading');
  const data = new FormData(form);
  const response = await fetch(`${SCRIPT_API}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(data)),
  });
  // if (response.ok) {
  //   form.disabled = true;
  // }
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
