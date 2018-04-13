import apply from './apply.es6';

export default function value(item, value) {
    return apply(
        item,
        value,
        ($item, $value) => {
            console.debug('value', $item.selector, $value);
            $item.filter('input, select, textarea').val($value).keydown().change();
        }
    );
}

value.template = {
    label: 'Value',
    description: 'Set the value for the given element',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector',
            default: {
                type: 'value',
                value: ''
            }
        },
        {
            name: 'value',
            label: 'Value',
            resultType: 'text',
            default: {
                type: 'value',
                value: ''
            }
        }
    ]
};