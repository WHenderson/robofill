import $ from 'jquery'
import Promise from 'bluebird';

export default function item(input) {
    if (typeof input === 'string')
        return Promise.resolve($(input));
    else if (typeof input === 'object' && input instanceof Promise)
        return input.then((input) => item(input));
    else if (typeof input === 'object' && input instanceof $)
        return Promise.resolve(input);
    else if (typeof input === 'function')
        return Promise.resolve(item(input()));
    else
        throw new Error(`Unknown item selector type: ${typeof input} : ${input}`)
}