import ajax from './ajax/index.es6';

const templates = {};

function createInstance() {
    const instance = {};

    instance.type = this.name;
    instance.enabled = true;

    if (this.fields) {
        for (const field of this.fields)
            instance[field.name] = field.default || {};
    }
    if (this.hasSubScript)
        instance.scriptItems = [];

    return instance;
}

function traverseTemplates(obj, path=[]) {
    for (const [k,v] of Object.entries(obj)) {
        if (typeof v === 'object') {
            traverseTemplates(v, path.concat([k]));
            continue;
        }
        if (typeof v !== 'function' || !v.template)
            continue;

        const template = JSON.parse(JSON.stringify(v.template));

        template.name = path.concat([k]).join('.');

        if (!template.template)
            template.template = createInstance.bind(template);

        templates[template.name] = template;
    }
}

traverseTemplates(ajax);

const categories = {
    'if': {
        label: 'If',
        description: 'Conditional execution',
        color: 'green',
        templates: [
            templates['ix.ifPage']
        ]
    },
    'input': {
        name: 'input',
        label: 'Input',
        description: 'Simulate user input',

        sub: {
            'data': {
                label: 'Data input',
                description: 'Fill form fields with data',
                color: 'blue',
                templates: [
                    templates['set.value'],
                    templates['set.checkbox'],
                    templates['set.radio']
                ]
            },
            'navigation': {
                label: 'Navigation',
                description: 'Navigation',
                color: 'teal',
                templates: [
                    templates['click'],
                    templates['ix.nextPage']
                ]
            },
            'other': {
                label: 'Other',
                description: 'Miscellaneous input',
                color: 'violet',
                templates: [
                    templates['focus'],
                    templates['blur'],
                    templates['idle']
                ]
            }
        }
    },
    'other': {
        label: 'Other',
        description: 'Miscellaneous input',
        color: 'purple',
        templates: []
    }
};

function traverseCategories(categories) {
    for (const [k,v] of Object.entries(categories)) {
        v.name = k;

        for (const template of (v.templates || [])) {
            template.category = v;
        }

        if (v.sub)
            traverseCategories(v.sub);
    }

    for (const template of Object.values(templates)) {
        if (template.category)
            continue;

        categories['other'].templates.push(template);
        template.category = categories['other'];
    }
}

traverseCategories(categories);

export { templates, categories };

