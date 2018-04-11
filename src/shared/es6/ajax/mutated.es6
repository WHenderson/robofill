import Promise from 'bluebird';
import $ from 'jquery';
import idle from './idle';
import focus from './focus';
import blur from './blur';

export default function mutated(item, $mutate) {
    return idle()
        .then(() => focus(item))
        .then(() => idle())
        .then(() => {
            const res = mutate();
            idle.lastIdle = undefined;
            return res;
        })
        .then(() => idle())
        .then(() => blur())
        .then(() => idle);
}

