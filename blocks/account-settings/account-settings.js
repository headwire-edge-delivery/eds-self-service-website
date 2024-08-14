export default function decorate(block) {
  block.innerHTML = /* html */`
    <div class="section">
      <h2>Danger Zone</h2>

      <ul class="action-list">
        <li><button id="delete-account-button" class="action primary button">Delete Account</button></li>
        <li><button id="delete-all-sites-button" class="action primary button">Delete All Sites</button></li>
      </ul>
    </div>
  `;

  const deleteAccountButton = block.querySelector('#delete-account-button');

  deleteAccountButton.addEventListener('click', async () => {
    deleteAccountButton.classList.add('loading');

    // get list of projects that will be deleted with the account

    window.createDialog({

    });
  });
}
