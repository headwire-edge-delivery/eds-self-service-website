const disableTourButton = (popover) => {
  const button = document.createElement('button');
  button.innerText = 'Disable the Tour';
  button.classList.add('driver-popover-btn');
  if (popover.footerButtons.hasChildNodes()) {
    popover.footerButtons.insertBefore(button, popover.footerButtons.firstChild);
  } else {
    popover.footerButtons.appendChild(button);
  }
  button.addEventListener('click', () => {
    popover.close();
  });
};

const disableTour = {
  popover: {
    title: 'Do you want to disable the Tour?',
    description: 'You can always reenable it from the dashboard under <a href="account" id="disable-tour">Account</a>.',
    onPopoverRender: (popover) => {
      const closeButton = document.createElement('button');
      closeButton.innerText = 'Just Close the Tour';
      closeButton.classList.add('driver-popover-btn');
      popover.footerButtons.appendChild(closeButton);
      closeButton.addEventListener('click', () => {
        popover.close();
      });

      const disableButton = document.createElement('button');
      disableButton.innerText = 'Disable Tour';
      disableButton.classList.add('driver-popover-btn');
      popover.footerButtons.appendChild(disableButton);
      disableButton.addEventListener('click', () => {
        localStorage.setItem('enableTour', false);
        window.location.reload();
      });
    },
  },
};

export { disableTourButton, disableTour };
