import mutated from '../mutated';
import resolve from '../resolve';

export default function apply(item, value, $action) {
    return resolve
        .item(item)
        .then(($item) => {
            return resolve
                .value(value)
                .then(($value) => {
                    return { $item, $value };
                });
        })
        .then(($item, $value) => {
            return mutated(
                $item,
                () => {
                    $action($item, $value);
                }
            )
        });
}