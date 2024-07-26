export default function generateTour(driver, tour) {
  const tourSteps = [];

  tour.steps.forEach((step, index) => {
    if (step.skip === true) {
      return;
    }

    const tourStep = {
      element: step.element,
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

  return driver({
    disableActiveInteraction: tour.disableActiveInteraction ?? true,
    progressText: tour.progressText ?? 'Step {{current}} of {{total}}',
    steps: tourSteps,
    onDeselected: tour.onDeselected ?? (() => {}),
  });
}
