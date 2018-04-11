import Promise from 'bluebird';
import item from "./item";

export default function value(input) {
    if (typeof input === 'object' && input instanceof Promise)
        return input.then((input) => item(input));
    else if (typeof input === 'function')
        return Promise.resolve(value(input()));
    else
        return Promise.resolve(input);
}