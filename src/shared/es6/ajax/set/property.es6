import apply from "./apply.es6";

export default function property(item, name, value) {
    return apply(
        item,
        value,
        ($item, $value) => {
            $item.prop(name, $value).change();
        }
    );
}

property.template = {
    label: 'Property',
    description: 'Set the value for the given property',
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
            name: 'name',
            label: 'Name',
            resultType: 'text',
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