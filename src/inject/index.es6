import Ui from './ui/ui.html';

// Remove injected script
const uniqueId = '5HMkkyxKb7fW9uXF';
const script = document.getElementById(uniqueId);
script.remove();

// Create a place for the ui iframe
const root = document.createElement('div');
document.body.appendChild(root);

// Create the UI
const ui = new Ui({ target: root, data: { script } });
window.$ui = ui;



