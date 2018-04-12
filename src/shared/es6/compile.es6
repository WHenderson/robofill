import Promise from 'bluebird';
import ajax from './ajax';

function Unresolved() {
    let _resolve = undefined;
    let _reject = undefined;
    const p = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });
    p.resolve = (data) => { _resolve(data); return this; };
    p.reject = (data) => { _reject(data); return this; };
    return p;
}

export function compileItem(item, path) {
    let p = new Unresolved();

    // Skip disabled items
    if (item.enabled === false)
        return p;

    // Find the correct action type
    let action = ajax;
    for (const name of item.type.split('.')) {
        if (typeof method !== 'object' || !{}.hasOwnProperty.call(method, name))
            throw new Error(`Unknown scriptItem type ${item.type}`);
        action = action[name];
    }
    if (typeof action !== 'function' || !action.template)
        throw new Error(`Unknown scriptItem type ${item.type}`);

    // Build argument list
    const arguments = [];

    for (const templateArgument of template.arguments) {
        if (!item[templateArgument.name]) {
            if (!templateArgument.optional)
                throw new Error(`Missing required argument ${templateArgument.name}`);

            arguments.push(undefined);
            continue;
        }
        switch (item[templateArgument.name].type) {
            case 'value':
                arguments.push(item[templateArgument.name].value);
                break;
            default:
                throw new Error(`Unknown argument type ${item[templateArgument.name].type}`);
        }
    }

    // build subscript
    if (item.hasSubScript)
        arguments.push(compileItems(item.scriptItems || [], path.concat(['scriptItems'])).resolve);

    // return a promise
    return p
        .then((data) => {
            console.debug(path.join('/'), data, item);
            return data;
        })
        .then((data) => {
            action.apply(undefined, arguments)
        });
}

export function compileItems(items, path) {
    let p = new Unresolved()
        .then((data) => {
            console.debug(path.join('/'), data, items);
            return data;
        });

    for (const [i, item] of items.entries())
        p = p.then(compileItem(item, path.concat([i])).resolve);

    return p;
}

export function compileScript(script) {
    return new Unresolved()
        .then((data) => {
            console.log(`script:`);
            console.log('  name       :', script.name);
            console.log('  description:', script.description);
            console.log('  author     :', script.author);
            console.log('  stamp      :', script.stamp);
            console.log('script begin:', data, script);
            return data;
        })
        .then(compileItems(script.scriptItems, ['scriptItems']).resolve)
        .then(
            (data) => {
                console.log('script complete', data);
                return data;
            },
            (data) => {
                console.error('script error', data, script);
                return data;
            }
        );
}
