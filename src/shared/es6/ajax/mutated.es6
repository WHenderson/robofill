import Promise from 'bluebird';
import idle from './idle.es6';
import focus from './focus.es6';
import blur from './blur.es6';

export default function mutated(item, $mutate) {
    return idle()
        .then(() => focus(item))
        .then(() => idle())
        .then(() => $mutate())
        .then(() => idle())
        .then(() => blur(item))
        .then(() => idle());
}

