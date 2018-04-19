import Promise from 'bluebird';
import ajax from './ajax/index.es6';
import util from './util/index.es6';

export function compileFunction(script) {
    return (new Function('ajax', 'util', 'data', script)).bind(undefined, ajax, util);
}
export function compileFormula(script) {
    return compileFunction(`return (${script});`);
}
export function debugFunction(name, func) {
    return function (...args) {
        try {
            return func.apply(func, args);
        }
        catch (ex) {
            console.error(name, ex, func);
            throw ex;
        }
    }
}

export function compileItem(item, path) {
    // Skip disabled items
    if (item.enabled === false)
        return p;

    // Find the correct action type
    let action = ajax;
    for (const name of item.type.split('.')) {
        if (typeof action !== 'object' || !{}.hasOwnProperty.call(action, name))
            throw new Error(`Unknown scriptItem type ${item.type}`);
        action = action[name];
    }
    if (typeof action !== 'function' || !action.template)
        throw new Error(`Unknown scriptItem type ${item.type}`);

    // Build argument list
    const args = [];

    for (const templateArgument of action.template.arguments) {
        if (!item[templateArgument.name]) {
            if (!templateArgument.optional)
                throw new Error(`Missing required argument ${templateArgument.name}`);

            args.push(undefined);
            continue;
        }
        switch (item[templateArgument.name].type) {
            case 'value':
                args.push(item[templateArgument.name].value);
                break;
            case 'formula':
                args.push(debugFunction(templateArgument.name, compileFormula(item[templateArgument.name].formula)));
                break;
            case 'function':
                args.push(debugFunction(templateArgument.name, compileFunction(item[templateArgument.name].function)));
                break;
            case 'disabled':
                args.push(undefined);
                break;
            default:
                throw new Error(`Unknown argument type ${item[templateArgument.name].type}`);
        }
    }

    // build subscript
    if (action.template.hasSubScript)
        args.push(compileItems(item.scriptItems || [], path.concat(['scriptItems'])));


    // return something which resolves a promise (used as an argument to .then)
    return (data) => {
        return Promise
            .resolve(data)
            .then((data) => {
                console.debug(path.join('/'), item.type, data, item);
                return data;
            })
            .then((data) => {
                let p = Promise.resolve([]);
                for (const arg of args) {
                    p = ((arg) => p.then(
                        (resolvedArgs) =>
                            Promise
                                .resolve(arg)
                                .then(arg => (typeof arg === 'function' ? arg(data) : arg))
                                .then(arg => resolvedArgs.concat([arg]))
                    ))(arg);
                }

                return p
                    .then((args) => action.apply(undefined, args));
            });
    };
}

export function compileItems(items, path) {
    // compile items
    const compiledItems = items.map((item, i) => compileItem(item, path.concat([i])));

    return (data) => {
        // TODO: Better way to map a series of .then's?
        let p = Promise.resolve(data);
        for (const compiledItem of compiledItems)
            p = p.then(compiledItem);

        return p;
    };
}

export function compileScript(script) {
    const compiledItems = compileItems(script.scriptItems || [], ['scriptItems']);

    return (data) => {
        return Promise
            .resolve(data)
            .then((data) => {
                console.log(`script:`);
                console.log('  name       :', script.name);
                console.log('  description:', script.description);
                console.log('  author     :', script.author);
                console.log('  stamp      :', script.stamp);
                console.log('script begin:', data, script);
                return data;
            })
            .then(compiledItems)
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

    };
}
