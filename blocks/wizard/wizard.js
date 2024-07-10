import {
  slugMaxLength, slugify, SCRIPT_API, OOPS,
} from '../../scripts/scripts.js';

const progressSteps = [
  'name',
  'drive',
  'code',
  'publish',
];

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const creationSteps = block.querySelectorAll(':scope > div');
  creationSteps.forEach((div) => div.classList.add('step'));

  const prevTemplate = document.createElement('button');
  prevTemplate.className = 'button secondary prev';
  prevTemplate.textContent = 'Previous';

  creationSteps.forEach((step, i) => {
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

  const previewTemplate = () => {
    const template = window.location.pathname.split('/')[2];
    const selectedTemplate = document.getElementById(template);
    if (selectedTemplate) {
      selectedTemplate.click();
    }
  };

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

    if (siblingStep.matches(':first-child') && window.location.pathname.startsWith('/templates/')) {
      previewTemplate();
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
    const templateWrapper = document.createElement('div');
    templateWrapper.className = 'template-wrapper';
    const templateContainer = document.createElement('div');
    templateContainer.className = 'template-container';
    templateWrapper.append(templateContainer);

    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'controls-wrapper';
    const leftButton = document.createElement('button');
    leftButton.className = 'button secondary prev scroll-button';
    leftButton.onclick = (e) => {
      e.stopPropagation();
      const containerBox = templateContainer.getBoundingClientRect();
      templateContainer.scrollBy({ behavior: 'smooth', left: -containerBox.width });
    };
    const rightButton = document.createElement('button');
    rightButton.className = 'button secondary next scroll-button';
    rightButton.onclick = (e) => {
      e.stopPropagation();
      const containerBox = templateContainer.getBoundingClientRect();
      templateContainer.scrollBy({ behavior: 'smooth', left: containerBox.width });
    };

    templateContainer.onscrollend = () => {
      if (templateContainer.scrollLeft === 0) {
        leftButton.classList.add('is-disabled');
      } else {
        leftButton.classList.remove('is-disabled');
      }
      if (templateContainer.scrollLeft + templateContainer.offsetWidth
        >= templateContainer.scrollWidth) {
        rightButton.classList.add('is-disabled');
      } else {
        rightButton.classList.remove('is-disabled');
      }
    };

    // debounced button refresh on resize
    let templateResizeListener;
    window.addEventListener('resize', () => {
      clearTimeout(templateResizeListener);
      templateResizeListener = setTimeout(() => {
        templateContainer.onscrollend();
      }, 300);
    });

    leftButton.classList.add('is-disabled');

    controlsWrapper.append(leftButton, rightButton);
    templateWrapper.append(controlsWrapper);

    templates.parentElement.replaceWith(templateWrapper);

    fetch(templates.href)
      .then((req) => req.json())
      .then(({ data }) => {
        const render = () => {
          const selectTemplate = document.querySelector('header a[href="#select-template"]');
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

          templateContainer.innerHTML = data
            .map(
              ({
                id, name, description, enabled, demo,
              }, i) => {
                if (enabled.toLowerCase() === 'false') {
                  return '';
                }
                return `
          <a href="/templates/${id}" id="${id}" class="template ${i === 0 ? 'is-selected' : ''}">
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
            <iframe class="preview" src="${demo}" loading="lazy"></iframe>
          </a>
        `;
              },
            )
            .join('');

          const templateImage = document.createElement('div');
          templateImage.className = 'template-image';
          const templateName = document.createElement('h3');
          templateName.textContent = templateContainer.querySelector('.template.is-selected h3').textContent;
          templateImage.append(templateName);
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
              event.preventDefault();
              const dots = event.target.parentElement;
              const index = [...dots.children].indexOf(event.target) + 1;
              const template = event.target.closest('.template');

              template.querySelector('img.is-selected').classList.remove('is-selected');
              template.querySelector(`img:nth-child(${index})`).classList.add('is-selected');

              dots.querySelector('.is-selected').classList.remove('is-selected');
              event.target.classList.add('is-selected');
            } else if (event.target.closest('.template')) {
              event.preventDefault();
              const template = event.target.closest('.template');
              window.history.pushState({}, '', template.href);

              block.querySelector('.template.is-selected').classList.remove('is-selected');
              template.classList.add('is-selected');

              document.body.classList.add('is-template-previewing');
              template.querySelector('.preview').classList.add('is-visible');

              let selectTemplateName = selectTemplate.querySelector('span');
              if (!selectTemplateName) {
                selectTemplateName = document.createElement('span');
                selectTemplate.append(selectTemplateName);
              }
              selectTemplateName.textContent = template.querySelector('h3').textContent;

              back.onclick = (e) => {
                e.preventDefault();
                hidePreview();
                window.history.replaceState({}, '', '/');
              };

              if (document.body.classList.contains('is-anonymous')) {
                selectTemplate.onclick = (e) => {
                  e.preventDefault();
                  document.querySelector('.plans-dialog').showModal();

                  window.sessionStorage.redirectTo = `${window.location.href}/create`;
                };
              } else {
                selectTemplate.onclick = (e) => {
                  e.preventDefault();

                  window.history.replaceState({}, '', `${window.location.pathname}/create`);

                  hidePreview();
                  block.querySelector('a[href="#template"]').click();
                  block.classList.add('show-buttons');

                  block.querySelectorAll('.template-image').forEach((el) => {
                    el.innerHTML = '';
                    const name = document.createElement('h3');
                    name.textContent = template.querySelector('h3').textContent;
                    el.append(name);
                    el.append(template.querySelector('img').cloneNode(true));
                  });
                };
              }
            }
          });

          // Handle on page load
          const handleHistory = () => {
            const { pathname } = window.location;
            const split = pathname.split('/');

            if (pathname === '/') {
              hidePreview();

              block.querySelector('.step.is-selected').classList.remove('is-selected');
              block.querySelector('.step:nth-child(1)').classList.add('is-selected');
            } else if (pathname.startsWith('/templates/') && split.length === 3) {
              const template = split.pop();
              document.getElementById(template).click();

              block.querySelector('.step.is-selected').classList.remove('is-selected');
              block.querySelector('.step:nth-child(1)').classList.add('is-selected');
            } else if (pathname.startsWith('/templates/') && pathname.endsWith('/create')) {
              const template = split[2];
              document.getElementById(template).click();
              selectTemplate.click();

              block.querySelector('.step.is-selected').classList.remove('is-selected');
              const selectedStep = block.querySelector('.step:nth-child(2)');
              selectedStep.classList.add('is-selected');
              selectedStep.classList.remove('error');
            }
          };

          // On page load
          handleHistory();

          window.onpopstate = handleHistory;
        };

        if (document.querySelector('.header[data-block-status="loaded"]')) {
          render();
        } else {
          document.addEventListener('header:ready', () => {
            render();
          });
        }
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

  // MARK: Valid slug check
  let createButtonTimer;
  function updateCreateButton() {
    clearTimeout(createButtonTimer);
    createButton.classList.add('is-disabled');
    if (input.value.length < 2 || slugInput.value.length < 2) {
      return;
    }

    createButtonTimer = setTimeout(async () => {
      const res = await fetch(`${SCRIPT_API}/checkAvailability/${slugInput.value}`);
      if (res.ok) {
        const data = await res.json().catch(() => {});
        if (data.projectSlug !== slugInput.value) {
          return;
        }
        createButton.classList.remove('is-disabled');
        slugInputWrapper.classList.remove('slug-taken');
      } else {
        createButton.classList.add('is-disabled');
        slugInputWrapper.classList.add('slug-taken');
      }
    }, 300);
  }
  const descriptionTextarea = document.createElement('textarea');
  descriptionTextarea.placeholder = 'Description';

  const darkAlleyCheckbox = document.createElement('input');
  darkAlleyCheckbox.type = 'checkbox';
  darkAlleyCheckbox.id = 'dark-alley-checkbox';
  const darkAlleyLabel = document.createElement('label');
  darkAlleyLabel.classList.add('checkbox-label', 'dark-alley-label');
  const darkAlleySpan = document.createElement('span');
  darkAlleySpan.textContent = 'Use Dark alley?';
  darkAlleyLabel.append(darkAlleyCheckbox, darkAlleySpan);

  if (createStep) {
    createStep.querySelector('h2').after(input);
    input.after(slugInputWrapper);
    slugInputWrapper.after(descriptionTextarea);
    descriptionTextarea.after(darkAlleyLabel);

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

  // Handle create action
  createButton.onclick = async (e) => {
    e.preventDefault();

    const token = await window.auth0Client.getTokenSilently();
    const template = block.querySelector('.template.is-selected').id;

    window.history.pushState({}, '', `${window.location.pathname}/progress`);

    const reqCreate = await fetch(`${SCRIPT_API}/create`, {
      headers: {
        'content-type': 'application/json',
        authorization: `bearer ${token}`,
      },
      body: JSON.stringify({
        inputProjectName: input.value,
        inputProjectSlug: slugInput.value,
        inputProjectDescription: descriptionTextarea.value,
        preferDarkAlley: darkAlleyCheckbox.checked,
        template,
      }),
      method: 'POST',
    });

    const editStep = block.querySelector('.step:has(a[href="#edit"])');
    const statusList = editStep.querySelector('ul');

    const error = () => {
      window?.zaraz?.track('error create site', { url: window.location.href });

      editStep.classList.add('error');
      const errorMessage = editStep.querySelector('.error-message');
      if (!errorMessage) {
        editStep.querySelector('.button-container').insertAdjacentHTML('beforebegin', `
          <div class="error-message">
              <p>${OOPS} Please try again in a few minutes.</p>
              <button class="button prev">Go back</button>
          </div>
        `);

        editStep.querySelector('.error-message .button').onclick = () => {
          window?.zaraz?.track('click error site back', { url: window.location.href });

          window.history.replaceState({}, '', `${window.location.pathname.split('/').slice(0, -1).join('/')}`);
          editStep.classList.remove('error');
        };
      }
    };

    const renderStatusList = (stepsObj) => {
      const listItems = statusList.querySelectorAll('li');
      progressSteps.forEach((step, index) => {
        if (stepsObj[step]) {
          listItems[index].className = stepsObj[step].status;
        }
      });
    };
    renderStatusList({});

    if (reqCreate.ok) {
      const { jobId } = await reqCreate.json();

      const statusInterval = setInterval(async () => {
        const reqStatus = await fetch(`${SCRIPT_API}/jobs/${jobId}`);
        if (reqStatus.ok) {
          const {
            steps,
            finished,
            success,
            failed,
            driveUrl,
            sidekickSetupUrl,
            customLiveUrl,
            projectSlug,
            darkAlleyUrl,
          } = await reqStatus.json();

          renderStatusList(steps);

          if (finished) {
            if (success) {
              const openSite = block.querySelector('a[href="#open-site"]');
              const openDrive = block.querySelector('a[href="#open-drive"]');
              const installSidekick = block.querySelector('a[href="#install-sidekick"]');
              const openSiteDetails = block.querySelector('a[href="#site-details"]');
              const makeReady = (linkEl, url) => {
                if (linkEl && url) {
                  linkEl.href = url;
                  linkEl.classList.add('action', 'secondary', 'is-ready');
                  linkEl.target = '_blank';
                }
              };

              makeReady(openSite, customLiveUrl);
              makeReady(openDrive, driveUrl);
              makeReady(installSidekick, sidekickSetupUrl);

              if (darkAlleyUrl) {
                // const openDarkAlley = document.createElement('a');
                openDrive.href = darkAlleyUrl;
                // openDarkAlley.href = darkAlleyUrl;
                openDrive.textContent = 'Open Dark Alley';
                // openSite.after(openDarkAlley);
                installSidekick.hidden = true;
              }

              if (openSiteDetails) {
                openSiteDetails.classList.remove('next');
                openSiteDetails.href = `/${darkAlleyUrl ? 'da-' : ''}site/${projectSlug}`;
              }

              const edit = editStep.querySelector('a[href="#edit"]');
              edit.classList.remove('is-disabled');
              edit.click();
            } else if (failed) {
              error();
            } else {
              // don't clear interval
              return;
            }
            clearInterval(statusInterval);
          }
        }
      }, 2000);
    } else {
      error();
    }
  };
}
