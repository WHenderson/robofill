import resolve from './resolve'

export default ifThen(condition, $then, $else) {
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