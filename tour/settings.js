function settingsGeneralTour({ showAutoTour }) {
  const updateInfo = document.querySelector('.update-info')?.textContent;
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        window.location.href = window.location.href.replace('site/', 'theme/').replace('/settings', '');
      }
    },
    steps: [
      {
        title: 'Authors',
        description: 'This is where you can add or remove authors for your website. <br /> Authors are the people who write the content on your website. <br /> By default, the website owner is the only author. <br /> You can add more authors. The new Author will receive an invitation email from us.',
        element: '#authors',
      },
      {
        title: 'Contact Email',
        description: 'You can change your contact email here. <br /> This email will be used for contact forms and other contact related features. By default, it is the email from the website owner.',
        element: '#contact-email',
      },
      {
        title: 'Favicon',
        description: 'This is where you can upload a favicon for your website. A favicon is a small icon that appears in the browser tab when your website is open. It helps users identify your website easily. <br /> It should be a square and as a filetype .ico. <br /> You can convert your image to a .ico file <a href="https://www.icoconverter.com/" target="_blank">here</a>.',
        element: '#favicon',
      },
      {
        title: 'Blocks',
        description: 'This acts as a repository of building blocks for your website. Here, you can explore and select from a variety of available blocks to enhance your web pages.',
        element: '#blocks',
      },
      {
        title: 'Add a Block',
        description: 'To add a new block to your website, click here. <br /> This will open a dialog where you can select a block to add to your page.',
        element: '#add-block-button',
      },
      {
        title: 'Delete a Block',
        description: 'To delete a block, click here. <br /> This will open a dialog where you can delete it.',
        element: '#blocks-list > li:first-child',
      },
      {
        title: 'Icons',
        description: 'This is your go-to resource for web assets that add visual flair and functionality to your website. Here, you\'ll find a curated collection of icons suitable for various purposes, from navigation to social media integration.',
        element: '#icons',
      },
      {
        title: 'Add an Icon',
        description: 'To add a new Icon to your website, click here. <br /> This will open a dialog where you can upload a new icon to your page.',
        element: '#add-icon-button',
      },
      {
        title: 'Delete or replace an Icon',
        description: 'To delete or replace an Icon on your website, click here. <br /> This will open a dialog where you can delete or replace it.',
        element: '#icons-list > li:first-child > .buttons-container > .icon-settings',
        side: 'right',
        align: 'end',
      },
      {
        title: 'Copy your Icon',
        description: 'To create a copy of an Icon on your website, click here. <br /> This will create a copy of the Icon.',
        element: '#icons-list > li:first-child > .buttons-container > .copy-button',
        side: 'left',
        align: 'end',
      },
      {
        title: 'Updates',
        description: 'Check if a new Update for your Project is available or revert your Project to a previous version.',
        element: '#updates',
      },
      {
        title: 'No updates available',
        description: 'Currently, there are no updates available for your website. <br /> If there are updates available, you can update your website here.',
        element: '.update-info',
        side: 'left',
        align: 'end',
        skip: updateInfo !== 'No updates available.',
      },
      {
        title: 'Could not get update information',
        description: 'We are sorry, but we could not get the update information for your website. <br /> Please try again later.',
        element: '.update-info',
        side: 'left',
        align: 'end',
        skip: updateInfo !== 'Could not get update information.',
      },
      {
        title: 'A new version is available!',
        description: 'Hurray! An Update for your Project is available. <br /> You can update it here.',
        element: '.update-info',
        side: 'left',
        align: 'end',
        skip: updateInfo?.search('A new version is available!') < 1,
      },
      {
        title: 'Revert to a previous version',
        description: 'This opens a Modal where you can revert to a previous version of your website. <br /> This will restore your website to the selected version. <br /> Your Content will not be affected. <br /> <strong>This can not be undone.</strong>',
        element: '.prev-update-info',
        side: 'left',
        align: 'end',
      },
    ],
  };

  return tourData;
}

function settingsThemeTour({ showAutoTour }) {
  const tourData = {
    onFinished: () => {
      if (showAutoTour) {
        window.location.href = '/dashboard/account';
      }
    },
    steps: [
      {
        title: 'Theme Editor',
        description: 'Welcome to the Theme Editor. Here you can edit your Theme and customize it to your needs.',
      },
      {
        title: 'Toggle between Editing and Preview Mode',
        description: 'You can toggle here between Editing and Preview Mode. <br /> In Editing Mode, you can edit your Theme. <br /> In Preview Mode, you can see how your Theme looks like. <br /> Default is Editing Mode.',
        element: '#toggle-preview',
      },
      {
        title: 'Preview your Page',
        description: 'Change the preview between all your different Pages, to test your changes on all Pages.',
        element: '#publish-theme-selector',
      },
      {
        title: 'Theme Variables',
        description: 'Here you can change the Theme Variables. <br /> Theme Variables are the basic settings of your Theme.',
        element: 'aside',
      },
      {
        title: 'Save',
        description: 'If you are finished, you can save your changes to your Theme. <br /> There is no automatic saving. Be sure you are satisfied with your changes before saving.',
        element: '#save-button',
        align: 'end',
      },
    ],
  };

  return tourData;
}

export { settingsGeneralTour, settingsThemeTour };
