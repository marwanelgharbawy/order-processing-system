const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, 64);
    return `scrypt:${salt}:${hash.toString('hex')}`;
}

async function checkPassword(password, storedPassword) {
    const parts = String(storedPassword).split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) {
        return false;
    }
    const hash = await scrypt(password, parts[1], 64);
    return crypto.timingSafeEqual(hash, Buffer.from(parts[2], 'hex'));
}

function publicUser(user) {
    const { Password, ...details } = user;
    return details;
}

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Please log in first' });
    }
    next();
}

function requireAdmin(req, res, next) {
    requireLogin(req, res, () => {
        if (req.session.user.Role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

function validPassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

module.exports = { hashPassword, checkPassword, publicUser, requireLogin, requireAdmin, validPassword };
