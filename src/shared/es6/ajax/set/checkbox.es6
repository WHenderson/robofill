import apply from "./apply.es6";

export default function checkbox(item, state) {
    return apply(
        item,
        state,
        ($item, $state) => {
            $item.filter('input[type=checkbox]').prop('checked', !$state).keydown().click();
        }
    );
}

checkbox.template = {
    label: 'Checkbox',
    description: 'Set the state of the given checkbox',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector'
        },
        {
            name: 'state',
            label: 'Checked',
            resultType: 'boolean'
        }
    ]
};
