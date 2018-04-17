import Promise from 'bluebird';
import ajax from './ajax/index.es6';

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
                return action.apply(undefined, args)
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
