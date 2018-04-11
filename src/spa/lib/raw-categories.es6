import { arrayToObject } from '../../shared/es6/util.es6';

export default arrayToObject(
    [
        {
            name: 'if',
            label: 'If',
            description: 'Conditional execution',
            color: 'green'
        },
        {
            name: 'input',
            label: 'Input',
            description: 'Simulate user input',

            sub: arrayToObject(
                [
                    {
                        name: 'data',
                        label: 'Data input',
                        description: 'Fill form fields with data',
                        color: 'blue',
                    },
                    {
                        name: 'navigation',
                        label: 'Navigation',
                        description: 'Navigation',
                        color: 'teal'
                    },
                    {
                        name: 'other',
                        label: 'Other',
                        description: 'Miscellaneous input',
                        color: 'violet'
                    }
                ]
            )
        },
        {
            name: 'other',
            label: 'Other',
            description: 'Miscellaneous input',
            color: 'purple'
        }
    ]
)