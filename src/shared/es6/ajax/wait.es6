import Promise from 'bluebird';

export default function wait(timeout = 50) {
    return new Promise((resolve) => {
        console.debug(wait.name);

        setTimeout(
            () => {
                console.debug(wait.name, 'onTimeout');
                resolve();
            }
        )
    });
}

wait.template = {
    label: 'Wait',
    description: 'Wait for the specified amount of time before continuing',
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