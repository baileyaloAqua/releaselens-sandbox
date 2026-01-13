
function shareCurrentDateTime() {
    const currentDateTime = new Date();
    return currentDateTime.toString();
}

console.log(shareCurrentDateTime());

module.exports = shareCurrentDateTime;