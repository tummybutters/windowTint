const { createHandler } = require('../lib/square-availability');

const defaultHandler = createHandler();
module.exports = defaultHandler;
module.exports.createHandler = createHandler;
