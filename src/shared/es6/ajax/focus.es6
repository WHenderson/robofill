import Promise from 'bluebird';
import resolve from './resolve/index.es6'
import focusable from './util/focusable.es6';

export default function focus(item, timeout=1000) {
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
            console.debug(focus.name);

            $item = $item.filter(focusable).first();
            if ($item.length === 0)
                return;

            $item = $item.first();

            if ($item.is(':focus'))
                return;

            return new Promise((res, rej) => {
                let timeoutId = undefined;

                const onTimeout = () => {
                    $item.off('focus', onAction);
                    rej(new Error('Timeout waiting for focus'));
                };
                const onAction = () => {
                    if (timeoutId !== undefined)
                        clearTimeout(timeoutId);
                    res();
                };

                $item.one('focus', onAction);

                if ($timeout)
                    timeoutId = setTimeout(onTimeout, $timeout);

                $item.focus();
            });
        });
}

focus.template = {
    label: 'Focus',
    description: 'Focus the given element',
    arguments: [
        {
            name: 'item',
            label: 'Selector',
            resultType: 'selector',
            default: {
                type: 'value',
                value: ''
            }
        },
        {
            name: 'timeout',
            label: 'Timeout (ms)',
            optional: true,
            resultType: 'int',
            default: {
                type: 'disabled',
                value: 1000
            }
        }
    ]
};
