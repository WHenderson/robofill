import checkbox from './checkbox.es6'
import apply from './apply.es6';

export default function radio(item) {
    return apply(
        item,
        undefined,
        ($item) => {
            $item.filter('input[type=radio]').prop('checked', true).keydown().click();
        }
    );
}

radio.template = {
    label: 'Radio',
    description: 'Set the state of the given radio checkbox',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector'
        }
    ]
};
