import { decorateIcons } from '../../scripts/aem.js';

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const steps = block.querySelectorAll(':scope > div');

  const prevTemplate = document.createElement('button');
  prevTemplate.className = 'button prev secondary';
  prevTemplate.textContent = 'Previous';

  steps.forEach((step, i) => {
    const buttonContainer = step.querySelector('.button-container:last-child');
    if (buttonContainer) {
      const button = buttonContainer.querySelector('a');
      button.classList.add('next');

      if (i === 0) {
        step.classList.add('is-selected');
      } else {
        buttonContainer.prepend(prevTemplate.cloneNode(true));
      }
    }
  });

  const selectStep = (event) => {
    event.preventDefault();

    const isNext = event.target.classList.contains('next');
    const selectedStep = block.querySelector(':scope > div.is-selected');
    const siblingStep = selectedStep[isNext ? 'nextElementSibling' : 'previousElementSibling'];
    if (siblingStep) {
      siblingStep.scrollIntoView();

      selectedStep.classList.remove('is-selected');
      siblingStep.classList.add('is-selected');

      siblingStep.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        img.removeAttribute('loading');
      });
    }
  };

  block.addEventListener('click', (event) => {
    if (event.target.matches('.next') || event.target.matches('.prev')) {
      selectStep(event);
    }
  });

  const templates = block.querySelector('a[href="/templates.json"]');
  if (templates) {
    const templateContainer = document.createElement('div');
    templateContainer.className = 'template-container';
    templates.parentElement.replaceWith(templateContainer);

    fetch(templates.href).then((req) => req.json()).then(({ data }) => {
      templateContainer.innerHTML = data.map(({ id, name, description }, i) => `
          <div class="template ${i === 0 ? 'is-selected' : ''}">
            <h3>${name}</h3>
            <p>${description}</p>
            <div class="carousel">
                <img alt="" src="/assets/${id}/image1.png" loading="lazy" class="is-selected"/>
                <img alt="" src="/assets/${id}/image2.png" loading="lazy"/>
                <img alt="" src="/assets/${id}/image3.png" loading="lazy"/>
                <img alt="" src="/assets/${id}/image4.png" loading="lazy"/>
                <div class="dots">
                    <div class="dot is-selected"></div>
                    <div class="dot"></div>
                    <div class="dot "></div>
                    <div class="dot"></div>
                </div>
            </div>
          </div>
        `).join('');

      templateContainer.addEventListener('click', (event) => {
        if (event.target.matches('.dot:not(.is-selected)')) {
          const dots = event.target.parentElement;
          const index = [...dots.children].indexOf(event.target) + 1;
          const template = event.target.closest('.template');

          template.querySelector('img.is-selected').classList.remove('is-selected');
          template.querySelector(`img:nth-child(${index})`).classList.add('is-selected');

          dots.querySelector('.is-selected').classList.remove('is-selected');
          event.target.classList.add('is-selected');
        }
      });
    });
  }

  const createStep = block.querySelector(':scope > div:has(a[href="#create"])');
  if (createStep) {
    const input = document.createElement('input');
    input.placeholder = 'SITE NAME';
    createStep.querySelector('h2').after(input);
  }

  const statusStep = block.querySelector(':scope > div:has(a[href="#edit"])');
  if (statusStep) {
    const list = statusStep.querySelector('ul');
    list.firstElementChild.insertAdjacentHTML('afterbegin', '<span class="icon icon-check"></span>');
    list.firstElementChild.nextElementSibling.insertAdjacentHTML('afterbegin', '<span class="icon icon-sync"></span>');
    list.lastElementChild.insertAdjacentHTML('afterbegin', '<span class="icon icon-error"></span>');
    decorateIcons(list);
  }

  const successStep = block.lastElementChild;
  if (successStep) {
    successStep.querySelectorAll('a').forEach((el) => {
      el.classList.add('button');
    });
  }
}
