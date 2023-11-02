const session = require('express-session');
const secrets = require("../secrets.json");

module.exports = (session({
    secret: secrets.tokenKey,
    resave: false,
    saveUninitialized : true,
    cookie: { maxAge: 6 * 60 * 60 * 1000 } // le user n'aura pas besoin de se reconnecter pendant 4h (6-2)
}));