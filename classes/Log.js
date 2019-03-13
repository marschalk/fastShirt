module.exports = class Log  {
    error(msg) {
        console.log("ERROR: "+msg);
    }

    info(msg) {
        console.info(msg);
    }
}
