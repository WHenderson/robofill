import Promise from 'bluebird';
import $ from 'jquery';
import resolve from './resolve'
import idle from "./idle";

export default function focus(item, timeout) {
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
                return Promise.resolve($item);

            $item = $item.first();

            if ($item.is(':focus'))
                return Promise.resolve($item);

            return new Promise((res, rej) => {
                let timeoutId = undefined;

                const onTimeout = () => {
                    $item.off('focus', onAction);
                    rej();
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