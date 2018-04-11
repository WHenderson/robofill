import apply from './apply.es6';

export default function value(item, value) {
    return apply(
        item,
        value,
        ($item, $value) => {
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
            resultType: 'selector'
        },
        {
            name: 'value',
            label: 'Value',
            resultType: 'text'
        }
    ]
};