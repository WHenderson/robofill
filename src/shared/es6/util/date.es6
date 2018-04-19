function local({ date = new Date(), days = 0, months = 0, years = 0} = {}) {
    const d = new Date(date.getTime());
    d.setDate(date.getDate() + days);
    d.setMonth(date.getMonth() + months);
    d.setFullYear(date.getFullYear() + years);

    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export default {
    local
};