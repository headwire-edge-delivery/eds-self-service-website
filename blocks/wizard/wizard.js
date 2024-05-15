import {
  slugMaxLength, slugify, SCRIPT_API, OOPS,
} from '../../scripts/scripts.js';

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const steps = block.querySelectorAll(':scope > div');
  steps.forEach((div) => div.classList.add('step'));

  const prevTemplate = document.createElement('button');
  prevTemplate.className = 'button prev secondary';
  prevTemplate.textContent = 'Back';

  steps.forEach((step, i) => {
    const buttonContainer = step.querySelector('.button-container:last-child');
    if (buttonContainer) {
      const button = buttonContainer.querySelector('a');
      button.classList.add('next');

      if (i === 0) {
        step.classList.add('is-selected');
      } else if (i < 2) {
        buttonContainer.prepend(prevTemplate.cloneNode(true));
      }
    }
  });

  block.querySelector('a[href="#edit"]').classList.add('is-disabled');

  const loader = document.createElement('div');
  loader.className = 'loader';
  block.querySelectorAll('.step:has(a[href="#edit"]) li').forEach((el, i) => {
    if (i === 0) {
      el.classList.add('is-loading');
    }
    el.prepend(loader.cloneNode(true));
  });

  const selectStep = (event) => {
    event.preventDefault();

    const isNext = event.target.closest('.next');
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

    if (siblingStep.querySelector('a[href="#template"]')) {
      block.classList.remove('show-buttons');
    }

    window.scrollTo(0, 0);
  };

  // Wizard prev and next action
  block.addEventListener('click', (event) => {
    if (
      (event.target.closest('.next') || event.target.closest('.prev'))
      && document.body.classList.contains('is-authenticated')
    ) {
      selectStep(event);
    }
  });

  // TODO replace templates json with endpoint ?
  const templates = block.querySelector('a[href="/templates.json"]');
  if (templates) {
    const templateContainer = document.createElement('div');
    templateContainer.className = 'template-container';
    templates.parentElement.replaceWith(templateContainer);

    fetch(templates.href)
      .then((req) => req.json())
      .then(({ data }) => {
        templateContainer.innerHTML = data
          .map(
            ({
              id, name, description, enabled, demo,
            }, i) => {
              if (enabled.toLowerCase() === 'false') {
                return '';
              }
              return `
          <div id="${id}" class="template ${i === 0 ? 'is-selected' : ''}">
            <h3>${name}</h3>
            <div class="button-container">
                <button class="button demo">Select template</button>
            </div>
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
            <iframe class="preview" src="${demo}" loading="lazy"></iframe>
          </div>
        `;
            },
          )
          .join('');

        const templateImage = document.createElement('div');
        templateImage.className = 'template-image';
        templateImage.append(templateContainer.querySelector('.template.is-selected img').cloneNode(true));

        // Add template image to all steps
        const step = templateContainer.closest('.step');
        let nextStep = step.nextElementSibling;
        while (nextStep) {
          nextStep.append(templateImage.cloneNode(true));
          nextStep = nextStep.nextElementSibling;
        }

        templateContainer.addEventListener('click', (event) => {
          if (event.target.closest('.dot:not(.is-selected)')) {
            const dots = event.target.parentElement;
            const index = [...dots.children].indexOf(event.target) + 1;
            const template = event.target.closest('.template');

            template.querySelector('img.is-selected').classList.remove('is-selected');
            template.querySelector(`img:nth-child(${index})`).classList.add('is-selected');

            dots.querySelector('.is-selected').classList.remove('is-selected');
            event.target.classList.add('is-selected');
          } else if (event.target.closest('.demo')) {
            const template = event.target.closest('.template');
            block.querySelector('.template.is-selected').classList.remove('is-selected');
            template.classList.add('is-selected');

            document.body.classList.add('is-template-previewing');
            template.querySelector('.preview').classList.add('is-visible');

            const selectTemplate = document.querySelector('header a[href="#select-template"]');
            let selectTemplateName = selectTemplate.querySelector('span');
            if (!selectTemplateName) {
              selectTemplateName = document.createElement('span');
              selectTemplate.append(selectTemplateName);
            }
            selectTemplateName.textContent = template.querySelector('h3').textContent;

            const back = document.querySelector('header a[href="#back"]');
            const hidePreview = () => {
              if (document.body.classList.contains('is-template-previewing')) {
                document.body.classList.remove('is-template-previewing');
                block.querySelector('.preview.is-visible').classList.remove('is-visible');
                block.classList.remove('show-buttons');
                selectTemplate.onclick = undefined;
                back.onclick = undefined;
              }
            };

            back.onclick = () => {
              hidePreview();
            };

            if (document.body.classList.contains('is-anonymous')) {
              selectTemplate.onclick = () => {
                document.querySelector('.plans-dialog').showModal();
              };
            } else {
              selectTemplate.onclick = () => {
                hidePreview();
                block.querySelector('a[href="#template"]').click();
                block.classList.add('show-buttons');

                block.querySelectorAll('.template-image').forEach((el) => {
                  el.innerHTML = '';
                  el.append(template.querySelector('img').cloneNode(true));
                });
              };
            }
          }
        });
      });
  }

  const createStep = block.querySelector(':scope > div:has(a[href="#create"])');
  const input = document.createElement('input');
  input.placeholder = 'My Site';

  const slugInputWrapper = document.createElement('label');
  const slugInput = document.createElement('input');
  slugInputWrapper.id = 'slug-input-wrapper';
  slugInputWrapper.append(slugInput);
  slugInput.placeholder = 'my-site';
  slugInputWrapper.dataset.leftoverChars = slugMaxLength;

  slugInput.dataset.copyName = true;

  const createButton = createStep.querySelector('a[href="#create"]');
  createButton.classList.add('is-disabled');
  function updateCreateButton() {
    createButton.classList.toggle('is-disabled', input.value.length < 2 || slugInput.value.length < 2);
  }
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Description';
  if (createStep) {
    createStep.querySelector('h2').after(input);
    input.after(slugInputWrapper);
    slugInputWrapper.after(textarea);

    slugInput.oninput = (event) => {
      slugInput.value = slugify(slugInput.value);
      if (slugInput.value.length > slugMaxLength) {
        slugInput.value = slugInput.value.slice(0, slugMaxLength);
      }
      slugInputWrapper.dataset.leftoverChars = slugMaxLength - slugInput.value.length;
      if (event) {
        slugInput.dataset.copyName = '';
      }
      if (!slugInput.value) {
        slugInput.dataset.copyName = true;
      }
      updateCreateButton();
    };
    slugInput.onchange = () => {
      slugInput.value = slugInput.value
        .replace(/(^-+|-+$)/g, '');
    };

    input.oninput = () => {
      if (slugInput.dataset.copyName) {
        slugInput.value = input.value;
        slugInput.oninput();
        slugInput.onchange();
      }
      updateCreateButton();
    };
  }

  const successStep = block.lastElementChild;
  if (successStep) {
    successStep.querySelectorAll('a').forEach((el) => {
      el.classList.add('button');
    });
  }

  // Handle link identifiers with # (#create etc.)
  block.addEventListener('click', async (event) => {
    const action = event.target.closest('a[href]');
    if (!action) {
      return;
    }

    const identifier = action.getAttribute('href');
    if (identifier === '#create') {
      const token = await window.auth0Client.getTokenSilently();
      const template = block.querySelector('.template.is-selected').id;

      const reqCreate = await fetch(`${SCRIPT_API}/create`, {
        headers: {
          'content-type': 'application/json',
          authorization: `bearer ${token}`,
        },
        body: JSON.stringify({
          inputProjectName: input.value,
          inputProjectSlug: slugInput.value,
          inputProjectDescription: textarea.value,
          template,
        }),
        method: 'POST',
      });

      const step = block.querySelector('.step:has(a[href="#edit"])');
      const statusList = step.querySelector('ul');

      const error = () => {
        statusList.remove();
        step.querySelector('h2 + p').textContent = `${OOPS} Please try again in a few minutes.`;
      };

      if (reqCreate.ok) {
        const { jobId } = await reqCreate.json();

        const addSuccess = (el) => {
          const loaderEl = el.querySelector('.loader');
          loaderEl.classList.add('success');
          loaderEl.textContent = '✓';
          if (el.nextElementSibling) {
            el.nextElementSibling.classList.add('is-loading');
          }
        };

        const statusInterval = setInterval(async () => {
          const reqStatus = await fetch(`${SCRIPT_API}/jobs/${jobId}`);
          if (reqStatus.ok) {
            const {
              projectSlug, progress, finished, liveUrl, driveUrl, sidekickSetupUrl, calendarUrl,
            } = await reqStatus.json();

            if (finished) {
              clearInterval(statusInterval);

              // Success
              if (!progress.find(({ status }) => status === 'failed')) {
                addSuccess(statusList.children[3]);

                const openSite = block.querySelector('a[href="#open-site"]');
                const openDrive = block.querySelector('a[href="#open-drive"]');
                const installSidekick = block.querySelector('a[href="#install-sidekick"]');
                const openCalendar = block.querySelector('a[href="#open-calendar"]');
                const openSiteDetails = block.querySelector('a[href="#site-details"]');
                const makeReady = (linkEl, url) => {
                  if (linkEl && url) {
                    linkEl.href = url;
                    linkEl.classList.add('is-ready');
                    linkEl.target = '_blank';
                  }
                };

                makeReady(openSite, liveUrl);
                makeReady(openDrive, driveUrl);
                makeReady(installSidekick, sidekickSetupUrl);
                makeReady(openCalendar, calendarUrl);

                if (openSiteDetails) {
                  openSiteDetails.classList.remove('next');
                  openSiteDetails.href = `/site/${projectSlug}`;
                }

                const edit = step.querySelector('a[href="#edit"]');
                edit.classList.remove('is-disabled');
                edit.click();
              } else {
                error();
              }
            } else {
              progress.filter(({ status }) => status === 'success').forEach(({ statusText }) => {
                if (statusText === 'Project Name reserved') {
                  addSuccess(statusList.children[0]);
                } else if (statusText === 'Github setup done') {
                  addSuccess(statusList.children[1]);
                } else if (statusText === 'Drive copy done') {
                  addSuccess(statusList.children[2]);
                }
              });
            }
          }
        }, 2000);
      } else {
        error();
      }
    } else if (identifier === '#new') {
      window.location.reload();
    }
  });
}
