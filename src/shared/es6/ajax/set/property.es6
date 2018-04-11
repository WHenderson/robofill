import apply from "./apply";

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
            resultType: 'selector'
        },
        {
            name: 'name',
            label: 'Name',
            resultType: 'text'
        },
        {
            name: 'value',
            label: 'Value',
            resultType: 'text'
        }
    ]
};