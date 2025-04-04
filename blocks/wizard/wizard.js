import { slugMaxLength, slugify, SCRIPT_API, OOPS, sanitizeName } from '../../scripts/scripts.js';
import { confirmDialog } from '../../scripts/dialogs.js';

const progressSteps = ['name', 'drive', 'code', 'publish'];

const daPrefix = 'da-';

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const creationSteps = block.querySelectorAll(':scope > div');
  creationSteps.forEach((div) => div.classList.add('step'));

  const prevTemplate = document.createElement('button');
  prevTemplate.className = 'button secondary prev';
  prevTemplate.textContent = 'Go back';

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
    if (window.location.pathname.includes('/templates/') && siblingStep) {
      if (!isNext && window.location.pathname.endsWith('/create')) {
        history.back();
        return;
      }
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
    if ((event.target.closest('.next') || event.target.closest('.prev')) && document.body.classList.contains('is-authenticated')) {
      selectStep(event);
    }
  });

  // TODO replace templates json with endpoint ?
  const templates = block.querySelector(`a[href="/templates.json"], a[href="${SCRIPT_API}/templates"]`);
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
      if (templateContainer.scrollLeft + templateContainer.offsetWidth >= templateContainer.scrollWidth) {
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

    fetch(`${SCRIPT_API}/templates`)
      .then((req) => req.json())
      .then(({ data }) => {
        const render = () => {
          // eslint-disable-next-line no-restricted-syntax
          const selectTemplate = document.querySelector('header a[href="#select-template"]');
          // eslint-disable-next-line no-restricted-syntax
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
            .map(({ id, name, description, enabled, demo }, i) => {
              if (enabled.toLowerCase() === 'false') {
                return '';
              }
              return `
          <div id="${id}" class="template ${i === 0 ? 'is-selected' : ''}">
            <h3>${name}</h3>
            <p>${description}</p>
            <img alt="" src="/assets/${id}/image1.png" loading="lazy" class="is-selected"/>
            <iframe class="preview" src="${demo}" loading="lazy"></iframe>
            <div style="margin-top: 1rem;">
              <a href="/templates/${id}" class="button">Preview</a>
              <a href="/templates/${id}/create" class="button primary">Create</a>
            </div>
          </div>`;
            })
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
            if (event.target.closest('.template')) {
              event.preventDefault();
              const template = event.target.closest('.template');
              if (!event.target.matches('.template .button, .template .button *')) {
                return;
              }

              if (event.target.matches('.button')) {
                if (event.target.href.endsWith('create')) {
                  window.location.href = event.target.href;
                } else {
                  window.history.pushState({}, '', event.target.href);
                }
              }

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
                selectTemplate.onclick = async (e) => {
                  e.preventDefault();
                  window.sessionStorage.redirectTo = `${window.location.href}/create`;
                  // eslint-disable-next-line no-restricted-syntax
                  const plansDialog = document.querySelector('.plans-dialog');
                  if (plansDialog) {
                    plansDialog.showModal();
                  } else if (await confirmDialog('Please login to continue')) {
                    // fallback if plans isn't found
                    window.auth0Client.loginWithRedirect();
                  }
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
              block.querySelector('a[href="' + pathname + '"]').click();

              block.querySelector('.step.is-selected').classList.remove('is-selected');
              block.querySelector('.step:nth-child(1)').classList.add('is-selected');
            } else if (pathname.startsWith('/templates/') && pathname.endsWith('/create')) {
              const template = split[2];
              document.getElementById(template).click();

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

        // eslint-disable-next-line no-restricted-syntax
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
  // MARK: create form
  const createForm = document.createElement('form');
  createForm.id = 'create-form';

  // name
  const nameInputWrapper = document.createElement('div');
  nameInputWrapper.classList.add('input-wrapper');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name';
  nameInputWrapper.append(nameLabel);
  const nameInput = document.createElement('input');
  nameInput.placeholder = 'My Site';
  nameInput.id = 'site-name';
  nameInputWrapper.append(nameInput);

  // slug
  const slugInputWrapper = document.createElement('div');
  slugInputWrapper.classList.add('input-wrapper');
  const slugLabel = document.createElement('label');
  slugLabel.textContent = 'Slug';
  slugInputWrapper.append(slugLabel);
  const slugInput = document.createElement('input');
  slugInputWrapper.id = 'slug-input-wrapper';
  slugInputWrapper.append(slugInput);
  slugInput.placeholder = 'my-site';
  slugInputWrapper.dataset.leftoverChars = slugMaxLength;
  slugInput.id = 'slug-input';

  slugInput.dataset.copyName = true;

  const slugPreview = document.createElement('span');
  slugPreview.textContent = 'https://my-site.kestrelone.com';
  slugInputWrapper.append(slugPreview);

  // create site button
  const createButton = createStep.querySelector('a[href="#create"]');
  createButton.classList.add('is-disabled');
  createButton.id = 'create-button';

  // description
  const descriptionTextareaWrapper = document.createElement('div');
  descriptionTextareaWrapper.classList.add('input-wrapper');
  const descriptionLabel = document.createElement('label');
  descriptionLabel.classList.add('input-label');
  descriptionLabel.textContent = 'Description';
  descriptionTextareaWrapper.append(descriptionLabel);
  const descriptionTextarea = document.createElement('textarea');
  descriptionTextarea.placeholder = 'Description';
  descriptionTextarea.id = 'description-input';
  descriptionTextareaWrapper.append(descriptionTextarea);

  // dark alley toggle
  const darkAlleyCheckbox = document.createElement('input');
  darkAlleyCheckbox.type = 'checkbox';
  darkAlleyCheckbox.id = 'dark-alley-checkbox';
  const darkAlleyLabel = document.createElement('label');
  darkAlleyLabel.classList.add('checkbox-label', 'dark-alley-label');
  const darkAlleySpan = document.createElement('span');
  darkAlleySpan.textContent = 'Use Dark alley?';
  darkAlleyLabel.append(darkAlleyCheckbox, darkAlleySpan);

  const daSlugPrefixRegex = new RegExp(`^${daPrefix}`, 'i');

  createForm.append(nameInputWrapper, slugInputWrapper, descriptionTextareaWrapper, darkAlleyLabel);

  // MARK: Valid slug check
  let createButtonTimer;
  function updateCreateButton() {
    clearTimeout(createButtonTimer);
    createButton.classList.add('is-disabled');
    if (nameInput.value.length < 2 || slugInput.value.length < 2) {
      return;
    }

    createButtonTimer = setTimeout(async () => {
      const res = await fetch(`${SCRIPT_API}/checkAvailability/${slugInput.value}${darkAlleyCheckbox.checked ? '?darkAlley=true' : ''}`);
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

  function daPrefixCheck() {
    // make sure slug has DA prefix if checkbox is checked
    if (darkAlleyCheckbox.checked) {
      if (!daSlugPrefixRegex.test(slugInput.value)) {
        slugInput.value = daPrefix + slugInput.value;
      }
    } else {
      slugInput.value = slugInput.value.replace(daSlugPrefixRegex, '');
    }
  }

  createForm.oninput = (event) => {
    if (event.target === descriptionTextarea) return; // no special handling
    if (event.target === nameInput) {
      nameInput.value = sanitizeName(nameInput.value);
    }
    if (event.target === nameInput && (!slugInput.value || (darkAlleyCheckbox.checked && slugInput.value === daPrefix))) {
      slugInput.dataset.copyName = true;
    }
    // slug copy handling
    if (event.target === slugInput) {
      slugInput.dataset.copyName = null;
    }
    if (slugInput.dataset.copyName === 'true') {
      slugInput.value = nameInput.value;
    }
    daPrefixCheck();
    // slugifying slug input
    slugInput.value = slugify(slugInput.value);

    slugInput.value = slugInput.value.substring(0, slugMaxLength);
    slugPreview.textContent = `https://${slugInput.value}.kestrelone.com`;
    slugInputWrapper.dataset.leftoverChars = slugMaxLength - slugInput.value.length;

    updateCreateButton();
  };

  createForm.onchange = () => {
    nameInput.value = sanitizeName(nameInput.value).trim();
    if (!slugInput.value || (darkAlleyCheckbox.checked && slugInput.value === daPrefix)) {
      slugInput.dataset.copyName = true;
    }
    daPrefixCheck();
    slugInput.value = slugInput.value.replace(/(^-+|-+$)/g, '');
    slugInputWrapper.dataset.leftoverChars = slugMaxLength - slugInput.value.length;
  };

  if (createStep) {
    createStep.querySelector('h2').after(createForm);
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
        inputProjectName: nameInput.value,
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
      window?.zaraz?.track('error create site');

      editStep.classList.add('error');
      const errorMessage = editStep.querySelector('.error-message');
      if (!errorMessage) {
        editStep.querySelector('.button-container').insertAdjacentHTML(
          'beforebegin',
          `
          <div class="error-message">
              <p>${OOPS} Please try again in a few minutes.</p>
              <button class="button prev">Go back</button>
          </div>
        `,
        );

        editStep.querySelector('.error-message .button').onclick = () => {
          window?.zaraz?.track('click error site back');

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
          const { steps, finished, success, failed, projectSlug, darkAlleyUrl } = await reqStatus.json();

          renderStatusList(steps);

          if (finished) {
            if (success) {
              window.location.href = `/${darkAlleyUrl ? 'da-' : ''}site/${projectSlug}`;
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
