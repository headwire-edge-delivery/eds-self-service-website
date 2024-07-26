function settingsGeneralTour() {
  const tour = {
    steps: [
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
        description: 'To add a new block to your website, click here. <br /> This will open a dialog where you can select a block to add to your page.',
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
    ],
  };

  return tour;
}

function settingsThemeTour() {
  const tour = {
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
        title: 'Save',
        description: 'If you are finished, you can save your changes to your Theme. <br /> There is no automatic saving. Be sure you are satisfied with your changes before saving.',
        element: '#save-button',
      },
    ],
  };

  return tour;
}

export { settingsGeneralTour, settingsThemeTour };
