import resolve from './resolve/index.es6'

export default function ifThen(condition, $then, $else) {
    return resolve
        .value(condition)
        .then(($condition) => {
            if ($condition) {
                if ($then)
                    return $then();
            }
            else {
                if ($else)
                    return $else();
            }
        })
}