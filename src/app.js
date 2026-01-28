
function currentDateTime() {
    const date = new Date();
    return date.toString();
}

function currentCountry() {
    const country = new Intl.DisplayNames(['en'], { type: 'region' }).of('CA');
    return country.toString();
}

console.log("DateTime:", currentDateTime());
console.log("Country:", currentCountry());

module.exports = currentDateTime;
module.exports = currentCountry;