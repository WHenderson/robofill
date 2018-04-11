import Promise from 'bluebird';

const $ = window.$; // TODO: Replace this with a custom 'watch for ajax' method

export default function idle(timeout = 50) {
    return new Promise((resolve, reject) => {
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
            reset();

            if ($.active)
                $(document).one('ajaxStop', onStop);
            else
                onStop();
        };

        // ajax stopped?
        const onStop = () => {
            reset();

            id = setTimeout(
                () => {
                    $(document).off('ajaxStart', onStart);
                    resolve();
                },
                timeout - (idle.lastIdle ? ((+new Date()) - idle.lastIdle) : 0)
            );
            $(document).one('ajaxStart', onStart);
        };

        onStart();
    });
}

idle.lastIdle = undefined;

$(document).ajaxStart(() => {
    idle.lastIdle = undefined;
});
$(document).ajaxStop(() => {
    idle.lastIdle = +new Date();
});

idle.template = {
    label: 'Idle',
    description: 'Wait until site has idled for the specified amount of time',
    arguments: [
        {
            name: 'timeout',
            label: 'Timeout (ms)',
            optional: true,
            resultType: 'int'
        }
    ]
};