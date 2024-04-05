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
      } else if (i < 3) {
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
    if ((event.target.matches('.next') || event.target.matches('.prev')) && document.body.classList.contains('is-authenticated')) {
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
          <div id="${id}" class="template ${i === 0 ? 'is-selected' : ''}">
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
        } else if (event.target.closest('.template:not(.is-selected)')) {
          templateContainer.querySelector('.template.is-selected').classList.remove('is-selected');
          event.target.closest('.template').classList.add('is-selected');
        }
      });
    });
  }

  const createStep = block.querySelector(':scope > div:has(a[href="#create"])');
  const input = document.createElement('input');
  input.placeholder = 'SITE NAME';
  if (createStep) {
    createStep.querySelector('h2').after(input);
    const createButton = createStep.querySelector('a[href="#create"]');
    createButton.classList.add('is-disabled');

    input.oninput = () => {
      createButton.classList.toggle('is-disabled', input.value.length < 2);
    };
  }

  const statusStep = block.querySelector(':scope > div:has(a[href="#edit"])');
  if (statusStep) {
    const list = statusStep.querySelector('ul');
    list.querySelectorAll('li').forEach((el) => {
      el.insertAdjacentHTML('afterbegin', '<span class="icon icon-sync"></span><span class="icon icon-check"></span><span class="icon icon-error"></span>');
    });
    decorateIcons(list);
  }

  const successStep = block.lastElementChild;
  if (successStep) {
    successStep.querySelectorAll('a').forEach((el) => {
      el.classList.add('button');
    });
  }

  block.addEventListener('click', async (event) => {
    const identifier = event.target.getAttribute('href');
    if (identifier === '#start' && document.body.classList.contains('is-anonymous')) {
      window.auth0Client.loginWithRedirect();
    } else if (identifier === '#create') {
      const accessToken = await window.auth0Client.getTokenSilently();

      console.log(block.querySelector('.template.is-selected').id);
      console.log(input.value);
      console.log(accessToken);

      let index = 0;
      const editStep = block.querySelector(':scope > div:has(a[href="#edit"])');
      const list = editStep.querySelector('ul');

      const load = () => {
        const child = list.children[index];
        child.classList.add('is-loading');
        setTimeout(() => {
          child.classList.remove('is-loading');
          child.classList.add('is-done');
        }, 1000);

        index += 1;
      };

      load();

      const interval = setInterval(() => {
        if (index === list.childElementCount - 1) {
          clearInterval(interval);
          setTimeout(() => {
            editStep.querySelector('.button-container:has(a[href="#edit"])').classList.add('is-ready');
          }, 2000);
        }

        load();
      }, 2000);
    } else if (identifier === '#edit') {
      const accessToken = await window.auth0Client.getTokenSilently();

      console.log(accessToken);
    } else if (identifier === '#new') {
      window.location.reload();
    }
  });
}
