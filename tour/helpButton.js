import { startTour } from './main.js';

const helpButton = (SCRIPT_API) => {
  const button = document.createElement('button');
  button.id = 'help-btn';
  button.innerText = '?';
  button.classList.add('help-btn');
  button.ariaLabel = 'Help';
  document.querySelector('footer').appendChild(button);

  document.querySelector('.help-btn').addEventListener('click', () => startTour(SCRIPT_API, false));

  // Checks if the Url changes and starts the AutoTour
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  // eslint-disable-next-line func-names
  window.history.pushState = function (...args) {
    startTour(SCRIPT_API, true, true);
    return originalPushState.apply(this, args);
  };

  // eslint-disable-next-line func-names
  window.history.replaceState = function (...args) {
    startTour(SCRIPT_API, true, true);
    return originalReplaceState.apply(this, args);
  };

  startTour(SCRIPT_API, true, true);
};

export default helpButton;
