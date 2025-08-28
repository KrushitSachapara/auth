const jwt = require('jsonwebtoken');

const { unauthorizedResponse } = require('./responses');

const jwtSecretKey = process.env.JWT_SECRET_KEY;
const charactersSecretKey = process.env.CHARACTERS_SECRET_KEY;

const allowedUrls = [
    '/sign-in',
    '/forgot/password',
    '/reset/password'
]

const ensureAuthorized = (req, res, next) => {
    if (allowedUrls.indexOf(req.path) !== -1) return next();

    const bearerHeader = req.headers["authorization"];

    if (!(typeof bearerHeader !== "undefined" && jwtSecretKey) || !bearerHeader)
        return unauthorizedResponse(res, { message: "Unauthorized request!" });

    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];

    jwt.verify(bearerToken, jwtSecretKey, async (error, decoded) => {
        if (error) {
            return unauthorizedResponse(res, { message: "Unauthorized request!" });
        } else {
            req.user = decoded;
            next();
        };
    });
};

const generateAuthToken = async (user) => {
    const tokenDetails = {};

    ['firstName', 'lastName', 'email', 'phone'].forEach((key) => {
        if (user[key] !== undefined) {
            tokenDetails[key] = user[key];
        };
    });

    const token = jwt.sign(tokenDetails, jwtSecretKey, { algorithm: 'HS512', expiresIn: '24h' });
    return { token };
}

const generateUniqueString = (length = 64) => {
    return Array.from({ length }, () => charactersSecretKey.charAt(Math.floor(Math.random() * charactersSecretKey.length))).join('');
}

module.exports = { ensureAuthorized, generateAuthToken, generateUniqueString };