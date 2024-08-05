export default function generateTour(tour, toggleAutoTour, SCRIPT_API, showAutoTour, tourData) {
  const tourSteps = [];
  let isLastStep = false;

  tourData.steps.forEach((step, index) => {
    if (step.skip === true) {
      return;
    }

    const tourStep = {
      element: step.element,
      elementEvent: step.elementEvent,
      destroyOnClicked: step.destroyOnClicked ?? false,
      popover: {
        title: step.title,
        description: step.description,
        disableButtons: step.disableButtons ?? [],
        showButtons: step.showButtons ?? index === 0 ? ['next', 'close'] : ['next', 'previous', 'close'],
        showProgress: step.showProgress ?? false,
        side: step.side ?? 'bottom',
        align: step.align ?? 'start',
      },
    };

    tourSteps.push(tourStep);
  });

  return tour({
    disableActiveInteraction: tourData.disableActiveInteraction ?? false,
    progressText: tourData.progressText ?? 'Step {{current}} of {{total}}',
    onNextClick: tourData.onNextClick,
    onFinished: tourData.onFinished ?? (() => {}),
    steps: tourSteps,
    onDestroyStarted: (element, step, { state }) => {
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
            },
          },
          {
            element: '.help-btn',
            popover: {
              title: 'Need help?',
              description: 'You can always click the help button to start the tour for the current Page.',
              side: 'bottom',
              align: 'start',
            },
          },
        ],
        onPopoverRender: (popover) => {
          const disableTourButton = document.createElement('button');
          disableTourButton.innerText = 'Disable Tour';
          disableTourButton.classList.add('button', 'disable-tour-btn');
          popover.footerButtons.appendChild(disableTourButton);

          disableTourButton.addEventListener('click', () => {
            tourObj.destroy();
            toggleAutoTour(SCRIPT_API);
          });
        },
      });

      if (showAutoTour && !isLastStep) {
        tourObj.start();
      } else {
        tourObj.destroy();
      }
    },
  });
}
