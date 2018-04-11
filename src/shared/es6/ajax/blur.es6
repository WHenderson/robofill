import Promise from 'bluebird';
import $ from 'jquery';
import resolve from "./resolve/index.es6";

export default function blur(item, timeout) {
    return resolve
        .item(item)
        .then(($item) => {
            return resolve
                .value(timeout)
                .then(($timeout) => {
                    return {$item, $timeout}
                })
        })
        .then(({$item, $timeout}) => {
            $item = $item.filter(':focusable').first();
            if ($item.length === 0)
                return Promise.resolve();

            if (!$item.is(':focus'))
                return Promise.resolve();

            return new Promise((res, rej) => {
                let timeoutId = undefined;

                const onTimeout = () => {
                    $item.off('blur', onAction);
                    rej();
                };
                const onAction = () => {
                    if (timeoutId !== undefined)
                        clearTimeout(timeoutId);
                    res();
                };

                $item.one('blur', onAction);

                if ($timeout)
                    timeoutId = setTimeout(onTimeout, $timeout);

                $item.blur();
            });
        });
}

blur.template = {
    label: 'Blur',
    description: 'Blur the given element',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector'
        },
        {
            name: 'timeout',
            label: 'Timeout (ms)',
            optional: true,
            resultType: 'int'
        }
    ]
};