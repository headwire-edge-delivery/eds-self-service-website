import { updateUserSettings } from '../scripts/scripts.js';

export default function generateTour(tour, showAutoTour, tourData) {
  const tourSteps = [];
  let isLastStep = false;
  let showDisableTour = showAutoTour;

  tourData.steps.forEach((step, index) => {
    if (step.skip === true) {
      return;
    }

    const tourStep = {
      element: step.element,
      elementEvent() { step.elementEvent?.(); showDisableTour = !step.elementEvent; },
      destroyOnClicked: step.destroyOnClicked ?? true,
      popover: {
        title: step.title,
        description: step.description,
        disableButtons: step.disableButtons ?? [],
        showButtons: step.showButtons ?? index === 0 ? ['next', 'close'] : ['next', 'previous', 'close'],
        showProgress: step.showProgress ?? false,
        side: step.side ?? 'bottom',
        align: step.align ?? 'start',
        buttonClasses: ['button', 'primary', 'action'],
        removeFooterClass: true,
      },
    };

    tourSteps.push(tourStep);
  });

  return tour({
    progressText: tourData.progressText ?? 'Step {{current}} of {{total}}',
    onNextClick: tourData.onNextClick,
    onFinished: (() => {
      if (tourData.onFinished) {
        showDisableTour = false;
        tourData.onFinished?.();
      }
    }),
    steps: tourSteps,
    onDestroyed: (element, step, { state }) => {
      isLastStep = state.activeIndex === tourSteps.length - 1;
      const tourObj = tour({
        doneBtnText: 'Close',
        steps: [
          {
            popover: {
              title: 'Do you want to disable the Tour?',
              description: 'This will disable the automatic Tour for all Pages.',
              side: 'bottom',
              align: 'start',
              buttonClasses: ['button', 'primary', 'action'],
              removeFooterClass: true,
            },
          },
          {
            element: '#help-btn',
            popover: {
              title: 'Need help?',
              description: 'You can always click the help button to start the tour for the current Page.',
              side: 'bottom',
              align: 'start',
              buttonClasses: ['button', 'primary', 'action'],
              removeFooterClass: true,
            },
          },
        ],
        onPopoverRender: (popover) => {
          const disableTourButton = document.createElement('button');
          disableTourButton.innerText = 'Disable Tour';
          disableTourButton.classList.add('button', 'primary', 'action');
          popover.footerButtons.appendChild(disableTourButton);

          disableTourButton.addEventListener('click', () => {
            tourObj.destroy();
            const detail = { showAutoTour: false };
            updateUserSettings(detail);
            document.dispatchEvent(new CustomEvent('user:autotour', { detail }));
          });
        },
      });

      if (showAutoTour && !isLastStep && showDisableTour) {
        setTimeout(() => {
          tourObj.start();
        }, 300);
      } else {
        tourObj.destroy();
      }
    },
  });
}
