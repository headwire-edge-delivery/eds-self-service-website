import { startTour, toggleAutoTour } from './main.js';

const helpButton = () => {
  const button = document.createElement('button');
  button.id = 'help-btn';
  button.innerText = '?';
  button.classList.add('help-btn');
  button.ariaLabel = 'Help';
  document.querySelector('footer').appendChild(button);

  document.querySelector('.help-btn').addEventListener('click', startTour);

  // MARK: Temp button

  const tempButton = document.createElement('button');
  tempButton.id = 'temp-btn';
  tempButton.innerText = 'Temp: Toggle Tour';
  tempButton.classList.add('temp-btn');
  tempButton.ariaLabel = 'Temp: Toggle Tour';
  document.querySelector('footer').appendChild(tempButton);

  document.querySelector('.temp-btn').addEventListener('click', toggleAutoTour);
};

export default helpButton;
