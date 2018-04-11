import checkbox from './checkbox'
import apply from "./apply";

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
