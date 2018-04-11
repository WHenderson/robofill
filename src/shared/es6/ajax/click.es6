import mutated from './mutated'
import resolve from './resolve'
import blur from "./blur";

export default function click(item) {
    return resolve
        .item(item)
        .then(($item) => {
            return mutated(
                $item,
                () => {
                    $item.click();
                }
            )
        });
}

click.template = {
    label: 'Click',
    description: 'Click the given element',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector'
        }
    ]
};