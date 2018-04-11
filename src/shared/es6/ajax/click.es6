import mutated from './mutated.es6'
import resolve from './resolve/index.es6'

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