import startTour from './main.js';

const helpButton = () => {
  const enableTourButton = localStorage.getItem('enableTourButton');
  if (enableTourButton === 'false') {
    return;
  }
  const button = document.createElement('button');
  button.id = 'help-btn';
  button.innerText = '?';
  button.classList.add('help-btn');
  button.ariaLabel = 'Help';
  document.querySelector('main').appendChild(button);

  document.querySelector('.help-btn').addEventListener('click', startTour);
};

export default helpButton;
