import rawCategories from './raw-categories.es6';
import rawTemplates from './raw-templates.es6';

function bind(template, category) {
    (category.templates || (category.templates = [])).push(template);
    template.category = category;
}

function createInstance() {
    const instance = {};

    instance.type = this.name;
    if (this.fields) {
        for (const field of this.fields)
            instance[field.name] = field.default || undefined;
    }
    if (this.hasSubScript)
        instance.scriptItems = [];

    return instance;
}

function cleanup() {
    for (const template of Object.values(rawTemplates)) {
        if (!template.category)
            bind(template, rawCategories.other);

        if (!template.template)
            template.template = createInstance.bind(template);
    }

    const compare = (a,b) => {
        a = a.label.toUpperCase();
        b = b.label.toUpperCase();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    };

    for (const category of Object.values(rawCategories)) {
        if (category.templates)
            category.templates.sort(compare)

        for (const sub of Object.values(category.sub || {})) {
            if (sub.templates)
                sub.templates.sort(compare)
        }
    }
}

bind(rawTemplates.ifPageActive, rawCategories.if);
bind(rawTemplates.formSetValue, rawCategories.input.sub.data);
bind(rawTemplates.formSetCheckbox, rawCategories.input.sub.data);
bind(rawTemplates.formSetRadio, rawCategories.input.sub.data);
bind(rawTemplates.click, rawCategories.input.sub.navigation);
bind(rawTemplates.navNextPage, rawCategories.input.sub.navigation);
bind(rawTemplates.navPrevPage, rawCategories.input.sub.navigation);

cleanup();

export let categories = rawCategories;
export let templates = rawTemplates;
