import mutated from '../mutated.es6';
import resolve from '../resolve/index.es6';

export default function apply(item, value, $action) {
    return mutated(
        item,
        () => {
            return resolve
                .item(item)
                .then(($item) => {
                    return resolve
                        .value(value)
                        .then(($value) => {
                            return { $item, $value };
                        });
                })
                .then(({$item, $value}) => {
                    $action($item, $value);
                });
        }
    );
}