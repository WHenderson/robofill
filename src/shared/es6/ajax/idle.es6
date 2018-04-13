import Promise from 'bluebird';

const $ = window.$; // TODO: Replace this with a custom 'watch for ajax' method

export default function idle(timeout = 50) {
    return new Promise((resolve, reject) => {
        console.debug(idle.name);

        // Timeout Id
        let id = undefined;

        // discard the timer
        const reset = () => {
            if (id) {
                clearTimeout(id);
                id = undefined;
            }
        };

        // ajax started?
        const onStart = () => {
            console.debug(idle.name, 'onStart');
            reset();

            if ($.active)
                $(document).one('ajaxStop', onStop);
            else
                onStop();
        };

        // ajax stopped?
        const onStop = () => {
            const wait = Math.max(0, timeout - (idle.lastIdle ? ((+new Date()) - idle.lastIdle) : 0));

            console.debug(idle.name, 'onStop', wait);
            reset();

            id = setTimeout(
                () => {
                    console.debug(idle.name, 'onTimeout');
                    $(document).off('ajaxStart', onStart);
                    resolve();
                },
                wait
            );
            $(document).one('ajaxStart', onStart);
        };

        onStart();
    });
}

idle.lastIdle = undefined;

$(document).ajaxStart(() => {
    idle.lastIdle = undefined;
    console.debug('ajax start');
});
$(document).ajaxStop(() => {
    if (!$.active) {
        idle.lastIdle = +new Date();
        console.debug('ajax stop', idle.lastIdle);
    }
});

idle.template = {
    label: 'Idle',
    description: 'Wait until site has idled for the specified amount of time',
    arguments: [
        {
            name: 'timeout',
            label: 'Timeout (ms)',
            optional: true,
            resultType: 'int',
            default: {
                type: 'disabled',
                value: 50
            }
        }
    ]
};