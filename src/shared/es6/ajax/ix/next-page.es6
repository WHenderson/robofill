import click from '../click.es6'

export default function nextPage() {
    return click('#btnNextTop:first');
}

nextPage.template = {
    label: 'Next Page',
    description: 'Click the "Next Page" button',
    arguments: [
    ],
    hasSubScript: true
};