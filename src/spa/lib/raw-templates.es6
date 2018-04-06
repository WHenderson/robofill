import { arrayToObject } from './util.es6';

export default arrayToObject([
    {
        name: 'ifPageActive',
        label: 'If page is active',
        description: 'Execute if specified page is active',
        fields: [
            {
                name: 'title',
                label: 'Title',
                default: '',
                resultType: 'text'
            }
        ],
        hasSubScript: true
    },
    {
        name: 'formSetValue',
        label: 'Text',
        description: 'Enter text into the specified form element',
        fields: [
            {
                name: 'selector',
                label: 'CSS Selector',
                placeHolder: '#Qxxx',
                default: '',
                resultType: 'selector'
            },
            {
                name: 'value',
                label: 'Value',
                default: '',
                resultType: 'text'
            }
        ]
    },
    {
        name: 'formSetCheckbox',
        label: 'Checkbox',
        description: 'Set the state of the specified checkbox',
        fields: [
            {
                name: 'selector',
                label: 'CSS Selector',
                placeHolder: '#Qxxx',
                default: '',
                resultType: 'selector'
            },
            {
                name: 'state',
                label: 'Target State',
                default: true,
                resultType: 'trilean' // 3 state boolean (true/false/undefined)
            }
        ]
    },
    {
        name: 'formSetRadio',
        label: 'Radio',
        description: 'Activate the specified radio button option',
        fields: [
            {
                name: 'selector',
                label: 'CSS Selector',
                placeHolder: '#Qxxx',
                default: '',
                resultType: 'selector'
            }
        ]
    },
    {
        name: 'click',
        label: 'Click',
        description: 'Click the specified element',
        fields: [
            {
                name: 'selector',
                label: 'CSS Selector',
                placeHolder: '#Qxxx',
                default: '',
                resultType: 'selector'
            }
        ]
    },
    {
        name: 'navNextPage',
        label: 'Next page',
        description: 'Navigate to the next page'
    },
    {
        name: 'navPrevPage',
        label: 'Previous page',
        description: 'Navigate to the next page'
    },
    {
        name: 'log',
        label: 'Log',
        description: 'Log values to the console',
        fields: [
            {
                name: 'value',
                label: 'Value',
                default: '',
                resultType: 'text'
            }
        ]
    }
])