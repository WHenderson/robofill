import ifThen from '../if-then.es6'
import resolve from '../resolve/index.es6'

export default function ifPage(title, $then) {
    return ifThen(
        resolve
            .value(title)
            .then(($title) => {
                const $activeTitle = $('ul[class="nav"] li.active a').text();
                return ($title === $activeTitle);
            }),
        $then
    )
}

ifPage.template = {
    label: 'If Page is Active',
    description: 'Execute sub-commands if the given page is active',
    arguments: [
        {
            name: 'title',
            label: 'Title',
            resultType: 'text'
        }
    ],
    hasSubScript: true
};