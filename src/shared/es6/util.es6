export function arrayToObject(array) {
    const obj = {};
    for (const value of array)
        obj[value.name] = value;
    return obj;
}