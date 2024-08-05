import { startTour } from './main.js';

const helpButton = (SCRIPT_API) => {
  const button = document.createElement('button');
  button.id = 'help-btn';
  button.innerText = '?';
  button.classList.add('help-btn');
  button.ariaLabel = 'Help';
  document.querySelector('footer').appendChild(button);

  document.querySelector('.help-btn').addEventListener('click', () => startTour(SCRIPT_API));

  startTour(SCRIPT_API, true);
};

export default helpButton;
