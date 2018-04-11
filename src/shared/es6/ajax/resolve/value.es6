import Promise from 'bluebird';
import item from "./item.es6";

export default function value(input) {
    if (typeof input === 'object' && input instanceof Promise)
        return input.then((input) => value(input));
    else if (typeof input === 'function')
        return Promise.resolve(value(input()));
    else
        return Promise.resolve(input);
}