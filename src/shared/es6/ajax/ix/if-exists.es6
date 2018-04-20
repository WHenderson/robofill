import ifThen from '../if-then.es6'
import resolve from '../resolve/index.es6'

export default function ifExists(selector, $then) {
    return ifThen(
        resolve
            .value(selector)
            .then(($selector) => {
                const $found = $(document).find($selector);
                return ($found.length !== 0);
            }),
        $then
    )
}

ifExists.template = {
    label: 'If Exists',
    description: 'Execute sub-commands if the given selector matches an element',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector',
            default: {
                type: 'value',
                value: ''
            }
        }
    ],
    hasSubScript: true
};